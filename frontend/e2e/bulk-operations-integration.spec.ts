import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * BULK OPERATIONS INTEGRATION E2E TESTS
 * 
 * These tests validate bulk operations functionality integration with backend APIs.
 * Critical for ensuring users can efficiently manage multiple contracts simultaneously.
 * 
 * Test Priority: HIGH (Essential for productivity and user efficiency)
 * 
 * Coverage:
 * - Bulk Update Operations
 * - Bulk Delete Operations  
 * - Bulk Export Operations
 * - Bulk User Management
 * - Progress Tracking and Real-time Updates
 * - Error Handling and Rollback
 * - Performance under Load
 */

test.describe('Bulk Operations Integration Tests - Backend API', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated user for bulk operations tests
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: 'bulk-user-123', 
            email: 'bulk@pactoria.com',
            full_name: 'Bulk Operations User',
            company_id: 'bulk-company-123',
            role: 'ADMIN'
          },
          token: 'valid-bulk-token'
        }
      }));
    });

    // Mock contracts list for bulk operations
    await page.route('**/contracts', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            contracts: Array.from({ length: 10 }, (_, i) => ({
              id: `bulk-contract-${i + 1}`,
              title: `Bulk Test Contract ${i + 1}`,
              contract_type: i % 2 === 0 ? 'SERVICE_AGREEMENT' : 'EMPLOYMENT_CONTRACT',
              status: i % 3 === 0 ? 'DRAFT' : 'ACTIVE',
              client_name: `Client ${i + 1}`,
              contract_value: (i + 1) * 5000,
              currency: 'GBP',
              version: 1,
              is_current_version: true,
              company_id: 'bulk-company-123',
              created_by: 'bulk-user-123',
              created_at: '2024-01-01T00:00:00Z'
            })),
            total: 10,
            page: 1,
            size: 20,
            pages: 1
          }
        });
      }
    });
  });

  test.describe('Bulk Update Operations', () => {
    test('should perform bulk contract updates with backend API @smoke', async ({ page }) => {
      const contractIds = ['bulk-contract-1', 'bulk-contract-2', 'bulk-contract-3'];
      const updateData = {
        status: 'COMPLETED',
        contract_value: 25000,
        currency: 'USD'
      };

      // Mock bulk update API
      await page.route('**/bulk/contracts/update', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          
          // Validate bulk update request
          expect(requestBody.contract_ids).toEqual(contractIds);
          expect(requestBody.updates.status).toBe(updateData.status);
          expect(requestBody.updates.contract_value).toBe(updateData.contract_value);
          expect(requestBody.updates.currency).toBe(updateData.currency);

          await route.fulfill({
            status: 200,
            json: {
              operation_type: 'bulk_update',
              total_requested: contractIds.length,
              success_count: contractIds.length,
              failed_count: 0,
              processing_time_ms: 1500,
              updated_ids: contractIds,
              errors: [],
              warnings: []
            }
          });
        }
      });

      await page.goto('/contracts');

      // Wait for contracts to load
      await page.waitForResponse(response => response.url().includes('/contracts'));

      // Select contracts for bulk update
      for (let i = 1; i <= 3; i++) {
        await page.getByTestId(`contract-checkbox-${i}`).check();
      }

      // Verify selection count
      await expect(page.getByText(/3.*contracts.*selected/i)).toBeVisible();

      // Open bulk update modal
      await page.getByRole('button', { name: /bulk.*update/i }).click();

      // Fill bulk update form
      await page.getByLabel(/status/i).selectOption(updateData.status);
      await page.getByLabel(/contract.*value/i).fill(updateData.contract_value.toString());
      await page.getByLabel(/currency/i).selectOption(updateData.currency);

      // Submit bulk update
      const bulkUpdateResponse = page.waitForResponse(response => 
        response.url().includes('/bulk/contracts/update') && 
        response.request().method() === 'POST'
      );

      await page.getByRole('button', { name: /update.*contracts/i }).click();

      // Validate bulk update API call
      const updateRes = await bulkUpdateResponse;
      expect(updateRes.status()).toBe(200);

      const updateData_response = await updateRes.json();
      expect(updateData_response.total_requested).toBe(3);
      expect(updateData_response.success_count).toBe(3);
      expect(updateData_response.failed_count).toBe(0);

      // Should show success message
      await expect(page.getByText(/3.*contracts.*updated.*successfully/i)).toBeVisible();
      
      // Should show processing time
      await expect(page.getByText(/completed.*1.5.*seconds/i)).toBeVisible();

      // Should refresh contracts list
      await expect(page.getByText(/COMPLETED/i)).toBeVisible();
    });

    test('should handle partial bulk update failures @critical', async ({ page }) => {
      const contractIds = ['bulk-contract-1', 'bulk-contract-2', 'bulk-contract-invalid'];

      // Mock bulk update with partial failures
      await page.route('**/bulk/contracts/update', async route => {
        await route.fulfill({
          status: 200,
          json: {
            operation_type: 'bulk_update',
            total_requested: 3,
            success_count: 2,
            failed_count: 1,
            processing_time_ms: 2000,
            updated_ids: ['bulk-contract-1', 'bulk-contract-2'],
            errors: [
              {
                resource_id: 'bulk-contract-invalid',
                error_code: 'CONTRACT_NOT_FOUND',
                error_message: 'Contract not found or access denied',
                details: { contract_id: 'bulk-contract-invalid' }
              }
            ],
            warnings: ['Some contracts may require manual review']
          }
        });
      });

      await page.goto('/contracts');
      await page.waitForResponse(response => response.url().includes('/contracts'));

      // Select contracts including one invalid
      await page.getByTestId('contract-checkbox-1').check();
      await page.getByTestId('contract-checkbox-2').check();
      
      // Simulate selecting an invalid contract ID
      await page.evaluate(() => {
        const form = document.createElement('form');
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'invalid_contract';
        input.value = 'bulk-contract-invalid';
        form.appendChild(input);
      });

      await page.getByRole('button', { name: /bulk.*update/i }).click();
      await page.getByLabel(/status/i).selectOption('ACTIVE');
      await page.getByRole('button', { name: /update.*contracts/i }).click();

      await page.waitForResponse(response => response.url().includes('/bulk/contracts/update'));

      // Should show partial success message
      await expect(page.getByText(/2.*out.*of.*3.*contracts.*updated/i)).toBeVisible();
      
      // Should show error details
      await expect(page.getByText(/1.*contract.*failed/i)).toBeVisible();
      await expect(page.getByText(/CONTRACT_NOT_FOUND/i)).toBeVisible();
      await expect(page.getByText(/access denied/i)).toBeVisible();

      // Should show warnings
      await expect(page.getByText(/manual review/i)).toBeVisible();

      // Should offer to retry failed operations
      await expect(page.getByRole('button', { name: /retry.*failed/i })).toBeVisible();
    });

    test('should validate bulk update permissions @security', async ({ page }) => {
      // Mock permission denied response
      await page.route('**/bulk/contracts/update', async route => {
        await route.fulfill({
          status: 403,
          json: {
            detail: 'Insufficient permissions for bulk operations'
          }
        });
      });

      await page.goto('/contracts');
      await page.waitForResponse(response => response.url().includes('/contracts'));

      // Select contracts
      await page.getByTestId('contract-checkbox-1').check();
      await page.getByTestId('contract-checkbox-2').check();

      await page.getByRole('button', { name: /bulk.*update/i }).click();
      await page.getByLabel(/status/i).selectOption('ACTIVE');
      await page.getByRole('button', { name: /update.*contracts/i }).click();

      // Should show permission error
      await expect(page.getByText(/insufficient permissions/i)).toBeVisible();
      await expect(page.getByRole('alert')).toBeVisible();
    });
  });

  test.describe('Bulk Delete Operations', () => {
    test('should perform bulk contract deletion with confirmation @critical', async ({ page }) => {
      const contractIds = ['bulk-contract-5', 'bulk-contract-6'];

      // Mock bulk delete API
      await page.route('**/bulk/contracts/delete', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          
          expect(requestBody.contract_ids).toEqual(contractIds);
          expect(requestBody.deletion_reason).toBeDefined();
          expect(requestBody.hard_delete).toBe(false); // Soft delete by default

          await route.fulfill({
            status: 200,
            json: {
              operation_type: 'bulk_delete',
              total_requested: contractIds.length,
              success_count: contractIds.length,
              failed_count: 0,
              processing_time_ms: 800,
              deleted_ids: contractIds,
              errors: [],
              warnings: ['Deleted contracts can be restored within 30 days']
            }
          });
        }
      });

      await page.goto('/contracts');
      await page.waitForResponse(response => response.url().includes('/contracts'));

      // Select contracts for deletion
      await page.getByTestId('contract-checkbox-5').check();
      await page.getByTestId('contract-checkbox-6').check();

      // Open bulk delete modal
      await page.getByRole('button', { name: /bulk.*delete/i }).click();

      // Should show confirmation dialog
      await expect(page.getByText(/are you sure.*delete.*2.*contracts/i)).toBeVisible();
      await expect(page.getByText(/this action cannot be undone/i)).toBeVisible();

      // Fill deletion reason
      await page.getByLabel(/deletion reason/i).fill('Test bulk deletion for integration testing');

      // Confirm deletion
      const bulkDeleteResponse = page.waitForResponse(response => 
        response.url().includes('/bulk/contracts/delete')
      );

      await page.getByRole('button', { name: /confirm.*delete/i }).click();

      // Validate deletion API call
      const deleteRes = await bulkDeleteResponse;
      expect(deleteRes.status()).toBe(200);

      const deleteData = await deleteRes.json();
      expect(deleteData.success_count).toBe(2);
      expect(deleteData.deleted_ids).toEqual(contractIds);

      // Should show success message
      await expect(page.getByText(/2.*contracts.*deleted.*successfully/i)).toBeVisible();
      
      // Should show warning about restoration
      await expect(page.getByText(/restored within 30 days/i)).toBeVisible();

      // Should refresh contracts list (deleted items removed)
      await expect(page.getByText('Bulk Test Contract 5')).not.toBeVisible();
      await expect(page.getByText('Bulk Test Contract 6')).not.toBeVisible();
    });

    test('should support hard delete option @critical', async ({ page }) => {
      // Mock hard delete API
      await page.route('**/bulk/contracts/delete', async route => {
        const requestBody = await route.request().postDataJSON();
        expect(requestBody.hard_delete).toBe(true);

        await route.fulfill({
          status: 200,
          json: {
            operation_type: 'bulk_hard_delete',
            total_requested: 1,
            success_count: 1,
            failed_count: 0,
            processing_time_ms: 600,
            deleted_ids: ['bulk-contract-7'],
            errors: [],
            warnings: ['Hard deleted contracts cannot be restored']
          }
        });
      });

      await page.goto('/contracts');
      await page.waitForResponse(response => response.url().includes('/contracts'));

      await page.getByTestId('contract-checkbox-7').check();
      await page.getByRole('button', { name: /bulk.*delete/i }).click();

      // Enable hard delete option
      await page.getByLabel(/permanent.*delete|hard.*delete/i).check();
      
      // Should show additional warning
      await expect(page.getByText(/permanently.*deleted.*cannot.*be.*restored/i)).toBeVisible();

      await page.getByLabel(/deletion reason/i).fill('Hard delete for testing');
      await page.getByRole('button', { name: /confirm.*delete/i }).click();

      await page.waitForResponse(response => response.url().includes('/bulk/contracts/delete'));

      // Should show hard delete confirmation
      await expect(page.getByText(/permanently.*deleted/i)).toBeVisible();
    });
  });

  test.describe('Bulk Export Operations', () => {
    test('should export selected contracts in multiple formats @smoke', async ({ page }) => {
      const contractIds = ['bulk-contract-1', 'bulk-contract-3', 'bulk-contract-5'];
      const exportFormats = ['CSV', 'EXCEL', 'PDF', 'JSON'];

      for (const format of exportFormats) {
        // Mock export API for each format
        await page.route('**/bulk/contracts/export', async route => {
          if (route.request().method() === 'POST') {
            const requestBody = await route.request().postDataJSON();
            
            expect(requestBody.contract_ids).toEqual(contractIds);
            expect(requestBody.format).toBe(format);
            expect(requestBody.include_content).toBeDefined();
            expect(requestBody.include_versions).toBeDefined();

            await route.fulfill({
              status: 200,
              json: {
                export_id: `bulk-export-${format.toLowerCase()}-${Date.now()}`,
                format: format,
                total_records: contractIds.length,
                file_size_bytes: format === 'PDF' ? 2048000 : 512000,
                download_url: `https://example.com/exports/bulk-${format.toLowerCase()}.${format.toLowerCase()}`,
                expires_at: new Date(Date.now() + 3600000).toISOString(),
                processing_time_ms: format === 'PDF' ? 3000 : 1200
              }
            });
          }
        });

        await page.goto('/contracts');
        await page.waitForResponse(response => response.url().includes('/contracts'));

        // Select contracts for export
        await page.getByTestId('contract-checkbox-1').check();
        await page.getByTestId('contract-checkbox-3').check();
        await page.getByTestId('contract-checkbox-5').check();

        // Open export modal
        await page.getByRole('button', { name: /export.*contracts/i }).click();

        // Configure export options
        await page.getByLabel(/export format/i).selectOption(format);
        await page.getByLabel(/include.*content/i).check();
        await page.getByLabel(/include.*versions/i).check();

        // Start export
        const exportResponse = page.waitForResponse(response => 
          response.url().includes('/bulk/contracts/export')
        );

        await page.getByRole('button', { name: /start.*export/i }).click();

        // Validate export API call
        const exportRes = await exportResponse;
        expect(exportRes.status()).toBe(200);

        const exportData = await exportRes.json();
        expect(exportData.format).toBe(format);
        expect(exportData.total_records).toBe(3);
        expect(exportData.download_url).toBeTruthy();

        // Should show export progress and completion
        await expect(page.getByText(/preparing.*export/i)).toBeVisible();
        await expect(page.getByText(/export.*completed/i)).toBeVisible();
        
        // Should show download link
        const downloadLink = page.getByRole('link', { name: /download.*export/i });
        await expect(downloadLink).toBeVisible();
        await expect(downloadLink).toHaveAttribute('href', exportData.download_url);

        // Should show file info
        if (format === 'PDF') {
          await expect(page.getByText(/2.*MB/i)).toBeVisible();
        } else {
          await expect(page.getByText(/512.*KB/i)).toBeVisible();
        }

        // Should show expiration info
        await expect(page.getByText(/expires.*in.*1.*hour/i)).toBeVisible();

        console.log(`✅ ${format} export test completed successfully`);
      }
    });

    test('should handle large export operations @performance', async ({ page }) => {
      const largeContractSet = Array.from({ length: 100 }, (_, i) => `bulk-contract-${i}`);

      // Mock large export API
      await page.route('**/bulk/contracts/export', async route => {
        await route.fulfill({
          status: 200,
          json: {
            export_id: 'large-export-123',
            format: 'EXCEL',
            total_records: 100,
            file_size_bytes: 5242880, // 5MB
            download_url: 'https://example.com/exports/large-export.xlsx',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            processing_time_ms: 8500
          }
        });
      });

      await page.goto('/contracts');
      
      // Mock selecting all contracts
      await page.evaluate(() => {
        const selectAllCheckbox = document.querySelector('[data-testid="select-all-checkbox"]');
        if (selectAllCheckbox) {
          (selectAllCheckbox as HTMLInputElement).checked = true;
          selectAllCheckbox.dispatchEvent(new Event('change'));
        }
      });

      await page.getByRole('button', { name: /export.*contracts/i }).click();
      await page.getByLabel(/export format/i).selectOption('EXCEL');
      await page.getByRole('button', { name: /start.*export/i }).click();

      await page.waitForResponse(response => response.url().includes('/bulk/contracts/export'));

      // Should show large export warnings
      await expect(page.getByText(/100.*contracts.*selected/i)).toBeVisible();
      await expect(page.getByText(/large.*export.*may.*take.*time/i)).toBeVisible();
      
      // Should show file size
      await expect(page.getByText(/5.*MB/i)).toBeVisible();
      
      // Should show processing time
      await expect(page.getByText(/8.5.*seconds/i)).toBeVisible();
    });

    test('should track export progress with WebSocket updates @realtime', async ({ page }) => {
      // Mock WebSocket for real-time export progress
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = 1;
          onmessage: ((event: MessageEvent) => void) | null = null;
          
          constructor(url: string) {
            setTimeout(() => {
              // Simulate progress updates
              const progressUpdates = [
                { type: 'bulk_operation', operation_id: 'export-progress-123', status: 'RUNNING', progress_percentage: 25 },
                { type: 'bulk_operation', operation_id: 'export-progress-123', status: 'RUNNING', progress_percentage: 50 },
                { type: 'bulk_operation', operation_id: 'export-progress-123', status: 'RUNNING', progress_percentage: 75 },
                { type: 'bulk_operation', operation_id: 'export-progress-123', status: 'COMPLETED', progress_percentage: 100 }
              ];
              
              progressUpdates.forEach((update, index) => {
                setTimeout(() => {
                  if (this.onmessage) {
                    this.onmessage({ data: JSON.stringify(update) } as MessageEvent);
                  }
                }, index * 1000);
              });
            }, 100);
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      // Mock export API with operation ID
      await page.route('**/bulk/contracts/export', async route => {
        await route.fulfill({
          status: 200,
          json: {
            export_id: 'export-progress-123',
            format: 'CSV',
            total_records: 25,
            file_size_bytes: 128000,
            processing_time_ms: 4000,
            download_url: 'https://example.com/exports/progress-export.csv',
            expires_at: new Date(Date.now() + 3600000).toISOString()
          }
        });
      });

      await page.goto('/contracts');
      
      // Select some contracts and start export
      await page.getByTestId('contract-checkbox-1').check();
      await page.getByTestId('contract-checkbox-2').check();
      
      await page.getByRole('button', { name: /export.*contracts/i }).click();
      await page.getByLabel(/export format/i).selectOption('CSV');
      await page.getByRole('button', { name: /start.*export/i }).click();

      // Should show progress updates via WebSocket
      await expect(page.getByText(/25%/)).toBeVisible();
      await expect(page.getByText(/50%/)).toBeVisible();
      await expect(page.getByText(/75%/)).toBeVisible();
      await expect(page.getByText(/100%|completed/i)).toBeVisible();

      // Should show final download link
      await expect(page.getByRole('link', { name: /download/i })).toBeVisible();
    });
  });

  test.describe('Bulk User Management', () => {
    test('should perform bulk user invitations @smoke', async ({ page }) => {
      const invitations = [
        {
          email: 'bulk-user1@test.com',
          full_name: 'Bulk User 1',
          role: 'USER',
          department: 'Legal'
        },
        {
          email: 'bulk-user2@test.com', 
          full_name: 'Bulk User 2',
          role: 'ADMIN',
          department: 'Operations'
        }
      ];

      // Mock bulk user invitation API
      await page.route('**/bulk/users/invite', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          
          expect(requestBody.invitations).toHaveLength(2);
          expect(requestBody.invitations[0].email).toBe(invitations[0].email);
          expect(requestBody.invitations[1].role).toBe(invitations[1].role);

          await route.fulfill({
            status: 200,
            json: {
              operation_type: 'bulk_user_invite',
              total_requested: 2,
              success_count: 2,
              failed_count: 0,
              processing_time_ms: 1200,
              invited_emails: [invitations[0].email, invitations[1].email],
              errors: [],
              warnings: []
            }
          });
        }
      });

      await page.goto('/users');
      
      // Open bulk invite modal
      await page.getByRole('button', { name: /bulk.*invite/i }).click();

      // Add first invitation
      await page.getByLabel(/email.*1/i).fill(invitations[0].email);
      await page.getByLabel(/name.*1/i).fill(invitations[0].full_name);
      await page.getByLabel(/role.*1/i).selectOption(invitations[0].role);
      await page.getByLabel(/department.*1/i).fill(invitations[0].department);

      // Add second invitation
      await page.getByRole('button', { name: /add.*another/i }).click();
      await page.getByLabel(/email.*2/i).fill(invitations[1].email);
      await page.getByLabel(/name.*2/i).fill(invitations[1].full_name);
      await page.getByLabel(/role.*2/i).selectOption(invitations[1].role);
      await page.getByLabel(/department.*2/i).fill(invitations[1].department);

      // Send invitations
      const inviteResponse = page.waitForResponse(response => 
        response.url().includes('/bulk/users/invite')
      );

      await page.getByRole('button', { name: /send.*invitations/i }).click();

      // Validate invitation API call
      const inviteRes = await inviteResponse;
      expect(inviteRes.status()).toBe(200);

      const inviteData = await inviteRes.json();
      expect(inviteData.success_count).toBe(2);
      expect(inviteData.invited_emails).toContain(invitations[0].email);

      // Should show success message
      await expect(page.getByText(/2.*invitations.*sent/i)).toBeVisible();
    });

    test('should perform bulk role changes @critical', async ({ page }) => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const newRole = 'MANAGER';

      // Mock bulk role change API
      await page.route('**/bulk/users/role-change', async route => {
        if (route.request().method() === 'POST') {
          const requestBody = await route.request().postDataJSON();
          
          expect(requestBody.user_ids).toEqual(userIds);
          expect(requestBody.new_role).toBe(newRole);

          await route.fulfill({
            status: 200,
            json: {
              operation_type: 'bulk_role_change',
              total_requested: 3,
              success_count: 3,
              failed_count: 0,
              processing_time_ms: 800,
              updated_ids: userIds,
              errors: [],
              warnings: ['Role changes will take effect immediately']
            }
          });
        }
      });

      await page.goto('/users');

      // Select users for role change
      await page.getByTestId('user-checkbox-1').check();
      await page.getByTestId('user-checkbox-2').check();
      await page.getByTestId('user-checkbox-3').check();

      // Open bulk role change modal
      await page.getByRole('button', { name: /bulk.*role.*change/i }).click();

      // Select new role
      await page.getByLabel(/new role/i).selectOption(newRole);

      // Confirm role change
      const roleChangeResponse = page.waitForResponse(response => 
        response.url().includes('/bulk/users/role-change')
      );

      await page.getByRole('button', { name: /change.*roles/i }).click();

      // Validate role change API call
      const roleRes = await roleChangeResponse;
      expect(roleRes.status()).toBe(200);

      // Should show success message
      await expect(page.getByText(/3.*users.*roles.*updated/i)).toBeVisible();
      await expect(page.getByText(/take effect immediately/i)).toBeVisible();
    });
  });

  test.describe('Bulk Operations Progress and Status', () => {
    test('should track long-running bulk operations @performance', async ({ page }) => {
      const operationId = 'long-running-bulk-123';

      // Mock bulk operation that takes time
      await page.route('**/bulk/contracts/update', async route => {
        await route.fulfill({
          status: 202, // Accepted - operation started
          json: {
            operation_id: operationId,
            status: 'PENDING',
            message: 'Bulk operation has been queued'
          }
        });
      });

      // Mock operation status endpoint
      await page.route(`**/bulk/status/${operationId}`, async route => {
        await route.fulfill({
          status: 200,
          json: {
            operation_id: operationId,
            status: 'PROCESSING',
            progress_percentage: 60,
            message: 'Processing 60 of 100 contracts',
            started_at: '2024-01-01T10:00:00Z',
            estimated_completion: '2024-01-01T10:05:00Z'
          }
        });
      });

      await page.goto('/contracts');
      await page.waitForResponse(response => response.url().includes('/contracts'));

      // Select all contracts for a large operation
      await page.evaluate(() => {
        const selectAll = document.querySelector('[data-testid="select-all-checkbox"]') as HTMLInputElement;
        if (selectAll) selectAll.click();
      });

      await page.getByRole('button', { name: /bulk.*update/i }).click();
      await page.getByLabel(/status/i).selectOption('ACTIVE');
      await page.getByRole('button', { name: /update.*contracts/i }).click();

      // Should show operation queued message
      await expect(page.getByText(/operation.*queued/i)).toBeVisible();
      
      // Should redirect to operations tracking page
      await expect(page).toHaveURL(/\/operations/);
      
      // Should show operation progress
      await expect(page.getByText(/60%/)).toBeVisible();
      await expect(page.getByText(/processing.*60.*of.*100/i)).toBeVisible();
      
      // Should show estimated completion
      await expect(page.getByText(/estimated.*completion/i)).toBeVisible();
    });

    test('should handle bulk operation failures gracefully @critical', async ({ page }) => {
      // Mock bulk operation that fails
      await page.route('**/bulk/contracts/update', async route => {
        await route.fulfill({
          status: 500,
          json: {
            detail: 'Bulk operation service temporarily unavailable'
          }
        });
      });

      await page.goto('/contracts');
      await page.waitForResponse(response => response.url().includes('/contracts'));

      await page.getByTestId('contract-checkbox-1').check();
      await page.getByTestId('contract-checkbox-2').check();

      await page.getByRole('button', { name: /bulk.*update/i }).click();
      await page.getByLabel(/status/i).selectOption('ACTIVE');
      await page.getByRole('button', { name: /update.*contracts/i }).click();

      // Should show error message
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByText(/service.*temporarily.*unavailable/i)).toBeVisible();
      
      // Should offer retry option
      await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
      
      // Should allow user to cancel operation
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    });

    test('should validate bulk operation limits and quotas @security', async ({ page }) => {
      // Mock quota exceeded response
      await page.route('**/bulk/contracts/update', async route => {
        await route.fulfill({
          status: 429, // Too Many Requests
          json: {
            detail: 'Bulk operation quota exceeded. Maximum 50 contracts per operation.',
            quota: {
              max_contracts_per_operation: 50,
              current_request: 75,
              daily_quota_remaining: 200
            }
          }
        });
      });

      await page.goto('/contracts');
      
      // Mock selecting more contracts than allowed
      await page.evaluate(() => {
        // Simulate 75 contracts selected
        window.mockSelectedContracts = Array.from({ length: 75 }, (_, i) => `contract-${i}`);
      });

      await page.getByRole('button', { name: /bulk.*update/i }).click();
      await page.getByLabel(/status/i).selectOption('ACTIVE');
      await page.getByRole('button', { name: /update.*contracts/i }).click();

      // Should show quota exceeded error
      await expect(page.getByText(/quota exceeded/i)).toBeVisible();
      await expect(page.getByText(/maximum 50 contracts/i)).toBeVisible();
      
      // Should show current quota info
      await expect(page.getByText(/200.*remaining/i)).toBeVisible();
      
      // Should suggest breaking into smaller operations
      await expect(page.getByText(/break.*into.*smaller.*batches/i)).toBeVisible();
    });
  });
});