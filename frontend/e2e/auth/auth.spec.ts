import { test, expect } from '@playwright/test';
import { 
  LandingPage, 
  LoginPage, 
  RegisterPage, 
  DashboardPage, 
  AppLayout 
} from '../utils/page-objects';
import { TestUser } from '../utils/test-data';
import { APIMocker } from '../utils/api-mock';

test.describe('Authentication Flow', () => {
  let landingPage: LandingPage;
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let dashboardPage: DashboardPage;
  let appLayout: AppLayout;
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    dashboardPage = new DashboardPage(page);
    appLayout = new AppLayout(page);
    apiMocker = new APIMocker(page);

    // Set up API mocking
    await apiMocker.mockAllEndpoints();
  });

  test.describe('Landing Page', () => {
    test('should display landing page with login and signup options @smoke', async ({ page }) => {
      await landingPage.goto('/');
      
      await expect(landingPage.heroHeading).toBeVisible();
      await expect(landingPage.loginButton).toBeVisible();
      await expect(landingPage.signUpButton).toBeVisible();
      
      // Check page title and meta description
      await expect(page).toHaveTitle(/pactoria/i);
    });

    test('should navigate to login page', async () => {
      await landingPage.goto('/');
      await landingPage.clickLogin();
      
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();
    });

    test('should navigate to register page', async () => {
      await landingPage.goto('/');
      await landingPage.clickSignUp();
      
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.fullNameInput).toBeVisible();
      await expect(registerPage.registerButton).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should login with valid credentials @smoke', async ({ page }) => {
      const testUser = TestUser.admin();
      
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      // Check that user is authenticated
      await expect(appLayout.userMenu).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      // Mock authentication failure
      await page.route('**/auth/login', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Invalid email or password'
          })
        });
      });
      
      await loginPage.goto('/login');
      await loginPage.login({
        email: 'invalid@test.com',
        password: 'wrongpassword',
        full_name: 'Test User'
      });
      
      // Should show error message
      await loginPage.expectError('Invalid email or password');
      
      // Should remain on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should validate email format', async ({ page }) => {
      await loginPage.goto('/login');
      
      await loginPage.emailInput.fill('invalid-email');
      await loginPage.passwordInput.fill('password123');
      await loginPage.loginButton.click();
      
      // Should show validation error (either browser validation or custom)
      const emailInput = loginPage.emailInput;
      const validationMessage = await emailInput.getAttribute('validationMessage') || 
                               await page.locator('[data-testid="email-error"]').textContent();
      
      expect(validationMessage).toBeTruthy();
    });

    test('should handle empty form submission', async ({ page }) => {
      await loginPage.goto('/login');
      await loginPage.loginButton.click();
      
      // Should prevent form submission or show validation errors
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect authenticated user from login page', async ({ page }) => {
      // Mock authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });
      
      await loginPage.goto('/login');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('User Registration', () => {
    test('should register with valid data', async ({ page }) => {
      const testUser = TestUser.random();
      
      await registerPage.goto('/register');
      await registerPage.register(testUser);
      
      // Should redirect to dashboard after registration
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(dashboardPage.welcomeMessage).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await registerPage.goto('/register');
      await registerPage.registerButton.click();
      
      // Should show validation errors for required fields
      await expect(page).toHaveURL(/\/register/);
    });

    test('should validate email format during registration', async ({ page }) => {
      const testUser = TestUser.random();
      testUser.email = 'invalid-email';
      
      await registerPage.goto('/register');
      await registerPage.fullNameInput.fill(testUser.full_name);
      await registerPage.emailInput.fill(testUser.email);
      await registerPage.passwordInput.fill(testUser.password);
      await registerPage.registerButton.click();
      
      // Should show email validation error
      await expect(page).toHaveURL(/\/register/);
    });

    test('should handle registration server errors', async ({ page }) => {
      // Mock server error
      await page.route('**/auth/register', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Email already exists'
          })
        });
      });
      
      const testUser = TestUser.random();
      await registerPage.goto('/register');
      await registerPage.register(testUser);
      
      // Should show error message
      const errorMessage = page.getByRole('alert');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Email already exists');
    });

    test('should toggle between login and register pages', async ({ page }) => {
      await registerPage.goto('/register');
      await registerPage.loginLink.click();
      
      await expect(page).toHaveURL(/\/login/);
      await expect(loginPage.emailInput).toBeVisible();
      
      await loginPage.registerLink.click();
      
      await expect(page).toHaveURL(/\/register/);
      await expect(registerPage.fullNameInput).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route without authentication
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should allow authenticated users to access protected routes', async ({ page }) => {
      // Mock authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com', full_name: 'Test User' },
            token: 'mock-token'
          }
        }));
      });
      
      await page.goto('/dashboard');
      
      // Should stay on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(dashboardPage.welcomeMessage).toBeVisible();
    });

    test('should handle token expiration', async ({ page }) => {
      // Mock authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'expired-token'
          }
        }));
      });
      
      // Mock token validation failure
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Token expired'
          })
        });
      });
      
      await page.goto('/dashboard');
      
      // Should redirect to login due to expired token
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('User Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Set up authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com', full_name: 'Test User' },
            token: 'mock-token'
          }
        }));
      });
      
      await dashboardPage.goto('/dashboard');
    });

    test('should logout user and redirect to landing page', async ({ page }) => {
      await appLayout.logout();
      
      // Should redirect to landing page
      await expect(page).toHaveURL('/');
      
      // User should no longer be authenticated
      const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        expect(parsed.state.user).toBeNull();
        expect(parsed.state.token).toBeNull();
      }
    });

    test('should clear authentication state on logout', async ({ page }) => {
      await appLayout.logout();
      
      // Try to access protected route after logout
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Session Management', () => {
    test('should persist authentication state across page reloads', async ({ page }) => {
      const testUser = TestUser.admin();
      
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      
      // Reload the page
      await page.reload();
      
      // Should still be authenticated
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(dashboardPage.welcomeMessage).toBeVisible();
    });

    test('should handle concurrent sessions', async ({ context }) => {
      const testUser = TestUser.admin();
      
      // Login in first tab
      const page1 = await context.newPage();
      const loginPage1 = new LoginPage(page1);
      const apiMocker1 = new APIMocker(page1);
      
      await apiMocker1.mockAllEndpoints();
      await loginPage1.goto('/login');
      await loginPage1.login(testUser);
      
      // Open second tab and check authentication
      const page2 = await context.newPage();
      await page2.goto('/dashboard');
      
      // Both tabs should be authenticated
      await expect(page1).toHaveURL(/\/dashboard/);
      await expect(page2).toHaveURL(/\/dashboard/);
    });
  });
});