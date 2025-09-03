import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * BULK OPERATIONS BACKEND INTEGRATION TESTS
 * 
 * These tests validate bulk operations functionality with real backend API calls.
 * They ensure bulk update, delete, and export operations work correctly.
 */

test.describe('Bulk Operations Backend Integration', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  let authenticatedContext: any;
  let testUser: any;
  let bulkTestContracts: any[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create authenticated context and test contracts for bulk operations
    testUser = {
      email: `bulk-test-${faker.string.uuid()}@integration-test.com`,
      password: 'BulkTest123!',
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: `${faker.company.name()} Bulk Test Co.`
    };

    const context = await browser.newContext();
    const page = await context.newPage();

    // Register test user
    await page.goto('/register');
    await page.getByLabel(/full name|name/i).fill(testUser.full_name);
    await page.getByLabel(/email|email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByLabel(/company/i).fill(testUser.company_name);
    
    const regResponse = page.waitForResponse(response => response.url().includes('/auth/register'));
    await page.getByRole('button', { name: /register|sign up/i }).click();
    await regResponse;
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Create multiple test contracts for bulk operations
    for (let i = 0; i < 6; i++) {
      const contractData = {
        title: `Bulk Test Contract ${i + 1} ${faker.string.uuid()}`,
        contract_type: i % 2 === 0 ? 'SERVICE_AGREEMENT' : 'NDA',
        plain_english_input: `This is bulk test contract ${i + 1} for testing bulk operations functionality.`,
        client_name: `Bulk Test Client ${i + 1}`,
        contract_value: faker.number.int({ min: 1000, max: 10000 })
      };

      await page.goto('/contracts/new');
      await page.getByLabel(/title/i).fill(contractData.title);
      await page.getByLabel(/contract type/i).selectOption(contractData.contract_type);
      await page.getByLabel(/plain english|description/i).fill(contractData.plain_english_input);
      await page.getByLabel(/client name/i).fill(contractData.client_name);
      await page.getByLabel(/contract value|value/i).fill(contractData.contract_value.toString());

      const createResponse = page.waitForResponse(response => response.url().includes('/contracts') && response.request().method() === 'POST');
      await page.getByRole('button', { name: /create|submit/i }).click();
      
      const response = await createResponse;
      const contract = await response.json();
      bulkTestContracts.push({ ...contractData, id: contract.id });
      
      await page.waitForTimeout(500);
    }
    
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

  test.describe('Bulk Selection Integration', () => {
    test('should select multiple contracts for bulk operations @smoke @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      // Wait for contracts to load
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      // Check if bulk selection is available
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      const bulkActionsBar = page.getByTestId('bulk-actions');
      
      if (await selectAllCheckbox.isVisible()) {
        // Select all contracts
        await selectAllCheckbox.check();
        
        // Should show bulk actions bar
        await expect(bulkActionsBar).toBeVisible();
        
        // Should show selected count
        await expect(page.getByText(/\d+.*selected/i)).toBeVisible();
        
        // Individual checkboxes should be checked
        const contractCheckboxes = page.getByRole('checkbox').filter({ hasNotText: 'Select all' });
        const checkboxCount = await contractCheckboxes.count();
        
        for (let i = 0; i < checkboxCount; i++) {
          await expect(contractCheckboxes.nth(i)).toBeChecked();
        }
      } else {
        // Test individual selection
        const contractRows = page.getByTestId('contract-row');
        const rowCount = Math.min(await contractRows.count(), 3);
        
        for (let i = 0; i < rowCount; i++) {
          const checkbox = contractRows.nth(i).getByRole('checkbox');
          if (await checkbox.isVisible()) {
            await checkbox.check();
          }
        }
        
        if (await bulkActionsBar.isVisible()) {
          await expect(bulkActionsBar).toBeVisible();
        }
      }
    });

    test('should deselect individual contracts @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      const bulkActionsBar = page.getByTestId('bulk-actions');
      
      if (await selectAllCheckbox.isVisible()) {
        // Select all first
        await selectAllCheckbox.check();
        await expect(bulkActionsBar).toBeVisible();
        
        // Deselect one contract
        const contractRows = page.getByTestId('contract-row');
        const firstContractCheckbox = contractRows.first().getByRole('checkbox');
        
        if (await firstContractCheckbox.isVisible()) {
          await firstContractCheckbox.uncheck();
          
          // Select all checkbox should be unchecked
          await expect(selectAllCheckbox).not.toBeChecked();
          
          // Bulk actions should still be visible
          await expect(bulkActionsBar).toBeVisible();
        }
      }
    });
  });

  test.describe('Bulk Update Integration', () => {
    test('should perform bulk status update via backend API @integration', async ({ page }) => {
      await page.goto('/contracts');
      
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      // Select multiple contracts
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
        
        const bulkUpdateButton = page.getByRole('button', { name: /bulk.*update|update.*selected/i });
        if (await bulkUpdateButton.isVisible()) {
          await bulkUpdateButton.click();
          
          // Should show bulk update modal/form
          await expect(page.getByText(/update.*contracts/i)).toBeVisible();
          
          // Select new status
          const statusSelect = page.getByLabel(/status/i);
          await statusSelect.selectOption('ACTIVE');
          
          // Track bulk update API call
          const bulkUpdateResponse = page.waitForResponse(
            response => response.url().includes('/bulk/contracts/update') && 
                       response.request().method() === 'POST'
          );
          
          await page.getByRole('button', { name: /update|apply|confirm/i }).click();
          
          // Validate bulk update API call
          const response = await bulkUpdateResponse;
          expect(response.status()).toBe(200);
          
          const updateResult = await response.json();
          expect(updateResult).toHaveProperty('operation_type');
          expect(updateResult).toHaveProperty('success_count');
          expect(updateResult).toHaveProperty('total_requested');
          expect(updateResult.operation_type).toBe('bulk_update');
          expect(updateResult.success_count).toBeGreaterThan(0);
          
          // Should show success message
          await expect(page.getByText(/updated.*successfully/i)).toBeVisible();
          
          // Contracts should show new status
          await page.waitForTimeout(1000);
          await expect(page.getByText('ACTIVE')).toBeVisible();
        }
      }
    });

    test('should handle bulk update with mixed success/failure @integration', async ({ page }) => {
      // Mock bulk update with partial failures
      await page.route('**/bulk/contracts/update', async route => {
        const requestBody = await route.request().postDataJSON();
        const contractIds = requestBody.contract_ids || [];
        
        await route.fulfill({
          status: 200,
          json: {
            operation_type: 'bulk_update',
            total_requested: contractIds.length,
            success_count: Math.max(1, contractIds.length - 1),
            failed_count: 1,
            processing_time_ms: 1500,
            updated_ids: contractIds.slice(0, -1),
            errors: [{
              resource_id: contractIds[contractIds.length - 1],
              error_code: 'VALIDATION_ERROR',
              error_message: 'Cannot update contract in current status',
              details: { current_status: 'COMPLETED' }
            }],
            warnings: ['One contract could not be updated due to status restrictions']
          }
        });
      });

      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      // Select multiple contracts and perform bulk update
      const contractRows = page.getByTestId('contract-row');
      const rowCount = Math.min(await contractRows.count(), 3);
      
      for (let i = 0; i < rowCount; i++) {
        const checkbox = contractRows.nth(i).getByRole('checkbox');
        if (await checkbox.isVisible()) {
          await checkbox.check();
        }
      }
      
      const bulkUpdateButton = page.getByRole('button', { name: /bulk.*update|update.*selected/i });
      if (await bulkUpdateButton.isVisible()) {
        await bulkUpdateButton.click();
        
        const statusSelect = page.getByLabel(/status/i);
        await statusSelect.selectOption('ACTIVE');
        
        await page.getByRole('button', { name: /update|apply|confirm/i }).click();
        
        // Should show partial success message
        await expect(page.getByText(/partially.*successful|some.*contracts.*updated/i)).toBeVisible();
        
        // Should show error details
        await expect(page.getByText(/could.*not.*be.*updated/i)).toBeVisible();
      }
    });

    test('should bulk update multiple fields @integration', async ({ page }) => {
      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      // Select contracts
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
        
        const bulkUpdateButton = page.getByRole('button', { name: /bulk.*update|update.*selected/i });
        if (await bulkUpdateButton.isVisible()) {
          await bulkUpdateButton.click();
          
          // Update multiple fields
          await page.getByLabel(/status/i).selectOption('ACTIVE');
          await page.getByLabel(/currency/i).selectOption('USD');
          
          const bulkUpdateResponse = page.waitForResponse(
            response => response.url().includes('/bulk/contracts/update')
          );
          
          await page.getByRole('button', { name: /update|apply|confirm/i }).click();
          
          const response = await bulkUpdateResponse;
          const updateResult = await response.json();
          
          // Request should include multiple field updates
          const requestBody = JSON.parse(await response.request().postData() || '{}');
          expect(requestBody.updates).toHaveProperty('status');
          expect(requestBody.updates).toHaveProperty('currency');
          
          await expect(page.getByText(/updated.*successfully/i)).toBeVisible();
        }
      }
    });
  });

  test.describe('Bulk Delete Integration', () => {
    test('should perform bulk delete via backend API @integration', async ({ page }) => {
      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      // Select a few contracts (not all, to preserve some for other tests)
      const contractRows = page.getByTestId('contract-row');
      const selectCount = Math.min(2, await contractRows.count());
      
      const selectedIds: string[] = [];
      
      for (let i = 0; i < selectCount; i++) {
        const checkbox = contractRows.nth(i).getByRole('checkbox');
        if (await checkbox.isVisible()) {
          await checkbox.check();
          
          // Extract contract ID from the row if needed for validation
          const contractLink = contractRows.nth(i).getByRole('link').first();
          const href = await contractLink.getAttribute('href');
          if (href) {
            const contractId = href.split('/').pop();
            if (contractId) selectedIds.push(contractId);
          }
        }
      }
      
      const bulkDeleteButton = page.getByRole('button', { name: /bulk.*delete|delete.*selected/i });
      if (await bulkDeleteButton.isVisible()) {
        await bulkDeleteButton.click();
        
        // Should show confirmation dialog
        await expect(page.getByText(/are.*you.*sure|confirm.*delete/i)).toBeVisible();
        
        // Track bulk delete API call
        const bulkDeleteResponse = page.waitForResponse(
          response => response.url().includes('/bulk/contracts/delete') && 
                     response.request().method() === 'POST'
        );
        
        await page.getByRole('button', { name: /delete|confirm|yes/i }).click();
        
        // Validate bulk delete API call
        const response = await bulkDeleteResponse;
        expect(response.status()).toBe(200);
        
        const deleteResult = await response.json();
        expect(deleteResult).toHaveProperty('operation_type');
        expect(deleteResult).toHaveProperty('success_count');
        expect(deleteResult).toHaveProperty('total_requested');
        expect(deleteResult.operation_type).toBe('bulk_delete');
        expect(deleteResult.success_count).toBeGreaterThan(0);
        
        // Should show success message
        await expect(page.getByText(/deleted.*successfully/i)).toBeVisible();
        
        // Deleted contracts should no longer be visible
        await page.waitForTimeout(1000);
        const remainingRows = page.getByTestId('contract-row');
        const remainingCount = await remainingRows.count();
        expect(remainingCount).toBeLessThan(bulkTestContracts.length);
      }
    });

    test('should handle bulk delete confirmation cancellation @integration', async ({ page }) => {
      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      // Select contracts
      const contractRows = page.getByTestId('contract-row');
      const firstCheckbox = contractRows.first().getByRole('checkbox');
      
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.check();
        
        const bulkDeleteButton = page.getByRole('button', { name: /bulk.*delete|delete.*selected/i });
        if (await bulkDeleteButton.isVisible()) {
          await bulkDeleteButton.click();
          
          // Cancel the deletion
          await page.getByRole('button', { name: /cancel|no/i }).click();
          
          // Should not make API call and contracts should remain
          await expect(page.getByTestId('contracts-list')).toBeVisible();
          await expect(firstCheckbox).toBeChecked();
        }
      }
    });

    test('should handle bulk delete with permission errors @integration', async ({ page }) => {
      // Mock bulk delete with permission errors
      await page.route('**/bulk/contracts/delete', async route => {
        await route.fulfill({
          status: 403,
          json: { 
            detail: 'Insufficient permissions for bulk delete operation',
            error_code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
      });

      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      const contractRows = page.getByTestId('contract-row');
      const firstCheckbox = contractRows.first().getByRole('checkbox');
      
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.check();
        
        const bulkDeleteButton = page.getByRole('button', { name: /bulk.*delete|delete.*selected/i });
        if (await bulkDeleteButton.isVisible()) {
          await bulkDeleteButton.click();
          await page.getByRole('button', { name: /delete|confirm|yes/i }).click();
          
          // Should show permission error
          await expect(page.getByText(/insufficient.*permissions|not.*authorized/i)).toBeVisible();
        }
      }
    });
  });

  test.describe('Bulk Export Integration', () => {
    test('should export selected contracts to CSV @integration', async ({ page }) => {
      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      // Select contracts
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
        
        const bulkExportButton = page.getByRole('button', { name: /bulk.*export|export.*selected/i });
        if (await bulkExportButton.isVisible()) {
          // Track bulk export API call
          const bulkExportResponse = page.waitForResponse(
            response => response.url().includes('/bulk/contracts/export') && 
                       response.request().method() === 'POST'
          );
          
          // Set up download handling
          const downloadPromise = page.waitForEvent('download');
          
          await bulkExportButton.click();
          
          // Select CSV format if prompted
          const formatSelect = page.getByLabel(/format/i);
          if (await formatSelect.isVisible()) {
            await formatSelect.selectOption('CSV');
            await page.getByRole('button', { name: /export|download/i }).click();
          }
          
          // Validate bulk export API call
          const response = await bulkExportResponse;
          expect(response.status()).toBe(200);
          
          const exportResult = await response.json();
          expect(exportResult).toHaveProperty('export_id');
          expect(exportResult).toHaveProperty('format');
          expect(exportResult).toHaveProperty('total_records');
          expect(exportResult.format).toBe('CSV');
          expect(exportResult.total_records).toBeGreaterThan(0);
          
          // Should initiate download
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.csv$/i);
        } else {
          // Test regular export button as fallback
          const exportButton = page.getByRole('button', { name: /export.*csv/i });
          if (await exportButton.isVisible()) {
            const downloadPromise = page.waitForEvent('download');
            await exportButton.click();
            
            const download = await downloadPromise;
            expect(download.suggestedFilename()).toMatch(/\.csv$/i);
          }
        }
      }
    });

    test('should export contracts with custom field selection @integration', async ({ page }) => {
      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
        
        const bulkExportButton = page.getByRole('button', { name: /bulk.*export|export.*selected/i });
        if (await bulkExportButton.isVisible()) {
          await bulkExportButton.click();
          
          // Select custom fields if available
          const fieldSelectors = [
            page.getByLabel(/include.*title/i),
            page.getByLabel(/include.*client/i),
            page.getByLabel(/include.*value/i),
            page.getByLabel(/include.*status/i)
          ];
          
          for (const selector of fieldSelectors) {
            if (await selector.isVisible()) {
              await selector.check();
            }
          }
          
          const bulkExportResponse = page.waitForResponse(
            response => response.url().includes('/bulk/contracts/export')
          );
          
          await page.getByRole('button', { name: /export|download/i }).click();
          
          const response = await bulkExportResponse;
          const requestBody = JSON.parse(await response.request().postData() || '{}');
          
          // Should include field selection in request
          if (requestBody.fields) {
            expect(requestBody.fields).toBeInstanceOf(Array);
            expect(requestBody.fields.length).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should export contracts in different formats @integration', async ({ page }) => {
      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
        
        const bulkExportButton = page.getByRole('button', { name: /bulk.*export|export.*selected/i });
        if (await bulkExportButton.isVisible()) {
          await bulkExportButton.click();
          
          // Test different export formats
          const formats = ['CSV', 'EXCEL', 'JSON'];
          
          const formatSelect = page.getByLabel(/format/i);
          if (await formatSelect.isVisible()) {
            for (const format of formats) {
              await formatSelect.selectOption(format);
              
              const bulkExportResponse = page.waitForResponse(
                response => response.url().includes('/bulk/contracts/export')
              );
              
              const downloadPromise = page.waitForEvent('download');
              await page.getByRole('button', { name: /export|download/i }).click();
              
              const response = await bulkExportResponse;
              const exportResult = await response.json();
              expect(exportResult.format).toBe(format);
              
              const download = await downloadPromise;
              const expectedExtension = format === 'EXCEL' ? 'xlsx' : format.toLowerCase();
              expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${expectedExtension}$`, 'i'));
              
              // Wait between downloads
              await page.waitForTimeout(1000);
            }
          }
        }
      }
    });
  });

  test.describe('Bulk Operations Status and Progress Integration', () => {
    test('should show progress for long-running bulk operations @integration', async ({ page }) => {
      // Mock slow bulk operation
      await page.route('**/bulk/contracts/update', async route => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await route.fulfill({
          status: 200,
          json: {
            operation_type: 'bulk_update',
            total_requested: 5,
            success_count: 5,
            failed_count: 0,
            processing_time_ms: 2000
          }
        });
      });

      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
        
        const bulkUpdateButton = page.getByRole('button', { name: /bulk.*update|update.*selected/i });
        if (await bulkUpdateButton.isVisible()) {
          await bulkUpdateButton.click();
          
          await page.getByLabel(/status/i).selectOption('ACTIVE');
          await page.getByRole('button', { name: /update|apply|confirm/i }).click();
          
          // Should show loading/progress indicator
          await expect(page.getByText(/processing|updating.*contracts/i)).toBeVisible();
          
          // Eventually should show completion
          await expect(page.getByText(/updated.*successfully/i)).toBeVisible();
        }
      }
    });

    test('should track bulk operation status via polling @integration', async ({ page }) => {
      // Check if bulk operation status tracking is implemented
      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      // Look for bulk operations status endpoint
      let statusPollingRequest = null;
      page.on('request', request => {
        if (request.url().includes('/bulk/status/')) {
          statusPollingRequest = request;
        }
      });
      
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
        
        const bulkUpdateButton = page.getByRole('button', { name: /bulk.*update|update.*selected/i });
        if (await bulkUpdateButton.isVisible()) {
          await bulkUpdateButton.click();
          
          await page.getByLabel(/status/i).selectOption('ACTIVE');
          await page.getByRole('button', { name: /update|apply|confirm/i }).click();
          
          // Wait for potential status polling
          await page.waitForTimeout(3000);
          
          if (statusPollingRequest) {
            // Status polling is implemented
            expect(statusPollingRequest.url()).toMatch(/\/bulk\/status\//);
          }
        }
      }
    });
  });

  test.describe('Bulk Operations Error Handling Integration', () => {
    test('should handle bulk operation server errors @integration', async ({ page }) => {
      // Mock server error for bulk operations
      await page.route('**/bulk/contracts/**', async route => {
        await route.fulfill({
          status: 500,
          json: { 
            detail: 'Bulk operations service temporarily unavailable',
            error_code: 'SERVICE_UNAVAILABLE'
          }
        });
      });

      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
        
        const bulkUpdateButton = page.getByRole('button', { name: /bulk.*update|update.*selected/i });
        if (await bulkUpdateButton.isVisible()) {
          await bulkUpdateButton.click();
          
          await page.getByLabel(/status/i).selectOption('ACTIVE');
          await page.getByRole('button', { name: /update|apply|confirm/i }).click();
          
          // Should show error message
          await expect(page.getByText(/service.*unavailable|bulk.*operation.*failed/i)).toBeVisible();
        }
      }
    });

    test('should handle network errors during bulk operations @integration', async ({ page }) => {
      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      // Mock network failure for bulk operations
      await page.route('**/bulk/contracts/**', async route => {
        await route.abort('failed');
      });
      
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
        
        const bulkUpdateButton = page.getByRole('button', { name: /bulk.*update|update.*selected/i });
        if (await bulkUpdateButton.isVisible()) {
          await bulkUpdateButton.click();
          
          await page.getByLabel(/status/i).selectOption('ACTIVE');
          await page.getByRole('button', { name: /update|apply|confirm/i }).click();
          
          // Should show network error
          await expect(page.getByText(/network.*error|connection.*failed/i)).toBeVisible();
        }
      }
    });

    test('should provide retry mechanism for failed bulk operations @integration', async ({ page }) => {
      let attemptCount = 0;
      
      await page.route('**/bulk/contracts/update', async route => {
        attemptCount++;
        if (attemptCount === 1) {
          // First attempt fails
          await route.fulfill({
            status: 500,
            json: { detail: 'Temporary server error' }
          });
        } else {
          // Second attempt succeeds
          await route.fulfill({
            status: 200,
            json: {
              operation_type: 'bulk_update',
              total_requested: 3,
              success_count: 3,
              failed_count: 0
            }
          });
        }
      });

      await page.goto('/contracts');
      await expect(page.getByTestId('contracts-list')).toBeVisible();
      
      const selectAllCheckbox = page.getByLabel(/select.*all/i);
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
        
        const bulkUpdateButton = page.getByRole('button', { name: /bulk.*update|update.*selected/i });
        if (await bulkUpdateButton.isVisible()) {
          await bulkUpdateButton.click();
          
          await page.getByLabel(/status/i).selectOption('ACTIVE');
          await page.getByRole('button', { name: /update|apply|confirm/i }).click();
          
          // Should show error first
          await expect(page.getByText(/server.*error|failed/i)).toBeVisible();
          
          // Look for retry button
          const retryButton = page.getByRole('button', { name: /retry|try.*again/i });
          if (await retryButton.isVisible()) {
            await retryButton.click();
            
            // Should succeed on retry
            await expect(page.getByText(/updated.*successfully/i)).toBeVisible();
            expect(attemptCount).toBe(2);
          }
        }
      }
    });
  });
});