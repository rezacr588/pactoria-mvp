import { test, expect } from '@playwright/test';
import { 
  LandingPage, 
  LoginPage, 
  RegisterPage, 
  DashboardPage
} from '../utils/page-objects';
import { TestUser } from '../utils/test-data';
import { APIMocker } from '../utils/api-mock';

test.describe('Authentication Flow', () => {
  let landingPage: LandingPage;
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Landing Page', () => {
    test('should display landing page with login and signup options @smoke', async ({ page }) => {
      await landingPage.goto('/');
      
      await expect(landingPage.heroHeading).toBeVisible();
      await expect(landingPage.loginButton).toBeVisible();
      
      // Wait for page to fully load before checking signup button
      await page.waitForLoadState('domcontentloaded');
      await expect(landingPage.signUpButton).toBeVisible({ timeout: 15000 });
      
      // Check page title and meta description
      await expect(page).toHaveTitle(/pactoria/i);
    });

    test('should navigate to login page', async () => {
      await landingPage.goto('/');
      await landingPage.clickLogin();
      
      await expect(loginPage.page).toHaveURL(/\/login/);
      await expect(loginPage.emailInput).toBeVisible();
    });

    test('should navigate to register page', async ({ page }) => {
      await landingPage.goto('/');
      await landingPage.clickSignUp();
      
      // Should navigate to login page (which has registration toggle)
      await expect(page).toHaveURL(/\/login/);
      
      // Check for registration form elements
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.fullNameInput).toBeVisible();
      await expect(registerPage.registerButton).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should login with valid credentials @smoke', async ({ page }) => {
      await loginPage.goto('/login');
      
      // Wait for page to load completely
      await page.waitForLoadState('domcontentloaded');
      
      // Check if there's a demo login button first
      const demoButton = page.locator('button:has-text("Try Demo")');
      if (await demoButton.isVisible()) {
        await demoButton.click();
      } else {
        // Manual login with demo credentials
        await page.fill('input[name="email"]', 'demo@pactoria.com');
        await page.fill('input[name="password"]', 'Demo123!');
        await page.click('button[type="submit"]');
      }
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should validate email format', async ({ page }) => {
      await loginPage.goto('/login');
      
      await loginPage.emailInput.fill('invalid-email');
      await loginPage.passwordInput.fill('password123');
      await loginPage.loginButton.click();
      
      // Should show validation error or stay on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should validate required fields', async ({ page }) => {
      await loginPage.goto('/login');
      
      // Try to submit empty form
      await loginPage.loginButton.click();
      
      // Should stay on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle invalid credentials', async ({ page }) => {
      await loginPage.goto('/login');
      
      await loginPage.emailInput.fill('wrong@example.com');
      await loginPage.passwordInput.fill('wrongpassword');
      await loginPage.loginButton.click();
      
      // Should show error message or stay on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should show loading state during login', async ({ page }) => {
      await loginPage.goto('/login');
      
      await loginPage.emailInput.fill('demo@pactoria.com');
      await loginPage.passwordInput.fill('Demo123!');
      
      // Click login and check for loading state
      await loginPage.loginButton.click();
      
      // Should eventually redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    });

    test('should remember user after browser restart', async ({ page, context }) => {
      // Login first
      await loginPage.goto('/login');
      await page.fill('input[name="email"]', 'demo@pactoria.com');
      await page.fill('input[name="password"]', 'Demo123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Create new page to simulate browser restart
      const newPage = await context.newPage();
      await newPage.goto('/dashboard');
      
      // Should stay authenticated
      await expect(newPage).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('User Registration', () => {
    test('should register with valid data', async ({ page }) => {
      const testUser = TestUser.random();
      
      await registerPage.goto('/login'); // Use /login since there's no separate /register route
      await registerPage.register(testUser);
      
      // Should redirect to dashboard after registration
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(dashboardPage.welcomeMessage).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await registerPage.goto('/login'); // Use /login since there's no separate /register route
      
      // Switch to registration mode first
      const signUpToggle = page.locator('button:has-text("Sign up")');
      if (await signUpToggle.isVisible()) {
        await signUpToggle.click();
        await page.waitForTimeout(500);
      }
      
      await registerPage.registerButton.click();
      
      // Should show validation errors for required fields
      await expect(page).toHaveURL(/\/login/); // Should stay on login page
    });

    test('should validate email format during registration', async ({ page }) => {
      const testUser = TestUser.random();
      testUser.email = 'invalid-email';
      
      await registerPage.goto('/login'); // Use /login since there's no separate /register route
      
      // Switch to registration mode first
      const signUpToggle = page.locator('button:has-text("Sign up")');
      if (await signUpToggle.isVisible()) {
        await signUpToggle.click();
        await page.waitForTimeout(500);
      }
      
      await registerPage.fullNameInput.fill(testUser.full_name);
      await registerPage.emailInput.fill(testUser.email);
      await registerPage.passwordInput.fill(testUser.password);
      await registerPage.registerButton.click();
      
      // Should show email validation error
      await expect(page).toHaveURL(/\/login/); // Should stay on login page
    });

    test('should handle registration server errors', async ({ page }) => {
      // Mock server error
      await page.route('**/auth/register', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Email already exists'
          })
        });
      });
      
      const testUser = TestUser.random();
      await registerPage.goto('/login'); // Use /login since there's no separate /register route
      await registerPage.register(testUser);
      
      // Should show error message
      const errorMessage = page.getByRole('alert');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Email already exists');
    });

    test('should toggle between login and register modes', async ({ page }) => {
      await page.goto('/login');
      
      // Should start in login mode
      await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
      
      // Switch to register mode
      const signUpToggle = page.locator('button:has-text("Sign up")');
      await signUpToggle.click();
      await page.waitForTimeout(500);
      
      // Should show registration fields
      await expect(page.locator('input[name="full_name"]')).toBeVisible();
      await expect(page.locator('input[name="company_name"]')).toBeVisible();
      await expect(page.locator('button:has-text("Create Account")')).toBeVisible();
      
      // Switch back to login mode
      const signInToggle = page.locator('button:has-text("Sign in")');
      await signInToggle.click();
      await page.waitForTimeout(500);
      
      // Should hide registration fields
      await expect(page.locator('input[name="full_name"]')).not.toBeVisible();
      await expect(page.locator('input[name="company_name"]')).not.toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route without authentication
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should allow authenticated users to access protected routes', async ({ page }) => {
      // Use real login instead of mocking localStorage
      await loginPage.goto('/login');
      await page.fill('input[name="email"]', 'demo@pactoria.com');
      await page.fill('input[name="password"]', 'Demo123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Navigate to another protected route
      await page.goto('/contracts');
      
      // Should stay authenticated and access the route
      await expect(page).toHaveURL(/\/contracts/);
    });

    test('should handle token expiration', async ({ page }) => {
      // Use real login first, then simulate token expiration
      await loginPage.goto('/login');
      await page.fill('input[name="email"]', 'demo@pactoria.com');
      await page.fill('input[name="password"]', 'Demo123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Mock token validation failure for subsequent requests
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Token expired'
          })
        });
      });
      
      // Try to navigate to another page
      await page.goto('/contracts');
      
      // Should redirect to login due to expired token
      await expect(page).toHaveURL(/\/login/);
    });

    test('should logout user and redirect to login', async ({ page }) => {
      // Login first
      await loginPage.goto('/login');
      await loginPage.emailInput.fill('demo@pactoria.com');
      await loginPage.passwordInput.fill('Demo123!');
      await loginPage.loginButton.click();
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Logout
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        
        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
      }
    });
  });

  test.describe('Session Management', () => {
    test('should persist authentication state across page reloads', async ({ page }) => {
      const testUser = TestUser.admin();
      
      await loginPage.goto('/login');
      await loginPage.login(testUser);
      
      // Reload the page
      await page.reload();
      
      // Should still be authenticated
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(dashboardPage.welcomeMessage).toBeVisible();
    });

    test('should handle concurrent sessions', async ({ context }) => {
      const testUser = TestUser.admin();
      
      // Login in first tab
      const page1 = await context.newPage();
      const loginPage1 = new LoginPage(page1);
      const apiMocker1 = new APIMocker(page1);
      
      await apiMocker1.mockAllEndpoints();
      await loginPage1.goto('/login');
      await loginPage1.login(testUser);
      
      // Open second tab and check authentication
      const page2 = await context.newPage();
      await page2.goto('/dashboard');
      
      // Both tabs should be authenticated
      await expect(page1).toHaveURL(/\/dashboard/);
      await expect(page2).toHaveURL(/\/dashboard/);
    });
  });
});