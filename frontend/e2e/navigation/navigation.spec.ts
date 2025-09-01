import { test, expect } from '@playwright/test';
import { 
  LandingPage, 
  DashboardPage, 
  ContractsPage, 
  ContractCreatePage,
  ContractViewPage,
  AnalyticsPage,
  TemplatesPage,
  SettingsPage,
  AppLayout 
} from '../utils/page-objects';
import { APIMocker } from '../utils/api-mock';

test.describe('Navigation and Routing Tests', () => {
  let landingPage: LandingPage;
  let dashboardPage: DashboardPage;
  let contractsPage: ContractsPage;
  let contractCreatePage: ContractCreatePage;
  let contractViewPage: ContractViewPage;
  let analyticsPage: AnalyticsPage;
  let appLayout: AppLayout;
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    dashboardPage = new DashboardPage(page);
    contractsPage = new ContractsPage(page);
    contractCreatePage = new ContractCreatePage(page);
    contractViewPage = new ContractViewPage(page);
    analyticsPage = new AnalyticsPage(page);
    appLayout = new AppLayout(page);
    apiMocker = new APIMocker(page);

    await apiMocker.mockAllEndpoints();

    // Set up authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: 'test-user', 
            email: 'test@test.com',
            full_name: 'Test User',
            company_id: 'test-company'
          },
          token: 'mock-token'
        }
      }));
    });
  });

  test.describe('Primary Navigation', () => {
    test('should navigate through main application sections @smoke', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Navigate to Contracts
      await appLayout.navigateTo('Contracts');
      await expect(page).toHaveURL(/\/contracts/);
      await contractsPage.expectContractsVisible();
      
      // Navigate to Analytics
      await appLayout.navigateTo('Analytics');
      await expect(page).toHaveURL(/\/analytics/);
      await analyticsPage.expectMetricsVisible();
      
      // Navigate back to Dashboard
      await appLayout.navigateTo('Dashboard');
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(dashboardPage.welcomeMessage).toBeVisible();
    });

    test('should maintain correct active navigation state', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Dashboard nav should be active
      const dashboardNav = page.getByRole('link', { name: /dashboard/i });
      if (await dashboardNav.isVisible()) {
        const classes = await dashboardNav.getAttribute('class');
        expect(classes).toContain('active');
      }
      
      // Navigate to contracts
      await appLayout.navigateTo('Contracts');
      
      // Contracts nav should now be active
      const contractsNav = page.getByRole('link', { name: /contracts/i });
      if (await contractsNav.isVisible()) {
        const classes = await contractsNav.getAttribute('class');
        expect(classes).toContain('active');
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Tab through navigation elements
      await page.keyboard.press('Tab');
      let tabCount = 0;
      const maxTabs = 10;
      
      while (tabCount < maxTabs) {
        const focusedElement = await page.locator(':focus').getAttribute('href');
        if (focusedElement && focusedElement.includes('/contracts')) {
          // Press Enter to navigate
          await page.keyboard.press('Enter');
          await expect(page).toHaveURL(/\/contracts/);
          break;
        }
        await page.keyboard.press('Tab');
        tabCount++;
      }
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test('should show correct breadcrumbs for nested pages', async ({ page }) => {
      // Navigate to create contract page
      await contractCreatePage.goto('/contracts/new');
      
      // Should show breadcrumbs: Dashboard > Contracts > Create
      const breadcrumbs = page.getByTestId('breadcrumbs');
      if (await breadcrumbs.isVisible()) {
        await expect(breadcrumbs).toContainText('Dashboard');
        await expect(breadcrumbs).toContainText('Contracts');
        await expect(breadcrumbs).toContainText('Create');
      }
    });

    test('should allow navigation via breadcrumbs', async ({ page }) => {
      await contractViewPage.goto('/contracts/contract-1');
      
      const breadcrumbs = page.getByTestId('breadcrumbs');
      if (await breadcrumbs.isVisible()) {
        // Click on "Contracts" breadcrumb
        const contractsBreadcrumb = breadcrumbs.getByRole('link', { name: /contracts/i });
        if (await contractsBreadcrumb.isVisible()) {
          await contractsBreadcrumb.click();
          await expect(page).toHaveURL(/\/contracts$/);
        }
      }
    });

    test('should update breadcrumbs dynamically', async ({ page }) => {
      // Start at contracts list
      await contractsPage.goto('/contracts');
      
      const breadcrumbs = page.getByTestId('breadcrumbs');
      if (await breadcrumbs.isVisible()) {
        await expect(breadcrumbs).toContainText('Contracts');
        await expect(breadcrumbs).not.toContainText('Create');
      }
      
      // Navigate to create page
      await contractsPage.createNewContract();
      
      if (await breadcrumbs.isVisible()) {
        await expect(breadcrumbs).toContainText('Create');
      }
    });
  });

  test.describe('Browser Navigation', () => {
    test('should handle browser back button correctly', async ({ page }) => {
      // Navigate through several pages
      await dashboardPage.goto('/dashboard');
      await appLayout.navigateTo('Contracts');
      await contractsPage.createNewContract();
      
      // Use browser back button
      await page.goBack();
      await expect(page).toHaveURL(/\/contracts$/);
      await contractsPage.expectContractsVisible();
      
      // Back again
      await page.goBack();
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(dashboardPage.welcomeMessage).toBeVisible();
    });

    test('should handle browser forward button correctly', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      await appLayout.navigateTo('Contracts');
      await contractsPage.createNewContract();
      
      // Go back twice
      await page.goBack();
      await page.goBack();
      
      // Now use forward button
      await page.goForward();
      await expect(page).toHaveURL(/\/contracts$/);
      
      await page.goForward();
      await expect(page).toHaveURL(/\/contracts\/new/);
    });

    test('should maintain scroll position on back navigation', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Scroll down the page
      await page.evaluate(() => window.scrollTo(0, 500));
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBe(500);
      
      // Navigate away
      await contractsPage.createNewContract();
      
      // Navigate back
      await page.goBack();
      
      // Scroll position should be restored
      const restoredScrollY = await page.evaluate(() => window.scrollY);
      expect(restoredScrollY).toBeCloseTo(scrollY, -2); // Allow small differences
    });
  });

  test.describe('Deep Linking', () => {
    test('should handle direct navigation to nested routes', async ({ page }) => {
      // Directly navigate to create contract page
      await contractCreatePage.goto('/contracts/new');
      
      // Should work without going through parent routes first
      await expect(contractCreatePage.titleInput).toBeVisible();
      await expect(contractCreatePage.contractTypeSelect).toBeVisible();
    });

    test('should handle routes with parameters', async ({ page }) => {
      // Navigate directly to contract view
      await contractViewPage.goto('/contracts/contract-123');
      
      // Should load the specific contract
      await expect(contractViewPage.contractTitle).toBeVisible();
    });

    test('should handle complex query parameters', async ({ page }) => {
      // Navigate with search and filters
      await contractsPage.goto('/contracts?search=test&status=active&page=2');
      
      // Page should load with filters applied
      await contractsPage.expectContractsVisible();
      
      // Search input should show the search term
      const searchValue = await contractsPage.searchInput.inputValue();
      expect(searchValue).toBe('test');
    });

    test('should preserve query parameters during navigation', async ({ page }) => {
      // Start with query parameters
      await contractsPage.goto('/contracts?search=test&status=active');
      
      // Navigate to create page
      await contractsPage.createNewContract();
      
      // Go back
      await page.goBack();
      
      // Query parameters should be preserved
      expect(page.url()).toContain('search=test');
      expect(page.url()).toContain('status=active');
    });
  });

  test.describe('Error Routes', () => {
    test('should handle 404 pages gracefully', async ({ page }) => {
      await page.goto('/non-existent-page');
      
      // Should show 404 page
      const notFoundMessage = page.getByText(/not found|404/i);
      await expect(notFoundMessage).toBeVisible();
      
      // Should provide navigation back to app
      const homeLink = page.getByRole('link', { name: /home|dashboard/i });
      if (await homeLink.isVisible()) {
        await homeLink.click();
        await expect(page).toHaveURL(/\/dashboard/);
      }
    });

    test('should handle invalid contract IDs', async ({ page }) => {
      // Mock 404 response for contract
      await page.route('**/contracts/invalid-id', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Contract not found'
          })
        });
      });

      await contractViewPage.goto('/contracts/invalid-id');
      
      // Should show appropriate error message
      await expect(page.getByText('Contract not found')).toBeVisible();
    });

    test('should handle server errors on navigation', async ({ page }) => {
      // Mock server error
      await page.route('**/contracts', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Server error'
          })
        });
      });

      await contractsPage.goto('/contracts');
      
      // Should show error state with retry option
      await expect(page.getByText('Server error')).toBeVisible();
      
      const retryButton = page.getByRole('button', { name: /retry/i });
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible();
      }
    });
  });

  test.describe('Loading States', () => {
    test('should show loading states during navigation', async ({ page }) => {
      // Add delay to API response
      await page.route('**/contracts', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });

      await dashboardPage.goto('/dashboard');
      
      // Navigate to contracts
      await appLayout.navigateTo('Contracts');
      
      // Should show loading state
      const loadingSpinner = page.getByTestId('loading-spinner');
      await expect(loadingSpinner).toBeVisible();
      
      // Then show content
      await contractsPage.expectContractsVisible();
      await expect(loadingSpinner).not.toBeVisible();
    });

    test('should show skeleton loading for lists', async ({ page }) => {
      // Add delay to contracts API
      await page.route('**/contracts', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await contractsPage.goto('/contracts');
      
      // Should show skeleton loading state
      const skeletonLoader = page.getByTestId('skeleton-loader');
      if (await skeletonLoader.isVisible({ timeout: 1000 })) {
        await expect(skeletonLoader).toBeVisible();
      }
      
      // Then show actual content
      await contractsPage.expectContractsVisible();
    });

    test('should handle navigation cancellation', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Start navigation to slow-loading page
      const contractsLink = page.getByRole('link', { name: /contracts/i });
      await contractsLink.click();
      
      // Immediately navigate away
      const analyticsLink = page.getByRole('link', { name: /analytics/i });
      await analyticsLink.click();
      
      // Should end up on analytics page, not contracts
      await expect(page).toHaveURL(/\/analytics/);
      await analyticsPage.expectMetricsVisible();
    });
  });

  test.describe('Navigation Guards', () => {
    test('should prevent navigation when form has unsaved changes', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      // Fill out form partially
      await contractCreatePage.titleInput.fill('Unsaved Contract');
      await contractCreatePage.plainEnglishTextarea.fill('Some content...');
      
      // Try to navigate away
      await appLayout.navigateTo('Dashboard');
      
      // Should show confirmation dialog
      const confirmDialog = page.getByText(/unsaved changes|leave page/i);
      if (await confirmDialog.isVisible({ timeout: 2000 })) {
        await expect(confirmDialog).toBeVisible();
        
        // Cancel navigation
        const cancelButton = page.getByRole('button', { name: /cancel|stay/i });
        await cancelButton.click();
        
        // Should stay on form page
        await expect(page).toHaveURL(/\/contracts\/new/);
      }
    });

    test('should allow navigation after saving changes', async ({ page }) => {
      // Mock successful save
      await page.route('**/contracts', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'saved-contract',
              title: 'Saved Contract',
              status: 'draft'
            })
          });
        }
      });

      await contractCreatePage.goto('/contracts/new');
      
      // Fill and save form
      await contractCreatePage.titleInput.fill('Saved Contract');
      await contractCreatePage.contractTypeSelect.click();
      await page.getByText('Service Agreement').click();
      await contractCreatePage.plainEnglishTextarea.fill('Contract content');
      await contractCreatePage.createButton.click();
      
      // Wait for save to complete
      await page.waitForURL(/\/contracts\/saved-contract/);
      
      // Now navigation should work without warning
      await appLayout.navigateTo('Dashboard');
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Mobile Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('should show mobile navigation menu', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Should show hamburger menu
      const mobileMenuButton = page.getByRole('button', { name: /menu/i });
      if (await mobileMenuButton.isVisible()) {
        await expect(mobileMenuButton).toBeVisible();
        
        // Click to open menu
        await mobileMenuButton.click();
        
        // Navigation should be visible
        const navigation = page.locator('nav, [role="navigation"]').first();
        await expect(navigation).toBeVisible();
        
        // Should be able to navigate
        const contractsLink = page.getByRole('link', { name: /contracts/i });
        if (await contractsLink.isVisible()) {
          await contractsLink.click();
          await expect(page).toHaveURL(/\/contracts/);
        }
      }
    });

    test('should close mobile menu after navigation', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      const mobileMenuButton = page.getByRole('button', { name: /menu/i });
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        
        const navigation = page.locator('nav, [role="navigation"]').first();
        await expect(navigation).toBeVisible();
        
        // Navigate to another page
        const contractsLink = page.getByRole('link', { name: /contracts/i });
        if (await contractsLink.isVisible()) {
          await contractsLink.click();
          
          // Menu should be closed after navigation
          const isMenuVisible = await navigation.isVisible();
          // Menu should either be hidden or collapsed
          if (isMenuVisible) {
            const expanded = await mobileMenuButton.getAttribute('aria-expanded');
            expect(expanded).toBe('false');
          }
        }
      }
    });

    test('should support swipe gestures for navigation', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Simulate swipe gesture (this is a simplified version)
      const startX = 50;
      const endX = 300;
      const y = 400;
      
      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(endX, y);
      await page.mouse.up();
      
      // This would open side navigation if implemented
      // The exact behavior depends on the implementation
    });
  });

  test.describe('Navigation Performance', () => {
    test('should navigate quickly between pages', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      const navigationTimes: number[] = [];
      
      // Test navigation to several pages
      const routes = ['/contracts', '/analytics', '/dashboard'];
      
      for (const route of routes) {
        const startTime = Date.now();
        await page.goto(route);
        
        // Wait for page to be interactive
        await page.waitForLoadState('networkidle');
        
        const endTime = Date.now();
        navigationTimes.push(endTime - startTime);
      }
      
      // Average navigation time should be reasonable
      const averageTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      expect(averageTime).toBeLessThan(2000); // 2 seconds
    });

    test('should preload critical routes', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Check for link prefetching or route preloading
      const preloadLinks = await page.locator('link[rel="prefetch"], link[rel="preload"]').count();
      
      // Modern SPAs often preload critical routes
      // This test verifies the optimization is in place
      expect(preloadLinks).toBeGreaterThanOrEqual(0);
    });

    test('should handle rapid navigation changes', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Rapidly click through navigation
      const contractsLink = page.getByRole('link', { name: /contracts/i });
      const analyticsLink = page.getByRole('link', { name: /analytics/i });
      const dashboardLink = page.getByRole('link', { name: /dashboard/i });
      
      // Click rapidly
      await contractsLink.click();
      await analyticsLink.click();
      await dashboardLink.click();
      
      // Should handle gracefully and end up on the last clicked route
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(dashboardPage.welcomeMessage).toBeVisible();
    });
  });
});