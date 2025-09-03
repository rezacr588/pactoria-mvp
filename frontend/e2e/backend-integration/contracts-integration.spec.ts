import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * CONTRACTS BACKEND INTEGRATION TESTS
 * 
 * These tests validate the complete contract management workflow with real backend API calls.
 * They ensure CRUD operations work properly and test advanced features like AI generation and compliance analysis.
 */

test.describe('Contract Management Backend Integration', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  let authenticatedContext: any;
  let testUser: any;

  test.beforeAll(async ({ browser }) => {
    // Create authenticated context for contract tests
    testUser = {
      email: `contract-test-${faker.string.uuid()}@integration-test.com`,
      password: 'ContractTest123!',
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: `${faker.company.name()} Integration Test Ltd`
    };

    const context = await browser.newContext();
    const page = await context.newPage();

    // Register test user
    await page.goto('/register');
    await page.getByLabel(/full name|name/i).fill(testUser.full_name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByLabel(/company/i).fill(testUser.company_name);
    
    const regResponse = page.waitForResponse(response => response.url().includes('/auth/register'));
    await page.getByRole('button', { name: /register|sign up/i }).click();
    await regResponse;
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Store authentication state for reuse
    const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
    const tokenStorage = await page.evaluate(() => localStorage.getItem('auth-token'));
    
    authenticatedContext = { authStorage, tokenStorage };
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    // Set up authenticated state for each test
    await page.addInitScript(({ authStorage, tokenStorage }) => {
      if (authStorage) localStorage.setItem('auth-storage', authStorage);
      if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
    }, authenticatedContext);
  });

  test.describe('Contract Creation Integration', () => {
    test('should create service agreement contract via API @smoke @integration', async ({ page }) => {
      const testContract = {
        title: `Service Agreement ${faker.string.uuid()}`,
        contract_type: 'SERVICE_AGREEMENT',
        plain_english_input: `Create a comprehensive service agreement for ${faker.company.buzzPhrase()} services. The contractor will provide ${faker.company.buzzNoun()} solutions for a period of 6 months starting next month.`,
        client_name: faker.company.name(),
        client_email: faker.internet.email(),
        supplier_name: faker.company.name(),
        contract_value: faker.number.int({ min: 5000, max: 50000 }),
        currency: 'GBP',
        start_date: faker.date.future().toISOString().split('T')[0],
        end_date: faker.date.future().toISOString().split('T')[0]
      };

      await page.goto('/contracts/new');

      // Fill contract creation form
      await page.getByLabel(/title/i).fill(testContract.title);
      
      // Select contract type
      await page.getByLabel(/contract type/i).selectOption(testContract.contract_type);
      
      await page.getByLabel(/plain english|description/i).fill(testContract.plain_english_input);
      await page.getByLabel(/client name/i).fill(testContract.client_name);
      await page.getByLabel(/client email/i).fill(testContract.client_email);
      await page.getByLabel(/supplier name/i).fill(testContract.supplier_name);
      await page.getByLabel(/contract value|value/i).fill(testContract.contract_value.toString());
      
      // Select currency
      await page.getByLabel(/currency/i).selectOption(testContract.currency);
      
      await page.getByLabel(/start date/i).fill(testContract.start_date);
      await page.getByLabel(/end date/i).fill(testContract.end_date);

      // Track contract creation API call
      const createContractPromise = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.request().method() === 'POST' &&
                   response.status() === 201
      );

      await page.getByRole('button', { name: /create|submit/i }).click();

      // Validate API response
      const createResponse = await createContractPromise;
      const createdContract = await createResponse.json();

      expect(createdContract.id).toBeDefined();
      expect(createdContract.title).toBe(testContract.title);
      expect(createdContract.contract_type).toBe(testContract.contract_type);
      expect(createdContract.status).toBe('DRAFT');
      expect(createdContract.client_name).toBe(testContract.client_name);
      expect(createdContract.contract_value).toBe(testContract.contract_value);

      // Should redirect to contract view
      await expect(page).toHaveURL(`/contracts/${createdContract.id}`);
      
      // Should display contract details
      await expect(page.getByText(testContract.title)).toBeVisible();
      await expect(page.getByText(testContract.client_name)).toBeVisible();
      await expect(page.getByText('DRAFT')).toBeVisible();
    });

    test('should create NDA contract with minimal data @integration', async ({ page }) => {
      const testNDA = {
        title: `NDA Agreement ${faker.string.uuid()}`,
        contract_type: 'NDA',
        plain_english_input: 'Create a standard non-disclosure agreement for sharing confidential business information with a potential partner.',
        client_name: faker.company.name()
      };

      await page.goto('/contracts/new');

      await page.getByLabel(/title/i).fill(testNDA.title);
      await page.getByLabel(/contract type/i).selectOption(testNDA.contract_type);
      await page.getByLabel(/plain english|description/i).fill(testNDA.plain_english_input);
      await page.getByLabel(/client name/i).fill(testNDA.client_name);

      const createResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /create|submit/i }).click();

      const response = await createResponse;
      expect(response.status()).toBe(201);

      const contract = await response.json();
      expect(contract.contract_type).toBe('NDA');
      expect(contract.client_name).toBe(testNDA.client_name);

      await expect(page).toHaveURL(`/contracts/${contract.id}`);
    });

    test('should handle validation errors during contract creation @integration', async ({ page }) => {
      await page.goto('/contracts/new');

      // Try to create contract without required fields
      await page.getByRole('button', { name: /create|submit/i }).click();

      // Should show client-side validation first
      const titleInput = page.getByLabel(/title/i);
      const isInvalid = await titleInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
      expect(isInvalid).toBe(true);

      // Fill in only title and try again
      await page.getByLabel(/title/i).fill('Test Contract');
      await page.getByRole('button', { name: /create|submit/i }).click();

      // Should show more validation errors
      await expect(page.getByLabel(/contract type/i)).toBeFocused();
    });

    test('should handle server errors during contract creation @integration', async ({ page }) => {
      // Mock server error
      await page.route('**/contracts', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            json: { detail: 'Internal server error during contract creation' }
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/contracts/new');

      await page.getByLabel(/title/i).fill('Error Test Contract');
      await page.getByLabel(/contract type/i).selectOption('SERVICE_AGREEMENT');
      await page.getByLabel(/plain english|description/i).fill('This should cause a server error');

      await page.getByRole('button', { name: /create|submit/i }).click();

      // Should display error message
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByText(/server error|failed to create/i)).toBeVisible();

      // Should remain on creation page
      await expect(page).toHaveURL(/\/contracts\/new/);
    });
  });

  test.describe('Contract Reading and Display Integration', () => {
    let createdContractId: string;

    test.beforeAll(async ({ browser }) => {
      // Create a test contract to use in read operations
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      await page.goto('/contracts/new');

      const testContract = {
        title: `Read Test Contract ${faker.string.uuid()}`,
        contract_type: 'EMPLOYMENT_CONTRACT',
        plain_english_input: 'Employment contract for senior developer position',
        client_name: 'Read Test Company',
        contract_value: 65000
      };

      await page.getByLabel(/title/i).fill(testContract.title);
      await page.getByLabel(/contract type/i).selectOption(testContract.contract_type);
      await page.getByLabel(/plain english|description/i).fill(testContract.plain_english_input);
      await page.getByLabel(/client name/i).fill(testContract.client_name);
      await page.getByLabel(/contract value|value/i).fill(testContract.contract_value.toString());

      const createResponse = page.waitForResponse(response => response.url().includes('/contracts') && response.request().method() === 'POST');
      await page.getByRole('button', { name: /create|submit/i }).click();
      
      const response = await createResponse;
      const contract = await response.json();
      createdContractId = contract.id;

      await context.close();
    });

    test('should fetch and display contract details @smoke @integration', async ({ page }) => {
      const contractResponse = page.waitForResponse(
        response => response.url().includes(`/contracts/${createdContractId}`) && 
                   response.request().method() === 'GET'
      );

      await page.goto(`/contracts/${createdContractId}`);

      // Validate API call
      const response = await contractResponse;
      expect(response.status()).toBe(200);

      const contractData = await response.json();
      expect(contractData.id).toBe(createdContractId);
      expect(contractData.contract_type).toBe('EMPLOYMENT_CONTRACT');
      expect(contractData.client_name).toBe('Read Test Company');

      // Should display contract information
      await expect(page.getByText(/Read Test Contract/)).toBeVisible();
      await expect(page.getByText('Read Test Company')).toBeVisible();
      await expect(page.getByText('EMPLOYMENT_CONTRACT')).toBeVisible();
      await expect(page.getByText('£65,000')).toBeVisible();
    });

    test('should handle contract not found error @integration', async ({ page }) => {
      const nonExistentId = 'non-existent-contract-id';

      await page.route(`**/contracts/${nonExistentId}`, async route => {
        await route.fulfill({
          status: 404,
          json: { detail: 'Contract not found' }
        });
      });

      await page.goto(`/contracts/${nonExistentId}`);

      // Should display error message
      await expect(page.getByText(/contract not found|404/i)).toBeVisible();
    });

    test('should list contracts with pagination @integration', async ({ page }) => {
      const contractsListResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.request().method() === 'GET' &&
                   !response.url().includes('/contracts/' + createdContractId)
      );

      await page.goto('/contracts');

      // Validate API call
      const listResponse = await contractsListResponse;
      expect(listResponse.status()).toBe(200);

      const contractsList = await listResponse.json();
      expect(contractsList).toHaveProperty('contracts');
      expect(contractsList).toHaveProperty('total');
      expect(contractsList).toHaveProperty('page');
      expect(contractsList.contracts).toBeInstanceOf(Array);

      // Should display contracts
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      // Should see our created contract
      await expect(page.getByText(/Read Test Contract/)).toBeVisible();
    });
  });

  test.describe('Contract Update Integration', () => {
    let updateTestContractId: string;

    test.beforeAll(async ({ browser }) => {
      // Create a contract for update testing
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      await page.goto('/contracts/new');

      const testContract = {
        title: `Update Test Contract ${faker.string.uuid()}`,
        contract_type: 'SERVICE_AGREEMENT',
        plain_english_input: 'Original contract content for update testing',
        client_name: 'Original Client Name',
        contract_value: 10000
      };

      await page.getByLabel(/title/i).fill(testContract.title);
      await page.getByLabel(/contract type/i).selectOption(testContract.contract_type);
      await page.getByLabel(/plain english|description/i).fill(testContract.plain_english_input);
      await page.getByLabel(/client name/i).fill(testContract.client_name);
      await page.getByLabel(/contract value|value/i).fill(testContract.contract_value.toString());

      const createResponse = page.waitForResponse(response => response.url().includes('/contracts') && response.request().method() === 'POST');
      await page.getByRole('button', { name: /create|submit/i }).click();
      
      const response = await createResponse;
      const contract = await response.json();
      updateTestContractId = contract.id;

      await context.close();
    });

    test('should update contract details via API @integration', async ({ page }) => {
      await page.goto(`/contracts/${updateTestContractId}`);

      // Enter edit mode
      await page.getByRole('button', { name: /edit/i }).click();

      const updatedData = {
        title: 'Updated Contract Title',
        client_name: 'Updated Client Name',
        contract_value: '15000'
      };

      // Update fields
      await page.getByLabel(/title/i).fill(updatedData.title);
      await page.getByLabel(/client name/i).fill(updatedData.client_name);
      await page.getByLabel(/contract value|value/i).fill(updatedData.contract_value);

      // Track update API call
      const updateResponse = page.waitForResponse(
        response => response.url().includes(`/contracts/${updateTestContractId}`) && 
                   response.request().method() === 'PUT'
      );

      await page.getByRole('button', { name: /save|update/i }).click();

      // Validate API call
      const response = await updateResponse;
      expect(response.status()).toBe(200);

      const updatedContract = await response.json();
      expect(updatedContract.title).toBe(updatedData.title);
      expect(updatedContract.client_name).toBe(updatedData.client_name);
      expect(updatedContract.contract_value).toBe(parseInt(updatedData.contract_value));

      // Should display updated information
      await expect(page.getByText(updatedData.title)).toBeVisible();
      await expect(page.getByText(updatedData.client_name)).toBeVisible();
      await expect(page.getByText('£15,000')).toBeVisible();
    });

    test('should update contract status @integration', async ({ page }) => {
      await page.goto(`/contracts/${updateTestContractId}`);

      // Change status from DRAFT to ACTIVE
      const statusDropdown = page.getByTestId('status-dropdown');
      if (await statusDropdown.isVisible()) {
        await statusDropdown.selectOption('ACTIVE');

        const updateResponse = page.waitForResponse(
          response => response.url().includes(`/contracts/${updateTestContractId}`) && 
                     response.request().method() === 'PUT'
        );

        await updateResponse;

        // Should display new status
        await expect(page.getByText('ACTIVE')).toBeVisible();
      }
    });
  });

  test.describe('Contract Deletion Integration', () => {
    test('should delete contract via API @integration', async ({ page }) => {
      // First create a contract to delete
      await page.goto('/contracts/new');

      const testContract = {
        title: `Delete Test Contract ${faker.string.uuid()}`,
        contract_type: 'NDA',
        plain_english_input: 'Contract created specifically for deletion testing'
      };

      await page.getByLabel(/title/i).fill(testContract.title);
      await page.getByLabel(/contract type/i).selectOption(testContract.contract_type);
      await page.getByLabel(/plain english|description/i).fill(testContract.plain_english_input);

      const createResponse = page.waitForResponse(response => response.url().includes('/contracts') && response.request().method() === 'POST');
      await page.getByRole('button', { name: /create|submit/i }).click();
      
      const response = await createResponse;
      const contract = await response.json();
      const contractId = contract.id;

      // Now delete it
      await page.getByRole('button', { name: /delete/i }).click();

      // Confirm deletion
      await page.getByRole('button', { name: /confirm|yes|delete/i }).click();

      // Track delete API call
      const deleteResponse = page.waitForResponse(
        response => response.url().includes(`/contracts/${contractId}`) && 
                   response.request().method() === 'DELETE'
      );

      const deleteRes = await deleteResponse;
      expect(deleteRes.status()).toBe(204);

      // Should redirect to contracts list
      await expect(page).toHaveURL('/contracts');
      
      // Should show success message
      await expect(page.getByText(/deleted|removed/i)).toBeVisible();
    });
  });

  test.describe('AI Features Integration', () => {
    let aiTestContractId: string;

    test.beforeAll(async ({ browser }) => {
      // Create a contract for AI testing
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.addInitScript(({ authStorage, tokenStorage }) => {
        if (authStorage) localStorage.setItem('auth-storage', authStorage);
        if (tokenStorage) localStorage.setItem('auth-token', tokenStorage);
      }, authenticatedContext);

      await page.goto('/contracts/new');

      const testContract = {
        title: `AI Test Contract ${faker.string.uuid()}`,
        contract_type: 'SERVICE_AGREEMENT',
        plain_english_input: 'Create a comprehensive service agreement for web development services. The contractor will provide full-stack development services including frontend, backend, and database design.',
        client_name: 'AI Test Client'
      };

      await page.getByLabel(/title/i).fill(testContract.title);
      await page.getByLabel(/contract type/i).selectOption(testContract.contract_type);
      await page.getByLabel(/plain english|description/i).fill(testContract.plain_english_input);
      await page.getByLabel(/client name/i).fill(testContract.client_name);

      const createResponse = page.waitForResponse(response => response.url().includes('/contracts') && response.request().method() === 'POST');
      await page.getByRole('button', { name: /create|submit/i }).click();
      
      const response = await createResponse;
      const contract = await response.json();
      aiTestContractId = contract.id;

      await context.close();
    });

    test('should generate contract content using AI @integration', async ({ page }) => {
      await page.goto(`/contracts/${aiTestContractId}`);

      // Track generation API call
      const generateResponse = page.waitForResponse(
        response => response.url().includes(`/contracts/${aiTestContractId}/generate`) && 
                   response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /generate|ai generate/i }).click();

      // Validate generation response
      const response = await generateResponse;
      expect(response.status()).toBe(200);

      const generationData = await response.json();
      expect(generationData).toHaveProperty('generated_content');
      expect(generationData).toHaveProperty('model_name');
      expect(generationData).toHaveProperty('confidence_score');
      expect(generationData.generated_content).toBeTruthy();

      // Should display generated content
      await expect(page.getByText(/generated|ai.*content/i)).toBeVisible();
      
      // Should show generation metadata
      if (generationData.confidence_score) {
        const confidencePercent = Math.round(generationData.confidence_score * 100);
        await expect(page.getByText(new RegExp(`${confidencePercent}`, 'i'))).toBeVisible();
      }
    });

    test('should analyze contract compliance @integration', async ({ page }) => {
      await page.goto(`/contracts/${aiTestContractId}`);

      // Track analysis API call
      const analyzeResponse = page.waitForResponse(
        response => response.url().includes(`/contracts/${aiTestContractId}/analyze`) && 
                   response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /analyze|compliance/i }).click();

      // Validate analysis response
      const response = await analyzeResponse;
      expect(response.status()).toBe(200);

      const analysisData = await response.json();
      expect(analysisData).toHaveProperty('overall_score');
      expect(analysisData).toHaveProperty('risk_factors');
      expect(analysisData).toHaveProperty('recommendations');
      expect(typeof analysisData.overall_score).toBe('number');

      // Should display compliance information
      await expect(page.getByText(/compliance|score/i)).toBeVisible();
      await expect(page.getByText(analysisData.overall_score.toString())).toBeVisible();

      // Should display risk factors and recommendations
      if (analysisData.risk_factors.length > 0) {
        await expect(page.getByText(/risk.*factor/i)).toBeVisible();
      }
      
      if (analysisData.recommendations.length > 0) {
        await expect(page.getByText(/recommendation/i)).toBeVisible();
      }
    });
  });

  test.describe('Contract Search and Filtering Integration', () => {
    test('should search contracts via backend API @integration', async ({ page }) => {
      await page.goto('/contracts');

      const searchQuery = 'Test Contract';

      // Track search API call
      const searchResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.url().includes(`search=${encodeURIComponent(searchQuery)}`) &&
                   response.request().method() === 'GET'
      );

      await page.getByTestId('search-input').fill(searchQuery);
      await page.keyboard.press('Enter');

      // Validate search API call
      const response = await searchResponse;
      expect(response.status()).toBe(200);

      const searchResults = await response.json();
      expect(searchResults).toHaveProperty('contracts');
      expect(searchResults.contracts).toBeInstanceOf(Array);

      // Should display search results or empty state
      await expect(page.getByTestId('contracts-list')).toBeVisible();
    });

    test('should filter contracts by status @integration', async ({ page }) => {
      await page.goto('/contracts');

      const statusFilter = 'DRAFT';

      // Track filter API call
      const filterResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.url().includes(`status=${statusFilter}`) &&
                   response.request().method() === 'GET'
      );

      await page.getByLabel(/filter by status/i).selectOption(statusFilter);

      // Validate filter API call
      const response = await filterResponse;
      expect(response.status()).toBe(200);

      const filterResults = await response.json();
      expect(filterResults).toHaveProperty('contracts');
      
      // All returned contracts should have the filtered status
      filterResults.contracts.forEach((contract: any) => {
        expect(contract.status).toBe(statusFilter);
      });
    });

    test('should filter contracts by type @integration', async ({ page }) => {
      await page.goto('/contracts');

      const typeFilter = 'SERVICE_AGREEMENT';

      const filterResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.url().includes(`contract_type=${typeFilter}`) &&
                   response.request().method() === 'GET'
      );

      await page.getByLabel(/filter by type/i).selectOption(typeFilter);

      const response = await filterResponse;
      expect(response.status()).toBe(200);

      const filterResults = await response.json();
      filterResults.contracts.forEach((contract: any) => {
        expect(contract.contract_type).toBe(typeFilter);
      });
    });
  });

  test.describe('Contract Templates Integration', () => {
    test('should fetch and display contract templates @integration', async ({ page }) => {
      // Track templates API call
      const templatesResponse = page.waitForResponse(
        response => response.url().includes('/contracts/templates') && 
                   response.request().method() === 'GET'
      );

      await page.goto('/contracts/new');

      // Validate templates API call
      const response = await templatesResponse;
      expect(response.status()).toBe(200);

      const templates = await response.json();
      expect(templates).toBeInstanceOf(Array);

      // Should have template selection if templates exist
      if (templates.length > 0) {
        await expect(page.getByLabel(/template/i)).toBeVisible();
      }
    });
  });

  test.describe('Error Handling Integration', () => {
    test('should handle network errors gracefully @integration', async ({ page }) => {
      await page.goto('/contracts');

      // Mock network failure
      await page.route('**/contracts', async route => {
        if (route.request().method() === 'GET') {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });

      // Reload to trigger the failed request
      await page.reload();

      // Should show error state
      await expect(page.getByText(/error|failed.*load/i)).toBeVisible();

      // Should provide retry mechanism
      const dismissButton = page.getByText(/dismiss|retry/i);
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
      }
    });

    test('should handle server errors with proper user feedback @integration', async ({ page }) => {
      // Mock server error for contract listing
      await page.route('**/contracts', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 500,
            json: { detail: 'Internal server error' }
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/contracts');

      // Should display error message
      await expect(page.getByText(/error.*loading|server.*error/i)).toBeVisible();
    });
  });

  test.describe('Performance and Reliability @integration', () => {
    test('should handle large contract lists efficiently', async ({ page }) => {
      await page.goto('/contracts');

      // Wait for contracts to load
      await page.waitForSelector('[data-testid="contracts-list"]', { timeout: 10000 });

      // Should handle pagination if many contracts exist
      const paginationElement = page.getByTestId('pagination');
      if (await paginationElement.isVisible()) {
        // Test pagination works
        const nextButton = page.getByRole('button', { name: /next|2/i });
        if (await nextButton.isVisible() && await nextButton.isEnabled()) {
          const pageChangeResponse = page.waitForResponse(
            response => response.url().includes('/contracts') && response.url().includes('page=2')
          );
          
          await nextButton.click();
          await pageChangeResponse;
          
          // Should load second page
          await expect(page.getByTestId('contracts-list')).toBeVisible();
        }
      }
    });
  });
});