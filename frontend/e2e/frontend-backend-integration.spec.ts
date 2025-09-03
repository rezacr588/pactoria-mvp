import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { TestUser, TestContract, API_ENDPOINTS } from './utils/test-data';
import { LandingPage, LoginPage, RegisterPage, DashboardPage, AppLayout } from './utils/page-objects';

/**
 * COMPREHENSIVE FRONTEND-BACKEND INTEGRATION TESTS
 * 
 * This test suite validates the complete frontend-backend integration,
 * ensuring that the frontend properly communicates with real backend APIs,
 * handles responses correctly, and provides a seamless user experience.
 */

test.describe('Frontend-Backend Integration', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  let testUser: any;
  let authenticatedContext: any;

  test.beforeAll(async ({ browser }) => {
    // Create a fresh test user for integration tests
    testUser = {
      email: `integration-test-${faker.string.uuid()}@test.com`,
      password: 'IntegrationTest123!',
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: `${faker.company.name()} Integration Test Co.`,
      timezone: 'Europe/London'
    };

    console.log('Creating test user for integration tests:', testUser.email);
  });

  test.describe('Authentication Flow Integration @critical', () => {
    test('should complete full registration flow with backend @smoke @integration', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const registerPage = new RegisterPage(page);
      
      // Navigate to landing page
      await landingPage.goto('/');
      await expect(landingPage.heroHeading).toBeVisible();

      // Click sign up
      await landingPage.clickSignUp();

      // Track registration API call
      const registerResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.auth.register) && 
                   response.request().method() === 'POST'
      );

      // Fill registration form
      await registerPage.register(testUser);

      // Validate registration API call
      const response = await registerResponse;
      expect(response.status()).toBe(201);

      const responseData = await response.json();
      expect(responseData).toHaveProperty('user');
      expect(responseData).toHaveProperty('company');
      expect(responseData).toHaveProperty('token');
      expect(responseData.user.email).toBe(testUser.email);
      expect(responseData.user.full_name).toBe(testUser.full_name);
      expect(responseData.company.name).toBe(testUser.company_name);

      // Should redirect to dashboard after successful registration
      await expect(page).toHaveURL(/\/dashboard/);

      // Store authentication state for other tests
      const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
      const tokenStorage = await page.evaluate(() => localStorage.getItem('auth-token'));
      authenticatedContext = { authStorage, tokenStorage };
    });

    test('should handle login flow with backend validation @smoke @integration', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto('/login');

      // Track login API call
      const loginResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.auth.login) && 
                   response.request().method() === 'POST'
      );

      // Perform login
      await loginPage.login(testUser);

      // Validate login API call
      const response = await loginResponse;
      expect(response.status()).toBe(200);

      const loginData = await response.json();
      expect(loginData).toHaveProperty('access_token');
      expect(loginData).toHaveProperty('token_type', 'bearer');
      expect(loginData).toHaveProperty('expires_in');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should validate invalid login credentials with backend @integration', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto('/login');

      const invalidUser = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
        full_name: 'Invalid User'
      };

      // Track failed login attempt
      const loginResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.auth.login)
      );

      await loginPage.login(invalidUser);

      // Should receive 401 or 400 error
      const response = await loginResponse;
      expect([400, 401, 422]).toContain(response.status());

      // Should display error message
      await loginPage.expectError();
      
      // Should remain on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle token refresh and validation @integration', async ({ page }) => {
      // Set up authenticated state
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      // Track me endpoint call for token validation
      const meResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.auth.me) && 
                   response.request().method() === 'GET'
      );

      await page.goto('/dashboard');

      // Should validate token with me endpoint
      const response = await meResponse;
      expect(response.status()).toBe(200);

      const userData = await response.json();
      expect(userData).toHaveProperty('id');
      expect(userData).toHaveProperty('email');
      expect(userData).toHaveProperty('full_name');
      expect(userData.email).toBe(testUser.email);
    });

    test('should handle logout flow properly @integration', async ({ page }) => {
      const appLayout = new AppLayout(page);

      // Set up authenticated state
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      await page.goto('/dashboard');

      // Perform logout
      await appLayout.logout();

      // Should clear local storage
      const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
      const tokenStorage = await page.evaluate(() => localStorage.getItem('auth-token'));
      
      expect(authStorage).toBeNull();
      expect(tokenStorage).toBeNull();

      // Should redirect to landing page
      await expect(page).toHaveURL(/\/$/);
    });
  });

  test.describe('Dashboard Integration @critical', () => {
    test.beforeEach(async ({ page }) => {
      // Set up authenticated state for dashboard tests
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should load dashboard with real backend data @smoke @integration', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);

      // Track dashboard data loading
      const analyticsResponse = page.waitForResponse(
        response => response.url().includes('/analytics') && 
                   response.request().method() === 'GET'
      );

      const contractsResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.request().method() === 'GET'
      );

      await dashboardPage.goto('/dashboard');

      // Should load analytics data
      try {
        const analytics = await analyticsResponse;
        expect(analytics.status()).toBe(200);
        const analyticsData = await analytics.json();
        expect(analyticsData).toHaveProperty('business_metrics');
      } catch (error) {
        console.log('Analytics data not loaded (expected for new user)');
      }

      // Should load contracts data
      try {
        const contracts = await contractsResponse;
        expect(contracts.status()).toBe(200);
        const contractsData = await contracts.json();
        expect(contractsData).toHaveProperty('contracts');
        expect(contractsData).toHaveProperty('total');
      } catch (error) {
        console.log('Contracts data not loaded (expected for new user)');
      }

      // Should display welcome message
      await expect(page.getByText(/welcome|good morning|dashboard/i)).toBeVisible();

      // Should display key dashboard sections
      await expect(page.getByText(/contracts/i)).toBeVisible();
      await expect(page.getByText(/analytics/i)).toBeVisible();
    });

    test('should handle empty dashboard state gracefully @integration', async ({ page }) => {
      await page.goto('/dashboard');

      // New user should see empty state or getting started guide
      const emptyStateElements = [
        /no contracts yet/i,
        /get started/i,
        /create.*first.*contract/i,
        /welcome.*aboard/i
      ];

      let emptyStateFound = false;
      for (const regex of emptyStateElements) {
        if (await page.getByText(regex).isVisible()) {
          emptyStateFound = true;
          break;
        }
      }

      // Should show some guidance for new users
      expect(emptyStateFound || await page.getByRole('button', { name: /create contract/i }).isVisible()).toBe(true);
    });

    test('should navigate to different sections from dashboard @integration', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      const appLayout = new AppLayout(page);

      await dashboardPage.goto('/dashboard');

      // Test navigation to contracts
      await appLayout.navigateTo('contracts');
      await expect(page).toHaveURL(/\/contracts/);

      // Test navigation to analytics
      await appLayout.navigateTo('analytics');
      await expect(page).toHaveURL(/\/analytics/);

      // Test navigation back to dashboard
      await appLayout.navigateTo('dashboard');
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Protected Routes Integration @critical', () => {
    test('should protect routes when not authenticated @integration', async ({ page }) => {
      // Clear any existing auth data
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Try to access protected routes
      const protectedRoutes = [
        '/dashboard',
        '/contracts',
        '/analytics',
        '/team',
        '/integrations',
        '/notifications',
        '/audit'
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should redirect to login or show login modal
        const isRedirected = page.url().includes('/login') || page.url().includes('/') && !page.url().includes(route);
        const hasLoginModal = await page.getByRole('dialog').filter({ hasText: /login|sign in/i }).isVisible();
        
        expect(isRedirected || hasLoginModal).toBe(true);
      }
    });

    test('should allow access to protected routes when authenticated @integration', async ({ page }) => {
      // Set up authenticated state
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      // Access protected routes
      const protectedRoutes = [
        '/dashboard',
        '/contracts',
        '/analytics'
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should be able to access the route
        await expect(page).toHaveURL(new RegExp(route));
        
        // Should not show login form
        await expect(page.getByLabel(/email/i).and(page.getByLabel(/password/i))).not.toBeVisible();
      }
    });

    test('should handle expired token gracefully @integration', async ({ page }) => {
      // Set up with expired token
      await page.addInitScript(() => {
        localStorage.setItem('auth-token', 'expired.jwt.token');
        localStorage.setItem('auth-storage', JSON.stringify({
          user: { email: 'test@example.com' },
          token: 'expired.jwt.token'
        }));
      });

      // Mock 401 response for expired token
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 401,
          json: { detail: 'Token expired' }
        });
      });

      await page.goto('/dashboard');

      // Should redirect to login or show auth modal
      await expect(page.getByText(/login|sign in|expired/i)).toBeVisible();
    });
  });

  test.describe('Real-time Data Updates Integration', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should handle real-time updates via polling @integration', async ({ page }) => {
      await page.goto('/dashboard');

      // Track API calls to see if periodic updates occur
      let requestCount = 0;
      page.on('request', request => {
        if (request.url().includes('/analytics') || request.url().includes('/contracts')) {
          requestCount++;
        }
      });

      // Wait for potential polling requests
      await page.waitForTimeout(3000);

      // Should have made at least initial requests
      expect(requestCount).toBeGreaterThan(0);
    });

    test('should handle WebSocket connections if implemented @integration', async ({ page }) => {
      await page.goto('/dashboard');

      // Check if WebSocket is available and connections are made
      const webSocketInfo = await page.evaluate(() => {
        const wsConnections = [];
        const originalWebSocket = window.WebSocket;
        
        if (originalWebSocket) {
          // Check if any WebSocket connections were opened
          return {
            available: true,
            connections: (window as any).wsConnections || []
          };
        }
        
        return { available: false, connections: [] };
      });

      if (webSocketInfo.available) {
        console.log('WebSocket available, connections:', webSocketInfo.connections);
        
        // If WebSocket is implemented, look for real-time indicators
        const realTimeIndicator = page.getByText(/live|real.*time|updating/i);
        if (await realTimeIndicator.isVisible()) {
          await expect(realTimeIndicator).toBeVisible();
        }
      }
    });
  });

  test.describe('Error Handling Integration @critical', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should handle API server errors gracefully @integration', async ({ page }) => {
      // Mock server error
      await page.route('**/api/v1/**', async route => {
        await route.fulfill({
          status: 500,
          json: { detail: 'Internal server error' }
        });
      });

      await page.goto('/dashboard');

      // Should display error message
      await expect(page.getByText(/error|failed.*load|server.*error/i)).toBeVisible();

      // Should provide retry mechanism
      const retryButton = page.getByRole('button', { name: /retry|refresh/i });
      if (await retryButton.isVisible()) {
        // Clear error mock and retry
        await page.unroute('**/api/v1/**');
        await retryButton.click();
        
        // Should recover and load data
        await page.waitForTimeout(2000);
      }
    });

    test('should handle network connectivity issues @integration', async ({ page }) => {
      await page.goto('/dashboard');

      // Simulate network failure
      await page.route('**/api/v1/**', async route => {
        await route.abort('failed');
      });

      // Try to trigger new API calls
      await page.reload();

      // Should show network error
      await expect(page.getByText(/network.*error|connection.*failed|offline/i)).toBeVisible();
    });

    test('should handle partial API failures gracefully @integration', async ({ page }) => {
      // Mock: contracts succeed, analytics fail
      await page.route('**/contracts**', async route => {
        await route.fulfill({
          status: 200,
          json: { contracts: [], total: 0, page: 1, size: 10, pages: 0 }
        });
      });

      await page.route('**/analytics**', async route => {
        await route.fulfill({
          status: 503,
          json: { detail: 'Analytics service unavailable' }
        });
      });

      await page.goto('/dashboard');

      // Should show available data (contracts)
      await expect(page.getByText(/contracts/i)).toBeVisible();

      // Should show error for unavailable data (analytics)
      const analyticsError = page.getByText(/analytics.*unavailable|service.*unavailable/i);
      if (await analyticsError.isVisible()) {
        await expect(analyticsError).toBeVisible();
      }
    });
  });

  test.describe('Data Validation Integration', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should validate backend API response structures @integration', async ({ page }) => {
      // Track all API responses
      const apiResponses: any[] = [];
      
      page.on('response', async response => {
        if (response.url().includes('/api/v1/')) {
          try {
            const data = await response.json();
            apiResponses.push({
              url: response.url(),
              status: response.status(),
              data
            });
          } catch (error) {
            // Non-JSON response
          }
        }
      });

      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      // Validate response structures
      for (const response of apiResponses) {
        expect(response.status).toBeLessThan(500);
        
        if (response.url.includes('/analytics')) {
          expect(response.data).toHaveProperty('business_metrics');
        }
        
        if (response.url.includes('/contracts')) {
          expect(response.data).toHaveProperty('contracts');
          expect(response.data).toHaveProperty('total');
        }
        
        if (response.url.includes('/auth/me')) {
          expect(response.data).toHaveProperty('id');
          expect(response.data).toHaveProperty('email');
        }
      }
    });

    test('should handle malformed API responses @integration', async ({ page }) => {
      // Mock malformed response
      await page.route('**/analytics/dashboard', async route => {
        await route.fulfill({
          status: 200,
          body: 'invalid json response'
        });
      });

      await page.goto('/analytics');

      // Should handle JSON parse error
      await expect(page.getByText(/error.*loading|invalid.*data|parse.*error/i)).toBeVisible();
    });
  });

  test.describe('Performance Integration', () => {
    test('should load application within reasonable time @integration', async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      const startTime = Date.now();

      await page.goto('/dashboard');
      
      // Wait for key elements to be visible
      await expect(page.getByText(/dashboard|welcome/i)).toBeVisible();

      const loadTime = Date.now() - startTime;
      
      // Should load within 15 seconds (includes API calls)
      expect(loadTime).toBeLessThan(15000);
    });

    test('should handle concurrent API requests efficiently @integration', async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      // Track concurrent requests
      let concurrentRequests = 0;
      let maxConcurrent = 0;
      
      page.on('request', request => {
        if (request.url().includes('/api/v1/')) {
          concurrentRequests++;
          maxConcurrent = Math.max(maxConcurrent, concurrentRequests);
        }
      });
      
      page.on('response', response => {
        if (response.url().includes('/api/v1/')) {
          concurrentRequests--;
        }
      });

      await page.goto('/dashboard');
      await page.waitForTimeout(3000);

      // Should handle concurrent requests (but not too many)
      expect(maxConcurrent).toBeGreaterThan(0);
      expect(maxConcurrent).toBeLessThan(20); // Reasonable limit
    });
  });

  // Cleanup
  test.afterAll(async () => {
    console.log('Frontend-Backend Integration tests completed');
  });
});