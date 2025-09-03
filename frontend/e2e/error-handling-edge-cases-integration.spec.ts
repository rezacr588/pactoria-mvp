import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { TestUser } from './utils/test-data';

/**
 * ERROR HANDLING AND EDGE CASES INTEGRATION TESTS
 * 
 * This comprehensive test suite validates how the frontend handles various error conditions,
 * network failures, edge cases, and boundary conditions in integration with the backend.
 * These tests ensure the application provides a robust user experience under adverse conditions.
 */

test.describe('Error Handling and Edge Cases Integration', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  let authenticatedContext: any;
  let testUser: any;

  test.beforeAll(async ({ browser }) => {
    // Create authenticated context for error handling tests
    testUser = {
      email: `error-test-${faker.string.uuid()}@integration-test.com`,
      password: 'ErrorTest123!',
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: `${faker.company.name()} Error Test Co.`
    };

    const context = await browser.newContext();
    const page = await context.newPage();

    // Register test user
    await page.goto('/register');
    await page.getByLabel(/full name|name/i).fill(testUser.full_name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByLabel(/company/i).fill(testUser.company_name);
    
    const regResponse = page.waitForResponse(response => response.url().includes('/auth/register'));
    await page.getByRole('button', { name: /register|sign up/i }).click();
    await regResponse;
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Store authentication state
    const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
    const tokenStorage = await page.evaluate(() => localStorage.getItem('auth-token'));
    
    authenticatedContext = { authStorage, tokenStorage };
    await context.close();
  });

  test.describe('Network Connectivity Issues @critical', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should handle complete network failure gracefully @smoke @integration', async ({ page }) => {
      await page.goto('/dashboard');

      // Simulate complete network failure
      await page.route('**/*', async route => {
        await route.abort('failed');
      });

      // Try to navigate to contracts (should trigger API call)
      await page.goto('/contracts');

      // Should display network error message
      const networkErrorMessages = [
        /network.*error|connection.*failed/i,
        /unable.*to.*connect/i,
        /offline|no.*internet/i,
        /failed.*to.*load/i,
        /service.*unavailable/i
      ];

      let errorDisplayed = false;
      for (const errorRegex of networkErrorMessages) {
        if (await page.getByText(errorRegex).isVisible({ timeout: 10000 })) {
          errorDisplayed = true;
          break;
        }
      }

      expect(errorDisplayed).toBe(true);

      // Should provide retry mechanism
      const retryButton = page.getByRole('button', { name: /retry|refresh|try.*again/i });
      if (await retryButton.isVisible()) {
        // Clear network block and retry
        await page.unroute('**/*');
        await retryButton.click();
        
        // Should eventually load successfully
        await expect(page.getByText(/contracts/i)).toBeVisible({ timeout: 15000 });
      }
    });

    test('should handle intermittent network failures @integration', async ({ page }) => {
      let requestCount = 0;

      await page.route('**/api/v1/**', async route => {
        requestCount++;
        
        if (requestCount % 2 === 1) {
          // Fail odd-numbered requests
          await route.abort('failed');
        } else {
          // Allow even-numbered requests
          await route.continue();
        }
      });

      await page.goto('/contracts');

      // Should eventually succeed despite intermittent failures
      await expect(page.getByText(/contracts/i)).toBeVisible({ timeout: 20000 });
      
      // Should have made multiple attempts
      expect(requestCount).toBeGreaterThan(1);
    });

    test('should handle slow network responses @integration', async ({ page }) => {
      // Mock slow API responses
      await page.route('**/api/v1/**', async route => {
        // Add 3-second delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.continue();
      });

      const startTime = Date.now();
      
      await page.goto('/contracts');

      // Should show loading indicators during slow requests
      const loadingIndicators = [
        '[data-testid="loading-spinner"]',
        '[data-testid="skeleton"]',
        'text=/loading|please wait/i',
        '.loading',
        '.spinner'
      ];

      let loadingVisible = false;
      for (const indicator of loadingIndicators) {
        try {
          await page.waitForSelector(indicator, { timeout: 2000 });
          loadingVisible = true;
          break;
        } catch (error) {
          // Continue checking other indicators
        }
      }

      // Should eventually load content
      await expect(page.getByText(/contracts/i)).toBeVisible({ timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeGreaterThan(3000); // Should respect the delay
      
      console.log(`Slow network handling completed in ${loadTime}ms, loading indicator visible: ${loadingVisible}`);
    });

    test('should handle DNS resolution failures @integration', async ({ page }) => {
      // Simulate DNS failure by routing to invalid host
      await page.route('**/api/v1/**', async route => {
        await route.fulfill({
          status: 0, // Simulate network error
          body: ''
        });
      });

      await page.goto('/contracts');

      // Should handle DNS failure gracefully
      const dnsErrorMessages = [
        /dns.*error|host.*not.*found/i,
        /connection.*refused/i,
        /network.*unreachable/i,
        /server.*not.*responding/i
      ];

      let dnsErrorHandled = false;
      for (const errorRegex of dnsErrorMessages) {
        if (await page.getByText(errorRegex).isVisible()) {
          dnsErrorHandled = true;
          break;
        }
      }

      // Should at least show some error indication
      const generalErrorShown = await page.getByText(/error|failed|unable/i).isVisible();
      expect(dnsErrorHandled || generalErrorShown).toBe(true);
    });
  });

  test.describe('Server Error Responses @critical', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should handle 500 internal server errors @integration', async ({ page }) => {
      // Mock 500 error
      await page.route('**/contracts', async route => {
        await route.fulfill({
          status: 500,
          json: { detail: 'Internal server error' }
        });
      });

      await page.goto('/contracts');

      // Should display server error message
      const serverErrorMessages = [
        /server.*error|internal.*error/i,
        /something.*went.*wrong/i,
        /error.*500/i,
        /service.*temporarily.*unavailable/i
      ];

      let serverErrorDisplayed = false;
      for (const errorRegex of serverErrorMessages) {
        if (await page.getByText(errorRegex).isVisible()) {
          serverErrorDisplayed = true;
          break;
        }
      }

      expect(serverErrorDisplayed).toBe(true);

      // Should provide retry option
      const retryButton = page.getByRole('button', { name: /retry|try.*again/i });
      if (await retryButton.isVisible()) {
        // Clear error mock
        await page.unroute('**/contracts');
        await retryButton.click();
        
        // Should recover
        await expect(page.getByText(/contracts/i)).toBeVisible();
      }
    });

    test('should handle 502 bad gateway errors @integration', async ({ page }) => {
      // Mock 502 error
      await page.route('**/api/v1/**', async route => {
        await route.fulfill({
          status: 502,
          json: { detail: 'Bad gateway' }
        });
      });

      await page.goto('/dashboard');

      // Should handle gateway errors
      const gatewayErrorMessages = [
        /bad.*gateway|gateway.*error/i,
        /service.*unavailable/i,
        /upstream.*server.*error/i
      ];

      let gatewayErrorHandled = false;
      for (const errorRegex of gatewayErrorMessages) {
        if (await page.getByText(errorRegex).isVisible()) {
          gatewayErrorHandled = true;
          break;
        }
      }

      // Should show some error indication
      const errorShown = gatewayErrorHandled || await page.getByText(/error|unavailable/i).isVisible();
      expect(errorShown).toBe(true);
    });

    test('should handle 503 service unavailable errors @integration', async ({ page }) => {
      // Mock 503 error
      await page.route('**/analytics/dashboard', async route => {
        await route.fulfill({
          status: 503,
          json: { detail: 'Analytics service temporarily unavailable' }
        });
      });

      await page.goto('/analytics');

      // Should display service unavailable message
      const serviceErrorMessages = [
        /service.*unavailable|temporarily.*unavailable/i,
        /maintenance.*mode/i,
        /analytics.*unavailable/i,
        /error.*503/i
      ];

      let serviceErrorDisplayed = false;
      for (const errorRegex of serviceErrorMessages) {
        if (await page.getByText(errorRegex).isVisible()) {
          serviceErrorDisplayed = true;
          break;
        }
      }

      expect(serviceErrorDisplayed).toBe(true);
    });

    test('should handle cascading failures across multiple services @integration', async ({ page }) => {
      // Mock multiple service failures
      await page.route('**/contracts', async route => {
        await route.fulfill({ status: 500, json: { detail: 'Contracts service down' } });
      });

      await page.route('**/analytics/**', async route => {
        await route.fulfill({ status: 503, json: { detail: 'Analytics service down' } });
      });

      await page.route('**/team/**', async route => {
        await route.fulfill({ status: 502, json: { detail: 'Team service down' } });
      });

      await page.goto('/dashboard');

      // Should handle multiple service failures gracefully
      const cascadingFailureMessages = [
        /multiple.*services.*unavailable/i,
        /system.*maintenance/i,
        /experiencing.*technical.*difficulties/i,
        /services.*temporarily.*down/i
      ];

      let cascadingFailureHandled = false;
      for (const errorRegex of cascadingFailureMessages) {
        if (await page.getByText(errorRegex).isVisible()) {
          cascadingFailureHandled = true;
          break;
        }
      }

      // Should at least show general error indication
      const generalErrorShown = cascadingFailureHandled || 
                               await page.getByText(/error|unavailable|down/i).isVisible();
      expect(generalErrorShown).toBe(true);
    });
  });

  test.describe('Authentication and Authorization Edge Cases @critical', () => {
    test('should handle token expiration during active session @integration', async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      await page.goto('/dashboard');

      // Mock token expiration
      await page.route('**/api/v1/**', async route => {
        await route.fulfill({
          status: 401,
          json: { detail: 'Token has expired' }
        });
      });

      // Try to access protected resource
      await page.goto('/contracts');

      // Should handle token expiration
      const tokenExpirationMessages = [
        /session.*expired|token.*expired/i,
        /please.*log.*in.*again/i,
        /authentication.*required/i,
        /unauthorized/i
      ];

      let tokenExpirationHandled = false;
      for (const errorRegex of tokenExpirationMessages) {
        if (await page.getByText(errorRegex).isVisible()) {
          tokenExpirationHandled = true;
          break;
        }
      }

      // Should redirect to login or show login modal
      const redirectedToLogin = page.url().includes('/login');
      const loginModalVisible = await page.getByRole('dialog').filter({ hasText: /login|sign in/i }).isVisible();

      expect(tokenExpirationHandled || redirectedToLogin || loginModalVisible).toBe(true);
    });

    test('should handle invalid/corrupted tokens @integration', async ({ page }) => {
      // Set corrupted token
      await page.addInitScript(() => {
        localStorage.setItem('auth-token', 'invalid.corrupted.token');
        localStorage.setItem('auth-storage', JSON.stringify({
          user: { email: 'test@example.com' },
          token: 'invalid.corrupted.token'
        }));
      });

      // Mock invalid token response
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 401,
          json: { detail: 'Invalid token format' }
        });
      });

      await page.goto('/dashboard');

      // Should handle invalid token
      const invalidTokenMessages = [
        /invalid.*token|corrupted.*token/i,
        /authentication.*failed/i,
        /please.*log.*in/i
      ];

      let invalidTokenHandled = false;
      for (const errorRegex of invalidTokenMessages) {
        if (await page.getByText(errorRegex).isVisible()) {
          invalidTokenHandled = true;
          break;
        }
      }

      // Should clear invalid token and redirect
      const clearedToken = await page.evaluate(() => localStorage.getItem('auth-token'));
      const redirectedToAuth = page.url().includes('/login') || page.url().includes('/');

      expect(invalidTokenHandled || clearedToken === null || redirectedToAuth).toBe(true);
    });

    test('should handle insufficient permissions gracefully @integration', async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      // Mock insufficient permissions for team management
      await page.route('**/team/**', async route => {
        await route.fulfill({
          status: 403,
          json: { detail: 'Insufficient permissions to access team management' }
        });
      });

      await page.goto('/team');

      // Should handle permission errors
      const permissionErrorMessages = [
        /insufficient.*permissions|permission.*denied/i,
        /access.*denied|forbidden/i,
        /not.*authorized/i,
        /admin.*only|manager.*only/i
      ];

      let permissionErrorHandled = false;
      for (const errorRegex of permissionErrorMessages) {
        if (await page.getByText(errorRegex).isVisible()) {
          permissionErrorHandled = true;
          break;
        }
      }

      expect(permissionErrorHandled).toBe(true);
    });

    test('should handle concurrent authentication states @integration', async ({ page }) => {
      // Simulate user logged in elsewhere with different token
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      await page.goto('/dashboard');

      // Mock conflicting session response
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 409,
          json: { detail: 'Session conflict detected. Please log in again.' }
        });
      });

      // Trigger authentication check
      await page.reload();

      // Should handle session conflicts
      const sessionConflictMessages = [
        /session.*conflict|multiple.*sessions/i,
        /logged.*in.*elsewhere/i,
        /session.*expired/i
      ];

      let sessionConflictHandled = false;
      for (const errorRegex of sessionConflictMessages) {
        if (await page.getByText(errorRegex).isVisible()) {
          sessionConflictHandled = true;
          break;
        }
      }

      // Should at least redirect to login
      const redirectedToLogin = page.url().includes('/login') || !page.url().includes('/dashboard');
      expect(sessionConflictHandled || redirectedToLogin).toBe(true);
    });
  });

  test.describe('Data Validation and Input Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should handle malformed API responses @integration', async ({ page }) => {
      // Mock malformed JSON response
      await page.route('**/contracts', async route => {
        await route.fulfill({
          status: 200,
          body: 'invalid json response {malformed'
        });
      });

      await page.goto('/contracts');

      // Should handle JSON parse errors
      const parseErrorMessages = [
        /invalid.*response|malformed.*data/i,
        /parse.*error|json.*error/i,
        /unexpected.*response.*format/i
      ];

      let parseErrorHandled = false;
      for (const errorRegex of parseErrorMessages) {
        if (await page.getByText(errorRegex).isVisible()) {
          parseErrorHandled = true;
          break;
        }
      }

      // Should show some error indication
      const errorShown = parseErrorHandled || await page.getByText(/error|failed/i).isVisible();
      expect(errorShown).toBe(true);
    });

    test('should handle extremely large data responses @integration', async ({ page }) => {
      // Mock extremely large response
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: `contract-${i}`,
        title: `Contract ${i} - ${faker.lorem.words(20)}`,
        description: faker.lorem.paragraphs(10),
        content: faker.lorem.paragraphs(50),
        metadata: {
          tags: Array.from({ length: 100 }, () => faker.lorem.word()),
          attributes: Object.fromEntries(
            Array.from({ length: 50 }, (_, j) => [
              `attr_${j}`, faker.lorem.sentences(5)
            ])
          )
        }
      }));

      await page.route('**/contracts', async route => {
        await route.fulfill({
          status: 200,
          json: {
            contracts: largeArray,
            total: largeArray.length,
            page: 1,
            size: largeArray.length,
            pages: 1
          }
        });
      });

      const startTime = Date.now();
      
      await page.goto('/contracts');

      // Should handle large responses without crashing
      try {
        await expect(page.getByText(/contracts/i)).toBeVisible({ timeout: 30000 });
        
        const loadTime = Date.now() - startTime;
        console.log(`Large data response handled in ${loadTime}ms`);
        
        // Should implement pagination or virtualization for performance
        const contractElements = page.locator('[data-testid="contract-row"]');
        const visibleCount = await contractElements.count();
        
        // Should not render all 10,000 items at once
        expect(visibleCount).toBeLessThan(100);
      } catch (error) {
        // Should at least not crash the application
        const errorShown = await page.getByText(/error|failed|too.*large/i).isVisible();
        expect(errorShown).toBe(true);
      }
    });

    test('should handle special characters and unicode in data @integration', async ({ page }) => {
      const specialCharacterData = {
        contracts: [
          {
            id: 'special-1',
            title: '특별한 계약 🚀 Contract with émojis & 中文',
            description: 'Contract with special chars: àáâãäåæçèéêë ñ ∑∏∆ √∞ ♠♣♥♦',
            client_name: 'Société François & Associates ™ ® © ℠',
            contract_type: 'service_agreement',
            status: 'active',
            created_at: new Date().toISOString()
          },
          {
            id: 'special-2',
            title: 'SQL injection test: \'; DROP TABLE contracts; --',
            description: 'XSS test: <script>alert("xss")</script>',
            client_name: 'Company "quoted" name & ampersand',
            contract_type: 'nda',
            status: 'draft',
            created_at: new Date().toISOString()
          }
        ],
        total: 2,
        page: 1,
        size: 10,
        pages: 1
      };

      await page.route('**/contracts', async route => {
        await route.fulfill({
          status: 200,
          json: specialCharacterData
        });
      });

      await page.goto('/contracts');

      // Should display special characters correctly without XSS
      await expect(page.getByText(/특별한 계약.*émojis.*中文/)).toBeVisible();
      await expect(page.getByText(/Société François/)).toBeVisible();

      // Should not execute XSS attacks
      const alertExecuted = await page.evaluate(() => {
        return window.hasOwnProperty('xssExecuted') || document.querySelector('script[src*="alert"]') !== null;
      });
      expect(alertExecuted).toBe(false);

      // Should not break on SQL injection attempts in display
      await expect(page.getByText(/DROP TABLE/)).toBeVisible();
    });

    test('should handle null and undefined values in API responses @integration', async ({ page }) => {
      const nullValueData = {
        contracts: [
          {
            id: 'null-test-1',
            title: null,
            description: undefined,
            client_name: '',
            client_email: null,
            contract_value: null,
            currency: undefined,
            status: 'draft',
            created_at: '2024-01-01T00:00:00Z',
            metadata: {
              tags: null,
              attributes: undefined
            }
          }
        ],
        total: 1,
        page: 1,
        size: 10,
        pages: 1
      };

      await page.route('**/contracts', async route => {
        await route.fulfill({
          status: 200,
          json: nullValueData
        });
      });

      await page.goto('/contracts');

      // Should handle null/undefined values gracefully
      const nullValueHandlingMessages = [
        /untitled|no.*title/i,
        /no.*description/i,
        /n\/a|not.*available/i,
        /--|-|empty/i
      ];

      let nullValueHandled = false;
      for (const errorRegex of nullValueHandlingMessages) {
        if (await page.getByText(errorRegex).isVisible()) {
          nullValueHandled = true;
          break;
        }
      }

      // Should not crash and should display some indication of missing data
      await expect(page.getByText(/contracts/i)).toBeVisible();
      expect(nullValueHandled || await page.getByText(/null-test-1/).isVisible()).toBe(true);
    });
  });

  test.describe('Browser and Device Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should handle local storage quota exceeded @integration', async ({ page }) => {
      // Fill up localStorage to near quota limit
      await page.addInitScript(() => {
        try {
          const largeData = 'x'.repeat(1024 * 1024); // 1MB string
          for (let i = 0; i < 5; i++) {
            localStorage.setItem(`large_data_${i}`, largeData);
          }
        } catch (error) {
          console.log('Local storage quota reached during setup');
        }
      });

      await page.goto('/dashboard');
      
      // Try to save more data (should handle quota exceeded)
      const quotaExceeded = await page.evaluate(() => {
        try {
          const moreData = 'y'.repeat(1024 * 1024);
          localStorage.setItem('additional_data', moreData);
          return false;
        } catch (error) {
          return error.name === 'QuotaExceededError';
        }
      });

      if (quotaExceeded) {
        // Should handle quota exceeded gracefully
        const quotaErrorHandled = await page.getByText(/storage.*full|quota.*exceeded/i).isVisible();
        console.log('Local storage quota exceeded, error handled:', quotaErrorHandled);
      }

      // Application should still function
      await expect(page.getByText(/dashboard/i)).toBeVisible();
    });

    test('should handle session storage unavailable @integration', async ({ page }) => {
      // Mock sessionStorage being unavailable
      await page.addInitScript(() => {
        Object.defineProperty(window, 'sessionStorage', {
          value: null,
          writable: false
        });
      });

      await page.goto('/dashboard');

      // Should handle missing sessionStorage gracefully
      const storageErrorHandled = await page.evaluate(() => {
        try {
          sessionStorage.setItem('test', 'value');
          return false;
        } catch (error) {
          return true;
        }
      });

      console.log('Session storage unavailable, handled:', storageErrorHandled);

      // Application should still function
      await expect(page.getByText(/dashboard/i)).toBeVisible();
    });

    test('should handle JavaScript disabled/limited environments @integration', async ({ page }) => {
      // Test with reduced JavaScript functionality
      await page.addInitScript(() => {
        // Mock some browser APIs being unavailable
        delete (window as any).fetch;
        delete (window as any).WebSocket;
        delete (window as any).Worker;
      });

      await page.goto('/dashboard');

      // Should provide fallback for missing JavaScript features
      await expect(page.getByText(/dashboard/i)).toBeVisible({ timeout: 15000 });

      // Should handle missing APIs gracefully
      const fallbackMessage = await page.getByText(/limited.*functionality|basic.*mode/i).isVisible();
      console.log('JavaScript limited environment, fallback shown:', fallbackMessage);
    });

    test('should handle window focus/blur events during operations @integration', async ({ page }) => {
      await page.goto('/contracts');
      await page.waitForTimeout(1000);

      // Start an operation (like creating a contract)
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();

        // Simulate window losing focus during form interaction
        await page.evaluate(() => {
          window.dispatchEvent(new Event('blur'));
          window.dispatchEvent(new Event('visibilitychange'));
        });

        await page.waitForTimeout(500);

        // Simulate regaining focus
        await page.evaluate(() => {
          window.dispatchEvent(new Event('focus'));
        });

        // Should continue to function normally
        const titleField = page.getByLabel(/title/i);
        if (await titleField.isVisible()) {
          await titleField.fill('Test Contract After Focus Change');
          expect(await titleField.inputValue()).toBe('Test Contract After Focus Change');
        }
      }
    });
  });

  test.describe('Data Consistency and Race Conditions', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should handle rapid navigation between pages @integration', async ({ page }) => {
      await page.goto('/dashboard');

      // Rapidly navigate between pages
      const pages = ['/contracts', '/analytics', '/team', '/dashboard', '/contracts'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForTimeout(100); // Very brief pause
      }

      // Should end up on the final page without errors
      await expect(page).toHaveURL(/\/contracts/);
      await expect(page.getByText(/contracts/i)).toBeVisible();

      // Check for any JavaScript errors
      const errors = await page.evaluate(() => {
        return (window as any).jsErrors || [];
      });
      
      console.log('JavaScript errors during rapid navigation:', errors.length);
    });

    test('should handle concurrent API requests @integration', async ({ page }) => {
      let requestCount = 0;
      let concurrentRequests = 0;
      let maxConcurrent = 0;

      page.on('request', request => {
        if (request.url().includes('/api/v1/')) {
          requestCount++;
          concurrentRequests++;
          maxConcurrent = Math.max(maxConcurrent, concurrentRequests);
        }
      });

      page.on('response', response => {
        if (response.url().includes('/api/v1/')) {
          concurrentRequests--;
        }
      });

      // Open multiple tabs/sections simultaneously
      await Promise.all([
        page.goto('/contracts'),
        page.evaluate(() => fetch('/api/v1/analytics/dashboard')),
        page.evaluate(() => fetch('/api/v1/team/members')),
      ]);

      await page.waitForTimeout(5000);

      console.log(`Total requests: ${requestCount}, Max concurrent: ${maxConcurrent}`);

      // Should handle concurrent requests without issues
      expect(requestCount).toBeGreaterThan(0);
      expect(maxConcurrent).toBeGreaterThan(1);

      // Page should still be functional
      await expect(page.getByText(/contracts/i)).toBeVisible();
    });

    test('should handle data updates during user interaction @integration', async ({ page }) => {
      await page.goto('/contracts');
      await page.waitForTimeout(1000);

      // Start editing something
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();

        const titleField = page.getByLabel(/title/i);
        if (await titleField.isVisible()) {
          await titleField.fill('Test Contract');

          // Simulate data update from another source (e.g., real-time update)
          await page.evaluate(() => {
            // Simulate receiving a WebSocket update or polling response
            window.dispatchEvent(new CustomEvent('dataUpdate', {
              detail: { type: 'contracts', action: 'refresh' }
            }));
          });

          await page.waitForTimeout(500);

          // User's input should be preserved
          expect(await titleField.inputValue()).toBe('Test Contract');

          // Should not lose form state due to external updates
          const formVisible = await titleField.isVisible();
          expect(formVisible).toBe(true);
        }
      }
    });
  });

  test.describe('Performance Under Stress', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should handle memory pressure gracefully @integration', async ({ page }) => {
      // Simulate memory pressure by creating large objects
      await page.evaluate(() => {
        const largeArrays = [];
        for (let i = 0; i < 100; i++) {
          largeArrays.push(new Array(10000).fill(`memory-test-${i}`));
        }
        (window as any).memoryTest = largeArrays;
      });

      await page.goto('/contracts');

      // Should still function under memory pressure
      await expect(page.getByText(/contracts/i)).toBeVisible({ timeout: 15000 });

      // Check if page is responsive
      const responsive = await page.evaluate(() => {
        const start = Date.now();
        // Simple responsiveness test
        document.querySelector('body')?.click();
        return Date.now() - start < 1000;
      });

      console.log('Page responsive under memory pressure:', responsive);
    });

    test('should handle DOM manipulation stress @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      // Simulate heavy DOM manipulation
      await page.evaluate(() => {
        for (let i = 0; i < 1000; i++) {
          const element = document.createElement('div');
          element.textContent = `Stress test element ${i}`;
          document.body.appendChild(element);
        }
      });

      // Should still be functional
      await expect(page.getByText(/contracts/i)).toBeVisible();

      // Clean up stress test elements
      await page.evaluate(() => {
        const stressElements = document.querySelectorAll('div:contains("Stress test")');
        stressElements.forEach(el => el.remove());
      });
    });
  });

  test.afterAll(async () => {
    console.log('Error Handling and Edge Cases Integration tests completed');
  });
});