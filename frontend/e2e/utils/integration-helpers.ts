import { Page, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * INTEGRATION TEST UTILITIES
 * 
 * Helper functions and utilities for validating frontend-backend integration
 * in E2E tests. These utilities ensure consistent testing patterns and 
 * comprehensive validation across all integration tests.
 */

export interface ApiRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
}

export interface ApiResponse {
  status: number;
  body: any;
  headers: Record<string, string>;
  timestamp: number;
}

export interface TestUser {
  email: string;
  password: string;
  full_name: string;
  company_name?: string;
  role?: string;
}

export interface TestContract {
  title: string;
  contract_type: string;
  plain_english_input: string;
  client_name: string;
  client_email?: string;
  contract_value?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * API Integration Validation Utilities
 */
export class ApiValidator {
  private page: Page;
  private requests: ApiRequest[] = [];
  private responses: ApiResponse[] = [];

  constructor(page: Page) {
    this.page = page;
    this.setupRequestTracking();
  }

  private setupRequestTracking() {
    this.page.on('request', request => {
      if (request.url().includes('/api/v1/')) {
        this.requests.push({
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
          body: request.postData() ? JSON.parse(request.postData()!) : null,
          timestamp: Date.now()
        });
      }
    });

    this.page.on('response', async response => {
      if (response.url().includes('/api/v1/')) {
        let body;
        try {
          body = await response.json();
        } catch {
          body = await response.text();
        }

        this.responses.push({
          status: response.status(),
          body,
          headers: response.headers(),
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Validate that a specific API endpoint was called
   */
  async expectApiCall(method: string, endpoint: string) {
    const matchingRequest = this.requests.find(req => 
      req.method === method && req.url.includes(endpoint)
    );
    expect(matchingRequest).toBeTruthy();
    return matchingRequest;
  }

  /**
   * Validate API response structure and status
   */
  async expectApiResponse(endpoint: string, expectedStatus: number, expectedFields?: string[]) {
    const matchingResponse = this.responses.find(res => 
      res.status === expectedStatus && 
      this.requests.some(req => req.url.includes(endpoint))
    );
    
    expect(matchingResponse).toBeTruthy();
    
    if (expectedFields && typeof matchingResponse!.body === 'object') {
      for (const field of expectedFields) {
        expect(matchingResponse!.body).toHaveProperty(field);
      }
    }
    
    return matchingResponse;
  }

  /**
   * Validate authentication headers are present
   */
  expectAuthenticationHeaders(request: ApiRequest) {
    expect(request.headers.authorization).toBeDefined();
    expect(request.headers.authorization).toMatch(/Bearer .+/);
  }

  /**
   * Validate request-response timing
   */
  expectResponseTime(maxMs: number) {
    const requestResponsePairs = this.requests.map(req => {
      const response = this.responses.find(res => 
        Math.abs(res.timestamp - req.timestamp) < 10000 // 10s window
      );
      return { request: req, response, duration: response ? response.timestamp - req.timestamp : null };
    });

    requestResponsePairs.forEach(pair => {
      if (pair.duration !== null) {
        expect(pair.duration).toBeLessThan(maxMs);
      }
    });
  }

  /**
   * Get all API calls for a specific endpoint
   */
  getApiCallsForEndpoint(endpoint: string): ApiRequest[] {
    return this.requests.filter(req => req.url.includes(endpoint));
  }

  /**
   * Clear tracking history
   */
  clearHistory() {
    this.requests = [];
    this.responses = [];
  }
}

/**
 * Authentication Helper
 */
export class AuthenticationHelper {
  constructor(private page: Page) {}

  /**
   * Set up authenticated user session
   */
  async setupAuthenticatedUser(user: TestUser) {
    await this.page.addInitScript((userData) => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: `user-${Date.now()}`, 
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role || 'USER',
            company_id: `company-${Date.now()}`
          },
          token: `test-token-${Date.now()}`
        }
      }));
    }, user);
  }

