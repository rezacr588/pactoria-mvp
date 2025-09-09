import { test, expect } from '@playwright/test';
import { loginWithTestAccount } from '../helpers/auth';

test.describe('Integrations Page - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestAccount(page);
    
    // Mock integrations API data
    await page.route('**/api/v1/integrations/**', async route => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (url.includes('/available') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            integrations: [
              {
                id: 'slack',
                name: 'Slack',
                description: 'Get notifications and updates in your Slack channels',
                category: 'communication',
                logo_url: '/integrations/slack-logo.png',
                status: 'connected',
                connected_date: '2024-02-01T10:00:00Z',
                configuration: {
                  webhook_url: 'https://hooks.slack.com/services/...',
                  channel: '#contracts',
                  notifications: ['contract_updates', 'deadlines']
                },
                features: ['Real-time notifications', 'Channel integration', 'Bot commands']
              },
              {
                id: 'teams',
                name: 'Microsoft Teams',
                description: 'Collaborate with your team using Microsoft Teams integration',
                category: 'communication',
                logo_url: '/integrations/teams-logo.png',
                status: 'available',
                connected_date: null,
                configuration: null,
                features: ['Team notifications', 'File sharing', 'Video calls integration']
              },
              {
                id: 'gdrive',
                name: 'Google Drive',
                description: 'Store and sync contract documents with Google Drive',
                category: 'storage',
                logo_url: '/integrations/gdrive-logo.png',
                status: 'connected',
                connected_date: '2024-01-20T14:30:00Z',
                configuration: {
                  folder_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
                  sync_enabled: true,
                  auto_backup: true
                },
                features: ['Document storage', 'Auto-sync', 'Version control']
              },
              {
                id: 'zapier',
                name: 'Zapier',
                description: 'Connect Pactoria with 5000+ apps through Zapier automation',
                category: 'automation',
                logo_url: '/integrations/zapier-logo.png',
                status: 'available',
                connected_date: null,
                configuration: null,
                features: ['Workflow automation', '5000+ app connections', 'Custom triggers']
              },
              {
                id: 'salesforce',
                name: 'Salesforce',
                description: 'Sync contracts and customer data with Salesforce CRM',
                category: 'crm',
                logo_url: '/integrations/salesforce-logo.png',
                status: 'error',
                connected_date: '2024-03-01T09:00:00Z',
                configuration: {
                  instance_url: 'https://yourorg.salesforce.com',
                  sync_contacts: true,
                  sync_opportunities: false
                },
                error_message: 'Authentication token expired',
                features: ['CRM sync', 'Contact management', 'Opportunity tracking']
              }
            ],
            categories: [
              { name: 'communication', display_name: 'Communication', count: 2 },
              { name: 'storage', display_name: 'Storage', count: 1 },
              { name: 'automation', display_name: 'Automation', count: 1 },
              { name: 'crm', display_name: 'CRM', count: 1 }
            ]
          })
        });
      } else if (url.includes('/connect') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            redirect_url: 'https://oauth.provider.com/authorize?client_id=...',
            success: true
          })
        });
      } else if (url.includes('/disconnect') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Integration disconnected successfully'
          })
        });
      } else if (url.includes('/configure') && method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            configuration: {
              channel: '#new-channel',
              notifications: ['contract_updates']
            }
          })
        });
      } else if (url.includes('/test') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Test notification sent successfully'
          })
        });
      }
    });
    
    await page.goto('/integrations');
  });

  test('should display integrations overview @smoke', async ({ page }) => {
    // Check main page heading
    await expect(page.locator('h1')).toContainText(/Integrations|Apps|Connections/);
    
    // Check for integrations list
    await expect(page.locator('text="Slack"')).toBeVisible();
    await expect(page.locator('text="Microsoft Teams"')).toBeVisible();
    await expect(page.locator('text="Google Drive"')).toBeVisible();
    await expect(page.locator('text="Zapier"')).toBeVisible();
    await expect(page.locator('text="Salesforce"')).toBeVisible();
    
    // Check for integration status indicators
    await expect(page.locator('[data-status="connected"], text*="Connected"')).toBeVisible();
    await expect(page.locator('[data-status="available"], text*="Available"')).toBeVisible();
    await expect(page.locator('[data-status="error"], text*="Error"')).toBeVisible();
  });

  test('should connect new integration', async ({ page }) => {
    // Find available integration (Microsoft Teams)
    const teamsIntegration = page.locator('[data-integration="teams"], [data-testid="integration-teams"]');
    
    const connectButton = teamsIntegration.locator('button:has-text("Connect"), [data-testid="connect-button"]');
    await expect(connectButton).toBeVisible();
    await connectButton.click();
    
    // Check for OAuth flow or configuration modal
    const authModal = page.locator('[role="dialog"], .modal, [data-testid="auth-modal"]');
    if (await authModal.isVisible()) {
      // Check for authorization information
      await expect(page.locator('text*="authorize", text*="permission"')).toBeVisible();
      
      // Confirm authorization
      const authorizeButton = page.locator('button:has-text("Authorize"), button:has-text("Allow")');
      if (await authorizeButton.isVisible()) {
        await authorizeButton.click();
      }
    } else {
      // Check for redirect to OAuth provider
      await expect(page).toHaveURL(/oauth\.provider\.com|microsoft\.com/);
    }
  });

  test('should configure connected integration', async ({ page }) => {
    // Find connected integration (Slack)
    const slackIntegration = page.locator('[data-integration="slack"], [data-testid="integration-slack"]');
    
    const configureButton = slackIntegration.locator('button:has-text("Configure"), button:has-text("Settings"), [data-testid="configure-button"]');
    if (await configureButton.isVisible()) {
      await configureButton.click();
    } else {
      // Try clicking on the integration card
      await slackIntegration.click();
    }
    
    // Check configuration modal opens
    await expect(page.locator('[role="dialog"], .modal, [data-testid="config-modal"]')).toBeVisible();
    
    // Update configuration
    const channelInput = page.locator('input[name="channel"], [data-testid="slack-channel"]');
    if (await channelInput.isVisible()) {
      await channelInput.clear();
      await channelInput.fill('#new-channel');
    }
    
    // Update notification preferences
    const deadlineNotifications = page.locator('input[name="deadlines"], input[value="deadlines"]');
    if (await deadlineNotifications.isVisible()) {
      await deadlineNotifications.check();
    }
    
    // Save configuration
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();
    
    // Check for success message
    await expect(page.locator('text*="configuration", text*="updated", [role="alert"]')).toBeVisible();
  });

  test('should test integration connection', async ({ page }) => {
    // Find connected integration with test capability
    const slackIntegration = page.locator('[data-integration="slack"], [data-testid="integration-slack"]');
    
    const testButton = slackIntegration.locator('button:has-text("Test"), [data-testid="test-connection"]');
    if (await testButton.isVisible()) {
      await testButton.click();
    } else {
      // Try menu approach
      const menuButton = slackIntegration.locator('button[aria-label*="menu"], [data-testid="integration-menu"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.locator('text="Test Connection"').click();
      }
    }
    
    // Check for test confirmation dialog
    const testModal = page.locator('[role="dialog"], .modal, text*="test"');
    if (await testModal.isVisible()) {
      const confirmButton = page.locator('button:has-text("Send Test"), button:has-text("Test")');
      await confirmButton.click();
    }
    
    // Check for success message
    await expect(page.locator('text*="test", text*="sent", [role="alert"]')).toBeVisible();
  });

  test('should disconnect integration', async ({ page }) => {
    // Find connected integration for disconnection
    const gdriveIntegration = page.locator('[data-integration="gdrive"], [data-testid="integration-gdrive"]');
    
    const disconnectButton = gdriveIntegration.locator('button:has-text("Disconnect"), [data-testid="disconnect-button"]');
    if (await disconnectButton.isVisible()) {
      await disconnectButton.click();
    } else {
      // Try menu approach
      const menuButton = gdriveIntegration.locator('button[aria-label*="menu"], [data-testid="integration-menu"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.locator('text="Disconnect"').click();
      }
    }
    
    // Check confirmation dialog
    await expect(page.locator('[role="dialog"], .modal, text*="disconnect"')).toBeVisible();
    
    // Confirm disconnection
    const confirmButton = page.locator('button:has-text("Disconnect"), button:has-text("Confirm")');
    await confirmButton.click();
    
    // Check integration status changed to available
    await expect(gdriveIntegration.locator('[data-status="available"], button:has-text("Connect")')).toBeVisible();
    await expect(page.locator('text*="disconnected", [role="alert"]')).toBeVisible();
  });

  test('should handle integration errors', async ({ page }) => {
    // Find integration with error status (Salesforce)
    const salesforceIntegration = page.locator('[data-integration="salesforce"], [data-testid="integration-salesforce"]');
    
    // Check error indicator
    await expect(salesforceIntegration.locator('[data-status="error"], .error-indicator')).toBeVisible();
    
    // Check error message
    await expect(page.locator('text*="Authentication token expired"')).toBeVisible();
    
    // Try to fix the error
    const fixButton = salesforceIntegration.locator('button:has-text("Fix"), button:has-text("Reconnect"), [data-testid="fix-integration"]');
    if (await fixButton.isVisible()) {
      await fixButton.click();
      
      // Check for reconnection flow
      await expect(page.locator('[role="dialog"], .modal, text*="reconnect"')).toBeVisible();
    }
  });

  test('should filter integrations by category', async ({ page }) => {
    // Look for category filter
    const categoryFilter = page.locator('select[name="category"], [data-testid="category-filter"]');
    if (await categoryFilter.isVisible()) {
      // Filter by communication category
      await categoryFilter.selectOption('communication');
      
      // Check only communication integrations are shown
      await expect(page.locator('text="Slack"')).toBeVisible();
      await expect(page.locator('text="Microsoft Teams"')).toBeVisible();
      await expect(page.locator('text="Google Drive"')).not.toBeVisible();
      
      // Reset filter
      await categoryFilter.selectOption('all');
      await expect(page.locator('text="Google Drive"')).toBeVisible();
    } else {
      // Try category tabs
      const communicationTab = page.locator('button:has-text("Communication"), [data-filter="communication"]');
      if (await communicationTab.isVisible()) {
        await communicationTab.click();
        await expect(page.locator('text="Slack"')).toBeVisible();
      }
    }
  });

  test('should filter integrations by status', async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');
    if (await statusFilter.isVisible()) {
      // Filter by connected status
      await statusFilter.selectOption('connected');
      
      // Check only connected integrations are shown
      await expect(page.locator('text="Slack"')).toBeVisible();
      await expect(page.locator('text="Google Drive"')).toBeVisible();
      await expect(page.locator('text="Microsoft Teams"')).not.toBeVisible();
      
      // Reset filter
      await statusFilter.selectOption('all');
      await expect(page.locator('text="Microsoft Teams"')).toBeVisible();
    }
  });

  test('should search integrations', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"], [data-testid="integration-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('slack');
      
      // Check search results
      await expect(page.locator('text="Slack"')).toBeVisible();
      await expect(page.locator('text="Microsoft Teams"')).not.toBeVisible();
      
      // Clear search
      await searchInput.clear();
      await expect(page.locator('text="Microsoft Teams"')).toBeVisible();
    }
  });

  test('should view integration details', async ({ page }) => {
    // Click on integration to view details
    const slackIntegration = page.locator('[data-integration="slack"], text="Slack"');
    await slackIntegration.click();
    
    // Check if details modal/panel opens
    const detailsModal = page.locator('[role="dialog"], .modal, [data-testid="integration-details"]');
    if (await detailsModal.isVisible()) {
      // Check for integration information
      await expect(page.locator('text*="Real-time notifications"')).toBeVisible();
      await expect(page.locator('text*="Channel integration"')).toBeVisible();
      await expect(page.locator('text*="Bot commands"')).toBeVisible();
      
      // Check connection details
      await expect(page.locator('text*="Connected", text*="2024-02-01"')).toBeVisible();
      
      // Close details
      const closeButton = page.locator('button:has-text("Close"), button[aria-label*="close"]');
      await closeButton.click();
    }
  });

  test('should handle webhook configuration', async ({ page }) => {
    // Find integration with webhook support
    const slackIntegration = page.locator('[data-integration="slack"], [data-testid="integration-slack"]');
    
    const webhookButton = slackIntegration.locator('button:has-text("Webhook"), [data-testid="webhook-config"]');
    if (await webhookButton.isVisible()) {
      await webhookButton.click();
      
      // Check webhook configuration modal
      await expect(page.locator('[role="dialog"], .modal, text*="Webhook"')).toBeVisible();
      
      // Check webhook URL field
      const webhookInput = page.locator('input[name="webhook_url"], [data-testid="webhook-url"]');
      if (await webhookInput.isVisible()) {
        await expect(webhookInput).toHaveValue(/https:\/\/hooks\.slack\.com/);
      }
      
      // Close webhook modal
      const closeButton = page.locator('button:has-text("Close")');
      await closeButton.click();
    }
  });

  test('should manage API keys and credentials', async ({ page }) => {
    // Look for API key management
    const apiKeysSection = page.locator('text*="API Keys", [data-testid="api-keys"]');
    if (await apiKeysSection.isVisible()) {
      await apiKeysSection.click();
      
      // Check API keys modal
      await expect(page.locator('[role="dialog"], .modal, text*="API Keys"')).toBeVisible();
      
      // Check for key generation
      const generateButton = page.locator('button:has-text("Generate"), [data-testid="generate-key"]');
      if (await generateButton.isVisible()) {
        await generateButton.click();
        
        // Check for new API key
        await expect(page.locator('text*="pk_", text*="sk_"')).toBeVisible();
      }
      
      // Close API keys modal
      const closeButton = page.locator('button:has-text("Close")');
      await closeButton.click();
    }
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check that integrations are still accessible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text="Slack"')).toBeVisible();
    
    // Check for mobile-friendly layout
    const integrationCards = page.locator('[data-testid*="integration-"], .integration-card');
    if (await integrationCards.count() > 0) {
      // Check cards stack vertically on mobile
      const firstCard = integrationCards.first();
      const cardWidth = await firstCard.evaluate(el => el.getBoundingClientRect().width);
      expect(cardWidth).toBeLessThanOrEqual(375);
    }
    
    // Check mobile menu if present
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }
  });

  test('should handle integration marketplace', async ({ page }) => {
    // Look for marketplace or browse more integrations
    const marketplaceButton = page.locator('button:has-text("Browse"), button:has-text("Marketplace"), [data-testid="integration-marketplace"]');
    if (await marketplaceButton.isVisible()) {
      await marketplaceButton.click();
      
      // Check marketplace modal or navigation
      await expect(page.locator('[role="dialog"], .modal, h1:has-text("Marketplace")')).toBeVisible();
      
      // Check for more integrations
      await expect(page.locator('text*="additional", text*="more apps"')).toBeVisible();
      
      // Close marketplace
      const closeButton = page.locator('button:has-text("Close")');
      await closeButton.click();
    }
  });

  test('should handle bulk integration management', async ({ page }) => {
    // Look for bulk operations
    const selectAllCheckbox = page.locator('input[type="checkbox"][aria-label*="Select all"], [data-testid="select-all"]');
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();
      
      // Check for bulk actions
      const bulkActions = page.locator('[data-testid="bulk-actions"], text*="Bulk Actions"');
      if (await bulkActions.isVisible()) {
        await expect(bulkActions).toBeVisible();
        
        // Check for bulk options
        await expect(page.locator('text*="Disconnect All", text*="Test All"')).toBeVisible();
      }
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Add delay to API to test loading
    await page.route('**/api/v1/integrations/available', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ integrations: [], categories: [] })
      });
    });
    
    await page.goto('/integrations');
    
    // Check for loading indicators
    await expect(page.locator('[data-testid="loading"], .spinner, text*="Loading"')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading"], .spinner')).not.toBeVisible({ timeout: 10000 });
    
    // Verify integrations loaded
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle integration errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/integrations/connect', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to connect integration'
        })
      });
    });
    
    // Try to connect an integration
    const teamsIntegration = page.locator('[data-integration="teams"]');
    const connectButton = teamsIntegration.locator('button:has-text("Connect")');
    await connectButton.click();
    
    // Check for error message
    await expect(page.locator('text*="error", text*="failed", [role="alert"]')).toBeVisible();
  });

  test('should display integration usage analytics', async ({ page }) => {
    // Look for usage statistics
    const usageSection = page.locator('text*="Usage", [data-testid="integration-usage"]');
    if (await usageSection.isVisible()) {
      await usageSection.click();
      
      // Check usage analytics
      await expect(page.locator('text*="notifications sent", text*="synced"')).toBeVisible();
      
      // Check for usage charts
      const charts = page.locator('canvas, svg, [data-testid*="chart"]');
      if (await charts.count() > 0) {
        await expect(charts.first()).toBeVisible();
      }
    }
  });

  test('should handle empty integrations state', async ({ page }) => {
    // Mock empty integrations
    await page.route('**/api/v1/integrations/available', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          integrations: [],
          categories: []
        })
      });
    });
    
    await page.reload();
    
    // Check for empty state
    await expect(page.locator('text*="No integrations", text*="Get started", text*="Connect your first"')).toBeVisible();
    
    // Check for CTA to browse integrations
    await expect(page.locator('button:has-text("Browse"), button:has-text("Explore")')).toBeVisible();
  });
});
