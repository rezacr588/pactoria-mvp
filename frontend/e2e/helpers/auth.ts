import { type Page } from '@playwright/test';

export const testCredentials = {
  email: 'demo@pactoria.com',
  password: 'Demo123!'
};

export async function loginWithTestAccount(page: Page) {
  // Navigate to login page
  await page.goto('/login');

  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

  // Fill login form using more specific selectors
  await page.fill('input[type="email"], input[name="email"]', testCredentials.email);
  await page.fill('input[type="password"], input[name="password"]', testCredentials.password);

  // Submit form and wait for navigation
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
  await submitButton.click();

  // Wait for navigation to complete with extended timeout - allow multiple possible destinations
  await page.waitForURL(/\/(dashboard|contracts)/, { timeout: 30000 });

  // Additional wait for page to stabilize
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

  // Verify we're logged in by checking for dashboard or contracts elements
  await page.waitForSelector('h1, [data-testid*="welcome"], .dashboard, [href*="/contracts"]', { timeout: 10000 });
}

export async function loginWithCredentials(page: Page, email: string, password: string) {
  // Navigate to login page
  await page.goto('/login');

  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });

  // Fill login form
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);

  // Submit form
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
  await submitButton.click();

  // Wait for navigation to dashboard with extended timeout - allow multiple possible destinations
  await page.waitForURL(/\/(dashboard|contracts)/, { timeout: 30000 });

  // Additional wait for page to stabilize
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

  // Verify we're logged in by checking for dashboard or contracts elements
  await page.waitForSelector('h1, [data-testid*="welcome"], .dashboard, [href*="/contracts"]', { timeout: 10000 });
}

export async function logout(page: Page) {
  // Find and click user menu
  const userMenu = page.locator('[data-testid="user-menu"], button[aria-label*="profile"], [data-testid="user-avatar"]').first();
  
  if (await userMenu.isVisible()) {
    await userMenu.click();
    
    // Click logout option
    await page.click('text=/Logout|Sign out/');
  } else {
    // Direct logout button
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
  }
  
  // Wait for redirect to login
  await page.waitForURL(/\/login|\//, { timeout: 10000 });
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check if auth token exists in localStorage
  const hasToken = await page.evaluate(() => {
    const authStorage = localStorage.getItem('auth-storage');
    const token = localStorage.getItem('pactoria_auth_token');
    return !!(authStorage || token);
  });
  
  return hasToken;
}

export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    // Check multiple possible storage locations
    const directToken = localStorage.getItem('pactoria_auth_token');
    if (directToken) return directToken;
    
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        return parsed.state?.token || null;
      } catch {
        return null;
      }
    }
    
    return null;
  });
}

export async function setAuthToken(page: Page, token: string) {
  await page.evaluate((token) => {
    localStorage.setItem('pactoria_auth_token', token);
  }, token);
}
