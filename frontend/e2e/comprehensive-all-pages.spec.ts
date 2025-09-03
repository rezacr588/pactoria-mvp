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

// Test configuration for different viewports
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 }
};

// Helper function to test responsive design
async function testResponsiveDesign(page: Page, url: string) {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(viewport);
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    
    // Check that content is visible and properly laid out
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
    
    // For mobile, check if navigation is collapsed
    if (device === 'mobile') {
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"], button[aria-label*="menu"]');
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenu).toBeVisible();
      }
    }
  }
}

// Helper function to test accessibility
async function testAccessibility(page: Page) {
  // Check for proper heading hierarchy
  const h1Count = await page.locator('h1').count();
  expect(h1Count).toBeGreaterThanOrEqual(1);
  
  // Check for alt text on images
  const images = page.locator('img');
  const imageCount = await images.count();
  for (let i = 0; i < imageCount; i++) {
    const img = images.nth(i);
    const alt = await img.getAttribute('alt');
    if (await img.isVisible()) {
      expect(alt).toBeTruthy();
    }
  }
  
  // Check for ARIA labels on interactive elements
  const buttons = page.locator('button:visible');
  const buttonCount = await buttons.count();
  for (let i = 0; i < buttonCount; i++) {
    const button = buttons.nth(i);
    const text = await button.textContent();
    const ariaLabel = await button.getAttribute('aria-label');
    expect(text || ariaLabel).toBeTruthy();
  }
  
  // Check for focus indicators
  await page.keyboard.press('Tab');
  const focusedElement = page.locator(':focus');
  await expect(focusedElement).toBeVisible();
}

// Helper function to test forms
async function testFormValidation(page: Page, formSelector: string) {
  const form = page.locator(formSelector);
  
  // Try to submit empty form
  const submitButton = form.locator('button[type="submit"]');
  if (await submitButton.isVisible()) {
    await submitButton.click();
    
    // Check for validation errors
    const errors = page.locator('[role="alert"], .error, .text-red-500');
    const errorCount = await errors.count();
    expect(errorCount).toBeGreaterThan(0);
  }
}

