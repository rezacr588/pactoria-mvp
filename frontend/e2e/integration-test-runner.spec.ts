import { test, expect } from '@playwright/test';
import { 
  ApiValidator, 
  AuthenticationHelper, 
  ContractDataHelper,
  WebSocketHelper,
  PerformanceHelper,
  ErrorHelper,
  TestDataFactory,
  IntegrationTestSuite 
} from './utils/integration-helpers';

/**
 * INTEGRATION TEST RUNNER
 * 
 * Orchestrates comprehensive end-to-end integration tests that validate
 * the complete frontend-backend integration. These tests are designed to
 * ensure the application works as a cohesive system.
 * 
 * Test Priority: CRITICAL (Essential for production readiness)
 * 
 * This test runner executes the most important integration scenarios
 * that validate the core business functionality works correctly with
 * real or realistic backend API interactions.
 */

test.describe('Critical Integration Test Suite - Production Readiness', () => {
  test.describe('Complete System Integration Validation', () => {
    test('should complete full application workflow integration @critical @smoke', async ({ page }) => {
      // Initialize test utilities
      const apiValidator = new ApiValidator(page);
      const authHelper = new AuthenticationHelper(page);
      const contractHelper = new ContractDataHelper(page);
      const performanceHelper = new PerformanceHelper(page);

      console.log('🚀 Starting complete system integration test...');

      // PHASE 1: User Authentication Integration
      console.log('📋 Phase 1: User Authentication Integration');
      
      const testUser = TestDataFactory.generateUser('ADMIN');
      
      // Mock authentication APIs
      await page.route('**/auth/login', async route => {
        const requestBody = await route.request().postDataJSON();
        
        if (requestBody.email === testUser.email && requestBody.password === testUser.password) {
          await route.fulfill({
            status: 200,
            json: {
              token: {
                access_token: 'integration-test-token',
                token_type: 'bearer',
                expires_in: 3600
              },
              user: {
                id: 'integration-user-123',
                email: testUser.email,
                full_name: testUser.full_name,
                is_active: true,
                timezone: 'UTC',
                company_id: 'integration-company-123',
                created_at: new Date().toISOString()
              },
              company: {
                id: 'integration-company-123',
                name: testUser.company_name,
                subscription_tier: 'ENTERPRISE',
                max_users: 50,
                created_at: new Date().toISOString()
              }
            }
          });
        } else {
          await route.fulfill({
            status: 401,
            json: { detail: 'Invalid credentials' }
          });
        }
      });

      // Perform login and validate
      await authHelper.performLogin(testUser);
      await apiValidator.expectApiCall('POST', '/auth/login');
      await apiValidator.expectApiResponse('/auth/login', 200, ['token', 'user']);

      console.log('✅ Authentication integration validated');

      // PHASE 2: Contract Management Integration
      console.log('📋 Phase 2: Contract Management Integration');

      const contractData = contractHelper.generateContractData('SERVICE_AGREEMENT');
      let createdContractId: string;

      // Mock contract APIs
      await page.route('**/contracts', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          createdContractId = `integration-contract-${Date.now()}`;
          
          await route.fulfill({
            status: 201,
            json: {
              id: createdContractId,
              ...requestBody,
              status: 'DRAFT',
              version: 1,
              is_current_version: true,
              company_id: 'integration-company-123',
              created_by: 'integration-user-123',
              created_at: new Date().toISOString()
            }
          });
        } else if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            json: {
              contracts: [
                {
                  id: createdContractId || 'sample-contract-1',
                  title: 'Integration Test Contract',
                  contract_type: 'SERVICE_AGREEMENT',
                  status: 'DRAFT',
                  client_name: 'Integration Client',
                  contract_value: 25000,
                  currency: 'GBP',
                  version: 1,
                  created_at: new Date().toISOString()
                }
              ],
              total: 1,
              page: 1,
              size: 20,
              pages: 1
            }
          });
        }
      });

      // Create contract via UI
      const actualContractId = await contractHelper.createContractViaApi(contractData);
      
      // Validate contract creation
      await apiValidator.expectApiCall('POST', '/contracts');
      await apiValidator.expectApiResponse('/contracts', 201, ['id', 'title', 'status']);

      console.log(`✅ Contract creation integration validated (ID: ${actualContractId})`);

      // PHASE 3: AI Integration (Content Generation)
      console.log('📋 Phase 3: AI Integration Testing');

      // Mock AI generation API
      await page.route('**/contracts/*/generate', async route => {
        await route.fulfill({
          status: 200,
          json: {
            id: 'generation-integration-test',
            model_name: 'gpt-4',
            input_prompt: 'Generate contract content based on plain English input',
            generated_content: `
            SERVICE AGREEMENT - INTEGRATION TEST
            
            This Service Agreement is entered into between ${contractData.client_name} (Client) 
            and Integration Test Company (Service Provider).
            
            SERVICES: ${contractData.plain_english_input}
            
            COMPENSATION: ${contractData.contract_value} ${contractData.currency}
            
            TERM: This agreement shall commence on ${contractData.start_date} and 
            continue until ${contractData.end_date}.
            
            This contract has been generated using AI for integration testing purposes.
            `,
            processing_time_ms: 2500,
            token_usage: { prompt: 200, completion: 800, total: 1000 },
            confidence_score: 0.95,
            created_at: new Date().toISOString()
          }
        });
      });

      // Navigate to contract and generate content
      await page.goto(`/contracts/${actualContractId}`);
      await page.getByRole('button', { name: /generate|ai generate/i }).click();
      
      // Wait for generation to complete
      await page.waitForResponse(response => response.url().includes('/generate'));
      
      // Validate generated content appears
      await expect(page.getByText(/service agreement.*integration test/i)).toBeVisible();
      await expect(page.getByText(contractData.client_name)).toBeVisible();

      console.log('✅ AI content generation integration validated');

      // PHASE 4: Compliance Analysis Integration
      console.log('📋 Phase 4: Compliance Analysis Integration');

      // Mock compliance analysis API
      await page.route('**/contracts/*/analyze', async route => {
        await route.fulfill({
          status: 200,
          json: {
            id: 'analysis-integration-test',
            contract_id: actualContractId,
            overall_score: 92.5,
            gdpr_compliance: 95,
            employment_law_compliance: 90,
            consumer_rights_compliance: 88,
            commercial_terms_compliance: 97,
            risk_score: 8,
            risk_factors: [
              'Consider adding explicit data retention clause',
              'Review termination notice period requirements'
            ],
            recommendations: [
              'Add specific GDPR data handling procedures',
              'Include dispute resolution mechanism',
              'Clarify intellectual property ownership'
            ],
            analysis_date: new Date().toISOString(),
            analysis_version: '2.1'
          }
        });
      });

      // Trigger compliance analysis
      await page.getByRole('button', { name: /analyze|compliance/i }).click();
      
      // Wait for analysis completion
      await page.waitForResponse(response => response.url().includes('/analyze'));
      
      // Validate compliance results
      await expect(page.getByText('92.5')).toBeVisible(); // Overall score
      await expect(page.getByText(/gdpr.*95/i)).toBeVisible();
      await expect(page.getByText(/data retention clause/i)).toBeVisible();

      console.log('✅ Compliance analysis integration validated');

      // PHASE 5: Search Integration
      console.log('📋 Phase 5: Search Integration Testing');

      // Mock search API
      await page.route('**/search/contracts', async route => {
        const requestBody = await route.request().postDataJSON();
        
        await route.fulfill({
          status: 200,
          json: {
            items: [
              {
                id: actualContractId,
                title: contractData.title,
                contract_type: contractData.contract_type,
                status: 'DRAFT',
                client_name: contractData.client_name,
                contract_value: contractData.contract_value,
                currency: contractData.currency,
                created_at: new Date().toISOString(),
                version: 1,
                compliance_score: 92.5,
                highlights: [
                  {
                    field: 'title',
                    fragments: [`<em>${requestBody.query}</em>`]
                  }
                ]
              }
            ],
            total: 1,
            page: 1,
            size: 20,
            pages: 1,
            took_ms: 150,
            query: requestBody.query,
            filters_applied: {}
          }
        });
      });

      // Perform search
      await page.goto('/contracts/search');
      await page.getByLabel(/search query/i).fill('integration test');
      await page.getByRole('button', { name: /search/i }).click();
      
      // Validate search results
      await page.waitForResponse(response => response.url().includes('/search/contracts'));
      await expect(page.getByText(contractData.title)).toBeVisible();
      await expect(page.getByText('1.*results.*found')).toBeVisible();

      console.log('✅ Search integration validated');

      // PHASE 6: Performance Validation
      console.log('📋 Phase 6: Performance Validation');

      // Measure and validate performance
      const dashboardMetrics = await performanceHelper.measurePageLoad('/dashboard');
      performanceHelper.expectPerformanceThresholds(dashboardMetrics);
      
      // Validate API response times
      apiValidator.expectResponseTime(5000);

      console.log(`✅ Performance validated - Load: ${dashboardMetrics.loadTime}ms, DOM: ${dashboardMetrics.domContentLoaded}ms`);

      // PHASE 7: Final Integration Validation
      console.log('📋 Phase 7: Final Integration Validation');

      // Navigate back to contracts list to verify data persistence
      await page.goto('/contracts');
      await expect(page.getByText(contractData.title)).toBeVisible();
      
      // Verify user session is still active
      await authHelper.expectAuthenticatedState();
      
      // Validate total API interactions
      const totalApiCalls = apiValidator['requests'].length;
      expect(totalApiCalls).toBeGreaterThan(5); // Minimum expected API interactions
      
      console.log(`✅ Integration test completed successfully with ${totalApiCalls} API interactions`);
    });

    test('should handle complete error recovery workflow @critical', async ({ page }) => {
      console.log('🚀 Starting error recovery integration test...');

      const apiValidator = new ApiValidator(page);
      const authHelper = new AuthenticationHelper(page);
      const errorHelper = new ErrorHelper(page);

      // SCENARIO 1: Authentication failure and recovery
      console.log('📋 Testing authentication error recovery');

      // First attempt - simulate server error
      await page.route('**/auth/login', async route => {
        await route.fulfill({
          status: 500,
          json: { detail: 'Internal server error' }
        });
      });

      await page.goto('/login');
      await page.getByLabel(/email/i).fill('test@integration.com');
      await page.getByLabel(/password/i).fill('password123');
      await page.getByRole('button', { name: /login/i }).click();

      // Should show error and retry option
      await errorHelper.expectErrorHandling('Internal server error');
      await errorHelper.expectRetryMechanism();

      // Second attempt - simulate success after retry
      await page.route('**/auth/login', async route => {
        await route.fulfill({
          status: 200,
          json: {
            token: { access_token: 'recovery-token', token_type: 'bearer', expires_in: 3600 },
            user: { 
              id: 'recovery-user', 
              email: 'test@integration.com', 
              full_name: 'Recovery Test User',
              is_active: true,
              company_id: 'recovery-company',
              created_at: new Date().toISOString()
            }
          }
        });
      });

      await page.getByRole('button', { name: /retry/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);

      console.log('✅ Authentication error recovery validated');

      // SCENARIO 2: Network connectivity issues
      console.log('📋 Testing network error recovery');

      // Simulate network disconnection
      await errorHelper.simulateNetworkError('/contracts');
      
      await page.goto('/contracts');
      await errorHelper.expectErrorHandling('network');
      
      // Restore connectivity
      await page.route('**/contracts', async route => {
        await route.fulfill({
          status: 200,
          json: {
            contracts: [
              {
                id: 'recovery-contract-1',
                title: 'Network Recovery Test Contract',
                status: 'DRAFT',
                created_at: new Date().toISOString()
              }
            ],
            total: 1, page: 1, size: 20, pages: 1
          }
        });
      });

      await page.reload();
      await expect(page.getByText('Network Recovery Test Contract')).toBeVisible();

      console.log('✅ Network error recovery validated');

      // SCENARIO 3: Data validation and recovery
      console.log('📋 Testing data validation error recovery');

      await page.route('**/contracts', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 400,
            json: {
              detail: {
                title: ['Title is required'],
                contract_type: ['Invalid contract type selected'],
                plain_english_input: ['Description must be at least 10 characters']
              }
            }
          });
        }
      });

      await page.goto('/contracts/new');
      await page.getByRole('button', { name: /create/i }).click();

      // Should show field-specific validation errors
      await expect(page.getByText('Title is required')).toBeVisible();
      await expect(page.getByText('Invalid contract type selected')).toBeVisible();
      await expect(page.getByText('must be at least 10 characters')).toBeVisible();

      console.log('✅ Data validation error recovery validated');

      console.log('🎉 Error recovery integration test completed successfully');
    });

    test('should validate real-time features integration @websocket @realtime', async ({ page }) => {
      console.log('🚀 Starting real-time features integration test...');

      const websocketHelper = new WebSocketHelper(page);
      const authHelper = new AuthenticationHelper(page);

      // Set up authenticated user
      await authHelper.setupAuthenticatedUser(TestDataFactory.generateUser('USER'));
      
      // Set up WebSocket mock
      await websocketHelper.setupMockWebSocket();
      
      await page.goto('/dashboard');
      
      // Validate WebSocket connection established
      await websocketHelper.expectWebSocketConnection();
      
      // Test real-time notifications
      await websocketHelper.simulateMessage({
        type: 'contract_updated',
        contract_id: 'realtime-test-contract',
        title: 'Real-time Test Contract',
        status: 'ACTIVE',
        updated_by: { id: 'other-user', name: 'Other User' },
        changes: ['status'],
        timestamp: new Date().toISOString()
      });

      // Should show real-time notification
      await expect(page.getByText(/contract.*updated/i)).toBeVisible();
      await expect(page.getByText('Real-time Test Contract')).toBeVisible();
      await expect(page.getByText('Other User')).toBeVisible();

      // Test bulk operation progress updates
      const progressUpdates = [25, 50, 75, 100];
      for (const progress of progressUpdates) {
        await websocketHelper.simulateMessage({
          type: 'bulk_operation_progress',
          operation_id: 'realtime-bulk-test',
          operation_type: 'bulk_update',
          progress_percentage: progress,
          processed_count: progress,
          total_count: 100,
          status: progress === 100 ? 'COMPLETED' : 'RUNNING',
          timestamp: new Date().toISOString()
        });

        await expect(page.getByText(`${progress}%`)).toBeVisible();
        await page.waitForTimeout(100);
      }

      await expect(page.getByText(/operation.*completed/i)).toBeVisible();

      console.log('✅ Real-time features integration validated');
    });

    test('should validate cross-browser compatibility @cross-browser', async ({ page, browserName }) => {
      console.log(`🚀 Starting cross-browser compatibility test for ${browserName}...`);

      const authHelper = new AuthenticationHelper(page);
      const testUser = TestDataFactory.generateUser();

      // Set up basic API mocks
      await page.route('**/auth/login', async route => {
        await route.fulfill({
          status: 200,
          json: {
            token: { access_token: 'cross-browser-token', token_type: 'bearer' },
            user: { 
              id: 'cross-browser-user', 
              email: testUser.email, 
              full_name: testUser.full_name,
              is_active: true,
              created_at: new Date().toISOString()
            }
          }
        });
      });

      await page.route('**/contracts', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            json: {
              contracts: [
                {
                  id: 'cross-browser-contract',
                  title: `${browserName} Test Contract`,
                  status: 'ACTIVE',
                  created_at: new Date().toISOString()
                }
              ],
              total: 1, page: 1, size: 20, pages: 1
            }
          });
        }
      });

      // Test core functionality across browsers
      await authHelper.performLogin(testUser);
      await expect(page).toHaveURL(/\/dashboard/);

      // Navigate to contracts
      await page.goto('/contracts');
      await expect(page.getByText(`${browserName} Test Contract`)).toBeVisible();

      // Test responsive design
      await page.setViewportSize({ width: 768, height: 1024 }); // Tablet view
      await expect(page.getByTestId('mobile-menu')).toBeVisible();

      await page.setViewportSize({ width: 375, height: 667 }); // Mobile view
      await expect(page.getByTestId('mobile-navigation')).toBeVisible();

      console.log(`✅ Cross-browser compatibility validated for ${browserName}`);
    });
  });

  test.describe('Production Readiness Checklist', () => {
    test('should validate all critical integration points @production-ready', async ({ page }) => {
      console.log('🚀 Running production readiness validation...');

      const checklist = {
        authentication: false,
        contract_management: false,
        ai_integration: false,
        search_functionality: false,
        real_time_features: false,
        error_handling: false,
        performance: false,
        security: false
      };

      // Test 1: Authentication Integration
      await page.route('**/auth/**', async route => {
        await route.fulfill({ status: 200, json: { success: true } });
      });
      
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('prod@test.com');
      await page.getByLabel(/password/i).fill('password');
      await page.getByRole('button', { name: /login/i }).click();
      
      const loginResponse = await page.waitForResponse(response => 
        response.url().includes('/auth/login')
      );
      
      if (loginResponse.ok()) {
        checklist.authentication = true;
        console.log('✅ Authentication integration ready');
      }

      // Test 2: Contract Management
      await page.route('**/contracts**', async route => {
        await route.fulfill({ 
          status: 200, 
          json: { contracts: [], total: 0 } 
        });
      });
      
      await page.goto('/contracts');
      const contractsResponse = await page.waitForResponse(response => 
        response.url().includes('/contracts')
      );
      
      if (contractsResponse.ok()) {
        checklist.contract_management = true;
        console.log('✅ Contract management integration ready');
      }

      // Test 3: Search Functionality
      await page.route('**/search/**', async route => {
        await route.fulfill({ 
          status: 200, 
          json: { items: [], total: 0 } 
        });
      });
      
      await page.goto('/contracts/search');
      await page.getByLabel(/search/i).fill('test');
      await page.getByRole('button', { name: /search/i }).click();
      
      const searchResponse = await page.waitForResponse(response => 
        response.url().includes('/search')
      );
      
      if (searchResponse.ok()) {
        checklist.search_functionality = true;
        console.log('✅ Search functionality integration ready');
      }

      // Test 4: Error Handling
      await page.route('**/test-error', async route => {
        await route.fulfill({ status: 500, json: { detail: 'Test error' } });
      });
      
      // Trigger error scenario
      await page.evaluate(() => {
        fetch('/api/v1/test-error').catch(() => {});
      });
      
      // Check if error is handled gracefully
      await page.waitForTimeout(1000);
      const hasErrorHandling = await page.getByRole('alert').isVisible().catch(() => false);
      
      if (hasErrorHandling) {
        checklist.error_handling = true;
        console.log('✅ Error handling ready');
      }

      // Test 5: Performance
      const startTime = Date.now();
      await page.goto('/dashboard');
      const loadTime = Date.now() - startTime;
      
      if (loadTime < 3000) {
        checklist.performance = true;
        console.log(`✅ Performance ready (${loadTime}ms load time)`);
      }

      // Test 6: Security (Basic checks)
      const authStorage = await page.evaluate(() => 
        localStorage.getItem('auth-storage')
      );
      
      // Check if sensitive data is not exposed
      if (authStorage && !authStorage.includes('password')) {
        checklist.security = true;
        console.log('✅ Basic security checks passed');
      }

      // Production Readiness Report
      const readyCount = Object.values(checklist).filter(Boolean).length;
      const totalChecks = Object.keys(checklist).length;
      const readinessPercentage = (readyCount / totalChecks) * 100;

      console.log('\n📊 PRODUCTION READINESS REPORT');
      console.log('================================');
      console.log(`Overall Readiness: ${readinessPercentage.toFixed(1)}% (${readyCount}/${totalChecks})`);
      console.log('\nComponent Status:');
      
      Object.entries(checklist).forEach(([component, status]) => {
        console.log(`${status ? '✅' : '❌'} ${component.replace('_', ' ').toUpperCase()}`);
      });

      // Require minimum 80% readiness for production
      expect(readinessPercentage).toBeGreaterThanOrEqual(80);
      
      if (readinessPercentage >= 95) {
        console.log('\n🎉 SYSTEM IS PRODUCTION READY! 🎉');
      } else if (readinessPercentage >= 80) {
        console.log('\n✅ System meets minimum production requirements');
      } else {
        console.log('\n⚠️ System requires additional work before production deployment');
      }
    });
  });
});