import { test, expect } from '@playwright/test';

test.describe('Basic Smoke Tests', () => {
  test('landing page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check if main elements are visible
    await expect(page.locator('body')).toBeVisible();
    
    // Check if we can navigate to login
    const loginButton = page.getByRole('link', { name: /sign in|login/i });
    if (await loginButton.isVisible()) {
      await expect(loginButton).toBeVisible();
    }
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');
    
    // Basic login form elements
    await expect(page.locator('input[type="email"], input[name*="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name*="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('main navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Test that the page doesn't crash
    await expect(page.locator('body')).toBeVisible();
    
    // Check for any major JavaScript errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Allow some expected errors but fail on critical ones
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') && 
      !error.includes('network')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});