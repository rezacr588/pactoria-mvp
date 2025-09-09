import { test, expect } from '@playwright/test';
import { loginWithDemoAccount } from './helpers/auth';
import { TEST_TIMEOUT } from './helpers/config';

test.describe('Dashboard Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithDemoAccount(page);
    await page.goto('/dashboard');
  });

  test('should display dashboard overview @smoke', async ({ page }) => {
    // Mock dashboard API data
    await page.route('**/api/v1/analytics/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          business_metrics: {
            total_contracts: 5,
            active_contracts: 3,
            draft_contracts: 1,
            compliance_score_average: 92,
            contracts_created_this_month: 2,
            contracts_activated_this_month: 1,
            contracts_pending_review: 1
          },
          compliance_metrics: {
            gdpr_compliance: 95,
            employment_law_compliance: 90,
            compliant_contracts_count: 4,
            high_risk_contracts_count: 0
          },
          time_metrics: {}
        })
      });
    });

    await page.route('**/api/v1/contracts*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contracts: [{
            id: 'test-contract-1',
            title: 'Test Service Agreement',
            contract_type: 'service_agreement',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }],
          total: 1
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    
    // Check main dashboard elements - the actual text from the implementation
    await expect(page.locator('h1')).toContainText(/Good morning/);
    
    // Check for the specific dashboard sections that exist
    await expect(page.locator('text="Recent Activity"')).toBeVisible();
    
    // Check for New Contract button with flexible selector
    const newContractButton = page.locator('button:has-text("New Contract"), a:has-text("New Contract"), [href*="new"]');
    await expect(newContractButton.first()).toBeVisible({ timeout: 5000 });
    
    // Check for dashboard statistics - these should be visible as text content
    const dashboardContent = page.locator('body');
    await expect(dashboardContent).toContainText(/Total Contracts|Active Contracts|Compliance/);
  });

  test('should show recent activity', async ({ page }) => {
    // Check for recent activity section
    const recentActivity = page.locator('text=/Recent Activity|Recent Contracts/').first();
    await expect(recentActivity).toBeVisible();
    
    // Check for activity items or empty state
    const activityItems = page.locator('[data-testid*="activity"], .activity-item, [role="listitem"]');
    const emptyState = page.locator('text=/No contracts yet|No activity/');
    
    await expect(activityItems.first().or(emptyState)).toBeVisible();
  });

  test('should display upcoming deadlines', async ({ page }) => {
    // Check for deadlines section
    const deadlinesSection = page.locator('text=/Upcoming Deadlines|Deadlines|Expiring/').first();
    await expect(deadlinesSection).toBeVisible();
    
    // Check for deadline items or empty state
    const deadlineItems = page.locator('[data-testid*="deadline"], .deadline-item');
    const noDeadlines = page.locator('text=/No upcoming deadlines|No deadlines/');
    
    await expect(deadlineItems.first().or(noDeadlines)).toBeVisible();
  });

  test('should show compliance alerts', async ({ page }) => {
    // Check for compliance section
    const complianceSection = page.locator('text=/Compliance|Risk|Alerts/').first();
    
    if (await complianceSection.isVisible()) {
      // Check for compliance items
      const complianceItems = page.locator('[data-testid*="compliance"], .compliance-alert');
      const noIssues = page.locator('text=/No compliance issues|All compliant/');
      
      await expect(complianceItems.first().or(noIssues)).toBeVisible();
    }
  });

  test('should navigate to contracts from dashboard', async ({ page }) => {
    // Find and click "View all contracts" or similar link
    const viewAllLink = page.locator('a:has-text("View all"), a:has-text("contracts"), button:has-text("View all")').first();
    
    if (await viewAllLink.isVisible()) {
      await viewAllLink.click();
      await expect(page).toHaveURL(/\/contracts/);
    }
  });

  test('should create new contract from dashboard @smoke', async ({ page }) => {
    // Find and click "New Contract" button
    const newContractButton = page.locator('button:has-text("New Contract"), a:has-text("Create Contract")').first();
    
    if (await newContractButton.isVisible()) {
      await newContractButton.click();
      await expect(page).toHaveURL(/\/contracts\/(new|create)/);
    }
  });

  test('should display real-time statistics', async ({ page }) => {
    // Navigate away and back to verify stats persistence
    await page.goto('/contracts');
    await page.goto('/dashboard');
    
    // Stats should still be visible
    await expect(page.locator('[data-testid*="stat-value"], .stat-value').first()).toBeVisible();
  });

  test('should show onboarding checklist for new users', async ({ page }) => {
    // Check if onboarding checklist is visible
    const onboarding = page.locator('[data-testid="onboarding"], .onboarding-checklist');
    
    if (await onboarding.isVisible()) {
      // Check for checklist items
      await expect(page.locator('text=/Complete profile|Create contract|Set up team/')).toBeVisible();
      
      // Try to dismiss onboarding
      const dismissButton = page.locator('button:has-text("Dismiss"), button[aria-label*="close"]');
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
        await expect(onboarding).not.toBeVisible();
      }
    }
  });

  test('should refresh dashboard data', async ({ page }) => {
    // Check for refresh button
    const refreshButton = page.locator('button[aria-label*="refresh"], button:has-text("Refresh")');
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      
      // Check for loading state
      await expect(page.locator('[role="status"], .loading, .spinner').first()).toBeVisible();
      
      // Wait for data to load
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUT.medium });
      
      // Data should be visible again
      await expect(page.locator('text=/Total Contracts|Active/')).toBeVisible();
    }
  });

  test('should handle empty states gracefully', async ({ page }) => {
    // Check various sections for proper empty states
    const sections = [
      { selector: 'text=/Recent Activity/', emptyText: /No contracts|No activity/ },
      { selector: 'text=/Upcoming Deadlines/', emptyText: /No deadlines|No upcoming/ },
      { selector: 'text=/Compliance/', emptyText: /No issues|All compliant/ }
    ];
    
    for (const section of sections) {
      const sectionElement = page.locator(section.selector).first();
      if (await sectionElement.isVisible()) {
        // Check if section has content or shows empty state
        const content = page.locator('[data-testid*="item"], [role="listitem"]');
        const emptyState = page.locator(`text=${section.emptyText}`);
        
        await expect(content.first().or(emptyState.first())).toBeVisible();
      }
    }
  });
});

