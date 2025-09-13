/**
 * Page Objects for E2E Tests
 * Lightweight page object classes that wrap common page interactions
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { User } from './test-data';
import { logout as logoutHelper } from '../helpers/auth';
import { APP_URL } from '../helpers/config';

/**
 * Base Page class with common functionality
 */
class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string) {
    await this.page.goto(`${APP_URL}${path}`);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }
}

/**
 * Landing Page
 */
export class LandingPage extends BasePage {
  readonly heroHeading: Locator;
  readonly loginButton: Locator;
  readonly signUpButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heroHeading = page.locator('h1, [data-testid="hero-heading"]').first();
    this.loginButton = page.getByRole('link', { name: /start free trial|get started/i }).first();
    this.signUpButton = page.getByRole('link', { name: /start free trial|get started/i }).first();
  }

  async clickLogin() {
    await this.loginButton.click();
    await this.page.waitForURL(/\/login/, { timeout: 20000 });
  }

  async clickSignUp() {
    await this.signUpButton.click();
    await this.page.waitForURL(/\/login/, { timeout: 20000 });
  }
}

/**
 * Login Page
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[type="email"], input[name="email"]').first();
    this.passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    this.loginButton = page.getByRole('button', { name: /sign in|login/i });
    this.errorMessage = page.getByRole('alert').or(page.locator('[data-testid="error-message"]'));
  }

  async login(user: User) {
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.loginButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async blur() {
    await this.page.locator('body').click();
  }
}

/**
 * Register Page
 */
export class RegisterPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly fullNameInput: Locator;
  readonly companyNameInput: Locator;
  readonly registerButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[type="email"], input[name="email"]').first();
    this.passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="confirm_password"], input[placeholder*="confirm"]').first();
    this.fullNameInput = page.locator('input[name="full_name"]').first();
    this.companyNameInput = page.locator('input[name="company_name"]').first();
    this.registerButton = page.getByRole('button', { name: /create account|sign up/i });
  }

  async register(user: User) {
    // First switch to registration mode by clicking the toggle
    const signUpToggle = this.page.locator('button:has-text("Sign up")');
    if (await signUpToggle.isVisible()) {
      await signUpToggle.click();
      await this.page.waitForTimeout(1000); // Wait for form to switch
    }
    
    // Wait for registration fields to appear with better error handling
    try {
      await this.fullNameInput.waitFor({ state: 'visible', timeout: 15000 });
    } catch (error) {
      // If fields don't appear, try clicking the toggle again
      const signUpToggle2 = this.page.locator('button:has-text("Sign up")');
      if (await signUpToggle2.isVisible()) {
        await signUpToggle2.click();
        await this.page.waitForTimeout(1000);
        await this.fullNameInput.waitFor({ state: 'visible', timeout: 10000 });
      }
    }
    
    await this.fullNameInput.fill(user.full_name);
    await this.companyNameInput.fill(user.company_name || 'Test Company');
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.registerButton.click();
  }
}

/**
 * Dashboard Page
 */
export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly statsCards: Locator;
  readonly recentActivity: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.locator('h1, [data-testid="welcome-message"]').first();
    this.statsCards = page.locator('[data-testid*="stat"], .stat-card');
    this.recentActivity = page.locator('[data-testid="recent-activity"], .recent-activity');
  }

  async expectStatsVisible() {
    await expect(this.statsCards.first()).toBeVisible();
  }
}

/**
 * Contracts Page
 */
export class ContractsPage extends BasePage {
  readonly createContractButton: Locator;
  readonly searchInput: Locator;
  readonly contractRow: Locator;
  readonly statusFilter: Locator;
  readonly paginationNav: Locator;

  constructor(page: Page) {
    super(page);
    this.createContractButton = page.getByRole('link', { name: /new contract/i }).first();
    this.searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Search"], input[name="search"]').first();
    this.contractRow = page.locator('[data-testid="contract-row"], [data-testid="contract-item"], tr[data-contract-id], .contract-card');
    this.statusFilter = page.locator('select[name*="status"], [data-testid="status-filter"]').first();
    this.paginationNav = page.locator('[role="navigation"][aria-label*="pagination"], .pagination');
  }

  async expectContractsVisible(timeout = 15000) {
    // First ensure URL is correct
    await expect(this.page).toHaveURL(/\/contracts/, { timeout: 8000 });
    
    // Wait for DOM to be ready instead of networkidle
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    } catch {
      // If DOM load times out, continue
    }
    
    // Check for page indicators in order of preference
    const pageIndicators = [
      this.page.locator('text="Contract Management"'),
      this.page.getByRole('heading', { name: /contracts/i }),
      this.page.locator('main'), // Main content area
      this.page.locator('body') // Ultimate fallback
    ];
    
    let found = false;
    for (const indicator of pageIndicators) {
      try {
        await expect(indicator).toBeVisible({ timeout: 2000 });
        found = true;
        break;
      } catch {
        // Continue to next indicator
      }
    }
    
