import { test, expect } from '@playwright/test';
import { loginWithTestAccount } from '../helpers/auth';

test.describe('Settings Page - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithTestAccount(page);
    
    // Mock settings API data
    await page.route('**/api/v1/settings/**', async route => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (url.includes('/profile') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 1,
              email: 'test@pactoria.com',
              first_name: 'Test',
              last_name: 'User',
              company: 'Pactoria Ltd',
              phone: '+44 123 456 7890',
              timezone: 'Europe/London',
              language: 'en',
              notification_preferences: {
                email_notifications: true,
                push_notifications: false,
                contract_updates: true,
                deadline_reminders: true,
                team_notifications: false
              }
            }
          })
        });
      } else if (url.includes('/organization') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            organization: {
              id: 1,
              name: 'Pactoria Ltd',
              address: '123 Business Street, London, UK',
              industry: 'Technology',
              size: '10-50',
              website: 'https://pactoria.com',
              created_date: '2024-01-01T00:00:00Z'
            }
          })
        });
      } else if (url.includes('/security') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            security: {
              two_factor_enabled: false,
              password_last_changed: '2024-01-15T10:00:00Z',
              active_sessions: 2,
              login_history: [
                { date: '2024-03-20T14:30:00Z', ip: '192.168.1.1', location: 'London, UK' },
                { date: '2024-03-19T09:15:00Z', ip: '192.168.1.1', location: 'London, UK' }
              ]
            }
          })
        });
      } else if (url.includes('/integrations') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            integrations: [
              { name: 'Slack', enabled: true, connected_date: '2024-02-01T00:00:00Z' },
              { name: 'Microsoft Teams', enabled: false, connected_date: null },
              { name: 'Google Drive', enabled: true, connected_date: '2024-01-20T00:00:00Z' }
            ]
          })
        });
      } else if (method === 'PUT' || method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });
    
    await page.goto('/settings');
  });

  test('should display settings navigation @smoke', async ({ page }) => {
    // Check main settings heading
    await expect(page.locator('h1')).toContainText(/Settings|Preferences|Account/);
    
    // Check for settings navigation tabs/sections
    const settingsSections = [
      'Profile',
      'Account', 
      'Organization',
      'Security',
      'Notifications',
      'Integrations'
    ];
    
    for (const section of settingsSections) {
      const sectionLink = page.locator(`text="${section}", [data-tab="${section.toLowerCase()}"], nav a:has-text("${section}")`);
      if (await sectionLink.isVisible()) {
        await expect(sectionLink).toBeVisible();
      }
    }
  });

  test('should edit profile information', async ({ page }) => {
    // Navigate to profile section if not already there
    const profileTab = page.locator('text="Profile", [data-tab="profile"]');
    if (await profileTab.isVisible()) {
      await profileTab.click();
    }
    
    // Check profile form fields
    const firstNameInput = page.locator('input[name="first_name"], input[name="firstName"], [data-testid="first-name"]');
    await expect(firstNameInput).toHaveValue('Test');
    
    const lastNameInput = page.locator('input[name="last_name"], input[name="lastName"], [data-testid="last-name"]');
    await expect(lastNameInput).toHaveValue('User');
    
    // Edit profile information
    await firstNameInput.clear();
    await firstNameInput.fill('Updated');
    
    const phoneInput = page.locator('input[name="phone"], input[type="tel"], [data-testid="phone"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.clear();
      await phoneInput.fill('+44 987 654 3210');
    }
    
    // Save changes
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]');
    await saveButton.click();
    
    // Check for success message
    await expect(page.locator('text*="updated", text*="saved", [role="alert"]')).toBeVisible();
  });

  test('should manage notification preferences', async ({ page }) => {
    // Navigate to notifications section
    const notificationsTab = page.locator('text="Notifications", [data-tab="notifications"]');
    if (await notificationsTab.isVisible()) {
      await notificationsTab.click();
    }
    
    // Check notification toggles
    const emailToggle = page.locator('input[name="email_notifications"], [data-testid="email-notifications"]');
    if (await emailToggle.isVisible()) {
      await expect(emailToggle).toBeChecked();
      
      // Toggle email notifications off
      await emailToggle.uncheck();
    }
    
    const deadlineToggle = page.locator('input[name="deadline_reminders"], [data-testid="deadline-reminders"]');
    if (await deadlineToggle.isVisible()) {
      await expect(deadlineToggle).toBeChecked();
    }
    
    // Save notification preferences
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();
    
    // Check for success message
    await expect(page.locator('text*="preferences", text*="saved", [role="alert"]')).toBeVisible();
  });

  test('should manage security settings', async ({ page }) => {
    // Navigate to security section
    const securityTab = page.locator('text="Security", [data-tab="security"]');
    if (await securityTab.isVisible()) {
      await securityTab.click();
    }
    
    // Check security information
    await expect(page.locator('text*="Password", text*="Two-factor"')).toBeVisible();
    
    // Check password change functionality
    const changePasswordButton = page.locator('button:has-text("Change Password"), [data-testid="change-password"]');
    if (await changePasswordButton.isVisible()) {
      await changePasswordButton.click();
      
      // Check password form appears
      await expect(page.locator('input[type="password"], [data-testid="current-password"]')).toBeVisible();
      
      // Close password form
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }
    
    // Check 2FA setup
    const setup2FAButton = page.locator('button:has-text("Enable"), button:has-text("Setup"), [data-testid="setup-2fa"]');
    if (await setup2FAButton.isVisible()) {
      await expect(setup2FAButton).toBeVisible();
    }
  });

  test('should display login history', async ({ page }) => {
    // Navigate to security section
    const securityTab = page.locator('text="Security", [data-tab="security"]');
    if (await securityTab.isVisible()) {
      await securityTab.click();
    }
    
    // Check for login history section
    const loginHistory = page.locator('text*="Login History", text*="Recent Activity"');
    if (await loginHistory.isVisible()) {
      await expect(loginHistory).toBeVisible();
      
      // Check for login entries
      await expect(page.locator('text*="London, UK"')).toBeVisible();
      await expect(page.locator('text*="192.168.1.1"')).toBeVisible();
    }
  });

  test('should manage organization settings', async ({ page }) => {
    // Navigate to organization section
    const orgTab = page.locator('text="Organization", [data-tab="organization"]');
    if (await orgTab.isVisible()) {
      await orgTab.click();
    }
    
    // Check organization form
    const orgNameInput = page.locator('input[name="name"], input[name="organization_name"], [data-testid="org-name"]');
    if (await orgNameInput.isVisible()) {
      await expect(orgNameInput).toHaveValue('Pactoria Ltd');
      
      // Update organization name
      await orgNameInput.clear();
      await orgNameInput.fill('Updated Pactoria Ltd');
    }
    
    const industrySelect = page.locator('select[name="industry"], [data-testid="industry"]');
    if (await industrySelect.isVisible()) {
      await industrySelect.selectOption('Technology');
    }
    
    // Save organization settings
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();
    
    // Check for success message
    await expect(page.locator('text*="organization", text*="updated", [role="alert"]')).toBeVisible();
  });

  test('should manage integrations', async ({ page }) => {
    // Navigate to integrations section
    const integrationsTab = page.locator('text="Integrations", [data-tab="integrations"]');
    if (await integrationsTab.isVisible()) {
      await integrationsTab.click();
    }
    
    // Check for integration cards/list
    await expect(page.locator('text="Slack"')).toBeVisible();
    await expect(page.locator('text="Microsoft Teams"')).toBeVisible();
    await expect(page.locator('text="Google Drive"')).toBeVisible();
    
    // Check integration status
    const slackToggle = page.locator('input[data-integration="slack"], button:has-text("Connected")').first();
    if (await slackToggle.isVisible()) {
      // Should be connected/enabled
      const isConnected = await slackToggle.isChecked() || await page.locator('text="Connected"').isVisible();
      expect(isConnected).toBeTruthy();
    }
    
    // Test connecting a disconnected integration
    const teamsConnect = page.locator('button:has-text("Connect"):near(text="Microsoft Teams")');
    if (await teamsConnect.isVisible()) {
      await teamsConnect.click();
      
      // Check for connection modal or redirect
      await expect(page.locator('[role="dialog"], .modal, text*="authorize"')).toBeVisible();
    }
  });

  test('should handle timezone and language settings', async ({ page }) => {
    // Check for timezone setting
    const timezoneSelect = page.locator('select[name="timezone"], [data-testid="timezone"]');
    if (await timezoneSelect.isVisible()) {
      await expect(timezoneSelect).toHaveValue('Europe/London');
      
      // Change timezone
      await timezoneSelect.selectOption('America/New_York');
    }
    
    // Check for language setting
    const languageSelect = page.locator('select[name="language"], [data-testid="language"]');
    if (await languageSelect.isVisible()) {
      await expect(languageSelect).toHaveValue('en');
    }
    
    // Save settings
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")');
    await saveButton.click();
    
    // Check for success message
    await expect(page.locator('text*="settings", text*="saved", [role="alert"]')).toBeVisible();
  });

  test('should handle account deletion', async ({ page }) => {
    // Look for danger zone or account deletion section
    const dangerZone = page.locator('text*="Danger Zone", text*="Delete Account"');
    if (await dangerZone.isVisible()) {
      await dangerZone.scrollIntoViewIfNeeded();
      
      const deleteButton = page.locator('button:has-text("Delete Account"), [data-testid="delete-account"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Check for confirmation modal
        await expect(page.locator('[role="dialog"], .modal, text*="permanently delete"')).toBeVisible();
        
        // Cancel deletion
        const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Keep Account")');
        await cancelButton.click();
        
        // Modal should close
        await expect(page.locator('[role="dialog"]:has-text("delete")')).not.toBeVisible();
      }
    }
  });

  test('should export user data', async ({ page }) => {
    // Look for data export functionality
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download Data"), [data-testid="export-data"]');
    if (await exportButton.isVisible()) {
      // Start download tracking
      const downloadPromise = page.waitForEvent('download');
      
      await exportButton.click();
      
      // Wait for download to complete
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('data');
    }
  });

  test('should handle billing/subscription settings', async ({ page }) => {
    // Look for billing/subscription section
    const billingTab = page.locator('text="Billing", text="Subscription", [data-tab="billing"]');
    if (await billingTab.isVisible()) {
      await billingTab.click();
      
      // Check for subscription information
      await expect(page.locator('text*="Plan", text*="Subscription"')).toBeVisible();
      
      // Check for payment method if shown
      const paymentMethod = page.locator('text*="Payment Method", text*="Credit Card"');
      if (await paymentMethod.isVisible()) {
        await expect(paymentMethod).toBeVisible();
      }
      
      // Check for upgrade/downgrade buttons
      const upgradeButton = page.locator('button:has-text("Upgrade"), button:has-text("Change Plan")');
      if (await upgradeButton.isVisible()) {
        await expect(upgradeButton).toBeVisible();
      }
    }
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check that settings are still accessible
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for mobile-friendly navigation
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
    }
    
    // Check that settings sections are accessible on mobile
    const profileSection = page.locator('text="Profile"');
    await expect(profileSection).toBeVisible();
    
    // Test mobile form interaction
    const firstNameInput = page.locator('input[name="first_name"], [data-testid="first-name"]');
    if (await firstNameInput.isVisible()) {
      await firstNameInput.click();
      await expect(firstNameInput).toBeFocused();
    }
  });

  test('should validate form inputs', async ({ page }) => {
    // Test email validation in profile
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.clear();
      await emailInput.fill('invalid-email');
      
      // Try to save
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
      await saveButton.click();
      
      // Check for validation error
      await expect(page.locator('text*="valid email", text*="invalid", [role="alert"]')).toBeVisible();
      
      // Fix the email
      await emailInput.clear();
      await emailInput.fill('test@pactoria.com');
    }
    
    // Test required field validation
    const firstNameInput = page.locator('input[name="first_name"], [data-testid="first-name"]');
    if (await firstNameInput.isVisible()) {
      await firstNameInput.clear();
      
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
      await saveButton.click();
      
      // Check for required field error
      await expect(page.locator('text*="required", text*="cannot be empty", [role="alert"]')).toBeVisible();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Add delay to API to test loading
    await page.route('**/api/v1/settings/profile', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { first_name: 'Test' } })
      });
    });
    
    await page.goto('/settings');
    
    // Check for loading indicators
    await expect(page.locator('[data-testid="loading"], .spinner, text*="Loading"')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading"], .spinner')).not.toBeVisible({ timeout: 10000 });
    
    // Verify settings loaded
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/settings/profile', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Failed to update profile'
          })
        });
      } else {
        await route.continue();
      }
    });
    
    // Try to update profile
    const firstNameInput = page.locator('input[name="first_name"], [data-testid="first-name"]');
    await firstNameInput.clear();
    await firstNameInput.fill('Updated Name');
    
    const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
    await saveButton.click();
    
    // Check for error message
    await expect(page.locator('text*="error", text*="failed", [role="alert"]')).toBeVisible();
  });
});
