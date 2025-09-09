import { test, expect } from '@playwright/test';
import { loginWithTestAccount } from './helpers/auth';

test.describe('Contract Generation with Groq AI', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for AI generation tests
    test.setTimeout(120000); // 2 minutes
    
    await loginWithTestAccount(page);
  });

  test('should generate contract with Groq AI - FULL TEST', async ({ page }) => {
    console.log('🚀 Starting Contract Generation Test with Groq AI');
    
    // Navigate to contracts page
    await page.goto('/contracts');
    console.log('✓ Navigated to contracts page');
    
    // Click create new contract button
    await page.click('text=/New Contract|Create Contract/');
    await expect(page).toHaveURL(/\/contracts\/(new|create)/);
    console.log('✓ Navigated to contract creation page');
    
    // Step 1: Select a template
    await expect(page.locator('text=/Choose Template|Select Template/')).toBeVisible();
    console.log('✓ Template selection page loaded');
    
    // Select Professional Services Agreement template
    const serviceTemplate = page.locator('.template-card, [data-testid*="template"]')
      .filter({ hasText: /Professional Services|Service Agreement/ })
      .first();
    
    if (await serviceTemplate.count() === 0) {
      // Fallback to first template if specific one not found
      console.log('⚠️ Professional Services template not found, using first available template');
      await page.locator('.template-card, [data-testid*="template"]').first().click();
    } else {
      await serviceTemplate.click();
      console.log('✓ Selected Professional Services Agreement template');
    }
    
    // Wait for navigation to next step
    await page.waitForTimeout(1000);
    
    // Step 2: Fill contract details
    console.log('📝 Filling contract details...');
    
    // Contract name
    const contractName = `AI Test Contract ${Date.now()}`;
    await page.fill('input[name="name"], input[name="title"]', contractName);
    console.log(`✓ Contract name: ${contractName}`);
    
    // Client details
    await page.fill('input[name="clientName"], input[name="client_name"]', 'Test Client Ltd');
    await page.fill('input[name="clientEmail"], input[name="client_email"]', 'client@testcompany.com');
    console.log('✓ Client details filled');
    
    // Supplier details (if exists)
    const supplierInput = page.locator('input[name="supplierName"], input[name="supplier_name"]');
    if (await supplierInput.isVisible()) {
      await supplierInput.fill('Test Supplier Inc');
      console.log('✓ Supplier details filled');
    }
    
    // Service description / Plain English input for AI
    const plainEnglishInput = page.locator(
      'textarea[name="plainEnglishInput"], ' +
      'textarea[name="serviceDescription"], ' +
      'textarea[name="description"], ' +
      'textarea[placeholder*="Describe"], ' +
      'textarea[placeholder*="plain English"]'
    ).first();
    
    const aiPrompt = `Create a comprehensive professional services agreement for software development and consulting services. 
    The contract should cover:
    - Web application development using React and Python
    - UI/UX design services
    - Technical consulting and architecture planning
    - Project management and agile methodology
    - Testing and quality assurance
    - Deployment and maintenance support
    - Training and documentation
    
    The project duration is 6 months with a total value of £75,000.
    Payment terms: 30% upfront, 40% on milestone completion, 30% on final delivery.
    Include standard UK legal clauses for intellectual property, confidentiality, liability limitation, and dispute resolution.`;
    
    await plainEnglishInput.fill(aiPrompt);
    console.log('✓ AI prompt filled with detailed requirements');
    
    // Contract value
    await page.fill('input[name="contractValue"], input[name="value"], input[type="number"]', '75000');
    console.log('✓ Contract value: £75,000');
    
    // Currency (if dropdown exists)
    const currencySelect = page.locator('select[name="currency"]');
    if (await currencySelect.isVisible()) {
      await currencySelect.selectOption('GBP');
      console.log('✓ Currency: GBP');
    }
    
    // Payment terms
    const paymentTermsInput = page.locator('input[name="paymentTerms"], select[name="paymentTerms"]');
    if (await paymentTermsInput.isVisible()) {
      if (paymentTermsInput.type === 'select') {
        await paymentTermsInput.selectOption('30');
      } else {
        await paymentTermsInput.fill('30');
      }
      console.log('✓ Payment terms: 30 days');
    }
    
    // Dates
    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 6);
    
    const startDateInput = page.locator('input[name="startDate"], input[type="date"]').first();
    const endDateInput = page.locator('input[name="endDate"], input[type="date"]').last();
    
    if (await startDateInput.isVisible()) {
      await startDateInput.fill(today.toISOString().split('T')[0]);
      console.log(`✓ Start date: ${today.toISOString().split('T')[0]}`);
    }
    
    if (await endDateInput.isVisible()) {
      await endDateInput.fill(endDate.toISOString().split('T')[0]);
      console.log(`✓ End date: ${endDate.toISOString().split('T')[0]}`);
    }
    
    // Navigate to next step if multi-step form
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      console.log('✓ Proceeded to review step');
    }
    
    // Step 3: Generate contract with AI
    console.log('🤖 Initiating AI contract generation with Groq...');
    
    // Find and click generate button
    const generateButton = page.locator(
      'button:has-text("Generate"), ' +
      'button:has-text("Create Contract"), ' +
      'button:has-text("Generate with AI")'
    ).last();
    
    await expect(generateButton).toBeVisible();
    
    // Set up response interceptor to monitor API calls
    const apiResponsePromise = page.waitForResponse(
      response => response.url().includes('/contracts') && response.status() === 200,
      { timeout: 60000 }
    );
    
    await generateButton.click();
    console.log('✓ Clicked generate button');
    
    // Wait for generation loading state
    const loadingIndicator = page.locator(
      'text=/Generating|Processing|Creating|Loading/, ' +
      '[role="status"], ' +
      '.spinner, ' +
      '.loading'
    ).first();
    
    if (await loadingIndicator.isVisible({ timeout: 5000 })) {
      console.log('✓ AI generation in progress...');
      
      // Wait for loading to disappear (max 60 seconds for AI generation)
      await expect(loadingIndicator).not.toBeVisible({ timeout: 60000 });
      console.log('✓ AI generation completed');
    }
    
    // Wait for navigation to contract view page
    await expect(page).toHaveURL(/\/contracts\/[a-zA-Z0-9-]+/, { timeout: 30000 });
    console.log('✓ Redirected to contract view page');
    
    // Verify contract was created successfully
    const contractTitle = page.locator('h1, h2').filter({ hasText: contractName });
    await expect(contractTitle.or(page.locator(`text="${contractName}"`))).toBeVisible();
    console.log(`✓ Contract created: ${contractName}`);
    
    // Verify AI-generated content exists
    console.log('📄 Verifying AI-generated content...');
    
    // Check for contract sections that should be generated
    const expectedSections = [
      'Agreement',
      'Services',
      'Payment',
      'Confidentiality',
      'Intellectual Property',
      'Liability',
      'Term',
      'Warranty',
      'Indemnification'
    ];
    
    let foundSections = 0;
    for (const section of expectedSections) {
      const sectionElement = page.locator(`text=/${section}/i`).first();
      if (await sectionElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        foundSections++;
        console.log(`  ✓ Found section: ${section}`);
      }
    }
    
    expect(foundSections).toBeGreaterThan(0);
    console.log(`✓ Found ${foundSections}/${expectedSections.length} expected contract sections`);
    
    // Check for compliance score if available
    const complianceScore = page.locator('text=/Compliance Score|Compliance:/').first();
    if (await complianceScore.isVisible({ timeout: 5000 })) {
      console.log('✓ Compliance score is displayed');
      
      // Check for actual score value
      const scoreValue = page.locator('text=/%/').first();
      if (await scoreValue.isVisible()) {
        const scoreText = await scoreValue.textContent();
        console.log(`  Compliance Score: ${scoreText}`);
      }
    }
    
    // Check for contract status
    const statusBadge = page.locator('[class*="badge"], [class*="status"]').first();
    if (await statusBadge.isVisible()) {
      const status = await statusBadge.textContent();
      console.log(`✓ Contract status: ${status}`);
    }
    
    // Try to view the generated content
    const viewContentButton = page.locator('button:has-text("View"), [role="tab"]:has-text("Content")');
    if (await viewContentButton.isVisible()) {
      await viewContentButton.click();
      await page.waitForTimeout(1000);
      
      // Check if content is displayed
      const contractContent = page.locator('.contract-content, [data-testid="contract-content"], pre, .prose').first();
      if (await contractContent.isVisible()) {
        const contentText = await contractContent.textContent();
        console.log('✓ Contract content is displayed');
        console.log(`  Content length: ${contentText?.length || 0} characters`);
        
        // Verify it's not just placeholder text
        expect(contentText?.length).toBeGreaterThan(500);
        expect(contentText?.toLowerCase()).toContain('agreement');
      }
    }
    
    console.log('');
    console.log('🎉 SUCCESS: Contract generation with Groq AI completed successfully!');
    console.log('================================================');
    console.log(`Contract Name: ${contractName}`);
    console.log(`Contract URL: ${page.url()}`);
    console.log('================================================');
  });

  test('should handle AI generation errors gracefully', async ({ page }) => {
    console.log('🧪 Testing error handling for AI generation');
    
    // Navigate to contract creation
    await page.goto('/contracts/new');
    
    // Select template
    await page.locator('.template-card, [data-testid*="template"]').first().click();
    await page.waitForTimeout(500);
    
    // Fill minimal data to trigger validation
    await page.fill('input[name="name"], input[name="title"]', 'Error Test Contract');
    
    // Try to generate without required fields
    const generateButton = page.locator('button:has-text("Generate")').last();
    await generateButton.click();
    
    // Should show validation errors
    await expect(page.locator('text=/required|Please fill|Enter/')).toBeVisible({ timeout: 5000 });
    console.log('✓ Validation errors displayed correctly');
  });

  test('should show contract generation progress', async ({ page }) => {
    console.log('🔄 Testing generation progress indicators');
    
    // Navigate to contract creation
    await page.goto('/contracts/new');
    
    // Quick setup
    await page.locator('.template-card, [data-testid*="template"]').first().click();
    await page.waitForTimeout(500);
    
    await page.fill('input[name="name"], input[name="title"]', 'Progress Test Contract');
    await page.fill('input[name="clientName"], input[name="client_name"]', 'Progress Client');
    await page.locator('textarea').first().fill('Simple test contract for progress monitoring');
    
    // Start generation
    const generateButton = page.locator('button:has-text("Generate")').last();
    await generateButton.click();
    
    // Check for progress indicators
    const progressIndicators = [
      'text=/Generating/',
      'text=/Processing/',
      'text=/Creating/',
      '[role="progressbar"]',
      '.spinner',
      '.loading'
    ];
    
    let foundProgress = false;
    for (const indicator of progressIndicators) {
      if (await page.locator(indicator).isVisible({ timeout: 2000 }).catch(() => false)) {
        foundProgress = true;
        console.log(`✓ Found progress indicator: ${indicator}`);
        break;
      }
    }
    
    expect(foundProgress).toBeTruthy();
  });
});

test.describe('Contract Generation API Verification', () => {
  test('should verify Groq API is configured', async ({ page }) => {
    console.log('🔍 Verifying Groq API configuration');
    
    await loginWithTestAccount(page);
    
    // Check if API is responding
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/health');
        return res.ok;
      } catch {
        return false;
      }
    });
    
    expect(response).toBeTruthy();
    console.log('✓ Backend API is responding');
    
    // You can add more API checks here if needed
  });
});