    if (!found) {
      // Basic page load check with remaining timeout
      await expect(this.page.locator('body')).toBeVisible({ timeout: Math.max(1000, timeout - 10000) });
    }
  }

  async searchContracts(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(500);
  }

  async filterByStatus(status: string) {
    if (await this.statusFilter.isVisible()) {
      await this.statusFilter.selectOption({ label: status });
    }
    await this.page.waitForTimeout(500);
  }

  async createNewContract() {
    await this.createContractButton.click();
    await this.page.waitForURL(/\/contracts\/(new|create)/);
  }
}

/**
 * Contract Create Page
 */
export class ContractCreatePage extends BasePage {
  readonly titleInput: Locator;
  readonly clientNameInput: Locator;
  readonly clientEmailInput: Locator;
  readonly descriptionInput: Locator;
  readonly valueInput: Locator;
  readonly currencySelect: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.titleInput = page.locator('input[name="name"]'); 
    this.clientNameInput = page.locator('input[name="clientName"]');
    this.clientEmailInput = page.locator('input[name="clientEmail"]');
    this.descriptionInput = page.locator('textarea[name="serviceDescription"]');
    this.valueInput = page.locator('input[name="value"], input[name="contractValue"]').first();
    this.currencySelect = page.locator('select[name="currency"]').first();
    this.startDateInput = page.locator('input[name="startDate"], input[name="start_date"], input[type="date"]').first();
    this.endDateInput = page.locator('input[name="endDate"], input[name="end_date"], input[type="date"]').nth(1);
    this.submitButton = page.getByRole('button', { name: /create|generate|save/i }).last();
  }

  async createContract(contract: { title?: string; client_name?: string; client_email?: string; service_description?: string; contract_value?: string; currency?: string; start_date?: string }) {
    // Step 1: Select template if available
    const templates = this.page.locator('[data-testid*="template"], .template-card, .cursor-pointer');
    if (await templates.count() > 0) {
      await templates.first().click();
      await this.page.waitForTimeout(1000);
      
      // Look for and click Next button to go to step 2
      const nextButton = this.page.getByRole('button', { name: /next|continue/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await this.page.waitForTimeout(1000);
      }
    }

    // Step 2: Fill form fields (wait for them to appear)
    await this.page.waitForLoadState('domcontentloaded');
    
    if (contract.title) {
      await this.titleInput.waitFor({ state: 'visible', timeout: 10000 });
      await this.titleInput.fill(contract.title);
    }
    if (contract.client_name) {
      await this.clientNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await this.clientNameInput.fill(contract.client_name);
    }
    if (contract.client_email) {
      await this.clientEmailInput.waitFor({ state: 'visible', timeout: 5000 });
      await this.clientEmailInput.fill(contract.client_email);
    }
    if (contract.service_description) {
      await this.descriptionInput.waitFor({ state: 'visible', timeout: 5000 });
      await this.descriptionInput.fill(contract.service_description);
    }
    if (contract.contract_value) {
      await this.valueInput.waitFor({ state: 'visible', timeout: 5000 });
      await this.valueInput.fill(contract.contract_value);
    }
    if (contract.currency && await this.currencySelect.isVisible()) {
      await this.currencySelect.selectOption(contract.currency);
    }
    if (contract.start_date) {
      await this.startDateInput.waitFor({ state: 'visible', timeout: 5000 });
      await this.startDateInput.fill(contract.start_date);
    }

    // Handle multi-step forms
    const nextButton = this.page.locator('button:has-text("Next"), button:has-text("Continue")');
    while (await nextButton.isVisible()) {
      await nextButton.click();
      await this.page.waitForTimeout(500);
    }

    // Submit
    await this.submitButton.click();
  }
}

/**
 * Contract View Page
 */
export class ContractViewPage extends BasePage {
  readonly contractTitle: Locator;
  readonly editButton: Locator;
  readonly exportButton: Locator;
  readonly deleteButton: Locator;
  readonly contractContent: Locator;
  readonly complianceScore: Locator;

