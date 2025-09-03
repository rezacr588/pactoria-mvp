import { test, expect } from '@playwright/test';

test.describe('Bulk Operations', () => {
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

    // Mock contracts list for selection
    await page.route('**/api/v1/contracts', async (route) => {
      await route.fulfill({
        json: {
          contracts: [
            {
              id: '1',
              title: 'Service Agreement A',
              contract_type: 'SERVICE_AGREEMENT',
              status: 'DRAFT',
              client_name: 'Client A',
              contract_value: 10000,
              currency: 'GBP',
              version: 1,
              is_current_version: true,
              created_at: '2024-01-01T00:00:00Z'
            },
            {
              id: '2',
              title: 'Service Agreement B',
              contract_type: 'SERVICE_AGREEMENT',
              status: 'DRAFT',
              client_name: 'Client B',
              contract_value: 15000,
              currency: 'GBP',
              version: 1,
              is_current_version: true,
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

    // Mock bulk operation endpoints
    await page.route('**/api/v1/bulk/contracts/update', async (route) => {
      const requestBody = route.request().postDataJSON();
      await route.fulfill({
        json: {
          operation_type: 'bulk_update',
          total_requested: requestBody.contract_ids.length,
          success_count: requestBody.contract_ids.length,
          failed_count: 0,
          processing_time_ms: 1500,
          updated_ids: requestBody.contract_ids,
          errors: [],
          warnings: []
        }
      });
    });

    await page.route('**/api/v1/bulk/contracts/delete', async (route) => {
      const requestBody = route.request().postDataJSON();
      await route.fulfill({
        json: {
          operation_type: 'bulk_delete',
          total_requested: requestBody.contract_ids.length,
          success_count: requestBody.contract_ids.length,
          failed_count: 0,
          processing_time_ms: 800,
          deleted_ids: requestBody.contract_ids,
          errors: [],
          warnings: []
        }
      });
    });

    await page.route('**/api/v1/bulk/contracts/export', async (route) => {
      const requestBody = route.request().postDataJSON();
      await route.fulfill({
        json: {
          export_id: 'export-123',
          format: requestBody.format,
          total_records: requestBody.contract_ids.length,
          file_size_bytes: 1024000,
          download_url: 'https://example.com/download/export-123.csv',
          expires_at: '2024-01-02T00:00:00Z',
          processing_time_ms: 2000
        }
      });
    });

    await page.route('**/api/v1/bulk/users/invite', async (route) => {
      const requestBody = route.request().postDataJSON();
      await route.fulfill({
        json: {
          operation_type: 'bulk_invite',
          total_requested: requestBody.invitations.length,
          success_count: requestBody.invitations.length,
          failed_count: 0,
          processing_time_ms: 1200,
          invited_emails: requestBody.invitations.map(inv => inv.email),
          errors: [],
          warnings: []
        }
      });
    });

    await page.route('**/api/v1/bulk/users/role-change', async (route) => {
      const requestBody = route.request().postDataJSON();
      await route.fulfill({
        json: {
          operation_type: 'bulk_role_change',
          total_requested: requestBody.user_ids.length,
          success_count: requestBody.user_ids.length,
          failed_count: 0,
          processing_time_ms: 900,
          updated_ids: requestBody.user_ids,
          errors: [],
          warnings: []
        }
      });
    });

    // Navigate to contracts page with bulk operations
    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');
  });

  test('should display bulk operations interface @smoke', async ({ page }) => {
    // Check that contracts are loaded
    await expect(page.getByText('Service Agreement A')).toBeVisible();
    await expect(page.getByText('Service Agreement B')).toBeVisible();

    // Select contracts for bulk operations
    const checkboxes = page.locator('input[type="checkbox"][data-contract-id]');
    await checkboxes.first().check();
    await checkboxes.nth(1).check();

    // Bulk operations panel should appear
    await expect(page.getByText('Bulk Operations')).toBeVisible();
    await expect(page.getByText('Contract Operations (2 selected)')).toBeVisible();
  });

  test('should perform bulk contract update @regression', async ({ page }) => {
    // Select contracts
    const checkboxes = page.locator('input[type="checkbox"][data-contract-id]');
    await checkboxes.first().check();
    await checkboxes.nth(1).check();

    // Open bulk update
    await page.getByRole('button', { name: 'Bulk Update' }).click();

    // Fill update form
    await expect(page.getByText('Bulk Update Contracts (2 selected)')).toBeVisible();
    await page.getByLabel('Status').selectOption('ACTIVE');
    await page.getByLabel('Client Name').fill('Updated Client');
    await page.getByLabel('Contract Value').fill('25000');

    // Submit update
    await page.getByRole('button', { name: 'Update Contracts' }).click();

    // Wait for API call and success
    const response = await page.waitForResponse('**/api/v1/bulk/contracts/update');
    const responseBody = await response.json();
    expect(responseBody.success_count).toBe(2);

    // Should show success message
    await expect(page.getByText(/updated.*2.*contracts/i)).toBeVisible();
  });

  test('should perform bulk contract delete @regression', async ({ page }) => {
    // Select one contract
    const checkbox = page.locator('input[type="checkbox"][data-contract-id]').first();
    await checkbox.check();

    // Open bulk delete
    await page.getByRole('button', { name: 'Bulk Delete' }).click();

    // Fill deletion reason
    await expect(page.getByText('Bulk Delete Contracts (1 selected)')).toBeVisible();
    await page.getByLabel('Reason for Deletion *').fill('No longer needed for testing');

    // Confirm deletion
    await page.getByRole('button', { name: 'Delete Contracts' }).click();

    // Wait for API call
    await page.waitForResponse('**/api/v1/bulk/contracts/delete');

    // Should show success message
    await expect(page.getByText(/deleted.*1.*contract/i)).toBeVisible();
  });

  test('should export selected contracts @regression', async ({ page }) => {
    // Select both contracts
    const checkboxes = page.locator('input[type="checkbox"][data-contract-id]');
    await checkboxes.first().check();
    await checkboxes.nth(1).check();

    // Open export dialog
    await page.getByRole('button', { name: 'Export' }).click();

    // Configure export
    await expect(page.getByText('Bulk Export Contracts (2 selected)')).toBeVisible();
    await page.getByLabel('Export Format').selectOption('EXCEL');
    
    // Select specific fields
    await page.getByText('Title').check();
    await page.getByText('Status').check();
    await page.getByText('Client Name').check();
    await page.getByText('Contract Value').check();

    // Mock download link click
    const downloadPromise = page.waitForEvent('download');
    
    // Start export
    await page.getByRole('button', { name: 'Export Contracts' }).click();

    // Wait for API response
    await page.waitForResponse('**/api/v1/bulk/contracts/export');

    // Should show export success (download would be triggered automatically)
    await expect(page.getByText(/export.*completed/i)).toBeVisible();
  });

  test('should handle bulk user invitations @regression', async ({ page }) => {
    // Access bulk invite (not dependent on contract selection)
    await page.getByRole('button', { name: 'Invite Users' }).click();

    // Fill invitation form
    await expect(page.getByText('Bulk Invite Users')).toBeVisible();
    
    // First user
    await page.getByPlaceholder('Email address').first().fill('newuser1@example.com');
    await page.getByPlaceholder('Full name').first().fill('New User 1');
    await page.locator('select').first().selectOption('CONTRACT_MANAGER');
    await page.getByPlaceholder('Department (optional)').first().fill('Legal');

    // Add another user
    await page.getByRole('button', { name: 'Add Another User' }).click();
    
    await page.getByPlaceholder('Email address').nth(1).fill('newuser2@example.com');
    await page.getByPlaceholder('Full name').nth(1).fill('New User 2');
    await page.locator('select').nth(1).selectOption('LEGAL_REVIEWER');

    // Send invitations
    await page.getByRole('button', { name: 'Send Invitations' }).click();

    // Wait for API call
    const response = await page.waitForResponse('**/api/v1/bulk/users/invite');
    const responseBody = await response.json();
    expect(responseBody.invited_emails).toHaveLength(2);

    // Should show success
    await expect(page.getByText(/invited.*2.*users/i)).toBeVisible();
  });

  test('should handle bulk role changes @regression', async ({ page }) => {
    // Mock user selection (assuming users are displayed somewhere)
    await page.evaluate(() => {
      // Simulate selected user IDs in the UI state
      window.selectedUserIds = ['user1', 'user2', 'user3'];
    });

    // Open role change dialog
    await page.getByRole('button', { name: 'Change Roles' }).click();

    // Select new role
    await expect(page.getByText('Bulk Change User Roles (3 selected)')).toBeVisible();
    await page.getByLabel('New Role').selectOption('CONTRACT_MANAGER');

    // Confirm change
    await page.getByRole('button', { name: 'Update User Roles' }).click();

    // Wait for API call
    await page.waitForResponse('**/api/v1/bulk/users/role-change');

    // Should show success
    await expect(page.getByText(/updated.*3.*user roles/i)).toBeVisible();
  });

  test('should handle partial failures gracefully @regression', async ({ page }) => {
    // Mock API response with some failures
    await page.route('**/api/v1/bulk/contracts/update', async (route) => {
      await route.fulfill({
        json: {
          operation_type: 'bulk_update',
          total_requested: 2,
          success_count: 1,
          failed_count: 1,
          processing_time_ms: 1500,
          updated_ids: ['1'],
          errors: [
            {
              resource_id: '2',
              error_code: 'VALIDATION_ERROR',
              error_message: 'Contract is locked for editing',
              details: { reason: 'contract_locked' }
            }
          ],
          warnings: ['Some contracts may have validation issues']
        }
      });
    });

    // Select contracts and attempt update
    const checkboxes = page.locator('input[type="checkbox"][data-contract-id]');
    await checkboxes.first().check();
    await checkboxes.nth(1).check();

    await page.getByRole('button', { name: 'Bulk Update' }).click();
    await page.getByLabel('Status').selectOption('ACTIVE');
    await page.getByRole('button', { name: 'Update Contracts' }).click();

    // Wait for response
    await page.waitForResponse('**/api/v1/bulk/contracts/update');

    // Should show partial success message
    await expect(page.getByText(/updated.*1.*contracts.*1.*failed/i)).toBeVisible();
    await expect(page.getByText('Contract is locked for editing')).toBeVisible();
  });

  test('should validate required fields @regression', async ({ page }) => {
    // Try bulk delete without reason
    const checkbox = page.locator('input[type="checkbox"][data-contract-id]').first();
    await checkbox.check();

    await page.getByRole('button', { name: 'Bulk Delete' }).click();
    
    // Don't fill reason, just try to delete
    await page.getByRole('button', { name: 'Delete Contracts' }).click();

    // Should show validation error
    await expect(page.getByText(/reason.*required/i)).toBeVisible();
  });

  test('should cancel operations @regression', async ({ page }) => {
    // Start bulk update but cancel
    const checkbox = page.locator('input[type="checkbox"][data-contract-id]').first();
    await checkbox.check();

    await page.getByRole('button', { name: 'Bulk Update' }).click();
    await expect(page.getByText('Bulk Update Contracts')).toBeVisible();

    // Cancel the operation
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Should return to main view
    await expect(page.getByText('Bulk Update Contracts')).not.toBeVisible();
    await expect(page.getByText('Bulk Operations')).toBeVisible();
  });

  test('should handle empty selections appropriately @regression', async ({ page }) => {
    // Try to access bulk operations without selections
    await expect(page.getByText('Select contracts or users to enable bulk operations')).toBeVisible();

    // Bulk operation buttons should be disabled or not visible
    await expect(page.getByRole('button', { name: 'Bulk Update' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Bulk Delete' })).not.toBeVisible();

    // General operations (like invite users) should still be available
    await expect(page.getByRole('button', { name: 'Invite Users' })).toBeVisible();
  });

  test('should show operation progress @regression', async ({ page }) => {
    // Mock slower API response to see loading states
    await page.route('**/api/v1/bulk/contracts/update', async (route) => {
      // Delay response to simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const requestBody = route.request().postDataJSON();
      await route.fulfill({
        json: {
          operation_type: 'bulk_update',
          total_requested: requestBody.contract_ids.length,
          success_count: requestBody.contract_ids.length,
          failed_count: 0,
          processing_time_ms: 2000,
          updated_ids: requestBody.contract_ids
        }
      });
    });

    const checkbox = page.locator('input[type="checkbox"][data-contract-id]').first();
    await checkbox.check();

    await page.getByRole('button', { name: 'Bulk Update' }).click();
    await page.getByLabel('Status').selectOption('ACTIVE');
    
    const updateButton = page.getByRole('button', { name: 'Update Contracts' });
    await updateButton.click();

    // Should show loading state
    await expect(page.getByText('Updating...')).toBeVisible();
    await expect(updateButton).toBeDisabled();

    // Wait for completion
    await page.waitForResponse('**/api/v1/bulk/contracts/update');
    
    // Loading should be gone
    await expect(page.getByText('Updating...')).not.toBeVisible();
  });
});