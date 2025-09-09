import { test, expect } from '@playwright/test';
import { LandingPage, LoginPage, ContractsPage } from './utils/page-objects';

/**
 * Critical Smoke Tests - Re-enabled after MVP launch
 * These tests were temporarily skipped to unblock MVP launch
 * Now re-enabled and fixed to ensure proper e2e coverage
 */

test.describe('Critical Smoke Tests', () => {
  
  test('landing page signup button should work @smoke', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Find signup button - based on actual landing page
    const signupButtons = page.locator('a:has-text("Start Free Trial"), a:has-text("Get Started")');
    await expect(signupButtons.first()).toBeVisible({ timeout: 10000 });
    
    // Click the signup button
    await signupButtons.first().click();
    
    // Should navigate to login page (as observed in real UI)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    
    // Should see login/registration form (both email and password fields should be visible)
    const emailInput = page.locator('input[name="email"]').first();
    const passwordInput = page.locator('input[name="password"]').first();
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('login with valid credentials should work @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto('/login');
    
    // Use demo credentials for testing
    const demoEmail = 'demo@pactoria.com';
    const demoPassword = 'Demo123!';
    
    // Fill login form
    await loginPage.emailInput.fill(demoEmail);
    await loginPage.passwordInput.fill(demoPassword);
    
    // Submit form
    await loginPage.loginButton.click();
    
    // Should redirect to dashboard with extended timeout for real API
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    
    // Should see dashboard content
    await expect(page.getByRole('heading', { name: /^Good morning, Demo!$/ })).toBeVisible({ timeout: 10000 });
  });

  test('contracts list should display correctly @smoke', async ({ page }) => {
    const contractsPage = new ContractsPage(page);
    
    // First login to get authenticated
    await page.goto('/login');
    await page.fill('input[name="email"]', 'demo@pactoria.com');
    await page.fill('input[name="password"]', 'Demo123!');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    
    // Navigate to contracts page
    await contractsPage.goto('/contracts');
    
    // Wait for contracts page to load
    await page.waitForURL(/\/contracts/, { timeout: 10000 });
    
    // Check for page title/header
    await expect(page.getByRole('heading', { name: 'Contracts' }).first()).toBeVisible({ timeout: 10000 });
    
    // Check for create contract button
    const createButton = page.locator('a:has-text("New Contract"), button:has-text("Create"), [data-testid="create-contract-button"], .btn-primary');
    await expect(createButton.first()).toBeVisible({ timeout: 10000 });
    
    // Check for search functionality
    const searchInput = page.locator('input[placeholder*="Search"], input[name="search"], [data-testid="search-input"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
    
    // Handle empty state gracefully
    const emptyState = page.locator('text=/No contracts found|No data available|Empty state/');
    const contractRows = page.locator('[data-testid="contract-row"], [data-contract-id], .contract-card');
    
    // Either empty state or contracts should be visible
    await expect(emptyState.or(contractRows.first())).toBeVisible({ timeout: 10000 });
  });

  test('navigation between sections should work @smoke', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'demo@pactoria.com');
    await page.fill('input[name="password"]', 'Demo123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    
    // Test navigation to contracts
    await page.click('a:has-text("Contracts"), [href*="/contracts"], nav a:has-text("Contracts")');
    await expect(page).toHaveURL(/\/contracts/, { timeout: 10000 });
    
    // Test navigation to analytics if available
    const analyticsLink = page.locator('a:has-text("Analytics"), [href*="/analytics"]');
    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();
      await expect(page).toHaveURL(/\/analytics/, { timeout: 10000 });
    }
    
    // Test navigation back to dashboard
    await page.click('a:has-text("Dashboard"), [href*="/dashboard"], nav a:has-text("Dashboard")');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Test browser back/forward navigation
    await page.goBack();
    await expect(page).toHaveURL(/\/analytics|\/contracts/, { timeout: 10000 });
    
    await page.goForward();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('basic application flow should complete without errors @smoke', async ({ page }) => {
    // Start at landing page
    await page.goto('/');
    
    // Check for critical elements
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, [data-testid="hero-heading"]')).toBeVisible({ timeout: 10000 });
    
    // Navigate to login
    await page.click('a:has-text("Sign In"), a:has-text("Login")');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    
    // Login
    await page.fill('input[name="email"]', 'demo@pactoria.com');
    await page.fill('input[name="password"]', 'Demo123!');
    await page.click('button[type="submit"]');
    
    // Should reach dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    
    // Navigate to contracts
    await page.click('a:has-text("Contracts")');
    await expect(page).toHaveURL(/\/contracts/, { timeout: 10000 });
    
    // Verify no critical JavaScript errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Allow some expected errors but fail on critical ones
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') && 
      !error.includes('network') &&
      !error.includes('chunk')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
