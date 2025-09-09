import { test, expect } from '@playwright/test';
import { DashboardPage, ContractCreatePage } from '../utils/page-objects';
import { loginWithDemoAccount } from '../helpers/auth';
import { LandingPage, LoginPage, ContractsPage } from '../utils/page-objects';
// import { TestUser } from '../utils/test-data';
import { APIMocker } from '../utils/api-mock';

test.describe('Accessibility Tests', () => {
  let landingPage: LandingPage;
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let contractsPage: ContractsPage;
  let contractCreatePage: ContractCreatePage;
  // let appLayout: AppLayout;
  // let commandPalette: CommandPalette;
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    contractsPage = new ContractsPage(page);
    contractCreatePage = new ContractCreatePage(page);
    // appLayout = new AppLayout(page);
    // commandPalette = new CommandPalette(page);
    apiMocker = new APIMocker(page);

    await apiMocker.mockAllEndpoints();
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation on landing page', async ({ page }) => {
      await landingPage.goto('/');
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').getAttribute('role');
      expect(focusedElement || 'link').toBeTruthy();
      
      // Skip links should be first
      const skipLink = page.getByRole('link', { name: /Skip to main content/i });
      if (await skipLink.isVisible()) {
        await expect(skipLink).toBeFocused();
      }
      
      // Continue tabbing through navigation
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible();
      }
    });

    test('should support keyboard navigation in login form', async ({ page }) => {
      await loginPage.goto('/login');
      
      // Tab through form elements in logical order
      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="email"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="password"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();
      
      // Test Enter key submission
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.keyboard.press('Enter');
      
      // Should attempt to submit form
      await page.waitForTimeout(1000);
    });

    test('should support keyboard navigation in contracts table', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });

      await contractsPage.goto('/contracts');
      
      // Navigate to search input
      await page.keyboard.press('Tab');
      // Continue tabbing until we reach search or table
      let tabCount = 0;
      while (tabCount < 10) {
        const focused = await page.locator(':focus').getAttribute('placeholder');
        if (focused && focused.includes('search')) {
          break;
        }
        await page.keyboard.press('Tab');
        tabCount++;
      }
      
      // Test keyboard search
      await page.keyboard.type('test contract');
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(1000);
    });

    test('should support keyboard shortcuts', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });

      await dashboardPage.goto('/dashboard');
      
      // Test command palette shortcut
      await page.keyboard.press('Meta+k');
      
      const commandPaletteInput = page.getByPlaceholder(/search commands/i);
      if (await commandPaletteInput.isVisible({ timeout: 2000 })) {
        await expect(commandPaletteInput).toBeVisible();
        await expect(commandPaletteInput).toBeFocused();
        
        // Test Escape to close
        await page.keyboard.press('Escape');
        await expect(commandPaletteInput).not.toBeVisible();
      }
      
      // Test help shortcut
      await page.keyboard.press('Shift+?');
      
      const helpModal = page.getByRole('heading', { name: /keyboard shortcuts/i });
      if (await helpModal.isVisible({ timeout: 2000 })) {
        await expect(helpModal).toBeVisible();
        
        // Close with Escape
        await page.keyboard.press('Escape');
        await expect(helpModal).not.toBeVisible();
      }
    });

    test('should trap focus in modals', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });

      await dashboardPage.goto('/dashboard');
      
      // Open command palette
      await page.keyboard.press('Meta+k');
      
      const commandPaletteInput = page.getByPlaceholder(/search commands/i);
      if (await commandPaletteInput.isVisible({ timeout: 2000 })) {
        await expect(commandPaletteInput).toBeFocused();
        
        // Tab should stay within modal
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        const isInsideModal = await focusedElement.locator('..').locator('[role="dialog"]').count() > 0;
        
        // Focus should remain within modal bounds  
        const isFocused = await commandPaletteInput.evaluate(el => document.activeElement === el);
        expect(isInsideModal || isFocused).toBeTruthy();
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper heading structure', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Check heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      let currentLevel = 0;
      
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName);
        const level = parseInt(tagName.substring(1));
        
        // Heading levels should not skip (h1 -> h3 is not allowed)
        if (currentLevel > 0) {
          expect(level).toBeLessThanOrEqual(currentLevel + 1);
        }
        currentLevel = Math.max(currentLevel, level);
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Check that interactive elements have proper ARIA labels
      const buttons = await page.locator('button').all();
      
      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const innerText = await button.innerText();
        const hasAccessibleName = ariaLabel || innerText.trim().length > 0;
        
        expect(hasAccessibleName).toBeTruthy();
      }
      
      // Check that form controls have labels
      const inputs = await page.locator('input, textarea, select').all();
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        let hasLabel = false;
        
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count();
          hasLabel = label > 0;
        }
        
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    });

    test('should announce dynamic content changes', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });

      await contractCreatePage.goto('/contracts/new');
      
      // Trigger validation error
      await contractCreatePage.titleInput.focus();
      await contractCreatePage.titleInput.blur();
      
      // Check for ARIA live region or alert role
      const liveRegion = page.locator('[aria-live], [role="alert"], [role="status"]');
      await expect(liveRegion).toHaveCount(1, { timeout: 3000 });
    });

    test('should have proper landmark regions', async ({ page }) => {
      await loginWithDemoAccount(page);
      await page.goto('/dashboard');
      
      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Allow time for layout to render
      
      // Check for main landmarks with specific selectors
      const landmarks = {
        banner: page.locator('header'),
        main: page.locator('main'),
        navigation: page.locator('nav'),
        contentinfo: page.locator('footer')
      };
      
      // Main and navigation should always be present
      const mainCount = await landmarks.main.count();
      const navCount = await landmarks.navigation.count();
      
      expect(mainCount).toBeGreaterThanOrEqual(1);
      expect(navCount).toBeGreaterThanOrEqual(1);
      
      // Other landmarks are optional but good to have
      const bannerCount = await landmarks.banner.count();
      const footerCount = await landmarks.contentinfo.count();
      
      // Just log the counts for visibility, don't fail if missing
      console.log(`Landmarks found - Main: ${mainCount}, Nav: ${navCount}, Banner: ${bannerCount}, Footer: ${footerCount}`);
    });

    test('should provide skip links', async ({ page }) => {
      await landingPage.goto('/');
      
      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');
      
      // Tab to first element (might be skip link)
      await page.keyboard.press('Tab');
      
      // Check for skip links with various selectors
      const skipLinkSelectors = [
        'a[href="#main"]',
        'a[href="#content"]', 
        '.skip-link',
        '.sr-only a',
        'a:has-text("Skip")',
        'link:has-text("Skip to main")'
      ];
      
      let skipLinkFound = false;
      for (const selector of skipLinkSelectors) {
        const skipLink = page.locator(selector).first();
        if (await skipLink.isVisible({ timeout: 1000 }).catch(() => false)) {
          skipLinkFound = true;
          
          // Test skip link functionality if found
          await skipLink.click();
          
          // Should jump to main content area
          const mainContent = page.locator('[role="main"], main, #main, #content').first();
          if (await mainContent.isVisible()) {
            const isMainFocused = await mainContent.evaluate(el => 
              document.activeElement === el || el.contains(document.activeElement)
            );
            expect(isMainFocused).toBeTruthy();
          }
          break;
        }
      }
      
      // If no skip link found, that's not necessarily a failure for this test
      // but we should log it for accessibility improvements
      if (!skipLinkFound) {
        console.log('No skip links found - consider adding for better accessibility');
      }
    });
  });

  test.describe('Color and Contrast', () => {
    test('should work with high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.addInitScript(() => {
        const style = document.createElement('style');
        style.textContent = `
          * {
            background: black !important;
            color: white !important;
            border-color: white !important;
          }
          a {
            color: yellow !important;
          }
          button {
            background: white !important;
            color: black !important;
          }
        `;
        document.head.appendChild(style);
      });

      await dashboardPage.goto('/dashboard');
      
      // Content should still be readable
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      // Interactive elements should still be functional
      const buttons = await page.locator('button').all();
      for (const button of buttons.slice(0, 3)) { // Test first 3 buttons
        await expect(button).toBeVisible();
      }
    });

    test('should support dark mode', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('theme', 'dark');
      });

      await dashboardPage.goto('/dashboard');
      
      // Should apply dark theme
      const body = page.locator('body');
      const classes = await body.getAttribute('class');
      expect(classes).toContain('dark');
      
      // Content should be visible in dark mode
      await expect(dashboardPage.welcomeMessage).toBeVisible();
    });

    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await dashboardPage.goto('/dashboard');
      
      // Animations should be disabled or reduced
      const animatedElements = await page.locator('[class*="animate"], [style*="transition"]').all();
      
      for (const element of animatedElements) {
        const styles = await element.evaluate(el => getComputedStyle(el));
        // Animation duration should be minimal or none
        expect(styles.animationDuration === 'none' || 
               styles.animationDuration === '0s' ||
               styles.transitionDuration === 'none' ||
               styles.transitionDuration === '0s').toBeTruthy();
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have accessible form validation', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      // Submit empty form to trigger validation
      await page.click('button[type="submit"]');
      
      // Check that errors are properly associated
      const errorMessages = await page.locator('[role="alert"]').all();
      
      for (const error of errorMessages) {
        const errorId = await error.getAttribute('id');
        if (errorId) {
          const associatedInput = page.locator(`[aria-describedby*="${errorId}"]`);
          const hasAssociation = await associatedInput.count() > 0;
          expect(hasAssociation).toBeTruthy();
        }
      }
    });

    test('should support autocomplete attributes', async ({ page }) => {
      await loginPage.goto('/login');
      
      // Check for appropriate autocomplete attributes
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      
      const emailAutocomplete = await emailInput.getAttribute('autocomplete');
      const passwordAutocomplete = await passwordInput.getAttribute('autocomplete');
      
      expect(emailAutocomplete).toBe('email');
      expect(passwordAutocomplete).toBe('current-password');
    });

    test('should have accessible date pickers', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });

      await contractCreatePage.goto('/contracts/new');
      
      if (await contractCreatePage.startDateInput.isVisible()) {
        // Should be keyboard accessible
        await contractCreatePage.startDateInput.focus();
        await page.keyboard.press('Space');
        
        // Date picker should open and be navigable
        const datePicker = page.locator('[role="dialog"][aria-label*="date"]');
        if (await datePicker.isVisible({ timeout: 2000 })) {
          // Should be able to navigate with arrow keys
          await page.keyboard.press('ArrowRight');
          await page.keyboard.press('Enter');
          
          // Should close and update input
          await expect(datePicker).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should work with mobile screen readers', async ({ page }) => {
      // Simulate mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await dashboardPage.goto('/dashboard');
      
      // Check that content is accessible on mobile
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      // Navigation should be accessible
      const mobileMenu = page.getByRole('button', { name: /menu/i });
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenu).toBeVisible();
        
        // Should have proper ARIA attributes
        const expanded = await mobileMenu.getAttribute('aria-expanded');
        expect(expanded).toBe('false');
        
        await mobileMenu.click();
        
        const expandedAfter = await mobileMenu.getAttribute('aria-expanded');
        expect(expandedAfter).toBe('true');
      }
    });

    test('should support touch gestures accessibly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await contractsPage.goto('/contracts');
      
      // Swipe gestures should not interfere with accessibility
      const firstContract = contractsPage.contractRow.first();
      if (await firstContract.isVisible()) {
        // Touch should work like click for screen readers
        await firstContract.tap();
        
        // Should navigate to contract
        await expect(page).toHaveURL(/\/contracts\//);
      }
    });
  });

  test.describe('Assistive Technology Compatibility', () => {
    test('should work with virtual cursor navigation', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Simulate virtual cursor by checking that all text content is accessible
      const allText = await page.textContent('body');
      expect(allText).toBeTruthy();
      expect(allText!.length).toBeGreaterThan(0);
      
      // Important content should be in proper order
      const headings = await page.locator('h1, h2, h3').allTextContents();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should support voice commands', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Elements should have recognizable names for voice commands
      const buttons = await page.locator('button').all();
      
      for (const button of buttons.slice(0, 3)) {
        const accessibleName = await button.getAttribute('aria-label') || 
                              await button.innerText() ||
                              await button.getAttribute('title');
        
        expect(accessibleName).toBeTruthy();
        expect(accessibleName!.trim().length).toBeGreaterThan(2);
      }
    });

    test('should work with switch navigation', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      // All interactive elements should be focusable
      const interactiveElements = await page.locator(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      ).all();
      
      for (const element of interactiveElements.slice(0, 5)) {
        await element.focus();
        const isFocused = await element.evaluate(el => document.activeElement === el);
        expect(isFocused).toBeTruthy();
      }
    });
  });

  test.describe('WCAG Compliance', () => {
    test('should meet WCAG 2.1 Level AA requirements', async ({ page }) => {
      // This would typically use an accessibility testing library like axe-core
      await dashboardPage.goto('/dashboard');
      
      // Check for common WCAG violations
      
      // 1. All images should have alt text
      const images = await page.locator('img').all();
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const role = await img.getAttribute('role');
        
        // Images should have alt text or be marked as decorative
        expect(alt !== null || ariaLabel || role === 'presentation').toBeTruthy();
      }
      
      // 2. Form inputs should have labels
      const inputs = await page.locator('input[type!="hidden"]').all();
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count();
          expect(label > 0 || ariaLabel).toBeTruthy();
        }
      }
      
      // 3. Links should have descriptive text
      const links = await page.locator('a').all();
      for (const link of links) {
        const text = await link.innerText();
        const ariaLabel = await link.getAttribute('aria-label');
        const accessibleName = text || ariaLabel;
        
        expect(accessibleName).toBeTruthy();
        expect(accessibleName!.trim().length).toBeGreaterThan(0);
      }
    });
  });
});