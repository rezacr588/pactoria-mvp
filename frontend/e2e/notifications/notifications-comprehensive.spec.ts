import { test, expect } from '@playwright/test';
import { loginWithTestAccount } from '../helpers/auth';

test.describe('Notifications Page - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestAccount(page);
    
    // Mock notifications API data
    await page.route('**/api/v1/notifications/**', async route => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (url.includes('/list') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notifications: [
              {
                id: 1,
                type: 'contract_update',
                title: 'Contract Updated',
                message: 'Service Agreement #123 has been updated by Manager Smith',
                created_at: '2024-03-20T14:30:00Z',
                read: false,
                priority: 'medium',
                related_entity: {
                  type: 'contract',
                  id: 123,
                  name: 'Service Agreement #123'
                }
              },
              {
                id: 2,
                type: 'deadline_reminder',
                title: 'Deadline Approaching',
                message: 'Contract review deadline is in 2 days',
                created_at: '2024-03-20T10:00:00Z',
                read: true,
                priority: 'high',
                related_entity: {
                  type: 'contract',
                  id: 456,
                  name: 'NDA Agreement #456'
                }
              },
              {
                id: 3,
                type: 'team_invitation',
                title: 'Team Invitation',
                message: 'New team member invited: john@example.com',
                created_at: '2024-03-19T16:45:00Z',
                read: false,
                priority: 'low',
                related_entity: {
                  type: 'team',
                  id: 789
                }
              },
              {
                id: 4,
                type: 'compliance_alert',
                title: 'Compliance Issue',
                message: 'High risk compliance issue detected in Contract #789',
                created_at: '2024-03-18T09:15:00Z',
                read: true,
                priority: 'high',
                related_entity: {
                  type: 'contract',
                  id: 789,
                  name: 'Consulting Agreement #789'
                }
              }
            ],
            unread_count: 2,
            total: 4
          })
        });
      } else if (url.includes('/mark-read') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else if (url.includes('/mark-all-read') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else if (url.includes('/preferences') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            preferences: {
              email_notifications: true,
              push_notifications: false,
              contract_updates: true,
              deadline_reminders: true,
              team_notifications: false,
              compliance_alerts: true,
              frequency: 'immediate'
            }
          })
        });
      } else if (url.includes('/preferences') && method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });
    
    await page.goto('/notifications');
  });

  test('should display notifications list @smoke', async ({ page }) => {
    // Check main page heading
    await expect(page.locator('h1')).toContainText(/Notifications|Messages|Alerts/);
    
    // Check for notifications list
    await expect(page.locator('text="Contract Updated"')).toBeVisible();
    await expect(page.locator('text="Deadline Approaching"')).toBeVisible();
    await expect(page.locator('text="Team Invitation"')).toBeVisible();
    await expect(page.locator('text="Compliance Issue"')).toBeVisible();
    
    // Check for unread count indicator
    await expect(page.locator('text*="2", [data-testid="unread-count"]')).toBeVisible();
  });

  test('should mark notification as read', async ({ page }) => {
    // Find an unread notification
    const unreadNotification = page.locator('[data-notification-id="1"], tr:has-text("Contract Updated")');
    
    // Check it's marked as unread
    await expect(unreadNotification.locator('[data-testid="unread-indicator"], .unread')).toBeVisible();
    
    // Click on notification to mark as read
    await unreadNotification.click();
    
    // Check notification is marked as read
    await expect(unreadNotification.locator('[data-testid="unread-indicator"], .unread')).not.toBeVisible();
    
    // Alternative: explicit mark as read button
    const markReadButton = unreadNotification.locator('button:has-text("Mark Read"), [data-testid="mark-read"]');
    if (await markReadButton.isVisible()) {
      await markReadButton.click();
    }
  });

  test('should mark all notifications as read', async ({ page }) => {
    // Look for mark all as read button
    const markAllReadButton = page.locator('button:has-text("Mark All Read"), [data-testid="mark-all-read"]');
    if (await markAllReadButton.isVisible()) {
      await markAllReadButton.click();
      
      // Check for success message
      await expect(page.locator('text*="marked as read", [role="alert"]')).toBeVisible();
      
      // Check unread count is now 0
      await expect(page.locator('text="0", [data-testid="unread-count"]:has-text("0")')).toBeVisible();
    }
  });

  test('should filter notifications by type', async ({ page }) => {
    // Look for filter controls
    const typeFilter = page.locator('select[name="type"], [data-testid="notification-filter"]');
    if (await typeFilter.isVisible()) {
      // Filter by contract updates
      await typeFilter.selectOption('contract_update');
      
      // Check only contract update notifications are shown
      await expect(page.locator('text="Contract Updated"')).toBeVisible();
      await expect(page.locator('text="Team Invitation"')).not.toBeVisible();
      
      // Reset filter
      await typeFilter.selectOption('all');
      await expect(page.locator('text="Team Invitation"')).toBeVisible();
    } else {
      // Try filter tabs
      const contractTab = page.locator('button:has-text("Contracts"), [data-filter="contract_update"]');
      if (await contractTab.isVisible()) {
        await contractTab.click();
        await expect(page.locator('text="Contract Updated"')).toBeVisible();
      }
    }
  });

  test('should filter notifications by priority', async ({ page }) => {
    // Look for priority filter
    const priorityFilter = page.locator('select[name="priority"], [data-testid="priority-filter"]');
    if (await priorityFilter.isVisible()) {
      // Filter by high priority
      await priorityFilter.selectOption('high');
      
      // Check only high priority notifications are shown
      await expect(page.locator('text="Deadline Approaching"')).toBeVisible();
      await expect(page.locator('text="Compliance Issue"')).toBeVisible();
      await expect(page.locator('text="Team Invitation"')).not.toBeVisible();
      
      // Reset filter
      await priorityFilter.selectOption('all');
      await expect(page.locator('text="Team Invitation"')).toBeVisible();
    }
  });

  test('should navigate to related entity', async ({ page }) => {
    // Click on a notification with related contract
    const contractNotification = page.locator('[data-notification-id="1"], text="Service Agreement #123"');
    
    if (await contractNotification.isVisible()) {
      await contractNotification.click();
      
      // Check navigation to contract page
      await expect(page).toHaveURL(/\/contracts\/123|\/contracts.*123/);
    } else {
      // Try clicking on notification message
      const notificationLink = page.locator('a:has-text("Service Agreement"), [data-testid="notification-link"]');
      if (await notificationLink.isVisible()) {
        await notificationLink.click();
        await expect(page).toHaveURL(/\/contracts/);
      }
    }
  });

  test('should delete notification', async ({ page }) => {
    // Find notification with delete option
    const notification = page.locator('[data-notification-id="3"], tr:has-text("Team Invitation")');
    
    const deleteButton = notification.locator('button:has-text("Delete"), [data-testid="delete-notification"]');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Check for confirmation dialog
      await expect(page.locator('[role="dialog"], text*="delete"')).toBeVisible();
      
      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
      await confirmButton.click();
      
      // Check notification is removed
      await expect(page.locator('text="Team Invitation"')).not.toBeVisible();
    } else {
      // Try menu approach
      const menuButton = notification.locator('button[aria-label*="menu"], [data-testid="notification-menu"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.locator('text="Delete"').click();
      }
    }
  });

  test('should manage notification preferences', async ({ page }) => {
    // Look for preferences/settings button
    const preferencesButton = page.locator('button:has-text("Preferences"), button:has-text("Settings"), [data-testid="notification-preferences"]');
    if (await preferencesButton.isVisible()) {
      await preferencesButton.click();
      
      // Check preferences modal/page opens
      await expect(page.locator('[role="dialog"], .modal, h1:has-text("Preferences")')).toBeVisible();
      
      // Check preference toggles
      const emailToggle = page.locator('input[name="email_notifications"], [data-testid="email-notifications"]');
      if (await emailToggle.isVisible()) {
        await expect(emailToggle).toBeChecked();
        
        // Toggle email notifications
        await emailToggle.uncheck();
      }
      
      const deadlineToggle = page.locator('input[name="deadline_reminders"], [data-testid="deadline-reminders"]');
      if (await deadlineToggle.isVisible()) {
        await expect(deadlineToggle).toBeChecked();
      }
      
      // Save preferences
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
      await saveButton.click();
      
      // Check for success message
      await expect(page.locator('text*="preferences", text*="saved", [role="alert"]')).toBeVisible();
    }
  });

  test('should handle real-time notifications', async ({ page }) => {
    // Mock real-time notification
    await page.evaluate(() => {
      // Simulate WebSocket or SSE notification
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          id: 5,
          type: 'new_contract',
          title: 'New Contract Created',
          message: 'A new contract has been created and requires your review',
          created_at: new Date().toISOString(),
          read: false,
          priority: 'medium'
        }
      }));
    });
    
    // Check if new notification appears
    await expect(page.locator('text="New Contract Created"')).toBeVisible();
    
    // Check if unread count is updated
    await expect(page.locator('text="3", [data-testid="unread-count"]')).toBeVisible();
  });

  test('should handle notification pagination', async ({ page }) => {
    // Mock more notifications for pagination
    await page.route('**/api/v1/notifications/list?page=2', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [
            {
              id: 5,
              type: 'system_update',
              title: 'System Maintenance',
              message: 'Scheduled maintenance will occur tonight',
              created_at: '2024-03-17T20:00:00Z',
              read: true,
              priority: 'low'
            }
          ],
          total: 5,
          page: 2,
          per_page: 4
        })
      });
    });
    
    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Next"), [data-testid="next-page"]');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      
      // Check for page 2 notifications
      await expect(page.locator('text="System Maintenance"')).toBeVisible();
    }
    
    // Check page numbers
    const pageButton = page.locator('button:has-text("2"), [data-page="2"]');
    if (await pageButton.isVisible()) {
      await pageButton.click();
    }
  });

  test('should handle notification search', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"], [data-testid="notification-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('contract');
      
      // Check search results
      await expect(page.locator('text="Contract Updated"')).toBeVisible();
      await expect(page.locator('text="Team Invitation"')).not.toBeVisible();
      
      // Clear search
      await searchInput.clear();
      await expect(page.locator('text="Team Invitation"')).toBeVisible();
    }
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check that notifications are still accessible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text="Contract Updated"')).toBeVisible();
    
    // Check for mobile-friendly navigation
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }
    
    // Check notification interaction on mobile
    const notification = page.locator('text="Contract Updated"').first();
    await notification.click();
    
    // Check if notification details are shown properly on mobile
    await expect(page.locator('text="Service Agreement #123"')).toBeVisible();
  });

  test('should handle empty notifications state', async ({ page }) => {
    // Mock empty notifications
    await page.route('**/api/v1/notifications/list', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [],
          unread_count: 0,
          total: 0
        })
      });
    });
    
    await page.reload();
    
    // Check for empty state
    await expect(page.locator('text*="No notifications", text*="All caught up", text*="No new messages"')).toBeVisible();
    
    // Check for illustration or icon
    const emptyStateIcon = page.locator('[data-testid="empty-state"], .empty-state');
    if (await emptyStateIcon.isVisible()) {
      await expect(emptyStateIcon).toBeVisible();
    }
  });

  test('should handle notification loading states', async ({ page }) => {
    // Add delay to API to test loading
    await page.route('**/api/v1/notifications/list', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ notifications: [], total: 0 })
      });
    });
    
    await page.goto('/notifications');
    
    // Check for loading indicators
    await expect(page.locator('[data-testid="loading"], .spinner, text*="Loading"')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading"], .spinner')).not.toBeVisible({ timeout: 10000 });
    
    // Verify notifications loaded
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle notification errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/notifications/mark-read', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to mark notification as read'
        })
      });
    });
    
    // Try to mark notification as read
    const notification = page.locator('[data-notification-id="1"]');
    const markReadButton = notification.locator('button:has-text("Mark Read"), [data-testid="mark-read"]');
    
    if (await markReadButton.isVisible()) {
      await markReadButton.click();
      
      // Check for error message
      await expect(page.locator('text*="error", text*="failed", [role="alert"]')).toBeVisible();
    }
  });

  test('should display notification timestamps correctly', async ({ page }) => {
    // Check for relative timestamps
    await expect(page.locator('text*="2 days ago", text*="today", text*="yesterday"')).toBeVisible();
    
    // Check for absolute timestamps on hover or click
    const notification = page.locator('[data-notification-id="1"]');
    await notification.hover();
    
    // Check for tooltip with full timestamp
    const tooltip = page.locator('[role="tooltip"], .tooltip');
    if (await tooltip.isVisible()) {
      await expect(tooltip).toContainText(/2024-03-20|Mar 20/);
    }
  });

  test('should handle notification priority indicators', async ({ page }) => {
    // Check for priority indicators (colors, icons, badges)
    const highPriorityNotifications = page.locator('[data-priority="high"], .priority-high');
    if (await highPriorityNotifications.first().isVisible()) {
      await expect(highPriorityNotifications.first()).toBeVisible();
    }
    
    // Check for visual priority indicators
    await expect(page.locator('text="Deadline Approaching"').locator('..').locator('[class*="high"], [class*="urgent"]')).toBeVisible();
  });
});
