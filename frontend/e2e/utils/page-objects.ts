/**
 * Page Objects for E2E Tests
 * Lightweight page object classes that wrap common page interactions
 */

import { Page, Locator, expect } from '@playwright/test';
import { User } from './test-data';
import { loginWithCredentials, logout as logoutHelper } from '../helpers/auth';
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
    await this.page.waitForLoadState('networkidle');
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
    this.loginButton = page.getByRole('link', { name: /sign in|login/i }).or(page.getByRole('button', { name: /sign in|login/i }));
    this.signUpButton = page.getByRole('link', { name: /sign up|register|get started/i }).or(page.getByRole('button', { name: /sign up|register|get started/i }));
  }

  async clickLogin() {
    await this.loginButton.click();
    await this.page.waitForURL(/\/login/);
  }

  async clickSignUp() {
    await this.signUpButton.click();
    await this.page.waitForURL(/\/register/);
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
    this.fullNameInput = page.locator('input[name="fullName"], input[name="full_name"], input[name="name"]').first();
    this.companyNameInput = page.locator('input[name="companyName"], input[name="company_name"], input[name="company"]').first();
    this.registerButton = page.getByRole('button', { name: /sign up|register|create account/i });
  }

  async register(user: User) {
    await this.fullNameInput.fill(user.full_name);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    if (user.company_name) {
      await this.companyNameInput.fill(user.company_name);
    }
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
    this.createContractButton = page.getByRole('button', { name: /new contract|create contract/i }).or(page.getByRole('link', { name: /new contract|create contract/i }));
    this.searchInput = page.locator('input[placeholder*="Search"], input[name="search"]').first();
    this.contractRow = page.locator('[data-testid="contract-item"], tr[data-contract-id], .contract-card');
    this.statusFilter = page.locator('select[name*="status"], [data-testid="status-filter"]').first();
    this.paginationNav = page.locator('[role="navigation"][aria-label*="pagination"], .pagination');
  }

  async expectContractsVisible() {
    const contracts = this.contractRow;
    const emptyState = this.page.locator('text=/No contracts|Empty/');
    await expect(contracts.first().or(emptyState)).toBeVisible();
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
    this.titleInput = page.locator('input[name="title"], input[name="name"], input[name="contractTitle"]').first();
    this.clientNameInput = page.locator('input[name="clientName"], input[name="client_name"]').first();
    this.clientEmailInput = page.locator('input[name="clientEmail"], input[name="client_email"]').first();
    this.descriptionInput = page.locator('textarea[name="description"], textarea[name="serviceDescription"], textarea').first();
    this.valueInput = page.locator('input[name="value"], input[name="contractValue"]').first();
    this.currencySelect = page.locator('select[name="currency"]').first();
    this.startDateInput = page.locator('input[name="startDate"], input[name="start_date"], input[type="date"]').first();
    this.endDateInput = page.locator('input[name="endDate"], input[name="end_date"], input[type="date"]').nth(1);
    this.submitButton = page.getByRole('button', { name: /create|generate|save/i }).last();
  }

  async createContract(contract: any) {
    // Select template if available
    const templates = this.page.locator('[data-testid*="template"], .template-card');
    if (await templates.count() > 0) {
      await templates.first().click();
      await this.page.waitForTimeout(500);
    }

    // Fill form fields
    if (contract.title) await this.titleInput.fill(contract.title);
    if (contract.client_name) await this.clientNameInput.fill(contract.client_name);
    if (contract.client_email) await this.clientEmailInput.fill(contract.client_email);
    if (contract.service_description) await this.descriptionInput.fill(contract.service_description);
    if (contract.contract_value) await this.valueInput.fill(contract.contract_value);
    if (contract.currency && await this.currencySelect.isVisible()) {
      await this.currencySelect.selectOption(contract.currency);
    }
    if (contract.start_date) await this.startDateInput.fill(contract.start_date);
    if (contract.end_date) await this.endDateInput.fill(contract.end_date);

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
  readonly metricsSection: Locator;
  readonly chartsSection: Locator;

  constructor(page: Page) {
    super(page);
    this.metricsSection = page.locator('[data-testid="metrics"], .metrics-section');
    this.chartsSection = page.locator('[data-testid="charts"], .charts-section, canvas');
  }

  async expectMetricsVisible() {
    const metrics = this.metricsSection;
    const charts = this.chartsSection;
    await expect(metrics.or(charts).first()).toBeVisible();
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
    const navLink = this.page.getByRole('link', { name: new RegExp(section, 'i') });
    await navLink.click();
    await this.page.waitForLoadState('networkidle');
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
