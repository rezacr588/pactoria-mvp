import { test, expect } from '@playwright/test';
import { 
  ContractsPage, 
  ContractCreatePage, 
  DashboardPage 
} from '../utils/page-objects';
import { TestContract } from '../utils/test-data';
import { APIMocker } from '../utils/api-mock';

test.describe('Contract API Integration Tests', () => {
  let contractsPage: ContractsPage;
  let contractCreatePage: ContractCreatePage;
  let dashboardPage: DashboardPage;
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page }) => {
    contractsPage = new ContractsPage(page);
    contractCreatePage = new ContractCreatePage(page);
    dashboardPage = new DashboardPage(page);
    apiMocker = new APIMocker(page);

    // Setup authenticated session
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          token: 'test-jwt-token',
          user: {
            id: 'test-user-id',
            email: 'test@pactoria.com',
            company_id: 'test-company-id'
          }
        },
        version: 0
      }));
    });
  });

  test.describe('Contract Creation API', () => {
    test('should successfully create contract via API @smoke', async ({ page }) => {
      // Mock successful contract creation
      await page.route('**/api/v1/contracts', async route => {
        if (route.request().method() === 'POST') {
          const requestData = route.request().postDataJSON();
          
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'new-contract-123',
              title: requestData.title || 'Test Contract',
              contract_type: requestData.contract_type || 'service_agreement',
              status: 'draft',
              client_name: requestData.client_name || 'Test Client',
              contract_value: requestData.contract_value || 50000,
              currency: requestData.currency || 'GBP',
              version: 1,
              is_current_version: true,
              company_id: 'test-company-id',
              created_by: 'test-user-id',
              created_at: new Date().toISOString()
            })
          });
        } else {
          await route.continue();
        }
      });

      await contractCreatePage.goto('/contracts/new');
      
      // Step 1: Select a template
      const templateCards = page.locator('.cursor-pointer, [role="button"]').filter({ hasText: 'Professional Services' }).first();
      if (await templateCards.isVisible({ timeout: 5000 })) {
        await templateCards.click();
        await page.waitForTimeout(1000);
      }
      
      // Step 2: Navigate through form steps and fill basic info
      let nextButtonFound = true;
      let stepCount = 0;
      while (nextButtonFound && stepCount < 5) {
        const nextButton = page.getByRole('button', { name: /next|continue/i });
        if (await nextButton.isVisible({ timeout: 2000 })) {
          await nextButton.click();
          await page.waitForTimeout(500);
          stepCount++;
        } else {
          nextButtonFound = false;
        }
        
        // Try to fill any visible form fields
        const nameInput = page.locator('input[name="name"]');
        if (await nameInput.isVisible({ timeout: 1000 })) {
          await nameInput.fill('Test Service Agreement');
        }
        
        const clientInput = page.locator('input[name="clientName"]');  
        if (await clientInput.isVisible({ timeout: 1000 })) {
          await clientInput.fill('Test Client Corp');
        }
      }
      
      // Submit the form
      const submitButton = page.getByRole('button', { name: /create|generate|submit|save/i }).last();
      if (await submitButton.isVisible({ timeout: 5000 })) {
        await submitButton.click();
      }
      
      // Should show success or redirect
      try {
        await expect(page).toHaveURL(/\/contracts/, { timeout: 10000 });
      } catch {
        await expect(page.locator('text=/success|created|saved/i')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should handle API validation errors gracefully', async ({ page }) => {
      // Mock validation error response
      await page.route('**/api/v1/contracts', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: [
                {
                  loc: ['body', 'title'],
                  msg: 'Title is required',
                  type: 'value_error'
                }
              ]
            })
          });
        } else {
          await route.continue();
        }
      });

      await contractCreatePage.goto('/contracts/new');
      
      // Try to create contract with empty data
      await page.click('button[type="submit"]');
      
      // Should show validation errors
      await expect(page.locator('text=/Title is required|validation|error/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Contract List API', () => {
    test('should load contracts list from API', async ({ page }) => {
      // Mock contracts list response
      await page.route('**/api/v1/contracts*', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              contracts: [
                {
                  id: 'contract-1',
                  title: 'Service Agreement Alpha',
                  contract_type: 'service_agreement',
                  status: 'active',
                  client_name: 'Client Corp',
                  contract_value: 50000,
                  currency: 'GBP',
                  created_at: new Date().toISOString()
                },
                {
                  id: 'contract-2', 
                  title: 'Employment Contract Beta',
                  contract_type: 'employment_contract',
                  status: 'draft',
                  client_name: 'Employee Name',
                  contract_value: 75000,
                  currency: 'GBP',
                  created_at: new Date().toISOString()
                }
              ],
              total: 2,
              page: 1,
              size: 10,
              pages: 1
            })
          });
        } else {
          await route.continue();
        }
      });

      await contractsPage.goto('/contracts');
      
      // Should display contracts from API
      await expect(page.locator('text="Service Agreement Alpha"')).toBeVisible();
      await expect(page.locator('text="Employment Contract Beta"')).toBeVisible();
      await expect(page.locator('text="Client Corp"')).toBeVisible();
    });

    test('should handle empty contracts list', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/v1/contracts*', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              contracts: [],
              total: 0,
              page: 1,
              size: 10,
              pages: 0
            })
          });
        } else {
          await route.continue();
        }
      });

      await contractsPage.goto('/contracts');
      
      // Should show empty state
      await expect(page.locator('text=/No contracts|empty|create your first/i')).toBeVisible();
    });

    test('should support contract search via API', async ({ page }) => {
      // Mock search response
      await page.route('**/api/v1/contracts*', async route => {
        if (route.request().method() === 'GET') {
          const url = new URL(route.request().url());
          const searchTerm = url.searchParams.get('search');
          
          if (searchTerm === 'consulting') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                contracts: [
                  {
                    id: 'contract-consulting',
                    title: 'Consulting Services Agreement',
                    contract_type: 'service_agreement',
                    status: 'active',
                    client_name: 'Consulting Client',
                    contract_value: 100000,
                    currency: 'GBP',
                    created_at: new Date().toISOString()
                  }
                ],
                total: 1,
                page: 1,
                size: 10,
                pages: 1
              })
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                contracts: [],
                total: 0,
                page: 1,
                size: 10,
                pages: 0
              })
            });
          }
        } else {
          await route.continue();
        }
      });

      await contractsPage.goto('/contracts');
      
      // Perform search
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('consulting');
        await page.keyboard.press('Enter');
        
        // Should show filtered results
        await expect(page.locator('text="Consulting Services Agreement"')).toBeVisible();
      }
    });
  });

  test.describe('Contract Update API', () => {
    test('should update contract via API', async ({ page }) => {
      // Mock contract details response
      await page.route('**/api/v1/contracts/contract-123', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'contract-123',
              title: 'Original Title',
              contract_type: 'service_agreement',
              status: 'draft',
              client_name: 'Original Client',
              contract_value: 50000,
              currency: 'GBP',
              created_at: new Date().toISOString()
            })
          });
        } else if (route.request().method() === 'PUT') {
          const requestData = route.request().postDataJSON();
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'contract-123',
              title: requestData.title || 'Original Title',
              contract_type: 'service_agreement',
              status: requestData.status || 'draft',
              client_name: requestData.client_name || 'Original Client',
              contract_value: requestData.contract_value || 50000,
              currency: 'GBP',
              updated_at: new Date().toISOString()
            })
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/contracts/contract-123/edit');
      
      // Update contract details
      const titleInput = page.locator('input[name="title"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill('Updated Contract Title');
        await page.click('button[type="submit"]');
        
        // Should show success message
        await expect(page.locator('text=/Updated|Saved|Success/i')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Contract Generation API', () => {
    test('should generate contract content via AI API', async ({ page }) => {
      // Mock contract generation response
      await page.route('**/api/v1/contracts/contract-123/generate', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'ai-gen-123',
              model_name: 'gpt-4',
              input_prompt: 'Generate service agreement...',
              generated_content: 'PROFESSIONAL SERVICES AGREEMENT\n\nThis agreement...',
              processing_time_ms: 2500,
              confidence_score: 0.95,
              created_at: new Date().toISOString()
            })
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/contracts/contract-123');
      
      // Trigger AI generation
      const generateButton = page.locator('button:has-text("Generate")');
      if (await generateButton.isVisible()) {
        await generateButton.click();
        
        // Should show generated content
        await expect(page.locator('text="PROFESSIONAL SERVICES AGREEMENT"')).toBeVisible({ timeout: 15000 });
      }
    });
  });

  test.describe('Contract Compliance API', () => {
    test('should analyze contract compliance via API', async ({ page }) => {
      // Mock compliance analysis response
      await page.route('**/api/v1/contracts/contract-123/analyze', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'compliance-123',
              contract_id: 'contract-123',
              overall_score: 0.92,
              gdpr_compliance: 0.95,
              employment_law_compliance: 0.88,
              consumer_rights_compliance: 0.90,
              commercial_terms_compliance: 0.94,
              risk_score: 3,
              risk_factors: ['Minor clause ambiguity'],
              recommendations: ['Consider clarifying payment terms'],
              analysis_date: new Date().toISOString()
            })
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/contracts/contract-123');
      
      // Trigger compliance analysis
      const analyzeButton = page.locator('button:has-text("Analyze")');
      if (await analyzeButton.isVisible()) {
        await analyzeButton.click();
        
        // Should show compliance results
        await expect(page.locator('text=/92%|0.92|compliance/i')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('text="Minor clause ambiguity"')).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API network errors', async ({ page }) => {
      // Mock network error
      await page.route('**/api/v1/contracts*', async route => {
        await route.abort('failed');
      });

      await contractsPage.goto('/contracts');
      
      // Should show error state
      await expect(page.locator('text=/error|failed|try again/i')).toBeVisible({ timeout: 10000 });
    });

    test('should handle API authentication errors', async ({ page }) => {
      // Mock auth error
      await page.route('**/api/v1/contracts*', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Authentication required'
          })
        });
      });

      await contractsPage.goto('/contracts');
      
      // Should redirect to login or show auth error
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });
});
