import { Page, Locator, expect } from '@playwright/test';
import { TestUserData, TestContractData } from './test-data';

export class BasePage {
  constructor(public page: Page) {}

  async goto(path = '') {
    await this.page.goto(path);
  }

  async waitForLoadingToComplete() {
    // Wait for loading spinners to disappear
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { 
      state: 'detached', 
      timeout: 30000 
    }).catch(() => {
      // Ignore if no loading spinner found
    });
  }

  async dismissToasts() {
    // Dismiss any toast notifications that might interfere with tests
    const toasts = this.page.locator('[data-testid="toast"]');
    const count = await toasts.count();
    for (let i = 0; i < count; i++) {
      const closeButton = toasts.nth(i).locator('[data-testid="toast-close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  }
}

export class LandingPage extends BasePage {
  readonly loginButton: Locator;
  readonly signUpButton: Locator;
  readonly heroHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.loginButton = page.getByRole('link', { name: /sign in|login/i });
    this.signUpButton = page.getByRole('link', { name: /sign up|get started/i });
    this.heroHeading = page.getByRole('heading', { level: 1 });
  }

  async clickLogin() {
    await this.loginButton.click();
  }

  async clickSignUp() {
    await this.signUpButton.click();
  }
}

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly registerLink: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.loginButton = page.getByRole('button', { name: /sign in|login/i });
    this.registerLink = page.getByRole('link', { name: /sign up|register/i });
    this.errorMessage = page.getByRole('alert');
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
  }

  async login(userData: TestUserData) {
    await this.emailInput.fill(userData.email);
    await this.passwordInput.fill(userData.password);
    await this.loginButton.click();
    await this.waitForLoadingToComplete();
  }

  async expectError(message?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }
}

export class RegisterPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly fullNameInput: Locator;
  readonly companyNameInput: Locator;
  readonly registerButton: Locator;
  readonly loginLink: Locator;
  readonly termsCheckbox: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/^password/i);
    this.confirmPasswordInput = page.getByLabel(/confirm password/i);
    this.fullNameInput = page.getByLabel(/full name|name/i);
    this.companyNameInput = page.getByLabel(/company/i);
    this.registerButton = page.getByRole('button', { name: /sign up|register/i });
    this.loginLink = page.getByRole('link', { name: /sign in|login/i });
    this.termsCheckbox = page.getByLabel(/terms/i);
  }

  async register(userData: TestUserData) {
    await this.fullNameInput.fill(userData.full_name);
    await this.emailInput.fill(userData.email);
    await this.passwordInput.fill(userData.password);
    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(userData.password);
    }
    if (userData.company_name && await this.companyNameInput.isVisible()) {
      await this.companyNameInput.fill(userData.company_name);
    }
    if (await this.termsCheckbox.isVisible()) {
      await this.termsCheckbox.check();
    }
    await this.registerButton.click();
    await this.waitForLoadingToComplete();
  }
}

export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly contractsCard: Locator;
  readonly analyticsCard: Locator;
  readonly recentContractsSection: Locator;
  readonly createContractButton: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.getByText(/welcome|dashboard/i);
    this.contractsCard = page.getByTestId('contracts-card');
    this.analyticsCard = page.getByTestId('analytics-card');
    this.recentContractsSection = page.getByTestId('recent-contracts');
    this.createContractButton = page.getByRole('button', { name: /create contract/i });
  }

  async clickCreateContract() {
    await this.createContractButton.click();
  }

  async navigateToContracts() {
    await this.contractsCard.click();
  }

  async navigateToAnalytics() {
    await this.analyticsCard.click();
  }
}

export class ContractsPage extends BasePage {
  readonly contractsList: Locator;
  readonly createContractButton: Locator;
  readonly searchInput: Locator;
  readonly filterDropdown: Locator;
  readonly contractRow: Locator;
  readonly paginationNav: Locator;

  constructor(page: Page) {
    super(page);
    this.contractsList = page.getByTestId('contracts-list');
    this.createContractButton = page.getByRole('button', { name: /create|new contract/i });
    this.searchInput = page.getByPlaceholder(/search contracts/i);
    this.filterDropdown = page.getByLabel(/filter by/i);
    this.contractRow = page.getByTestId('contract-row');
    this.paginationNav = page.getByTestId('pagination');
  }

  async createNewContract() {
    await this.createContractButton.click();
  }

  async searchContracts(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForLoadingToComplete();
  }

  async filterByStatus(status: string) {
    await this.filterDropdown.click();
    await this.page.getByText(status).click();
    await this.waitForLoadingToComplete();
  }

  async clickContract(index = 0) {
    await this.contractRow.nth(index).click();
  }

  async expectContractsVisible() {
    await expect(this.contractsList).toBeVisible();
  }
}

