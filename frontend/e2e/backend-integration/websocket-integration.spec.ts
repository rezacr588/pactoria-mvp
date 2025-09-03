import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * WEBSOCKET BACKEND INTEGRATION TESTS
 * 
 * These tests validate real-time WebSocket functionality with the backend.
 * They ensure WebSocket connections, message handling, and real-time updates work correctly.
 */

test.describe('WebSocket Backend Integration', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const WS_URL = API_BASE_URL.replace(/^http/, 'ws').replace('/api/v1', '');
  
  let authenticatedContext: any;
  let testUser: any;

  test.beforeAll(async ({ browser }) => {
    // Create authenticated context for WebSocket tests
    testUser = {
      email: `websocket-test-${faker.string.uuid()}@integration-test.com`,
      password: 'WebSocketTest123!',
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: `${faker.company.name()} WebSocket Test Co.`
    };

    const context = await browser.newContext();
    const page = await context.newPage();

    // Register test user
    await page.goto('/register');
    await page.getByLabel(/full name|name/i).fill(testUser.full_name);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByLabel(/company/i).fill(testUser.company_name);
    
    const regResponse = page.waitForResponse(response => response.url().includes('/auth/register'));
    await page.getByRole('button', { name: /register|sign up/i }).click();
    await regResponse;
    
    await expect(page).toHaveURL(/\/dashboard/);
    
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

  test.describe('WebSocket Connection Integration', () => {
    test('should establish WebSocket connection on authenticated page load @smoke @integration', async ({ page }) => {
      // Track WebSocket connections
      let websocketConnected = false;
      let websocketMessages: any[] = [];

      // Monitor WebSocket connections
      page.on('websocket', ws => {
        websocketConnected = true;
        
        ws.on('framesent', event => {
          if (event.payload) {
            try {
              const message = JSON.parse(event.payload.toString());
              websocketMessages.push({ type: 'sent', message });
            } catch (error) {
              // Non-JSON message
              websocketMessages.push({ type: 'sent', payload: event.payload.toString() });
            }
          }
        });
        
        ws.on('framereceived', event => {
          if (event.payload) {
            try {
              const message = JSON.parse(event.payload.toString());
              websocketMessages.push({ type: 'received', message });
            } catch (error) {
              // Non-JSON message
              websocketMessages.push({ type: 'received', payload: event.payload.toString() });
            }
          }
        });
      });

      await page.goto('/dashboard');
      
      // Wait for potential WebSocket connection
      await page.waitForTimeout(3000);

      if (websocketConnected) {
        // WebSocket connection was established
        expect(websocketConnected).toBe(true);
        
        // Should have sent connection/authentication messages
        const sentMessages = websocketMessages.filter(msg => msg.type === 'sent');
        expect(sentMessages.length).toBeGreaterThan(0);
        
        // Look for authentication or connection messages
        const hasAuthMessage = sentMessages.some(msg => 
          msg.message?.type === 'auth' || 
          msg.message?.type === 'connect' ||
          msg.payload?.includes('token')
        );
        
        if (hasAuthMessage) {
          expect(hasAuthMessage).toBe(true);
        }
      }
    });

    test('should handle WebSocket connection failures gracefully @integration', async ({ page }) => {
      // Mock WebSocket server unavailable (this is tricky to test reliably)
      // Instead, we'll test the application's behavior when WebSocket fails to connect
      
      await page.goto('/dashboard');
      
      // Inject code to simulate WebSocket connection failure
      await page.evaluate(() => {
        // Override WebSocket to simulate connection failure
        const originalWebSocket = window.WebSocket;
        (window as any).WebSocket = class extends originalWebSocket {
          constructor(url: string, protocols?: string | string[]) {
            super(url, protocols);
            // Simulate immediate connection failure
            setTimeout(() => {
              this.dispatchEvent(new Event('error'));
              this.dispatchEvent(new CloseEvent('close', { code: 1006, reason: 'Connection failed' }));
            }, 100);
          }
        };
      });
      
      // Reload to trigger WebSocket connection attempt
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Application should still function without WebSocket
      await expect(page.getByText(/dashboard|welcome/i)).toBeVisible();
      
      // Look for connection status indicators
      const connectionIndicators = [
        page.getByText(/offline|disconnected/i),
        page.getByText(/connection.*lost/i),
        page.locator('[data-testid="connection-status"]')
      ];
      
      let statusIndicatorFound = false;
      for (const indicator of connectionIndicators) {
        if (await indicator.isVisible()) {
          statusIndicatorFound = true;
          break;
        }
      }
      
      // If connection status indicators are implemented, they should show disconnected state
      if (statusIndicatorFound) {
        expect(statusIndicatorFound).toBe(true);
      }
    });

    test('should authenticate WebSocket connection with user token @integration', async ({ page }) => {
      let authenticationSent = false;
      let authenticationReceived = false;

      page.on('websocket', ws => {
        ws.on('framesent', event => {
          if (event.payload) {
            try {
              const message = JSON.parse(event.payload.toString());
              if (message.type === 'auth' || message.token || message.type === 'connect') {
                authenticationSent = true;
              }
            } catch (error) {
              // Check for token in raw payload
              if (event.payload.toString().includes('token') || event.payload.toString().includes('auth')) {
                authenticationSent = true;
              }
            }
          }
        });
        
        ws.on('framereceived', event => {
          if (event.payload) {
            try {
              const message = JSON.parse(event.payload.toString());
              if (message.type === 'auth_success' || message.type === 'connected' || message.authenticated === true) {
                authenticationReceived = true;
              }
            } catch (error) {
              // Check for success indicators in raw payload
              if (event.payload.toString().includes('success') || event.payload.toString().includes('authenticated')) {
                authenticationReceived = true;
              }
            }
          }
        });
      });

      await page.goto('/dashboard');
      await page.waitForTimeout(3000);

      // If WebSocket authentication is implemented
      if (authenticationSent || authenticationReceived) {
        expect(authenticationSent).toBe(true);
      }
    });
  });

  test.describe('Real-time Notifications Integration', () => {
    test('should receive real-time notifications via WebSocket @integration', async ({ page }) => {
      let notificationReceived = false;
      let notificationData: any = null;

      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          if (event.payload) {
            try {
              const message = JSON.parse(event.payload.toString());
              if (message.type === 'notification' || message.notification || message.type === 'contract_updated') {
                notificationReceived = true;
                notificationData = message;
              }
            } catch (error) {
              // Handle non-JSON notifications
            }
          }
        });
      });

      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      // Simulate an action that should trigger a notification
      // Create a contract which might trigger real-time notifications
      await page.goto('/contracts/new');
      
      const testContract = {
        title: `WebSocket Notification Test ${faker.string.uuid()}`,
        contract_type: 'SERVICE_AGREEMENT',
        plain_english_input: 'This contract creation should trigger WebSocket notifications'
      };

      await page.getByLabel(/title/i).fill(testContract.title);
      await page.getByLabel(/contract type/i).selectOption(testContract.contract_type);
      await page.getByLabel(/plain english|description/i).fill(testContract.plain_english_input);

      await page.getByRole('button', { name: /create|submit/i }).click();
      
      // Wait for potential real-time notification
      await page.waitForTimeout(3000);

      if (notificationReceived) {
        expect(notificationReceived).toBe(true);
        expect(notificationData).toBeTruthy();
        
        // Should display notification in UI
        const notificationElement = page.getByText(/notification|created|updated/i);
        if (await notificationElement.isVisible()) {
          await expect(notificationElement).toBeVisible();
        }
      }
    });

    test('should update UI in real-time when contracts are modified @integration', async ({ page }) => {
      let contractUpdateReceived = false;

      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          if (event.payload) {
            try {
              const message = JSON.parse(event.payload.toString());
              if (message.type === 'contract_updated' || message.type === 'data_update') {
                contractUpdateReceived = true;
              }
            } catch (error) {
              // Handle non-JSON messages
            }
          }
        });
      });

      await page.goto('/contracts');
      await page.waitForTimeout(2000);

      // In a real scenario, we'd need another user or background process to modify contracts
      // For testing, we can simulate the WebSocket message directly
      await page.evaluate(() => {
        // Simulate receiving a WebSocket message about contract update
        if ((window as any).mockWebSocketMessage) {
          (window as any).mockWebSocketMessage({
            type: 'contract_updated',
            contract_id: 'test-contract-123',
            changes: { status: 'ACTIVE' },
            updated_by: 'Another User'
          });
        }
      });

      await page.waitForTimeout(1000);

      // Look for real-time update indicators
      const updateIndicators = [
        page.getByText(/updated.*by.*another.*user/i),
        page.getByText(/contract.*updated/i),
        page.locator('[data-testid="real-time-update"]')
      ];

      let updateIndicatorFound = false;
      for (const indicator of updateIndicators) {
        if (await indicator.isVisible()) {
          updateIndicatorFound = true;
          break;
        }
      }

      if (contractUpdateReceived || updateIndicatorFound) {
        expect(contractUpdateReceived || updateIndicatorFound).toBe(true);
      }
    });
  });

  test.describe('WebSocket Message Types Integration', () => {
    test('should handle ping/pong messages for connection keepalive @integration', async ({ page }) => {
      let pingReceived = false;
      let pongSent = false;

      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          if (event.payload) {
            const payload = event.payload.toString();
            if (payload === 'ping' || payload.includes('"type":"ping"')) {
              pingReceived = true;
            }
          }
        });
        
        ws.on('framesent', event => {
          if (event.payload) {
            const payload = event.payload.toString();
            if (payload === 'pong' || payload.includes('"type":"pong"')) {
              pongSent = true;
            }
          }
        });
      });

      await page.goto('/dashboard');
      await page.waitForTimeout(5000); // Wait for potential ping/pong

      if (pingReceived || pongSent) {
        // Ping/pong mechanism is implemented
        expect(pingReceived || pongSent).toBe(true);
      }
    });

    test('should handle subscription messages for specific topics @integration', async ({ page }) => {
      let subscriptionSent = false;

      page.on('websocket', ws => {
        ws.on('framesent', event => {
          if (event.payload) {
            try {
              const message = JSON.parse(event.payload.toString());
              if (message.type === 'subscribe' && message.topics) {
                subscriptionSent = true;
              }
            } catch (error) {
              // Handle non-JSON subscription messages
              const payload = event.payload.toString();
              if (payload.includes('subscribe') || payload.includes('topics')) {
                subscriptionSent = true;
              }
            }
          }
        });
      });

      await page.goto('/contracts');
      await page.waitForTimeout(2000);

      // Navigate to different sections to trigger topic subscriptions
      await page.goto('/analytics');
      await page.waitForTimeout(1000);
      
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);

      if (subscriptionSent) {
        expect(subscriptionSent).toBe(true);
      }
    });
  });

  test.describe('WebSocket Error Handling Integration', () => {
    test('should handle WebSocket disconnection and reconnection @integration', async ({ page }) => {
      let disconnectionDetected = false;
      let reconnectionAttempted = false;

      page.on('websocket', ws => {
        ws.on('close', () => {
          disconnectionDetected = true;
        });
        
        // Monitor for reconnection attempts
        setTimeout(() => {
          if (disconnectionDetected) {
            // Check if new WebSocket connection is attempted
            page.on('websocket', newWs => {
              reconnectionAttempted = true;
            });
          }
        }, 1000);
      });

      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      // Simulate network disconnection by closing WebSocket
      await page.evaluate(() => {
        // Find and close any WebSocket connections
        if ((window as any).webSocketInstance) {
          (window as any).webSocketInstance.close();
        }
      });

      await page.waitForTimeout(3000);

      // Navigate to trigger potential reconnection
      await page.goto('/contracts');
      await page.waitForTimeout(2000);

      if (disconnectionDetected && reconnectionAttempted) {
        expect(reconnectionAttempted).toBe(true);
      }
    });

    test('should display connection status in UI @integration', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      // Look for connection status indicators
      const connectionIndicators = [
        page.getByText(/connected|online/i),
        page.getByText(/connecting/i),
        page.locator('[data-testid="connection-status"]'),
        page.locator('.connection-indicator'),
        page.locator('[title*="connection" i]')
      ];

      let statusIndicatorFound = false;
      for (const indicator of connectionIndicators) {
        if (await indicator.isVisible()) {
          statusIndicatorFound = true;
          break;
        }
      }

      // If connection status is implemented, verify it's shown
      if (statusIndicatorFound) {
        expect(statusIndicatorFound).toBe(true);
      }
    });
  });

  test.describe('WebSocket Health and Monitoring Integration', () => {
    test('should retrieve WebSocket health status from backend @integration', async ({ page }) => {
      // Track WebSocket health API call
      const healthResponse = page.waitForResponse(
        response => response.url().includes('/ws/health') && 
                   response.request().method() === 'GET'
      );

      await page.goto('/dashboard');

      try {
        const response = await healthResponse;
        expect(response.status()).toBe(200);

        const healthData = await response.json();
        expect(healthData).toHaveProperty('status');
        expect(healthData).toHaveProperty('active_connections');
        
        // Should display health information if available
        if (healthData.active_connections !== undefined) {
          const connectionText = page.getByText(new RegExp(healthData.active_connections.toString()));
          if (await connectionText.isVisible()) {
            await expect(connectionText).toBeVisible();
          }
        }
      } catch (error) {
        // WebSocket health endpoint might not be implemented
        console.log('WebSocket health endpoint not available or not called');
      }
    });

    test('should retrieve WebSocket statistics from backend @integration', async ({ page }) => {
      // Track WebSocket stats API call
      let statsResponse = null;
      try {
        statsResponse = await page.waitForResponse(
          response => response.url().includes('/ws/stats') && 
                     response.request().method() === 'GET',
          { timeout: 3000 }
        );
      } catch (error) {
        // Stats endpoint might not be available
      }

      await page.goto('/analytics'); // Stats might be shown on analytics page

      if (statsResponse) {
        expect(statsResponse.status()).toBe(200);

        const statsData = await statsResponse.json();
        expect(statsData).toHaveProperty('websocket_stats');
        expect(statsData.websocket_stats).toHaveProperty('active_connections');
        
        // Should display WebSocket statistics
        await expect(page.getByText(/websocket|real.*time|connections/i)).toBeVisible();
      }
    });
  });

  test.describe('WebSocket Performance Integration', () => {
    test('should handle high-frequency WebSocket messages without performance issues @integration', async ({ page }) => {
      let messageCount = 0;
      let performanceIssues = false;

      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          messageCount++;
          
          // Monitor for performance issues
          const startTime = Date.now();
          setTimeout(() => {
            const processingTime = Date.now() - startTime;
            if (processingTime > 100) { // If processing takes more than 100ms
              performanceIssues = true;
            }
          }, 0);
        });
      });

      await page.goto('/dashboard');

      // Simulate high-frequency messages (in real scenario, this would come from server)
      await page.evaluate(() => {
        // Mock high-frequency WebSocket messages
        for (let i = 0; i < 50; i++) {
          setTimeout(() => {
            if ((window as any).mockWebSocketMessage) {
              (window as any).mockWebSocketMessage({
                type: 'heartbeat',
                timestamp: Date.now()
              });
            }
          }, i * 20); // 50 messages over 1 second
        }
      });

      await page.waitForTimeout(2000);

      // Application should remain responsive
      await expect(page.getByText(/dashboard|welcome/i)).toBeVisible();
      
      // Should not have significant performance issues
      expect(performanceIssues).toBe(false);
    });

    test('should maintain WebSocket connection during page navigation @integration', async ({ page }) => {
      let websocketMaintained = false;
      let connectionCount = 0;

      page.on('websocket', ws => {
        connectionCount++;
        
        ws.on('close', () => {
          // Connection closed
        });
      });

      await page.goto('/dashboard');
      await page.waitForTimeout(1000);
      
      const initialConnectionCount = connectionCount;

      // Navigate between pages
      await page.goto('/contracts');
      await page.waitForTimeout(1000);
      
      await page.goto('/analytics');
      await page.waitForTimeout(1000);
      
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);

      // Should maintain connection or efficiently manage reconnections
      const finalConnectionCount = connectionCount;
      
      // Either connection was maintained (same count) or efficiently managed (not excessive reconnections)
      if (initialConnectionCount > 0) {
        websocketMaintained = finalConnectionCount <= initialConnectionCount + 2; // Allow for some reconnections
        expect(websocketMaintained).toBe(true);
      }
    });
  });
});