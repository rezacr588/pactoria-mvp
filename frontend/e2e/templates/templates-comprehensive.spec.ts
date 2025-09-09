import { test, expect } from '@playwright/test';
import { loginWithTestAccount } from '../helpers/auth';

test.describe('Templates Page - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestAccount(page);
    
    // Mock templates API data
    await page.route('**/api/v1/templates/**', async route => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (url.includes('/list') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            templates: [
              {
                id: 1,
                name: 'Service Agreement Template',
                description: 'Standard service agreement for consulting projects',
                category: 'service_agreements',
                type: 'contract',
                created_by: 'Admin User',
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-03-10T14:30:00Z',
                usage_count: 25,
                status: 'active',
                is_default: true,
                content: {
                  clauses: [
                    { type: 'payment_terms', content: 'Payment terms: Net 30 days' },
                    { type: 'scope_of_work', content: 'Scope of work to be defined' },
                    { type: 'termination', content: 'Either party may terminate with 30 days notice' }
                  ]
                }
              },
              {
                id: 2,
                name: 'NDA Template',
                description: 'Non-disclosure agreement for confidential information',
                category: 'legal',
                type: 'nda',
                created_by: 'Legal Team',
                created_at: '2024-02-01T09:00:00Z',
                updated_at: '2024-02-15T11:20:00Z',
                usage_count: 18,
                status: 'active',
                is_default: false,
                content: {
                  clauses: [
                    { type: 'confidentiality', content: 'All information shared is confidential' },
                    { type: 'duration', content: 'This agreement remains in effect for 2 years' }
                  ]
                }
              },
              {
                id: 3,
                name: 'Consulting Agreement Draft',
                description: 'Draft template for consulting agreements',
                category: 'consulting',
                type: 'contract',
                created_by: 'Manager Smith',
                created_at: '2024-03-01T16:45:00Z',
                updated_at: '2024-03-05T10:15:00Z',
                usage_count: 3,
                status: 'draft',
                is_default: false,
                content: {
                  clauses: [
                    { type: 'deliverables', content: 'Deliverables to be specified' },
                    { type: 'intellectual_property', content: 'IP ownership terms' }
                  ]
                }
              }
            ],
            categories: [
              { name: 'service_agreements', display_name: 'Service Agreements', count: 1 },
              { name: 'legal', display_name: 'Legal Documents', count: 1 },
              { name: 'consulting', display_name: 'Consulting', count: 1 }
            ],
            total: 3
          })
        });
      } else if (url.includes('/create') && method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 4,
            name: 'New Template',
            status: 'draft',
            created_at: new Date().toISOString()
          })
        });
      } else if (url.includes('/templates/') && method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            name: 'Updated Service Agreement Template',
            updated_at: new Date().toISOString()
          })
        });
      } else if (url.includes('/templates/') && method === 'DELETE') {
        await route.fulfill({
          status: 204
        });
      } else if (url.includes('/duplicate') && method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 5,
            name: 'Copy of Service Agreement Template',
            status: 'draft'
          })
        });
      }
    });
    
    await page.goto('/templates');
  });

  test('should display templates list @smoke', async ({ page }) => {
    // Check main page heading
    await expect(page.locator('h1')).toContainText(/Templates|Contract Templates|Document Templates/);
    
    // Check for templates list
    await expect(page.locator('text="Service Agreement Template"')).toBeVisible();
    await expect(page.locator('text="NDA Template"')).toBeVisible();
    await expect(page.locator('text="Consulting Agreement Draft"')).toBeVisible();
    
    // Check for create template button
    await expect(page.locator('button:has-text("Create"), button:has-text("New Template"), [data-testid="create-template"]')).toBeVisible();
  });

  test('should create new template', async ({ page }) => {
    // Click create template button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Template"), [data-testid="create-template"]');
    await createButton.click();
    
    // Check create modal/form opens
    await expect(page.locator('[role="dialog"], .modal, [data-testid="create-template-modal"]')).toBeVisible();
    
    // Fill template details
    const nameInput = page.locator('input[name="name"], [data-testid="template-name"]');
    await nameInput.fill('New Template Name');
    
    const descriptionInput = page.locator('textarea[name="description"], [data-testid="template-description"]');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Description for new template');
    }
    
    // Select category
    const categorySelect = page.locator('select[name="category"], [data-testid="template-category"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption('service_agreements');
    }
    
    // Submit template creation
    const submitButton = page.locator('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');
    await submitButton.click();
    
    // Check for success message
    await expect(page.locator('text*="created", text*="template", [role="alert"]')).toBeVisible();
    
    // Check new template appears in list
    await expect(page.locator('text="New Template Name"')).toBeVisible();
  });

  test('should edit existing template', async ({ page }) => {
    // Find template and edit button
    const templateRow = page.locator('[data-template-id="1"], tr:has-text("Service Agreement Template")');
    
    const editButton = templateRow.locator('button:has-text("Edit"), [data-testid="edit-template"]');
    if (await editButton.isVisible()) {
      await editButton.click();
    } else {
      // Try clicking on template name or menu
      await templateRow.click();
      const menuButton = page.locator('button[aria-label*="menu"], [data-testid="template-menu"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.locator('text="Edit"').click();
      }
    }
    
    // Check edit modal/form opens
    await expect(page.locator('[role="dialog"], .modal, [data-testid="edit-template-modal"]')).toBeVisible();
    
    // Edit template name
    const nameInput = page.locator('input[name="name"], [data-testid="template-name"]');
    await nameInput.clear();
    await nameInput.fill('Updated Service Agreement Template');
    
    // Save changes
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();
    
    // Check for success message
    await expect(page.locator('text*="updated", text*="saved", [role="alert"]')).toBeVisible();
  });

  test('should duplicate template', async ({ page }) => {
    // Find template and duplicate option
    const templateRow = page.locator('[data-template-id="1"], tr:has-text("Service Agreement Template")');
    
    const duplicateButton = templateRow.locator('button:has-text("Duplicate"), [data-testid="duplicate-template"]');
    if (await duplicateButton.isVisible()) {
      await duplicateButton.click();
    } else {
      // Try menu approach
      const menuButton = templateRow.locator('button[aria-label*="menu"], [data-testid="template-menu"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.locator('text="Duplicate", text="Copy"').click();
      }
    }
    
    // Check for success message
    await expect(page.locator('text*="duplicated", text*="copied", [role="alert"]')).toBeVisible();
    
    // Check duplicate appears in list
    await expect(page.locator('text="Copy of Service Agreement Template"')).toBeVisible();
  });

  test('should delete template', async ({ page }) => {
    // Find template for deletion (use draft template)
    const templateRow = page.locator('[data-template-id="3"], tr:has-text("Consulting Agreement Draft")');
    
    const deleteButton = templateRow.locator('button:has-text("Delete"), [data-testid="delete-template"]');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
    } else {
      // Try menu approach
      const menuButton = templateRow.locator('button[aria-label*="menu"], [data-testid="template-menu"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.locator('text="Delete"').click();
      }
    }
    
    // Check confirmation dialog
    await expect(page.locator('[role="dialog"], .modal, text*="delete"')).toBeVisible();
    
    // Confirm deletion
    const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
    await confirmButton.click();
    
    // Check template is removed
    await expect(page.locator('text="Consulting Agreement Draft"')).not.toBeVisible();
    await expect(page.locator('text*="deleted", [role="alert"]')).toBeVisible();
  });

  test('should filter templates by category', async ({ page }) => {
    // Look for category filter
    const categoryFilter = page.locator('select[name="category"], [data-testid="category-filter"]');
    if (await categoryFilter.isVisible()) {
      // Filter by legal category
      await categoryFilter.selectOption('legal');
      
      // Check only legal templates are shown
      await expect(page.locator('text="NDA Template"')).toBeVisible();
      await expect(page.locator('text="Service Agreement Template"')).not.toBeVisible();
      
      // Reset filter
      await categoryFilter.selectOption('all');
      await expect(page.locator('text="Service Agreement Template"')).toBeVisible();
    } else {
      // Try category tabs
      const legalTab = page.locator('button:has-text("Legal"), [data-filter="legal"]');
      if (await legalTab.isVisible()) {
        await legalTab.click();
        await expect(page.locator('text="NDA Template"')).toBeVisible();
      }
    }
  });

  test('should filter templates by status', async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');
    if (await statusFilter.isVisible()) {
      // Filter by draft status
      await statusFilter.selectOption('draft');
      
      // Check only draft templates are shown
      await expect(page.locator('text="Consulting Agreement Draft"')).toBeVisible();
      await expect(page.locator('text="Service Agreement Template"')).not.toBeVisible();
      
      // Reset filter
      await statusFilter.selectOption('all');
      await expect(page.locator('text="Service Agreement Template"')).toBeVisible();
    }
  });

  test('should search templates', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"], [data-testid="template-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('NDA');
      
      // Check search results
      await expect(page.locator('text="NDA Template"')).toBeVisible();
      await expect(page.locator('text="Service Agreement Template"')).not.toBeVisible();
      
      // Clear search
      await searchInput.clear();
      await expect(page.locator('text="Service Agreement Template"')).toBeVisible();
    }
  });

  test('should preview template content', async ({ page }) => {
    // Click on template to preview
    const template = page.locator('[data-template-id="1"], text="Service Agreement Template"');
    await template.click();
    
    // Check if preview modal/panel opens
    const previewModal = page.locator('[role="dialog"], .modal, [data-testid="template-preview"]');
    if (await previewModal.isVisible()) {
      // Check for template content
      await expect(page.locator('text*="Payment terms"')).toBeVisible();
      await expect(page.locator('text*="Scope of work"')).toBeVisible();
      await expect(page.locator('text*="termination"')).toBeVisible();
      
      // Close preview
      const closeButton = page.locator('button:has-text("Close"), button[aria-label*="close"]');
      await closeButton.click();
    }
  });

  test('should use template to create contract', async ({ page }) => {
    // Find template and use button
    const templateRow = page.locator('[data-template-id="1"], tr:has-text("Service Agreement Template")');
    
    const useButton = templateRow.locator('button:has-text("Use"), button:has-text("Create Contract"), [data-testid="use-template"]');
    if (await useButton.isVisible()) {
      await useButton.click();
      
      // Check navigation to contract creation with template
      await expect(page).toHaveURL(/\/contracts\/create|\/contracts\/new/);
      
      // Check that template content is loaded
      await expect(page.locator('text*="Payment terms", text*="Service Agreement"')).toBeVisible();
    }
  });

  test('should manage template permissions', async ({ page }) => {
    // Find template and permissions option
    const templateRow = page.locator('[data-template-id="1"], tr:has-text("Service Agreement Template")');
    
    const permissionsButton = templateRow.locator('button:has-text("Permissions"), [data-testid="template-permissions"]');
    if (await permissionsButton.isVisible()) {
      await permissionsButton.click();
      
      // Check permissions modal opens
      await expect(page.locator('[role="dialog"], .modal, text*="Permissions"')).toBeVisible();
      
      // Check permission options
      await expect(page.locator('text*="Public", text*="Private", text*="Team"')).toBeVisible();
      
      // Close permissions modal
      const closeButton = page.locator('button:has-text("Close"), button:has-text("Cancel")');
      await closeButton.click();
    }
  });

  test('should display template usage statistics', async ({ page }) => {
    // Check for usage count display
    await expect(page.locator('text*="25", text*="used"')).toBeVisible();
    await expect(page.locator('text*="18", text*="times"')).toBeVisible();
    
    // Click on usage stats for details
    const usageStats = page.locator('[data-testid="usage-stats"], text*="25 times"');
    if (await usageStats.isVisible()) {
      await usageStats.click();
      
      // Check for detailed usage information
      await expect(page.locator('[role="dialog"], .modal, text*="Usage Statistics"')).toBeVisible();
    }
  });

  test('should handle template versioning', async ({ page }) => {
    // Look for version management
    const templateRow = page.locator('[data-template-id="1"], tr:has-text("Service Agreement Template")');
    
    const versionsButton = templateRow.locator('button:has-text("Versions"), [data-testid="template-versions"]');
    if (await versionsButton.isVisible()) {
      await versionsButton.click();
      
      // Check versions modal opens
      await expect(page.locator('[role="dialog"], .modal, text*="Versions"')).toBeVisible();
      
      // Check for version history
      await expect(page.locator('text*="v1.0", text*="Current"')).toBeVisible();
      
      // Close versions modal
      const closeButton = page.locator('button:has-text("Close")');
      await closeButton.click();
    }
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check that templates are still accessible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text="Service Agreement Template"')).toBeVisible();
    
    // Check for mobile-friendly navigation
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }
    
    // Check template interaction on mobile
    const template = page.locator('text="Service Agreement Template"').first();
    await template.click();
    
    // Verify create button is still accessible
    const createButton = page.locator('button:has-text("Create"), [data-testid="create-template"]');
    await expect(createButton).toBeVisible();
  });

  test('should handle empty templates state', async ({ page }) => {
    // Mock empty templates
    await page.route('**/api/v1/templates/list', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          templates: [],
          categories: [],
          total: 0
        })
      });
    });
    
    await page.reload();
    
    // Check for empty state
    await expect(page.locator('text*="No templates", text*="Create your first", text*="Get started"')).toBeVisible();
    
    // Check for CTA to create template
    await expect(page.locator('button:has-text("Create"), button:has-text("New Template")')).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    // Add delay to API to test loading
    await page.route('**/api/v1/templates/list', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ templates: [], total: 0 })
      });
    });
    
    await page.goto('/templates');
    
    // Check for loading indicators
    await expect(page.locator('[data-testid="loading"], .spinner, text*="Loading"')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading"], .spinner')).not.toBeVisible({ timeout: 10000 });
    
    // Verify templates loaded
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle template errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/templates/create', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to create template'
        })
      });
    });
    
    // Try to create a template
    const createButton = page.locator('button:has-text("Create"), [data-testid="create-template"]');
    await createButton.click();
    
    const nameInput = page.locator('input[name="name"], [data-testid="template-name"]');
    await nameInput.fill('Test Template');
    
    const submitButton = page.locator('button:has-text("Create"), button[type="submit"]');
    await submitButton.click();
    
    // Check for error message
    await expect(page.locator('text*="error", text*="failed", [role="alert"]')).toBeVisible();
  });

  test('should export templates', async ({ page }) => {
    // Look for export functionality
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-templates"]');
    if (await exportButton.isVisible()) {
      // Start download tracking
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Check for export options
      const exportOptions = page.locator('text="JSON", text="CSV", text="PDF"');
      if (await exportOptions.first().isVisible()) {
        await exportOptions.first().click();
      }
      
      // Wait for download to complete
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('templates');
    }
  });

  test('should import templates', async ({ page }) => {
    // Look for import functionality
    const importButton = page.locator('button:has-text("Import"), [data-testid="import-templates"]');
    if (await importButton.isVisible()) {
      await importButton.click();
      
      // Check import modal opens
      await expect(page.locator('[role="dialog"], .modal, text*="Import"')).toBeVisible();
      
      // Check for file upload
      const fileInput = page.locator('input[type="file"], [data-testid="template-file"]');
      if (await fileInput.isVisible()) {
        await expect(fileInput).toBeVisible();
      }
      
      // Close import modal
      const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close")');
      await closeButton.click();
    }
  });
});
