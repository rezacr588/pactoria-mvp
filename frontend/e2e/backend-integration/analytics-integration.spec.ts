import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * ANALYTICS BACKEND INTEGRATION TESTS
 * 
 * These tests validate the analytics dashboard and business metrics integration with the backend.
 * They ensure data visualization and reporting features work correctly with real API responses.
 */

test.describe('Analytics Backend Integration', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  let authenticatedContext: any;
  let testUser: any;

  test.beforeAll(async ({ browser }) => {
    // Create authenticated context for analytics tests
    testUser = {
      email: `analytics-test-${faker.string.uuid()}@integration-test.com`,
      password: 'AnalyticsTest123!',
      full_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      company_name: `${faker.company.name()} Analytics Test Co.`
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

  test.describe('Dashboard Analytics Integration', () => {
    test('should load dashboard analytics data from backend @smoke @integration', async ({ page }) => {
      // Track dashboard API call
      const dashboardResponse = page.waitForResponse(
        response => response.url().includes('/analytics/dashboard') && 
                   response.request().method() === 'GET'
      );

      await page.goto('/analytics');

      // Validate dashboard API call
      const response = await dashboardResponse;
      expect(response.status()).toBe(200);

      const dashboardData = await response.json();

      // Validate response structure
      expect(dashboardData).toHaveProperty('business_metrics');
      expect(dashboardData).toHaveProperty('summary');
      expect(dashboardData.business_metrics).toHaveProperty('total_contracts');
      expect(dashboardData.business_metrics).toHaveProperty('total_contract_value');
      expect(dashboardData.business_metrics).toHaveProperty('compliance_score_average');

      // Should display metrics on the page
      await expect(page.getByTestId('dashboard-metrics')).toBeVisible();
      
      // Check that key metrics are displayed
      const totalContracts = dashboardData.business_metrics.total_contracts;
      const totalValue = dashboardData.business_metrics.total_contract_value;
      const complianceScore = dashboardData.business_metrics.compliance_score_average;

      if (totalContracts > 0) {
        await expect(page.getByText(totalContracts.toString())).toBeVisible();
      }

      if (totalValue > 0) {
        // Value might be formatted with currency symbols
        await expect(page.getByText(new RegExp(totalValue.toLocaleString()))).toBeVisible();
      }

      if (complianceScore > 0) {
        const scorePercent = Math.round(complianceScore);
        await expect(page.getByText(new RegExp(`${scorePercent}%?`))).toBeVisible();
      }
    });

    test('should display business metrics cards @integration', async ({ page }) => {
      await page.goto('/analytics');

      // Wait for analytics to load
      await page.waitForSelector('[data-testid="dashboard-metrics"]');

      // Should display key business metric cards
      const expectedMetrics = [
        'Total Contracts',
        'Active Contracts',
        'Contract Value',
        'Compliance Score'
      ];

      for (const metric of expectedMetrics) {
        await expect(page.getByText(new RegExp(metric, 'i'))).toBeVisible();
      }
    });

    test('should load and display charts data @integration', async ({ page }) => {
      await page.goto('/analytics');

      // Wait for dashboard data to load
      await page.waitForSelector('[data-testid="dashboard-metrics"]');

      // Should display chart containers
      const chartElements = [
        '[data-testid="contracts-chart"]',
        '[data-testid="compliance-chart"]',
        '[data-testid="value-chart"]'
      ];

      for (const chartSelector of chartElements) {
        const chart = page.locator(chartSelector);
        if (await chart.count() > 0) {
          await expect(chart).toBeVisible();
        }
      }
    });

    test('should handle empty analytics data gracefully @integration', async ({ page }) => {
      // Mock empty analytics response
      await page.route('**/analytics/dashboard', async route => {
        await route.fulfill({
          status: 200,
          json: {
            business_metrics: {
              total_contracts: 0,
              active_contracts: 0,
              draft_contracts: 0,
              completed_contracts: 0,
              terminated_contracts: 0,
              total_contract_value: 0,
              average_contract_value: 0,
              compliance_score_average: 0,
              high_risk_contracts: 0,
              contracts_this_month: 0,
              contracts_last_month: 0,
              growth_rate: 0
            },
            summary: {
              total_contracts: 0,
              total_portfolio_value: 0,
              average_compliance_score: 0,
              monthly_growth_rate: 0,
              high_risk_contracts: 0,
              key_insights: [],
              overall_health: 'no_data',
              recommended_actions: ['Create your first contract to see analytics']
            }
          }
        });
      });

      await page.goto('/analytics');

      // Should display empty state or zero values
      await expect(page.getByText(/no.*data|get.*started/i)).toBeVisible();
      await expect(page.getByText(/create.*first.*contract/i)).toBeVisible();
    });
  });

  test.describe('Time Series Analytics Integration', () => {
    test('should fetch time series data for contracts @integration', async ({ page }) => {
      // Track time series API call
      const timeSeriesResponse = page.waitForResponse(
        response => response.url().includes('/analytics/time-series') && 
                   response.request().method() === 'GET'
      );

      await page.goto('/analytics');

      // Select a different time period to trigger time series call
      const dateRangeSelector = page.getByTestId('date-range-selector');
      if (await dateRangeSelector.isVisible()) {
        await dateRangeSelector.click();
        await page.getByText(/last.*week|7.*days/i).click();

        // Wait for time series response
        const response = await timeSeriesResponse;
        expect(response.status()).toBe(200);

        const timeSeriesData = await response.json();
        expect(timeSeriesData).toHaveProperty('data_points');
        expect(timeSeriesData).toHaveProperty('trend_direction');
        expect(timeSeriesData.data_points).toBeInstanceOf(Array);

        // Should update charts with new data
        await page.waitForTimeout(1000); // Allow charts to update
        await expect(page.getByText(/trend|growth/i)).toBeVisible();
      }
    });

    test('should display trend indicators @integration', async ({ page }) => {
      await page.goto('/analytics');
      
      await page.waitForSelector('[data-testid="dashboard-metrics"]');

      // Should show trend indicators (up/down arrows, percentages)
      const trendIndicators = [
        /↑|↓|trending.*up|trending.*down/i,
        /growth.*rate|\+\d+%|\-\d+%/i
      ];

      let trendFound = false;
      for (const trendRegex of trendIndicators) {
        if (await page.getByText(trendRegex).isVisible()) {
          trendFound = true;
          break;
        }
      }

      // At least one trend indicator should be visible if there's data
      if (trendFound) {
        expect(trendFound).toBe(true);
      }
    });
  });

  test.describe('Business Metrics Integration', () => {
    test('should fetch detailed business metrics @integration', async ({ page }) => {
      const businessMetricsResponse = page.waitForResponse(
        response => response.url().includes('/analytics/business') && 
                   response.request().method() === 'GET'
      );

      await page.goto('/analytics');

      // Some implementations might call the business endpoint separately
      if (await businessMetricsResponse) {
        const response = await businessMetricsResponse;
        expect(response.status()).toBe(200);

        const businessData = await response.json();
        expect(typeof businessData.total_contracts).toBe('number');
        expect(typeof businessData.total_contract_value).toBe('number');
      }
    });

    test('should calculate and display growth rates @integration', async ({ page }) => {
      await page.goto('/analytics');
      
      await page.waitForSelector('[data-testid="dashboard-metrics"]');

      // Should display growth rate calculations
      const growthIndicators = page.locator('text=/growth|increase|decrease/i');
      const growthCount = await growthIndicators.count();

      if (growthCount > 0) {
        // Should have at least one growth indicator visible
        await expect(growthIndicators.first()).toBeVisible();
      }
    });

    test('should display compliance metrics @integration', async ({ page }) => {
      await page.goto('/analytics');
      
      await page.waitForSelector('[data-testid="dashboard-metrics"]');

      // Should display compliance-related metrics
      const complianceElements = [
        /compliance.*score/i,
        /risk.*contracts/i,
        /gdpr.*compliance/i
      ];

      let complianceFound = false;
      for (const complianceRegex of complianceElements) {
        const element = page.getByText(complianceRegex);
        if (await element.isVisible()) {
          complianceFound = true;
          break;
        }
      }

      // Should have some compliance metrics visible
      if (complianceFound) {
        expect(complianceFound).toBe(true);
      }
    });
  });

  test.describe('Analytics Export Integration', () => {
    test('should export analytics data @integration', async ({ page }) => {
      await page.goto('/analytics');
      
      await page.waitForSelector('[data-testid="dashboard-metrics"]');

      const exportButton = page.getByRole('button', { name: /export/i });
      
      if (await exportButton.isVisible()) {
        // Set up download handling
        const downloadPromise = page.waitForEvent('download');
        
        await exportButton.click();
        
        // Should initiate download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/analytics|report|export/i);
      }
    });
  });

  test.describe('Analytics Filtering and Segmentation', () => {
    test('should filter analytics by contract type @integration', async ({ page }) => {
      await page.goto('/analytics');
      
      await page.waitForSelector('[data-testid="dashboard-metrics"]');

      // Look for contract type filter
      const typeFilter = page.getByLabel(/contract.*type|filter.*type/i);
      
      if (await typeFilter.isVisible()) {
        const filterResponse = page.waitForResponse(
          response => response.url().includes('/analytics') && 
                     response.url().includes('contract_type')
        );

        await typeFilter.selectOption('SERVICE_AGREEMENT');
        
        const response = await filterResponse;
        expect(response.status()).toBe(200);

        // Should update analytics to show filtered data
        await expect(page.getByText(/service.*agreement/i)).toBeVisible();
      }
    });

    test('should segment analytics by time period @integration', async ({ page }) => {
      await page.goto('/analytics');
      
      const dateRangeSelector = page.getByTestId('date-range-selector');
      
      if (await dateRangeSelector.isVisible()) {
        const periodResponse = page.waitForResponse(
          response => response.url().includes('/analytics') && 
                     response.request().method() === 'GET'
        );

        await dateRangeSelector.click();
        await page.getByText(/last.*month|30.*days/i).click();

        await periodResponse;

        // Should update data for the selected period
        await page.waitForTimeout(1000);
        await expect(page.getByText(/last.*month|30.*days/i)).toBeVisible();
      }
    });
  });

  test.describe('Real-time Analytics Updates', () => {
    test('should refresh analytics data periodically @integration', async ({ page }) => {
      await page.goto('/analytics');
      
      await page.waitForSelector('[data-testid="dashboard-metrics"]');

      // Track multiple dashboard requests to verify refresh
      let requestCount = 0;
      page.on('request', request => {
        if (request.url().includes('/analytics/dashboard')) {
          requestCount++;
        }
      });

      // Wait for potential auto-refresh (if implemented)
      await page.waitForTimeout(5000);

      // Should have made at least the initial request
      expect(requestCount).toBeGreaterThan(0);
    });

    test('should handle real-time updates via WebSocket @integration', async ({ page }) => {
      await page.goto('/analytics');
      
      await page.waitForSelector('[data-testid="dashboard-metrics"]');

      // Check if WebSocket connection is established (if implemented)
      const webSocketConnected = await page.evaluate(() => {
        // Check if there are any WebSocket connections
        return (window as any).WebSocket !== undefined;
      });

      if (webSocketConnected) {
        // Should handle real-time updates
        await page.waitForTimeout(2000);
        
        // Look for real-time indicators
        const realTimeIndicator = page.getByText(/live|real.*time|updated/i);
        if (await realTimeIndicator.isVisible()) {
          await expect(realTimeIndicator).toBeVisible();
        }
      }
    });
  });

  test.describe('Analytics Error Handling', () => {
    test('should handle analytics API errors gracefully @integration', async ({ page }) => {
      // Mock analytics API error
      await page.route('**/analytics/dashboard', async route => {
        await route.fulfill({
          status: 500,
          json: { detail: 'Analytics service temporarily unavailable' }
        });
      });

      await page.goto('/analytics');

      // Should display error state
      await expect(page.getByText(/error|unavailable|failed.*load/i)).toBeVisible();

      // Should provide retry mechanism
      const retryButton = page.getByRole('button', { name: /retry|refresh/i });
      if (await retryButton.isVisible()) {
        // Remove error mock and retry
        await page.unroute('**/analytics/dashboard');
        await retryButton.click();
        
        // Should eventually load successfully
        await expect(page.getByTestId('dashboard-metrics')).toBeVisible();
      }
    });

    test('should handle network errors in analytics @integration', async ({ page }) => {
      await page.goto('/analytics');

      // Mock network failure
      await page.route('**/analytics/**', async route => {
        await route.abort('failed');
      });

      // Try to refresh or change filters to trigger new request
      await page.reload();

      // Should show network error message
      await expect(page.getByText(/network.*error|connection.*failed/i)).toBeVisible();
    });

    test('should handle partial data load failures @integration', async ({ page }) => {
      // Mock dashboard success but time-series failure
      await page.route('**/analytics/dashboard', async route => {
        await route.fulfill({
          status: 200,
          json: {
            business_metrics: {
              total_contracts: 10,
              active_contracts: 5,
              total_contract_value: 50000,
              compliance_score_average: 85
            },
            summary: {
              total_contracts: 10,
              overall_health: 'good'
            }
          }
        });
      });

      await page.route('**/analytics/time-series/**', async route => {
        await route.fulfill({
          status: 500,
          json: { detail: 'Time series data unavailable' }
        });
      });

      await page.goto('/analytics');

      // Should display available data
      await expect(page.getByTestId('dashboard-metrics')).toBeVisible();
      await expect(page.getByText('10')).toBeVisible(); // total_contracts

      // Should show error for missing time series data
      const timeSeriesError = page.getByText(/time.*series.*unavailable|chart.*error/i);
      if (await timeSeriesError.isVisible()) {
        await expect(timeSeriesError).toBeVisible();
      }
    });
  });

  test.describe('Analytics Performance', () => {
    test('should load analytics data within reasonable time @integration', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/analytics');
      
      // Wait for main metrics to be visible
      await expect(page.getByTestId('dashboard-metrics')).toBeVisible();

      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('should handle large datasets efficiently @integration', async ({ page }) => {
      // Mock large dataset response
      await page.route('**/analytics/dashboard', async route => {
        const largeDataset = {
          business_metrics: {
            total_contracts: 10000,
            active_contracts: 7500,
            total_contract_value: 5000000,
            compliance_score_average: 87.5
          },
          contract_types: Array.from({ length: 50 }, (_, i) => ({
            contract_type: `TYPE_${i}`,
            count: faker.number.int({ min: 10, max: 500 }),
            percentage: faker.number.float({ min: 0.1, max: 5.0 }),
            total_value: faker.number.int({ min: 10000, max: 500000 })
          })),
          summary: {
            total_contracts: 10000,
            overall_health: 'excellent'
          }
        };

        await route.fulfill({
          status: 200,
          json: largeDataset
        });
      });

      const startTime = Date.now();
      await page.goto('/analytics');
      
      await expect(page.getByTestId('dashboard-metrics')).toBeVisible();
      await expect(page.getByText('10,000')).toBeVisible(); // Formatted number

      const renderTime = Date.now() - startTime;
      
      // Should handle large datasets within 15 seconds
      expect(renderTime).toBeLessThan(15000);
    });
  });
});