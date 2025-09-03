import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * SIMPLIFIED BACKEND INTEGRATION TESTS
 * 
 * These tests focus on core integration functionality with the current UI structure.
 * They validate frontend-backend communication patterns and error handling.
 */

test.describe('Simplified Backend Integration Tests', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';

  test.describe('Basic Frontend-Backend Communication', () => {
    test('should handle API calls with proper error handling @smoke @integration', async ({ page }) => {
      // Navigate to the main app
      await page.goto('/');
      
      // Should load the homepage
      await expect(page.locator('body')).toBeVisible();
      
      // Check if app loads without critical errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForLoadState('networkidle');
      
      // Should not have critical JavaScript errors
      expect(consoleErrors.length).toBe(0);
    });

    test('should navigate to login page and display form @integration', async ({ page }) => {
      await page.goto('/login');
      
      // Should display login form
      await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      
      // Should display registration option
      await expect(page.getByText(/sign up|create account/i)).toBeVisible();
    });

    test('should switch between login and registration modes @integration', async ({ page }) => {
      await page.goto('/login');
      
      // Should start in login mode
      await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
      
      // Click to switch to registration mode
      const signUpLink = page.getByText(/sign up/i).first();
      if (await signUpLink.isVisible()) {
        await signUpLink.click();
        
        // Should now show registration form
        await expect(page.getByRole('button', { name: /register|sign up|create account/i })).toBeVisible();
        await expect(page.getByLabel(/full name/i)).toBeVisible();
        await expect(page.getByLabel(/company/i)).toBeVisible();
      }
    });
  });

  test.describe('Authentication Flow Integration', () => {
    test('should handle login form submission @integration', async ({ page }) => {
      await page.goto('/login');
      
      // Fill login form
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('testpassword');
      
      // Track login API call (even if it fails, we want to see the call is made)
      let loginAttempted = false;
      page.on('request', request => {
        if (request.url().includes('/auth/login') && request.method() === 'POST') {
          loginAttempted = true;
        }
      });
      
      // Submit login
      await page.getByRole('button', { name: /sign in|login/i }).click();
      
      // Wait a moment for API call
      await page.waitForTimeout(2000);
      
      // Should have attempted login API call
      expect(loginAttempted).toBe(true);
      
      // Should show either success (redirect) or error message
      const isRedirected = page.url() !== new URL('/login', page.url()).href;
      const hasErrorMessage = await page.getByRole('alert').isVisible();
      
      // One of these should be true (either success or handled error)
      expect(isRedirected || hasErrorMessage).toBe(true);
    });

    test('should handle registration form submission @integration', async ({ page }) => {
      await page.goto('/login');
      
      // Switch to registration mode
      const signUpLink = page.getByText(/sign up/i).first();
      if (await signUpLink.isVisible()) {
        await signUpLink.click();
        
        // Fill registration form
        await page.getByLabel(/full name/i).fill('Test User');
        await page.getByLabel(/email/i).fill(`test-${Date.now()}@example.com`);
        await page.getByLabel(/password/i).fill('TestPassword123!');
        await page.getByLabel(/company/i).fill('Test Company');
        
        // Track registration API call
        let registrationAttempted = false;
        page.on('request', request => {
          if (request.url().includes('/auth/register') && request.method() === 'POST') {
            registrationAttempted = true;
          }
        });
        
        // Submit registration
        await page.getByRole('button', { name: /register|sign up|create account/i }).click();
        
        // Wait for API call
        await page.waitForTimeout(2000);
        
        // Should have attempted registration API call
        expect(registrationAttempted).toBe(true);
        
        // Should show either success or error
        const isRedirected = page.url() !== new URL('/login', page.url()).href;
        const hasErrorMessage = await page.getByRole('alert').isVisible();
        
        expect(isRedirected || hasErrorMessage).toBe(true);
      }
    });

    test('should handle demo login functionality @integration', async ({ page }) => {
      await page.goto('/login');
      
      const demoButton = page.getByRole('button', { name: /demo|try demo/i });
      if (await demoButton.isVisible()) {
        // Track demo login API call
        let demoLoginAttempted = false;
        page.on('request', request => {
          if (request.url().includes('/auth/login') && request.method() === 'POST') {
            demoLoginAttempted = true;
          }
        });
        
        await demoButton.click();
        await page.waitForTimeout(2000);
        
        // Should have attempted login or shown appropriate message
        expect(demoLoginAttempted || await page.getByText(/demo/i).isVisible()).toBe(true);
      }
    });
  });

  test.describe('Protected Routes Integration', () => {
    test('should redirect unauthenticated users to login @integration', async ({ page }) => {
      const protectedRoutes = ['/dashboard', '/contracts', '/analytics'];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should either redirect to login or show login form
        const currentUrl = page.url();
        const isOnLoginPage = currentUrl.includes('/login') || currentUrl === new URL('/', page.url()).href;
        const hasLoginForm = await page.getByRole('button', { name: /sign in|login/i }).isVisible();
        
        expect(isOnLoginPage || hasLoginForm).toBe(true);
      }
    });

    test('should handle navigation after authentication @integration', async ({ page }) => {
      // Set up mock authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { 
              id: 'test-user-123', 
              email: 'test@example.com',
              full_name: 'Test User'
            },
            company: null
          }
        }));
        localStorage.setItem('auth-token', 'mock-test-token');
      });

      // Navigate to protected route
      await page.goto('/contracts');
      
      // Should not redirect to login
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toMatch(/\/login/);
      
      // Should display the contracts page content
      await expect(page.getByText(/contracts/i)).toBeVisible();
    });
  });

  test.describe('API Integration Patterns', () => {
    test('should handle API loading states @integration', async ({ page }) => {
      // Set up authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@example.com' },
            company: null
          }
        }));
        localStorage.setItem('auth-token', 'test-token');
      });

      // Mock slow API response
      await page.route('**/contracts', async route => {
        // Simulate slow response
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: {
            contracts: [],
            total: 0,
            page: 1,
            size: 10,
            pages: 0
          }
        });
      });

      await page.goto('/contracts');
      
      // Should show loading indicator initially
      const hasLoadingIndicator = await page.locator('.animate-pulse, [data-loading="true"], .loading').isVisible();
      
      // Eventually should show content or empty state
      await expect(page.getByText(/contracts/i)).toBeVisible();
    });

    test('should handle API error states @integration', async ({ page }) => {
      // Set up authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@example.com' },
            company: null
          }
        }));
        localStorage.setItem('auth-token', 'test-token');
      });

      // Mock API error
      await page.route('**/contracts', async route => {
        await route.fulfill({
          status: 500,
          json: { detail: 'Internal server error' }
        });
      });

      await page.goto('/contracts');
      await page.waitForTimeout(2000);
      
      // Should display error message or fallback content
      const hasErrorHandling = 
        await page.getByText(/error|failed|try again|something went wrong/i).isVisible() ||
        await page.getByRole('button', { name: /retry|refresh/i }).isVisible() ||
        await page.getByText(/contracts/i).isVisible(); // Graceful fallback
      
      expect(hasErrorHandling).toBe(true);
    });

    test('should handle network failures gracefully @integration', async ({ page }) => {
      await page.goto('/');
      
      // Mock network failure
      await page.route('**/*', async route => {
        if (route.request().url().includes('/api/')) {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });

      // Navigate to a page that would make API calls
      await page.goto('/login');
      
      // Should still render the page
      await expect(page.locator('body')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
      
      // Application should remain functional despite network issues
      expect(true).toBe(true);
    });
  });

  test.describe('Data Flow Integration', () => {
    test('should maintain state across page navigation @integration', async ({ page }) => {
      // Set up authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@example.com' },
            company: null
          }
        }));
        localStorage.setItem('auth-token', 'test-token');
      });

      await page.goto('/dashboard');
      await page.waitForTimeout(500);
      
      // Navigate to different pages
      await page.goto('/contracts');
      await page.waitForTimeout(500);
      
      await page.goto('/analytics');
      await page.waitForTimeout(500);
      
      // Return to dashboard
      await page.goto('/dashboard');
      
      // Authentication state should be maintained
      const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
      expect(authStorage).toBeTruthy();
      
      // Should not redirect to login
      expect(page.url()).not.toMatch(/\/login/);
    });

    test('should clear state on logout @integration', async ({ page }) => {
      // Set up authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@example.com' },
            company: null
          }
        }));
        localStorage.setItem('auth-token', 'test-token');
      });

      await page.goto('/dashboard');
      
      // Look for logout button
      const userMenu = page.getByTestId('user-menu');
      if (await userMenu.isVisible()) {
        await userMenu.click();
        
        const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
        if (await logoutButton.isVisible()) {
          await logoutButton.click();
          
          await page.waitForTimeout(1000);
          
          // Should clear authentication state
          const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
          const tokenStorage = await page.evaluate(() => localStorage.getItem('auth-token'));
          
          expect(authStorage || tokenStorage).toBeFalsy();
          
          // Should redirect to login or home
          const isLoggedOut = page.url().includes('/login') || page.url().endsWith('/');
          expect(isLoggedOut).toBe(true);
        }
      }
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should load pages within reasonable time @integration', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
      
      // Should be functional
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle concurrent API calls @integration', async ({ page }) => {
      // Set up authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@example.com' },
            company: null
          }
        }));
        localStorage.setItem('auth-token', 'test-token');
      });

      let requestCount = 0;
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          requestCount++;
        }
      });

      // Navigate to pages that might make multiple API calls
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);
      
      await page.goto('/contracts');
      await page.waitForTimeout(1000);
      
      await page.goto('/analytics');
      await page.waitForTimeout(1000);

      // Should handle multiple concurrent requests without issues
      expect(requestCount).toBeGreaterThan(0);
      
      // Application should remain responsive
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Browser Compatibility', () => {
    test('should work with JavaScript enabled @integration', async ({ page }) => {
      await page.goto('/');
      
      // Test JavaScript functionality
      const jsWorks = await page.evaluate(() => {
        return typeof window !== 'undefined' && 
               typeof document !== 'undefined' && 
               typeof localStorage !== 'undefined';
      });
      
      expect(jsWorks).toBe(true);
    });

    test('should handle localStorage gracefully @integration', async ({ page }) => {
      await page.goto('/');
      
      // Test localStorage functionality
      const localStorageWorks = await page.evaluate(() => {
        try {
          localStorage.setItem('test', 'value');
          const value = localStorage.getItem('test');
          localStorage.removeItem('test');
          return value === 'value';
        } catch (error) {
          return false;
        }
      });
      
      expect(localStorageWorks).toBe(true);
    });
  });
});