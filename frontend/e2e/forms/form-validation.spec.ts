import { test, expect } from '@playwright/test';
import { 
  LoginPage, 
  RegisterPage, 
  ContractCreatePage, 
  ContractViewPage 
} from '../utils/page-objects';
import { TestUser, TestContract } from '../utils/test-data';
import { APIMocker } from '../utils/api-mock';

test.describe('Form Validation and Error Handling', () => {
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let contractCreatePage: ContractCreatePage;
  let contractViewPage: ContractViewPage;
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    contractCreatePage = new ContractCreatePage(page);
    contractViewPage = new ContractViewPage(page);
    apiMocker = new APIMocker(page);

    await apiMocker.mockAllEndpoints();
  });

  test.describe('Login Form Validation', () => {
    test('should validate required email field', async ({ page }) => {
      await loginPage.goto('/login');
      
      // Try to submit without email
      await loginPage.passwordInput.fill('password123');
      await loginPage.loginButton.click();
      
      // Should show email required error
      const emailValidation = await loginPage.emailInput.getAttribute('validationMessage');
      const customError = await page.getByTestId('email-error').textContent().catch(() => null);
      
      expect(emailValidation || customError).toBeTruthy();
    });

    test('should validate email format', async ({ page }) => {
      await loginPage.goto('/login');
      
      await loginPage.emailInput.fill('invalid-email');
      await loginPage.passwordInput.fill('password123');
      await loginPage.loginButton.click();
      
      // Should show email format error
      const emailValidation = await loginPage.emailInput.getAttribute('validationMessage');
      const customError = await page.getByText(/invalid email/i).textContent().catch(() => null);
      
      expect(emailValidation || customError).toBeTruthy();
    });

    test('should validate required password field', async ({ page }) => {
      await loginPage.goto('/login');
      
      await loginPage.emailInput.fill('test@example.com');
      await loginPage.loginButton.click();
      
      // Should show password required error
      const passwordValidation = await loginPage.passwordInput.getAttribute('validationMessage');
      const customError = await page.getByTestId('password-error').textContent().catch(() => null);
      
      expect(passwordValidation || customError).toBeTruthy();
    });

    test('should show real-time email validation', async ({ page }) => {
      await loginPage.goto('/login');
      
      // Type invalid email
      await loginPage.emailInput.fill('invalid');
      await loginPage.emailInput.blur();
      
      // Should show validation error immediately
      const errorMessage = page.getByText(/invalid email/i);
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
      
      // Fix email
      await loginPage.emailInput.fill('valid@example.com');
      await loginPage.emailInput.blur();
      
      // Error should disappear
      await expect(errorMessage).not.toBeVisible({ timeout: 3000 });
    });

    test('should prevent XSS in form inputs', async ({ page }) => {
      await loginPage.goto('/login');
      
      const xssPayload = '<script>alert("xss")</script>';
      
      await loginPage.emailInput.fill(xssPayload);
      await loginPage.passwordInput.fill(xssPayload);
      
      // Should not execute script
      const alerts = await page.evaluate(() => window.alerts || []);
      expect(alerts).not.toContain('xss');
      
      // Should sanitize or escape input
      const emailValue = await loginPage.emailInput.inputValue();
      expect(emailValue).not.toContain('<script>');
    });
  });

  test.describe('Registration Form Validation', () => {
    test('should validate all required fields', async ({ page }) => {
      await registerPage.goto('/register');
      await registerPage.registerButton.click();
      
      // Should show multiple validation errors
      const requiredFields = ['full_name', 'email', 'password'];
      
      for (const field of requiredFields) {
        const error = await page.getByTestId(`${field}-error`).textContent().catch(() => null);
        const input = page.getByLabel(new RegExp(field.replace('_', ' '), 'i'));
        const validation = await input.getAttribute('validationMessage');
        
        expect(error || validation).toBeTruthy();
      }
    });

    test('should validate password strength', async ({ page }) => {
      await registerPage.goto('/register');
      
      const weakPasswords = ['123', 'password', 'abc'];
      
      for (const weakPassword of weakPasswords) {
        await registerPage.passwordInput.fill(weakPassword);
        await registerPage.passwordInput.blur();
        
        // Should show weak password error
        const error = page.getByText(/password.*weak|password.*short/i);
        await expect(error).toBeVisible({ timeout: 2000 });
      }
      
      // Strong password should pass
      await registerPage.passwordInput.fill('StrongPassword123!');
      await registerPage.passwordInput.blur();
      
      const error = page.getByText(/password.*weak|password.*short/i);
      await expect(error).not.toBeVisible({ timeout: 2000 });
    });

    test('should validate password confirmation match', async ({ page }) => {
      await registerPage.goto('/register');
      
      await registerPage.passwordInput.fill('password123');
      
      if (await registerPage.confirmPasswordInput.isVisible()) {
        await registerPage.confirmPasswordInput.fill('different123');
        await registerPage.confirmPasswordInput.blur();
        
        // Should show password mismatch error
        const error = page.getByText(/passwords.*match/i);
        await expect(error).toBeVisible({ timeout: 2000 });
        
        // Fix password confirmation
        await registerPage.confirmPasswordInput.fill('password123');
        await registerPage.confirmPasswordInput.blur();
        
        // Error should disappear
        await expect(error).not.toBeVisible({ timeout: 2000 });
      }
    });

    test('should validate company name format', async ({ page }) => {
      await registerPage.goto('/register');
      
      if (await registerPage.companyNameInput.isVisible()) {
        // Test invalid company names
        const invalidNames = ['', '   ', 'a', 'A'.repeat(101)];
        
        for (const name of invalidNames) {
          await registerPage.companyNameInput.fill(name);
          await registerPage.companyNameInput.blur();
          
          if (name.length === 0 || name.trim().length === 0 || name.length < 2) {
            const error = page.getByText(/company name.*required|company name.*short/i);
            await expect(error).toBeVisible({ timeout: 2000 });
          } else if (name.length > 100) {
            const error = page.getByText(/company name.*long/i);
            await expect(error).toBeVisible({ timeout: 2000 });
          }
        }
      }
    });
  });

  test.describe('Contract Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });
    });

    test('should validate required contract fields', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      await contractCreatePage.createButton.click();
      
      // Should show validation errors for required fields
      const requiredFields = ['title', 'contract_type', 'plain_english_input'];
      
      for (const field of requiredFields) {
        const error = await page.getByTestId(`${field}-error`).textContent().catch(() => null);
        const input = page.getByLabel(new RegExp(field.replace('_', ' '), 'i'));
        const validation = await input.getAttribute('validationMessage');
        
        expect(error || validation).toBeTruthy();
      }
    });

    test('should validate contract title length', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      // Too short title
      await contractCreatePage.titleInput.fill('a');
      await contractCreatePage.titleInput.blur();
      
      const shortError = page.getByText(/title.*short/i);
      await expect(shortError).toBeVisible({ timeout: 2000 });
      
      // Too long title
      const longTitle = 'A'.repeat(201);
      await contractCreatePage.titleInput.fill(longTitle);
      await contractCreatePage.titleInput.blur();
      
      const longError = page.getByText(/title.*long/i);
      await expect(longError).toBeVisible({ timeout: 2000 });
      
      // Valid title
      await contractCreatePage.titleInput.fill('Valid Contract Title');
      await contractCreatePage.titleInput.blur();
      
      await expect(shortError).not.toBeVisible({ timeout: 2000 });
      await expect(longError).not.toBeVisible({ timeout: 2000 });
    });

    test('should validate email fields', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      const invalidEmail = 'invalid-email';
      
      if (await contractCreatePage.clientEmailInput.isVisible()) {
        await contractCreatePage.clientEmailInput.fill(invalidEmail);
        await contractCreatePage.clientEmailInput.blur();
        
        // Should show email validation error
        const error = page.getByText(/invalid email/i);
        await expect(error).toBeVisible({ timeout: 2000 });
      }
    });

    test('should validate numeric fields', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      if (await contractCreatePage.contractValueInput.isVisible()) {
        // Invalid numeric values
        const invalidValues = ['-100', 'abc', '10.5.5', ''];
        
        for (const value of invalidValues) {
          await contractCreatePage.contractValueInput.fill(value);
          await contractCreatePage.contractValueInput.blur();
          
          if (value === '-100') {
            const error = page.getByText(/value.*positive/i);
            await expect(error).toBeVisible({ timeout: 2000 });
          } else if (value === 'abc' || value === '10.5.5') {
            const error = page.getByText(/value.*number/i);
            await expect(error).toBeVisible({ timeout: 2000 });
          }
        }
        
        // Valid value
        await contractCreatePage.contractValueInput.fill('5000');
        await contractCreatePage.contractValueInput.blur();
        
        const errors = page.getByText(/value.*(positive|number)/i);
        await expect(errors).not.toBeVisible({ timeout: 2000 });
      }
    });

    test('should validate date fields', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      if (await contractCreatePage.startDateInput.isVisible() && await contractCreatePage.endDateInput.isVisible()) {
        // End date before start date
        await contractCreatePage.startDateInput.fill('2024-12-01');
        await contractCreatePage.endDateInput.fill('2024-11-01');
        await contractCreatePage.endDateInput.blur();
        
        const error = page.getByText(/end date.*start date/i);
        await expect(error).toBeVisible({ timeout: 2000 });
        
        // Fix dates
        await contractCreatePage.endDateInput.fill('2024-12-31');
        await contractCreatePage.endDateInput.blur();
        
        await expect(error).not.toBeVisible({ timeout: 2000 });
      }
    });

    test('should validate plain English input length', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      // Too short input
      await contractCreatePage.plainEnglishTextarea.fill('short');
      await contractCreatePage.plainEnglishTextarea.blur();
      
      const shortError = page.getByText(/description.*short/i);
      await expect(shortError).toBeVisible({ timeout: 2000 });
      
      // Valid input
      const validInput = 'I need a comprehensive service agreement for web development services. The contractor will develop a website with modern features.';
      await contractCreatePage.plainEnglishTextarea.fill(validInput);
      await contractCreatePage.plainEnglishTextarea.blur();
      
      await expect(shortError).not.toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle server validation errors', async ({ page }) => {
      // Mock server validation errors
      await page.route('**/contracts', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: [
                {
                  loc: ['body', 'title'],
                  msg: 'Title must be unique',
                  type: 'value_error'
                },
                {
                  loc: ['body', 'contract_value'],
                  msg: 'Contract value must be positive',
                  type: 'value_error'
                }
              ]
            })
          });
        } else {
          await route.continue();
        }
      });

      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });

      const testContract = TestContract.serviceAgreement();
      await contractCreatePage.goto('/contracts/new');
      await contractCreatePage.createContract(testContract);
      
      // Should display server validation errors
      await expect(page.getByText('Title must be unique')).toBeVisible();
      await expect(page.getByText('Contract value must be positive')).toBeVisible();
    });

    test('should handle network errors', async ({ page }) => {
      // Mock network failure
      await page.route('**/contracts', async route => {
        await route.abort('internetdisconnected');
      });

      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });

      const testContract = TestContract.serviceAgreement();
      await contractCreatePage.goto('/contracts/new');
      await contractCreatePage.createContract(testContract);
      
      // Should show network error message
      await expect(page.getByText(/network error|connection failed/i)).toBeVisible();
    });

    test('should handle timeout errors', async ({ page }) => {
      // Mock slow server response
      await page.route('**/contracts', async route => {
        await new Promise(resolve => setTimeout(resolve, 35000));
        await route.continue();
      });

      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });

      const testContract = TestContract.serviceAgreement();
      await contractCreatePage.goto('/contracts/new');
      await contractCreatePage.createContract(testContract);
      
      // Should show timeout error
      await expect(page.getByText(/timeout|took too long/i)).toBeVisible({ timeout: 40000 });
    });

    test('should provide retry functionality', async ({ page }) => {
      let attemptCount = 0;
      
      await page.route('**/contracts', async route => {
        attemptCount++;
        if (attemptCount === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: 'Server error'
            })
          });
        } else {
          // Success on retry
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'retry-success-contract',
              title: 'Retry Success Contract',
              status: 'draft'
            })
          });
        }
      });

      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com' },
            token: 'mock-token'
          }
        }));
      });

      const testContract = TestContract.serviceAgreement();
      await contractCreatePage.goto('/contracts/new');
      await contractCreatePage.createContract(testContract);
      
      // Should show error first
      await expect(page.getByText('Server error')).toBeVisible();
      
      // Should show retry button
      const retryButton = page.getByRole('button', { name: /retry/i });
      await expect(retryButton).toBeVisible();
      
      // Click retry
      await retryButton.click();
      
      // Should succeed on retry
      await expect(page).toHaveURL(/\/contracts\/retry-success-contract/);
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      // Check that all form inputs have associated labels
      const inputs = await page.locator('input, textarea, select').all();
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('should have proper error message associations', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      await contractCreatePage.createButton.click();
      
      // Check that error messages are properly associated with inputs
      const errorMessages = await page.locator('[role="alert"], [aria-live="polite"]').all();
      
      for (const error of errorMessages) {
        const id = await error.getAttribute('id');
        if (id) {
          const associatedInput = page.locator(`[aria-describedby*="${id}"]`);
          const hasAssociation = await associatedInput.count() > 0;
          expect(hasAssociation).toBeTruthy();
        }
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      const firstInput = await page.locator(':focus').getAttribute('name');
      expect(firstInput).toBeTruthy();
      
      // Continue tabbing to ensure logical tab order
      await page.keyboard.press('Tab');
      const secondInput = await page.locator(':focus').getAttribute('name');
      expect(secondInput).toBeTruthy();
      expect(secondInput).not.toBe(firstInput);
    });

    test('should announce validation errors to screen readers', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      // Trigger validation error
      await contractCreatePage.titleInput.focus();
      await contractCreatePage.titleInput.blur();
      
      // Check for aria-live region or role="alert"
      const errorAnnouncement = page.locator('[role="alert"], [aria-live="polite"]');
      await expect(errorAnnouncement).toBeVisible({ timeout: 2000 });
    });
  });
});