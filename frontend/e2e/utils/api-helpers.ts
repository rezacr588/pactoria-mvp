import { Page } from '@playwright/test';
import { TestUserData, TestContractData } from './test-data';

// Setup mock API responses for successful scenarios
export async function setupMockAPI(page: Page) {
  // Mock authentication endpoints
  await page.route('**/api/auth/login', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-jwt-token',
        token_type: 'Bearer',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          company_name: 'Test Company',
          role: 'admin'
        }
      })
    });
  });

  await page.route('**/api/auth/register', route => {
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-jwt-token',
        token_type: 'Bearer',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          company_name: 'Test Company',
          role: 'user'
        }
      })
    });
  });

  // Mock user profile endpoint
  await page.route('**/api/users/me', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        company_name: 'Test Company',
        role: 'admin'
      })
    });
  });

  // Mock contracts endpoints
  await page.route('**/api/contracts', route => {
    if (route.request().method() === 'POST') {
      // Create contract
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'contract-123',
          title: 'New Contract',
          description: 'Contract description',
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
    } else {
      // List contracts
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'contract-1',
              title: 'Sample Contract 1',
              description: 'First sample contract',
              status: 'active',
              type: 'service',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-15T10:00:00Z'
            },
            {
              id: 'contract-2',
              title: 'Sample Contract 2',
              description: 'Second sample contract',
              status: 'draft',
              type: 'product',
              created_at: '2024-01-14T10:00:00Z',
              updated_at: '2024-01-14T10:00:00Z'
            },
            {
              id: 'contract-3',
              title: 'Sample Contract 3',
              description: 'Third sample contract',
              status: 'completed',
              type: 'service',
              created_at: '2024-01-13T10:00:00Z',
              updated_at: '2024-01-13T10:00:00Z'
            }
          ],
          total: 3,
          page: 1,
          pages: 1
        })
      });
    }
  });

  // Mock individual contract endpoint
  await page.route('**/api/contracts/*', route => {
    const contractId = route.request().url().split('/').pop();
    
    if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      // Update contract
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: contractId,
          title: 'Updated Contract',
          description: 'Updated description',
          status: 'active',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: new Date().toISOString()
        })
      });
    } else if (route.request().method() === 'DELETE') {
      // Delete contract
      route.fulfill({
        status: 204,
        body: ''
      });
    } else {
      // Get contract
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: contractId,
          title: 'Sample Contract',
          description: 'Sample contract description',
          content: 'This is the contract content with detailed terms and conditions.',
          status: 'active',
          type: 'service',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          parties: [
            { name: 'Company A', role: 'client' },
            { name: 'Company B', role: 'provider' }
          ]
        })
      });
    }
  });

  // Mock templates endpoints
  await page.route('**/api/templates', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'template-1',
            name: 'Service Agreement Template',
            description: 'Standard service agreement template',
            category: 'service',
            content: 'Template content for service agreements'
          },
          {
            id: 'template-2',
            name: 'NDA Template',
            description: 'Non-disclosure agreement template',
            category: 'legal',
            content: 'Template content for NDAs'
          }
        ]
      })
    });
  });

  // Mock analytics endpoints
  await page.route('**/api/analytics/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        metrics: {
          totalContracts: 150,
          activeContracts: 75,
          completedContracts: 60,
          draftContracts: 15
        },
        chartData: [
          { date: '2024-01-01', value: 10 },
          { date: '2024-01-02', value: 15 },
          { date: '2024-01-03', value: 12 },
          { date: '2024-01-04', value: 18 },
          { date: '2024-01-05', value: 20 }
        ]
      })
    });
  });

  // Mock team endpoints
  await page.route('**/api/team/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'member-1',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'admin',
            status: 'active'
          },
          {
            id: 'member-2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'editor',
            status: 'active'
          }
        ]
      })
    });
  });

  // Mock integrations endpoints
  await page.route('**/api/integrations/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'integration-1',
            name: 'Slack',
            description: 'Team collaboration platform',
            status: 'connected',
            icon: 'slack-icon.png'
          },
          {
            id: 'integration-2',
            name: 'Google Drive',
            description: 'File storage and sharing',
            status: 'available',
            icon: 'gdrive-icon.png'
          }
        ]
      })
    });
  });

  // Mock audit trail endpoints
  await page.route('**/api/audit/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'audit-1',
            event: 'contract_created',
            user: 'John Doe',
            timestamp: '2024-01-15T10:00:00Z',
            details: 'Created contract "Sample Contract"'
          },
          {
            id: 'audit-2',
            event: 'contract_updated',
            user: 'Jane Smith',
            timestamp: '2024-01-14T15:30:00Z',
            details: 'Updated contract status to active'
          }
        ]
      })
    });
  });

  // Mock notifications endpoints
  await page.route('**/api/notifications/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'notif-1',
            title: 'Contract Approval Required',
            message: 'Contract "Sample Contract" needs your approval',
            type: 'info',
            read: false,
            created_at: '2024-01-15T09:00:00Z'
          },
          {
            id: 'notif-2',
            title: 'Contract Signed',
            message: 'Contract "Another Contract" has been signed',
            type: 'success',
            read: true,
            created_at: '2024-01-14T16:00:00Z'
          }
        ],
        unreadCount: 1
      })
    });
  });

  // Mock settings endpoints
  await page.route('**/api/settings/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        notifications: {
          emailNotifications: true,
          pushNotifications: false,
          weeklyReports: true
        },
        preferences: {
          theme: 'light',
          timezone: 'UTC',
          language: 'en'
        }
      })
    });
  });

  // Mock help/support endpoints
  await page.route('**/api/help/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        faq: [
          {
            id: 'faq-1',
            question: 'How do I create a contract?',
            answer: 'Navigate to the contracts page and click "Create New Contract"'
          },
          {
            id: 'faq-2',
            question: 'How do I invite team members?',
            answer: 'Go to the team page and click "Invite Member"'
          }
        ],
        articles: [
          {
            id: 'article-1',
            title: 'Getting Started Guide',
            content: 'Complete guide to getting started with Pactoria'
          }
        ]
      })
    });
  });
}

