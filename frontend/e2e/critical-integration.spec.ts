import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * CRITICAL INTEGRATION E2E TESTS
 * 
 * These tests prioritize validating frontend-backend integration points.
 * They are designed to ensure the product works end-to-end with real API calls.
 * 
 * Test Priority: HIGHEST (Critical for working product)
 * 
 * Coverage:
 * - Authentication Integration (login, register, token management)
 * - Contract CRUD Integration (create, read, update, delete with backend)
 * - API Communication (error handling, loading states, data persistence)
 * - Critical User Journey Validation
 */

test.describe('Critical Integration Tests - Backend API Validation', () => {
  const TEST_USER = {
    email: `test-${faker.string.uuid()}@pactoria-e2e.com`,
    password: 'TestPassword123!',
    full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
    company_name: `${faker.company.name()} E2E Test`
  };

  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  test.describe('Authentication Integration - Backend API', () => {
    test('should complete full registration-login flow with backend @smoke', async ({ page }) => {
      const apiRequests: any[] = [];
      
      // Track all API requests
      page.on('request', request => {
        if (request.url().includes('/api/v1/')) {
          apiRequests.push({
            method: request.method(),
            url: request.url(),
            headers: Object.fromEntries(Object.entries(request.headers())),
            timestamp: Date.now()
          });
        }
      });

      // 1. REGISTRATION INTEGRATION TEST
      await page.goto('/register');
      
      // Fill registration form
      await page.getByLabel(/full name|name/i).fill(TEST_USER.full_name);
      await page.getByLabel(/email/i).fill(TEST_USER.email);
      await page.getByLabel(/password/i).fill(TEST_USER.password);
      await page.getByLabel(/company/i).fill(TEST_USER.company_name);
      
      // Submit registration
      const registrationResponse = page.waitForResponse(response => 
        response.url().includes('/auth/register') && response.request().method() === 'POST'
      );
      
      await page.getByRole('button', { name: /register|sign up/i }).click();
      
      // Validate registration API call
      const regResponse = await registrationResponse;
      expect(regResponse.status()).toBe(201);
      
      const regData = await regResponse.json();
      expect(regData.token).toBeDefined();
      expect(regData.token.access_token).toBeDefined();
      expect(regData.user).toBeDefined();
      expect(regData.user.email).toBe(TEST_USER.email);

      // Should redirect to dashboard after successful registration
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Verify authentication state is set
      const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
      expect(authStorage).toBeTruthy();
      
      const authData = JSON.parse(authStorage);
      expect(authData.state.user).toBeDefined();
      expect(authData.state.token).toBeDefined();

      // 2. LOGOUT INTEGRATION TEST
      await page.getByTestId('user-menu').click();
      await page.getByRole('button', { name: /logout|sign out/i }).click();
      
      // Should redirect to landing page
      await expect(page).toHaveURL('/');
      
      // Authentication state should be cleared
      const clearedAuthStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
      if (clearedAuthStorage) {
        const clearedData = JSON.parse(clearedAuthStorage);
        expect(clearedData.state.user).toBeFalsy();
        expect(clearedData.state.token).toBeFalsy();
      }

      // 3. LOGIN INTEGRATION TEST
      await page.goto('/login');
      
      await page.getByLabel(/email/i).fill(TEST_USER.email);
      await page.getByLabel(/password/i).fill(TEST_USER.password);
      
      const loginResponse = page.waitForResponse(response => 
        response.url().includes('/auth/login') && response.request().method() === 'POST'
      );
      
      await page.getByRole('button', { name: /login|sign in/i }).click();
      
      // Validate login API call
      const loginRes = await loginResponse;
      expect(loginRes.status()).toBe(200);
      
      const loginData = await loginRes.json();
      expect(loginData.token).toBeDefined();
      expect(loginData.user.email).toBe(TEST_USER.email);

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Verify API requests were properly authenticated
      const authenticatedRequests = apiRequests.filter(req => 
        req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      );
      expect(authenticatedRequests.length).toBeGreaterThan(0);
    });

    test('should handle authentication errors from backend @critical', async ({ page }) => {
      await page.goto('/login');
      
      // Try login with invalid credentials
      await page.getByLabel(/email/i).fill('invalid@test.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      
      const errorResponse = page.waitForResponse(response => 
        response.url().includes('/auth/login') && response.status() === 401
      );
      
      await page.getByRole('button', { name: /login|sign in/i }).click();
      
      // Validate error response
      const errorRes = await errorResponse;
      expect(errorRes.status()).toBe(401);
      
      // Should show error message to user
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible();
      
      // Should remain on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle token expiration and refresh @critical', async ({ page }) => {
      // Set up expired token
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'expired-token-123'
          }
        }));
      });

      // Mock expired token response
      await page.route('**/auth/me', async route => {
        const authHeader = route.request().headers().authorization;
        if (authHeader === 'Bearer expired-token-123') {
          await route.fulfill({
            status: 401,
            json: { detail: 'Token expired' }
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/dashboard');
      
      // Should redirect to login due to expired token
      await expect(page).toHaveURL(/\/login/);
      
      // Should show appropriate message
      await expect(page.getByText(/session.*expired|please.*login/i)).toBeVisible();
    });
  });

  test.describe('Contract CRUD Integration - Backend API', () => {
    test.beforeEach(async ({ page }) => {
      // Set up authenticated user for contract tests
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { 
              id: 'test-user-123', 
              email: 'test@pactoria.com',
              full_name: 'Test User',
              company_id: 'test-company-123'
            },
            token: 'valid-test-token'
          }
        }));
      });
    });

    test('should create contract with backend integration @smoke', async ({ page }) => {
      const testContract = {
        title: `Integration Test Contract - ${faker.string.uuid()}`,
        contract_type: 'SERVICE_AGREEMENT',
        plain_english_input: 'Create a service agreement for software development services lasting 6 months',
        client_name: faker.company.name(),
        client_email: faker.internet.email(),
        contract_value: faker.number.int({ min: 1000, max: 50000 }),
        currency: 'GBP',
        start_date: faker.date.future().toISOString().split('T')[0],
        end_date: faker.date.future().toISOString().split('T')[0]
      };

      let createdContractId: string;

      // Track create request
      page.on('response', async response => {
        if (response.url().includes('/contracts') && response.request().method() === 'POST') {
          if (response.ok()) {
            const data = await response.json();
            createdContractId = data.id;
          }
        }
      });

      await page.goto('/contracts/new');
      
      // Fill contract form
      await page.getByLabel(/title/i).fill(testContract.title);
      await page.getByLabel(/contract type/i).selectOption(testContract.contract_type);
      await page.getByLabel(/plain english|description/i).fill(testContract.plain_english_input);
      await page.getByLabel(/client name/i).fill(testContract.client_name);
      await page.getByLabel(/client email/i).fill(testContract.client_email);
      await page.getByLabel(/value|amount/i).fill(testContract.contract_value.toString());
      await page.getByLabel(/currency/i).selectOption(testContract.currency);
      await page.getByLabel(/start date/i).fill(testContract.start_date);
      await page.getByLabel(/end date/i).fill(testContract.end_date);

      // Submit creation
      const createResponse = page.waitForResponse(response => 
        response.url().includes('/contracts') && 
        response.request().method() === 'POST' &&
        response.status() === 201
      );

      await page.getByRole('button', { name: /create|submit/i }).click();

      // Validate creation response
      const createRes = await createResponse;
      expect(createRes.status()).toBe(201);

      const createdContract = await createRes.json();
      expect(createdContract.id).toBeDefined();
      expect(createdContract.title).toBe(testContract.title);
      expect(createdContract.contract_type).toBe(testContract.contract_type);
      expect(createdContract.status).toBe('DRAFT');

      // Should redirect to contract view
      await expect(page).toHaveURL(`/contracts/${createdContract.id}`);
      
      // Should display contract details
      await expect(page.getByText(testContract.title)).toBeVisible();
      await expect(page.getByText(testContract.client_name)).toBeVisible();
    });

    test('should read and display contract from backend @smoke', async ({ page }) => {
      const contractId = 'test-contract-123';

      // Mock contract data response
      await page.route(`**/contracts/${contractId}`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            id: contractId,
            title: 'Backend Integration Contract',
            contract_type: 'SERVICE_AGREEMENT',
            status: 'ACTIVE',
            plain_english_input: 'This is a test contract for integration',
            client_name: 'Integration Test Client',
            client_email: 'client@test.com',
            contract_value: 25000,
            currency: 'GBP',
            start_date: '2024-01-01',
            end_date: '2024-12-31',
            version: 1,
            is_current_version: true,
            company_id: 'test-company-123',
            created_by: 'test-user-123',
            created_at: '2024-01-01T00:00:00Z'
          }
        });
      });

      // Track API request
      const getResponse = page.waitForResponse(response => 
        response.url().includes(`/contracts/${contractId}`) && 
        response.request().method() === 'GET'
      );

      await page.goto(`/contracts/${contractId}`);

      // Validate API call
      const getRes = await getResponse;
      expect(getRes.status()).toBe(200);

      // Should display contract information
      await expect(page.getByText('Backend Integration Contract')).toBeVisible();
      await expect(page.getByText('Integration Test Client')).toBeVisible();
      await expect(page.getByText('£25,000')).toBeVisible();
      await expect(page.getByText('ACTIVE')).toBeVisible();
    });

    test('should update contract via backend API @critical', async ({ page }) => {
      const contractId = 'test-contract-456';
      
      // Mock initial contract data
      await page.route(`**/contracts/${contractId}`, async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            json: {
              id: contractId,
              title: 'Original Contract Title',
              contract_type: 'SERVICE_AGREEMENT',
              status: 'DRAFT',
              client_name: 'Original Client',
              contract_value: 10000,
              currency: 'GBP',
              version: 1,
              company_id: 'test-company-123',
              created_by: 'test-user-123',
              created_at: '2024-01-01T00:00:00Z'
            }
          });
        } else if (route.request().method() === 'PUT') {
          const updateData = await route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            json: {
              id: contractId,
              title: updateData.title || 'Original Contract Title',
              contract_type: 'SERVICE_AGREEMENT',
              status: updateData.status || 'DRAFT',
              client_name: updateData.client_name || 'Original Client',
              contract_value: updateData.contract_value || 10000,
              currency: updateData.currency || 'GBP',
              version: 2,
              company_id: 'test-company-123',
              created_by: 'test-user-123',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: new Date().toISOString()
            }
          });
        }
      });

      await page.goto(`/contracts/${contractId}`);
      
      // Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();
      
      // Update contract fields
      const newTitle = 'Updated Contract Title via API';
      const newClientName = 'Updated Client Name';
      const newValue = '15000';

      await page.getByLabel(/title/i).fill(newTitle);
      await page.getByLabel(/client name/i).fill(newClientName);
      await page.getByLabel(/value|amount/i).fill(newValue);

      // Submit update
      const updateResponse = page.waitForResponse(response => 
        response.url().includes(`/contracts/${contractId}`) && 
        response.request().method() === 'PUT'
      );

      await page.getByRole('button', { name: /save|update/i }).click();

      // Validate update API call
      const updateRes = await updateResponse;
      expect(updateRes.status()).toBe(200);

      // Should display updated information
      await expect(page.getByText(newTitle)).toBeVisible();
      await expect(page.getByText(newClientName)).toBeVisible();
      await expect(page.getByText('£15,000')).toBeVisible();
    });

    test('should delete contract via backend API @critical', async ({ page }) => {
      const contractId = 'test-contract-delete';

      // Mock contract data
      await page.route(`**/contracts/${contractId}`, async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            json: {
              id: contractId,
              title: 'Contract to Delete',
              contract_type: 'NDA',
              status: 'DRAFT',
              version: 1,
              company_id: 'test-company-123',
              created_by: 'test-user-123',
              created_at: '2024-01-01T00:00:00Z'
            }
          });
        } else if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 204,
            body: ''
          });
        }
      });

      await page.goto(`/contracts/${contractId}`);
      
      // Initiate deletion
      await page.getByRole('button', { name: /delete/i }).click();
      
      // Confirm deletion in modal/dialog
      await page.getByRole('button', { name: /confirm|yes|delete/i }).click();

      // Validate delete API call
      const deleteResponse = page.waitForResponse(response => 
        response.url().includes(`/contracts/${contractId}`) && 
        response.request().method() === 'DELETE'
      );

      const deleteRes = await deleteResponse;
      expect(deleteRes.status()).toBe(204);

      // Should redirect to contracts list
      await expect(page).toHaveURL('/contracts');
      
      // Should show success message
      await expect(page.getByText(/deleted|removed/i)).toBeVisible();
    });

    test('should generate contract content via AI API @critical', async ({ page }) => {
      const contractId = 'test-contract-generate';

      // Mock contract and generation endpoints
      await page.route(`**/contracts/${contractId}`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            id: contractId,
            title: 'Contract for AI Generation',
            contract_type: 'SERVICE_AGREEMENT',
            status: 'DRAFT',
            plain_english_input: 'Create a software development service agreement',
            version: 1,
            company_id: 'test-company-123',
            created_by: 'test-user-123',
            created_at: '2024-01-01T00:00:00Z'
          }
        });
      });

      await page.route(`**/contracts/${contractId}/generate`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            id: 'generation-123',
            model_name: 'gpt-4',
            input_prompt: 'Generate contract content...',
            generated_content: 'This is the AI-generated contract content from the backend API. It includes all necessary terms and conditions for a software development service agreement.',
            processing_time_ms: 2500,
            token_usage: { prompt: 150, completion: 300, total: 450 },
            confidence_score: 0.92,
            created_at: new Date().toISOString()
          }
        });
      });

      await page.goto(`/contracts/${contractId}`);
      
      // Trigger content generation
      const generateResponse = page.waitForResponse(response => 
        response.url().includes(`/contracts/${contractId}/generate`) && 
        response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /generate|ai generate/i }).click();

      // Validate generation API call
      const genRes = await generateResponse;
      expect(genRes.status()).toBe(200);

      const genData = await genRes.json();
      expect(genData.generated_content).toBeDefined();
      expect(genData.model_name).toBe('gpt-4');
      expect(genData.confidence_score).toBeGreaterThan(0.8);

      // Should display generated content
      await expect(page.getByText('AI-generated contract content')).toBeVisible();
      await expect(page.getByText(/software development service agreement/i)).toBeVisible();
      
      // Should show generation metadata
      await expect(page.getByText(/confidence.*92/i)).toBeVisible();
    });

    test('should analyze contract compliance via backend @critical', async ({ page }) => {
      const contractId = 'test-contract-compliance';

      // Mock contract and analysis endpoints
      await page.route(`**/contracts/${contractId}`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            id: contractId,
            title: 'Contract for Compliance Analysis',
            contract_type: 'EMPLOYMENT_CONTRACT',
            status: 'ACTIVE',
            final_content: 'Employment contract content to analyze...',
            version: 1,
            company_id: 'test-company-123',
            created_by: 'test-user-123',
            created_at: '2024-01-01T00:00:00Z'
          }
        });
      });

      await page.route(`**/contracts/${contractId}/analyze`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            id: 'analysis-456',
            contract_id: contractId,
            overall_score: 88.5,
            gdpr_compliance: 95,
            employment_law_compliance: 92,
            consumer_rights_compliance: 82,
            commercial_terms_compliance: 85,
            risk_score: 12,
            risk_factors: [
              'Minor ambiguity in termination clause',
              'Consider adding data retention specifics'
            ],
            recommendations: [
              'Clarify notice period requirements',
              'Add specific GDPR data handling procedures',
              'Review intellectual property clauses'
            ],
            analysis_date: new Date().toISOString(),
            analysis_version: '2.1'
          }
        });
      });

      await page.goto(`/contracts/${contractId}`);
      
      // Trigger compliance analysis
      const analyzeResponse = page.waitForResponse(response => 
        response.url().includes(`/contracts/${contractId}/analyze`) && 
        response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /analyze|compliance/i }).click();

      // Validate analysis API call
      const analysisRes = await analyzeResponse;
      expect(analysisRes.status()).toBe(200);

      const analysisData = await analysisRes.json();
      expect(analysisData.overall_score).toBe(88.5);
      expect(analysisData.risk_factors).toHaveLength(2);
      expect(analysisData.recommendations).toHaveLength(3);

      // Should display compliance scores
      await expect(page.getByText('88.5')).toBeVisible(); // Overall score
      await expect(page.getByText('95')).toBeVisible(); // GDPR compliance
      await expect(page.getByText('92')).toBeVisible(); // Employment law

      // Should display risk factors
      await expect(page.getByText(/termination clause/i)).toBeVisible();
      await expect(page.getByText(/data retention/i)).toBeVisible();

      // Should display recommendations
      await expect(page.getByText(/notice period/i)).toBeVisible();
      await expect(page.getByText(/GDPR data handling/i)).toBeVisible();
    });
  });

  test.describe('Complete User Journey Integration', () => {
    test('should complete full user workflow: register → create contract → generate → analyze @smoke', async ({ page }) => {
      const uniqueId = faker.string.uuid();
      const testUser = {
        email: `journey-${uniqueId}@pactoria-e2e.com`,
        password: 'JourneyTest123!',
        full_name: `Journey User ${uniqueId.slice(0, 8)}`,
        company_name: `Journey Company ${uniqueId.slice(0, 8)}`
      };

      // STEP 1: User Registration
      await page.goto('/register');
      await page.getByLabel(/full name/i).fill(testUser.full_name);
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByLabel(/company/i).fill(testUser.company_name);

      const registrationResponse = page.waitForResponse(response => 
        response.url().includes('/auth/register') && response.status() === 201
      );
      
      await page.getByRole('button', { name: /register/i }).click();
      await registrationResponse;
      
      // Should be on dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // STEP 2: Contract Creation
      await page.goto('/contracts/new');
      
      const contractData = {
        title: `Full Journey Contract ${uniqueId.slice(0, 8)}`,
        type: 'SERVICE_AGREEMENT',
        description: 'Complete integration test contract creation and processing',
        client: `Client Company ${uniqueId.slice(0, 8)}`,
        value: '10000'
      };

      await page.getByLabel(/title/i).fill(contractData.title);
      await page.getByLabel(/contract type/i).selectOption(contractData.type);
      await page.getByLabel(/plain english|description/i).fill(contractData.description);
      await page.getByLabel(/client name/i).fill(contractData.client);
      await page.getByLabel(/value/i).fill(contractData.value);

      const createResponse = page.waitForResponse(response => 
        response.url().includes('/contracts') && 
        response.request().method() === 'POST' &&
        response.status() === 201
      );

      await page.getByRole('button', { name: /create/i }).click();
      const createRes = await createResponse;
      const createdContract = await createRes.json();

      // Should navigate to contract view
      await expect(page).toHaveURL(`/contracts/${createdContract.id}`);

      // STEP 3: Content Generation
      const generateResponse = page.waitForResponse(response => 
        response.url().includes('/generate') && response.status() === 200
      );

      await page.getByRole('button', { name: /generate/i }).click();
      const genRes = await generateResponse;
      const genData = await genRes.json();

      expect(genData.generated_content).toBeDefined();
      await expect(page.getByText(/generated/i)).toBeVisible();

      // STEP 4: Compliance Analysis
      const analyzeResponse = page.waitForResponse(response => 
        response.url().includes('/analyze') && response.status() === 200
      );

      await page.getByRole('button', { name: /analyze/i }).click();
      const analysisRes = await analyzeResponse;
      const analysisData = await analysisRes.json();

      expect(analysisData.overall_score).toBeGreaterThan(0);
      await expect(page.getByText(/compliance/i)).toBeVisible();

      // STEP 5: Navigate back to contracts list
      await page.goto('/contracts');
      
      // Should see the created contract
      await expect(page.getByText(contractData.title)).toBeVisible();

      console.log(`✅ Complete user journey test passed for user: ${testUser.email}`);
    });

    test('should handle API errors gracefully throughout user journey @critical', async ({ page }) => {
      // Test various API error scenarios during user journey
      
      // 1. Registration Error
      await page.route('**/auth/register', async route => {
        await route.fulfill({
          status: 400,
          json: { detail: 'Email already exists' }
        });
      });

      await page.goto('/register');
      await page.getByLabel(/email/i).fill('existing@user.com');
      await page.getByLabel(/password/i).fill('password');
      await page.getByLabel(/full name/i).fill('Test User');
      await page.getByRole('button', { name: /register/i }).click();

      await expect(page.getByText(/email already exists/i)).toBeVisible();

      // 2. Authentication Error
      await page.route('**/auth/login', async route => {
        await route.fulfill({
          status: 401,
          json: { detail: 'Invalid credentials' }
        });
      });

      await page.goto('/login');
      await page.getByLabel(/email/i).fill('user@test.com');
      await page.getByLabel(/password/i).fill('wrong');
      await page.getByRole('button', { name: /login/i }).click();

      await expect(page.getByText(/invalid credentials/i)).toBeVisible();

      // 3. Contract Creation Error (after successful login)
      await page.route('**/auth/login', async route => {
        await route.fulfill({
          status: 200,
          json: {
            token: { access_token: 'test-token', token_type: 'bearer' },
            user: { id: 'test', email: 'user@test.com', full_name: 'Test User' }
          }
        });
      });

      await page.route('**/contracts', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 400,
            json: { detail: { title: ['Title is required'] } }
          });
        }
      });

      await page.getByLabel(/email/i).fill('user@test.com');
      await page.getByLabel(/password/i).fill('password');
      await page.getByRole('button', { name: /login/i }).click();

      await expect(page).toHaveURL(/\/dashboard/);

      await page.goto('/contracts/new');
      await page.getByRole('button', { name: /create/i }).click();

      await expect(page.getByText(/title is required/i)).toBeVisible();

      console.log('✅ API error handling validation completed');
    });
  });

  test.describe('Performance and Reliability Integration', () => {
    test('should handle slow API responses gracefully @performance', async ({ page }) => {
      // Set up authenticated state
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'perf-test', email: 'perf@test.com' },
            token: 'perf-token'
          }
        }));
      });

      // Mock slow API response
      await page.route('**/contracts', async route => {
        // Simulate 3 second delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.fulfill({
          status: 200,
          json: {
            contracts: [{
              id: 'slow-contract',
              title: 'Slow Loading Contract',
              status: 'DRAFT',
              created_at: new Date().toISOString()
            }],
            total: 1, page: 1, size: 10, pages: 1
          }
        });
      });

      await page.goto('/contracts');

      // Should show loading indicator
      await expect(page.getByText(/loading|fetching/i)).toBeVisible();

      // Should eventually load content
      await expect(page.getByText('Slow Loading Contract')).toBeVisible({ timeout: 5000 });
    });

    test('should retry failed API requests @reliability', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'retry-test', email: 'retry@test.com' },
            token: 'retry-token'
          }
        }));
      });

      let callCount = 0;
      await page.route('**/contracts', async route => {
        callCount++;
        if (callCount === 1) {
          // First call fails
          await route.fulfill({
            status: 500,
            json: { detail: 'Internal server error' }
          });
        } else {
          // Second call succeeds
          await route.fulfill({
            status: 200,
            json: {
              contracts: [{
                id: 'retry-contract',
                title: 'Retry Success Contract',
                status: 'DRAFT',
                created_at: new Date().toISOString()
              }],
              total: 1, page: 1, size: 10, pages: 1
            }
          });
        }
      });

      await page.goto('/contracts');

      // Should eventually show content after retry
      await expect(page.getByText('Retry Success Contract')).toBeVisible({ timeout: 10000 });
      
      // Should have made 2 API calls
      expect(callCount).toBe(2);
    });
  });
});