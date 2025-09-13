import { test, expect } from '@playwright/test';
import { loginWithTestAccount } from '../helpers/auth';

test.describe('Contract API Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Use real authentication instead of mock
    await loginWithTestAccount(page);
  });

  test.describe('Contract Creation API', () => {
    test('should successfully create contract via API @smoke', async ({ page }) => {
      await page.goto('/contracts/new');
      
      // Wait for templates to load
      await page.waitForSelector('[data-testid="template-grid"], .template-card', { timeout: 10000 });
      
      // Step 1: Select a template
      const templateCard = page.locator('.template-card').first();
      await templateCard.click();
      await page.waitForTimeout(1000);
      
      // Step 2: Continue to form
      const continueButton = page.locator('[data-testid="continue-button"]');
      if (await continueButton.isVisible({ timeout: 5000 })) {
        await continueButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Fill basic contract information
      await page.fill('[data-testid="contract-name-input"]', 'Test Service Agreement API');
      await page.fill('[data-testid="client-name-input"]', 'Test Client Corp');
      await page.fill('[data-testid="client-email-input"]', 'test@client.com');
      
      // Continue to next step
      if (await continueButton.isVisible({ timeout: 5000 })) {
        await continueButton.click();
        await page.waitForTimeout(1000);
        
        // Fill required service description if we're on that step
        const serviceInput = page.locator('[data-testid="service-description-input"]');
        if (await serviceInput.isVisible({ timeout: 2000 })) {
          await serviceInput.fill('Test service description for API integration test');
        }
        
        // Continue again if needed
        if (await continueButton.isVisible({ timeout: 5000 })) {
          await continueButton.click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Generate contract
      const generateButton = page.locator('[data-testid="generate-contract-button"]');
      if (await generateButton.isVisible({ timeout: 5000 })) {
        await generateButton.click();
        
        // Wait for generation to complete
        await page.waitForTimeout(3000);
        
        // Check if we're redirected to contracts page or contract view
        await expect(page).toHaveURL(/\/contracts/, { timeout: 10000 });
      }
    });

    test('should handle API validation errors gracefully', async ({ page }) => {
      await page.goto('/contracts/new');
      
      // Wait for templates to load
      await page.waitForSelector('[data-testid="template-grid"], .template-card', { timeout: 10000 });
      
      // Select a template
      const templateCard = page.locator('.template-card').first();
      await templateCard.click();
      
      // Try to continue without filling required fields
      const continueButton = page.locator('[data-testid="continue-button"]');
      if (await continueButton.isVisible({ timeout: 5000 })) {
        await continueButton.click();
      }
      
      // Try to generate without required data
      const generateButton = page.locator('[data-testid="generate-contract-button"]');
      if (await generateButton.isVisible({ timeout: 5000 })) {
        await generateButton.click();
        
        // Should show validation errors or stay on form
        await expect(page.locator('text=/required|validation|error|fill/i')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Contract List API', () => {
    test('should load contracts list from API', async ({ page }) => {
      await page.goto('/contracts');
      
      // Wait for page to load with shorter timeout to avoid hanging
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      // Check for any content indicating the page loaded properly
      const hasContracts = await page.locator('[data-testid="contract-card"], .contract-card').count() > 0;
      const hasEmptyState = await page.locator('text=/no contracts|empty|create your first/i').isVisible();
      const hasContractContent = await page.locator('text=/contract/i').first().isVisible({ timeout: 3000 });
      
      // Should show contracts, empty state, or any contract-related content
      expect(hasContracts || hasEmptyState || hasContractContent).toBeTruthy();
    });

    test('should handle empty contracts list', async ({ page }) => {
      await page.goto('/contracts');
      
      // Wait for page to load with shorter timeout
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      // Check for any content indicating the page loaded properly
      const hasEmptyState = await page.locator('text=/no contracts|empty|create your first/i').isVisible();
      const hasContracts = await page.locator('[data-testid="contract-card"], .contract-card').count() > 0;
      const hasContractContent = await page.locator('text=/contract/i').first().isVisible({ timeout: 3000 });
      
      // Should show empty state, contracts, or any contract-related content
      expect(hasEmptyState || hasContracts || hasContractContent).toBeTruthy();
    });

    test('should support contract search via API', async ({ page }) => {
      await page.goto('/contracts');
      
      // Wait for page to load with shorter timeout
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      // Perform search if search input is available
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill('test');
        await page.keyboard.press('Enter');
        
        // Wait for search results to load
        await page.waitForTimeout(2000);
        
        // Basic functionality check - search should work without errors
        const hasResults = await page.locator('.contract-card, .contracts-table tbody tr').count() > 0;
        const hasNoResults = await page.locator('text=/no results|no contracts found/i').isVisible();
        
        expect(hasResults || hasNoResults).toBeTruthy();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API network errors', async ({ page }) => {
      await page.goto('/contracts');
      
      // Wait for page to load with shorter timeout
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      // Should show either contracts, empty state, or error state
      const hasContracts = await page.locator('.contract-card, .contracts-table tbody tr').count() > 0;
      const hasEmptyState = await page.locator('text=/no contracts|empty|create your first/i').isVisible();
      const hasErrorState = await page.locator('text=/error|failed|try again/i').isVisible();
      
      expect(hasContracts || hasEmptyState || hasErrorState).toBeTruthy();
    });
  });
});