  /**
   * Perform login flow and validate
   */
  async performLogin(user: TestUser): Promise<void> {
    await this.page.goto('/login');
    
    await this.page.getByLabel(/email/i).fill(user.email);
    await this.page.getByLabel(/password/i).fill(user.password);
    
    const loginResponse = this.page.waitForResponse(response => 
      response.url().includes('/auth/login') && response.status() === 200
    );
    
    await this.page.getByRole('button', { name: /login|sign in/i }).click();
    
    await loginResponse;
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  /**
   * Validate authentication state
   */
  async expectAuthenticatedState() {
    const authStorage = await this.page.evaluate(() => 
      localStorage.getItem('auth-storage')
    );
    
    expect(authStorage).toBeTruthy();
    const authData = JSON.parse(authStorage);
    expect(authData.state.user).toBeDefined();
    expect(authData.state.token).toBeDefined();
  }

  /**
   * Clear authentication
   */
  async clearAuthentication() {
    await this.page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      sessionStorage.clear();
    });
  }
}

/**
 * Contract Data Helper
 */
export class ContractDataHelper {
  constructor(private page: Page) {}

  /**
   * Generate test contract data
   */
  generateContractData(type: 'SERVICE_AGREEMENT' | 'EMPLOYMENT_CONTRACT' | 'NDA' = 'SERVICE_AGREEMENT'): TestContract {
    const base = {
      title: `${faker.company.buzzPhrase()} Contract`,
      contract_type: type,
      client_name: faker.company.name(),
      client_email: faker.internet.email(),
      contract_value: faker.number.int({ min: 5000, max: 100000 }),
      currency: 'GBP',
      start_date: faker.date.future().toISOString().split('T')[0],
      end_date: faker.date.future().toISOString().split('T')[0]
    };

    switch (type) {
      case 'SERVICE_AGREEMENT':
        return {
          ...base,
          plain_english_input: `Create a service agreement between ${base.client_name} and our company for ${faker.company.buzzPhrase().toLowerCase()} services. The contract value is ${base.contract_value} ${base.currency} and should run from ${base.start_date} to ${base.end_date}.`
        };
      case 'EMPLOYMENT_CONTRACT':
        return {
          ...base,
          title: `Employment Contract - ${faker.person.jobTitle()}`,
          plain_english_input: `Create an employment contract for a ${faker.person.jobTitle()} position with ${base.client_name}. Annual salary of ${base.contract_value} ${base.currency} starting ${base.start_date}.`
        };
      case 'NDA':
        return {
          ...base,
          title: `Non-Disclosure Agreement - ${faker.company.name()}`,
          plain_english_input: `Create a mutual non-disclosure agreement between our company and ${base.client_name} for potential business collaboration discussions.`
        };
      default:
        return base;
    }
  }

  /**
   * Create contract via API and validate response
   */
  async createContractViaApi(contractData: TestContract): Promise<string> {
    // Mock successful contract creation
    await this.page.route('**/contracts', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          json: {
            id: `contract-${Date.now()}`,
            ...contractData,
            status: 'DRAFT',
            version: 1,
            is_current_version: true,
            created_at: new Date().toISOString()
          }
        });
      }
    });

    await this.page.goto('/contracts/new');
    
    // Fill form
    await this.page.getByLabel(/title/i).fill(contractData.title);
    await this.page.getByLabel(/contract type/i).selectOption(contractData.contract_type);
    await this.page.getByLabel(/plain english|description/i).fill(contractData.plain_english_input);
    
    if (contractData.client_name) {
      await this.page.getByLabel(/client name/i).fill(contractData.client_name);
    }
    
    if (contractData.contract_value) {
      await this.page.getByLabel(/value/i).fill(contractData.contract_value.toString());
    }

    const createResponse = this.page.waitForResponse(response => 
      response.url().includes('/contracts') && response.status() === 201
    );

    await this.page.getByRole('button', { name: /create/i }).click();
    
    const response = await createResponse;
    const createdContract = await response.json();
    
    return createdContract.id;
  }
}

/**
 * WebSocket Testing Helper
 */
export class WebSocketHelper {
  constructor(private page: Page) {}