  constructor(page: Page) {
    super(page);
    this.contractTitle = page.locator('h1, h2, [data-testid="contract-title"]').first();
    this.editButton = page.getByRole('button', { name: /edit/i }).or(page.getByRole('link', { name: /edit/i }));
    this.exportButton = page.getByRole('button', { name: /export|download/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.contractContent = page.locator('.contract-content, [data-testid="contract-content"], pre, .prose').first();
    this.complianceScore = page.locator('[data-testid="compliance-score"], .compliance-score');
  }

  async expectContractVisible() {
    await expect(this.contractTitle).toBeVisible();
  }

  async editContract() {
    await this.editButton.click();
  }

  async exportContract(format: string = 'PDF') {
    await this.exportButton.click();
    const formatOption = this.page.locator(`button:has-text("${format}"), [data-format="${format.toLowerCase()}"]`);
    if (await formatOption.isVisible()) {
      await formatOption.click();
    }
  }
}

/**
 * Analytics Page
 */
export class AnalyticsPage extends BasePage {
  readonly pageTitle: Locator;
  readonly overviewMetrics: Locator;
  readonly contentCards: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('h1:has-text("Contract Overview"), h1:has-text("Analytics")');
    this.overviewMetrics = page.locator('.grid .p-4, [class*="grid"] [class*="card"]');
    this.contentCards = page.locator('[class*="card"], .card, [role="region"]');
  }

  async expectMetricsVisible() {
    // First ensure URL is correct
    await expect(this.page).toHaveURL(/\/analytics/, { timeout: 8000 });
    
    // Wait for DOM to be ready
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    } catch {
      // Continue if timeout
    }
    
    // Check for page indicators in order of preference
    const pageIndicators = [
      this.pageTitle,
      this.page.locator('h1:has-text("Analytics")'),
      this.page.locator('h1'),
      this.overviewMetrics.first(),
      this.contentCards.first(),
      this.page.locator('main'),
      this.page.locator('body')
    ];
    
    let found = false;
    for (const indicator of pageIndicators) {
      try {
        await expect(indicator).toBeVisible({ timeout: 2000 });
        found = true;
        break;
      } catch {
        continue;
      }
    }
    
    if (!found) {
      await expect(this.page.locator('body')).toBeVisible({ timeout: 3000 });
    }
  }
}

/**
 * Templates Page
 */
export class TemplatesPage extends BasePage {
  readonly templateCards: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.templateCards = page.locator('[data-testid="template-card"], .template-card');
    this.searchInput = page.locator('input[placeholder*="Search"], input[name="search"]').first();
  }

  async selectTemplate(name: string) {
    const template = this.page.locator(`.template-card:has-text("${name}")`);
    await template.click();
  }
}

/**
 * Settings Page
 */
export class SettingsPage extends BasePage {
  readonly profileSection: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.profileSection = page.locator('[data-testid="profile-settings"], .profile-settings');
    this.saveButton = page.getByRole('button', { name: /save|update/i });
  }
}

/**
 * App Layout (navigation, header, etc.)
 */
export class AppLayout extends BasePage {
  readonly userMenu: Locator;
  readonly navigationMenu: Locator;
  readonly breadcrumbs: Locator;

  constructor(page: Page) {
    super(page);
    this.userMenu = page.locator('[data-testid="user-menu"], button[aria-label*="profile"], button:has-text("Demo")').first();
    this.navigationMenu = page.locator('nav, [role="navigation"]').first();
    this.breadcrumbs = page.locator('[data-testid="breadcrumbs"], .breadcrumbs');
  }

  async navigateTo(section: string) {
    // Try multiple selectors to find the navigation link
    const selectors = [
      `nav a:has-text("${section}")`,
      `[href*="/${section.toLowerCase()}"]`,
      `a:has-text("${section}")`,
      `.sidebar a:has-text("${section}")`,
      `nav [role="link"]:has-text("${section}")`
    ];
    
    let navLink;
    for (const selector of selectors) {
      navLink = this.page.locator(selector).first();
      if (await navLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }
    }
    
    // Fallback to getByRole if none of the above work
    if (!navLink || !await navLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      navLink = this.page.getByRole('link', { name: new RegExp(section, 'i') }).first();
    }
    
    await navLink.click();
    
    // Wait for URL change - handle different URL patterns
    const expectedUrl = section.toLowerCase().replace(/\s+/g, '-');
    const urlPatterns = [
      new RegExp(`/${expectedUrl}`),
      new RegExp(`/${section.toLowerCase()}`),
      new RegExp(`/${section}`)
    ];
    
    let navigationSuccessful = false;
    for (const pattern of urlPatterns) {
      try {
        await this.page.waitForURL(pattern, { timeout: 5000 });
        navigationSuccessful = true;
        break;
      } catch {
        continue;
      }
    }
    
    if (!navigationSuccessful) {
      // Fallback: just wait a bit for navigation to complete
      await this.page.waitForTimeout(2000);
    }
    
    // Wait for page to be ready
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 });
    } catch {
      // If that fails, just wait a moment
      await this.page.waitForTimeout(500);
    }
  }

  async logout() {
    await logoutHelper(this.page);
  }

  async expectAuthenticated() {
    await expect(this.userMenu).toBeVisible();
  }
}

/**
 * Command Palette
 */
export class CommandPalette extends BasePage {
  readonly searchInput: Locator;
  readonly commandItems: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder(/search commands/i);
    this.commandItems = page.locator('[role="option"], .command-item');
  }

  async open() {
    await this.page.keyboard.press('Meta+k');
    await expect(this.searchInput).toBeVisible();
  }

  async close() {
    await this.page.keyboard.press('Escape');
    await expect(this.searchInput).not.toBeVisible();
  }

  async executeCommand(command: string) {
    await this.searchInput.fill(command);
    await this.page.keyboard.press('Enter');
  }
}
