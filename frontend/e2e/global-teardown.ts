import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Global teardown for Playwright E2E tests
 * Runs once after all tests complete
 */
async function globalTeardown(config: FullConfig) {
  console.log('🏁 Starting E2E Test Suite Teardown');

  // Get base URL and API URL from config/environment
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:5173';
  const apiBaseUrl = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  // Launch browser for cleanup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Load test data if available
    console.log('📊 Loading test run data...');
    const testDataPath = path.join(__dirname, 'test-data-temp.json');
    let testData = null;
    
    try {
      const fs = await import('fs');
      if (fs.existsSync(testDataPath)) {
        const testDataContent = fs.readFileSync(testDataPath, 'utf-8');
        testData = JSON.parse(testDataContent);
        console.log(`📅 Test Run ID: ${testData.testRunId}`);
        console.log(`⏱️ Started: ${testData.timestamp}`);
      }
    } catch (error) {
      console.log('ℹ️ No test data file found');
    }

    // 2. Clean up test user and data (if using real backend)
    if (process.env.CLEANUP_TEST_DATA === 'true') {
      console.log('🧹 Cleaning up test data...');
      
      try {
        // Check if backend is available
        const healthResponse = await page.request.get(`${apiBaseUrl}/health`, {
          timeout: 5000
        });

        if (healthResponse.ok()) {
          console.log('🔄 Backend available - cleaning up test user...');
          
          // Delete test user (if endpoint exists)
          try {
            await page.request.delete(`${apiBaseUrl}/test/cleanup/user/e2e-test@example.com`, {
              timeout: 10000
            });
            console.log('✅ Test user cleaned up');
          } catch (error) {
            console.log('ℹ️ Test user cleanup not available or not needed');
          }

          // Clean up test contracts/data
          try {
            await page.request.delete(`${apiBaseUrl}/test/cleanup/data`, {
              timeout: 10000
            });
            console.log('✅ Test data cleaned up');
          } catch (error) {
            console.log('ℹ️ Test data cleanup not available or not needed');
          }
        } else {
          console.log('ℹ️ Backend not available - skipping data cleanup');
        }
      } catch (error) {
        console.log('ℹ️ Could not connect to backend for cleanup');
      }
    }

    // 3. Clear browser data
    console.log('🧹 Clearing browser test data...');
    
    try {
      await page.goto(baseURL, { timeout: 10000 });
      
      await page.evaluate(() => {
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear IndexedDB
        if (window.indexedDB) {
          try {
            // Get all databases and clear them
            const dbs = ['test-db', 'pactoria-cache', 'user-preferences'];
            dbs.forEach(dbName => {
              try {
                window.indexedDB.deleteDatabase(dbName);
              } catch (e) {
                // Ignore individual database errors
              }
            });
          } catch (e) {
            // Ignore errors
          }
        }

        // Clear any test cookies
        if (document.cookie) {
          const cookies = document.cookie.split(';');
          cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          });
        }
      });

      console.log('✅ Browser data cleared');
    } catch (error) {
      console.log('⚠️ Could not clear browser data:', error.message);
    }

    // 4. Generate test report summary
    console.log('📋 Generating test summary...');
    
    const testSummary = {
      testRunId: testData?.testRunId || 'unknown',
      startTime: testData?.timestamp || 'unknown',
      endTime: new Date().toISOString(),
      environment: {
        baseURL,
        apiBaseUrl,
        userAgent: testData?.userAgent || 'unknown',
        viewport: testData?.viewport || { width: 0, height: 0 }
      },
      cleanup: {
        browserDataCleared: true,
        testUserCleaned: process.env.CLEANUP_TEST_DATA === 'true',
        backendDataCleaned: process.env.CLEANUP_TEST_DATA === 'true'
      }
    };

    // Save test summary
    try {
      const fs = await import('fs');
      const summaryPath = path.join(__dirname, 'test-summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(testSummary, null, 2));
      console.log(`📄 Test summary saved to: ${summaryPath}`);
    } catch (error) {
      console.log('⚠️ Could not save test summary');
    }

    // 5. Clean up temporary files
    console.log('🧹 Cleaning up temporary files...');
    
    try {
      const fs = await import('fs');
      
      // Remove temporary test data file
      if (fs.existsSync(testDataPath)) {
        fs.unlinkSync(testDataPath);
        console.log('✅ Temporary test data file removed');
      }

      // Clean up any screenshots or videos older than 7 days (if configured)
      const testResultsDir = path.join(__dirname, '..', 'test-results');
      if (fs.existsSync(testResultsDir)) {
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        try {
          const files = fs.readdirSync(testResultsDir);
          files.forEach(file => {
            const filePath = path.join(testResultsDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime.getTime() < sevenDaysAgo) {
              fs.unlinkSync(filePath);
              console.log(`🗑️ Cleaned up old test file: ${file}`);
            }
          });
        } catch (error) {
          console.log('ℹ️ Could not clean up old test files');
        }
      }

    } catch (error) {
      console.log('⚠️ Could not clean up temporary files');
    }

    // 6. Display test run statistics
    console.log('\n📊 Test Run Summary:');
    console.log('═══════════════════════════════════════');
    
    if (testData) {
      const startTime = new Date(testData.timestamp);
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      
      console.log(`🕐 Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
      console.log(`🌐 Environment: ${baseURL}`);
      console.log(`🔧 API: ${apiBaseUrl}`);
      console.log(`🆔 Run ID: ${testData.testRunId}`);
    }
    
    console.log('═══════════════════════════════════════\n');

    // 7. Final checks and warnings
    console.log('⚠️ Post-test reminders:');
    
    if (process.env.CI) {
      console.log('• Running in CI environment');
    } else {
      console.log('• Local development environment');
    }
    
    if (process.env.CLEANUP_TEST_DATA !== 'true') {
      console.log('• Test data cleanup disabled - manual cleanup may be needed');
    }
    
    if (!process.env.CREATE_TEST_USER) {
      console.log('• Test user creation disabled - using mocked authentication');
    }

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown encountered an error:', error);
    // Don't throw here - we want tests to complete even if teardown fails
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('🎉 E2E Test Suite Complete!\n');
}

export default globalTeardown;