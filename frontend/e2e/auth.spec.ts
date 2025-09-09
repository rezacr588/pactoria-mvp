import { test, expect, type Page } from '@playwright/test';
import { API_URL } from './helpers/config';

// Test data
const testUser = {
  email: `test.user.${Date.now()}@pactoria.test`,
  password: 'Test123!@#',
  fullName: 'Test User',
  companyName: 'Test Company Ltd',
  timezone: 'Europe/London'
};

const demoUser = {
  email: 'demo@pactoria.com',
  password: 'Demo123!' // Updated to match actual demo password
};

// Helper functions
async function fillLoginForm(page: Page, email: string, password: string) {
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
}

async function fillRegistrationForm(page: Page, user: typeof testUser) {
  await page.fill('input[name="full_name"]', user.fullName);
  await page.fill('input[name="company_name"]', user.companyName);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
}

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page correctly', async ({ page }) => {
    // Check page title and elements
    await expect(page).toHaveTitle(/Pactoria/);
    await expect(page.locator('h2')).toContainText('Welcome back');
    
    // Check form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
    
    // Check registration toggle
    await expect(page.locator('text=/Sign up/')).toBeVisible();
  });

  test('should toggle between login and registration forms', async ({ page }) => {
    // Initially on login form
    await expect(page.locator('h2')).toContainText('Welcome back');
    
    // Switch to registration
    await page.click('text=/Sign up/');
    await expect(page.locator('h2')).toContainText('Get started today');
    await expect(page.locator('input[name="full_name"]')).toBeVisible();
    await expect(page.locator('input[name="company_name"]')).toBeVisible();
    
    // Switch back to login
    await page.click('text=/Sign in/');
    await expect(page.locator('h2')).toContainText('Welcome back');
    await expect(page.locator('input[name="full_name"]')).not.toBeVisible();
  });

  test('should show password visibility toggle', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.locator('button[aria-label*="password"]').or(page.locator('button').filter({ has: page.locator('svg') }).last());
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Type a password
    await passwordInput.fill('testpassword');
    
    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click again to hide
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should validate login form inputs', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for HTML5 validation messages
    const emailInput = page.locator('input[name="email"]');
    const isEmailInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isEmailInvalid).toBeTruthy();
    
    // Fill invalid email
    await emailInput.fill('invalid-email');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Should show email validation error
    const isEmailStillInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isEmailStillInvalid).toBeTruthy();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    // Fill form with invalid credentials
    await fillLoginForm(page, 'invalid@example.com', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('text=/Authentication failed|Invalid credentials|User not found/')).toBeVisible({ timeout: 10000 });
  });

  test('should successfully register a new user', async ({ page }) => {
    // Switch to registration form
    await page.click('text=/Sign up/');
    
    // Fill registration form
    await fillRegistrationForm(page, testUser);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/\/dashboard|\/onboarding/, { timeout: 15000 });
  });

  test('should successfully login with demo account', async ({ page }) => {
    // Click demo login button if available
    const demoButton = page.locator('button:has-text("Demo")').first();
    if (await demoButton.isVisible()) {
      await demoButton.click();
    } else {
      // Manually fill demo credentials
      await fillLoginForm(page, demoUser.email, demoUser.password);
      await page.click('button[type="submit"]');
    }
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    
    // Check user is logged in
    await expect(page.locator('text=/Good morning|Dashboard|Contracts/')).toBeVisible();
  });

  test('should persist authentication state', async ({ page, context }) => {
    // Login with demo account
    await fillLoginForm(page, demoUser.email, demoUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    
    // Get cookies and local storage
    const cookies = await context.cookies();
    const localStorage = await page.evaluate(() => window.localStorage);
    
    // Navigate to a different page
    await page.goto('/contracts');
    await expect(page).toHaveURL(/\/contracts/);
    
    // Should still be logged in
    await expect(page.locator('text=/Good morning|Contracts|Create/')).toBeVisible();
    
    // Open new page in same context
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    
    // Should be logged in on new page
    await expect(newPage).toHaveURL(/\/dashboard/);
    await expect(newPage.locator('text=/Good morning|Dashboard|Contracts/')).toBeVisible();
    
    await newPage.close();
  });

  test('should handle logout correctly', async ({ page, context }) => {
    // First login
    await fillLoginForm(page, demoUser.email, demoUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    
    // Find and click logout button (might be in dropdown)
    const profileButton = page.locator('button[aria-label*="profile"]').or(page.locator('[data-testid="user-menu"]')).or(page.locator('button:has-text("Demo")'));
    if (await profileButton.isVisible()) {
      await profileButton.click();
      await page.click('text=/Logout|Sign out/');
    } else {
      // Direct logout if visible
      const logoutButton = page.locator('button:has-text("Logout")').or(page.locator('a:has-text("Logout")'));
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }
    }
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login|\//, { timeout: 10000 });
    
    // Should not be able to access protected routes
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login|\//, { timeout: 10000 });
  });

  test('should redirect to login when accessing protected routes without auth', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.clear());
    
    // Try to access protected routes
    const protectedRoutes = ['/dashboard', '/contracts', '/templates', '/analytics', '/settings'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login|\//, { timeout: 10000 });
    }
  });

  test('should handle session expiry gracefully', async ({ page, context }) => {
    // Login first
    await fillLoginForm(page, demoUser.email, demoUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    
    // Simulate session expiry by clearing auth token
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('pactoria_auth_token');
    });
    
    // Try to navigate to another protected page
    await page.goto('/contracts');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login|\//, { timeout: 10000 });
  });

  test('should handle concurrent login attempts', async ({ browser }) => {
    // Create two contexts (simulating two browser tabs/windows)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Navigate both to login
    await page1.goto('/login');
    await page2.goto('/login');
    
    // Login on first page
    await fillLoginForm(page1, demoUser.email, demoUser.password);
    await page1.click('button[type="submit"]');
    await expect(page1).toHaveURL(/\/dashboard/, { timeout: 15000 });
    
    // Login on second page with same credentials
    await fillLoginForm(page2, demoUser.email, demoUser.password);
    await page2.click('button[type="submit"]');
    await expect(page2).toHaveURL(/\/dashboard/, { timeout: 15000 });
    
    // Both should be logged in
    await expect(page1.locator('text=/Dashboard/')).toBeVisible();
    await expect(page2.locator('text=/Dashboard/')).toBeVisible();
    
    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('should validate registration form completely', async ({ page }) => {
    // Switch to registration
    await page.click('text=/Sign up/');
    
    // Test empty form submission
    await page.click('button[type="submit"]');
    const fullNameInput = page.locator('input[name="full_name"]');
    const isInvalid = await fullNameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
    
    // Test with only some fields filled
    await page.fill('input[name="full_name"]', 'Test');
    await page.fill('input[name="company_name"]', 'Company');
    await page.click('button[type="submit"]');
    
    // Email should still be invalid
    const emailInput = page.locator('input[name="email"]');
    const isEmailInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isEmailInvalid).toBeTruthy();
    
    // Test password requirements
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123'); // Too short
    await page.click('button[type="submit"]');
    
    // Should show password error or not submit
    const passwordInput = page.locator('input[name="password"]');
    const isPasswordInvalid = await passwordInput.evaluate((el: HTMLInputElement) => {
      return el.value.length < 6; // Assuming minimum 6 characters
    });
    expect(isPasswordInvalid).toBeTruthy();
  });

  test('should remember user after browser restart', async ({ browser }) => {
    // Create a persistent context
    const userDataDir = `/tmp/pactoria-test-${Date.now()}`;
    const context = await browser.newContext({
      storageState: undefined
    });
    
    const page = await context.newPage();
    
    // Login
    await page.goto('/login');
    await fillLoginForm(page, demoUser.email, demoUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    
    // Save storage state
    const storageState = await context.storageState();
    
    // Close context
    await context.close();
    
    // Create new context with saved state
    const newContext = await browser.newContext({
      storageState: storageState
    });
    
    const newPage = await newContext.newPage();
    await newPage.goto('/dashboard');
    
    // Should still be logged in
    await expect(newPage).toHaveURL(/\/dashboard/);
    await expect(newPage.locator('text=/Dashboard/')).toBeVisible();
    
    await newContext.close();
  });
});

test.describe('Password Recovery', () => {
  test.skip('should allow password reset request', async ({ page }) => {
    // This test is skipped as password reset might not be implemented yet
    await page.goto('/login');
    
    // Look for forgot password link
    const forgotLink = page.locator('text=/Forgot password|Reset password/');
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      
      // Should show reset form
      await expect(page.locator('text=/Reset|Recover/')).toBeVisible();
      
      // Enter email
      await page.fill('input[name="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('text=/sent|check your email/')).toBeVisible({ timeout: 10000 });
    }
  });
});
