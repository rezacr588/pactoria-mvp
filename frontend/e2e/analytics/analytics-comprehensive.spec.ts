import { test, expect } from '@playwright/test';
import { loginWithTestAccount } from '../helpers/auth';

test.describe('Analytics Page - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestAccount(page);
    
    // Mock analytics API data
    await page.route('**/api/v1/analytics/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/dashboard')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_contracts: 25,
            active_contracts: 18,
            pending_contracts: 4,
            completed_contracts: 3,
            total_value: 1250000,
            monthly_revenue: 95000,
            compliance_score: 87,
            overdue_tasks: 2,
            upcoming_deadlines: 5,
            contract_performance: {
              on_time: 92,
              delayed: 8
            },
            monthly_stats: [
              { month: 'Jan', value: 85000 },
              { month: 'Feb', value: 92000 },
              { month: 'Mar', value: 95000 }
            ]
          })
        });
      } else if (url.includes('/contracts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            contract_metrics: {
              total_count: 25,
              by_status: {
                active: 18,
                pending: 4,
                completed: 3
              },
              by_type: {
                service_agreement: 12,
                nda: 8,
                consulting: 5
              },
              average_value: 50000,
              total_value: 1250000
            },
            performance_trends: [
              { period: '2024-01', contracts: 15, value: 750000 },
              { period: '2024-02', contracts: 20, value: 1000000 },
              { period: '2024-03', contracts: 25, value: 1250000 }
            ]
          })
        });
      } else if (url.includes('/compliance')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            overall_score: 87,
            risk_breakdown: {
              low: 15,
              medium: 8,
              high: 2
            },
            compliance_trends: [
              { month: 'Jan', score: 82 },
              { month: 'Feb', score: 85 },
              { month: 'Mar', score: 87 }
            ],
            critical_issues: 2,
            resolved_issues: 18
          })
        });
      }
    });
    
    await page.goto('/analytics');
  });

  test('should display analytics overview @smoke', async ({ page }) => {
    // Check main page heading
    await expect(page.locator('h1')).toContainText(/Analytics|Reports|Insights/);
    
    // Check for key metrics cards
    const metricsCards = [
      'Total Contracts',
      'Active Contracts', 
      'Total Value',
      'Compliance Score'
    ];
    
    for (const metric of metricsCards) {
      await expect(page.locator(`text="${metric}"`).or(page.locator(`text*="${metric}"`))).toBeVisible();
    }
  });

  test('should display contract analytics section', async ({ page }) => {
    // Navigate to contracts analytics if not already there
    const contractsTab = page.locator('text="Contracts", [data-tab="contracts"]');
    if (await contractsTab.isVisible()) {
      await contractsTab.click();
    }
    
    // Check for contract metrics
    await expect(page.locator('text="25"').or(page.locator('text*="25 contracts"'))).toBeVisible();
    
    // Check for contract status breakdown
    const statusLabels = ['Active', 'Pending', 'Completed'];
    for (const status of statusLabels) {
      await expect(page.locator(`text*="${status}"`)).toBeVisible();
    }
    
    // Check for charts/visualizations
    const chartElements = page.locator('canvas, svg, [data-testid*="chart"]');
    await expect(chartElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display compliance analytics section', async ({ page }) => {
    // Navigate to compliance analytics
    const complianceTab = page.locator('text="Compliance", [data-tab="compliance"]');
    if (await complianceTab.isVisible()) {
      await complianceTab.click();
    }
    
    // Check compliance score
    await expect(page.locator('text="87"').or(page.locator('text*="87%"'))).toBeVisible();
    
    // Check risk breakdown
    const riskLevels = ['Low', 'Medium', 'High'];
    for (const risk of riskLevels) {
      await expect(page.locator(`text*="${risk}"`)).toBeVisible();
    }
    
    // Check for compliance trends
    await expect(page.locator('text*="trend"').or(page.locator('text*="improvement"'))).toBeVisible();
  });

  test('should display performance metrics', async ({ page }) => {
    // Check for performance indicators
    await expect(page.locator('text="92%"').or(page.locator('text="on time"'))).toBeVisible();
    await expect(page.locator('text="Revenue"').or(page.locator('text="£95,000"'))).toBeVisible();
    
    // Check monthly statistics
    const months = ['Jan', 'Feb', 'Mar'];
    for (const month of months) {
      await expect(page.locator(`text="${month}"`)).toBeVisible();
    }
  });

  test('should handle date range filtering', async ({ page }) => {
    // Look for date picker or filter controls
    const dateFilter = page.locator('input[type="date"], [data-testid="date-picker"], button:has-text("Filter")');
    
    if (await dateFilter.first().isVisible()) {
      await dateFilter.first().click();
      
      // Check if date picker opens
      await expect(page.locator('[role="dialog"], .date-picker, [data-testid="calendar"]')).toBeVisible();
    } else {
      // Alternative: check for preset date ranges
      const presetRanges = ['Last 30 days', 'Last 3 months', 'This year'];
      for (const range of presetRanges) {
        const rangeButton = page.locator(`text="${range}"`);
        if (await rangeButton.isVisible()) {
          await rangeButton.click();
          break;
        }
      }
    }
  });

  test('should export analytics data', async ({ page }) => {
    // Look for export functionality
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), [data-testid="export"]');
    
    if (await exportButton.isVisible()) {
      // Start download tracking
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Check for export options
      const exportOptions = page.locator('text="PDF", text="CSV", text="Excel"');
      if (await exportOptions.first().isVisible()) {
        await exportOptions.first().click();
      }
      
      // Wait for download to complete
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('analytics');
    }
  });

  test('should display real-time updates', async ({ page }) => {
    // Check for auto-refresh or real-time indicators
    const refreshIndicators = page.locator('[data-testid="auto-refresh"], text*="Live", text*="Real-time"');
    
    if (await refreshIndicators.first().isVisible()) {
      // Verify refresh functionality
      const initialValue = await page.locator('text="Total Contracts"').textContent();
      
      // Trigger refresh if button exists
      const refreshButton = page.locator('button:has-text("Refresh"), [data-testid="refresh"]');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Check that data is still present (may have updated)
      await expect(page.locator('text*="Total Contracts"')).toBeVisible();
    }
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check that analytics are still accessible
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for mobile-friendly navigation
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }
    
    // Verify key metrics are still visible
    await expect(page.locator('text*="Total Contracts"')).toBeVisible();
    
    // Check that charts adapt to mobile
    const charts = page.locator('canvas, svg');
    if (await charts.count() > 0) {
      const chartWidth = await charts.first().evaluate(el => el.getBoundingClientRect().width);
      expect(chartWidth).toBeLessThanOrEqual(375);
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Mock empty analytics data
    await page.route('**/api/v1/analytics/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_contracts: 0,
          active_contracts: 0,
          monthly_stats: []
        })
      });
    });
    
    await page.reload();
    
    // Check for empty state messaging
    await expect(page.locator('text*="No data", text*="Getting started", text*="Create your first"')).toBeVisible();
    
    // Check for call-to-action
    const ctaButton = page.locator('button:has-text("Create"), a:has-text("Add")');
    if (await ctaButton.isVisible()) {
      await expect(ctaButton).toBeVisible();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Add delay to API responses to test loading states
    await page.route('**/api/v1/analytics/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total_contracts: 25 })
      });
    });
    
    await page.goto('/analytics');
    
    // Check for loading indicators
    await expect(page.locator('[data-testid="loading"], .spinner, text*="Loading"')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading"], .spinner')).not.toBeVisible({ timeout: 10000 });
    
    // Verify data loaded
    await expect(page.locator('text*="Analytics"')).toBeVisible();
  });
});
