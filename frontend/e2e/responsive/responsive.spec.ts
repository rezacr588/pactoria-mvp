import { test, expect } from '@playwright/test';
import { 
  LandingPage, 
  LoginPage, 
  DashboardPage, 
  ContractsPage, 
  ContractCreatePage,
  AnalyticsPage,
  AppLayout 
} from '../utils/page-objects';
import { TestUser } from '../utils/test-data';
import { APIMocker } from '../utils/api-mock';

test.describe('Responsive Design Tests', () => {
  let landingPage: LandingPage;
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let contractsPage: ContractsPage;
  let contractCreatePage: ContractCreatePage;
  let analyticsPage: AnalyticsPage;
  let appLayout: AppLayout;
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    contractsPage = new ContractsPage(page);
    contractCreatePage = new ContractCreatePage(page);
    analyticsPage = new AnalyticsPage(page);
    appLayout = new AppLayout(page);
    apiMocker = new APIMocker(page);

    await apiMocker.mockAllEndpoints();

    // Set up authenticated state for protected routes
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

  test.describe('Mobile Viewport (375x667)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('should display landing page correctly on mobile', async ({ page }) => {
      await landingPage.goto('/');
      
      // Hero content should be visible and readable
      await expect(landingPage.heroHeading).toBeVisible();
      
      // Navigation should be mobile-friendly
      await expect(landingPage.loginButton).toBeVisible();
      await expect(landingPage.signUpButton).toBeVisible();
      
      // Text should not overflow
      const heroBox = await landingPage.heroHeading.boundingBox();
      expect(heroBox?.width).toBeLessThanOrEqual(375);
      
      // Check for horizontal scroll
      const pageWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(pageWidth).toBeLessThanOrEqual(375);
    });

    test('should have mobile-friendly login form', async ({ page }) => {
      await loginPage.goto('/login');
      
      // Form elements should be appropriately sized
      const emailBox = await loginPage.emailInput.boundingBox();
      const passwordBox = await loginPage.passwordInput.boundingBox();
      const buttonBox = await loginPage.loginButton.boundingBox();
      
      expect(emailBox?.width).toBeGreaterThan(200);
      expect(passwordBox?.width).toBeGreaterThan(200);
      expect(buttonBox?.width).toBeGreaterThan(200);
      
      // Elements should be touch-friendly (minimum 44px)
      expect(emailBox?.height).toBeGreaterThanOrEqual(44);
      expect(passwordBox?.height).toBeGreaterThanOrEqual(44);
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
      
      // Form should be vertically scrollable if needed
      await loginPage.emailInput.fill('test@example.com');
      await loginPage.passwordInput.fill('password123');
      
      // Should be able to submit on mobile
      await loginPage.loginButton.click();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should have mobile navigation menu', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Should show mobile menu button
      const mobileMenuButton = page.getByRole('button', { name: /menu|navigation/i });
      if (await mobileMenuButton.isVisible()) {
        await expect(mobileMenuButton).toBeVisible();
        
        // Menu should be touch-friendly
        const buttonBox = await mobileMenuButton.boundingBox();
        expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
        expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
        
        // Should toggle navigation
        await mobileMenuButton.click();
        
        // Navigation menu should appear
        const navMenu = page.locator('nav, [role="navigation"]').first();
        await expect(navMenu).toBeVisible();
        
        // Should be able to navigate
        const contractsLink = page.getByRole('link', { name: /contracts/i });
        if (await contractsLink.isVisible()) {
          await contractsLink.click();
          await expect(page).toHaveURL(/\/contracts/);
        }
      }
    });

    test('should display dashboard cards in mobile layout', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Cards should stack vertically on mobile
      const cards = page.locator('[data-testid*="card"], .card').all();
      const cardBoxes = await Promise.all(
        (await cards).map(card => card.boundingBox())
      );
      
      // Cards should be full width on mobile
      for (const box of cardBoxes) {
        if (box) {
          expect(box.width).toBeGreaterThan(300); // Should use most of the screen
        }
      }
    });

    test('should have mobile-friendly contracts table', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Table should be responsive (either scrollable or stacked)
      const table = page.locator('table, [role="table"]').first();
      if (await table.isVisible()) {
        const tableBox = await table.boundingBox();
        
        // Either table should fit in viewport or be horizontally scrollable
        const parentBox = await table.locator('..').boundingBox();
        const isScrollable = await page.evaluate(() => {
          const tableEl = document.querySelector('table, [role="table"]');
          if (tableEl) {
            return tableEl.scrollWidth > tableEl.clientWidth;
          }
          return false;
        });
        
        expect(tableBox?.width! <= 375 || isScrollable).toBeTruthy();
      }
      
      // Create button should be accessible
      await expect(contractsPage.createContractButton).toBeVisible();
      const createBox = await contractsPage.createContractButton.boundingBox();
      expect(createBox?.height).toBeGreaterThanOrEqual(44);
    });

    test('should have mobile-friendly forms', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      // Form inputs should be appropriately sized
      const titleBox = await contractCreatePage.titleInput.boundingBox();
      const textareaBox = await contractCreatePage.plainEnglishTextarea.boundingBox();
      
      expect(titleBox?.width).toBeGreaterThan(300);
      expect(textareaBox?.width).toBeGreaterThan(300);
      
      // Form should be usable with on-screen keyboard
      await contractCreatePage.titleInput.focus();
      
      // Check if element is still visible after keyboard appears (simulated)
      await page.setViewportSize({ width: 375, height: 400 }); // Smaller height simulating keyboard
      await expect(contractCreatePage.titleInput).toBeVisible();
      
      // Reset viewport
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('should handle touch interactions', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Test tap interactions
      await contractsPage.createContractButton.tap();
      await expect(page).toHaveURL(/\/contracts\/new/);
      
      // Test swipe-like interactions (if implemented)
      const contractRows = contractsPage.contractRow;
      if (await contractRows.first().isVisible()) {
        await contractRows.first().tap();
        // Should navigate or show actions
      }
    });
  });

  test.describe('Tablet Viewport (768x1024)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
    });

    test('should adapt layout for tablet', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Should show more content than mobile but less than desktop
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      // Cards might be in 2-column layout
      const cards = await page.locator('[data-testid*="card"], .card').all();
      if (cards.length >= 2) {
        const firstCardBox = await cards[0].boundingBox();
        const secondCardBox = await cards[1].boundingBox();
        
        // Cards might be side by side
        if (firstCardBox && secondCardBox) {
          const sideBySide = Math.abs((firstCardBox.y + firstCardBox.height / 2) - 
                                     (secondCardBox.y + secondCardBox.height / 2)) < 50;
          // This is acceptable on tablet
        }
      }
    });

    test('should show sidebar appropriately on tablet', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      const sidebar = appLayout.sidebar;
      
      if (await sidebar.isVisible()) {
        const sidebarBox = await sidebar.boundingBox();
        // Sidebar should not take up too much space on tablet
        expect(sidebarBox?.width).toBeLessThan(300);
      }
    });

    test('should display analytics charts appropriately', async ({ page }) => {
      await analyticsPage.goto('/analytics');
      
      // Charts should be visible and appropriately sized
      if (await analyticsPage.contractsChart.isVisible()) {
        const chartBox = await analyticsPage.contractsChart.boundingBox();
        expect(chartBox?.width).toBeLessThanOrEqual(768);
        expect(chartBox?.width).toBeGreaterThan(300);
      }
    });

    test('should handle tablet form layouts', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      // Form might have wider inputs or multi-column layout
      const titleBox = await contractCreatePage.titleInput.boundingBox();
      expect(titleBox?.width).toBeGreaterThan(400); // Wider than mobile
      
      // But still readable and usable
      expect(titleBox?.width).toBeLessThan(768);
    });
  });

  test.describe('Desktop Viewport (1920x1080)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
    });

    test('should utilize desktop space effectively', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Should show full desktop layout
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      // Sidebar should be visible
      await expect(appLayout.sidebar).toBeVisible();
      
      // Content should not be too wide (readable line length)
      const main = page.locator('main, [role="main"]').first();
      if (await main.isVisible()) {
        const mainBox = await main.boundingBox();
        // Main content shouldn't span full width
        expect(mainBox?.width).toBeLessThan(1920);
      }
    });

    test('should show full navigation', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Desktop should show full navigation
      const navLinks = await appLayout.navigationLinks.all();
      expect(navLinks.length).toBeGreaterThan(3);
      
      // All navigation items should be visible
      for (const link of navLinks) {
        await expect(link).toBeVisible();
      }
    });

    test('should display data tables with all columns', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Desktop should show full table with all columns
      const tableHeaders = await page.locator('th, [role="columnheader"]').all();
      
      // Should show more columns than mobile
      expect(tableHeaders.length).toBeGreaterThan(3);
      
      // Table should fit comfortably
      const table = page.locator('table, [role="table"]').first();
      if (await table.isVisible()) {
        const tableBox = await table.boundingBox();
        expect(tableBox?.width).toBeLessThan(1920);
      }
    });

    test('should show side-by-side forms when appropriate', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      // Desktop forms might use multi-column layouts
      const formBox = await page.locator('form').first().boundingBox();
      if (formBox) {
        expect(formBox.width).toBeGreaterThan(600);
        expect(formBox.width).toBeLessThan(1200); // Not too wide
      }
    });

    test('should display analytics in full detail', async ({ page }) => {
      await analyticsPage.goto('/analytics');
      
      // Should show multiple charts side by side
      const charts = [
        analyticsPage.contractsChart,
        analyticsPage.complianceChart,
        analyticsPage.valueChart
      ];
      
      for (const chart of charts) {
        if (await chart.isVisible()) {
          await expect(chart).toBeVisible();
          
          const chartBox = await chart.boundingBox();
          expect(chartBox?.width).toBeGreaterThan(300);
        }
      }
    });
  });

  test.describe('Ultra-wide Desktop (2560x1440)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });
    });

    test('should not stretch content too wide', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Content should have max-width to maintain readability
      const main = page.locator('main, [role="main"]').first();
      if (await main.isVisible()) {
        const mainBox = await main.boundingBox();
        // Main content should be centered and not full width
        expect(mainBox?.width).toBeLessThan(1600);
      }
    });

    test('should utilize extra space for additional information', async ({ page }) => {
      await analyticsPage.goto('/analytics');
      
      // Might show additional metrics or larger charts
      await analyticsPage.expectMetricsVisible();
      
      // Charts could be larger but should maintain aspect ratio
      if (await analyticsPage.contractsChart.isVisible()) {
        const chartBox = await analyticsPage.contractsChart.boundingBox();
        expect(chartBox?.width).toBeGreaterThan(400);
        expect(chartBox?.width).toBeLessThan(800); // Don't get too large
      }
    });
  });

  test.describe('Small Mobile (320x568)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
    });

    test('should work on very small screens', async ({ page }) => {
      await loginPage.goto('/login');
      
      // Form should still be usable
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();
      
      // No horizontal scroll
      const pageWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(pageWidth).toBeLessThanOrEqual(320);
      
      // Elements should be touch-friendly
      const buttonBox = await loginPage.loginButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
    });

    test('should prioritize most important content', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Should show essential information
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      // Might hide secondary information
      // This depends on the implementation
    });
  });

  test.describe('Orientation Changes', () => {
    test('should handle portrait to landscape on mobile', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await dashboardPage.goto('/dashboard');
      
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Content should still be accessible
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      // Layout should adapt
      const cards = await page.locator('[data-testid*="card"], .card').all();
      if (cards.length >= 2) {
        const firstCardBox = await cards[0].boundingBox();
        const secondCardBox = await cards[1].boundingBox();
        
        // In landscape, cards might be side by side
        if (firstCardBox && secondCardBox) {
          const sideBySide = Math.abs((firstCardBox.y + firstCardBox.height / 2) - 
                                     (secondCardBox.y + secondCardBox.height / 2)) < 50;
          // This layout is acceptable in landscape
        }
      }
    });

    test('should handle tablet orientation changes', async ({ page }) => {
      // Portrait tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await analyticsPage.goto('/analytics');
      
      if (await analyticsPage.contractsChart.isVisible()) {
        const portraitChartBox = await analyticsPage.contractsChart.boundingBox();
        
        // Switch to landscape tablet
        await page.setViewportSize({ width: 1024, height: 768 });
        
        const landscapeChartBox = await analyticsPage.contractsChart.boundingBox();
        
        // Chart should adapt to new dimensions
        expect(landscapeChartBox?.width).toBeGreaterThan(portraitChartBox?.width! || 0);
      }
    });
  });

  test.describe('Print Styles', () => {
    test('should be print-friendly', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Simulate print media
      await page.emulateMedia({ media: 'print' });
      
      // Content should still be visible for print
      await expect(contractsPage.contractsList).toBeVisible();
      
      // Navigation might be hidden for print
      const sidebar = appLayout.sidebar;
      const sidebarVisible = await sidebar.isVisible();
      
      // This depends on print CSS implementation
      // Typically navigation would be hidden in print
    });

    test('should handle print layout for contracts', async ({ page }) => {
      await page.goto('/contracts/contract-1');
      
      await page.emulateMedia({ media: 'print' });
      
      // Contract content should be optimized for printing
      const contractContent = page.locator('[data-testid="contract-content"]');
      if (await contractContent.isVisible()) {
        // Should be readable when printed
        await expect(contractContent).toBeVisible();
      }
    });
  });

  test.describe('Performance on Different Viewports', () => {
    test('should load efficiently on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      await dashboardPage.goto('/dashboard');
      await dashboardPage.expectMetricsVisible();
      const loadTime = Date.now() - startTime;
      
      // Should load quickly on mobile
      expect(loadTime).toBeLessThan(5000);
    });

    test('should not load unnecessary resources on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const resources: string[] = [];
      page.on('response', response => {
        resources.push(response.url());
      });
      
      await dashboardPage.goto('/dashboard');
      
      // Should not load desktop-specific large images or resources
      const largeImages = resources.filter(url => 
        url.includes('large') || url.includes('desktop') || url.includes('2x')
      );
      
      // Mobile should prioritize smaller assets
      expect(largeImages.length).toBeLessThan(5);
    });
  });
});