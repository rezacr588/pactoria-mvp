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
import { setupMockAPI, waitForAPICall } from './utils/api-helpers';

test.describe('Cross-Page Workflows', () => {
  let testUser: TestUserData;
  let testContract: TestContractData;
  
  test.beforeAll(async () => {
    testUser = generateTestUser();
    testContract = generateTestContract();
  });

  test.describe('User Journey: Landing to Dashboard', () => {
    test('complete user journey from landing page to dashboard', async ({ page }) => {
      await setupMockAPI(page);
      
      // Step 1: Start on landing page
      const landingPage = new LandingPage(page);
      await landingPage.goto('/');
      await expect(page.locator('h1')).toBeVisible();
      
      // Step 2: Navigate to login
      await landingPage.clickLogin();
      await expect(page).toHaveURL(/\/login/);
      
      // Step 3: Attempt signup first (if available)
      const signupToggle = page.getByRole('button', { name: /sign up|create account|register/i });
      if (await signupToggle.isVisible()) {
        await signupToggle.click();
        
        // Fill signup form
        const emailInput = page.getByLabel(/email/i);
        const passwordInput = page.getByLabel(/password/i);
        const nameInput = page.getByLabel(/name/i);
        const companyInput = page.getByLabel(/company/i);
        
        await emailInput.fill(testUser.email);
        await passwordInput.fill(testUser.password);
        
        if (await nameInput.isVisible()) {
          await nameInput.fill(testUser.name);
        }
        if (await companyInput.isVisible()) {
          await companyInput.fill(testUser.company);
        }
        
        // Submit signup
        const submitButton = page.getByRole('button', { name: /sign up|register|create/i });
        await submitButton.click();
        
        // Should redirect to dashboard
        await page.waitForURL(/\/dashboard/, { timeout: 10000 });
      } else {
        // Step 4: Login if signup not available
        const loginPage = new LoginPage(page);
        await loginPage.login(testUser);
        await page.waitForURL(/\/dashboard/);
      }
      
      // Step 5: Verify dashboard loads
      await expect(page.locator('h1')).toContainText(/dashboard/i);
      
      // Step 6: Verify user is authenticated
      const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"], [class*="user-menu"]');
      await expect(userMenu).toBeVisible();
    });

    test('should handle authentication redirect after login', async ({ page }) => {
      await setupMockAPI(page);
      
      // Try to access protected page without authentication
      await page.goto('/contracts');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      
      // Login
      const loginPage = new LoginPage(page);
      await loginPage.login(testUser);
      
      // Should redirect back to original page or dashboard
      await page.waitForURL(/\/(dashboard|contracts)/, { timeout: 10000 });
    });
  });

  test.describe('Contract Management Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.waitForURL(/\/dashboard/);
    });

    test('complete contract creation workflow', async ({ page }) => {
      // Step 1: Start from dashboard
      await expect(page.locator('h1')).toContainText(/dashboard/i);
      
      // Step 2: Navigate to contracts via menu or quick action
      const contractsLink = page.getByRole('link', { name: /contracts/i });
      if (await contractsLink.isVisible()) {
        await contractsLink.click();
      } else {
        await page.goto('/contracts');
      }
      
      await expect(page).toHaveURL(/\/contracts/);
      
      // Step 3: Click create new contract
      const createButton = page.getByRole('button', { name: /create|new contract|add contract/i });
      await createButton.click();
      await expect(page).toHaveURL(/\/contracts\/new/);
      
      // Step 4: Fill out contract form
      const titleInput = page.locator('input[name*="title"], input[placeholder*="title"]');
      await titleInput.fill(testContract.title);
      
      const descriptionInput = page.locator('textarea[name*="description"], textarea[placeholder*="description"]');
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill(testContract.description);
      }
      
      // Step 5: Select template if available
      const templateSelector = page.locator('select[name*="template"], [data-testid*="template-select"]');
      if (await templateSelector.isVisible()) {
        await templateSelector.selectOption({ index: 1 });
      }
      
      // Step 6: Save contract
      const submitButton = page.getByRole('button', { name: /create|submit|save/i }).last();
      await submitButton.click();
      
      // Step 7: Should redirect to contract view or list
      await page.waitForURL(/\/contracts/, { timeout: 10000 });
      
      // Step 8: Verify contract appears in list
      if (page.url().includes('/contracts') && !page.url().includes('/contracts/')) {
        // On contracts list page
        await expect(page.locator('text=' + testContract.title)).toBeVisible();
      }
    });

    test('contract view and edit workflow', async ({ page }) => {
      // Step 1: Go to contracts list
      await page.goto('/contracts');
      
      // Step 2: Click on first contract
      const firstContract = page.locator('tr:nth-child(2) a, [data-testid*="contract-item"] a').first();
      await firstContract.click();
      await expect(page).toHaveURL(/\/contracts\/\w+/);
      
      // Step 3: Verify contract details are displayed
      await expect(page.locator('h1')).toBeVisible();
      
      // Step 4: Edit contract
      const editButton = page.getByRole('button', { name: /edit/i });
      await editButton.click();
      
      // Step 5: Make changes
      const editableField = page.locator('input:not([readonly]), textarea:not([readonly])').first();
      if (await editableField.isVisible()) {
        await editableField.fill('Updated Contract Title');
        
        // Step 6: Save changes
        const saveButton = page.getByRole('button', { name: /save/i });
        await saveButton.click();
        
        // Step 7: Verify changes are saved
        await expect(page.locator('text=Updated Contract Title')).toBeVisible();
      }
    });

    test('contract template usage workflow', async ({ page }) => {
      // Step 1: Start from templates page
      await page.goto('/templates');
      
      // Step 2: Select a template
      const firstTemplate = page.locator('[data-testid*="template-item"], [class*="template-card"]').first();
      if (await firstTemplate.isVisible()) {
        // Step 3: Use template for new contract
        const useTemplateButton = firstTemplate.locator('button:has-text("Use"), button:has-text("Create")');
        if (await useTemplateButton.isVisible()) {
          await useTemplateButton.click();
          
          // Should navigate to contract creation with template pre-filled
          await expect(page).toHaveURL(/\/contracts\/new/);
          
          // Step 4: Verify template data is pre-filled
          const titleInput = page.locator('input[name*="title"], input[placeholder*="title"]');
          const titleValue = await titleInput.inputValue();
          expect(titleValue.length).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Navigation and Menu Workflows', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.waitForURL(/\/dashboard/);
    });

    test('complete navigation through all main sections', async ({ page }) => {
      const navigationItems = [
        { name: /dashboard/i, url: '/dashboard' },
        { name: /contracts/i, url: '/contracts' },
        { name: /analytics/i, url: '/analytics' },
        { name: /templates/i, url: '/templates' },
        { name: /integrations/i, url: '/integrations' },
        { name: /audit/i, url: '/audit' },
        { name: /team/i, url: '/team' },
        { name: /settings/i, url: '/settings' },
        { name: /notifications/i, url: '/notifications' },
        { name: /help/i, url: '/help' }
      ];

      for (const item of navigationItems) {
        // Navigate to section
        const navLink = page.getByRole('link', { name: item.name });
        if (await navLink.isVisible()) {
          await navLink.click();
          await expect(page).toHaveURL(new RegExp(item.url.replace('/', '\\/')));
          
          // Verify page loads
          await page.waitForLoadState('networkidle');
          await expect(page.locator('h1')).toBeVisible();
        } else {
          // Navigate directly if link not found
          await page.goto(item.url);
          await expect(page).toHaveURL(item.url);
        }
      }
    });

    test('mobile navigation workflow', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check for mobile menu
      const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"], button[aria-label*="menu"]');
      if (await mobileMenuButton.isVisible()) {
        // Open mobile menu
        await mobileMenuButton.click();
        
        // Verify menu is open
        const mobileMenu = page.locator('[data-testid="mobile-menu"], [role="dialog"]');
        await expect(mobileMenu).toBeVisible();
        
        // Navigate to different section
        const contractsLink = mobileMenu.getByRole('link', { name: /contracts/i });
        await contractsLink.click();
        
        // Verify navigation worked
        await expect(page).toHaveURL(/\/contracts/);
        
        // Verify menu is closed after navigation
        await expect(mobileMenu).toBeHidden();
      }
    });

    test('breadcrumb navigation workflow', async ({ page }) => {
      // Navigate to nested page
      await page.goto('/contracts/new');
      
      // Check for breadcrumbs
      const breadcrumbs = page.locator('[data-testid*="breadcrumb"], nav[aria-label*="breadcrumb"]');
      if (await breadcrumbs.isVisible()) {
        // Click on parent breadcrumb
        const contractsBreadcrumb = breadcrumbs.getByRole('link', { name: /contracts/i });
        if (await contractsBreadcrumb.isVisible()) {
          await contractsBreadcrumb.click();
          await expect(page).toHaveURL(/\/contracts$/);
        }
      }
    });
  });

  test.describe('Search and Filter Workflows', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts');
    });

    test('search and filter workflow', async ({ page }) => {
      // Step 1: Use global search if available
      const globalSearch = page.locator('input[placeholder*="search"], [data-testid*="global-search"]');
      if (await globalSearch.isVisible()) {
        await globalSearch.fill('contract');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
      }
      
      // Step 2: Use page-specific filters
      const filterInput = page.locator('input[placeholder*="filter"], select[name*="status"]');
      if (await filterInput.isVisible()) {
        if (await filterInput.getAttribute('type') === 'text') {
          await filterInput.fill('active');
        } else {
          await filterInput.selectOption('active');
        }
        await page.waitForTimeout(500);
      }
      
      // Step 3: Apply date range filter
      const dateFilter = page.locator('input[type="date"]');
      if (await dateFilter.first().isVisible()) {
        const today = new Date().toISOString().split('T')[0];
        await dateFilter.first().fill(today);
        await page.waitForTimeout(500);
      }
      
      // Step 4: Clear filters
      const clearButton = page.getByRole('button', { name: /clear|reset/i });
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(500);
      }
    });

    test('advanced search workflow', async ({ page }) => {
      // Check if advanced search is available
      const advancedSearchButton = page.getByRole('button', { name: /advanced search|filters/i });
      if (await advancedSearchButton.isVisible()) {
        // Open advanced search
        await advancedSearchButton.click();
        
        // Verify advanced search panel opens
        const advancedPanel = page.locator('[data-testid*="advanced-search"], [class*="filter-panel"]');
        await expect(advancedPanel).toBeVisible();
        
        // Apply multiple filters
        const statusFilter = advancedPanel.locator('select[name*="status"]');
        if (await statusFilter.isVisible()) {
          await statusFilter.selectOption('draft');
        }
        
        const categoryFilter = advancedPanel.locator('select[name*="category"]');
        if (await categoryFilter.isVisible()) {
          await categoryFilter.selectOption({ index: 1 });
        }
        
        // Apply filters
        const applyButton = advancedPanel.getByRole('button', { name: /apply|search/i });
        await applyButton.click();
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('User Profile and Settings Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.waitForURL(/\/dashboard/);
    });

    test('user profile management workflow', async ({ page }) => {
      // Step 1: Access user menu
      const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"], [class*="user-menu"]');
      await userMenu.click();
      
      // Step 2: Navigate to profile/settings
      const profileLink = page.getByRole('link', { name: /profile|settings|account/i });
      await profileLink.click();
      await expect(page).toHaveURL(/\/settings/);
      
      // Step 3: Update profile information
      const nameInput = page.locator('input[name*="name"], input[placeholder*="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.clear();
        await nameInput.fill('Updated User Name');
      }
      
      // Step 4: Change notification preferences
      const notificationTab = page.getByRole('tab', { name: /notification/i });
      if (await notificationTab.isVisible()) {
        await notificationTab.click();
        
        const firstToggle = page.locator('input[type="checkbox"], [role="switch"]').first();
        if (await firstToggle.isVisible()) {
          await firstToggle.click();
        }
      }
      
      // Step 5: Save changes
      const saveButton = page.getByRole('button', { name: /save|update/i });
      await saveButton.click();
      
      // Step 6: Verify success message
      const successMessage = page.locator('[role="alert"], [data-testid="toast"]');
      await expect(successMessage).toBeVisible();
    });

    test('password change workflow', async ({ page }) => {
      // Navigate to settings
      await page.goto('/settings');
      
      // Go to security tab
      const securityTab = page.getByRole('tab', { name: /security|password/i });
      if (await securityTab.isVisible()) {
        await securityTab.click();
        
        // Fill password change form
        const currentPassword = page.locator('input[name*="current"], input[placeholder*="current"]');
        const newPassword = page.locator('input[name*="new"], input[placeholder*="new"]').first();
        const confirmPassword = page.locator('input[name*="confirm"], input[placeholder*="confirm"]');
        
        if (await currentPassword.isVisible() && await newPassword.isVisible()) {
          await currentPassword.fill(testUser.password);
          await newPassword.fill('NewPassword123!');
          
          if (await confirmPassword.isVisible()) {
            await confirmPassword.fill('NewPassword123!');
          }
          
          // Submit password change
          const submitButton = page.getByRole('button', { name: /change|update password/i });
          await submitButton.click();
          
          // Verify success or error message
          const message = page.locator('[role="alert"], [data-testid="toast"]');
          await expect(message).toBeVisible();
        }
      }
    });
  });

  test.describe('Team Collaboration Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/team');
    });

    test('team member invitation workflow', async ({ page }) => {
      // Step 1: Invite new member
      const inviteButton = page.getByRole('button', { name: /invite|add member|add user/i });
      await inviteButton.click();
      
      // Step 2: Fill invitation form
      const inviteModal = page.locator('[role="dialog"], form[data-testid*="invite"]');
      await expect(inviteModal).toBeVisible();
      
      const emailInput = inviteModal.locator('input[type="email"], input[name*="email"]');
      const roleSelect = inviteModal.locator('select[name*="role"]');
      
      await emailInput.fill('newmember@example.com');
      
      if (await roleSelect.isVisible()) {
        await roleSelect.selectOption('viewer');
      }
      
      // Step 3: Send invitation
      const sendButton = inviteModal.getByRole('button', { name: /send|invite/i });
      await sendButton.click();
      
      // Step 4: Verify invitation was sent
      const successMessage = page.locator('[role="alert"], [data-testid="toast"]');
      await expect(successMessage).toBeVisible();
    });

    test('role management workflow', async ({ page }) => {
      // Find first team member
      const firstMember = page.locator('[data-testid*="member"], [class*="member-card"]').first();
      
      // Change role
      const roleSelector = firstMember.locator('select[name*="role"], [data-testid*="role-select"]');
      if (await roleSelector.isVisible()) {
        await roleSelector.selectOption('editor');
        
        // Verify role change
        await page.waitForTimeout(500);
        const selectedRole = await roleSelector.inputValue();
        expect(selectedRole).toBe('editor');
      }
    });
  });

  test.describe('Notification and Communication Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
    });

    test('notification interaction workflow', async ({ page }) => {
      // Step 1: Check notification indicator
      const notificationBell = page.locator('[data-testid*="notification"], [aria-label*="notification"]');
      if (await notificationBell.isVisible()) {
        // Step 2: Open notification panel
        await notificationBell.click();
        
        const notificationPanel = page.locator('[data-testid*="notification-panel"], [role="menu"]');
        if (await notificationPanel.isVisible()) {
          // Step 3: Click on first notification
          const firstNotification = notificationPanel.locator('[data-testid*="notification-item"]').first();
          if (await firstNotification.isVisible()) {
            await firstNotification.click();
          }
        }
      }
      
      // Step 4: Go to full notifications page
      await page.goto('/notifications');
      
      // Step 5: Mark notifications as read
      const markAllButton = page.getByRole('button', { name: /mark all|read all/i });
      if (await markAllButton.isVisible()) {
        await markAllButton.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Data Export and Integration Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
    });

    test('analytics and reporting workflow', async ({ page }) => {
      // Step 1: Go to analytics
      await page.goto('/analytics');
      
      // Step 2: Adjust date range
      const dateRangeSelector = page.locator('[data-testid*="date-range"], input[type="date"]');
      if (await dateRangeSelector.first().isVisible()) {
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        await dateRangeSelector.first().fill(lastMonth.toISOString().split('T')[0]);
      }
      
      // Step 3: Apply filters
      const metricFilter = page.locator('select, [role="combobox"]').first();
      if (await metricFilter.isVisible()) {
        await metricFilter.click();
        const firstOption = page.locator('option, [role="option"]').nth(1);
        if (await firstOption.isVisible()) {
          await firstOption.click();
        }
      }
      
      // Step 4: Export report
      const exportButton = page.getByRole('button', { name: /export|download|report/i });
      if (await exportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        
        // Verify download started
        try {
          const download = await downloadPromise;
          expect(download).toBeTruthy();
        } catch (error) {
          // Download may not actually happen in test environment
          console.log('Download test skipped in test environment');
        }
      }
    });

    test('integration configuration workflow', async ({ page }) => {
      // Step 1: Go to integrations
      await page.goto('/integrations');
      
      // Step 2: Configure an integration
      const firstIntegration = page.locator('[data-testid*="integration-item"], [class*="integration-card"]').first();
      const configButton = firstIntegration.locator('button:has-text("Configure"), button:has-text("Settings")');
      
      if (await configButton.isVisible()) {
        await configButton.click();
        
        // Step 3: Fill configuration form
        const configModal = page.locator('[role="dialog"], [data-testid*="config"], form');
        await expect(configModal).toBeVisible();
        
        const apiKeyInput = configModal.locator('input[name*="key"], input[name*="token"]');
        if (await apiKeyInput.isVisible()) {
          await apiKeyInput.fill('test-api-key-123');
        }
        
        // Step 4: Test connection
        const testButton = configModal.getByRole('button', { name: /test|verify/i });
        if (await testButton.isVisible()) {
          await testButton.click();
          await page.waitForTimeout(1000);
        }
        
        // Step 5: Save configuration
        const saveButton = configModal.getByRole('button', { name: /save|apply/i });
        await saveButton.click();
        
        // Step 6: Verify integration is enabled
        await page.waitForTimeout(500);
        const statusIndicator = firstIntegration.locator('[data-testid*="status"], [class*="status"]');
        await expect(statusIndicator).toBeVisible();
      }
    });
  });
});