  /**
   * Set up mock WebSocket for testing
   */
  async setupMockWebSocket() {
    await this.page.addInitScript(() => {
      class MockWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        
        readyState = MockWebSocket.OPEN;
        url: string;
        onopen: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        
        constructor(url: string) {
          this.url = url;
          (window as any).__mockWebSocket = this;
          
          setTimeout(() => {
            if (this.onopen) {
              this.onopen(new Event('open'));
            }
          }, 100);
        }
        
        send(data: string) {
          (window as any).__wsSentMessages = (window as any).__wsSentMessages || [];
          (window as any).__wsSentMessages.push(JSON.parse(data));
        }
        
        close() {
          this.readyState = MockWebSocket.CLOSED;
          if (this.onclose) {
            this.onclose(new CloseEvent('close'));
          }
        }
        
        simulateMessage(data: any) {
          if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
            this.onmessage(new MessageEvent('message', { 
              data: JSON.stringify(data) 
            }));
          }
        }
      }
      
      (window as any).WebSocket = MockWebSocket;
    });
  }

  /**
   * Simulate WebSocket message
   */
  async simulateMessage(messageData: any) {
    await this.page.evaluate((data) => {
      const ws = (window as any).__mockWebSocket;
      if (ws && ws.simulateMessage) {
        ws.simulateMessage(data);
      }
    }, messageData);
  }

  /**
   * Validate WebSocket connection
   */
  async expectWebSocketConnection() {
    await this.page.waitForFunction(() => {
      return (window as any).__mockWebSocket && 
             (window as any).__mockWebSocket.readyState === 1;
    });
  }

  /**
   * Get sent WebSocket messages
   */
  async getSentMessages(): Promise<any[]> {
    return await this.page.evaluate(() => {
      return (window as any).__wsSentMessages || [];
    });
  }
}

/**
 * Performance Testing Helper
 */
export class PerformanceHelper {
  constructor(private page: Page) {}

  /**
   * Measure page load performance
   */
  async measurePageLoad(url: string): Promise<{ loadTime: number; domContentLoaded: number }> {
    const startTime = Date.now();
    
    await this.page.goto(url);
    
    const metrics = await this.page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: perfData.loadEventEnd - perfData.navigationStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart
      };
    });
    
    return metrics;
  }

  /**
   * Measure API response times
   */
  async measureApiResponseTimes(apiValidator: ApiValidator, endpoint: string): Promise<number[]> {
    const calls = apiValidator.getApiCallsForEndpoint(endpoint);
    return calls.map(call => {
      const response = apiValidator['responses'].find(res => 
        Math.abs(res.timestamp - call.timestamp) < 5000
      );
      return response ? response.timestamp - call.timestamp : 0;
    });
  }

  /**
   * Validate performance thresholds
   */
  expectPerformanceThresholds(metrics: { loadTime: number; domContentLoaded: number }) {
    expect(metrics.loadTime).toBeLessThan(3000); // 3 seconds max load time
    expect(metrics.domContentLoaded).toBeLessThan(2000); // 2 seconds max DOM ready
  }
}

/**
 * Error Handling Test Helper
 */
export class ErrorHelper {
  constructor(private page: Page) {}

  /**
   * Simulate API error response
   */
  async simulateApiError(endpoint: string, status: number, errorMessage: string) {
    await this.page.route(`**${endpoint}`, async route => {
      await route.fulfill({
        status,
        json: { detail: errorMessage }
      });
    });
  }

  /**
   * Simulate network error
   */
  async simulateNetworkError(endpoint: string) {
    await this.page.route(`**${endpoint}`, async route => {
      await route.abort('internetdisconnected');
    });
  }

  /**
   * Expect error handling in UI
   */
  async expectErrorHandling(errorText?: string) {
    await expect(this.page.getByRole('alert')).toBeVisible();
    
    if (errorText) {
      await expect(this.page.getByText(new RegExp(errorText, 'i'))).toBeVisible();
    }
  }

  /**
   * Expect retry mechanism
   */
  async expectRetryMechanism() {
    await expect(this.page.getByRole('button', { name: /retry|try again/i })).toBeVisible();
  }
}

/**
 * Data Validation Helper
 */
export class DataValidator {
  /**
   * Validate API response data structure
   */
  static validateApiResponse(response: any, expectedStructure: Record<string, string>) {
    for (const [field, type] of Object.entries(expectedStructure)) {
      expect(response).toHaveProperty(field);
      
      switch (type) {
        case 'string':
          expect(typeof response[field]).toBe('string');
          break;
        case 'number':
          expect(typeof response[field]).toBe('number');
          break;
        case 'boolean':
          expect(typeof response[field]).toBe('boolean');
          break;
        case 'array':
          expect(Array.isArray(response[field])).toBeTruthy();
          break;
        case 'object':
          expect(typeof response[field]).toBe('object');
          expect(response[field]).not.toBeNull();
          break;
        case 'date':
          expect(new Date(response[field]).toString()).not.toBe('Invalid Date');
          break;
      }
    }
  }

