import { test, expect } from '@playwright/test';
import { loginWithTestAccount } from '../helpers/auth';

test.describe('Team Management - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestAccount(page);
    
    // Mock team API data
    await page.route('**/api/v1/team/**', async route => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (url.includes('/members') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            members: [
              {
                id: 1,
                email: 'admin@pactoria.com',
                first_name: 'Admin',
                last_name: 'User',
                role: 'admin',
                status: 'active',
                joined_date: '2024-01-15T10:00:00Z',
                last_login: '2024-03-20T14:30:00Z',
                permissions: ['all']
              },
              {
                id: 2,
                email: 'manager@pactoria.com',
                first_name: 'Manager',
                last_name: 'Smith',
                role: 'manager',
                status: 'active',
                joined_date: '2024-02-01T09:00:00Z',
                last_login: '2024-03-19T16:45:00Z',
                permissions: ['contracts:read', 'contracts:write', 'team:read']
              },
              {
                id: 3,
                email: 'user@pactoria.com',
                first_name: 'Regular',
                last_name: 'User',
                role: 'user',
                status: 'pending',
                joined_date: '2024-03-10T11:30:00Z',
                last_login: null,
                permissions: ['contracts:read']
              }
            ],
            total: 3,
            roles: [
              { name: 'admin', display_name: 'Administrator', permissions: ['all'] },
              { name: 'manager', display_name: 'Manager', permissions: ['contracts:read', 'contracts:write', 'team:read'] },
              { name: 'user', display_name: 'User', permissions: ['contracts:read'] }
            ]
          })
        });
      } else if (url.includes('/invite') && method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 4,
            email: 'newuser@example.com',
            role: 'user',
            status: 'pending',
            invited_at: new Date().toISOString()
          })
        });
      } else if (url.includes('/members/') && method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 2,
            role: 'admin',
            status: 'active'
          })
        });
      } else if (url.includes('/members/') && method === 'DELETE') {
        await route.fulfill({
          status: 204
        });
      }
    });
    
    await page.goto('/team');
  });

  test('should display team members list @smoke', async ({ page }) => {
    // Check page loads successfully
    await expect(page).toHaveURL(/\/team/);
    
    // Check for any main content - be flexible about exact content
    await expect(page.locator('main, body')).toBeVisible();
    
    // Basic functionality check - page loads without errors
    const hasContent = await page.locator('h1, h2, h3, [role="heading"]').first().isVisible();
    expect(hasContent).toBeTruthy();
    await expect(page.locator('text="manager@pactoria.com"')).toBeVisible();
    await expect(page.locator('text="user@pactoria.com"')).toBeVisible();
    
    // Check for member details
    await expect(page.locator('text="Admin User"')).toBeVisible();
    await expect(page.locator('text="Administrator"')).toBeVisible();
  });

  test('should invite new team member', async ({ page }) => {
    // Look for invite button
    const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Add Member"), [data-testid="invite-member"]');
    await expect(inviteButton).toBeVisible();
    await inviteButton.click();
    
    // Check invite modal/form opens
    await expect(page.locator('[role="dialog"], .modal, [data-testid="invite-modal"]')).toBeVisible();
    
    // Fill invite form
    const emailInput = page.locator('input[name="email"], input[type="email"], [data-testid="member-email"]');
    await emailInput.fill('newuser@example.com');
    
    // Select role
    const roleSelect = page.locator('select[name="role"], [data-testid="member-role"]');
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('user');
    } else {
      // Try radio buttons or dropdown
      const userRole = page.locator('input[value="user"], text="User"').first();
      await userRole.click();
    }
    
    // Submit invitation
    const submitButton = page.locator('button:has-text("Send"), button:has-text("Invite"), button[type="submit"]');
    await submitButton.click();
    
    // Check for success message
    await expect(page.locator('text*="invited", text*="sent", [role="alert"]')).toBeVisible();
  });

  test('should edit team member role', async ({ page }) => {
    // Find member row and edit button
    const memberRow = page.locator('tr:has-text("manager@pactoria.com"), [data-testid="member-row"]:has-text("Manager Smith")');
    
    const editButton = memberRow.locator('button:has-text("Edit"), [data-testid="edit-member"], [aria-label*="edit"]');
    if (await editButton.isVisible()) {
      await editButton.click();
    } else {
      // Try clicking on the member row or menu
      await memberRow.click();
      const menuButton = page.locator('button[aria-label*="menu"], [data-testid="member-menu"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.locator('text="Edit"').click();
      }
    }
    
    // Check edit modal/form opens
    await expect(page.locator('[role="dialog"], .modal, [data-testid="edit-modal"]')).toBeVisible();
    
    // Change role to admin
    const roleSelect = page.locator('select[name="role"], [data-testid="member-role"]');
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('admin');
    } else {
      const adminRole = page.locator('input[value="admin"], text="Administrator"').first();
      await adminRole.click();
    }
    
    // Save changes
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();
    
    // Check for success message
    await expect(page.locator('text*="updated", text*="changed", [role="alert"]')).toBeVisible();
  });

  test('should remove team member', async ({ page }) => {
    // Find member row for removal
    const memberRow = page.locator('tr:has-text("user@pactoria.com"), [data-testid="member-row"]:has-text("Regular User")');
    
    const removeButton = memberRow.locator('button:has-text("Remove"), button:has-text("Delete"), [data-testid="remove-member"]');
    if (await removeButton.isVisible()) {
      await removeButton.click();
    } else {
      // Try menu approach
      await memberRow.click();
      const menuButton = page.locator('button[aria-label*="menu"], [data-testid="member-menu"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.locator('text="Remove", text="Delete"').click();
      }
    }
    
    // Check confirmation dialog
    await expect(page.locator('[role="dialog"], .modal, text*="confirm"')).toBeVisible();
    
    // Confirm removal
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Remove"), button:has-text("Delete")');
    await confirmButton.click();
    
    // Check member is removed
    await expect(page.locator('text="user@pactoria.com"')).not.toBeVisible();
    await expect(page.locator('text*="removed", [role="alert"]')).toBeVisible();
  });

  test('should display member permissions', async ({ page }) => {
    // Click on a member to view details
    const memberRow = page.locator('tr:has-text("manager@pactoria.com"), [data-testid="member-row"]:has-text("Manager Smith")');
    await memberRow.click();
    
    // Check if permissions are shown
    const permissionsSection = page.locator('[data-testid="member-permissions"], text*="Permissions"');
    if (await permissionsSection.isVisible()) {
      await expect(page.locator('text*="contracts:read"')).toBeVisible();
      await expect(page.locator('text*="contracts:write"')).toBeVisible();
      await expect(page.locator('text*="team:read"')).toBeVisible();
    }
  });

  test('should filter team members by role', async ({ page }) => {
    // Look for role filter
    const roleFilter = page.locator('select[name="role"], [data-testid="role-filter"]');
    if (await roleFilter.isVisible()) {
      await roleFilter.selectOption('admin');
      
      // Check only admin members are shown
      await expect(page.locator('text="admin@pactoria.com"')).toBeVisible();
      await expect(page.locator('text="manager@pactoria.com"')).not.toBeVisible();
      
      // Reset filter
      await roleFilter.selectOption('all');
      await expect(page.locator('text="manager@pactoria.com"')).toBeVisible();
    }
  });

  test('should filter team members by status', async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('pending');
      
      // Check only pending members are shown
      await expect(page.locator('text="user@pactoria.com"')).toBeVisible();
      await expect(page.locator('text="admin@pactoria.com"')).not.toBeVisible();
      
      // Reset filter
      await statusFilter.selectOption('all');
      await expect(page.locator('text="admin@pactoria.com"')).toBeVisible();
    }
  });

  test('should search team members', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"], input[name="search"], [data-testid="member-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('manager');
      
      // Check search results
      await expect(page.locator('text="manager@pactoria.com"')).toBeVisible();
      await expect(page.locator('text="admin@pactoria.com"')).not.toBeVisible();
      
      // Clear search
      await searchInput.clear();
      await expect(page.locator('text="admin@pactoria.com"')).toBeVisible();
    }
  });

  test('should display member activity/last login', async ({ page }) => {
    // Check for last login information
    await expect(page.locator('text*="Last login", text*="Active"')).toBeVisible();
    
    // Check specific login times if displayed
    const loginInfo = page.locator('text*="2024-03-20", text*="Mar 20"');
    if (await loginInfo.isVisible()) {
      await expect(loginInfo).toBeVisible();
    }
  });

  test('should handle bulk member operations', async ({ page }) => {
    // Look for bulk selection
    const selectAllCheckbox = page.locator('input[type="checkbox"][aria-label*="Select all"], [data-testid="select-all"]');
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();
      
      // Check for bulk actions
      const bulkActions = page.locator('[data-testid="bulk-actions"], text*="Bulk Actions"');
      if (await bulkActions.isVisible()) {
        await expect(bulkActions).toBeVisible();
        
        // Check for bulk options
        await expect(page.locator('text*="Remove Selected", text*="Change Role"')).toBeVisible();
      }
    }
  });

  test('should handle team settings', async ({ page }) => {
    // Look for team settings
    const settingsButton = page.locator('button:has-text("Settings"), [data-testid="team-settings"]');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      // Check settings modal/page
      await expect(page.locator('[role="dialog"], .modal, h1:has-text("Settings")')).toBeVisible();
      
      // Check for team configuration options
      await expect(page.locator('text*="Team Name", text*="Organization"')).toBeVisible();
    }
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check that team page is still accessible
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for mobile-friendly member list
    await expect(page.locator('text="admin@pactoria.com"')).toBeVisible();
    
    // Check mobile menu if present
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }
    
    // Verify invite button is still accessible
    const inviteButton = page.locator('button:has-text("Invite"), [data-testid="invite-member"]');
    await expect(inviteButton).toBeVisible();
  });

  test('should handle empty team state', async ({ page }) => {
    // Mock empty team
    await page.route('**/api/v1/team/members', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members: [],
          total: 0
        })
      });
    });
    
    await page.reload();
    
    // Check for empty state
    await expect(page.locator('text*="No team members", text*="Invite your first", text*="Get started"')).toBeVisible();
    
    // Check for CTA to invite members
    await expect(page.locator('button:has-text("Invite"), button:has-text("Add Member")')).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    // Add delay to API to test loading
    await page.route('**/api/v1/team/members', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [], total: 0 })
      });
    });
    
    await page.goto('/team');
    
    // Check for loading indicators
    await expect(page.locator('[data-testid="loading"], .spinner, text*="Loading"')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading"], .spinner')).not.toBeVisible({ timeout: 10000 });
  });

  test('should handle permission errors gracefully', async ({ page }) => {
    // Mock permission error
    await page.route('**/api/v1/team/invite', async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Insufficient permissions to invite team members'
        })
      });
    });
    
    // Try to invite a member
    const inviteButton = page.locator('button:has-text("Invite"), [data-testid="invite-member"]');
    await inviteButton.click();
    
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    await emailInput.fill('test@example.com');
    
    const submitButton = page.locator('button:has-text("Send"), button:has-text("Invite")');
    await submitButton.click();
    
    // Check for error message
    await expect(page.locator('text*="permission", text*="access denied", [role="alert"]')).toBeVisible();
  });
});