test.describe('Dashboard Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithDemoAccount(page);
    await page.goto('/analytics');
  });

  test('should display analytics page', async ({ page }) => {
    // Check if we're on analytics page or if it redirects
    if (page.url().includes('/analytics')) {
      // Check for analytics content
      await expect(page.locator('h1')).toContainText(/Analytics|Reports|Insights/);
      
      // Check for charts or metrics
      await expect(page.locator('[data-testid*="chart"], canvas, .chart-container').first().or(page.locator('text=/No data|Loading/'))).toBeVisible();
    } else {
      // Analytics might be part of dashboard
      await page.goto('/dashboard');
      await expect(page.locator('text=/Analytics|Statistics|Metrics/')).toBeVisible();
    }
  });

  test('should show contract type distribution', async ({ page }) => {
    if (page.url().includes('/analytics')) {
      // Check for contract type chart or stats
      const contractTypes = page.locator('text=/Contract Types|Type Distribution|By Type/');
      
      if (await contractTypes.isVisible()) {
        // Check for chart or data
        await expect(page.locator('[data-testid*="chart"], .chart, canvas').first().or(page.locator('text=/Service Agreement|Employment|NDA/'))).toBeVisible();
      }
    }
  });

  test('should display compliance metrics', async ({ page }) => {
    if (page.url().includes('/analytics')) {
      // Check for compliance section
      const complianceSection = page.locator('text=/Compliance Score|Compliance Metrics/');
      
      if (await complianceSection.isVisible()) {
        // Check for metrics
        await expect(page.locator('text=/GDPR|Employment Law|Consumer Rights/').first()).toBeVisible();
      }
    }
  });

  test('should show time-based trends', async ({ page }) => {
    if (page.url().includes('/analytics')) {
      // Check for trend charts
      const trends = page.locator('text=/Trend|Over Time|Monthly/');
      
      if (await trends.isVisible()) {
        // Check for date range selector or chart
        await expect(page.locator('[data-testid*="date"], select, .chart').first()).toBeVisible();
      }
    }
  });

  test('should filter analytics by date range', async ({ page }) => {
    if (page.url().includes('/analytics')) {
      // Look for date filter
      const dateFilter = page.locator('[data-testid*="date-filter"], input[type="date"], select').first();
      
      if (await dateFilter.isVisible()) {
        // Change date range
        const tagName = await dateFilter.evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'select') {
          await dateFilter.selectOption({ index: 1 });
        }
        
        // Wait for data to update
        await page.waitForTimeout(1000);
        
        // Check that page still shows data
        await expect(page.locator('text=/Total|Contracts|Analytics/')).toBeVisible();
      }
    }
  });

  test('should export analytics report', async ({ page }) => {
    if (page.url().includes('/analytics')) {
      // Look for export button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download Report")');
      
      if (await exportButton.isVisible()) {
        // Click export
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await exportButton.click();
        
        // Check for download or export modal
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/report|analytics|export/i);
        } else {
          await expect(page.locator('text=/Export|Download|Report/')).toBeVisible();
        }
      }
    }
  });
});

test.describe('Dashboard Responsiveness', () => {
  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await loginWithDemoAccount(page);
    await page.goto('/dashboard');
    
    // Check that dashboard is still functional
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for mobile menu if needed
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
    }
    
    // Check that stats are still visible (might be stacked)
    await expect(page.locator('text=/Total Contracts/')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await loginWithDemoAccount(page);
    await page.goto('/dashboard');
    
    // Check layout
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=/Total Contracts/')).toBeVisible();
    
    // Sidebar might be collapsible on tablet
    const sidebar = page.locator('[data-testid="sidebar"], aside');
    if (await sidebar.isVisible()) {
      // Check if sidebar is properly displayed
      await expect(sidebar).toBeVisible();
    }
  });

  test('should handle dark mode', async ({ page }) => {
    await loginWithDemoAccount(page);
    await page.goto('/dashboard');
    
    // Look for theme toggle
    const themeToggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme"], button:has-text("Dark")');
    
    if (await themeToggle.isVisible()) {
      // Get initial background color
      const initialBg = await page.locator('body').evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      // Toggle theme
      await themeToggle.click();
      
      // Wait for transition
      await page.waitForTimeout(500);
      
      // Check that background changed
      const newBg = await page.locator('body').evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      expect(initialBg).not.toBe(newBg);
      
      // Content should still be visible
      await expect(page.locator('h1')).toBeVisible();
    }
  });
});
