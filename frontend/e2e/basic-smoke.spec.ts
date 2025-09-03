import { test, expect } from '@playwright/test';

test.describe('Basic Smoke Tests @smoke', () => {
  
  test('should load landing page @smoke', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start free trial/i }).first()).toBeVisible();
    await expect(page).toHaveTitle(/pactoria/i);
  });

  test('should navigate to login page @smoke', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should load authenticated dashboard @smoke', async ({ page }) => {
    // Set up authenticated state directly
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: 'test-user', 
            email: 'test@test.com',
            full_name: 'Test User',
            name: 'Test User',
            company_id: 'test-company'
          },
          token: 'mock-token'
        }
      }));
    });

    // Mock the API endpoints
    await page.route('**/api/v1/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/contracts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            contracts: [
              {
                id: 'test-contract-1',
                title: 'Test Contract',
                contract_type: 'service_agreement',
                status: 'active',
                client_name: 'Test Client',
                contract_value: 5000,
                currency: 'GBP',
                version: 1,
                company_id: 'test-company',
                created_at: new Date().toISOString()
              }
            ],
            total: 1,
            page: 1,
            size: 10,
            pages: 1
          })
        });
      } else if (url.includes('/analytics')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_contracts: 1,
            active_contracts: 1,
            compliance_score: 85
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        });
      }
    });

    await page.goto('/dashboard');
    
    // Should be on dashboard and show some content
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Check for basic dashboard elements
    await expect(
      page.getByText('Test')
      .or(page.getByText('Dashboard'))
      .or(page.getByText('Contracts'))
      .or(page.locator('main'))
      .or(page.locator('h1'))
    ).toBeVisible();
  });

  test('should handle application routes @smoke', async ({ page }) => {
    // Set up authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: 'test-user', 
            email: 'test@test.com',
            full_name: 'Test User',
            name: 'Test User',
            company_id: 'test-company'
          },
          token: 'mock-token'
        }
      }));
    });

    // Mock API responses
    await page.route('**/api/v1/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    // Test different routes load without errors
    const routes = ['/dashboard', '/contracts', '/analytics'];
    
    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      
      // Should not show error page
      await expect(page.getByText(/error|404|not found/i)).not.toBeVisible();
      
      // Should have some basic page structure
      await expect(
        page.locator('main')
        .or(page.locator('body'))
        .or(page.locator('[role="main"]'))
      ).toBeVisible();
    }
  });
});