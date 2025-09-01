import { Page } from '@playwright/test';
import { MockResponses, API_ENDPOINTS } from './test-data';

export class APIMocker {
  constructor(private page: Page) {}

  async mockAuthEndpoints() {
    // Mock login endpoint
    await this.page.route(`**${API_ENDPOINTS.auth.login}`, async route => {
      const request = route.request();
      const method = request.method();
      
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MockResponses.auth.login)
        });
      } else {
        await route.continue();
      }
    });

    // Mock register endpoint
    await this.page.route(`**${API_ENDPOINTS.auth.register}`, async route => {
      const request = route.request();
      const method = request.method();
      
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MockResponses.auth.login)
        });
      } else {
        await route.continue();
      }
    });

    // Mock current user endpoint
    await this.page.route(`**${API_ENDPOINTS.auth.me}`, async route => {
      const request = route.request();
      const method = request.method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MockResponses.auth.login.user)
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockContractsEndpoints() {
    // Mock contracts list
    await this.page.route(`**${API_ENDPOINTS.contracts.list}`, async route => {
      const request = route.request();
      const method = request.method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MockResponses.contracts.list)
        });
      } else if (method === 'POST') {
        // Mock create contract
        const newContract = {
          ...MockResponses.contracts.list.contracts[0],
          id: 'new-contract-id',
          title: 'New Test Contract',
          status: 'draft'
        };
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newContract)
        });
      } else {
        await route.continue();
      }
    });

    // Mock individual contract endpoints
    await this.page.route(`**/contracts/*`, async route => {
      const request = route.request();
      const method = request.method();
      const url = request.url();
      
      if (method === 'GET' && !url.includes('/generate') && !url.includes('/analyze')) {
        // Get single contract
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...MockResponses.contracts.list.contracts[0],
            generated_content: 'This is a mock generated contract content...',
            final_content: 'This is the final contract content...'
          })
        });
      } else if (method === 'PUT') {
        // Update contract
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...MockResponses.contracts.list.contracts[0],
            title: 'Updated Contract Title'
          })
        });
      } else if (method === 'DELETE') {
        // Delete contract
        await route.fulfill({
          status: 204
        });
      } else if (url.includes('/generate')) {
        // Generate content
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'ai-generation-id',
            model_name: 'gpt-4',
            input_prompt: 'Generate contract content...',
            generated_content: 'This is AI generated contract content...',
            processing_time_ms: 2500,
            confidence_score: 0.92,
            created_at: new Date().toISOString()
          })
        });
      } else if (url.includes('/analyze')) {
        // Analyze compliance
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'compliance-analysis-id',
            contract_id: 'contract-1',
            overall_score: 85.5,
            gdpr_compliance: 90,
            employment_law_compliance: 80,
            consumer_rights_compliance: 85,
            commercial_terms_compliance: 88,
            risk_score: 25,
            risk_factors: ['Missing termination clause', 'Unclear payment terms'],
            recommendations: ['Add clear termination clause', 'Specify payment terms'],
            analysis_date: new Date().toISOString()
          })
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockAnalyticsEndpoints() {
    // Mock dashboard analytics
    await this.page.route(`**${API_ENDPOINTS.analytics.dashboard}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MockResponses.analytics.dashboard)
      });
    });

    // Mock time series data
    await this.page.route(`**/analytics/time-series/*`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metric_name: 'contracts_created',
          period: 'MONTHLY',
          data_points: [
            { date: '2024-01-01', value: 5, count: 5 },
            { date: '2024-02-01', value: 8, count: 8 },
            { date: '2024-03-01', value: 12, count: 12 }
          ],
          total: 25,
          average: 8.33,
          trend_direction: 'up',
          trend_percentage: 33.3
        })
      });
    });
  }

  async mockTemplatesEndpoints() {
    await this.page.route(`**${API_ENDPOINTS.templates.list}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'template-1',
            name: 'Standard Service Agreement',
            category: 'Commercial',
            contract_type: 'service_agreement',
            description: 'A standard template for service agreements',
            template_content: 'SERVICE AGREEMENT\n\nThis agreement...',
            compliance_features: ['GDPR compliant', 'UK law'],
            version: '1.0',
            is_active: true,
            suitable_for: ['Small business', 'Freelancers'],
            created_at: new Date().toISOString()
          }
        ])
      });
    });
  }

  async mockHealthEndpoint() {
    await this.page.route(`**${API_ENDPOINTS.health}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        })
      });
    });
  }

  async mockAllEndpoints() {
    await this.mockHealthEndpoint();
    await this.mockAuthEndpoints();
    await this.mockContractsEndpoints();
    await this.mockAnalyticsEndpoints();
    await this.mockTemplatesEndpoints();
  }

  async mockErrorResponses() {
    // Mock 401 Unauthorized
    await this.page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Invalid credentials'
        })
      });
    });

    // Mock 500 Server Error
    await this.page.route('**/contracts', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Internal server error'
        })
      });
    });
  }
}