import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * WEBSOCKET & REAL-TIME INTEGRATION E2E TESTS
 * 
 * These tests validate real-time functionality and WebSocket integration with backend.
 * Critical for ensuring users receive live updates and collaborative features work properly.
 * 
 * Test Priority: HIGH (Essential for modern user experience)
 * 
 * Coverage:
 * - WebSocket Connection Management
 * - Real-time Notifications
 * - Live Progress Updates
 * - Collaborative Features
 * - Connection Resilience and Reconnection
 * - Performance under Load
 */

test.describe('WebSocket & Real-time Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated user for WebSocket tests
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: 'ws-user-123', 
            email: 'websocket@pactoria.com',
            full_name: 'WebSocket Test User',
            company_id: 'ws-company-123'
          },
          token: 'valid-ws-token'
        }
      }));
    });
  });

  test.describe('WebSocket Connection Management', () => {
    test('should establish WebSocket connection with backend @smoke', async ({ page }) => {
      let wsConnected = false;
      let wsMessages: any[] = [];

      // Mock WebSocket with connection tracking
      await page.addInitScript(() => {
        class MockWebSocket {
          static CONNECTING = 0;
          static OPEN = 1;
          static CLOSING = 2;
          static CLOSED = 3;
          
          readyState = MockWebSocket.CONNECTING;
          url: string;
          onopen: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;
          
          constructor(url: string) {
            this.url = url;
            // Store reference for test access
            (window as any).__mockWebSocket = this;
            
            // Simulate connection establishment
            setTimeout(() => {
              this.readyState = MockWebSocket.OPEN;
              if (this.onopen) {
                this.onopen(new Event('open'));
              }
            }, 100);
          }
          
          send(data: string) {
            (window as any).__wsSentMessages = (window as any).__wsSentMessages || [];
            (window as any).__wsSentMessages.push(JSON.parse(data));
          }
          
          close(code?: number, reason?: string) {
            this.readyState = MockWebSocket.CLOSED;
            if (this.onclose) {
              this.onclose(new CloseEvent('close', { code: code || 1000, reason }));
            }
          }
          
          // Helper method for tests to simulate received messages
          simulateMessage(data: any) {
            if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
              this.onmessage(new MessageEvent('message', { 
                data: JSON.stringify(data) 
              }));
            }
          }
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      // Mock WebSocket health endpoint
      await page.route('**/ws/health', async route => {
        await route.fulfill({
          status: 200,
          json: {
            status: 'healthy',
            service: 'websocket',
            active_connections: 42,
            uptime_seconds: 86400,
            background_tasks: 'running'
          }
        });
      });

      await page.goto('/dashboard');

      // Wait for WebSocket connection to be established
      await page.waitForFunction(() => {
        return (window as any).__mockWebSocket && 
               (window as any).__mockWebSocket.readyState === 1; // OPEN
      });

      // Validate WebSocket connection
      const wsUrl = await page.evaluate(() => (window as any).__mockWebSocket?.url);
      expect(wsUrl).toContain('/ws/connect');
      expect(wsUrl).toContain('token=valid-ws-token');

      // Should show connection indicator
      await expect(page.getByTestId('websocket-status')).toHaveText(/connected|online/i);
      
      // Should display connection health
      const healthResponse = page.waitForResponse(response => response.url().includes('/ws/health'));
      await healthResponse;
      
      await expect(page.getByText(/42.*active.*connections/i)).toBeVisible();
    });

    test('should handle WebSocket authentication @security', async ({ page }) => {
      // Mock WebSocket auth failure
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          static CLOSED = 3;
          
          readyState = MockWebSocket.CLOSED;
          onopen: ((event: Event) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;
          
          constructor(url: string) {
            // Simulate auth failure
            setTimeout(() => {
              if (this.onclose) {
                this.onclose(new CloseEvent('close', { 
                  code: 4001, 
                  reason: 'Authentication failed' 
                }));
              }
            }, 100);
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/dashboard');

      // Should show authentication error
      await expect(page.getByText(/websocket.*authentication.*failed/i)).toBeVisible();
      
      // Should show disconnected status
      await expect(page.getByTestId('websocket-status')).toHaveText(/disconnected|offline/i);
      
      // Should offer reconnection
      await expect(page.getByRole('button', { name: /reconnect/i })).toBeVisible();
    });

    test('should handle WebSocket reconnection @resilience', async ({ page }) => {
      let connectionAttempts = 0;
      
      await page.addInitScript(() => {
        class MockWebSocket {
          static CONNECTING = 0;
          static OPEN = 1;
          static CLOSED = 3;
          
          readyState = MockWebSocket.CONNECTING;
          onopen: ((event: Event) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;
          
          constructor(url: string) {
            (window as any).__connectionAttempts = ((window as any).__connectionAttempts || 0) + 1;
            const attempt = (window as any).__connectionAttempts;
            
            if (attempt === 1) {
              // First connection fails
              setTimeout(() => {
                this.readyState = MockWebSocket.CLOSED;
                if (this.onclose) {
                  this.onclose(new CloseEvent('close', { code: 1006, reason: 'Connection lost' }));
                }
              }, 100);
            } else {
              // Subsequent connections succeed
              setTimeout(() => {
                this.readyState = MockWebSocket.OPEN;
                if (this.onopen) {
                  this.onopen(new Event('open'));
                }
              }, 100);
            }
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/dashboard');

      // Should show initial connection lost
      await expect(page.getByText(/connection.*lost|disconnected/i)).toBeVisible();
      
      // Should show reconnecting status
      await expect(page.getByText(/reconnecting/i)).toBeVisible();
      
      // Should eventually reconnect
      await expect(page.getByText(/connected|reconnected/i)).toBeVisible({ timeout: 5000 });
      
      // Verify reconnection attempts
      const attempts = await page.evaluate(() => (window as any).__connectionAttempts);
      expect(attempts).toBeGreaterThan(1);
    });
  });

  test.describe('Real-time Notifications', () => {
    test('should receive contract update notifications @smoke', async ({ page }) => {
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onmessage: ((event: MessageEvent) => void) | null = null;
          
          constructor() {
            (window as any).__mockWebSocket = this;
            
            // Auto-connect
            setTimeout(() => {
              if (this.onmessage) {
                // Simulate welcome message
                this.onmessage(new MessageEvent('message', {
                  data: JSON.stringify({
                    type: 'connection_established',
                    user_id: 'ws-user-123',
                    timestamp: new Date().toISOString()
                  })
                }));
              }
            }, 100);
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/dashboard');
      
      // Wait for WebSocket connection
      await page.waitForFunction(() => (window as any).__mockWebSocket);

      // Simulate contract update notification
      await page.evaluate(() => {
        const ws = (window as any).__mockWebSocket;
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'contract_updated',
              contract_id: 'contract-123',
              title: 'Software Development Agreement',
              status: 'ACTIVE',
              updated_by: {
                id: 'other-user-456',
                name: 'Jane Doe'
              },
              changes: ['status', 'final_content'],
              timestamp: new Date().toISOString()
            })
          }));
        }
      });

      // Should show real-time notification
      await expect(page.getByText(/contract.*updated/i)).toBeVisible();
      await expect(page.getByText(/software development agreement/i)).toBeVisible();
      await expect(page.getByText(/jane doe/i)).toBeVisible();
      await expect(page.getByText(/status.*final_content/i)).toBeVisible();

      // Should offer to view updated contract
      const viewButton = page.getByRole('button', { name: /view.*contract/i });
      await expect(viewButton).toBeVisible();
      
      await viewButton.click();
      await expect(page).toHaveURL('/contracts/contract-123');
    });

    test('should receive bulk operation progress notifications @performance', async ({ page }) => {
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onmessage: ((event: MessageEvent) => void) | null = null;
          
          constructor() {
            (window as any).__mockWebSocket = this;
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/operations');
      
      // Wait for WebSocket connection
      await page.waitForFunction(() => (window as any).__mockWebSocket);

      // Simulate bulk operation progress updates
      const progressUpdates = [
        { progress_percentage: 10, processed_count: 10, total_count: 100, status: 'RUNNING' },
        { progress_percentage: 35, processed_count: 35, total_count: 100, status: 'RUNNING' },
        { progress_percentage: 60, processed_count: 60, total_count: 100, status: 'RUNNING' },
        { progress_percentage: 85, processed_count: 85, total_count: 100, status: 'RUNNING' },
        { progress_percentage: 100, processed_count: 100, total_count: 100, status: 'COMPLETED' }
      ];

      for (let i = 0; i < progressUpdates.length; i++) {
        await page.evaluate((update) => {
          const ws = (window as any).__mockWebSocket;
          if (ws && ws.onmessage) {
            ws.onmessage(new MessageEvent('message', {
              data: JSON.stringify({
                type: 'bulk_operation_progress',
                operation_id: 'bulk-op-789',
                operation_type: 'bulk_update',
                ...update,
                estimated_completion: new Date(Date.now() + 30000).toISOString(),
                timestamp: new Date().toISOString()
              })
            }));
          }
        }, progressUpdates[i]);

        // Should show updated progress
        await expect(page.getByText(`${progressUpdates[i].progress_percentage}%`)).toBeVisible();
        await expect(page.getByText(`${progressUpdates[i].processed_count}.*of.*100`)).toBeVisible();
        
        // Wait a bit between updates to simulate real-time
        await page.waitForTimeout(200);
      }

      // Should show completion notification
      await expect(page.getByText(/operation.*completed/i)).toBeVisible();
      await expect(page.getByText(/100.*contracts.*processed/i)).toBeVisible();
    });

    test('should receive user activity notifications @collaboration', async ({ page }) => {
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onmessage: ((event: MessageEvent) => void) | null = null;
          
          constructor() {
            (window as any).__mockWebSocket = this;
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/contracts/contract-456');
      
      // Wait for WebSocket connection
      await page.waitForFunction(() => (window as any).__mockWebSocket);

      // Simulate another user viewing the same contract
      await page.evaluate(() => {
        const ws = (window as any).__mockWebSocket;
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'user_activity',
              activity_type: 'contract_viewed',
              contract_id: 'contract-456',
              user: {
                id: 'other-user-789',
                name: 'Bob Smith',
                email: 'bob@company.com'
              },
              timestamp: new Date().toISOString()
            })
          }));
        }
      });

      // Should show user activity indicator
      await expect(page.getByText(/bob smith.*viewing/i)).toBeVisible();
      
      // Should show user avatar/indicator
      await expect(page.getByTestId('active-user-bob')).toBeVisible();

      // Simulate user editing
      await page.evaluate(() => {
        const ws = (window as any).__mockWebSocket;
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'user_activity',
              activity_type: 'contract_editing',
              contract_id: 'contract-456',
              user: {
                id: 'other-user-789',
                name: 'Bob Smith',
                email: 'bob@company.com'
              },
              field: 'final_content',
              timestamp: new Date().toISOString()
            })
          }));
        }
      });

      // Should show editing indicator
      await expect(page.getByText(/bob smith.*editing/i)).toBeVisible();
      await expect(page.getByText(/final_content/i)).toBeVisible();
    });

    test('should handle system-wide notifications @critical', async ({ page }) => {
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onmessage: ((event: MessageEvent) => void) | null = null;
          
          constructor() {
            (window as any).__mockWebSocket = this;
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/dashboard');
      
      // Wait for WebSocket connection
      await page.waitForFunction(() => (window as any).__mockWebSocket);

      // Simulate system maintenance notification
      await page.evaluate(() => {
        const ws = (window as any).__mockWebSocket;
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'system_notification',
              notification_type: 'maintenance_scheduled',
              title: 'Scheduled Maintenance',
              message: 'System maintenance is scheduled for tonight at 2:00 AM UTC. Expected downtime: 30 minutes.',
              severity: 'info',
              action_required: false,
              scheduled_at: '2024-01-02T02:00:00Z',
              timestamp: new Date().toISOString()
            })
          }));
        }
      });

      // Should show system notification
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByText(/scheduled maintenance/i)).toBeVisible();
      await expect(page.getByText(/2:00 AM UTC/i)).toBeVisible();
      await expect(page.getByText(/30 minutes/i)).toBeVisible();

      // Should allow dismissal
      await page.getByRole('button', { name: /dismiss/i }).click();
      await expect(page.getByText(/scheduled maintenance/i)).not.toBeVisible();

      // Simulate critical system alert
      await page.evaluate(() => {
        const ws = (window as any).__mockWebSocket;
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'system_notification',
              notification_type: 'security_alert',
              title: 'Security Alert',
              message: 'Unusual activity detected on your account. Please review recent activity.',
              severity: 'critical',
              action_required: true,
              action_url: '/security/activity',
              timestamp: new Date().toISOString()
            })
          }));
        }
      });

      // Should show critical alert prominently
      await expect(page.getByRole('alert')).toHaveClass(/alert-critical|alert-error/);
      await expect(page.getByText(/security alert/i)).toBeVisible();
      await expect(page.getByText(/unusual activity/i)).toBeVisible();
      
      // Should provide action button
      const reviewButton = page.getByRole('button', { name: /review.*activity/i });
      await expect(reviewButton).toBeVisible();
      
      await reviewButton.click();
      await expect(page).toHaveURL('/security/activity');
    });
  });

  test.describe('Live Progress Updates', () => {
    test('should show live AI generation progress @realtime', async ({ page }) => {
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onmessage: ((event: MessageEvent) => void) | null = null;
          
          constructor() {
            (window as any).__mockWebSocket = this;
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      // Mock contract generation API
      await page.route('**/contracts/*/generate', async route => {
        await route.fulfill({
          status: 202, // Accepted
          json: {
            generation_id: 'gen-123',
            status: 'PROCESSING',
            estimated_completion: new Date(Date.now() + 30000).toISOString()
          }
        });
      });

      await page.goto('/contracts/test-contract');
      
      // Start AI generation
      await page.getByRole('button', { name: /generate|ai generate/i }).click();
      
      // Should show processing status
      await expect(page.getByText(/generating.*content/i)).toBeVisible();

      // Simulate real-time generation progress
      const generationSteps = [
        { step: 'analyzing_input', progress: 20, message: 'Analyzing plain English input...' },
        { step: 'generating_clauses', progress: 40, message: 'Generating contract clauses...' },
        { step: 'compliance_check', progress: 60, message: 'Checking compliance requirements...' },
        { step: 'formatting', progress: 80, message: 'Formatting final content...' },
        { step: 'completed', progress: 100, message: 'Content generation completed' }
      ];

      for (const step of generationSteps) {
        await page.evaluate((stepData) => {
          const ws = (window as any).__mockWebSocket;
          if (ws && ws.onmessage) {
            ws.onmessage(new MessageEvent('message', {
              data: JSON.stringify({
                type: 'ai_generation_progress',
                generation_id: 'gen-123',
                contract_id: 'test-contract',
                ...stepData,
                timestamp: new Date().toISOString()
              })
            }));
          }
        }, step);

        // Should show progress updates
        await expect(page.getByText(`${step.progress}%`)).toBeVisible();
        await expect(page.getByText(step.message)).toBeVisible();
        
        await page.waitForTimeout(200);
      }

      // Should show completion and final content
      await expect(page.getByText(/generation.*completed/i)).toBeVisible();
      await expect(page.getByTestId('generated-content')).toBeVisible();
    });

    test('should show live compliance analysis progress @realtime', async ({ page }) => {
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onmessage: ((event: MessageEvent) => void) | null = null;
          
          constructor() {
            (window as any).__mockWebSocket = this;
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/contracts/test-contract');
      
      // Start compliance analysis
      await page.getByRole('button', { name: /analyze|compliance/i }).click();

      // Simulate real-time analysis progress
      const analysisSteps = [
        { step: 'parsing_content', progress: 15, message: 'Parsing contract content...' },
        { step: 'gdpr_check', progress: 30, message: 'Analyzing GDPR compliance...' },
        { step: 'employment_law', progress: 50, message: 'Checking employment law compliance...' },
        { step: 'commercial_terms', progress: 70, message: 'Reviewing commercial terms...' },
        { step: 'risk_assessment', progress: 90, message: 'Assessing legal risks...' },
        { step: 'completed', progress: 100, message: 'Compliance analysis completed' }
      ];

      for (const step of analysisSteps) {
        await page.evaluate((stepData) => {
          const ws = (window as any).__mockWebSocket;
          if (ws && ws.onmessage) {
            ws.onmessage(new MessageEvent('message', {
              data: JSON.stringify({
                type: 'compliance_analysis_progress',
                analysis_id: 'analysis-456',
                contract_id: 'test-contract',
                ...stepData,
                timestamp: new Date().toISOString()
              })
            }));
          }
        }, step);

        // Should show analysis progress
        await expect(page.getByText(`${step.progress}%`)).toBeVisible();
        await expect(page.getByText(step.message)).toBeVisible();
        
        await page.waitForTimeout(150);
      }

      // Should show final compliance scores
      await expect(page.getByText(/compliance.*analysis.*completed/i)).toBeVisible();
      await expect(page.getByTestId('compliance-scores')).toBeVisible();
    });
  });

  test.describe('WebSocket Performance and Reliability', () => {
    test('should handle high message volume @performance', async ({ page }) => {
      let messageCount = 0;
      
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onmessage: ((event: MessageEvent) => void) | null = null;
          
          constructor() {
            (window as any).__mockWebSocket = this;
            (window as any).__messageCount = 0;
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/dashboard');
      
      // Wait for WebSocket connection
      await page.waitForFunction(() => (window as any).__mockWebSocket);

      // Send high volume of messages
      const messagePromises = [];
      for (let i = 0; i < 100; i++) {
        messagePromises.push(
          page.evaluate((index) => {
            return new Promise<void>((resolve) => {
              setTimeout(() => {
                const ws = (window as any).__mockWebSocket;
                if (ws && ws.onmessage) {
                  ws.onmessage(new MessageEvent('message', {
                    data: JSON.stringify({
                      type: 'high_volume_test',
                      message_id: index,
                      data: `Test message ${index}`,
                      timestamp: new Date().toISOString()
                    })
                  }));
                  (window as any).__messageCount++;
                }
                resolve();
              }, index * 10); // 10ms intervals
            });
          }, i)
        );
      }

      await Promise.all(messagePromises);

      // Should handle all messages without performance issues
      const finalMessageCount = await page.evaluate(() => (window as any).__messageCount);
      expect(finalMessageCount).toBe(100);

      // UI should remain responsive
      await expect(page.getByTestId('websocket-status')).toBeVisible();
      
      // Should not show any error messages
      await expect(page.getByText(/websocket.*error|message.*dropped/i)).not.toBeVisible();
    });

    test('should handle WebSocket message queue overflow @resilience', async ({ page }) => {
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onmessage: ((event: MessageEvent) => void) | null = null;
          messageQueue: any[] = [];
          
          constructor() {
            (window as any).__mockWebSocket = this;
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/dashboard');
      
      // Simulate message queue overflow
      await page.evaluate(() => {
        const ws = (window as any).__mockWebSocket;
        if (ws && ws.onmessage) {
          // Send messages faster than they can be processed
          for (let i = 0; i < 1000; i++) {
            ws.onmessage(new MessageEvent('message', {
              data: JSON.stringify({
                type: 'overflow_test',
                message_id: i,
                large_payload: 'x'.repeat(10000), // Large payload
                timestamp: new Date().toISOString()
              })
            }));
          }
        }
      });

      // Should show overflow warning
      await expect(page.getByText(/message.*queue.*overflow|too many messages/i)).toBeVisible();
      
      // Should offer to clear queue
      await expect(page.getByRole('button', { name: /clear.*queue/i })).toBeVisible();
      
      // Should maintain connection
      await expect(page.getByTestId('websocket-status')).toHaveText(/connected/i);
    });

    test('should validate message authentication and integrity @security', async ({ page }) => {
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onmessage: ((event: MessageEvent) => void) | null = null;
          
          constructor() {
            (window as any).__mockWebSocket = this;
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/dashboard');
      
      // Simulate invalid/malformed message
      await page.evaluate(() => {
        const ws = (window as any).__mockWebSocket;
        if (ws && ws.onmessage) {
          // Send malformed JSON
          ws.onmessage(new MessageEvent('message', {
            data: '{"invalid": json, malformed}'
          }));
        }
      });

      // Should handle gracefully without crashing
      await expect(page.getByTestId('websocket-status')).toBeVisible();
      
      // Simulate message without required authentication
      await page.evaluate(() => {
        const ws = (window as any).__mockWebSocket;
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'unauthorized_message',
              sensitive_data: 'This should not be processed',
              timestamp: new Date().toISOString()
            })
          }));
        }
      });

      // Should ignore unauthorized messages
      await expect(page.getByText(/unauthorized_message|sensitive_data/i)).not.toBeVisible();
      
      // Should log security warning
      await expect(page.getByText(/security.*warning|unauthorized.*message/i)).toBeVisible();
    });

    test('should monitor WebSocket health and statistics @monitoring', async ({ page }) => {
      // Mock WebSocket stats API
      await page.route('**/ws/stats', async route => {
        await route.fulfill({
          status: 200,
          json: {
            websocket_stats: {
              active_connections: 156,
              uptime_seconds: 172800, // 48 hours
              messages_sent: 12543,
              messages_received: 8972,
              reconnections: 23,
              errors: 2,
              average_latency_ms: 45
            },
            generated_at: new Date().toISOString()
          }
        });
      });

      await page.goto('/admin/websocket-stats');
      
      // Should display WebSocket statistics
      await expect(page.getByText(/156.*active.*connections/i)).toBeVisible();
      await expect(page.getByText(/48.*hours.*uptime/i)).toBeVisible();
      await expect(page.getByText(/12,543.*messages.*sent/i)).toBeVisible();
      await expect(page.getByText(/8,972.*messages.*received/i)).toBeVisible();
      await expect(page.getByText(/45.*ms.*average.*latency/i)).toBeVisible();
      
      // Should show health indicators
      await expect(page.getByText(/healthy|operational/i)).toBeVisible();
      
      // Should warn about high error rate if applicable
      if (await page.getByText(/errors.*2/i).isVisible()) {
        await expect(page.getByText(/monitor.*error.*rate/i)).toBeVisible();
      }
    });
  });
});