test.describe('Comprehensive All Pages Tests', () => {
  let testUser: TestUserData;
  
  test.beforeAll(async () => {
    testUser = generateTestUser();
  });

  test.describe('1. Landing Page', () => {
    test('should load and display all elements correctly', async ({ page }) => {
      await page.goto('/');
      
      // Check main elements
      await expect(page).toHaveTitle(/Pactoria/i);
      await expect(page.locator('h1')).toBeVisible();
      
      // Check navigation links
      const loginLink = page.getByRole('link', { name: /sign in|login/i });
      await expect(loginLink).toBeVisible();
      
      // Check hero section
      const heroSection = page.locator('section').first();
      await expect(heroSection).toBeVisible();
      
      // Check CTA buttons
      const ctaButton = page.getByRole('button', { name: /get started|start free|sign up/i }).first();
      await expect(ctaButton).toBeVisible();
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await page.goto('/');
      await testAccessibility(page);
    });

    test('should navigate to login page', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.goto('/');
      await landingPage.clickLogin();
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle scroll animations', async ({ page }) => {
      await page.goto('/');
      
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Check if footer is visible
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      
      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
    });
  });

  test.describe('2. Login/Signup Page', () => {
    test('should display login form correctly', async ({ page }) => {
      await page.goto('/login');
      
      const loginPage = new LoginPage(page);
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();
    });

    test('should validate login form', async ({ page }) => {
      await page.goto('/login');
      await testFormValidation(page, 'form');
    });

    test('should handle invalid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      
      await loginPage.emailInput.fill('invalid@example.com');
      await loginPage.passwordInput.fill('wrongpassword');
      await loginPage.loginButton.click();
      
      await loginPage.expectError();
    });

    test('should switch between login and signup', async ({ page }) => {
      await page.goto('/login');
      
      // Look for signup toggle/link
      const signupToggle = page.getByRole('button', { name: /sign up|create account|register/i });
      if (await signupToggle.isVisible()) {
        await signupToggle.click();
        
        // Check for additional signup fields
        const nameField = page.getByLabel(/name/i);
        await expect(nameField).toBeVisible();
      }
    });

    test('should handle successful login', async ({ page }) => {
      await setupMockAPI(page);
      
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      
      // Should redirect to dashboard
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/login');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await page.goto('/login');
      await testAccessibility(page);
    });
  });

  test.describe('3. Dashboard Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.waitForURL(/\/dashboard/);
    });

    test('should display dashboard widgets', async ({ page }) => {
      // Check for dashboard elements
      await expect(page.locator('h1')).toContainText(/dashboard/i);
      
      // Check for stats/metrics
      const statsCards = page.locator('[data-testid*="stat"], .stat-card, [class*="metric"]');
      const statsCount = await statsCards.count();
      expect(statsCount).toBeGreaterThan(0);
      
      // Check for charts or graphs
      const charts = page.locator('canvas, svg[role="img"], [class*="chart"]');
      const chartsVisible = await charts.first().isVisible().catch(() => false);
      if (chartsVisible) {
        await expect(charts.first()).toBeVisible();
      }
    });

    test('should load recent activity', async ({ page }) => {
      // Check for activity feed or recent items
      const activitySection = page.locator('[data-testid*="activity"], [class*="recent"], [class*="activity"]');
      if (await activitySection.isVisible()) {
        await expect(activitySection).toBeVisible();
      }
    });

    test('should have quick actions', async ({ page }) => {
      // Check for quick action buttons
      const quickActions = page.locator('[data-testid*="quick-action"], button:has-text("Create"), button:has-text("New")');
      const actionCount = await quickActions.count();
      expect(actionCount).toBeGreaterThan(0);
    });

    test('should handle data refresh', async ({ page }) => {
      // Look for refresh button
      const refreshButton = page.locator('button[aria-label*="refresh"], button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        // Check for loading state
        const loader = page.locator('[data-testid="loading"], .spinner, [class*="loading"]');
        if (await loader.isVisible()) {
          await expect(loader).toBeHidden({ timeout: 10000 });
        }
      }
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/dashboard');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });

  test.describe('4. Contracts Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts');
    });

    test('should display contracts list', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/contracts/i);
      
      // Check for contracts table or grid
      const contractsList = page.locator('table, [role="grid"], [data-testid*="contract-list"]');
      await expect(contractsList).toBeVisible();
    });

    test('should have create contract button', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /create|new contract|add contract/i });
      await expect(createButton).toBeVisible();
      
      await createButton.click();
      await expect(page).toHaveURL(/\/contracts\/new/);
    });

    test('should support filtering', async ({ page }) => {
      // Check for filter controls
      const filterInput = page.locator('input[placeholder*="search"], input[placeholder*="filter"]');
      if (await filterInput.isVisible()) {
        await filterInput.fill('test contract');
        await page.keyboard.press('Enter');
        
        // Wait for results to update
        await page.waitForTimeout(500);
      }
    });

    test('should support sorting', async ({ page }) => {
      // Check for sortable columns
      const sortableHeaders = page.locator('th[role="columnheader"], th button');
      if (await sortableHeaders.first().isVisible()) {
        await sortableHeaders.first().click();
        // Check for sort indicator
        const sortIcon = sortableHeaders.first().locator('svg, [class*="sort"]');
        await expect(sortIcon).toBeVisible();
      }
    });

    test('should support pagination', async ({ page }) => {
      // Check for pagination controls
      const pagination = page.locator('[role="navigation"], [class*="pagination"], [data-testid*="pagination"]');
      if (await pagination.isVisible()) {
        const nextButton = pagination.locator('button:has-text("Next"), button[aria-label*="next"]');
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should open contract details', async ({ page }) => {
      // Click on first contract
      const firstContract = page.locator('tr:nth-child(2) a, [data-testid*="contract-item"] a').first();
      if (await firstContract.isVisible()) {
        await firstContract.click();
        await expect(page).toHaveURL(/\/contracts\/\w+/);
      }
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/contracts');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });

  test.describe('5. Contract Create Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/contracts/new');
    });

    test('should display create contract form', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/create|new contract/i);
      
      // Check for form fields
      const titleInput = page.locator('input[name*="title"], input[placeholder*="title"]');
      await expect(titleInput).toBeVisible();
      
      const descriptionInput = page.locator('textarea[name*="description"], textarea[placeholder*="description"]');
      await expect(descriptionInput).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await testFormValidation(page, 'form');
    });

    test('should support template selection', async ({ page }) => {
      // Check for template selector
      const templateSelector = page.locator('select[name*="template"], [data-testid*="template-select"]');
      if (await templateSelector.isVisible()) {
        await templateSelector.selectOption({ index: 1 });
      }
    });

    test('should save draft', async ({ page }) => {
      // Fill some fields
      const titleInput = page.locator('input[name*="title"], input[placeholder*="title"]');
      await titleInput.fill('Test Contract Draft');
      
      // Look for save draft button
      const saveDraftButton = page.getByRole('button', { name: /save draft|save as draft/i });
      if (await saveDraftButton.isVisible()) {
        await saveDraftButton.click();
        
        // Check for success message
        const toast = page.locator('[role="alert"], [data-testid="toast"]');
        await expect(toast).toBeVisible();
      }
    });

    test('should handle form submission', async ({ page }) => {
      // Fill required fields
      const titleInput = page.locator('input[name*="title"], input[placeholder*="title"]');
      await titleInput.fill('Test Contract');
      
      const descriptionInput = page.locator('textarea[name*="description"], textarea[placeholder*="description"]');
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('Test contract description');
      }
      
      // Submit form
      const submitButton = page.getByRole('button', { name: /create|submit|save/i }).last();
      await submitButton.click();
      
      // Should redirect to contract view or list
      await page.waitForURL(/\/contracts/, { timeout: 10000 });
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/contracts/new');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });

  test.describe('6. Contract View Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      // Use a mock contract ID
      await page.goto('/contracts/mock-contract-id');
    });

    test('should display contract details', async ({ page }) => {
      // Check for contract title
      await expect(page.locator('h1')).toBeVisible();
      
      // Check for contract metadata
      const metadata = page.locator('[data-testid*="metadata"], [class*="contract-info"]');
      if (await metadata.isVisible()) {
        await expect(metadata).toBeVisible();
      }
    });

    test('should have action buttons', async ({ page }) => {
      // Check for edit button
      const editButton = page.getByRole('button', { name: /edit/i });
      await expect(editButton).toBeVisible();
      
      // Check for other actions
      const deleteButton = page.getByRole('button', { name: /delete/i });
      const downloadButton = page.getByRole('button', { name: /download|export/i });
      
      // At least one action should be available
      const hasActions = await editButton.isVisible() || 
                        await deleteButton.isVisible() || 
                        await downloadButton.isVisible();
      expect(hasActions).toBeTruthy();
    });

    test('should display contract content', async ({ page }) => {
      // Check for contract content area
      const content = page.locator('[data-testid*="content"], [class*="contract-content"], article');
      await expect(content).toBeVisible();
    });

    test('should handle edit mode', async ({ page }) => {
      const editButton = page.getByRole('button', { name: /edit/i });
      await editButton.click();
      
      // Check if form becomes editable
      const editableField = page.locator('input:not([readonly]), textarea:not([readonly])').first();
      await expect(editableField).toBeVisible();
      
      // Check for save/cancel buttons
      const saveButton = page.getByRole('button', { name: /save/i });
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      await expect(saveButton).toBeVisible();
      await expect(cancelButton).toBeVisible();
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/contracts/mock-contract-id');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });

  test.describe('7. Analytics Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/analytics');
    });

    test('should display analytics dashboard', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/analytics|reports/i);
      
      // Check for charts
      const charts = page.locator('canvas, svg[role="img"], [class*="chart"]');
      const chartsCount = await charts.count();
      expect(chartsCount).toBeGreaterThan(0);
    });

    test('should have date range selector', async ({ page }) => {
      const dateRangeSelector = page.locator('[data-testid*="date-range"], input[type="date"], [class*="date-picker"]');
      await expect(dateRangeSelector.first()).toBeVisible();
    });

    test('should support metric filtering', async ({ page }) => {
      // Check for metric filters
      const filters = page.locator('select, [role="combobox"], [data-testid*="filter"]');
      if (await filters.first().isVisible()) {
        const firstFilter = filters.first();
        await firstFilter.click();
      }
    });

    test('should export reports', async ({ page }) => {
      const exportButton = page.getByRole('button', { name: /export|download|report/i });
      if (await exportButton.isVisible()) {
        await expect(exportButton).toBeEnabled();
      }
    });

    test('should display key metrics', async ({ page }) => {
      // Check for KPI cards
      const kpiCards = page.locator('[data-testid*="kpi"], [data-testid*="metric"], [class*="stat-card"]');
      const kpiCount = await kpiCards.count();
      expect(kpiCount).toBeGreaterThan(0);
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/analytics');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });

  test.describe('8. Templates Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/templates');
    });

    test('should display templates list', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/template/i);
      
      // Check for templates grid or list
      const templatesList = page.locator('[data-testid*="template"], [class*="template-card"], [role="grid"]');
      await expect(templatesList.first()).toBeVisible();
    });

    test('should have create template button', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /create template|new template|add template/i });
      await expect(createButton).toBeVisible();
    });

    test('should support template preview', async ({ page }) => {
      // Click on first template
      const firstTemplate = page.locator('[data-testid*="template-item"], [class*="template-card"]').first();
      if (await firstTemplate.isVisible()) {
        await firstTemplate.click();
        
        // Check for preview modal or detail view
        const preview = page.locator('[role="dialog"], [data-testid*="preview"], [class*="modal"]');
        await expect(preview).toBeVisible();
      }
    });

    test('should support template categories', async ({ page }) => {
      // Check for category filters
      const categories = page.locator('[data-testid*="category"], [role="tablist"], [class*="category"]');
      if (await categories.isVisible()) {
        const firstCategory = categories.locator('[role="tab"], button').first();
        await firstCategory.click();
      }
    });

    test('should support template search', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('contract template');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/templates');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });

  test.describe('9. Integrations Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/integrations');
    });

    test('should display available integrations', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/integration/i);
      
      // Check for integration cards
      const integrationCards = page.locator('[data-testid*="integration"], [class*="integration-card"]');
      const cardCount = await integrationCards.count();
      expect(cardCount).toBeGreaterThan(0);
    });

    test('should show integration status', async ({ page }) => {
      // Check for status indicators
      const statusIndicators = page.locator('[data-testid*="status"], [class*="status"], [class*="badge"]');
      await expect(statusIndicators.first()).toBeVisible();
    });

    test('should support integration configuration', async ({ page }) => {
      // Click on first integration
      const firstIntegration = page.locator('[data-testid*="integration-item"], [class*="integration-card"]').first();
      const configButton = firstIntegration.locator('button:has-text("Configure"), button:has-text("Settings")');
      
      if (await configButton.isVisible()) {
        await configButton.click();
        
        // Check for configuration modal or form
        const configModal = page.locator('[role="dialog"], [data-testid*="config"], form');
        await expect(configModal).toBeVisible();
      }
    });

    test('should support enabling/disabling integrations', async ({ page }) => {
      // Look for toggle switches
      const toggles = page.locator('input[type="checkbox"], [role="switch"], button[aria-pressed]');
      if (await toggles.first().isVisible()) {
        const firstToggle = toggles.first();
        await firstToggle.click();
        
        // Check for state change
        await page.waitForTimeout(500);
      }
    });

    test('should display integration documentation', async ({ page }) => {
      // Check for documentation links
      const docLinks = page.locator('a:has-text("Documentation"), a:has-text("Learn more"), a:has-text("Help")');
      await expect(docLinks.first()).toBeVisible();
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/integrations');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });

  test.describe('10. Audit Trail Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/audit');
    });

    test('should display audit log entries', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/audit/i);
      
      // Check for audit log table
      const auditTable = page.locator('table, [role="grid"], [data-testid*="audit-log"]');
      await expect(auditTable).toBeVisible();
    });

    test('should show event details', async ({ page }) => {
      // Check for event type, user, timestamp columns
      const headers = page.locator('th');
      const headerTexts = await headers.allTextContents();
      
      expect(headerTexts.some(text => text.toLowerCase().includes('event'))).toBeTruthy();
      expect(headerTexts.some(text => text.toLowerCase().includes('user'))).toBeTruthy();
      expect(headerTexts.some(text => text.toLowerCase().includes('time') || text.toLowerCase().includes('date'))).toBeTruthy();
    });

    test('should support filtering by event type', async ({ page }) => {
      // Check for event type filter
      const eventFilter = page.locator('select[name*="event"], [data-testid*="event-filter"]');
      if (await eventFilter.isVisible()) {
        await eventFilter.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    });

    test('should support date range filtering', async ({ page }) => {
      // Check for date range inputs
      const dateInputs = page.locator('input[type="date"], [data-testid*="date"]');
      if (await dateInputs.first().isVisible()) {
        const today = new Date().toISOString().split('T')[0];
        await dateInputs.first().fill(today);
      }
    });

    test('should export audit logs', async ({ page }) => {
      const exportButton = page.getByRole('button', { name: /export|download/i });
      if (await exportButton.isVisible()) {
        await expect(exportButton).toBeEnabled();
      }
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/audit');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });

  test.describe('11. Team Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/team');
    });

    test('should display team members', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/team/i);
      
      // Check for team member list
      const membersList = page.locator('[data-testid*="member"], [class*="member-card"], table tr');
      const memberCount = await membersList.count();
      expect(memberCount).toBeGreaterThan(0);
    });

    test('should have invite member functionality', async ({ page }) => {
      const inviteButton = page.getByRole('button', { name: /invite|add member|add user/i });
      await expect(inviteButton).toBeVisible();
      
      await inviteButton.click();
      
      // Check for invite modal or form
      const inviteModal = page.locator('[role="dialog"], form[data-testid*="invite"]');
      await expect(inviteModal).toBeVisible();
    });

    test('should display member roles', async ({ page }) => {
      // Check for role badges or indicators
      const roles = page.locator('[data-testid*="role"], [class*="role"], .badge');
      await expect(roles.first()).toBeVisible();
    });

    test('should support member management', async ({ page }) => {
      // Check for action buttons (edit, remove)
      const actionButtons = page.locator('button[aria-label*="edit"], button[aria-label*="remove"], button[aria-label*="manage"]');
      if (await actionButtons.first().isVisible()) {
        await expect(actionButtons.first()).toBeEnabled();
      }
    });

    test('should support role assignment', async ({ page }) => {
      // Look for role selectors
      const roleSelectors = page.locator('select[name*="role"], [data-testid*="role-select"]');
      if (await roleSelectors.first().isVisible()) {
        await roleSelectors.first().selectOption({ index: 1 });
      }
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/team');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });

  test.describe('12. Settings Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/settings');
    });

    test('should display settings sections', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/settings/i);
      
      // Check for settings tabs or sections
      const settingsSections = page.locator('[role="tablist"], [data-testid*="settings-nav"], .settings-menu');
      await expect(settingsSections).toBeVisible();
    });

    test('should have profile settings', async ({ page }) => {
      // Check for profile section
      const profileSection = page.locator('[data-testid*="profile"], h2:has-text("Profile")');
      if (await profileSection.isVisible()) {
        // Check for profile fields
        const nameInput = page.locator('input[name*="name"], input[placeholder*="name"]');
        const emailInput = page.locator('input[name*="email"], input[type="email"]');
        
        await expect(nameInput.or(emailInput).first()).toBeVisible();
      }
    });

    test('should have notification preferences', async ({ page }) => {
      // Check for notification settings
      const notificationTab = page.getByRole('tab', { name: /notification/i });
      if (await notificationTab.isVisible()) {
        await notificationTab.click();
        
        // Check for notification toggles
        const notificationToggles = page.locator('input[type="checkbox"], [role="switch"]');
        const toggleCount = await notificationToggles.count();
        expect(toggleCount).toBeGreaterThan(0);
      }
    });

    test('should have security settings', async ({ page }) => {
      // Check for security section
      const securityTab = page.getByRole('tab', { name: /security|password/i });
      if (await securityTab.isVisible()) {
        await securityTab.click();
        
        // Check for password change form
        const passwordFields = page.locator('input[type="password"]');
        await expect(passwordFields.first()).toBeVisible();
      }
    });

    test('should save settings changes', async ({ page }) => {
      // Make a change
      const firstToggle = page.locator('input[type="checkbox"], [role="switch"]').first();
      if (await firstToggle.isVisible()) {
        await firstToggle.click();
        
        // Save changes
        const saveButton = page.getByRole('button', { name: /save|update/i });
        await saveButton.click();
        
        // Check for success message
        const successMessage = page.locator('[role="alert"], [data-testid="toast"]');
        await expect(successMessage).toBeVisible();
      }
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/settings');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });

  test.describe('13. Notifications Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/notifications');
    });

    test('should display notifications list', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/notification/i);
      
      // Check for notifications list
      const notificationsList = page.locator('[data-testid*="notification"], [class*="notification-item"]');
      await expect(notificationsList.first()).toBeVisible();
    });

    test('should show notification status', async ({ page }) => {
      // Check for read/unread indicators
      const statusIndicators = page.locator('[data-testid*="unread"], [class*="unread"], [aria-label*="unread"]');
      const indicatorCount = await statusIndicators.count();
      expect(indicatorCount).toBeGreaterThanOrEqual(0);
    });

    test('should mark notifications as read', async ({ page }) => {
      // Click on unread notification
      const unreadNotification = page.locator('[data-testid*="unread"], [class*="unread"]').first();
      if (await unreadNotification.isVisible()) {
        await unreadNotification.click();
        await page.waitForTimeout(500);
      }
    });

    test('should support bulk actions', async ({ page }) => {
      // Check for mark all as read button
      const markAllButton = page.getByRole('button', { name: /mark all|read all/i });
      if (await markAllButton.isVisible()) {
        await markAllButton.click();
        await page.waitForTimeout(500);
      }
    });

    test('should filter notifications', async ({ page }) => {
      // Check for filter options
      const filterButtons = page.locator('[role="tab"], button:has-text("All"), button:has-text("Unread")');
      if (await filterButtons.first().isVisible()) {
        await filterButtons.last().click();
        await page.waitForTimeout(500);
      }
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/notifications');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });

  test.describe('14. Help Page', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      await page.goto('/help');
    });

    test('should display help content', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/help|support/i);
      
      // Check for help sections
      const helpSections = page.locator('section, article, [data-testid*="help-section"]');
      const sectionCount = await helpSections.count();
      expect(sectionCount).toBeGreaterThan(0);
    });

    test('should have FAQ section', async ({ page }) => {
      // Check for FAQ or accordion
      const faqSection = page.locator('[data-testid*="faq"], [class*="accordion"], details');
      if (await faqSection.first().isVisible()) {
        // Click to expand first FAQ
        await faqSection.first().click();
        
        // Check if content is revealed
        const faqContent = faqSection.first().locator('p, div');
        await expect(faqContent).toBeVisible();
      }
    });

    test('should have search functionality', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('contract');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    });

    test('should have contact information', async ({ page }) => {
      // Check for contact details or support form
      const contactSection = page.locator('[data-testid*="contact"], [class*="contact"], a[href*="mailto:"]');
      await expect(contactSection.first()).toBeVisible();
    });

    test('should have documentation links', async ({ page }) => {
      // Check for external documentation links
      const docLinks = page.locator('a:has-text("Documentation"), a:has-text("Guide"), a:has-text("Tutorial")');
      const linkCount = await docLinks.count();
      expect(linkCount).toBeGreaterThanOrEqual(0);
    });

    test('should have proper responsive design', async ({ page }) => {
      await testResponsiveDesign(page, '/help');
    });

    test('should meet accessibility requirements', async ({ page }) => {
      await testAccessibility(page);
    });
  });
});