export class ContractCreatePage extends BasePage {
  readonly titleInput: Locator;
  readonly contractTypeSelect: Locator;
  readonly plainEnglishTextarea: Locator;
  readonly clientNameInput: Locator;
  readonly clientEmailInput: Locator;
  readonly contractValueInput: Locator;
  readonly currencySelect: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly templateSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.titleInput = page.getByLabel(/title/i);
    this.contractTypeSelect = page.getByLabel(/contract type/i);
    this.plainEnglishTextarea = page.getByLabel(/plain english|description/i);
    this.clientNameInput = page.getByLabel(/client name/i);
    this.clientEmailInput = page.getByLabel(/client email/i);
    this.contractValueInput = page.getByLabel(/contract value|value/i);
    this.currencySelect = page.getByLabel(/currency/i);
    this.startDateInput = page.getByLabel(/start date/i);
    this.endDateInput = page.getByLabel(/end date/i);
    this.createButton = page.getByRole('button', { name: /create|save/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.templateSelect = page.getByLabel(/template/i);
  }

  async createContract(contractData: TestContractData) {
    await this.titleInput.fill(contractData.title);
    
    // Select contract type
    await this.contractTypeSelect.click();
    await this.page.getByText(contractData.contract_type.replace('_', ' '), { exact: false }).click();
    
    await this.plainEnglishTextarea.fill(contractData.plain_english_input);
    
    if (contractData.client_name) {
      await this.clientNameInput.fill(contractData.client_name);
    }
    
    if (contractData.client_email) {
      await this.clientEmailInput.fill(contractData.client_email);
    }
    
    if (contractData.contract_value) {
      await this.contractValueInput.fill(contractData.contract_value.toString());
    }
    
    if (contractData.currency) {
      await this.currencySelect.click();
      await this.page.getByText(contractData.currency).click();
    }
    
    if (contractData.start_date) {
      await this.startDateInput.fill(contractData.start_date);
    }
    
    if (contractData.end_date) {
      await this.endDateInput.fill(contractData.end_date);
    }
    
    await this.createButton.click();
    await this.waitForLoadingToComplete();
  }
}

export class ContractViewPage extends BasePage {
  readonly contractTitle: Locator;
  readonly contractStatus: Locator;
  readonly generateButton: Locator;
  readonly analyzeButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly generatedContent: Locator;
  readonly complianceScore: Locator;
  readonly downloadButton: Locator;

  constructor(page: Page) {
    super(page);
    this.contractTitle = page.getByTestId('contract-title');
    this.contractStatus = page.getByTestId('contract-status');
    this.generateButton = page.getByRole('button', { name: /generate/i });
    this.analyzeButton = page.getByRole('button', { name: /analyze/i });
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.generatedContent = page.getByTestId('generated-content');
    this.complianceScore = page.getByTestId('compliance-score');
    this.downloadButton = page.getByRole('button', { name: /download/i });
  }

  async generateContent() {
    await this.generateButton.click();
    await this.waitForLoadingToComplete();
  }

  async analyzeCompliance() {
    await this.analyzeButton.click();
    await this.waitForLoadingToComplete();
  }

  async expectContentGenerated() {
    await expect(this.generatedContent).toBeVisible();
    await expect(this.generatedContent).not.toBeEmpty();
  }

  async expectComplianceScore() {
    await expect(this.complianceScore).toBeVisible();
  }
}

export class AnalyticsPage extends BasePage {
  readonly dashboardMetrics: Locator;
  readonly contractsChart: Locator;
  readonly complianceChart: Locator;
  readonly valueChart: Locator;
  readonly exportButton: Locator;
  readonly dateRangeSelector: Locator;

  constructor(page: Page) {
    super(page);
    this.dashboardMetrics = page.getByTestId('dashboard-metrics');
    this.contractsChart = page.getByTestId('contracts-chart');
    this.complianceChart = page.getByTestId('compliance-chart');
    this.valueChart = page.getByTestId('value-chart');
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.dateRangeSelector = page.getByTestId('date-range-selector');
  }

  async expectMetricsVisible() {
    await expect(this.dashboardMetrics).toBeVisible();
  }

  async selectDateRange(range: string) {
    await this.dateRangeSelector.click();
    await this.page.getByText(range).click();
    await this.waitForLoadingToComplete();
  }
}

export class AppLayout extends BasePage {
  readonly sidebar: Locator;
  readonly header: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly navigationLinks: Locator;
  readonly commandPaletteButton: Locator;
  readonly themeToggle: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebar = page.getByTestId('sidebar');
    this.header = page.getByTestId('header');
    this.userMenu = page.getByTestId('user-menu');
    this.logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    this.navigationLinks = page.getByRole('navigation').getByRole('link');
    this.commandPaletteButton = page.getByLabel('Command palette');
    this.themeToggle = page.getByLabel('Toggle theme');
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
    await this.waitForLoadingToComplete();
  }

  async navigateTo(section: string) {
    await this.page.getByRole('link', { name: section, exact: false }).click();
    await this.waitForLoadingToComplete();
  }

  async openCommandPalette() {
    // Use keyboard shortcut
    await this.page.keyboard.press('Meta+k');
  }

  async toggleTheme() {
    await this.themeToggle.click();
  }
}

export class CommandPalette extends BasePage {
  readonly searchInput: Locator;
  readonly resultsList: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder(/search commands/i);
    this.resultsList = page.getByTestId('command-results');
    this.closeButton = page.getByLabel('Close command palette');
  }

  async searchFor(query: string) {
    await this.searchInput.fill(query);
  }

  async selectCommand(index = 0) {
    const results = this.resultsList.locator('[data-testid="command-result"]');
    await results.nth(index).click();
  }

  async close() {
    await this.page.keyboard.press('Escape');
  }
}