// Setup mock API responses for error scenarios
export async function setupMockAPIWithErrors(page: Page) {
  // Mock authentication failures
  await page.route('**/api/auth/login', route => {
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: 'Invalid credentials'
      })
    });
  });

  await page.route('**/api/auth/register', route => {
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: 'Email already registered'
      })
    });
  });

  // Mock server errors for other endpoints
  await page.route('**/api/**', route => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: 'Internal server error'
      })
    });
  });
}

// Wait for specific API calls
export async function waitForAPICall(page: Page, urlPattern: string) {
  return page.waitForRequest(request => {
    return request.url().includes(urlPattern);
  });
}

// Mock file upload responses
export async function mockFileUpload(page: Page, endpoint: string, response: any) {
  await page.route(endpoint, route => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    } else {
      route.continue();
    }
  });
}

// Setup WebSocket mock
export async function setupMockWebSocket(page: Page) {
  await page.addInitScript(() => {
    class MockWebSocket {
      url: string;
      readyState: number = 1; // OPEN
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(url: string) {
        this.url = url;
        setTimeout(() => {
          if (this.onopen) {
            this.onopen(new Event('open'));
          }
        }, 100);
      }

      send(data: string) {
        // Echo back message for testing
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data }));
          }
        }, 50);
      }

      close() {
        this.readyState = 3; // CLOSED
        if (this.onclose) {
          this.onclose(new CloseEvent('close'));
        }
      }
    }

    (window as any).WebSocket = MockWebSocket;
  });
}

// Mock geolocation API
export async function mockGeolocation(page: Page, coords = { latitude: 37.7749, longitude: -122.4194 }) {
  await page.addInitScript((coords) => {
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (success: (pos: any) => void) => {
          success({
            coords: coords,
            timestamp: Date.now()
          });
        },
        watchPosition: (success: (pos: any) => void) => {
          success({
            coords: coords,
            timestamp: Date.now()
          });
          return 1; // watch ID
        },
        clearWatch: () => {}
      }
    });
  }, coords);
}

// Mock browser notifications
export async function mockNotifications(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Notification', {
      value: class MockNotification {
        static permission = 'granted';
        static requestPermission = () => Promise.resolve('granted');
        
        constructor(title: string, options?: NotificationOptions) {
          console.log(`Mock notification: ${title}`, options);
        }
        
        close() {}
      }
    });
  });
}

// Setup performance monitoring
export async function setupPerformanceMonitoring(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const end = performance.now();
        console.log(`API call to ${args[0]} took ${end - start}ms`);
        return response;
      } catch (error) {
        const end = performance.now();
        console.log(`API call to ${args[0]} failed after ${end - start}ms`, error);
        throw error;
      }
    };
  });
}

// Clear all mocks
export async function clearAllMocks(page: Page) {
  await page.unroute('**/*');
}