import { test, expect } from '@playwright/test';
import { 
  LoginPage, 
  ContractsPage, 
  ContractCreatePage, 
  AnalyticsPage 
} from '../utils/page-objects';
import { TestUser, TestContract, API_ENDPOINTS } from '../utils/test-data';

test.describe('API Integration Tests', () => {
  let loginPage: LoginPage;
  let contractsPage: ContractsPage;
  let contractCreatePage: ContractCreatePage;
  let analyticsPage: AnalyticsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    contractsPage = new ContractsPage(page);
    contractCreatePage = new ContractCreatePage(page);
    analyticsPage = new AnalyticsPage(page);
  });

  test.describe('Authentication API Integration', () => {
    test('should handle successful login API response', async ({ page }) => {
      // Track API calls
      const apiCalls: string[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/v1/')) {
          apiCalls.push(`${request.method()} ${request.url()}`);
        }
      });

      const testUser = TestUser.admin();
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      
      // Check that login API was called
      const loginCall = apiCalls.find(call => call.includes('/auth/login'));
      expect(loginCall).toBeTruthy();
      expect(loginCall).toContain('POST');
    });

    test('should handle login API errors', async ({ page }) => {
      // Mock authentication failure
      await page.route(`**${API_ENDPOINTS.auth.login}`, async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Invalid credentials'
          })
        });
      });

      const testUser = TestUser.admin();
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      
      // Should display API error message
      await loginPage.expectError('Invalid credentials');
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route(`**${API_ENDPOINTS.auth.login}`, async route => {
        await route.abort('internetdisconnected');
      });

      const testUser = TestUser.admin();
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      
      // Should show network error message
      const errorMessage = page.getByRole('alert');
      await expect(errorMessage).toBeVisible();
    });

    test('should retry failed requests', async ({ page }) => {
      let callCount = 0;
      
      await page.route(`**${API_ENDPOINTS.auth.login}`, async route => {
        callCount++;
        if (callCount === 1) {
          // First call fails
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: 'Server error'
            })
          });
        } else {
          // Second call succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              token: {
                access_token: 'success-token',
                token_type: 'bearer',
                expires_in: 3600
              },
              user: {
                id: 'test-user',
                email: 'test@test.com',
                full_name: 'Test User',
                is_active: true,
                timezone: 'Europe/London',
                company_id: 'test-company',
                created_at: new Date().toISOString(),
                last_login_at: new Date().toISOString()
              }
            })
          });
        }
      });

      const testUser = TestUser.admin();
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      
      // Should eventually succeed after retry
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Contract API Integration', () => {
    test.beforeEach(async ({ page }) => {
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

    test('should load contracts from API', async ({ page }) => {
      const apiCalls: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/contracts')) {
          apiCalls.push({
            method: request.method(),
            url: request.url(),
            headers: request.headers()
          });
        }
      });

      // Mock contracts API response
      await page.route(`**${API_ENDPOINTS.contracts.list}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            contracts: [
              {
                id: 'api-contract-1',
                title: 'API Test Contract',
                contract_type: 'service_agreement',
                status: 'draft',
                client_name: 'API Client',
                contract_value: 5000,
                currency: 'GBP',
                version: 1,
                is_current_version: true,
                company_id: 'test-company',
                created_by: 'test-user',
                created_at: new Date().toISOString()
              }
            ],
            total: 1,
            page: 1,
            size: 10,
            pages: 1
          })
        });
      });

      await contractsPage.goto('/contracts');
      
      // Should make API call with authentication header
      await page.waitForTimeout(1000); // Wait for API calls
      
      const contractsCall = apiCalls.find(call => 
        call.method === 'GET' && call.url.includes('/contracts')
      );
      
      expect(contractsCall).toBeTruthy();
      expect(contractsCall.headers.authorization).toBe('Bearer mock-token');
      
      // Should display contract from API
      await expect(page.getByText('API Test Contract')).toBeVisible();
    });

    test('should create contract via API', async ({ page }) => {
      let createRequestBody: any;
      
      await page.route(`**${API_ENDPOINTS.contracts.create}`, async route => {
        if (route.request().method() === 'POST') {
          createRequestBody = await route.request().postDataJSON();
          
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'new-api-contract',
              title: createRequestBody.title,
              contract_type: createRequestBody.contract_type,
              status: 'draft',
              plain_english_input: createRequestBody.plain_english_input,
              client_name: createRequestBody.client_name,
              contract_value: createRequestBody.contract_value,
              currency: createRequestBody.currency,
              version: 1,
              is_current_version: true,
              company_id: 'test-company',
              created_by: 'test-user',
              created_at: new Date().toISOString()
            })
          });
        } else {
          await route.continue();
        }
      });

      const testContract = TestContract.serviceAgreement();
      
      await contractCreatePage.goto('/contracts/new');
      await contractCreatePage.createContract(testContract);
      
      // Verify API call was made with correct data
      expect(createRequestBody).toBeTruthy();
      expect(createRequestBody.title).toBe(testContract.title);
      expect(createRequestBody.contract_type).toBe(testContract.contract_type);
      expect(createRequestBody.plain_english_input).toBe(testContract.plain_english_input);
    });

    test('should handle API validation errors', async ({ page }) => {
      await page.route(`**${API_ENDPOINTS.contracts.create}`, async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: {
                title: ['Title is required'],
                contract_type: ['Invalid contract type']
              }
            })
          });
        } else {
          await route.continue();
        }
      });

      const testContract = TestContract.serviceAgreement();
      
      await contractCreatePage.goto('/contracts/new');
      await contractCreatePage.createContract(testContract);
      
      // Should display validation errors from API
      await expect(page.getByText('Title is required')).toBeVisible();
      await expect(page.getByText('Invalid contract type')).toBeVisible();
    });

    test('should generate content via API', async ({ page }) => {
      await page.route('**/contracts/*/generate', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'generation-id',
              model_name: 'gpt-4',
              input_prompt: 'Generate contract content',
              generated_content: 'AI generated contract content from API...',
              processing_time_ms: 2500,
              confidence_score: 0.95,
              created_at: new Date().toISOString()
            })
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/contracts/test-contract');
      await page.getByRole('button', { name: /generate/i }).click();
      
      // Should show generated content
      await expect(page.getByText('AI generated contract content from API')).toBeVisible();
    });

    test('should analyze compliance via API', async ({ page }) => {
      await page.route('**/contracts/*/analyze', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'compliance-id',
              contract_id: 'test-contract',
              overall_score: 87.5,
              gdpr_compliance: 92,
              employment_law_compliance: 85,
              consumer_rights_compliance: 88,
              commercial_terms_compliance: 85,
              risk_score: 15,
              risk_factors: ['Minor clause ambiguity'],
              recommendations: ['Clarify termination conditions'],
              analysis_date: new Date().toISOString()
            })
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/contracts/test-contract');
      await page.getByRole('button', { name: /analyze/i }).click();
      
      // Should show compliance score
      await expect(page.getByText('87.5')).toBeVisible();
      await expect(page.getByText('Minor clause ambiguity')).toBeVisible();
    });
  });

  test.describe('Analytics API Integration', () => {
    test.beforeEach(async ({ page }) => {
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

    test('should load dashboard analytics from API', async ({ page }) => {
      await page.route(`**${API_ENDPOINTS.analytics.dashboard}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            business_metrics: {
              total_contracts: 42,
              active_contracts: 28,
              draft_contracts: 10,
              completed_contracts: 4,
              terminated_contracts: 0,
              total_contract_value: 250000,
              average_contract_value: 5952,
              compliance_score_average: 88.7,
              high_risk_contracts: 3,
              contracts_this_month: 12,
              contracts_last_month: 8,
              growth_rate: 50.0
            },
            summary: {
              total_contracts: 42,
              total_portfolio_value: 250000,
              average_compliance_score: 88.7,
              monthly_growth_rate: 50.0,
              high_risk_contracts: 3,
              key_insights: ['Strong growth this month', 'Compliance scores improving'],
              overall_health: 'excellent',
              recommended_actions: ['Review high-risk contracts']
            }
          })
        });
      });

      await analyticsPage.goto('/analytics');
      
      // Should display metrics from API
      await expect(page.getByText('42')).toBeVisible(); // total contracts
      await expect(page.getByText('£250,000')).toBeVisible(); // total value
      await expect(page.getByText('88.7')).toBeVisible(); // compliance score
      await expect(page.getByText('Strong growth this month')).toBeVisible();
    });

    test('should handle analytics API errors', async ({ page }) => {
      await page.route(`**${API_ENDPOINTS.analytics.dashboard}`, async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Analytics service unavailable'
          })
        });
      });

      await analyticsPage.goto('/analytics');
      
      // Should show error message
      await expect(page.getByText('Analytics service unavailable')).toBeVisible();
    });
  });

  test.describe('API Request/Response Handling', () => {
    test('should include proper headers in API requests', async ({ page }) => {
      const headers: Record<string, string> = {};
      
      page.on('request', request => {
        if (request.url().includes('/api/v1/')) {
          Object.assign(headers, request.headers());
        }
      });

      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'test-jwt-token'
          }
        }));
      });

      await page.goto('/contracts');
      await page.waitForTimeout(1000);
      
      // Should include proper headers
      expect(headers['authorization']).toBe('Bearer test-jwt-token');
      expect(headers['content-type']).toBe('application/json');
    });

    test('should handle different HTTP status codes', async ({ page }) => {
      const statusCodes = [200, 201, 400, 401, 403, 404, 500];
      
      for (const statusCode of statusCodes) {
        await page.route('**/test-endpoint', async route => {
          await route.fulfill({
            status: statusCode,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: `Status ${statusCode} response`
            })
          });
        });

        const response = await page.request.get('/api/v1/test-endpoint');
        expect(response.status()).toBe(statusCode);
      }
    });

    test('should handle malformed JSON responses', async ({ page }) => {
      await page.route('**/contracts', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json {'
        });
      });

      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });

      await contractsPage.goto('/contracts');
      
      // Should handle JSON parsing error gracefully
      await expect(page.getByText(/error/i)).toBeVisible();
    });

    test('should handle request timeouts', async ({ page }) => {
      await page.route('**/contracts', async route => {
        // Simulate slow response
        await new Promise(resolve => setTimeout(resolve, 35000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ contracts: [] })
        });
      });

      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });

      await contractsPage.goto('/contracts');
      
      // Should show timeout error
      await expect(page.getByText(/timeout/i)).toBeVisible();
    });
  });

  test.describe('Real Backend Integration', () => {
    // These tests would run against the actual backend
    // Skip them if backend is not available
    
    test.skip('should authenticate with real backend', async ({ page }) => {
      // This test would use real credentials and backend
      const realTestUser = {
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'testpass123',
        full_name: 'Real Test User'
      };

      await loginPage.goto('/login');
      await loginPage.login(realTestUser);
      
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test.skip('should create real contract with backend', async ({ page }) => {
      // This test would create actual data in the backend
      const testContract = TestContract.serviceAgreement();
      
      await contractCreatePage.goto('/contracts/new');
      await contractCreatePage.createContract(testContract);
      
      // Verify contract was created in database
      await expect(page).toHaveURL(/\/contracts\/\w+/);
    });
  });
});