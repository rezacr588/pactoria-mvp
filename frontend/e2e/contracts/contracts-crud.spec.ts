import { test, expect } from '@playwright/test';

test.describe('Contract Management - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login with real credentials instead of localStorage injection
    await page.goto('/login');
    await page.fill('input[name="email"]', 'demo@pactoria.com');
    await page.fill('input[name="password"]', 'Demo123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  });

  test.describe('Contracts List Page', () => {
    test('should display contracts list @smoke', async ({ page }) => {
      await page.goto('/contracts');
      
      // Verify contracts page loads correctly
      await expect(page).toHaveURL(/\/contracts/);
      
      // Check for page content - contracts page or quick access
      const hasQuickAccess = page.getByRole('heading', { name: 'QUICK ACCESS' });
      const hasContracts = page.getByRole('heading', { name: /contracts/i });
      
      // Accept either the quick access page or contracts page
      try {
        await expect(hasQuickAccess).toBeVisible({ timeout: 5000 });
      } catch {
        await expect(hasContracts).toBeVisible({ timeout: 5000 });
      }
      
      // Basic page verification - handles empty state gracefully
      await expect(page.locator('main')).toBeVisible();
    });

    test('should display create contract button', async ({ page }) => {
      await page.goto('/contracts');
      
      // Verify contracts page loads
      await expect(page).toHaveURL(/\/contracts/);
      
      // Wait for page to load completely
      await page.waitForSelector('[data-testid="contracts-list"]', { timeout: 10000 });
      
      // Check for page title
      await expect(page.locator('text="Contracts"').first()).toBeVisible();
      
      // Check for create contract functionality
      const createButton = page.getByRole('link', { name: 'New Contract' }).first();
      await expect(createButton).toBeVisible();
    });
  });

  test.describe('Create Contract', () => {
    test('should display contract creation page', async ({ page }) => {
      await page.goto('/contracts/new');
      
      // Verify template selection page loads
      await expect(page).toHaveURL(/\/contracts\/new/);
      await expect(page.getByRole('heading', { name: 'Create New Contract' })).toBeVisible();
    });
  });
});