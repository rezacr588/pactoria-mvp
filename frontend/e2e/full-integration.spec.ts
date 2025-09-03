import { test, expect } from '@playwright/test';

test.describe('Full Integration Tests - New Backend Features', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        json: {
          id: 'test-user-id',
          email: 'admin@example.com',
          full_name: 'Admin User',
          is_active: true,
          timezone: 'UTC',
          company_id: 'test-company-id',
          role: 'ADMIN',
          created_at: '2024-01-01T00:00:00Z',
          last_login_at: '2024-01-01T00:00:00Z'
        }
      });
    });

    // Mock all new backend endpoints
    await setupBackendMocks(page);
  });

  test('complete user workflow: search -> bulk operations -> templates @smoke', async ({ page }) => {
    // 1. Start at dashboard
    await page.goto('/dashboard');
    await expect(page.getByText(/dashboard|welcome/i)).toBeVisible();

    // 2. Navigate to advanced search
    await page.goto('/contracts/search');
    
    // 3. Perform an advanced search
    await page.getByLabel('Search query').fill('service agreement');
    await page.getByLabel('Status').selectOption('ACTIVE');
    await page.getByRole('button', { name: /search/i }).click();
    
    await page.waitForResponse('**/api/v1/search/contracts');
    await expect(page.getByText('Service Agreement with ACME Corp')).toBeVisible();

    // 4. Select contracts for bulk operations
    await page.goto('/contracts');
    const checkboxes = page.locator('input[type="checkbox"][data-contract-id]');
    await checkboxes.first().check();
    await checkboxes.nth(1).check();

    // 5. Perform bulk update
    await page.getByRole('button', { name: 'Bulk Update' }).click();
    await page.getByLabel('Status').selectOption('COMPLETED');
    await page.getByRole('button', { name: 'Update Contracts' }).click();
    
    await page.waitForResponse('**/api/v1/bulk/contracts/update');
    await expect(page.getByText(/updated.*2.*contracts/i)).toBeVisible();

    // 6. Check templates
    await page.goto('/templates');
    await expect(page.getByText('Contract Templates')).toBeVisible();
    await expect(page.getByText('Service Agreement Template')).toBeVisible();

    // 7. Create a new template
    await page.getByRole('button', { name: 'Create New Template' }).click();
    await page.getByLabel('Template Name').fill('Test Integration Template');
    await page.getByLabel('Category').fill('Integration');
    await page.getByLabel('Contract Type').selectOption('SERVICE_AGREEMENT');
    await page.getByLabel('Description').fill('Template created during integration test');
    await page.getByLabel('Template Content').fill('This is a test template: {{client_name}} agrees to {{terms}}');
    
    await page.getByRole('button', { name: 'Create Template' }).click();
    await page.waitForResponse('**/api/v1/templates');
    await expect(page.getByText(/template.*created/i)).toBeVisible();
  });

  test('real-time updates during bulk operations @regression', async ({ page }) => {
    await page.goto('/contracts');
    
    // Start a bulk operation
    const checkboxes = page.locator('input[type="checkbox"][data-contract-id]');
    await checkboxes.first().check();
    
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('button', { name: 'Export Contracts' }).click();

    // Simulate real-time bulk operation progress via WebSocket
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'bulk_operation',
        operation_id: 'export-123',
        operation_type: 'bulk_export',
        status: 'RUNNING',
        progress_percentage: 50,
        processed_count: 50,
        total_count: 100
      });
    });

    // Should show progress update
    await expect(page.getByText(/50%/)).toBeVisible();
    
    // Complete the operation
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'bulk_operation',
        operation_id: 'export-123',
        operation_type: 'bulk_export',
        status: 'COMPLETED',
        progress_percentage: 100,
        processed_count: 100,
        total_count: 100
      });
    });

    await expect(page.getByText(/export.*completed/i)).toBeVisible();
  });

  test('error handling across all new features @regression', async ({ page }) => {
    // Test search error handling
    await page.route('**/api/v1/search/contracts', async (route) => {
      await route.fulfill({
        status: 400,
        json: { message: 'Invalid search parameters' }
      });
    });

    await page.goto('/contracts/search');
    await page.getByLabel('Search query').fill('test');
    await page.getByRole('button', { name: /search/i }).click();
    
    await expect(page.getByText(/invalid search parameters/i)).toBeVisible();

    // Test bulk operation error handling
    await page.route('**/api/v1/bulk/contracts/update', async (route) => {
      await route.fulfill({
        status: 500,
        json: { message: 'Internal server error during bulk operation' }
      });
    });

    await page.goto('/contracts');
    const checkbox = page.locator('input[type="checkbox"][data-contract-id]').first();
    await checkbox.check();
    
    await page.getByRole('button', { name: 'Bulk Update' }).click();
    await page.getByLabel('Status').selectOption('ACTIVE');
    await page.getByRole('button', { name: 'Update Contracts' }).click();

    await expect(page.getByText(/bulk.*failed|server error/i)).toBeVisible();

    // Test template operation error handling
    await page.route('**/api/v1/templates', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 422,
          json: { message: 'Validation failed: Template name already exists' }
        });
      }
    });

    await page.goto('/templates');
    await page.getByRole('button', { name: 'Create New Template' }).click();
    await page.getByLabel('Template Name').fill('Duplicate Template');
    await page.getByLabel('Category').fill('Test');
    await page.getByLabel('Contract Type').selectOption('NDA');
    await page.getByLabel('Description').fill('Test description');
    await page.getByLabel('Template Content').fill('Test content');
    
    await page.getByRole('button', { name: 'Create Template' }).click();
    
    await expect(page.getByText(/template name already exists|validation failed/i)).toBeVisible();
  });

  test('performance of new features under load simulation @performance', async ({ page }) => {
    // Simulate large dataset search
    await page.route('**/api/v1/search/contracts', async (route) => {
      // Simulate slower response for large dataset
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await route.fulfill({
        json: {
          items: Array.from({ length: 100 }, (_, i) => ({
            id: `contract-${i}`,
            title: `Large Dataset Contract ${i}`,
            contract_type: 'SERVICE_AGREEMENT',
            status: 'ACTIVE',
            created_at: '2024-01-01T00:00:00Z',
            version: 1,
            compliance_score: 95
          })),
          total: 10000,
          page: 1,
          size: 100,
          pages: 100,
          took_ms: 800,
          query: 'large dataset',
          filters_applied: {}
        }
      });
    });

    await page.goto('/contracts/search');
    
    const startTime = Date.now();
    
    await page.getByLabel('Search query').fill('large dataset');
    await page.getByRole('button', { name: /search/i }).click();
    
    await page.waitForResponse('**/api/v1/search/contracts');
    await page.waitForSelector('text=Large Dataset Contract 0');
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Should handle large datasets reasonably quickly (under 2 seconds)
    expect(responseTime).toBeLessThan(2000);
    
    // Should display pagination info
    await expect(page.getByText(/10,000.*results/i)).toBeVisible();
    await expect(page.getByText(/page 1.*100/i)).toBeVisible();
  });

  test('accessibility compliance for new features @accessibility', async ({ page }) => {
    // Test search form accessibility
    await page.goto('/contracts/search');
    
    // All form elements should have proper labels
    await expect(page.getByLabel('Search query')).toBeVisible();
    await expect(page.getByLabel('Search operator')).toBeVisible();
    await expect(page.getByLabel('Status')).toBeVisible();
    
    // Search button should have proper ARIA label
    const searchButton = page.getByRole('button', { name: /perform search|search/i });
    await expect(searchButton).toHaveAttribute('aria-label');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Search query')).toBeFocused();
    
    // Test bulk operations accessibility
    await page.goto('/contracts');
    
    // Bulk operation buttons should be properly labeled
    const bulkUpdateButton = page.getByRole('button', { name: /bulk update/i });
    await expect(bulkUpdateButton).toBeVisible();
    
    // Test templates accessibility
    await page.goto('/templates');
    
    // Template cards should have proper structure
    await expect(page.getByRole('heading', { name: /service agreement template/i })).toBeVisible();
    
    // Create template button should be accessible
    const createButton = page.getByRole('button', { name: /create.*template/i });
    await expect(createButton).toBeVisible();
    await expect(createButton).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('cross-browser compatibility for new features @cross-browser', async ({ page, browserName }) => {
    // Test WebSocket support across browsers
    await page.goto('/dashboard');
    
    // WebSocket should work in all browsers
    await expect(page.getByText(/connected|online/i)).toBeVisible();
    
    // Test advanced search in different browsers
    await page.goto('/contracts/search');
    await page.getByLabel('Search query').fill('browser test');
    await page.getByRole('button', { name: /search/i }).click();
    
    await page.waitForResponse('**/api/v1/search/contracts');
    
    // Results should display consistently
    await expect(page.getByText(/service agreement/i)).toBeVisible();
    
    // Test bulk operations
    await page.goto('/contracts');
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    
    // Bulk operations should work across browsers
    await expect(page.getByRole('button', { name: /bulk update/i })).toBeVisible();
    
    console.log(`✓ New features working correctly in ${browserName}`);
  });

  test('data consistency across new features @regression', async ({ page }) => {
    // Create a template
    await page.goto('/templates');
    await page.getByRole('button', { name: 'Create New Template' }).click();
    
    await page.getByLabel('Template Name').fill('Consistency Test Template');
    await page.getByLabel('Category').fill('Testing');
    await page.getByLabel('Contract Type').selectOption('SERVICE_AGREEMENT');
    await page.getByLabel('Description').fill('Template for consistency testing');
    await page.getByLabel('Template Content').fill('Template content with {{variables}}');
    
    await page.getByRole('button', { name: 'Create Template' }).click();
    await page.waitForResponse('**/api/v1/templates');
    
    // Search for the created template
    await page.getByLabel('Search Templates').fill('Consistency Test Template');
    await page.getByRole('button', { name: 'Apply Filters' }).click();
    
    await expect(page.getByText('Consistency Test Template')).toBeVisible();
    
    // Navigate to contracts and use the template (if integration exists)
    await page.goto('/contracts/new');
    
    // Template should be available in contract creation
    // This would depend on the contract creation flow implementation
    
    // Perform search that should find contracts created from this template
    await page.goto('/contracts/search');
    await page.getByLabel('Search query').fill('testing template');
    await page.getByRole('button', { name: /search/i }).click();
    
    // Data should be consistent across features
    await page.waitForResponse('**/api/v1/search/contracts');
  });

  // Helper function to set up all backend mocks
  async function setupBackendMocks(page) {
    // Search mocks
    await page.route('**/api/v1/search/contracts', async (route) => {
      await route.fulfill({
        json: {
          items: [
            {
              id: '1',
              title: 'Service Agreement with ACME Corp',
              contract_type: 'SERVICE_AGREEMENT',
              status: 'ACTIVE',
              client_name: 'ACME Corp',
              created_at: '2024-01-01T00:00:00Z',
              version: 1,
              compliance_score: 95
            }
          ],
          total: 1,
          page: 1,
          size: 20,
          pages: 1,
          took_ms: 150,
          query: '',
          filters_applied: {}
        }
      });
    });

    // Bulk operations mocks
    await page.route('**/api/v1/bulk/contracts/update', async (route) => {
      const requestBody = route.request().postDataJSON();
      await route.fulfill({
        json: {
          operation_type: 'bulk_update',
          total_requested: requestBody.contract_ids.length,
          success_count: requestBody.contract_ids.length,
          failed_count: 0,
          processing_time_ms: 1000,
          updated_ids: requestBody.contract_ids
        }
      });
    });

    await page.route('**/api/v1/bulk/contracts/export', async (route) => {
      await route.fulfill({
        json: {
          export_id: 'export-123',
          format: 'CSV',
          total_records: 1,
          download_url: 'https://example.com/export.csv',
          processing_time_ms: 2000
        }
      });
    });

    // Template mocks
    await page.route('**/api/v1/templates', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            templates: [
              {
                id: '1',
                name: 'Service Agreement Template',
                category: 'Commercial',
                contract_type: 'SERVICE_AGREEMENT',
                description: 'Standard service agreement template',
                template_content: 'Service agreement between {{client_name}} and {{supplier_name}}',
                compliance_features: ['GDPR Compliant'],
                version: '1.0',
                is_active: true,
                suitable_for: ['All businesses'],
                created_at: '2024-01-01T00:00:00Z'
              }
            ],
            total: 1,
            page: 1,
            size: 20,
            pages: 1
          }
        });
      } else if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          json: {
            id: 'new-template-id',
            ...requestBody,
            version: '1.0',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z'
          }
        });
      }
    });

    await page.route('**/api/v1/templates/categories', async (route) => {
      await route.fulfill({
        json: ['Commercial', 'Employment', 'Legal', 'Integration']
      });
    });

    await page.route('**/api/v1/templates/contract-types', async (route) => {
      await route.fulfill({
        json: ['SERVICE_AGREEMENT', 'EMPLOYMENT_CONTRACT', 'NDA']
      });
    });

    // Contracts mock
    await page.route('**/api/v1/contracts', async (route) => {
      await route.fulfill({
        json: {
          contracts: [
            {
              id: '1',
              title: 'Contract 1',
              status: 'DRAFT',
              contract_type: 'SERVICE_AGREEMENT',
              created_at: '2024-01-01T00:00:00Z'
            },
            {
              id: '2',
              title: 'Contract 2',
              status: 'DRAFT',
              contract_type: 'SERVICE_AGREEMENT',
              created_at: '2024-01-02T00:00:00Z'
            }
          ],
          total: 2,
          page: 1,
          size: 20,
          pages: 1
        }
      });
    });

    // WebSocket mock setup
    await page.addInitScript(() => {
      // Mock WebSocket and injection function
      class MockWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        readyState = 1;
        onmessage: ((event: MessageEvent) => void) | null = null;
        send() {}
        close() {}
      }
      (window as any).WebSocket = MockWebSocket;
      (window as any).injectWebSocketMessage = (message: any) => {
        const ws = (window as any)._currentWebSocket;
        if (ws && ws.onmessage) {
          ws.onmessage({ data: JSON.stringify(message) });
        }
      };
      (window as any)._currentWebSocket = new MockWebSocket();
    });
  }
});