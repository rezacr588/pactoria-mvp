/**
 * API Mocking Utilities for E2E Tests
 * Provides lightweight API mocking functionality as a class to match test expectations
 */

import { Page, Route } from '@playwright/test';

/**
 * APIMocker class to handle API mocking in tests
 * Implemented as a class to match test expectations but keeps logic simple
 */
export class APIMocker {
  private page: Page;
  private mockEnabled: boolean = false;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Set up all common API mocks for general test scenarios
   */
  async mockAllEndpoints() {
    this.mockEnabled = true;

    // Mock health check
    await this.page.route('**/api/v1/health', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'healthy' })
      });
    });

    // Mock auth endpoints
    await this.page.route('**/auth/login', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.email && postData?.password) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-jwt-token',
            token_type: 'bearer',
            user: {
              id: 'user-123',
              email: postData.email,
              full_name: 'Test User',
              company_id: 'company-123'
            }
          })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Invalid credentials' })
        });
      }
    });

    // Mock register endpoint
    await this.page.route('**/auth/register', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.email && postData?.password && postData?.full_name) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-jwt-token',
            token_type: 'bearer',
            user: {
              id: 'new-user-123',
              email: postData.email,
              full_name: postData.full_name,
              company_id: 'new-company-123'
            }
          })
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Missing required fields' })
        });
      }
    });

    // Mock contracts list
    await this.page.route('**/contracts', async route => {
      if (route.request().method() === 'GET') {
        const url = new URL(route.request().url());
        const search = url.searchParams.get('search');
        const status = url.searchParams.get('status');
        
        let contracts = [
          {
            id: 'contract-1',
            title: 'Service Agreement - Acme Corp',
            contract_type: 'service_agreement',
            status: 'active',
            client_name: 'Acme Corporation',
            contract_value: 25000,
            currency: 'GBP',
            version: 1,
            is_current_version: true,
            company_id: 'company-123',
            created_by: 'user-123',
            created_at: '2025-01-01T10:00:00Z',
            updated_at: '2025-01-01T10:00:00Z'
          },
          {
            id: 'contract-2',
            title: 'NDA - Tech Startup',
            contract_type: 'nda',
            status: 'draft',
            client_name: 'Tech Startup Ltd',
            contract_value: 0,
            currency: 'GBP',
            version: 1,
            is_current_version: true,
            company_id: 'company-123',
            created_by: 'user-123',
            created_at: '2025-01-02T10:00:00Z',
            updated_at: '2025-01-02T10:00:00Z'
          }
        ];

        // Apply filters
        if (search) {
          contracts = contracts.filter(c => 
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            c.client_name.toLowerCase().includes(search.toLowerCase())
          );
        }
        
        if (status) {
          contracts = contracts.filter(c => c.status === status.toLowerCase());
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            contracts,
            total: contracts.length,
            page: 1,
            size: 10,
            pages: 1
          })
        });
      } else if (route.request().method() === 'POST') {
        // Mock contract creation
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-contract-id',
            ...postData,
            version: 1,
            is_current_version: true,
            company_id: 'company-123',
            created_by: 'user-123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
      } else {
        await route.continue();
      }
    });

    // Mock individual contract
    await this.page.route('**/contracts/*', async route => {
      if (route.request().method() === 'GET' && !route.request().url().includes('?')) {
        const contractId = route.request().url().split('/').pop();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: contractId,
            title: 'Service Agreement - Test',
            contract_type: 'service_agreement',
            status: 'active',
            client_name: 'Test Client',
            client_email: 'client@test.com',
            contract_value: 10000,
            currency: 'GBP',
            start_date: '2025-01-01',
            end_date: '2025-12-31',
            content: 'This is the contract content...',
            compliance_score: 85,
            version: 1,
            is_current_version: true,
            company_id: 'company-123',
            created_by: 'user-123',
            created_at: '2025-01-01T10:00:00Z',
            updated_at: '2025-01-01T10:00:00Z'
          })
        });
      } else if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...postData,
            updated_at: new Date().toISOString()
          })
        });
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 204,
          contentType: 'application/json',
          body: ''
        });
      } else {
        await route.continue();
      }
    });

    // Mock dashboard stats
    await this.page.route('**/dashboard/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_contracts: 42,
          active_contracts: 15,
          pending_contracts: 5,
          compliance_score: 87.5,
          recent_activity: [],
          upcoming_deadlines: []
        })
      });
    });

    // Mock analytics data
    await this.page.route('**/analytics/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          metrics: {
            total: 0,
            trend: 'stable'
          }
        })
      });
    });

    // Mock templates
    await this.page.route('**/templates', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          templates: [
            { id: 'template-1', name: 'Service Agreement', category: 'service' },
            { id: 'template-2', name: 'NDA', category: 'legal' },
            { id: 'template-3', name: 'Employment Contract', category: 'employment' }
          ]
        })
      });
    });
  }

  /**
   * Mock specific authentication success
   */
  async mockAuthSuccess() {
    await this.page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-jwt-token',
          token_type: 'bearer',
          user: {
            id: 'user-123',
            email: 'test@test.com',
            full_name: 'Test User',
            company_id: 'company-123'
          }
        })
      });
    });
  }

  /**
   * Mock authentication failure
   */
  async mockAuthFailure() {
    await this.page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Invalid email or password'
        })
      });
    });
  }

  /**
   * Mock empty contracts list
   */
  async mockEmptyContracts() {
    await this.page.route('**/contracts', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            contracts: [],
            total: 0,
            page: 1,
            size: 10,
            pages: 0
          })
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Mock network error for specific endpoint
   */
  async mockNetworkError(endpoint: string) {
    await this.page.route(`**${endpoint}`, async route => {
      await route.abort('failed');
    });
  }

  /**
   * Clear all mocks
   */
  async clearMocks() {
    this.mockEnabled = false;
    await this.page.unroute('**/*');
  }
}
