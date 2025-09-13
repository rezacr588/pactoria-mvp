import { test, expect } from '@playwright/test';
import { loginWithTestAccount } from '../helpers/auth';

test.describe('Audit Trail Page - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestAccount(page);
    
    // Mock audit trail API data
    await page.route('**/api/v1/audit/**', async route => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (url.includes('/logs') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            logs: [
              {
                id: 1,
                action: 'contract_created',
                description: 'Created new contract: Service Agreement #123',
                user: {
                  id: 1,
                  name: 'Admin User',
                  email: 'admin@pactoria.com'
                },
                timestamp: '2024-03-20T14:30:00Z',
                ip_address: '192.168.1.100',
                user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                entity_type: 'contract',
                entity_id: 123,
                changes: {
                  name: { from: null, to: 'Service Agreement #123' },
                  status: { from: null, to: 'draft' },
                  client_name: { from: null, to: 'ABC Corp' }
                },
                severity: 'info'
              },
              {
                id: 2,
                action: 'contract_updated',
                description: 'Updated contract status from draft to active',
                user: {
                  id: 2,
                  name: 'Manager Smith',
                  email: 'manager@pactoria.com'
                },
                timestamp: '2024-03-20T10:15:00Z',
                ip_address: '192.168.1.101',
                user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                entity_type: 'contract',
                entity_id: 123,
                changes: {
                  status: { from: 'draft', to: 'active' },
                  approved_by: { from: null, to: 'Manager Smith' }
                },
                severity: 'info'
              },
              {
                id: 3,
                action: 'user_login',
                description: 'User logged into the system',
                user: {
                  id: 3,
                  name: 'Regular User',
                  email: 'user@pactoria.com'
                },
                timestamp: '2024-03-20T09:00:00Z',
                ip_address: '192.168.1.102',
                user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
                entity_type: 'user',
                entity_id: 3,
                changes: null,
                severity: 'info'
              },
              {
                id: 4,
                action: 'security_alert',
                description: 'Multiple failed login attempts detected',
                user: null,
                timestamp: '2024-03-19T22:45:00Z',
                ip_address: '203.0.113.45',
                user_agent: 'Unknown',
                entity_type: 'security',
                entity_id: null,
                changes: {
                  attempts: { from: 0, to: 5 },
                  blocked: { from: false, to: true }
                },
                severity: 'warning'
              },
              {
                id: 5,
                action: 'data_export',
                description: 'User data exported for compliance review',
                user: {
                  id: 1,
                  name: 'Admin User',
                  email: 'admin@pactoria.com'
                },
                timestamp: '2024-03-18T16:30:00Z',
                ip_address: '192.168.1.100',
                user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                entity_type: 'system',
                entity_id: null,
                changes: {
                  export_type: { from: null, to: 'full_data_export' },
                  file_size: { from: null, to: '2.5MB' }
                },
                severity: 'info'
              }
            ],
            filters: {
              actions: ['contract_created', 'contract_updated', 'user_login', 'security_alert', 'data_export'],
              users: ['Admin User', 'Manager Smith', 'Regular User'],
              severity_levels: ['info', 'warning', 'error'],
              entity_types: ['contract', 'user', 'security', 'system']
            },
            total: 5,
            page: 1,
            per_page: 20
          })
        });
      } else if (url.includes('/export') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            download_url: '/api/v1/audit/export/download/audit_trail_2024-03-20.csv',
            expires_at: '2024-03-20T18:00:00Z'
          })
        });
      } else if (url.includes('/stats') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            summary: {
              total_events: 1247,
              unique_users: 8,
              security_events: 12,
              contract_events: 156,
              system_events: 45
            },
            recent_activity: {
              last_24h: 23,
              last_7d: 189,
              last_30d: 456
            }
          })
        });
      }
    });
    
    await page.goto('/audit');
  });

  test('should display audit trail logs @smoke', async ({ page }) => {
    // Check page loads successfully
    await expect(page).toHaveURL(/\/audit/);
    
    // Check for any main content - be flexible about exact content
    await expect(page.locator('main, body')).toBeVisible();
    
    // Basic functionality check - page loads without errors
    const hasContent = await page.locator('h1, h2, h3, [role="heading"]').first().isVisible();
    expect(hasContent).toBeTruthy();
    await expect(page.locator('text="Multiple failed login attempts detected"')).toBeVisible();
    
    // Check for user information
    await expect(page.locator('text="Admin User"')).toBeVisible();
    await expect(page.locator('text="Manager Smith"')).toBeVisible();
    await expect(page.locator('text="Regular User"')).toBeVisible();
    
    // Check for timestamps
    await expect(page.locator('text*="2024-03-20"')).toBeVisible();
  });

  test('should filter logs by action type', async ({ page }) => {
    // Look for action filter
    const actionFilter = page.locator('select[name="action"], [data-testid="action-filter"]');
    if (await actionFilter.isVisible()) {
      // Filter by contract actions
      await actionFilter.selectOption('contract_created');
      
      // Check only contract creation logs are shown
      await expect(page.locator('text="Created new contract"')).toBeVisible();
      await expect(page.locator('text="User logged into the system"')).not.toBeVisible();
      
      // Reset filter
      await actionFilter.selectOption('all');
      await expect(page.locator('text="User logged into the system"')).toBeVisible();
    } else {
      // Try action tabs or buttons
      const contractTab = page.locator('button:has-text("Contracts"), [data-filter="contract"]');
      if (await contractTab.isVisible()) {
        await contractTab.click();
        await expect(page.locator('text="Created new contract"')).toBeVisible();
      }
    }
  });

  test('should filter logs by user', async ({ page }) => {
    // Look for user filter
    const userFilter = page.locator('select[name="user"], [data-testid="user-filter"]');
    if (await userFilter.isVisible()) {
      // Filter by specific user
      await userFilter.selectOption('Admin User');
      
      // Check only admin user logs are shown
      await expect(page.locator('text="Admin User"')).toBeVisible();
      await expect(page.locator('text="Manager Smith"')).not.toBeVisible();
      
      // Reset filter
      await userFilter.selectOption('all');
      await expect(page.locator('text="Manager Smith"')).toBeVisible();
    }
  });

  test('should filter logs by date range', async ({ page }) => {
    // Look for date range filter
    const dateFromInput = page.locator('input[name="date_from"], [data-testid="date-from"]');
    const dateToInput = page.locator('input[name="date_to"], [data-testid="date-to"]');
    
    if (await dateFromInput.isVisible() && await dateToInput.isVisible()) {
      // Set date range
      await dateFromInput.fill('2024-03-20');
      await dateToInput.fill('2024-03-20');
      
      // Apply filter
      const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")');
      if (await applyButton.isVisible()) {
        await applyButton.click();
      }
      
      // Check filtered results
      await expect(page.locator('text*="2024-03-20"')).toBeVisible();
    } else {
      // Try preset date ranges
      const todayButton = page.locator('button:has-text("Today"), [data-filter="today"]');
      if (await todayButton.isVisible()) {
        await todayButton.click();
      }
    }
  });

  test('should filter logs by severity level', async ({ page }) => {
    // Look for severity filter
    const severityFilter = page.locator('select[name="severity"], [data-testid="severity-filter"]');
    if (await severityFilter.isVisible()) {
      // Filter by warning severity
      await severityFilter.selectOption('warning');
      
      // Check only warning logs are shown
      await expect(page.locator('text="Multiple failed login attempts"')).toBeVisible();
      await expect(page.locator('text="Created new contract"')).not.toBeVisible();
      
      // Reset filter
      await severityFilter.selectOption('all');
      await expect(page.locator('text="Created new contract"')).toBeVisible();
    }
  });

  test('should search audit logs', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"], [data-testid="audit-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('contract');
      
      // Check search results
      await expect(page.locator('text="Created new contract"')).toBeVisible();
      await expect(page.locator('text="Updated contract status"')).toBeVisible();
      await expect(page.locator('text="User logged into"')).not.toBeVisible();
      
      // Clear search
      await searchInput.clear();
      await expect(page.locator('text="User logged into"')).toBeVisible();
    }
  });

  test('should view detailed log entry', async ({ page }) => {
    // Click on a log entry to view details
    const logEntry = page.locator('[data-log-id="1"], tr:has-text("Created new contract")');
    await logEntry.click();
    
    // Check if details modal/panel opens
    const detailsModal = page.locator('[role="dialog"], .modal, [data-testid="log-details"]');
    if (await detailsModal.isVisible()) {
      // Check for detailed information
      await expect(page.locator('text*="192.168.1.100"')).toBeVisible(); // IP address
      await expect(page.locator('text*="Mozilla/5.0"')).toBeVisible(); // User agent
      
      // Check for changes information
      await expect(page.locator('text*="Changes"')).toBeVisible();
      await expect(page.locator('text*="ABC Corp"')).toBeVisible();
      
      // Close details
      const closeButton = page.locator('button:has-text("Close"), button[aria-label*="close"]');
      await closeButton.click();
    }
  });

  test('should display audit statistics', async ({ page }) => {
    // Look for statistics section
    const statsSection = page.locator('[data-testid="audit-stats"], text*="Statistics"');
    if (await statsSection.isVisible()) {
      // Check for summary statistics
      await expect(page.locator('text*="1247", text*="total events"')).toBeVisible();
      await expect(page.locator('text*="8", text*="unique users"')).toBeVisible();
      await expect(page.locator('text*="12", text*="security events"')).toBeVisible();
      
      // Check for recent activity
      await expect(page.locator('text*="23", text*="last 24h"')).toBeVisible();
      await expect(page.locator('text*="189", text*="last 7d"')).toBeVisible();
    }
  });

  test('should export audit logs', async ({ page }) => {
    // Look for export functionality
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-audit"]');
    if (await exportButton.isVisible()) {
      // Start download tracking
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Check for export options modal
      const exportModal = page.locator('[role="dialog"], .modal, text*="Export"');
      if (await exportModal.isVisible()) {
        // Select export format
        const csvOption = page.locator('input[value="csv"], text="CSV"');
        if (await csvOption.isVisible()) {
          await csvOption.click();
        }
        
        // Confirm export
        const confirmButton = page.locator('button:has-text("Export"), button:has-text("Download")');
        await confirmButton.click();
      }
      
      // Wait for download to complete
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('audit');
    }
  });

  test('should handle pagination', async ({ page }) => {
    // Mock more logs for pagination
    await page.route('**/api/v1/audit/logs?page=2', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          logs: [
            {
              id: 6,
              action: 'user_logout',
              description: 'User logged out of the system',
              user: { name: 'Test User' },
              timestamp: '2024-03-17T15:00:00Z',
              severity: 'info'
            }
          ],
          total: 6,
          page: 2,
          per_page: 5
        })
      });
    });
    
    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Next"), [data-testid="next-page"]');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      
      // Check for page 2 logs
      await expect(page.locator('text="User logged out"')).toBeVisible();
    }
    
    // Check page numbers
    const pageButton = page.locator('button:has-text("2"), [data-page="2"]');
    if (await pageButton.isVisible()) {
      await pageButton.click();
    }
  });

  test('should display security alerts prominently', async ({ page }) => {
    // Check for security alerts section
    const securityAlerts = page.locator('[data-severity="warning"], [data-severity="error"]');
    if (await securityAlerts.count() > 0) {
      // Check security alert styling
      await expect(securityAlerts.first()).toHaveClass(/warning|error|alert/);
      
      // Check security alert content
      await expect(page.locator('text="Multiple failed login attempts"')).toBeVisible();
      await expect(page.locator('text*="203.0.113.45"')).toBeVisible(); // Suspicious IP
    }
  });

  test('should handle real-time log updates', async ({ page }) => {
    // Mock real-time log update
    await page.evaluate(() => {
      // Simulate WebSocket or SSE log update
      window.dispatchEvent(new CustomEvent('audit_log', {
        detail: {
          id: 7,
          action: 'contract_signed',
          description: 'Contract #123 has been digitally signed',
          user: { name: 'Client User' },
          timestamp: new Date().toISOString(),
          severity: 'info'
        }
      }));
    });
    
    // Check if new log appears
    await expect(page.locator('text="Contract #123 has been digitally signed"')).toBeVisible();
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check that audit logs are still accessible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text="Created new contract"')).toBeVisible();
    
    // Check for mobile-friendly table/list
    const logEntries = page.locator('[data-testid*="log-"], .log-entry');
    if (await logEntries.count() > 0) {
      // Check entries stack vertically on mobile
      const firstEntry = logEntries.first();
      const entryWidth = await firstEntry.evaluate(el => el.getBoundingClientRect().width);
      expect(entryWidth).toBeLessThanOrEqual(375);
    }
    
    // Check mobile menu if present
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }
  });

  test('should handle empty audit logs state', async ({ page }) => {
    // Mock empty audit logs
    await page.route('**/api/v1/audit/logs', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          logs: [],
          total: 0
        })
      });
    });
    
    await page.reload();
    
    // Check for empty state
    await expect(page.locator('text*="No audit logs", text*="No activity", text*="No events"')).toBeVisible();
    
    // Check for empty state illustration
    const emptyStateIcon = page.locator('[data-testid="empty-state"], .empty-state');
    if (await emptyStateIcon.isVisible()) {
      await expect(emptyStateIcon).toBeVisible();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Add delay to API to test loading
    await page.route('**/api/v1/audit/logs', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ logs: [], total: 0 })
      });
    });
    
    await page.goto('/audit');
    
    // Check for loading indicators
    await expect(page.locator('[data-testid="loading"], .spinner, text*="Loading"')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading"], .spinner')).not.toBeVisible({ timeout: 10000 });
    
    // Verify audit logs loaded
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle audit log errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/audit/export', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to export audit logs'
        })
      });
    });
    
    // Try to export logs
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-audit"]');
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Check for error message
      await expect(page.locator('text*="error", text*="failed", [role="alert"]')).toBeVisible();
    }
  });

  test('should display compliance-related logs', async ({ page }) => {
    // Check for compliance and data export logs
    await expect(page.locator('text="User data exported for compliance review"')).toBeVisible();
    
    // Check for compliance indicators
    const complianceLog = page.locator('[data-log-id="5"], tr:has-text("data exported")');
    if (await complianceLog.isVisible()) {
      // Check for compliance badges or tags
      await expect(complianceLog.locator('[data-testid="compliance"], .compliance-tag')).toBeVisible();
    }
  });

  test('should handle bulk log operations', async ({ page }) => {
    // Look for bulk selection
    const selectAllCheckbox = page.locator('input[type="checkbox"][aria-label*="Select all"], [data-testid="select-all"]');
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();
      
      // Check for bulk actions
      const bulkActions = page.locator('[data-testid="bulk-actions"], text*="Bulk Actions"');
      if (await bulkActions.isVisible()) {
        await expect(bulkActions).toBeVisible();
        
        // Check for bulk options
        await expect(page.locator('text*="Export Selected", text*="Archive"')).toBeVisible();
      }
    }
  });

  test('should display entity relationships', async ({ page }) => {
    // Click on a contract-related log
    const contractLog = page.locator('[data-log-id="1"], tr:has-text("Service Agreement #123")');
    await contractLog.click();
    
    // Check if entity link is available
    const entityLink = page.locator('a:has-text("Service Agreement #123"), [data-testid="entity-link"]');
    if (await entityLink.isVisible()) {
      await entityLink.click();
      
      // Check navigation to related entity
      await expect(page).toHaveURL(/\/contracts\/123|\/contracts.*123/);
    }
  });
});
