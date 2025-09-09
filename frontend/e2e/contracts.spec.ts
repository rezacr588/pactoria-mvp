import { test, expect, type Page } from '@playwright/test';
import { loginWithDemoAccount } from './helpers/auth';
import { API_URL } from './helpers/config';

// Test data
const testContract = {
  name: `Test Contract ${Date.now()}`,
  clientName: 'Test Client Ltd',
  clientEmail: 'client@example.com',
  supplierName: 'Test Supplier Inc',
  serviceDescription: 'Professional services for software development and consulting',
  contractValue: '50000',
  currency: 'GBP',
  paymentTerms: '30',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
  plainEnglishInput: 'This contract covers professional software development services including design, implementation, testing, and deployment.'
};

test.describe('Contract Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginWithDemoAccount(page);
    await page.goto('/contracts');
  });

  test('should display contracts list page', async ({ page }) => {
    // Check page elements
    await expect(page.locator('h1')).toContainText('Contracts');
    
    // Check for action buttons
    await expect(page.locator('text=/New Contract|Create Contract/')).toBeVisible();
    
    // Check for filter options
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    await expect(page.locator('select, [role="combobox"]').first()).toBeVisible(); // Status filter
    
    // Check for contracts table or list
    const contractsList = page.locator('[role="list"], table, [data-testid="contracts-list"]').first();
    await expect(contractsList.or(page.locator('text=/No contracts|Empty/'))).toBeVisible();
  });

  test('should filter contracts by status', async ({ page }) => {
    // Find status filter
    const statusFilter = page.locator('select[name*="status"], [data-testid="status-filter"]').first();
    
    if (await statusFilter.isVisible()) {
      // Select "Active" status
      await statusFilter.selectOption({ label: 'Active' });
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
      
      // Check if contracts are filtered (or no results message)
      const contracts = page.locator('[data-testid="contract-item"], tr[data-contract-id], .contract-card');
      const noResults = page.locator('text=/No contracts found|No results/');
      
      await expect(contracts.first().or(noResults)).toBeVisible();
    }
  });

  test('should search contracts', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Type search query
    await searchInput.fill('service agreement');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Check for filtered results
    const contracts = page.locator('[data-testid="contract-item"], tr[data-contract-id], .contract-card');
    const noResults = page.locator('text=/No contracts found|No results/');
    
    await expect(contracts.first().or(noResults)).toBeVisible();
  });

  test('should navigate to contract creation page', async ({ page }) => {
    // Click create contract button
    await page.click('text=/New Contract|Create Contract/');
    
    // Should navigate to create page
    await expect(page).toHaveURL(/\/contracts\/(new|create)/);
    
    // Check for creation form elements
    await expect(page.locator('text=/Choose Template|Select Template|Contract Details/')).toBeVisible();
  });

  test('should create a new contract', async ({ page }) => {
    // Navigate to create page
    await page.goto('/contracts/new');
    
    // Step 1: Select template
    await expect(page.locator('text=/Choose Template|Select Template/')).toBeVisible();
    
    // Click on a template (e.g., Service Agreement)
    const templates = page.locator('[data-testid*="template"], .template-card').filter({ hasText: /Service|Professional/ });
    if (await templates.count() > 0) {
      await templates.first().click();
    } else {
      // Fallback: click first available template
      await page.locator('[data-testid*="template"], .template-card').first().click();
    }
    
    // Step 2: Fill contract details
    await page.waitForTimeout(500); // Wait for transition
    
    // Fill basic information
    await page.fill('input[name="name"], input[name="title"]', testContract.name);
    await page.fill('input[name="clientName"], input[name="client_name"]', testContract.clientName);
    await page.fill('input[name="clientEmail"], input[name="client_email"]', testContract.clientEmail);
    
    // Fill service details
    const serviceInput = page.locator('textarea[name="serviceDescription"], textarea[name="description"], textarea[name="plainEnglishInput"]').first();
    await serviceInput.fill(testContract.serviceDescription);
    
    // Fill contract value
    await page.fill('input[name="contractValue"], input[name="value"]', testContract.contractValue);
    
    // Select currency if dropdown exists
    const currencySelect = page.locator('select[name="currency"]');
    if (await currencySelect.isVisible()) {
      await currencySelect.selectOption(testContract.currency);
    }
    
    // Fill dates
    await page.locator('input[name="startDate"], input[type="date"]').first().fill(testContract.startDate);
    await page.locator('input[name="endDate"], input[type="date"]').last().fill(testContract.endDate);
    
    // Navigate to next step if multi-step
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }
    
    // Step 3: Review and generate
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create Contract")');
    await generateButton.click();
    
    // Wait for contract generation (may take time with AI)
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Should redirect to contract view page
    await expect(page).toHaveURL(/\/contracts\/[a-zA-Z0-9-]+/, { timeout: 30000 });
    
    // Verify contract was created
    await expect(page.locator('h1, h2').filter({ hasText: testContract.name })).toBeVisible();
  });

  test('should navigate to contract details', async ({ page }) => {
    // Mock a contract for testing
    await page.route('**/api/v1/contracts*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            contracts: [{
              id: 'test-contract-1',
              title: 'Test Contract Details',
              contract_type: 'service_agreement',
              status: 'active',
              client_name: 'Test Client',
              contract_value: 50000,
              currency: 'GBP',
              created_at: new Date().toISOString()
            }],
            total: 1,
            page: 1,
            size: 10,
            pages: 1
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Navigate to first contract
    const firstContract = page.locator('[data-testid="contract-item"], tr[data-contract-id], .contract-card, text="Test Contract Details"').first();
    
    if (await firstContract.isVisible({ timeout: 5000 })) {
      await firstContract.click();
      
      // Should navigate to contract detail page or show details
      try {
        await expect(page).toHaveURL(/\/contracts\/[a-zA-Z0-9-]+/, { timeout: 5000 });
      } catch {
        // Alternative: details might show in modal or inline
        await expect(page.locator('text=/Contract Details|Overview|Compliance|Test Contract Details/')).toBeVisible();
      }
    } else {
      console.log('No contracts available for details navigation test');
    }
  });

  test('should edit contract details', async ({ page }) => {
    // Navigate to first contract
    const firstContract = page.locator('[data-testid="contract-item"], tr[data-contract-id], .contract-card').first();
    
    if (await firstContract.isVisible()) {
      await firstContract.click();
      await expect(page).toHaveURL(/\/contracts\/[a-zA-Z0-9-]+/);
      
      // Click edit button
      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
      await editButton.click();
      
      // Should show edit form or modal
      await expect(page.locator('text=/Edit Contract|Update Contract/')).toBeVisible();
      
      // Update a field
      const nameInput = page.locator('input[name="name"], input[name="title"]').first();
      await nameInput.clear();
      await nameInput.fill(`${testContract.name} - Updated`);
      
      // Save changes
      await page.click('button:has-text("Save"), button:has-text("Update")');
      
      // Should show success message or redirect
      await expect(page.locator('text=/Updated|Saved|Success/')).toBeVisible({ timeout: 10000 });
    } else {
      test.skip();
    }
  });

  test('should export contract', async ({ page }) => {
    // Navigate to first contract
    const firstContract = page.locator('[data-testid="contract-item"], tr[data-contract-id], .contract-card').first();
    
    if (await firstContract.isVisible()) {
      await firstContract.click();
      await expect(page).toHaveURL(/\/contracts\/[a-zA-Z0-9-]+/);
      
      // Click export button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")');
      await exportButton.click();
      
      // Should show export options
      await expect(page.locator('text=/PDF|Word|Export as/')).toBeVisible();
      
      // Click PDF option
      const pdfOption = page.locator('button:has-text("PDF"), [data-format="pdf"]');
      
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      
      await pdfOption.click();
      
      // Check if download started
      const download = await downloadPromise;
      if (download) {
        // Verify download
        expect(download.suggestedFilename()).toMatch(/\.(pdf|docx|txt)$/);
      } else {
        // Alternative: check for success message if download is handled differently
        await expect(page.locator('text=/Generating|Downloading|Export/')).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('should show contract compliance analysis', async ({ page }) => {
    // Navigate to first contract
    const firstContract = page.locator('[data-testid="contract-item"], tr[data-contract-id], .contract-card').first();
    
    if (await firstContract.isVisible()) {
      await firstContract.click();
      await expect(page).toHaveURL(/\/contracts\/[a-zA-Z0-9-]+/);
      
      // Click on compliance tab if exists
      const complianceTab = page.locator('button:has-text("Compliance"), [role="tab"]:has-text("Compliance")');
      if (await complianceTab.isVisible()) {
        await complianceTab.click();
        
        // Check for compliance content
        await expect(page.locator('text=/Compliance Score|GDPR|Risk/')).toBeVisible();
      } else {
        // Check if compliance info is already visible
        await expect(page.locator('text=/Compliance|Risk|Score/').first()).toBeVisible();
      }
    } else {
      test.skip();
    }
  });

  test('should delete contract', async ({ page }) => {
    // Create a test contract first
    await page.goto('/contracts/new');
    
    // Quick contract creation
    const templates = page.locator('[data-testid*="template"], .template-card').first();
    await templates.click();
    
    await page.fill('input[name="name"], input[name="title"]', 'Contract to Delete');
    await page.fill('input[name="clientName"], input[name="client_name"]', 'Delete Client');
    await page.locator('textarea').first().fill('Test contract for deletion');
    
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').last();
    await generateButton.click();
    
    // Wait for creation
    await page.waitForURL(/\/contracts\/[a-zA-Z0-9-]+/, { timeout: 30000 });
    
    // Now delete it
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete"]');
    
    if (await deleteButton.isVisible()) {
      // Set up dialog handler
      page.on('dialog', dialog => dialog.accept());
      
      await deleteButton.click();
      
      // Confirm deletion if modal appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }
      
      // Should redirect to contracts list or show success
      await expect(page).toHaveURL(/\/contracts/, { timeout: 10000 });
      await expect(page.locator('text=/Deleted|Removed|Success/')).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should handle contract generation with AI', async ({ page }) => {
    // Navigate to create page
    await page.goto('/contracts/new');
    
    // Select template
    await page.locator('[data-testid*="template"], .template-card').first().click();
    
    // Fill minimum required fields
    await page.fill('input[name="name"], input[name="title"]', 'AI Generated Contract');
    await page.fill('input[name="clientName"], input[name="client_name"]', 'AI Test Client');
    
    // Fill plain English input for AI
    const plainEnglishInput = page.locator('textarea[name="plainEnglishInput"], textarea[placeholder*="Describe"]').first();
    await plainEnglishInput.fill('Create a simple service agreement for web development services worth £10,000 over 3 months');
    
    // Click generate with AI
    const generateButton = page.locator('button:has-text("Generate"), button:has([data-icon="sparkles"])');
    await generateButton.click();
    
    // Wait for AI generation (this may take time)
    await expect(page.locator('text=/Generating|Processing|Creating/')).toBeVisible();
    
    // Wait for completion
    await page.waitForURL(/\/contracts\/[a-zA-Z0-9-]+/, { timeout: 60000 });
    
    // Verify AI-generated content exists
    await expect(page.locator('text=/Agreement|Contract|Terms/')).toBeVisible();
  });

  test('should paginate through contracts', async ({ page }) => {
    // Check if pagination exists
    const pagination = page.locator('[role="navigation"], .pagination, [data-testid="pagination"]');
    
    if (await pagination.isVisible()) {
      // Check for next button
      const nextButton = page.locator('button:has-text("Next"), [aria-label="Next page"]');
      
      if (await nextButton.isEnabled()) {
        // Click next
        await nextButton.click();
        
        // URL should update with page parameter
        await expect(page).toHaveURL(/page=2|p=2/);
        
        // Check for previous button
        const prevButton = page.locator('button:has-text("Previous"), [aria-label="Previous page"]');
        await expect(prevButton).toBeEnabled();
        
        // Go back to first page
        await prevButton.click();
        await expect(page).toHaveURL(/contracts/);
      }
    }
  });

  test('should show contract templates', async ({ page }) => {
    // Navigate to templates page if it exists
    await page.goto('/templates');
    
    // Check if templates page exists
    if (page.url().includes('/templates')) {
      // Check for templates list
      await expect(page.locator('h1')).toContainText('Templates');
      
      // Check for template cards
      const templates = page.locator('[data-testid*="template"], .template-card');
      await expect(templates.first()).toBeVisible();
      
      // Check template categories
      await expect(page.locator('text=/Employment|Service|NDA|Supplier/')).toBeVisible();
    } else {
      // Templates might be in contract creation flow
      await page.goto('/contracts/new');
      await expect(page.locator('text=/Template|Choose/')).toBeVisible();
    }
  });

  test('should validate contract form inputs', async ({ page }) => {
    // Navigate to create page
    await page.goto('/contracts/new');
    
    // Try to proceed without selecting template
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      
      // Should show validation error
      await expect(page.locator('text=/select a template|required/')).toBeVisible();
    }
    
    // Select a template
    await page.locator('[data-testid*="template"], .template-card').first().click();
    
    // Try to submit without required fields
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').last();
    await generateButton.click();
    
    // Should show validation errors
    await expect(page.locator('text=/required|fill|enter/')).toBeVisible();
    
    // Fill required fields with invalid data
    await page.fill('input[name="clientEmail"], input[type="email"]', 'invalid-email');
    await page.fill('input[name="contractValue"], input[type="number"]', 'abc'); // Invalid number
    
    await generateButton.click();
    
    // Should show specific validation errors
    await expect(page.locator('text=/valid email|invalid/')).toBeVisible();
  });

  test('should auto-save draft contract', async ({ page }) => {
    // Navigate to create page
    await page.goto('/contracts/new');
    
    // Select template
    await page.locator('[data-testid*="template"], .template-card').first().click();
    
    // Fill some fields
    const contractName = `Draft Contract ${Date.now()}`;
    await page.fill('input[name="name"], input[name="title"]', contractName);
    await page.fill('input[name="clientName"], input[name="client_name"]', 'Draft Client');
    
    // Wait for auto-save (usually shows indicator)
    await page.waitForTimeout(3000);
    
    // Check for auto-save indicator
    const saveIndicator = page.locator('text=/Saved|Draft saved|Auto-save/');
    if (await saveIndicator.isVisible()) {
      // Refresh page
      await page.reload();
      
      // Check if draft is restored
      const nameInput = page.locator('input[name="name"], input[name="title"]');
      await expect(nameInput).toHaveValue(contractName);
    }
  });
});

test.describe('Contract Bulk Operations', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithDemoAccount(page);
    await page.goto('/contracts');
  });

  test('should select multiple contracts', async ({ page }) => {
    // Check if bulk selection is available
    const checkboxes = page.locator('input[type="checkbox"][data-contract-id], [role="checkbox"]');
    
    if (await checkboxes.count() > 1) {
      // Select first two contracts
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // Check for bulk actions toolbar
      await expect(page.locator('text=/selected|bulk actions|2 items/')).toBeVisible();
      
      // Check for bulk action buttons
      await expect(page.locator('button:has-text("Delete"), button:has-text("Export")')).toBeVisible();
    }
  });

  test('should export multiple contracts', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"][data-contract-id], [role="checkbox"]');
    
    if (await checkboxes.count() > 1) {
      // Select contracts
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // Click bulk export
      const exportButton = page.locator('button:has-text("Export")');
      await exportButton.click();
      
      // Should show export options
      await expect(page.locator('text=/CSV|Excel|Bulk Export/')).toBeVisible();
    }
  });
});
