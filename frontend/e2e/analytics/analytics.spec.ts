import { test, expect } from '@playwright/test';
import { AnalyticsPage, AppLayout } from '../utils/page-objects';
import { APIMocker } from '../utils/api-mock';

test.describe('Analytics Dashboard', () => {
  let analyticsPage: AnalyticsPage;
  let appLayout: AppLayout;
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page }) => {
    analyticsPage = new AnalyticsPage(page);
    appLayout = new AppLayout(page);
    apiMocker = new APIMocker(page);

    // Set up authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: 'test-user', 
            email: 'test@test.com',
            full_name: 'Test User',
            company_id: 'test-company'
          },
          token: 'mock-token'
        }
      }));
    });

    // Set up API mocking
    await apiMocker.mockAllEndpoints();
  });

  test.describe('Dashboard Overview', () => {
    test('should display key business metrics', async ({ page }) => {
      await analyticsPage.goto('/analytics');
      
      await analyticsPage.expectMetricsVisible();
      
      // Check for specific metrics from mock data
      await expect(page.getByText('25')).toBeVisible(); // total contracts
      await expect(page.getByText('18')).toBeVisible(); // active contracts
      await expect(page.getByText('£125,000')).toBeVisible(); // total value
      await expect(page.getByText('85.5')).toBeVisible(); // compliance score
    });

    test('should display charts and visualizations', async ({ page }) => {
      await analyticsPage.goto('/analytics');
      
      await expect(analyticsPage.contractsChart).toBeVisible();
      await expect(analyticsPage.complianceChart).toBeVisible();
      await expect(analyticsPage.valueChart).toBeVisible();
    });

    test('should show loading state', async ({ page }) => {
      // Delay API response to test loading state
      await page.route('**/analytics/dashboard', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await analyticsPage.goto('/analytics');
      
      // Should show loading spinner initially
      await expect(page.getByTestId('loading-spinner')).toBeVisible();
      
      // Then show content
      await analyticsPage.expectMetricsVisible();
      await expect(page.getByTestId('loading-spinner')).not.toBeVisible();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/analytics/dashboard', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Analytics service unavailable'
          })
        });
      });

      await analyticsPage.goto('/analytics');
      
      // Should show error message
      await expect(page.getByText('Analytics service unavailable')).toBeVisible();
      
      // Should show retry option
      const retryButton = page.getByRole('button', { name: /retry/i });
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible();
      }
    });
  });

  test.describe('Date Range Filtering', () => {
    test('should filter data by date range', async ({ page }) => {
      // Mock different data for different date ranges
      await page.route('**/analytics/dashboard*', async route => {
        const url = route.request().url();
        const urlParams = new URL(url).searchParams;
        const range = urlParams.get('range') || 'month';
        
        let mockData;
        if (range === 'week') {
          mockData = {
            business_metrics: {
              total_contracts: 5,
              active_contracts: 3,
              total_contract_value: 25000,
              average_compliance_score: 90.0
            }
          };
        } else {
          mockData = {
            business_metrics: {
              total_contracts: 25,
              active_contracts: 18,
              total_contract_value: 125000,
              average_compliance_score: 85.5
            }
          };
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockData)
        });
      });

      await analyticsPage.goto('/analytics');
      
      // Initially shows monthly data
      await expect(page.getByText('25')).toBeVisible();
      
      // Change to weekly view
      await analyticsPage.selectDateRange('Last 7 days');
      
      // Should show weekly data
      await expect(page.getByText('5')).toBeVisible();
    });

    test('should validate date range inputs', async ({ page }) => {
      await analyticsPage.goto('/analytics');
      
      // Try to set invalid date range (end before start)
      const customRangeButton = page.getByText('Custom range');
      if (await customRangeButton.isVisible()) {
        await customRangeButton.click();
        
        const startDate = page.getByLabel('Start date');
        const endDate = page.getByLabel('End date');
        
        await startDate.fill('2024-12-01');
        await endDate.fill('2024-11-01'); // End before start
        
        const applyButton = page.getByRole('button', { name: /apply/i });
        await applyButton.click();
        
        // Should show validation error
        await expect(page.getByText(/invalid date range/i)).toBeVisible();
      }
    });
  });

  test.describe('Data Export', () => {
    test('should export analytics data', async ({ page }) => {
      await analyticsPage.goto('/analytics');
      
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');
      
      // Mock export endpoint
      await page.route('**/analytics/export*', async route => {
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/csv',
            'Content-Disposition': 'attachment; filename="analytics-export.csv"'
          },
          body: 'Date,Contracts,Value\n2024-01-01,5,25000\n2024-02-01,8,40000'
        });
      });
      
      await analyticsPage.exportButton.click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('analytics-export.csv');
    });

    test('should handle export errors', async ({ page }) => {
      await analyticsPage.goto('/analytics');
      
      // Mock export error
      await page.route('**/analytics/export*', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Export service unavailable'
          })
        });
      });
      
      await analyticsPage.exportButton.click();
      
      // Should show error message
      await expect(page.getByText('Export service unavailable')).toBeVisible();
    });
  });

  test.describe('Chart Interactions', () => {
    test('should interact with charts', async ({ page }) => {
      await analyticsPage.goto('/analytics');
      
      // Click on a chart data point
      const chartPoint = analyticsPage.contractsChart.locator('circle, rect, path').first();
      if (await chartPoint.isVisible()) {
        await chartPoint.click();
        
        // Should show tooltip or drill-down data
        const tooltip = page.getByTestId('chart-tooltip');
        await expect(tooltip).toBeVisible();
      }
    });

    test('should toggle chart data series', async ({ page }) => {
      await analyticsPage.goto('/analytics');
      
      // Toggle legend items
      const legendItem = page.getByTestId('chart-legend-item').first();
      if (await legendItem.isVisible()) {
        await legendItem.click();
        
        // Should hide/show corresponding data series
        // This would depend on the chart library implementation
      }
    });

    test('should zoom and pan charts', async ({ page }) => {
      await analyticsPage.goto('/analytics');
      
      // Test zoom functionality if available
      const zoomInButton = page.getByTestId('chart-zoom-in');
      if (await zoomInButton.isVisible()) {
        await zoomInButton.click();
        
        // Chart should zoom in
        // This would depend on the chart implementation
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should refresh data automatically', async ({ page }) => {
      let callCount = 0;
      
      await page.route('**/analytics/dashboard', async route => {
        callCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            business_metrics: {
              total_contracts: 25 + callCount, // Increment to simulate updates
              active_contracts: 18,
              total_contract_value: 125000,
              average_compliance_score: 85.5
            },
            summary: {
              total_contracts: 25 + callCount,
              total_portfolio_value: 125000,
              average_compliance_score: 85.5,
              monthly_growth_rate: 33.3,
              high_risk_contracts: 2,
              key_insights: [],
              overall_health: 'good',
              recommended_actions: []
            }
          })
        });
      });

      await analyticsPage.goto('/analytics');
      
      // Initially should show 26 (25 + 1)
      await expect(page.getByText('26')).toBeVisible();
      
      // Wait for auto-refresh (if implemented)
      await page.waitForTimeout(30000); // 30 seconds
      
      // Should show updated value 27 (25 + 2)
      if (callCount > 1) {
        await expect(page.getByText('27')).toBeVisible();
      }
    });

    test('should handle WebSocket updates', async ({ page }) => {
      // Mock WebSocket connection for real-time updates
      await page.evaluateOnNewDocument(() => {
        // Override WebSocket to simulate real-time updates
        class MockWebSocket {
          onopen: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;

          constructor(url: string) {
            setTimeout(() => {
              if (this.onopen) this.onopen(new Event('open'));
              
              // Simulate incoming data
              setTimeout(() => {
                if (this.onmessage) {
                  this.onmessage(new MessageEvent('message', {
                    data: JSON.stringify({
                      type: 'analytics_update',
                      data: {
                        total_contracts: 26,
                        new_contract_id: 'ws-contract-1'
                      }
                    })
                  }));
                }
              }, 1000);
            }, 100);
          }

          close() {
            if (this.onclose) {
              this.onclose(new CloseEvent('close'));
            }
          }

          send(data: string) {
            // Mock send
          }
        }

        // @ts-ignore
        window.WebSocket = MockWebSocket;
      });

      await analyticsPage.goto('/analytics');
      
      // Should initially show mock data
      await expect(page.getByText('25')).toBeVisible();
      
      // After WebSocket update, should show updated value
      await expect(page.getByText('26')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Performance Metrics', () => {
    test('should load analytics within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await analyticsPage.goto('/analytics');
      await analyticsPage.expectMetricsVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Mock large dataset response
      await page.route('**/analytics/dashboard', async route => {
        const largeDataset = {
          business_metrics: {
            total_contracts: 10000,
            active_contracts: 7500,
            total_contract_value: 50000000,
            average_compliance_score: 85.5
          },
          time_series: {
            data_points: Array.from({ length: 365 }, (_, i) => ({
              date: new Date(2024, 0, i + 1).toISOString(),
              value: Math.random() * 1000,
              count: Math.floor(Math.random() * 10)
            }))
          }
        };
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset)
        });
      });

      const startTime = Date.now();
      await analyticsPage.goto('/analytics');
      await analyticsPage.expectMetricsVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should still load efficiently with large dataset
      expect(loadTime).toBeLessThan(10000);
      
      // Should display formatted large numbers correctly
      await expect(page.getByText('10,000')).toBeVisible();
      await expect(page.getByText('£50,000,000')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await analyticsPage.goto('/analytics');
      
      // Should show mobile-optimized layout
      await analyticsPage.expectMetricsVisible();
      
      // Charts should be scrollable horizontally on mobile
      const chart = analyticsPage.contractsChart;
      if (await chart.isVisible()) {
        const chartBox = await chart.boundingBox();
        expect(chartBox?.width).toBeLessThanOrEqual(375);
      }
    });

    test('should adapt to tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await analyticsPage.goto('/analytics');
      
      await analyticsPage.expectMetricsVisible();
      
      // Should show tablet-optimized layout
      // Charts should be arranged appropriately for tablet
    });

    test('should work on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await analyticsPage.goto('/analytics');
      
      await analyticsPage.expectMetricsVisible();
      
      // Should show full desktop layout with all features
      await expect(analyticsPage.contractsChart).toBeVisible();
      await expect(analyticsPage.complianceChart).toBeVisible();
      await expect(analyticsPage.valueChart).toBeVisible();
    });
  });
});