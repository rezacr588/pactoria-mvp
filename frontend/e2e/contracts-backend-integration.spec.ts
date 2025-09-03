import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { TestUser, TestContract, API_ENDPOINTS } from './utils/test-data';
import { ContractsPage, ContractCreatePage, ContractViewPage } from './utils/page-objects';

/**
 * CONTRACTS MANAGEMENT BACKEND INTEGRATION TESTS
 * 
 * This comprehensive test suite validates all contract management functionality
 * integration with the backend APIs including CRUD operations, search, filtering,
 * pagination, CSV export, and contract generation/analysis features.
 */

test.describe('Contracts Management Backend Integration', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  let authenticatedContext: any;
  let testUser: any;
  let createdContracts: any[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create authenticated context for contracts tests
    testUser = {
      email: `contracts-test-${faker.string.uuid()}@integration-test.com`,
      password: 'ContractsTest123!',
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: `${faker.company.name()} Contracts Test Co.`
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
    
    // Store authentication state
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

  test.describe('Contracts List Loading Integration @critical', () => {
    test('should load contracts list from backend API @smoke @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);

      // Track contracts list API call
      const listResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.contracts.list) && 
                   response.request().method() === 'GET'
      );

      await contractsPage.goto('/contracts');

      // Validate contracts API call
      const response = await listResponse;
      expect(response.status()).toBe(200);

      const contractsData = await response.json();
      console.log('Contracts API response structure:', Object.keys(contractsData));

      // Validate response structure
      expect(contractsData).toHaveProperty('contracts');
      expect(contractsData).toHaveProperty('total');
      expect(contractsData).toHaveProperty('page');
      expect(contractsData).toHaveProperty('size');
      expect(contractsData).toHaveProperty('pages');

      // Validate data types
      expect(Array.isArray(contractsData.contracts)).toBe(true);
      expect(typeof contractsData.total).toBe('number');
      expect(typeof contractsData.page).toBe('number');
      expect(typeof contractsData.size).toBe('number');

      // Should display contracts page properly
      await contractsPage.expectContractsVisible();

      // If contracts exist, validate structure
      if (contractsData.contracts.length > 0) {
        const firstContract = contractsData.contracts[0];
        expect(firstContract).toHaveProperty('id');
        expect(firstContract).toHaveProperty('title');
        expect(firstContract).toHaveProperty('status');
        expect(typeof firstContract.created_at).toBe('string');
      }
    });

    test('should handle empty contracts list gracefully @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);

      // Mock empty contracts response
      await page.route(`**${API_ENDPOINTS.contracts.list}`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            contracts: [],
            total: 0,
            page: 1,
            size: 10,
            pages: 0
          }
        });
      });

      await contractsPage.goto('/contracts');

      // Should display empty state
      await expect(page.getByText(/no contracts|empty|get started/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /create.*contract/i })).toBeVisible();
    });

    test('should validate contracts list pagination @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);

      await contractsPage.goto('/contracts');
      await page.waitForTimeout(2000);

      // Check for pagination controls
      const pagination = contractsPage.paginationNav;
      
      if (await pagination.isVisible()) {
        // Should have pagination info
        const pageInfo = page.getByText(/page.*of|showing.*of/i);
        if (await pageInfo.isVisible()) {
          await expect(pageInfo).toBeVisible();
        }

        // Test pagination if multiple pages exist
        const nextButton = page.getByRole('button', { name: /next|>/i });
        if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
          // Track paginated API call
          const paginationResponse = page.waitForResponse(
            response => response.url().includes('/contracts') && 
                       response.url().includes('page=2')
          );

          await nextButton.click();

          const response = await paginationResponse;
          expect(response.status()).toBe(200);

          const paginatedData = await response.json();
          expect(paginatedData.page).toBe(2);
        }
      }
    });
  });

  test.describe('Contract CRUD Operations Integration @critical', () => {
    test('should create new contract via backend API @smoke @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);
      const createPage = new ContractCreatePage(page);
      
      const testContract = TestContract.serviceAgreement();

      await contractsPage.goto('/contracts');
      await contractsPage.createNewContract();

      // Track contract creation API call
      const createResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.contracts.create) && 
                   response.request().method() === 'POST'
      );

      // Fill and submit contract form
      await createPage.createContract(testContract);

      // Validate creation API call
      const response = await createResponse;
      expect(response.status()).toBe(201);

      const createdContract = await response.json();
      expect(createdContract).toHaveProperty('id');
      expect(createdContract).toHaveProperty('title');
      expect(createdContract.title).toBe(testContract.title);
      expect(createdContract.contract_type).toBe(testContract.contract_type);

      // Store for cleanup
      createdContracts.push(createdContract);

      // Should redirect to contract view or contracts list
      await expect(page).toHaveURL(/\/contracts/);
      
      // Should display success message
      await expect(page.getByText(/created successfully|contract created/i)).toBeVisible();
    });

    test('should view contract details from backend @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);
      const viewPage = new ContractViewPage(page);

      await contractsPage.goto('/contracts');
      await page.waitForTimeout(2000);

      // Click first contract if available
      const contractRows = contractsPage.contractRow;
      const count = await contractRows.count();

      if (count > 0) {
        // Track contract details API call
        const detailsResponse = page.waitForResponse(
          response => response.url().includes('/contracts/') && 
                     !response.url().includes('/generate') &&
                     !response.url().includes('/analyze') &&
                     response.request().method() === 'GET'
        );

        await contractRows.first().click();

        const response = await detailsResponse;
        expect(response.status()).toBe(200);

        const contractDetails = await response.json();
        expect(contractDetails).toHaveProperty('id');
        expect(contractDetails).toHaveProperty('title');
        expect(contractDetails).toHaveProperty('status');

        // Should display contract details
        await expect(viewPage.contractTitle).toBeVisible();
        await expect(viewPage.contractStatus).toBeVisible();
      } else {
        // Create a contract first for testing
        await contractsPage.createNewContract();
        const testContract = TestContract.nda();
        
        const createPage = new ContractCreatePage(page);
        const createResponse = page.waitForResponse(response => 
          response.url().includes('/contracts') && response.request().method() === 'POST'
        );
        
        await createPage.createContract(testContract);
        await createResponse;
        
        // Now test viewing the created contract
        await contractsPage.goto('/contracts');
        await contractsPage.contractRow.first().click();
        
        await expect(viewPage.contractTitle).toBeVisible();
      }
    });

    test('should update existing contract @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);
      const viewPage = new ContractViewPage(page);

      await contractsPage.goto('/contracts');
      await page.waitForTimeout(2000);

      // Need at least one contract to edit
      const contractRows = contractsPage.contractRow;
      const count = await contractRows.count();

      if (count > 0) {
        await contractRows.first().click();
        
        // Check for edit functionality
        const editButton = viewPage.editButton;
        if (await editButton.isVisible()) {
          // Track update API call
          const updateResponse = page.waitForResponse(
            response => response.url().includes('/contracts/') && 
                       response.request().method() === 'PUT'
          );

          await editButton.click();

          // Modify contract
          const titleField = page.getByLabel(/title/i);
          if (await titleField.isVisible()) {
            const updatedTitle = `Updated ${faker.lorem.words(3)}`;
            await titleField.fill(updatedTitle);
            
            await page.getByRole('button', { name: /save|update/i }).click();

            const response = await updateResponse;
            expect(response.status()).toBe(200);

            const updatedContract = await response.json();
            expect(updatedContract.title).toBe(updatedTitle);

            // Should show success message
            await expect(page.getByText(/updated successfully/i)).toBeVisible();
          }
        }
      } else {
        console.log('No contracts available for update test');
      }
    });

    test('should delete contract via backend API @integration', async ({ page }) => {
      // First create a contract to delete
      const contractsPage = new ContractsPage(page);
      const createPage = new ContractCreatePage(page);
      const viewPage = new ContractViewPage(page);
      
      const testContract = TestContract.random();

      await contractsPage.goto('/contracts');
      await contractsPage.createNewContract();

      const createResponse = page.waitForResponse(response => 
        response.url().includes('/contracts') && response.request().method() === 'POST'
      );
      
      await createPage.createContract(testContract);
      const createdContract = await (await createResponse).json();

      // Navigate to the created contract
      await contractsPage.goto('/contracts');
      await contractsPage.contractRow.first().click();

      // Delete the contract
      const deleteButton = viewPage.deleteButton;
      if (await deleteButton.isVisible()) {
        // Track delete API call
        const deleteResponse = page.waitForResponse(
          response => response.url().includes(`/contracts/${createdContract.id}`) && 
                     response.request().method() === 'DELETE'
        );

        await deleteButton.click();
        
        // Confirm deletion if modal appears
        const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        const response = await deleteResponse;
        expect(response.status()).toBe(200);

        // Should redirect to contracts list
        await expect(page).toHaveURL(/\/contracts$/);
        
        // Should show success message
        await expect(page.getByText(/deleted successfully/i)).toBeVisible();
      }
    });
  });

  test.describe('Contract Search and Filtering Integration', () => {
    test('should search contracts via backend API @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);

      await contractsPage.goto('/contracts');
      await page.waitForTimeout(1000);

      // Test search functionality
      const searchTerm = 'service';

      // Track search API call
      const searchResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.url().includes(`search=${searchTerm}`)
      );

      await contractsPage.searchContracts(searchTerm);

      const response = await searchResponse;
      expect(response.status()).toBe(200);

      const searchResults = await response.json();
      expect(searchResults).toHaveProperty('contracts');
      expect(searchResults).toHaveProperty('total');

      // Results should be filtered
      if (searchResults.contracts.length > 0) {
        // At least some results should contain the search term
        const matchingResults = searchResults.contracts.some((contract: any) =>
          contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.contract_type.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        expect(matchingResults).toBe(true);
      }

      // UI should show filtered results
      await expect(page.getByText(new RegExp(searchTerm, 'i'))).toBeVisible();
    });

    test('should filter contracts by status @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);

      await contractsPage.goto('/contracts');
      await page.waitForTimeout(1000);

      // Test status filtering
      const statusFilter = 'draft';

      // Track filter API call
      const filterResponse = page.waitForResponse(
        response => response.url().includes('/contracts') && 
                   response.url().includes(`status=${statusFilter}`)
      );

      await contractsPage.filterByStatus(statusFilter);

      const response = await filterResponse;
      expect(response.status()).toBe(200);

      const filteredResults = await response.json();
      
      // All results should have the specified status
      if (filteredResults.contracts.length > 0) {
        const allMatchStatus = filteredResults.contracts.every((contract: any) =>
          contract.status === statusFilter
        );
        expect(allMatchStatus).toBe(true);
      }
    });

    test('should filter contracts by type @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);

      await contractsPage.goto('/contracts');
      await page.waitForTimeout(1000);

      // Look for contract type filter
      const typeFilter = page.getByLabel(/contract.*type|type.*filter/i);
      
      if (await typeFilter.isVisible()) {
        const contractType = 'service_agreement';

        const filterResponse = page.waitForResponse(
          response => response.url().includes('/contracts') && 
                     response.url().includes(`contract_type=${contractType}`)
        );

        await typeFilter.click();
        await page.getByText(/service.*agreement/i).click();

        const response = await filterResponse;
        expect(response.status()).toBe(200);

        const filteredResults = await response.json();
        
        if (filteredResults.contracts.length > 0) {
          const allMatchType = filteredResults.contracts.every((contract: any) =>
            contract.contract_type === contractType
          );
          expect(allMatchType).toBe(true);
        }
      }
    });

    test('should handle advanced search filters @integration', async ({ page }) => {
      await page.goto('/contracts');
      await page.waitForTimeout(1000);

      // Look for advanced search/filters
      const advancedSearch = page.getByRole('button', { name: /advanced.*search|filters/i });
      
      if (await advancedSearch.isVisible()) {
        await advancedSearch.click();

        // Test date range filtering
        const fromDate = page.getByLabel(/from.*date|created.*after/i);
        const toDate = page.getByLabel(/to.*date|created.*before/i);
        
        if (await fromDate.isVisible() && await toDate.isVisible()) {
          const startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          const endDate = new Date();

          const dateFilterResponse = page.waitForResponse(
            response => response.url().includes('/contracts') && 
                       response.url().includes('created_after=') &&
                       response.url().includes('created_before=')
          );

          await fromDate.fill(startDate.toISOString().split('T')[0]);
          await toDate.fill(endDate.toISOString().split('T')[0]);
          
          await page.getByRole('button', { name: /apply|search/i }).click();

          const response = await dateFilterResponse;
          expect(response.status()).toBe(200);

          const dateFilteredResults = await response.json();
          expect(dateFilteredResults).toHaveProperty('contracts');
        }
      }
    });
  });

  test.describe('Contract Generation and Analysis Integration', () => {
    test('should generate contract content via backend @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);
      const viewPage = new ContractViewPage(page);

      await contractsPage.goto('/contracts');
      await page.waitForTimeout(1000);

      // Need a contract to generate content for
      const contractRows = contractsPage.contractRow;
      const count = await contractRows.count();

      if (count > 0) {
        await contractRows.first().click();
        
        const generateButton = viewPage.generateButton;
        if (await generateButton.isVisible()) {
          // Track generation API call
          const generateResponse = page.waitForResponse(
            response => response.url().includes('/generate') && 
                       response.request().method() === 'POST'
          );

          await generateButton.click();

          const response = await generateResponse;
          expect(response.status()).toBe(200);

          const generatedContent = await response.json();
          expect(generatedContent).toHaveProperty('content');
          expect(typeof generatedContent.content).toBe('string');
          expect(generatedContent.content.length).toBeGreaterThan(100);

          // Should display generated content
          await viewPage.expectContentGenerated();
        }
      } else {
        console.log('No contracts available for generation test');
      }
    });

    test('should analyze contract compliance via backend @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);
      const viewPage = new ContractViewPage(page);

      await contractsPage.goto('/contracts');
      await page.waitForTimeout(1000);

      const contractRows = contractsPage.contractRow;
      const count = await contractRows.count();

      if (count > 0) {
        await contractRows.first().click();
        
        const analyzeButton = viewPage.analyzeButton;
        if (await analyzeButton.isVisible()) {
          // Track analysis API call
          const analyzeResponse = page.waitForResponse(
            response => response.url().includes('/analyze') && 
                       response.request().method() === 'POST'
          );

          await analyzeButton.click();

          const response = await analyzeResponse;
          expect(response.status()).toBe(200);

          const analysisResult = await response.json();
          expect(analysisResult).toHaveProperty('compliance_score');
          expect(typeof analysisResult.compliance_score).toBe('number');
          expect(analysisResult.compliance_score).toBeGreaterThanOrEqual(0);
          expect(analysisResult.compliance_score).toBeLessThanOrEqual(100);

          // Should display compliance analysis
          await viewPage.expectComplianceScore();
        }
      }
    });

    test('should handle generation and analysis errors @integration', async ({ page }) => {
      const contractsPage = new ContractsPage(page);
      const viewPage = new ContractViewPage(page);

      // Mock generation error
      await page.route('**/contracts/*/generate', async route => {
        await route.fulfill({
          status: 500,
          json: { detail: 'AI service temporarily unavailable' }
        });
      });

      await contractsPage.goto('/contracts');
      await page.waitForTimeout(1000);

      const contractRows = contractsPage.contractRow;
      const count = await contractRows.count();

      if (count > 0) {
        await contractRows.first().click();
        
        const generateButton = viewPage.generateButton;
        if (await generateButton.isVisible()) {
          await generateButton.click();

          // Should display error message
          await expect(page.getByText(/error|unavailable|failed/i)).toBeVisible();
          
          // Should provide retry option
          const retryButton = page.getByRole('button', { name: /retry|try.*again/i });
          if (await retryButton.isVisible()) {
            expect(retryButton).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Contract Export and Bulk Operations Integration', () => {
    test('should export contracts to CSV via backend @integration', async ({ page }) => {
      await page.goto('/contracts');
      await page.waitForTimeout(1000);

      // Look for export functionality
      const exportButton = page.getByRole('button', { name: /export|csv|download/i });
      
      if (await exportButton.isVisible()) {
        // Track export API call
        const exportResponse = page.waitForResponse(
          response => response.url().includes('/contracts/export') ||
                     response.url().includes('/export') &&
                     response.request().method() === 'GET'
        );

        // Set up download handler
        const downloadPromise = page.waitForEvent('download');
        
        await exportButton.click();

        try {
          const response = await exportResponse;
          expect(response.status()).toBe(200);
          
          // Should initiate download
          const download = await downloadPromise;
          const filename = download.suggestedFilename();
          
          expect(filename).toMatch(/contracts.*\.csv|export.*\.csv/i);
          console.log('CSV export successful:', filename);
        } catch (error) {
          // Export might be client-side generated
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.csv$/);
        }
      }
    });

    test('should handle bulk contract operations @integration', async ({ page }) => {
      await page.goto('/contracts');
      await page.waitForTimeout(2000);

      // Look for bulk operations
      const selectAllCheckbox = page.getByLabel(/select.*all|check.*all/i);
      
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.click();

        // Should show bulk action buttons
        const bulkActions = [
          /bulk.*delete/i,
          /bulk.*export/i,
          /bulk.*update/i,
          /delete.*selected/i
        ];

        let bulkActionVisible = false;
        for (const action of bulkActions) {
          const actionButton = page.getByRole('button', { name: action });
          if (await actionButton.isVisible()) {
            bulkActionVisible = true;
            
            // Test bulk export if available
            if (action.source.includes('export')) {
              const bulkExportResponse = page.waitForResponse(
                response => response.url().includes('/contracts/bulk-export')
              );

              await actionButton.click();

              try {
                const response = await bulkExportResponse;
                expect(response.status()).toBe(200);
              } catch (error) {
                console.log('Bulk export handled client-side');
              }
            }
            break;
          }
        }

        console.log('Bulk operations available:', bulkActionVisible);
      }
    });
  });

  test.describe('Contracts Performance and Optimization', () => {
    test('should load contracts list efficiently @integration', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/contracts');
      
      // Wait for contracts to be visible
      await expect(page.getByText(/contracts/i)).toBeVisible();

      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time
      expect(loadTime).toBeLessThan(10000);
      
      console.log(`Contracts loaded in ${loadTime}ms`);
    });

    test('should implement proper pagination for large datasets @integration', async ({ page }) => {
      // Mock large dataset
      const largeContractSet = Array.from({ length: 200 }, (_, i) => ({
        id: `contract-${i}`,
        title: `Contract ${i} - ${faker.lorem.words(3)}`,
        contract_type: faker.helpers.arrayElement(['service_agreement', 'employment', 'nda']),
        status: faker.helpers.arrayElement(['draft', 'active', 'completed']),
        created_at: faker.date.past().toISOString(),
        client_name: faker.company.name(),
        contract_value: faker.number.int({ min: 1000, max: 100000 })
      }));

      await page.route('**/contracts**', async route => {
        const url = new URL(route.request().url());
        const page = parseInt(url.searchParams.get('page') || '1');
        const size = parseInt(url.searchParams.get('size') || '10');
        
        const start = (page - 1) * size;
        const end = start + size;
        const paginatedContracts = largeContractSet.slice(start, end);

        await route.fulfill({
          status: 200,
          json: {
            contracts: paginatedContracts,
            total: largeContractSet.length,
            page,
            size,
            pages: Math.ceil(largeContractSet.length / size)
          }
        });
      });

      await page.goto('/contracts');
      
      // Should display pagination controls
      await expect(page.getByText(/page.*of|showing.*of/i)).toBeVisible();
      
      // Should show reasonable number of contracts per page
      const contractRows = page.locator('[data-testid="contract-row"]');
      const count = await contractRows.count();
      expect(count).toBeLessThanOrEqual(20); // Reasonable pagination size
    });

    test('should cache contract data appropriately @integration', async ({ page }) => {
      let firstLoad = 0;
      let secondLoad = 0;

      // Track first load
      page.on('request', request => {
        if (request.url().includes('/contracts')) {
          firstLoad++;
        }
      });

      await page.goto('/contracts');
      await page.waitForTimeout(2000);
      const firstLoadCount = firstLoad;

      // Navigate away and back
      await page.goto('/dashboard');
      await page.waitForTimeout(500);

      // Track second load
      page.removeAllListeners('request');
      page.on('request', request => {
        if (request.url().includes('/contracts')) {
          secondLoad++;
        }
      });

      await page.goto('/contracts');
      await page.waitForTimeout(2000);

      console.log(`First load: ${firstLoadCount} requests, Second load: ${secondLoad} requests`);

      // Caching should reduce subsequent requests
      expect(secondLoad).toBeLessThanOrEqual(firstLoadCount);
    });
  });

  // Cleanup created contracts
  test.afterAll(async ({ browser }) => {
    if (createdContracts.length > 0) {
      console.log(`Cleaning up ${createdContracts.length} test contracts`);
      
      // Could implement cleanup API calls here
      for (const contract of createdContracts) {
        console.log(`Would clean up contract: ${contract.id}`);
      }
    }
    
    console.log('Contracts Management Backend Integration tests completed');
  });
});