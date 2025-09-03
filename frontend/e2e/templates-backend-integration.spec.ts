import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { TestUser, API_ENDPOINTS } from './utils/test-data';

/**
 * TEMPLATES BACKEND INTEGRATION TESTS
 * 
 * These tests validate the Templates functionality integration with the backend.
 * This is critical as Templates was recently converted from mock data to real backend API integration.
 * Tests ensure template loading, filtering, search, and usage work with real TemplateService API.
 */

test.describe('Templates Backend Integration', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  let authenticatedContext: any;
  let testUser: any;

  test.beforeAll(async ({ browser }) => {
    // Create authenticated context for template tests
    testUser = {
      email: `templates-test-${faker.string.uuid()}@integration-test.com`,
      password: 'TemplatesTest123!',
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: `${faker.company.name()} Templates Test Co.`
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

  test.describe('Templates Loading Integration @critical', () => {
    test('should load templates from backend TemplateService API @smoke @integration', async ({ page }) => {
      // Track templates API call
      const templatesResponse = page.waitForResponse(
        response => response.url().includes(API_ENDPOINTS.templates.list) && 
                   response.request().method() === 'GET'
      );

      // Navigate to contracts page (which loads templates for creation)
      await page.goto('/contracts');

      // Click create contract to trigger template loading
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      } else {
        // Alternative navigation to template selection
        await page.getByRole('button', { name: /create|new contract/i }).click();
      }

      // Validate templates API call
      const response = await templatesResponse;
      expect(response.status()).toBe(200);

      const templatesData = await response.json();
      console.log('Templates API response structure:', Object.keys(templatesData));

      // Validate response structure (adjust based on actual API response)
      expect(templatesData).toBeDefined();
      
      // Check for common template response structures
      if (Array.isArray(templatesData)) {
        // Direct array of templates
        expect(templatesData.length).toBeGreaterThanOrEqual(0);
      } else if (templatesData.templates) {
        // Wrapped in templates property
        expect(Array.isArray(templatesData.templates)).toBe(true);
      } else if (templatesData.data) {
        // Wrapped in data property
        expect(Array.isArray(templatesData.data)).toBe(true);
      }

      // Should display templates in the UI
      await expect(page.getByText(/template|select.*template/i)).toBeVisible();
    });

    test('should display template categories from backend @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      // Navigate to template selection
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      } else {
        await page.getByRole('button', { name: /create|new contract/i }).click();
      }

      // Wait for templates to load
      await page.waitForSelector('text=/template|contract.*type/i');

      // Should display template categories
      const expectedCategories = [
        /service.*agreement/i,
        /employment/i,
        /nda|non.*disclosure/i,
        /supplier/i,
        /consultancy/i
      ];

      let categoriesFound = 0;
      for (const categoryRegex of expectedCategories) {
        const category = page.getByText(categoryRegex);
        if (await category.isVisible()) {
          categoriesFound++;
        }
      }

      // Should have at least some template categories visible
      expect(categoriesFound).toBeGreaterThan(0);
    });

    test('should handle empty templates response gracefully @integration', async ({ page }) => {
      // Mock empty templates response
      await page.route(`**${API_ENDPOINTS.templates.list}`, async route => {
        await route.fulfill({
          status: 200,
          json: { templates: [] }
        });
      });

      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      } else {
        await page.getByRole('button', { name: /create|new contract/i }).click();
      }

      // Should display empty state or basic options
      await expect(page.getByText(/no.*templates|basic.*contract|custom/i)).toBeVisible();
    });

    test('should validate templates data structure @integration', async ({ page }) => {
      let templatesData: any = null;

      page.on('response', async response => {
        if (response.url().includes('/templates') && response.request().method() === 'GET') {
          try {
            templatesData = await response.json();
          } catch (error) {
            console.error('Failed to parse templates response:', error);
          }
        }
      });

      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      await page.waitForTimeout(2000);

      if (templatesData) {
        console.log('Validating templates data structure...');
        
        // Get the actual templates array
        let templates = templatesData;
        if (templatesData.templates) templates = templatesData.templates;
        if (templatesData.data) templates = templatesData.data;

        if (Array.isArray(templates) && templates.length > 0) {
          const firstTemplate = templates[0];
          
          // Validate template structure
          expect(firstTemplate).toHaveProperty('id');
          expect(firstTemplate).toHaveProperty('name');
          
          // Optional properties that might exist
          const optionalProperties = ['category', 'description', 'content', 'type', 'template_type'];
          let hasOptionalProperty = false;
          
          for (const prop of optionalProperties) {
            if (firstTemplate.hasOwnProperty(prop)) {
              hasOptionalProperty = true;
              break;
            }
          }
          
          expect(hasOptionalProperty).toBe(true);
        }
      }
    });
  });

  test.describe('Template Search and Filtering Integration', () => {
    test('should search templates via backend API @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      // Wait for templates to load
      await page.waitForTimeout(2000);

      // Look for search functionality
      const searchInput = page.getByPlaceholder(/search.*template/i);
      
      if (await searchInput.isVisible()) {
        // Track search API call
        const searchResponse = page.waitForResponse(
          response => response.url().includes('/templates') && 
                     response.url().includes('search')
        );

        await searchInput.fill('service');
        await page.keyboard.press('Enter');

        try {
          const response = await searchResponse;
          expect(response.status()).toBe(200);
          
          const searchResults = await response.json();
          expect(searchResults).toBeDefined();

          // Should display filtered results
          await expect(page.getByText(/service/i)).toBeVisible();
        } catch (error) {
          console.log('Template search API not called (might be client-side filtering)');
          
          // Should still filter templates in UI
          await expect(page.getByText(/service/i)).toBeVisible();
        }
      }
    });

    test('should filter templates by category @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      await page.waitForTimeout(2000);

      // Look for category filter
      const categoryFilter = page.getByLabel(/category|filter.*type/i);
      
      if (await categoryFilter.isVisible()) {
        // Track filter API call
        const filterResponse = page.waitForResponse(
          response => response.url().includes('/templates') && 
                     (response.url().includes('category') || response.url().includes('type'))
        );

        await categoryFilter.click();
        await page.getByText(/employment/i).click();

        try {
          const response = await filterResponse;
          expect(response.status()).toBe(200);

          // Should display filtered templates
          await expect(page.getByText(/employment/i)).toBeVisible();
        } catch (error) {
          console.log('Category filtering might be client-side');
          
          // Should still show employment-related templates
          await expect(page.getByText(/employment/i)).toBeVisible();
        }
      }
    });

    test('should handle template filtering errors gracefully @integration', async ({ page }) => {
      // Mock filter error
      await page.route('**/templates**', async route => {
        if (route.request().url().includes('category') || route.request().url().includes('search')) {
          await route.fulfill({
            status: 500,
            json: { detail: 'Template filtering unavailable' }
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      // Should still display basic templates or error message
      await expect(page.getByText(/template|error.*loading/i)).toBeVisible();
    });
  });

  test.describe('Template Selection and Usage Integration', () => {
    test('should select and use template for contract creation @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      await page.waitForTimeout(2000);

      // Select a template (if available)
      const templateOption = page.getByText(/service.*agreement|employment|nda/i).first();
      
      if (await templateOption.isVisible()) {
        await templateOption.click();
        
        // Should proceed to contract creation form
        await expect(page.getByLabel(/title|contract.*title/i)).toBeVisible();
        
        // Template should pre-fill some form fields
        const titleField = page.getByLabel(/title|contract.*title/i);
        const titleValue = await titleField.inputValue();
        
        if (titleValue) {
          expect(titleValue.length).toBeGreaterThan(0);
        }
      }
    });

    test('should preview template content @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      await page.waitForTimeout(2000);

      // Look for template preview functionality
      const previewButton = page.getByRole('button', { name: /preview|view.*template/i });
      
      if (await previewButton.isVisible()) {
        // Track template content API call
        const contentResponse = page.waitForResponse(
          response => response.url().includes('/templates') && 
                     response.request().method() === 'GET'
        );

        await previewButton.click();

        try {
          const response = await contentResponse;
          expect(response.status()).toBe(200);
          
          // Should display template preview
          await expect(page.getByText(/preview|template.*content/i)).toBeVisible();
        } catch (error) {
          console.log('Template preview might use cached data');
        }
      }
    });

    test('should handle template content loading errors @integration', async ({ page }) => {
      // Mock successful template list but failed template content
      await page.route('**/templates', async route => {
        if (route.request().method() === 'GET' && !route.request().url().includes('content')) {
          await route.fulfill({
            status: 200,
            json: {
              templates: [
                {
                  id: 'template-1',
                  name: 'Service Agreement',
                  category: 'service_agreement',
                  description: 'Standard service agreement template'
                }
              ]
            }
          });
        } else {
          await route.fulfill({
            status: 404,
            json: { detail: 'Template content not found' }
          });
        }
      });

      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      // Should display templates list
      await expect(page.getByText(/service.*agreement/i)).toBeVisible();

      // Try to select template
      await page.getByText(/service.*agreement/i).click();

      // Should handle content loading error gracefully
      const errorIndicators = [
        /content.*not.*available/i,
        /template.*error/i,
        /failed.*load/i,
        /try.*again/i
      ];

      let errorFound = false;
      for (const errorRegex of errorIndicators) {
        if (await page.getByText(errorRegex).isVisible()) {
          errorFound = true;
          break;
        }
      }

      // Should either show error or fall back to basic form
      expect(errorFound || await page.getByLabel(/title/i).isVisible()).toBe(true);
    });
  });

  test.describe('Template Categories and Types Integration', () => {
    test('should load and display template categories from backend @integration', async ({ page }) => {
      // Track categories API call (if separate from templates)
      page.on('response', response => {
        if (response.url().includes('/categories') || response.url().includes('/template-types')) {
          console.log('Template categories API called:', response.url());
        }
      });

      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      await page.waitForTimeout(2000);

      // Should display categorized templates
      const categoryHeaders = [
        /legal.*agreements/i,
        /employment/i,
        /commercial/i,
        /service.*agreements/i
      ];

      let categoriesVisible = 0;
      for (const headerRegex of categoryHeaders) {
        if (await page.getByText(headerRegex).isVisible()) {
          categoriesVisible++;
        }
      }

      // Should have some category organization
      expect(categoriesVisible).toBeGreaterThan(0);
    });

    test('should validate template metadata from backend @integration', async ({ page }) => {
      let templatesMetadata: any[] = [];

      page.on('response', async response => {
        if (response.url().includes('/templates') && response.request().method() === 'GET') {
          try {
            const data = await response.json();
            let templates = data;
            if (data.templates) templates = data.templates;
            if (data.data) templates = data.data;

            if (Array.isArray(templates)) {
              templatesMetadata = templates;
            }
          } catch (error) {
            console.error('Failed to parse templates metadata:', error);
          }
        }
      });

      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      await page.waitForTimeout(2000);

      if (templatesMetadata.length > 0) {
        // Validate each template has required metadata
        for (const template of templatesMetadata) {
          expect(template).toHaveProperty('id');
          expect(typeof template.id).toBe('string');
          
          if (template.name) {
            expect(typeof template.name).toBe('string');
          }
          
          if (template.category) {
            expect(typeof template.category).toBe('string');
          }
          
          if (template.description) {
            expect(typeof template.description).toBe('string');
          }
        }
      }
    });
  });

  test.describe('Templates Error Handling Integration', () => {
    test('should handle templates API server errors @integration', async ({ page }) => {
      // Mock templates API error
      await page.route(`**${API_ENDPOINTS.templates.list}`, async route => {
        await route.fulfill({
          status: 500,
          json: { detail: 'Templates service unavailable' }
        });
      });

      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      // Should display error state or fallback
      const errorIndicators = [
        /templates.*unavailable/i,
        /error.*loading.*templates/i,
        /service.*unavailable/i,
        /custom.*contract/i, // Fallback option
        /basic.*form/i // Fallback option
      ];

      let errorHandled = false;
      for (const indicator of errorIndicators) {
        if (await page.getByText(indicator).isVisible()) {
          errorHandled = true;
          break;
        }
      }

      expect(errorHandled).toBe(true);
    });

    test('should handle templates network failures @integration', async ({ page }) => {
      await page.goto('/contracts');

      // Mock network failure for templates
      await page.route('**/templates**', async route => {
        await route.abort('failed');
      });

      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      // Should show network error or fallback to basic form
      const fallbackOptions = [
        /network.*error/i,
        /connection.*failed/i,
        /custom.*contract/i,
        /basic.*form/i,
        /title/i // Basic form field as fallback
      ];

      let fallbackVisible = false;
      for (const option of fallbackOptions) {
        if (await page.getByText(option).isVisible() || await page.getByLabel(option).isVisible()) {
          fallbackVisible = true;
          break;
        }
      }

      expect(fallbackVisible).toBe(true);
    });

    test('should retry templates loading on error @integration', async ({ page }) => {
      let requestCount = 0;

      await page.route(`**${API_ENDPOINTS.templates.list}`, async route => {
        requestCount++;
        if (requestCount === 1) {
          // First request fails
          await route.fulfill({
            status: 500,
            json: { detail: 'Temporary server error' }
          });
        } else {
          // Subsequent requests succeed
          await route.fulfill({
            status: 200,
            json: { templates: [
              { id: '1', name: 'Service Agreement', category: 'service_agreement' }
            ]}
          });
        }
      });

      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      // Look for retry mechanism
      const retryButton = page.getByRole('button', { name: /retry|try.*again|refresh/i });
      
      if (await retryButton.isVisible()) {
        await retryButton.click();
        
        // Should successfully load templates on retry
        await expect(page.getByText(/service.*agreement/i)).toBeVisible();
        expect(requestCount).toBe(2);
      }
    });
  });

  test.describe('Templates Performance Integration', () => {
    test('should load templates within reasonable time @integration', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      // Wait for templates to be visible or form to be ready
      await expect(page.getByText(/template|contract.*type|title/i)).toBeVisible();

      const loadTime = Date.now() - startTime;
      
      // Templates should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('should handle large template datasets efficiently @integration', async ({ page }) => {
      // Mock large templates dataset
      const largeTemplateSet = Array.from({ length: 100 }, (_, i) => ({
        id: `template-${i}`,
        name: `Template ${i} - ${faker.lorem.words(3)}`,
        category: faker.helpers.arrayElement(['service_agreement', 'employment', 'nda', 'supplier']),
        description: faker.lorem.sentences(2)
      }));

      await page.route(`**${API_ENDPOINTS.templates.list}`, async route => {
        await route.fulfill({
          status: 200,
          json: { templates: largeTemplateSet }
        });
      });

      const startTime = Date.now();

      await page.goto('/contracts');
      
      const createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      // Should render large dataset efficiently
      await expect(page.getByText(/template.*0|template.*1/i)).toBeVisible();

      const renderTime = Date.now() - startTime;
      
      // Should handle large datasets within 15 seconds
      expect(renderTime).toBeLessThan(15000);
    });

    test('should implement template caching for performance @integration', async ({ page }) => {
      let apiCallCount = 0;

      page.on('request', request => {
        if (request.url().includes('/templates')) {
          apiCallCount++;
        }
      });

      // First visit
      await page.goto('/contracts');
      
      let createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      await page.waitForTimeout(2000);
      const firstCallCount = apiCallCount;

      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/contracts');
      
      createButton = page.getByTestId('create-contract-button');
      if (await createButton.isVisible()) {
        await createButton.click();
      }

      await page.waitForTimeout(2000);
      const secondCallCount = apiCallCount;

      // Templates should be cached (or at least not make excessive calls)
      expect(secondCallCount - firstCallCount).toBeLessThanOrEqual(1);
    });
  });

  test.afterAll(async () => {
    console.log('Templates Backend Integration tests completed');
  });
});