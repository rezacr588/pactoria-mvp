import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Global setup for Playwright E2E tests
 * Runs once before all tests begin
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E Test Suite Setup');
  
  // Get base URL from config
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:5173';
  console.log(`📍 Base URL: ${baseURL}`);

  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Verify application is running
    console.log('🔍 Checking application availability...');
    
    const response = await page.goto(baseURL, { 
      timeout: 30000,
      waitUntil: 'domcontentloaded' 
    });
    
    if (!response || response.status() !== 200) {
      throw new Error(`Application not accessible at ${baseURL}. Status: ${response?.status()}`);
    }
    
    console.log('✅ Application is accessible');

    // 2. Check if backend API is responding (if needed)
    const apiBaseUrl = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    
    try {
      const healthResponse = await page.request.get(`${apiBaseUrl}/health`, {
        timeout: 10000
      });
      
      if (healthResponse.ok()) {
        console.log('✅ Backend API is responding');
      } else {
        console.log('⚠️ Backend API not responding - tests will use mocked responses');
      }
    } catch (error) {
      console.log('⚠️ Backend API not available - tests will use mocked responses');
    }

    // 3. Clear any existing test data
    console.log('🧹 Clearing existing test data...');
    await page.evaluate(() => {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB if used
      if (window.indexedDB) {
        // This is a simplified cleanup - adjust based on your app's usage
        try {
          window.indexedDB.deleteDatabase('test-db');
        } catch (e) {
          // Ignore errors
        }
      }
    });

    // 4. Set up test environment flags
    console.log('🛠️ Setting up test environment...');
    await page.addInitScript(() => {
      // Mark as test environment
      window.__PLAYWRIGHT_TEST__ = true;
      
      // Disable animations for more reliable testing
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
      
      // Mock console methods to reduce noise in tests
      const originalConsole = { ...console };
      console.debug = () => {};
      console.log = (...args) => {
        if (args.some(arg => typeof arg === 'string' && arg.includes('[TEST]'))) {
          originalConsole.log(...args);
        }
      };
    });

    // 5. Create test user if needed (for tests that require real backend)
    if (process.env.CREATE_TEST_USER === 'true') {
      console.log('👤 Creating test user...');
      
      try {
        const testUserResponse = await page.request.post(`${apiBaseUrl}/auth/register`, {
          data: {
            email: 'e2e-test@example.com',
            password: 'TestPassword123!',
            full_name: 'E2E Test User',
            company_name: 'E2E Test Company'
          },
          timeout: 10000
        });

        if (testUserResponse.ok()) {
          console.log('✅ Test user created successfully');
        } else {
          console.log('ℹ️ Test user may already exist or using mocked auth');
        }
      } catch (error) {
        console.log('⚠️ Could not create test user - using mocked authentication');
      }
    }

    // 6. Warm up the application
    console.log('🔥 Warming up application...');
    
    // Navigate to key pages to ensure they load properly
    const keyPages = ['/', '/login'];
    
    for (const route of keyPages) {
      try {
        await page.goto(`${baseURL}${route}`, { 
          timeout: 15000,
          waitUntil: 'domcontentloaded' 
        });
        console.log(`✅ Warmed up: ${route}`);
      } catch (error) {
        console.log(`⚠️ Could not warm up: ${route}`);
      }
    }

    // 7. Set up global test data storage
    const testDataPath = path.join(__dirname, 'test-data-temp.json');
    const testData = {
      baseURL,
      apiBaseUrl,
      timestamp: new Date().toISOString(),
      testRunId: `test-${Date.now()}`,
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport: await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight
      }))
    };

    // Save test data for use in tests
    const fs = await import('fs');
    fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));

    console.log('✅ Global setup completed successfully');
    console.log(`📊 Test Run ID: ${testData.testRunId}`);
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;