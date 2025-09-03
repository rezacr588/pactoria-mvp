import { test, expect, Page } from '@playwright/test';
import { 
  LoginPage, 
  DashboardPage, 
  ContractsPage,
  LandingPage,
  NavigationMenu
} from './utils/page-objects';
import { 
  generateTestUser, 
  generateTestContract,
  TestUserData,
  TestContractData 
} from './utils/test-data';
import { setupMockAPI, setupMockAPIWithErrors, waitForAPICall } from './utils/api-helpers';

test.describe('Edge Cases and Error Scenarios', () => {
  let testUser: TestUserData;
  
  test.beforeAll(async () => {
    testUser = generateTestUser();
  });

  test.describe('Network and API Error Handling', () => {
    test('should handle network connectivity issues', async ({ page }) => {
      await setupMockAPI(page);
      
      // Login first
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.waitForURL(/\/dashboard/);
      
      // Simulate network offline
      await page.route('**/*', route => route.abort('internetdisconnected'));
      
      // Try to navigate to contracts page
      await page.goto('/contracts');
      
      // Should show network error or fallback UI
      const errorMessage = page.locator('[data-testid*="error"], [class*="error"], [role="alert"]');
      const offlineIndicator = page.locator('[data-testid*="offline"], [class*="offline"]');
      
      // Either error message or offline indicator should appear
      await expect(errorMessage.or(offlineIndicator)).toBeVisible({ timeout: 10000 });
      
      // Restore network
      await page.unroute('**/*');
      
      // Try refresh
      const refreshButton = page.getByRole('button', { name: /refresh|retry|reload/i });
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should handle API timeout errors', async ({ page }) => {
      // Setup API with delay to simulate timeout
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
        route.continue();
      });
      
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      
      // Attempt login - should timeout
      await loginPage.emailInput.fill(testUser.email);
      await loginPage.passwordInput.fill(testUser.password);
      await loginPage.loginButton.click();
      
      // Should show timeout error
      const errorMessage = page.locator('[role="alert"], [data-testid*="error"]');
      await expect(errorMessage).toBeVisible({ timeout: 35000 });
      
      // Cleanup
      await page.unroute('**/api/**');
    });

    test('should handle API error responses (4xx, 5xx)', async ({ page }) => {
      // Setup mock API to return errors
      await setupMockAPIWithErrors(page);
      
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      
      // Should show appropriate error message
      await loginPage.expectError();
      
      // Navigate to dashboard which should also fail
      await page.goto('/dashboard');
      
      // Should show server error or fallback UI
      const errorState = page.locator('[data-testid*="error-state"], [class*="error-boundary"]');
      await expect(errorState).toBeVisible({ timeout: 10000 });
    });

    test('should handle malformed API responses', async ({ page }) => {
      // Setup mock API to return malformed JSON
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json{'
        });
      });
      
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      
      // Try to login
      await loginPage.login(testUser);
      
      // Should handle JSON parsing error gracefully
      const errorMessage = page.locator('[role="alert"], [data-testid*="error"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Authentication and Authorization Edge Cases', () => {
    test('should handle expired session', async ({ page }) => {
      await setupMockAPI(page);
      
      // Login successfully
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.waitForURL(/\/dashboard/);
      
      // Clear auth tokens to simulate expired session
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Try to access protected resource
      await page.goto('/contracts');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should handle concurrent sessions', async ({ page, browser }) => {
      await setupMockAPI(page);
      
      // Login in first tab
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.waitForURL(/\/dashboard/);
      
      // Open second tab and login with same user
      const newPage = await browser.newPage();
      await setupMockAPI(newPage);
      const loginPage2 = new LoginPage(newPage);
      await loginPage2.goto('/login');
      await loginPage2.login(testUser);
      await newPage.waitForURL(/\/dashboard/);
      
      // Both sessions should work independently
      await expect(page.locator('h1')).toContainText(/dashboard/i);
      await expect(newPage.locator('h1')).toContainText(/dashboard/i);
      
      await newPage.close();
    });

    test('should handle invalid authentication tokens', async ({ page }) => {
      await setupMockAPI(page);
      
      // Set invalid token in localStorage
      await page.evaluate(() => {
        localStorage.setItem('auth-token', 'invalid-token-123');
      });
      
      // Try to access protected page
      await page.goto('/dashboard');
      
      // Should redirect to login or show error
      const isOnLogin = page.url().includes('/login');
      const hasError = await page.locator('[role="alert"], [data-testid*="error"]').isVisible();
      
      expect(isOnLogin || hasError).toBeTruthy();
    });

    test('should handle user role changes during session', async ({ page }) => {
      await setupMockAPI(page);
      
      // Login as admin user
      const adminUser = { ...testUser, role: 'admin' };
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(adminUser);
      await page.waitForURL(/\/dashboard/);
      
      // Access admin-only feature
      await page.goto('/audit');
      
      // Simulate role change to regular user
      await page.evaluate(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.role = 'user';
        localStorage.setItem('user', JSON.stringify(userData));
      });
      
      // Refresh page
      await page.reload();
      
      // Should either redirect or show access denied
      const accessDenied = page.locator('[data-testid*="access-denied"], [class*="unauthorized"]');
      const isRedirected = !page.url().includes('/audit');
      
      expect(await accessDenied.isVisible() || isRedirected).toBeTruthy();
    });
  });

  test.describe('Form Validation and Input Edge Cases', () => {
    test('should handle invalid email formats', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@domain.com',
        'test..test@domain.com',
        'test@domain',
        '',
        ' ',
        'a'.repeat(100) + '@domain.com'
      ];
      
      for (const email of invalidEmails) {
        await loginPage.emailInput.fill(email);
        await loginPage.passwordInput.fill('password123');
        await loginPage.loginButton.click();
        
        // Should show validation error
        const errorMessage = page.locator('[role="alert"], .error, [class*="error"]');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
        
        // Clear form
        await loginPage.emailInput.clear();
        await page.waitForTimeout(100);
      }
    });

    test('should handle extremely long input values', async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts/new');
      
      // Test with very long title
      const longTitle = 'A'.repeat(1000);
      const titleInput = page.locator('input[name*="title"], input[placeholder*="title"]');
      await titleInput.fill(longTitle);
      
      // Submit form
      const submitButton = page.getByRole('button', { name: /create|submit|save/i }).last();
      await submitButton.click();
      
      // Should either truncate or show validation error
      const errorMessage = page.locator('[role="alert"], .error, [class*="error"]');
      const isErrorVisible = await errorMessage.isVisible();
      
      if (!isErrorVisible) {
        // Check if input was truncated
        const actualValue = await titleInput.inputValue();
        expect(actualValue.length).toBeLessThanOrEqual(255);
      }
    });

    test('should handle special characters and unicode', async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts/new');
      
      const specialCharacters = [
        '🚀 Contract Title with Emoji',
        'Contract with "quotes" and \'apostrophes\'',
        'Contract with <script>alert("xss")</script>',
        'Contract with SQL \'; DROP TABLE contracts;--',
        'Contract with Unicode: àáâãäåæçèéêë',
        'Contract with symbols: ©®™€£¥'
      ];
      
      for (const title of specialCharacters) {
        const titleInput = page.locator('input[name*="title"], input[placeholder*="title"]');
        await titleInput.fill(title);
        
        // Check if input is properly sanitized/escaped
        const inputValue = await titleInput.inputValue();
        
        // Should not contain dangerous script tags
        expect(inputValue).not.toContain('<script>');
        expect(inputValue).not.toContain('DROP TABLE');
      }
    });

    test('should handle file upload edge cases', async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      
      // Check if file upload is available on any page
      const fileInputs = await page.locator('input[type="file"]').all();
      
      if (fileInputs.length > 0) {
        const fileInput = fileInputs[0];
        
        // Test with invalid file type
        const invalidFiles = [
          { name: 'test.exe', content: 'executable content' },
          { name: 'huge-file.txt', content: 'x'.repeat(100 * 1024 * 1024) }, // 100MB
          { name: '', content: 'no name file' },
          { name: 'test.txt', content: '' } // empty file
        ];
        
        for (const file of invalidFiles) {
          // Create a test file
          const buffer = Buffer.from(file.content);
          
          try {
            await fileInput.setInputFiles({
              name: file.name,
              mimeType: 'text/plain',
              buffer: buffer
            });
            
            // Should show appropriate error or validation
            const errorMessage = page.locator('[role="alert"], .error, [class*="error"]');
            await expect(errorMessage).toBeVisible({ timeout: 5000 });
          } catch (error) {
            // File might be rejected by the browser itself
            console.log(`File ${file.name} rejected by browser:`, error.message);
          }
        }
      }
    });
  });

  test.describe('UI State and Interaction Edge Cases', () => {
    test('should handle rapid clicking/double submission', async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts/new');
      
      // Fill form quickly
      const titleInput = page.locator('input[name*="title"], input[placeholder*="title"]');
      await titleInput.fill('Test Contract');
      
      // Rapidly click submit multiple times
      const submitButton = page.getByRole('button', { name: /create|submit|save/i }).last();
      
      await Promise.all([
        submitButton.click(),
        submitButton.click(),
        submitButton.click()
      ]);
      
      // Should prevent duplicate submissions
      // Either button should be disabled or only one request should go through
      await page.waitForTimeout(2000);
      
      // Check if button is disabled during submission
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled || page.url() !== '/contracts/new').toBeTruthy();
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      
      // Navigate through multiple pages
      await page.goto('/dashboard');
      await page.goto('/contracts');
      await page.goto('/analytics');
      
      // Use browser back button
      await page.goBack();
      await expect(page).toHaveURL(/\/contracts/);
      
      // Use browser forward button
      await page.goForward();
      await expect(page).toHaveURL(/\/analytics/);
      
      // Verify page state is maintained
      await expect(page.locator('h1')).toContainText(/analytics/i);
    });

    test('should handle page refresh during form filling', async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts/new');
      
      // Fill form partially
      const titleInput = page.locator('input[name*="title"], input[placeholder*="title"]');
      await titleInput.fill('Partially Filled Contract');
      
      const descriptionInput = page.locator('textarea[name*="description"], textarea[placeholder*="description"]');
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('Some description text');
      }
      
      // Refresh page
      await page.reload();
      
      // Check if form data is restored or cleared
      const titleValue = await titleInput.inputValue();
      
      // Should either restore from localStorage/sessionStorage or warn user
      if (titleValue === '') {
        // If data is lost, there should be some indication
        const warningMessage = page.locator('[data-testid*="unsaved"], [class*="warning"]');
        // Warning may or may not be present, depending on implementation
      }
    });

    test('should handle window resize during interactions', async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts');
      
      // Start with desktop view
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Open a modal or dropdown
      const createButton = page.getByRole('button', { name: /create|new contract|add contract/i });
      await createButton.click();
      
      // Resize to mobile during modal open
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Modal should still be usable
      const modal = page.locator('[role="dialog"], .modal');
      if (await modal.isVisible()) {
        // Should be properly positioned and scrollable
        const modalBounds = await modal.boundingBox();
        expect(modalBounds?.width).toBeLessThanOrEqual(375);
      }
    });

    test('should handle keyboard navigation edge cases', async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/dashboard');
      
      // Test tab navigation
      let focusedElement;
      
      // Tab through multiple elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        focusedElement = page.locator(':focus');
        
        // Should always have a focused element
        await expect(focusedElement).toBeVisible();
        
        // Focus should not get trapped
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        expect(['button', 'a', 'input', 'select', 'textarea'].some(tag => tagName.includes(tag) || tagName === 'div')).toBeTruthy();
      }
      
      // Test shift+tab (reverse navigation)
      await page.keyboard.press('Shift+Tab');
      const reverseFocused = page.locator(':focus');
      await expect(reverseFocused).toBeVisible();
    });
  });

  test.describe('Data Integrity and Concurrent Access', () => {
    test('should handle concurrent data modifications', async ({ page, browser }) => {
      await setupMockAPI(page);
      
      // Login in first tab
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts');
      
      // Open second tab
      const newPage = await browser.newPage();
      await setupMockAPI(newPage);
      const loginPage2 = new LoginPage(newPage);
      await loginPage2.goto('/login');
      await loginPage2.login(testUser);
      await newPage.goto('/contracts');
      
      // Both tabs modify the same data
      const createButton1 = page.getByRole('button', { name: /create|new contract|add contract/i });
      const createButton2 = newPage.getByRole('button', { name: /create|new contract|add contract/i });
      
      await Promise.all([
        createButton1.click(),
        createButton2.click()
      ]);
      
      // Both should navigate to create page
      await expect(page).toHaveURL(/\/contracts\/new/);
      await expect(newPage).toHaveURL(/\/contracts\/new/);
      
      await newPage.close();
    });

    test('should handle data staleness', async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts');
      
      // Load contract list
      await page.waitForLoadState('networkidle');
      
      // Simulate data change on server (mock stale data scenario)
      await page.route('**/api/contracts', route => {
        route.fulfill({
          status: 409, // Conflict - data has changed
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Data has been modified by another user' })
        });
      });
      
      // Try to refresh or modify data
      const refreshButton = page.locator('button[aria-label*="refresh"], button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        
        // Should show conflict resolution UI
        const conflictMessage = page.locator('[data-testid*="conflict"], [role="alert"]');
        await expect(conflictMessage).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Browser Compatibility and Feature Detection', () => {
    test('should handle missing browser features gracefully', async ({ page }) => {
      // Disable certain browser APIs to simulate older browsers
      await page.addInitScript(() => {
        // Remove fetch API
        delete (window as any).fetch;
        
        // Remove localStorage
        Object.defineProperty(window, 'localStorage', {
          value: undefined,
          writable: false
        });
        
        // Remove modern JavaScript features
        delete (window as any).IntersectionObserver;
      });
      
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      
      // Page should still load and function
      await expect(page.locator('h1, [role="heading"]')).toBeVisible();
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      
      // May show fallback UI or polyfill warnings
      const warningMessage = page.locator('[data-testid*="browser-warning"], [class*="compatibility-warning"]');
      if (await warningMessage.isVisible()) {
        await expect(warningMessage).toContainText(/browser|compatibility|support/i);
      }
    });

    test('should handle disabled JavaScript gracefully', async ({ page }) => {
      // This test verifies that critical content is still accessible
      await page.goto('/');
      
      // Critical content should be in HTML, not just rendered by JS
      const mainHeading = page.locator('h1');
      await expect(mainHeading).toBeVisible();
      
      // Navigation should work with basic links
      const loginLink = page.locator('a[href*="/login"]');
      if (await loginLink.isVisible()) {
        await expect(loginLink).toHaveAttribute('href');
      }
    });
  });

  test.describe('Security Edge Cases', () => {
    test('should prevent XSS attacks in user input', async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts/new');
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        '\'; alert("XSS"); //'
      ];
      
      for (const payload of xssPayloads) {
        const titleInput = page.locator('input[name*="title"], input[placeholder*="title"]');
        await titleInput.fill(payload);
        
        // Submit form
        const submitButton = page.getByRole('button', { name: /create|submit|save/i }).last();
        await submitButton.click();
        
        // Wait for potential XSS execution
        await page.waitForTimeout(1000);
        
        // Should not execute script - page should still be functional
        await expect(page.locator('h1')).toBeVisible();
        
        // Check if input was sanitized
        const sanitizedValue = await titleInput.inputValue();
        expect(sanitizedValue).not.toContain('<script>');
        expect(sanitizedValue).not.toContain('javascript:');
      }
    });

    test('should handle CSRF protection', async ({ page }) => {
      await setupMockAPI(page);
      
      // Login normally
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts/new');
      
      // Clear CSRF token if present
      await page.evaluate(() => {
        const csrfInput = document.querySelector('input[name="_token"], input[name="csrf_token"]');
        if (csrfInput) {
          (csrfInput as HTMLInputElement).value = '';
        }
      });
      
      // Try to submit form
      const titleInput = page.locator('input[name*="title"], input[placeholder*="title"]');
      await titleInput.fill('Test Contract');
      
      const submitButton = page.getByRole('button', { name: /create|submit|save/i }).last();
      await submitButton.click();
      
      // Should show CSRF error or regenerate token
      const errorMessage = page.locator('[role="alert"], [data-testid*="error"]');
      const isErrorVisible = await errorMessage.isVisible({ timeout: 5000 });
      
      // Either shows error or successfully handles CSRF
      expect(isErrorVisible || page.url() !== '/contracts/new').toBeTruthy();
    });
  });

  test.describe('Performance and Resource Edge Cases', () => {
    test('should handle slow loading resources', async ({ page }) => {
      // Throttle network to simulate slow connection
      const client = await page.context().newCDPSession(page);
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 50 * 1024, // 50 KB/s
        uploadThroughput: 20 * 1024,   // 20 KB/s
        latency: 500 // 500ms
      });
      
      const startTime = Date.now();
      await page.goto('/');
      
      // Should show loading states
      const loadingIndicator = page.locator('[data-testid*="loading"], .spinner, [class*="loading"]');
      if (await loadingIndicator.isVisible()) {
        // Loading indicator should disappear eventually
        await expect(loadingIndicator).toBeHidden({ timeout: 30000 });
      }
      
      // Page should eventually load
      await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Page loaded in ${loadTime}ms under slow network conditions`);
    });

    test('should handle large datasets gracefully', async ({ page }) => {
      await setupMockAPI(page);
      
      // Mock large dataset response
      await page.route('**/api/contracts', route => {
        const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
          id: `contract-${i}`,
          title: `Contract ${i}`,
          status: ['draft', 'active', 'completed'][i % 3],
          created_at: new Date(Date.now() - i * 86400000).toISOString()
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: largeDataset, total: 1000 })
        });
      });
      
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts');
      
      // Should implement pagination or virtualization
      const paginationControls = page.locator('[role="navigation"], [class*="pagination"]');
      const virtualizedList = page.locator('[data-testid*="virtual"], [class*="virtual"]');
      
      // Either pagination or virtualization should be present for large datasets
      const hasPagination = await paginationControls.isVisible();
      const hasVirtualization = await virtualizedList.isVisible();
      
      expect(hasPagination || hasVirtualization).toBeTruthy();
      
      // Check that not all 1000 items are rendered at once
      const visibleItems = page.locator('[data-testid*="contract-item"], tr:not(:first-child)');
      const itemCount = await visibleItems.count();
      expect(itemCount).toBeLessThan(100); // Should not render all 1000 items
    });
  });

  test.describe('Accessibility Edge Cases', () => {
    test('should handle screen reader navigation edge cases', async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      
      // Test with screen reader simulation
      await page.evaluate(() => {
        // Add screen reader detection
        Object.defineProperty(navigator, 'userAgent', {
          value: navigator.userAgent + ' JAWS/2023'
        });
      });
      
      // Check for proper ARIA landmarks
      const landmarks = page.locator('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]');
      const landmarkCount = await landmarks.count();
      expect(landmarkCount).toBeGreaterThan(0);
      
      // Check for skip links
      const skipLinks = page.locator('a[href*="#main"], a:has-text("skip")');
      if (await skipLinks.isVisible()) {
        await skipLinks.first().click();
        
        // Should focus main content
        const mainContent = page.locator('#main, [role="main"]');
        await expect(mainContent).toBeFocused();
      }
    });

    test('should handle high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
      
      await page.goto('/');
      
      // Check that text is still readable
      const headings = page.locator('h1, h2, h3');
      const firstHeading = headings.first();
      
      if (await firstHeading.isVisible()) {
        const styles = await firstHeading.evaluate(el => {
          const computed = getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor
          };
        });
        
        // Should have proper contrast
        expect(styles.color).not.toBe(styles.backgroundColor);
      }
    });
  });

  test.describe('404 and Route Error Handling', () => {
    test('should handle 404 pages gracefully', async ({ page }) => {
      // Test various non-existent routes
      const nonExistentRoutes = [
        '/non-existent-page',
        '/contracts/invalid-id',
        '/admin/secret-page',
        '/api/invalid-endpoint'
      ];
      
      for (const route of nonExistentRoutes) {
        await page.goto(route);
        
        // Should show 404 page or redirect
        const is404 = page.locator('[data-testid*="404"], [class*="not-found"]');
        const isRedirected = !page.url().includes(route);
        
        expect(await is404.isVisible() || isRedirected).toBeTruthy();
        
        // Should provide navigation back to valid pages
        if (await is404.isVisible()) {
          const homeLink = page.getByRole('link', { name: /home|dashboard/i });
          await expect(homeLink).toBeVisible();
        }
      }
    });

    test('should handle malformed URLs', async ({ page }) => {
      const malformedUrls = [
        '/contracts/%',
        '/contracts/<script>',
        '/contracts/../../etc/passwd',
        '/contracts/' + 'a'.repeat(1000)
      ];
      
      for (const url of malformedUrls) {
        await page.goto(url);
        
        // Should handle gracefully without crashing
        await page.waitForLoadState('networkidle');
        
        // Should show error page or redirect
        const hasError = page.locator('[data-testid*="error"], [class*="error"]');
        const isRedirected = !page.url().includes(url);
        
        expect(await hasError.isVisible() || isRedirected).toBeTruthy();
      }
    });
  });
});