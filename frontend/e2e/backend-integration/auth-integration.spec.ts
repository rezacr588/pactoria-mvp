import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * AUTHENTICATION BACKEND INTEGRATION TESTS
 * 
 * These tests validate the complete authentication flow with real backend API calls.
 * They ensure proper request/response handling, token management, and error scenarios.
 */

test.describe('Authentication Backend Integration', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';

  test.describe('User Registration Integration', () => {
    test('should register new user and store token correctly @smoke @integration', async ({ page }) => {
      const testUser = {
        email: `test-${faker.string.uuid()}@integration-test.com`,
        password: 'IntegrationTest123!',
        full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
        company_name: `${faker.company.name()} Test Co.`
      };

      // Track API requests
      const apiRequests: any[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/v1/')) {
          apiRequests.push({
            method: request.method(),
            url: request.url(),
            headers: Object.fromEntries(Object.entries(request.headers())),
            body: request.postData()
          });
        }
      });

      await page.goto('/register');

      // Fill registration form
      await page.getByLabel(/full name|name/i).fill(testUser.full_name);
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByLabel(/company/i).fill(testUser.company_name);

      // Submit registration and wait for API response
      const registrationPromise = page.waitForResponse(
        response => response.url().includes('/auth/register') && response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /register|sign up/i }).click();

      // Validate registration API call
      const registrationResponse = await registrationPromise;
      expect(registrationResponse.status()).toBe(201);

      const regData = await registrationResponse.json();
      expect(regData).toHaveProperty('token');
      expect(regData.token).toHaveProperty('access_token');
      expect(regData.token.access_token).toBeTruthy();
      expect(regData).toHaveProperty('user');
      expect(regData.user.email).toBe(testUser.email);
      expect(regData.user.full_name).toBe(testUser.full_name);

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Verify token is stored correctly
      const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
      expect(authStorage).toBeTruthy();

      const tokenStorage = await page.evaluate(() => localStorage.getItem('auth-token'));
      expect(tokenStorage).toBeTruthy();
      expect(tokenStorage).toBe(regData.token.access_token);

      // Verify auth state is set correctly
      const parsedAuthStorage = JSON.parse(authStorage!);
      expect(parsedAuthStorage.state.user.email).toBe(testUser.email);
      
      // Verify subsequent API calls include authorization header
      await page.reload();
      await page.waitForLoadState('networkidle');

      const authorizedRequests = apiRequests.filter(req => 
        req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      );
      expect(authorizedRequests.length).toBeGreaterThan(0);
    });

    test('should handle registration validation errors from backend @integration', async ({ page }) => {
      await page.goto('/register');

      // Try to register with invalid email
      await page.getByLabel(/full name|name/i).fill('Test User');
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByLabel(/password/i).fill('short');
      await page.getByLabel(/company/i).fill('Test Company');

      const errorResponse = page.waitForResponse(
        response => response.url().includes('/auth/register') && response.status() >= 400
      );

      await page.getByRole('button', { name: /register|sign up/i }).click();

      // Should receive validation error from backend
      const errorRes = await errorResponse;
      expect(errorRes.status()).toBe(422); // FastAPI validation error

      // Should display error message
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByText(/email|password|validation/i)).toBeVisible();
      
      // Should remain on registration page
      await expect(page).toHaveURL(/\/register/);
    });

    test('should handle duplicate email registration error @integration', async ({ page }) => {
      // First, register a user
      const testUser = {
        email: `duplicate-${faker.string.uuid()}@integration-test.com`,
        password: 'DuplicateTest123!',
        full_name: 'First User',
        company_name: 'First Company'
      };

      // Try to register the same email twice
      await page.goto('/register');
      await page.getByLabel(/full name|name/i).fill(testUser.full_name);
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByLabel(/company/i).fill(testUser.company_name);

      // First registration (might succeed or fail depending on test isolation)
      await page.getByRole('button', { name: /register|sign up/i }).click();
      
      // Wait a moment and try again if first one succeeded
      await page.waitForTimeout(1000);
      if (await page.isVisible(page.getByRole('button', { name: /register|sign up/i }))) {
        // Still on registration page, try again
        await page.getByRole('button', { name: /register|sign up/i }).click();
      } else {
        // Registration succeeded, logout and try duplicate
        await page.goto('/login');
        await page.goto('/register');
        
        // Try to register with same email
        await page.getByLabel(/full name|name/i).fill('Second User');
        await page.getByLabel(/email/i).fill(testUser.email);
        await page.getByLabel(/password/i).fill(testUser.password);
        await page.getByLabel(/company/i).fill('Second Company');
        
        const duplicateErrorResponse = page.waitForResponse(
          response => response.url().includes('/auth/register') && response.status() >= 400
        );

        await page.getByRole('button', { name: /register|sign up/i }).click();

        const duplicateRes = await duplicateErrorResponse;
        expect(duplicateRes.status()).toBe(400);

        // Should show duplicate email error
        await expect(page.getByText(/email.*already.*exists|user.*already.*exists/i)).toBeVisible();
      }
    });
  });

  test.describe('User Login Integration', () => {
    let testUser: any;

    test.beforeAll(async ({ browser }) => {
      // Create a test user to use for login tests
      testUser = {
        email: `login-test-${faker.string.uuid()}@integration-test.com`,
        password: 'LoginTest123!',
        full_name: 'Login Test User',
        company_name: 'Login Test Company'
      };

      // Register the test user
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/register');
      await page.getByLabel(/full name|name/i).fill(testUser.full_name);
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByLabel(/company/i).fill(testUser.company_name);
      await page.getByRole('button', { name: /register|sign up/i }).click();
      
      // Wait for successful registration
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      
      await context.close();
    });

    test('should login with valid credentials and establish session @smoke @integration', async ({ page }) => {
      await page.goto('/login');

      // Fill login form
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);

      // Submit login and wait for API response
      const loginPromise = page.waitForResponse(
        response => response.url().includes('/auth/login') && response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Validate login API call
      const loginResponse = await loginPromise;
      expect(loginResponse.status()).toBe(200);

      const loginData = await loginResponse.json();
      expect(loginData).toHaveProperty('token');
      expect(loginData.token.access_token).toBeTruthy();
      expect(loginData).toHaveProperty('user');
      expect(loginData.user.email).toBe(testUser.email);

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Verify authentication state
      const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
      expect(authStorage).toBeTruthy();
      
      const tokenStorage = await page.evaluate(() => localStorage.getItem('auth-token'));
      expect(tokenStorage).toBe(loginData.token.access_token);

      // Test session persistence across page reload
      await page.reload();
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Verify user menu is visible (indicating authenticated state)
      await expect(page.getByTestId('user-menu')).toBeVisible();
    });

    test('should handle invalid login credentials @integration', async ({ page }) => {
      await page.goto('/login');

      // Try login with wrong password
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill('WrongPassword123!');

      const errorResponse = page.waitForResponse(
        response => response.url().includes('/auth/login') && response.status() === 401
      );

      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Validate error response
      const errorRes = await errorResponse;
      expect(errorRes.status()).toBe(401);

      const errorData = await errorRes.json();
      expect(errorData).toHaveProperty('detail');

      // Should display error message
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByText(/invalid.*credentials|incorrect.*password|authentication.*failed/i)).toBeVisible();

      // Should remain on login page
      await expect(page).toHaveURL(/\/login/);

      // Should not have authentication tokens
      const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
      const tokenStorage = await page.evaluate(() => localStorage.getItem('auth-token'));
      
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        expect(parsed.state.user).toBeFalsy();
      }
      expect(tokenStorage).toBeFalsy();
    });

    test('should handle non-existent user login @integration', async ({ page }) => {
      await page.goto('/login');

      // Try login with non-existent email
      await page.getByLabel(/email/i).fill('nonexistent@integration-test.com');
      await page.getByLabel(/password/i).fill('SomePassword123!');

      const errorResponse = page.waitForResponse(
        response => response.url().includes('/auth/login') && response.status() === 401
      );

      await page.getByRole('button', { name: /sign in|login/i }).click();

      const errorRes = await errorResponse;
      expect(errorRes.status()).toBe(401);

      // Should show appropriate error
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByText(/invalid.*credentials|user.*not.*found/i)).toBeVisible();
    });
  });

  test.describe('Token Management Integration', () => {
    test('should handle token expiration gracefully @integration', async ({ page }) => {
      // Set up authentication with an expired token
      await page.addInitScript(() => {
        localStorage.setItem('auth-token', 'expired.jwt.token');
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { 
              id: 'test-user', 
              email: 'test@example.com',
              full_name: 'Test User'
            },
            company: null
          }
        }));
      });

      // Mock token validation to return 401
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 401,
          json: { detail: 'Token expired' }
        });
      });

      await page.goto('/dashboard');

      // Should redirect to login due to expired token
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      // Should clear invalid tokens
      const tokenStorage = await page.evaluate(() => localStorage.getItem('auth-token'));
      expect(tokenStorage).toBeFalsy();

      // Should show session expired message
      await expect(page.getByText(/session.*expired|please.*login.*again/i)).toBeVisible();
    });

    test('should refresh user data on app initialization @integration', async ({ page }) => {
      // Create a valid user first
      const testUser = {
        email: `refresh-${faker.string.uuid()}@integration-test.com`,
        password: 'RefreshTest123!',
        full_name: 'Refresh Test User',
        company_name: 'Refresh Test Company'
      };

      // Register user
      await page.goto('/register');
      await page.getByLabel(/full name|name/i).fill(testUser.full_name);
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByLabel(/company/i).fill(testUser.company_name);
      
      const regResponse = page.waitForResponse(response => response.url().includes('/auth/register'));
      await page.getByRole('button', { name: /register|sign up/i }).click();
      await regResponse;

      // Get the token
      const token = await page.evaluate(() => localStorage.getItem('auth-token'));
      expect(token).toBeTruthy();

      // Navigate away and back to test token persistence
      await page.goto('/');
      await page.goto('/dashboard');

      // Should make a call to /auth/me to refresh user data
      const meResponse = page.waitForResponse(
        response => response.url().includes('/auth/me') && response.request().method() === 'GET'
      );

      await page.reload();
      
      const meRes = await meResponse;
      expect(meRes.status()).toBe(200);

      const userData = await meRes.json();
      expect(userData.email).toBe(testUser.email);

      // Should remain authenticated
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Logout Integration', () => {
    test('should logout and clear all authentication state @integration', async ({ page }) => {
      // First, login
      const testUser = {
        email: `logout-${faker.string.uuid()}@integration-test.com`,
        password: 'LogoutTest123!',
        full_name: 'Logout Test User',
        company_name: 'Logout Test Company'
      };

      // Quick registration and login
      await page.goto('/register');
      await page.getByLabel(/full name|name/i).fill(testUser.full_name);
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByLabel(/company/i).fill(testUser.company_name);
      await page.getByRole('button', { name: /register|sign up/i }).click();
      
      await expect(page).toHaveURL(/\/dashboard/);

      // Verify we're authenticated
      const beforeLogoutToken = await page.evaluate(() => localStorage.getItem('auth-token'));
      expect(beforeLogoutToken).toBeTruthy();

      // Logout
      await page.getByTestId('user-menu').click();
      await page.getByRole('button', { name: /logout|sign out/i }).click();

      // Should redirect to landing page
      await expect(page).toHaveURL('/', { timeout: 10000 });

      // Should clear all authentication tokens
      const afterLogoutToken = await page.evaluate(() => localStorage.getItem('auth-token'));
      expect(afterLogoutToken).toBeFalsy();

      const afterLogoutAuth = await page.evaluate(() => localStorage.getItem('auth-storage'));
      if (afterLogoutAuth) {
        const parsed = JSON.parse(afterLogoutAuth);
        expect(parsed.state.user).toBeFalsy();
      }

      // Should not be able to access protected routes
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Protected Routes Integration', () => {
    test('should redirect unauthenticated users to login @integration', async ({ page }) => {
      // Try to access protected routes without authentication
      const protectedRoutes = ['/dashboard', '/contracts', '/contracts/new', '/analytics'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
      }
    });

    test('should allow authenticated users to access protected routes @integration', async ({ page }) => {
      // Register and login
      const testUser = {
        email: `protected-${faker.string.uuid()}@integration-test.com`,
        password: 'ProtectedTest123!',
        full_name: 'Protected Test User',
        company_name: 'Protected Test Company'
      };

      await page.goto('/register');
      await page.getByLabel(/full name|name/i).fill(testUser.full_name);
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByLabel(/company/i).fill(testUser.company_name);
      await page.getByRole('button', { name: /register|sign up/i }).click();
      
      await expect(page).toHaveURL(/\/dashboard/);

      // Test access to protected routes
      const protectedRoutes = [
        { path: '/contracts', title: 'Contracts' },
        { path: '/contracts/new', title: 'New Contract' },
        { path: '/analytics', title: 'Analytics' }
      ];

      for (const route of protectedRoutes) {
        await page.goto(route.path);
        await expect(page).toHaveURL(route.path);
        // Should not redirect to login
        await page.waitForTimeout(1000);
        expect(page.url()).not.toMatch(/\/login/);
      }
    });
  });

  test.describe('Authentication Flow Error Recovery @integration', () => {
    test('should recover from network errors during authentication', async ({ page }) => {
      await page.goto('/login');

      // Mock network failure
      await page.route('**/auth/login', async route => {
        await route.abort('failed');
      });

      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('password');
      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Should show network error
      await expect(page.getByText(/network.*error|connection.*failed/i)).toBeVisible();

      // Remove network mock and retry
      await page.unroute('**/auth/login');
      
      // Should be able to retry
      await page.getByRole('button', { name: /sign in|login/i }).click();
      
      // Should show authentication error (since these aren't real credentials)
      await expect(page.getByRole('alert')).toBeVisible();
    });
  });
});