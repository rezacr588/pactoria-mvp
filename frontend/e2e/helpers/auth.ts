import { type Page } from '@playwright/test';

export const demoCredentials = {
  email: 'demo@pactoria.com',
  password: 'Demo123!' // Updated to match actual demo password
};

export async function loginWithDemoAccount(page: Page) {
  // Navigate to login page
  await page.goto('/login');
  
  // Fill login form
  await page.fill('input[name="email"]', demoCredentials.email);
  await page.fill('input[name="password"]', demoCredentials.password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard with extended timeout
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  
  // Additional wait for page to stabilize
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

export async function loginWithCredentials(page: Page, email: string, password: string) {
  // Navigate to login page
  await page.goto('/login');
  
  // Fill login form
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard with extended timeout
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  
  // Additional wait for page to stabilize
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

export async function logout(page: Page) {
  // Find and click user menu
  const userMenu = page.locator('[data-testid="user-menu"], button[aria-label*="profile"], button:has-text("Demo")').first();
  
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
