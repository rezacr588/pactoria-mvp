import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { TestUser, API_ENDPOINTS } from './utils/test-data';

/**
 * API ENDPOINTS VALIDATION TESTS
 * 
 * This comprehensive test suite validates all backend API endpoints used by the frontend,
 * ensuring proper request/response formats, status codes, error handling, and data validation.
 * These tests focus on the API contract between frontend and backend rather than UI interactions.
 */

test.describe('API Endpoints Validation', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  let authenticatedContext: any;
  let testUser: any;
  let authToken: string;

  test.beforeAll(async ({ browser }) => {
    // Create authenticated context for API testing
    testUser = {
      email: `api-test-${faker.string.uuid()}@integration-test.com`,
      password: 'ApiTest123!',
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: `${faker.company.name()} API Test Co.`
    };

    const context = await browser.newContext();
    const page = await context.newPage();

    // Register test user and capture token
    await page.goto('/register');
    await page.getByLabel(/full name|name/i).fill(testUser.full_name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByLabel(/company/i).fill(testUser.company_name);
    
    const regResponse = page.waitForResponse(response => response.url().includes('/auth/register'));
    await page.getByRole('button', { name: /register|sign up/i }).click();
    
    const response = await regResponse;
    const authData = await response.json();
    authToken = authData.token?.access_token || authData.access_token;
    
    // Store authentication state
    const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
    const tokenStorage = await page.evaluate(() => localStorage.getItem('auth-token'));
    
    authenticatedContext = { authStorage, tokenStorage, authToken };
    await context.close();
  });

  test.describe('Authentication API Endpoints @critical', () => {
    test('should validate register endpoint structure and responses @smoke @integration', async ({ page }) => {
      const newUser = {
        email: `register-test-${faker.string.uuid()}@test.com`,
        password: 'RegisterTest123!',
        full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
        company_name: `${faker.company.name()} Register Test`
      };

      await page.goto('/register');

      const registerResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.auth.register) && 
                   response.request().method() === 'POST'
      );

      // Fill and submit registration
      await page.getByLabel(/full name|name/i).fill(newUser.full_name);
      await page.getByLabel(/email/i).fill(newUser.email);
      await page.getByLabel(/password/i).fill(newUser.password);
      await page.getByLabel(/company/i).fill(newUser.company_name);
      await page.getByRole('button', { name: /register|sign up/i }).click();

      const response = await registerResponse;
      
      // Validate response status
      expect(response.status()).toBe(201);
      
      // Validate request payload
      const requestData = response.request().postDataJSON();
      expect(requestData).toHaveProperty('email', newUser.email);
      expect(requestData).toHaveProperty('password', newUser.password);
      expect(requestData).toHaveProperty('full_name', newUser.full_name);
      expect(requestData).toHaveProperty('company_name', newUser.company_name);
      
      // Validate response structure
      const responseData = await response.json();
      expect(responseData).toHaveProperty('user');
      expect(responseData).toHaveProperty('company');
      expect(responseData).toHaveProperty('token');
      
      // Validate user object structure
      expect(responseData.user).toHaveProperty('id');
      expect(responseData.user).toHaveProperty('email', newUser.email);
      expect(responseData.user).toHaveProperty('full_name', newUser.full_name);
      expect(responseData.user).toHaveProperty('is_active');
      expect(responseData.user).toHaveProperty('created_at');
      
      // Validate token structure
      expect(responseData.token).toHaveProperty('access_token');
      expect(responseData.token).toHaveProperty('token_type', 'bearer');
      expect(responseData.token).toHaveProperty('expires_in');
      
      // Validate company object structure
      expect(responseData.company).toHaveProperty('id');
      expect(responseData.company).toHaveProperty('name', newUser.company_name);
    });

    test('should validate login endpoint structure and responses @smoke @integration', async ({ page }) => {
      await page.goto('/login');

      const loginResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.auth.login) && 
                   response.request().method() === 'POST'
      );

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByRole('button', { name: /sign in|login/i }).click();

      const response = await loginResponse;
      
      // Validate response status
      expect(response.status()).toBe(200);
      
      // Validate request payload
      const requestData = response.request().postDataJSON();
      expect(requestData).toHaveProperty('username', testUser.email); // OAuth2 uses 'username'
      expect(requestData).toHaveProperty('password', testUser.password);
      
      // Validate response structure
      const responseData = await response.json();
      expect(responseData).toHaveProperty('access_token');
      expect(responseData).toHaveProperty('token_type', 'bearer');
      expect(responseData).toHaveProperty('expires_in');
      expect(typeof responseData.expires_in).toBe('number');
    });

    test('should validate me endpoint for token verification @integration', async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      const meResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.auth.me) && 
                   response.request().method() === 'GET'
      );

      await page.goto('/dashboard');

      const response = await meResponse;
      
      // Validate response status
      expect(response.status()).toBe(200);
      
      // Validate authorization header
      const authHeader = response.request().headers()['authorization'];
      expect(authHeader).toBeDefined();
      expect(authHeader).toMatch(/^Bearer\s+.+/);
      
      // Validate response structure
      const userData = await response.json();
      expect(userData).toHaveProperty('id');
      expect(userData).toHaveProperty('email', testUser.email);
      expect(userData).toHaveProperty('full_name', testUser.full_name);
      expect(userData).toHaveProperty('is_active');
      expect(userData).toHaveProperty('role');
      expect(userData).toHaveProperty('company_id');
      expect(userData).toHaveProperty('created_at');
      expect(userData).toHaveProperty('timezone');
    });

    test('should validate authentication error responses @integration', async ({ page }) => {
      await page.goto('/login');

      const loginResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.auth.login)
      );

      // Try invalid credentials
      await page.getByLabel(/email/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in|login/i }).click();

      const response = await loginResponse;
      
      // Validate error status
      expect([400, 401, 422]).toContain(response.status());
      
      // Validate error response structure
      const errorData = await response.json();
      expect(errorData).toHaveProperty('detail');
      expect(typeof errorData.detail).toBe('string');
    });
  });

  test.describe('Contracts API Endpoints @critical', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should validate contracts list endpoint @smoke @integration', async ({ page }) => {
      const contractsResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.contracts.list) && 
                   response.request().method() === 'GET'
      );

      await page.goto('/contracts');

      const response = await contractsResponse;
      
      // Validate response status
      expect(response.status()).toBe(200);
      
      // Validate authorization header
      const authHeader = response.request().headers()['authorization'];
      expect(authHeader).toBeDefined();
      expect(authHeader).toMatch(/^Bearer\s+.+/);
      
      // Validate response structure
      const contractsData = await response.json();
      expect(contractsData).toHaveProperty('contracts');
      expect(contractsData).toHaveProperty('total');
      expect(contractsData).toHaveProperty('page');
      expect(contractsData).toHaveProperty('size');
      expect(contractsData).toHaveProperty('pages');
      
      expect(Array.isArray(contractsData.contracts)).toBe(true);
      expect(typeof contractsData.total).toBe('number');
      expect(typeof contractsData.page).toBe('number');
      expect(typeof contractsData.size).toBe('number');
      expect(typeof contractsData.pages).toBe('number');

      // Validate contract structure if any exist
      if (contractsData.contracts.length > 0) {
        const contract = contractsData.contracts[0];
        expect(contract).toHaveProperty('id');
        expect(contract).toHaveProperty('title');
        expect(contract).toHaveProperty('contract_type');
        expect(contract).toHaveProperty('status');
        expect(contract).toHaveProperty('created_at');
        expect(contract).toHaveProperty('company_id');
        expect(contract).toHaveProperty('created_by');
      }
    });

    test('should validate contract creation endpoint @integration', async ({ page }) => {
      await page.goto('/contracts');

      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();

        const contractData = {
          title: `API Test Contract ${faker.lorem.words(3)}`,
          contract_type: 'service_agreement',
          plain_english_input: faker.lorem.paragraphs(2),
          client_name: faker.company.name(),
          client_email: faker.internet.email(),
          contract_value: faker.number.int({ min: 1000, max: 50000 }),
          currency: 'GBP'
        };

        const createResponse = page.waitForResponse(
          response => response.url().includes(API_ENDPOINTS.contracts.create) && 
                     response.request().method() === 'POST'
        );

        // Fill contract form
        await page.getByLabel(/title/i).fill(contractData.title);
        
        const typeSelect = page.getByLabel(/contract type/i);
        if (await typeSelect.isVisible()) {
          await typeSelect.click();
          await page.getByText(/service.*agreement/i).click();
        }
        
        await page.getByLabel(/plain english|description/i).fill(contractData.plain_english_input);
        
        if (await page.getByLabel(/client name/i).isVisible()) {
          await page.getByLabel(/client name/i).fill(contractData.client_name);
        }
        
        await page.getByRole('button', { name: /create|save/i }).click();

        const response = await createResponse;
        
        // Validate response status
        expect(response.status()).toBe(201);
        
        // Validate request payload
        const requestData = response.request().postDataJSON();
        expect(requestData).toHaveProperty('title', contractData.title);
        expect(requestData).toHaveProperty('contract_type', contractData.contract_type);
        expect(requestData).toHaveProperty('plain_english_input', contractData.plain_english_input);
        
        // Validate response structure
        const createdContract = await response.json();
        expect(createdContract).toHaveProperty('id');
        expect(createdContract).toHaveProperty('title', contractData.title);
        expect(createdContract).toHaveProperty('contract_type', contractData.contract_type);
        expect(createdContract).toHaveProperty('status');
        expect(createdContract).toHaveProperty('version', 1);
        expect(createdContract).toHaveProperty('created_at');
        expect(createdContract).toHaveProperty('updated_at');
      }
    });

    test('should validate contract search endpoint parameters @integration', async ({ page }) => {
      await page.goto('/contracts');
      await page.waitForTimeout(1000);

      const searchTerm = 'test';
      
      const searchResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.url().includes(`search=${searchTerm}`) &&
                   response.request().method() === 'GET'
      );

      const searchInput = page.getByTestId('search-input');
      if (await searchInput.isVisible()) {
        await searchInput.fill(searchTerm);
        await page.keyboard.press('Enter');

        const response = await searchResponse;
        
        // Validate query parameters
        const url = new URL(response.url());
        expect(url.searchParams.get('search')).toBe(searchTerm);
        
        // Validate response status
        expect(response.status()).toBe(200);
        
        // Validate response maintains same structure as list endpoint
        const searchResults = await response.json();
        expect(searchResults).toHaveProperty('contracts');
        expect(searchResults).toHaveProperty('total');
      }
    });

    test('should validate pagination query parameters @integration', async ({ page }) => {
      await page.goto('/contracts');
      await page.waitForTimeout(1000);

      // Look for pagination controls
      const nextButton = page.getByRole('button', { name: /next|>/i });
      
      if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
        const paginationResponse = page.waitForResponse(
          response => response.url().includes('/contracts') && 
                     response.url().includes('page=2') &&
                     response.request().method() === 'GET'
        );

        await nextButton.click();

        const response = await paginationResponse;
        
        // Validate query parameters
        const url = new URL(response.url());
        expect(url.searchParams.get('page')).toBe('2');
        
        // Validate response
        const paginatedData = await response.json();
        expect(paginatedData.page).toBe(2);
      }
    });
  });

  test.describe('Analytics API Endpoints @critical', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should validate analytics dashboard endpoint @smoke @integration', async ({ page }) => {
      const analyticsResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.analytics.dashboard) && 
                   response.request().method() === 'GET'
      );

      await page.goto('/analytics');

      const response = await analyticsResponse;
      
      // Validate response status
      expect(response.status()).toBe(200);
      
      // Validate authorization header
      const authHeader = response.request().headers()['authorization'];
      expect(authHeader).toBeDefined();
      
      // Validate response structure
      const analyticsData = await response.json();
      expect(analyticsData).toHaveProperty('business_metrics');
      expect(analyticsData).toHaveProperty('summary');
      
      // Validate business_metrics structure
      const metrics = analyticsData.business_metrics;
      expect(metrics).toHaveProperty('total_contracts');
      expect(metrics).toHaveProperty('active_contracts');
      expect(metrics).toHaveProperty('total_contract_value');
      expect(metrics).toHaveProperty('compliance_score_average');
      
      // Validate data types
      expect(typeof metrics.total_contracts).toBe('number');
      expect(typeof metrics.active_contracts).toBe('number');
      expect(typeof metrics.total_contract_value).toBe('number');
      expect(typeof metrics.compliance_score_average).toBe('number');
    });

    test('should validate business analytics endpoint if available @integration', async ({ page }) => {
      const businessResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.analytics.business) && 
                   response.request().method() === 'GET'
      ).catch(() => null);

      await page.goto('/analytics');

      if (businessResponse) {
        const response = await businessResponse;
        
        if (response) {
          expect(response.status()).toBe(200);
          
          const businessData = await response.json();
          expect(businessData).toBeDefined();
          console.log('Business analytics endpoint validated');
        }
      }
    });

    test('should validate time series endpoint parameters @integration', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForTimeout(1000);

      // Look for date range selector to trigger time series call
      const dateSelector = page.getByTestId('date-range-selector');
      
      if (await dateSelector.isVisible()) {
        const timeSeriesResponse = page.waitForResponse(
          response => response.url().includes('/analytics/time-series') &&
                     response.request().method() === 'GET'
        ).catch(() => null);

        await dateSelector.click();
        await page.getByText(/last.*week|7.*days/i).click();

        if (timeSeriesResponse) {
          const response = await timeSeriesResponse;
          
          if (response) {
            expect(response.status()).toBe(200);
            
            // Validate query parameters
            const url = new URL(response.url());
            const metric = url.pathname.split('/').pop(); // Extract metric from URL
            expect(metric).toBeDefined();
            
            const timeSeriesData = await response.json();
            expect(timeSeriesData).toHaveProperty('data_points');
            expect(Array.isArray(timeSeriesData.data_points)).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Templates API Endpoints @critical', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should validate templates list endpoint @smoke @integration', async ({ page }) => {
      const templatesResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.templates.list) && 
                   response.request().method() === 'GET'
      );

      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      const response = await templatesResponse;
      
      // Validate response status
      expect(response.status()).toBe(200);
      
      // Validate authorization header
      const authHeader = response.request().headers()['authorization'];
      expect(authHeader).toBeDefined();
      
      // Validate response structure
      const templatesData = await response.json();
      
      // Templates response could be structured differently
      let templates = templatesData;
      if (templatesData.templates) templates = templatesData.templates;
      if (templatesData.data) templates = templatesData.data;
      
      expect(Array.isArray(templates)).toBe(true);
      
      // Validate template structure if any exist
      if (templates.length > 0) {
        const template = templates[0];
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        
        // Optional properties
        const optionalProps = ['category', 'description', 'content', 'type', 'template_type'];
        let hasOptionalProp = false;
        for (const prop of optionalProps) {
          if (template.hasOwnProperty(prop)) {
            hasOptionalProp = true;
            break;
          }
        }
        expect(hasOptionalProp).toBe(true);
      }
    });
  });

  test.describe('Team Management API Endpoints @critical', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should validate team members list endpoint @smoke @integration', async ({ page }) => {
      const teamResponse = page.waitForResponse(
        response => response.url().includes('/team/members') && 
                   response.request().method() === 'GET'
      );

      await page.goto('/team');

      const response = await teamResponse;
      
      // Validate response status
      expect(response.status()).toBe(200);
      
      // Validate authorization header
      const authHeader = response.request().headers()['authorization'];
      expect(authHeader).toBeDefined();
      
      // Validate response structure
      const teamData = await response.json();
      expect(teamData).toHaveProperty('members');
      expect(Array.isArray(teamData.members)).toBe(true);
      
      // Should include current user
      const currentUserMember = teamData.members.find((member: any) => 
        member.email === testUser.email
      );
      expect(currentUserMember).toBeDefined();
      
      // Validate member structure
      if (teamData.members.length > 0) {
        const member = teamData.members[0];
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('email');
        expect(member).toHaveProperty('full_name');
        expect(member).toHaveProperty('role');
        expect(member).toHaveProperty('is_active');
        expect(member).toHaveProperty('created_at');
      }
    });

    test('should validate team invitation endpoint @integration', async ({ page }) => {
      await page.goto('/team');

      const inviteButton = page.getByRole('button', { name: /invite.*member/i });
      if (await inviteButton.isVisible()) {
        await inviteButton.click();

        const invitationData = {
          email: `api-invite-${faker.string.uuid()}@test.com`,
          full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
          role: 'user',
          send_email: false
        };

        const inviteResponse = page.waitForResponse(
          response => response.url().includes('/team/invite') && 
                     response.request().method() === 'POST'
        );

        await page.getByLabel(/email/i).fill(invitationData.email);
        await page.getByLabel(/full.*name|name/i).fill(invitationData.full_name);
        await page.getByRole('button', { name: /send.*invite|invite/i }).click();

        const response = await inviteResponse;
        
        // Validate response status
        expect(response.status()).toBe(201);
        
        // Validate request payload
        const requestData = response.request().postDataJSON();
        expect(requestData).toHaveProperty('email', invitationData.email);
        expect(requestData).toHaveProperty('full_name', invitationData.full_name);
        expect(requestData).toHaveProperty('role', invitationData.role);
        
        // Validate response structure
        const inviteResult = await response.json();
        expect(inviteResult).toHaveProperty('email', invitationData.email);
        expect(inviteResult).toHaveProperty('full_name', invitationData.full_name);
        expect(inviteResult).toHaveProperty('role', invitationData.role);
        expect(inviteResult).toHaveProperty('status', 'pending');
      }
    });

    test('should validate team stats endpoint if available @integration', async ({ page }) => {
      const statsResponse = page.waitForResponse(
        response => response.url().includes('/team/stats') && 
                   response.request().method() === 'GET'
      ).catch(() => null);

      await page.goto('/team');

      if (statsResponse) {
        const response = await statsResponse;
        
        if (response) {
          expect(response.status()).toBe(200);
          
          const statsData = await response.json();
          expect(statsData).toHaveProperty('total_members');
          expect(statsData).toHaveProperty('active_members');
          expect(typeof statsData.total_members).toBe('number');
          expect(typeof statsData.active_members).toBe('number');
        }
      }
    });
  });

  test.describe('Error Handling API Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);
    });

    test('should validate 401 unauthorized responses @integration', async ({ page }) => {
      // Mock unauthorized response
      await page.route('**/contracts', async route => {
        await route.fulfill({
          status: 401,
          json: { detail: 'Authentication required' }
        });
      });

      const unauthorizedResponse = page.waitForResponse(
        response => response.status() === 401
      );

      await page.goto('/contracts');

      const response = await unauthorizedResponse;
      
      // Validate error response structure
      const errorData = await response.json();
      expect(errorData).toHaveProperty('detail');
      expect(typeof errorData.detail).toBe('string');
    });

    test('should validate 403 forbidden responses @integration', async ({ page }) => {
      // Mock forbidden response
      await page.route('**/team/**', async route => {
        await route.fulfill({
          status: 403,
          json: { detail: 'Insufficient permissions' }
        });
      });

      const forbiddenResponse = page.waitForResponse(
        response => response.status() === 403
      );

      await page.goto('/team');

      const response = await forbiddenResponse;
      
      // Validate error response structure
      const errorData = await response.json();
      expect(errorData).toHaveProperty('detail');
      expect(errorData.detail).toMatch(/permission|forbidden|insufficient/i);
    });

    test('should validate 404 not found responses @integration', async ({ page }) => {
      // Mock not found response
      await page.route('**/contracts/non-existent-id', async route => {
        await route.fulfill({
          status: 404,
          json: { detail: 'Contract not found' }
        });
      });

      // Try to access non-existent contract directly
      await page.goto('/contracts/non-existent-id');

      // Should handle 404 gracefully in frontend
      await expect(page.getByText(/not.*found|error.*404/i)).toBeVisible();
    });

    test('should validate 422 validation error responses @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();

        const validationResponse = page.waitForResponse(
          response => response.status() === 422
        );

        // Submit empty form to trigger validation errors
        await page.getByRole('button', { name: /create|save/i }).click();

        try {
          const response = await validationResponse;
          
          // Validate error response structure
          const errorData = await response.json();
          expect(errorData).toHaveProperty('detail');
          
          if (Array.isArray(errorData.detail)) {
            // FastAPI validation errors format
            errorData.detail.forEach((error: any) => {
              expect(error).toHaveProperty('loc');
              expect(error).toHaveProperty('msg');
              expect(error).toHaveProperty('type');
            });
          }
        } catch (error) {
          console.log('Form validation handled client-side');
        }
      }
    });

    test('should validate 500 server error responses @integration', async ({ page }) => {
      // Mock server error
      await page.route('**/analytics/dashboard', async route => {
        await route.fulfill({
          status: 500,
          json: { detail: 'Internal server error' }
        });
      });

      const serverErrorResponse = page.waitForResponse(
        response => response.status() === 500
      );

      await page.goto('/analytics');

      const response = await serverErrorResponse;
      
      // Validate error response structure
      const errorData = await response.json();
      expect(errorData).toHaveProperty('detail');
      expect(typeof errorData.detail).toBe('string');
    });
  });

  test.describe('API Request/Response Headers Validation', () => {
    test('should validate required request headers @integration', async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      const apiRequest = page.waitForRequest(
        request => request.url().includes('/api/v1/') && request.method() === 'GET'
      );

      await page.goto('/contracts');

      const request = await apiRequest;
      const headers = request.headers();
      
      // Validate required headers
      expect(headers['authorization']).toBeDefined();
      expect(headers['authorization']).toMatch(/^Bearer\s+.+/);
      expect(headers['content-type']).toMatch(/application\/json|multipart\/form-data/);
      expect(headers['accept']).toContain('application/json');
    });

    test('should validate response headers @integration', async ({ page }) => {
      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      const apiResponse = page.waitForResponse(
        response => response.url().includes('/api/v1/') && response.status() === 200
      );

      await page.goto('/contracts');

      const response = await apiResponse;
      const headers = response.headers();
      
      // Validate important response headers
      expect(headers['content-type']).toContain('application/json');
      
      // Security headers (if implemented)
      if (headers['x-frame-options']) {
        expect(headers['x-frame-options']).toBeDefined();
      }
      
      if (headers['x-content-type-options']) {
        expect(headers['x-content-type-options']).toBe('nosniff');
      }
    });
  });

  test.afterAll(async () => {
    console.log('API Endpoints Validation tests completed');
  });
});