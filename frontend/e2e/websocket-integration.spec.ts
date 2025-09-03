import { test, expect } from '@playwright/test';

test.describe('WebSocket Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        json: {
          id: 'test-user-id',
          email: 'test@example.com',
          full_name: 'Test User',
          is_active: true,
          timezone: 'UTC',
          company_id: 'test-company-id',
          created_at: '2024-01-01T00:00:00Z',
          last_login_at: '2024-01-01T00:00:00Z'
        }
      });
    });

    // Mock WebSocket health endpoint
    await page.route('**/api/v1/ws/health', async (route) => {
      await route.fulfill({
        json: {
          status: 'healthy',
          service: 'websocket',
          active_connections: 5,
          uptime_seconds: 3600,
          background_tasks: 'running'
        }
      });
    });

    // Mock WebSocket stats endpoint (admin only)
    await page.route('**/api/v1/ws/stats', async (route) => {
      await route.fulfill({
        json: {
          websocket_stats: {
            active_connections: 5,
            uptime_seconds: 3600
          },
          generated_at: '2024-01-01T12:00:00Z'
        }
      });
    });

    // Set up WebSocket mock before page load
    await page.addInitScript(() => {
      // Mock WebSocket class
      class MockWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;

        readyState = MockWebSocket.CONNECTING;
        url: string;
        onopen: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        constructor(url: string) {
          this.url = url;
          setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            if (this.onopen) {
              this.onopen(new Event('open'));
            }
          }, 100);
        }

        send(data: string) {
          // Mock sending data
          console.log('WebSocket send:', data);
        }

        close(code?: number, reason?: string) {
          this.readyState = MockWebSocket.CLOSED;
          if (this.onclose) {
            this.onclose(new CloseEvent('close', { code, reason }));
          }
        }
      }

      // Replace global WebSocket
      (window as any).WebSocket = MockWebSocket;
      
      // Add mock message injection function for tests
      (window as any).injectWebSocketMessage = (message: any) => {
        const ws = (window as any)._currentWebSocket;
        if (ws && ws.onmessage) {
          ws.onmessage({
            data: JSON.stringify(message),
            type: 'message',
            target: ws
          });
        }
      };

      // Track current WebSocket instance
      const originalWebSocket = (window as any).WebSocket;
      (window as any).WebSocket = function(url: string) {
        const instance = new originalWebSocket(url);
        (window as any)._currentWebSocket = instance;
        return instance;
      };
      (window as any).WebSocket.CONNECTING = originalWebSocket.CONNECTING;
      (window as any).WebSocket.OPEN = originalWebSocket.OPEN;
      (window as any).WebSocket.CLOSING = originalWebSocket.CLOSING;
      (window as any).WebSocket.CLOSED = originalWebSocket.CLOSED;
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should establish WebSocket connection @smoke', async ({ page }) => {
    // Check if WebSocket connection indicator is present
    await expect(page.locator('[data-testid="websocket-status"]')).toBeVisible();

    // Should show connected status
    await expect(page.getByText(/connected|online/i)).toBeVisible();
  });

  test('should display real-time contract updates @regression', async ({ page }) => {
    // Wait for WebSocket connection
    await page.waitForTimeout(200);

    // Inject a contract update message
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'contract_update',
        timestamp: new Date().toISOString(),
        contract_id: '123',
        contract_title: 'Updated Service Agreement',
        updated_by: 'user-456',
        updated_by_name: 'Jane Doe',
        changes: {
          status: { old: 'DRAFT', new: 'ACTIVE' }
        },
        version: 2
      });
    });

    // Should show notification of contract update
    await expect(page.getByText(/contract.*updated/i)).toBeVisible();
    await expect(page.getByText('Updated Service Agreement')).toBeVisible();
    await expect(page.getByText('Jane Doe')).toBeVisible();
  });

  test('should display real-time notifications @regression', async ({ page }) => {
    // Wait for connection
    await page.waitForTimeout(200);

    // Inject a notification message
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'notification',
        timestamp: new Date().toISOString(),
        title: 'Contract Review Required',
        message: 'A new contract is ready for your review.',
        notification_type: 'contract_review',
        priority: 'HIGH',
        action_url: '/contracts/review/456'
      });
    });

    // Should show the notification
    await expect(page.getByText('Contract Review Required')).toBeVisible();
    await expect(page.getByText('A new contract is ready for your review.')).toBeVisible();
  });

  test('should display system messages @regression', async ({ page }) => {
    // Wait for connection
    await page.waitForTimeout(200);

    // Inject a system message
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'system',
        timestamp: new Date().toISOString(),
        message: 'System maintenance scheduled for tonight at 2 AM UTC.',
        level: 'WARNING',
        affects_all_users: true,
        maintenance_mode: false,
        estimated_duration: '2 hours'
      });
    });

    // Should show system message
    await expect(page.getByText(/system maintenance/i)).toBeVisible();
    await expect(page.getByText(/2 AM UTC/i)).toBeVisible();
  });

  test('should display bulk operation progress @regression', async ({ page }) => {
    // Wait for connection
    await page.waitForTimeout(200);

    // Inject a bulk operation progress message
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'bulk_operation',
        timestamp: new Date().toISOString(),
        operation_id: 'bulk-123',
        operation_type: 'bulk_update_contracts',
        status: 'RUNNING',
        progress_percentage: 65,
        processed_count: 13,
        total_count: 20,
        success_count: 12,
        failed_count: 1,
        eta_seconds: 15,
        current_item: 'Contract-014'
      });
    });

    // Should show bulk operation progress
    await expect(page.getByText(/bulk.*progress/i)).toBeVisible();
    await expect(page.getByText(/65%/)).toBeVisible();
    await expect(page.getByText(/13.*20/)).toBeVisible();
  });

  test('should handle connection status changes @regression', async ({ page }) => {
    // Check initial connected state
    await expect(page.getByText(/connected|online/i)).toBeVisible();

    // Simulate disconnection
    await page.evaluate(() => {
      const ws = (window as any)._currentWebSocket;
      if (ws && ws.onclose) {
        ws.readyState = 3; // CLOSED
        ws.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
      }
    });

    // Should show disconnected state
    await expect(page.getByText(/disconnected|offline/i)).toBeVisible();
  });

  test('should handle WebSocket errors gracefully @regression', async ({ page }) => {
    // Simulate WebSocket error
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'error',
        timestamp: new Date().toISOString(),
        error_code: 'CONNECTION_ERROR',
        error_message: 'WebSocket connection lost. Attempting to reconnect...',
        details: { attempts: 1 }
      });
    });

    // Should show error message
    await expect(page.getByText(/connection.*lost/i)).toBeVisible();
    await expect(page.getByText(/reconnect/i)).toBeVisible();
  });

  test('should display alert messages with appropriate styling @regression', async ({ page }) => {
    // Wait for connection
    await page.waitForTimeout(200);

    // Inject a critical alert
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'alert',
        timestamp: new Date().toISOString(),
        title: 'Security Alert',
        message: 'Unusual login activity detected on your account.',
        severity: 'CRITICAL',
        category: 'SECURITY',
        affected_contracts: [],
        action_required: true,
        auto_dismiss: false
      });
    });

    // Should show alert with high visibility
    await expect(page.getByText('Security Alert')).toBeVisible();
    await expect(page.getByText(/unusual login activity/i)).toBeVisible();
    
    // Should have critical styling (red background, etc.)
    const alert = page.locator('[data-alert-severity="CRITICAL"]');
    await expect(alert).toBeVisible();
  });

  test('should handle contract creation notifications @regression', async ({ page }) => {
    // Wait for connection
    await page.waitForTimeout(200);

    // Inject contract created message
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'contract_created',
        timestamp: new Date().toISOString(),
        contract_id: 'new-contract-789',
        contract_title: 'New Employment Contract',
        contract_type: 'EMPLOYMENT_CONTRACT',
        created_by: 'user-123',
        created_by_name: 'John Smith',
        client_name: 'New Employee'
      });
    });

    // Should show contract creation notification
    await expect(page.getByText(/contract.*created/i)).toBeVisible();
    await expect(page.getByText('New Employment Contract')).toBeVisible();
    await expect(page.getByText('John Smith')).toBeVisible();
  });

  test('should support ping/pong health checks @regression', async ({ page }) => {
    // Wait for connection
    await page.waitForTimeout(200);

    // Inject pong response
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'pong',
        timestamp: new Date().toISOString()
      });
    });

    // Connection should remain healthy
    await expect(page.getByText(/connected|online/i)).toBeVisible();
  });

  test('should handle user presence updates @regression', async ({ page }) => {
    // Wait for connection
    await page.waitForTimeout(200);

    // Inject user joined message
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'user_joined',
        timestamp: new Date().toISOString(),
        user_id: 'user-999',
        user_name: 'Alice Johnson',
        status: 'online',
        last_seen: new Date().toISOString()
      });
    });

    // Should show user presence update (if displayed)
    // This would depend on UI implementation
    await expect(page.getByText('Alice Johnson')).toBeVisible();
  });

  test('should maintain WebSocket connection during navigation @regression', async ({ page }) => {
    // Check initial connection
    await expect(page.getByText(/connected|online/i)).toBeVisible();

    // Navigate to different page
    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');

    // WebSocket should still be connected
    await expect(page.getByText(/connected|online/i)).toBeVisible();
  });

  test('should handle batch messages @regression', async ({ page }) => {
    // Wait for connection
    await page.waitForTimeout(200);

    // Inject batch message with multiple updates
    await page.evaluate(() => {
      (window as any).injectWebSocketMessage({
        type: 'batch',
        timestamp: new Date().toISOString(),
        batch_id: 'batch-456',
        total_messages: 3,
        messages: [
          {
            type: 'contract_update',
            contract_id: '1',
            contract_title: 'Contract 1',
            changes: { status: { old: 'DRAFT', new: 'ACTIVE' } }
          },
          {
            type: 'contract_update',
            contract_id: '2',
            contract_title: 'Contract 2',
            changes: { status: { old: 'DRAFT', new: 'ACTIVE' } }
          },
          {
            type: 'notification',
            title: 'Batch Update Complete',
            message: '2 contracts updated successfully'
          }
        ]
      });
    });

    // Should process all messages in the batch
    await expect(page.getByText(/batch update complete/i)).toBeVisible();
  });

  test('should show WebSocket status in connection indicator @smoke', async ({ page }) => {
    // Connection status should be visible somewhere in the UI
    const statusIndicator = page.locator('[data-testid="websocket-status"], .websocket-status, [data-websocket-status]');
    await expect(statusIndicator).toBeVisible();

    // Should show connection state
    await expect(page.locator('text=/connected|disconnected|connecting/i')).toBeVisible();
  });

  test('should handle WebSocket reconnection @regression', async ({ page }) => {
    // Simulate disconnection
    await page.evaluate(() => {
      const ws = (window as any)._currentWebSocket;
      if (ws && ws.onclose) {
        ws.readyState = 3; // CLOSED
        ws.onclose(new CloseEvent('close', { code: 1006, reason: 'Connection lost' }));
      }
    });

    // Should show disconnected state
    await expect(page.getByText(/disconnected|offline/i)).toBeVisible();

    // After some time, should attempt reconnection
    // This would trigger in the actual WebSocket service
    await page.waitForTimeout(1000);

    // Mock successful reconnection
    await page.evaluate(() => {
      const originalWebSocket = (window as any).WebSocket;
      const ws = new originalWebSocket('ws://localhost:8000/ws/connect');
      (window as any)._currentWebSocket = ws;
      setTimeout(() => {
        if (ws.onopen) {
          ws.readyState = 1; // OPEN
          ws.onopen(new Event('open'));
        }
      }, 100);
    });

    // Should eventually show connected state again
    await expect(page.getByText(/connected|online/i)).toBeVisible();
  });
});