  /**
   * Validate contract data structure
   */
  static validateContractStructure(contract: any) {
    this.validateApiResponse(contract, {
      id: 'string',
      title: 'string',
      contract_type: 'string',
      status: 'string',
      version: 'number',
      is_current_version: 'boolean',
      created_at: 'date'
    });
  }

  /**
   * Validate user data structure
   */
  static validateUserStructure(user: any) {
    this.validateApiResponse(user, {
      id: 'string',
      email: 'string',
      full_name: 'string',
      is_active: 'boolean',
      created_at: 'date'
    });
  }
}

/**
 * Test Data Factory
 */
export class TestDataFactory {
  /**
   * Generate test user
   */
  static generateUser(role: string = 'USER'): TestUser {
    return {
      email: `test-${faker.string.uuid()}@pactoria-e2e.com`,
      password: faker.internet.password({ length: 12 }),
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: faker.company.name(),
      role
    };
  }

  /**
   * Generate multiple test users
   */
  static generateUsers(count: number, role: string = 'USER'): TestUser[] {
    return Array.from({ length: count }, () => this.generateUser(role));
  }

  /**
   * Generate test template data
   */
  static generateTemplate(contractType: string = 'SERVICE_AGREEMENT') {
    return {
      name: `${faker.company.buzzPhrase()} Template`,
      category: faker.helpers.arrayElement(['Commercial', 'Employment', 'Legal', 'Technology']),
      contract_type: contractType,
      description: faker.lorem.paragraph(),
      template_content: `Template content for ${contractType} with variables: {{client_name}}, {{contract_value}}, {{start_date}}`,
      compliance_features: faker.helpers.arrayElements(['GDPR Compliant', 'Employment Law Compliant', 'Consumer Rights Compliant']),
      suitable_for: faker.helpers.arrayElements(['Small Business', 'Enterprise', 'Startups'])
    };
  }
}

/**
 * Integration Test Suite Runner
 * Orchestrates multiple integration test scenarios
 */
export class IntegrationTestSuite {
  constructor(
    private page: Page,
    private apiValidator: ApiValidator,
    private authHelper: AuthenticationHelper
  ) {}

  /**
   * Run complete user journey test
   */
  async runCompleteUserJourney(): Promise<void> {
    // 1. User Registration & Login
    const testUser = TestDataFactory.generateUser('ADMIN');
    await this.authHelper.performLogin(testUser);
    await this.authHelper.expectAuthenticatedState();

    // 2. Contract Creation
    const contractHelper = new ContractDataHelper(this.page);
    const contractData = contractHelper.generateContractData('SERVICE_AGREEMENT');
    const contractId = await contractHelper.createContractViaApi(contractData);

    // 3. API Validation
    await this.apiValidator.expectApiCall('POST', '/auth/login');
    await this.apiValidator.expectApiCall('POST', '/contracts');
    await this.apiValidator.expectApiResponse('/contracts', 201, ['id', 'title', 'status']);

    // 4. Performance Validation
    const performanceHelper = new PerformanceHelper(this.page);
    this.apiValidator.expectResponseTime(5000);

    console.log(`✅ Complete user journey test passed for contract: ${contractId}`);
  }

  /**
   * Run error handling test suite
   */
  async runErrorHandlingSuite(): Promise<void> {
    const errorHelper = new ErrorHelper(this.page);

    // Test various error scenarios
    const errorScenarios = [
      { endpoint: '/auth/login', status: 401, message: 'Invalid credentials' },
      { endpoint: '/contracts', status: 400, message: 'Validation failed' },
      { endpoint: '/contracts', status: 500, message: 'Internal server error' }
    ];

    for (const scenario of errorScenarios) {
      await errorHelper.simulateApiError(scenario.endpoint, scenario.status, scenario.message);
      await errorHelper.expectErrorHandling(scenario.message);
      
      if (scenario.status >= 500) {
        await errorHelper.expectRetryMechanism();
      }
    }

    console.log('✅ Error handling test suite completed');
  }
}

/**
 * Export all utilities as default
 */
export default {
  ApiValidator,
  AuthenticationHelper,
  ContractDataHelper,
  WebSocketHelper,
  PerformanceHelper,
  ErrorHelper,
  DataValidator,
  TestDataFactory,
  IntegrationTestSuite
};