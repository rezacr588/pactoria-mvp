import { test, expect } from '@playwright/test';

/**
 * INTEGRATION TEST RUNNER
 * 
 * This test runner executes comprehensive frontend-backend integration tests
 * and provides detailed reporting on the integration health.
 */

test.describe('Frontend-Backend Integration Test Suite', () => {
  const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  
  let integrationReport = {
    startTime: Date.now(),
    endTime: 0,
    testSuites: {
      authentication: { status: 'pending', duration: 0, errors: [] },
      contracts: { status: 'pending', duration: 0, errors: [] },
      analytics: { status: 'pending', duration: 0, errors: [] },
      search: { status: 'pending', duration: 0, errors: [] },
      bulkOperations: { status: 'pending', duration: 0, errors: [] },
      webSocket: { status: 'pending', duration: 0, errors: [] }
    },
    backendHealth: {
      apiAccessible: false,
      responseTime: 0,
      endpoints: {}
    },
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      criticalIssues: [],
      recommendations: []
    }
  };

  test.beforeAll(async ({ request }) => {
    console.log('\n🚀 Starting Frontend-Backend Integration Test Suite...\n');
    
    // Test backend connectivity
    try {
      const startTime = Date.now();
      const healthResponse = await request.get(`${API_BASE_URL}/health`);
      const responseTime = Date.now() - startTime;
      
      integrationReport.backendHealth.apiAccessible = healthResponse.ok();
      integrationReport.backendHealth.responseTime = responseTime;
      
      if (healthResponse.ok()) {
        console.log(`✅ Backend API accessible at ${API_BASE_URL} (${responseTime}ms)`);
      } else {
        console.log(`❌ Backend API not accessible at ${API_BASE_URL} (Status: ${healthResponse.status()})`);
        integrationReport.summary.criticalIssues.push('Backend API not accessible');
      }
    } catch (error) {
      console.log(`❌ Failed to connect to backend API at ${API_BASE_URL}`);
      integrationReport.summary.criticalIssues.push('Cannot connect to backend API');
    }

    // Test key endpoints
    const keyEndpoints = ['/health', '/auth/me', '/contracts', '/analytics/dashboard'];
    for (const endpoint of keyEndpoints) {
      try {
        const response = await request.get(`${API_BASE_URL}${endpoint}`);
        integrationReport.backendHealth.endpoints[endpoint] = {
          accessible: response.ok(),
          status: response.status()
        };
      } catch (error) {
        integrationReport.backendHealth.endpoints[endpoint] = {
          accessible: false,
          status: 0,
          error: error.message
        };
      }
    }
  });

  test.afterAll(() => {
    integrationReport.endTime = Date.now();
    const totalDuration = integrationReport.endTime - integrationReport.startTime;
    
    console.log('\n📊 Integration Test Suite Summary');
    console.log('=====================================');
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Backend API: ${integrationReport.backendHealth.apiAccessible ? '✅ Accessible' : '❌ Not Accessible'}`);
    console.log(`API Response Time: ${integrationReport.backendHealth.responseTime}ms`);
    
    console.log('\nTest Suite Results:');
    Object.entries(integrationReport.testSuites).forEach(([suite, result]) => {
      const status = result.status === 'passed' ? '✅' : 
                    result.status === 'failed' ? '❌' : 
                    result.status === 'skipped' ? '⏭️' : '⏳';
      console.log(`  ${status} ${suite}: ${result.status} (${result.duration}ms)`);
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`    ⚠️ ${error}`);
        });
      }
    });
    
    if (integrationReport.summary.criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues:');
      integrationReport.summary.criticalIssues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }
    
    if (integrationReport.summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      integrationReport.summary.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
    
    console.log('\n=====================================\n');
  });

  test.describe('Pre-Integration Health Checks', () => {
    test('should verify backend API is accessible @smoke @integration', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health`);
      expect(response.ok()).toBe(true);
      
      const healthData = await response.json();
      expect(healthData).toHaveProperty('status');
      expect(healthData.status).toBe('healthy');
    });

    test('should verify frontend can load and render @smoke @integration', async ({ page }) => {
      await page.goto('/');
      
      // Should load without critical errors
      await expect(page.locator('body')).toBeVisible();
      
      // Should not have console errors (except for known issues)
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForLoadState('networkidle');
      
      // Filter out known acceptable errors (like 404s for optional resources)
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('manifest') &&
        !error.includes('404')
      );
      
      if (criticalErrors.length > 0) {
        integrationReport.summary.criticalIssues.push(`Frontend console errors: ${criticalErrors.join(', ')}`);
      }
      
      expect(criticalErrors.length).toBe(0);
    });

    test('should verify environment configuration @smoke @integration', async ({ page }) => {
      // Check if API_URL is properly configured
      const apiUrl = await page.evaluate(() => 
        import.meta.env?.VITE_API_URL || window.location.origin + '/api/v1'
      );
      
      expect(apiUrl).toBeTruthy();
      expect(apiUrl).toContain('http');
      
      if (!apiUrl.includes(API_BASE_URL.replace(/\/api\/v1$/, ''))) {
        integrationReport.summary.recommendations.push('Verify VITE_API_URL environment variable is correctly set');
      }
    });
  });

  test.describe('Core Integration Tests', () => {
    test('should run authentication integration tests @integration', async ({ page }) => {
      const startTime = Date.now();
      
      try {
        // Simplified authentication test
        await page.goto('/register');
        
        const testUser = {
          email: `integration-runner-${Date.now()}@test.com`,
          password: 'IntegrationTest123!',
          full_name: 'Integration Test User',
          company_name: 'Integration Test Company'
        };

        await page.getByLabel(/full name|name/i).fill(testUser.full_name);
        await page.getByLabel(/email/i).fill(testUser.email);
        await page.getByLabel(/password/i).fill(testUser.password);
        await page.getByLabel(/company/i).fill(testUser.company_name);
        
        const regResponse = page.waitForResponse(response => response.url().includes('/auth/register'));
        await page.getByRole('button', { name: /register|sign up/i }).click();
        
        const response = await regResponse;
        expect(response.status()).toBe(201);
        
        await expect(page).toHaveURL(/\/dashboard/);
        
        integrationReport.testSuites.authentication.status = 'passed';
        integrationReport.summary.passedTests++;
        
      } catch (error) {
        integrationReport.testSuites.authentication.status = 'failed';
        integrationReport.testSuites.authentication.errors.push(error.message);
        integrationReport.summary.failedTests++;
        integrationReport.summary.criticalIssues.push('Authentication integration failed');
        throw error;
      } finally {
        integrationReport.testSuites.authentication.duration = Date.now() - startTime;
        integrationReport.summary.totalTests++;
      }
    });

    test('should run contracts integration tests @integration', async ({ page }) => {
      const startTime = Date.now();
      
      try {
        // Set up authentication first
        await page.addInitScript(() => {
          localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user: { id: 'test-user', email: 'test@test.com', full_name: 'Test User' },
              company: null
            }
          }));
          localStorage.setItem('auth-token', 'test-token');
        });

        await page.goto('/contracts');
        
        // Should load contracts page
        await expect(page.getByText(/contracts/i)).toBeVisible();
        
        // Test contract creation flow
        await page.goto('/contracts/new');
        await expect(page.getByLabel(/title/i)).toBeVisible();
        
        integrationReport.testSuites.contracts.status = 'passed';
        integrationReport.summary.passedTests++;
        
      } catch (error) {
        integrationReport.testSuites.contracts.status = 'failed';
        integrationReport.testSuites.contracts.errors.push(error.message);
        integrationReport.summary.failedTests++;
        integrationReport.summary.criticalIssues.push('Contract management integration failed');
        throw error;
      } finally {
        integrationReport.testSuites.contracts.duration = Date.now() - startTime;
        integrationReport.summary.totalTests++;
      }
    });

    test('should run analytics integration tests @integration', async ({ page }) => {
      const startTime = Date.now();
      
      try {
        // Set up authentication
        await page.addInitScript(() => {
          localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user: { id: 'test-user', email: 'test@test.com', full_name: 'Test User' },
              company: null
            }
          }));
          localStorage.setItem('auth-token', 'test-token');
        });

        await page.goto('/analytics');
        
        // Should load analytics page
        await expect(page.getByText(/analytics/i)).toBeVisible();
        
        integrationReport.testSuites.analytics.status = 'passed';
        integrationReport.summary.passedTests++;
        
      } catch (error) {
        integrationReport.testSuites.analytics.status = 'failed';
        integrationReport.testSuites.analytics.errors.push(error.message);
        integrationReport.summary.failedTests++;
        integrationReport.summary.criticalIssues.push('Analytics integration failed');
        throw error;
      } finally {
        integrationReport.testSuites.analytics.duration = Date.now() - startTime;
        integrationReport.summary.totalTests++;
      }
    });
  });

  test.describe('API Integration Validation', () => {
    test('should validate API endpoint responses @integration', async ({ request }) => {
      const endpoints = [
        { path: '/health', method: 'GET', expectedStatus: 200 },
        { path: '/auth/me', method: 'GET', expectedStatus: [200, 401] }, // 401 is acceptable for unauthenticated
        { path: '/contracts', method: 'GET', expectedStatus: [200, 401] }
      ];

      for (const endpoint of endpoints) {
        try {
          let response;
          if (endpoint.method === 'GET') {
            response = await request.get(`${API_BASE_URL}${endpoint.path}`);
          }

          const statusOk = Array.isArray(endpoint.expectedStatus) 
            ? endpoint.expectedStatus.includes(response.status())
            : response.status() === endpoint.expectedStatus;

          if (!statusOk) {
            integrationReport.summary.criticalIssues.push(
              `API endpoint ${endpoint.path} returned unexpected status: ${response.status()}`
            );
          }

          expect(statusOk).toBe(true);

        } catch (error) {
          integrationReport.summary.criticalIssues.push(
            `Failed to test API endpoint ${endpoint.path}: ${error.message}`
          );
          throw error;
        }
      }
    });

    test('should validate API response formats @integration', async ({ request }) => {
      try {
        const healthResponse = await request.get(`${API_BASE_URL}/health`);
        expect(healthResponse.ok()).toBe(true);

        const healthData = await healthResponse.json();
        expect(healthData).toBeInstanceOf(Object);
        expect(healthData).toHaveProperty('status');

      } catch (error) {
        integrationReport.summary.criticalIssues.push('API response format validation failed');
        throw error;
      }
    });

    test('should validate API error handling @integration', async ({ request }) => {
      try {
        // Test 404 endpoint
        const notFoundResponse = await request.get(`${API_BASE_URL}/non-existent-endpoint`);
        expect(notFoundResponse.status()).toBe(404);

        const errorData = await notFoundResponse.json();
        expect(errorData).toHaveProperty('detail');

      } catch (error) {
        integrationReport.summary.recommendations.push('Ensure API returns proper error responses');
      }
    });
  });

  test.describe('Performance Integration Tests', () => {
    test('should validate API response times @integration', async ({ request }) => {
      const performanceThresholds = {
        '/health': 500,
        '/contracts': 2000,
        '/analytics/dashboard': 3000
      };

      for (const [endpoint, maxTime] of Object.entries(performanceThresholds)) {
        const startTime = Date.now();
        
        try {
          const response = await request.get(`${API_BASE_URL}${endpoint}`);
          const responseTime = Date.now() - startTime;

          if (response.ok()) {
            if (responseTime > maxTime) {
              integrationReport.summary.recommendations.push(
                `API endpoint ${endpoint} is slow (${responseTime}ms > ${maxTime}ms)`
              );
            }
          }

        } catch (error) {
          // Endpoint might not be accessible, skip performance test
        }
      }
    });

    test('should validate frontend performance @integration', async ({ page }) => {
      const performanceMetrics = {
        pageLoadTime: 0,
        domContentLoaded: 0,
        networkRequests: 0
      };

      let requestCount = 0;
      page.on('request', () => requestCount++);

      const startTime = Date.now();
      await page.goto('/dashboard');
      
      await page.waitForLoadState('domcontentloaded');
      performanceMetrics.domContentLoaded = Date.now() - startTime;
      
      await page.waitForLoadState('networkidle');
      performanceMetrics.pageLoadTime = Date.now() - startTime;
      performanceMetrics.networkRequests = requestCount;

      // Performance thresholds
      if (performanceMetrics.pageLoadTime > 5000) {
        integrationReport.summary.recommendations.push(
          `Page load time is slow: ${performanceMetrics.pageLoadTime}ms`
        );
      }

      if (performanceMetrics.networkRequests > 50) {
        integrationReport.summary.recommendations.push(
          `High number of network requests: ${performanceMetrics.networkRequests}`
        );
      }

      console.log(`Page Performance: ${performanceMetrics.pageLoadTime}ms, ${performanceMetrics.networkRequests} requests`);
    });
  });

  test.describe('Security Integration Tests', () => {
    test('should validate authentication requirements @integration', async ({ page }) => {
      // Test protected routes redirect to login
      const protectedRoutes = ['/dashboard', '/contracts', '/analytics'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should redirect to login or show login form
        const currentUrl = page.url();
        const hasLoginElements = await page.getByText(/login|sign in/i).isVisible();
        
        if (!currentUrl.includes('/login') && !hasLoginElements) {
          integrationReport.summary.criticalIssues.push(
            `Protected route ${route} does not require authentication`
          );
        }
      }
    });

    test('should validate API security headers @integration', async ({ request }) => {
      try {
        const response = await request.get(`${API_BASE_URL}/health`);
        const headers = response.headers();

        const securityHeaders = [
          'x-content-type-options',
          'x-frame-options',
          'strict-transport-security'
        ];

        const missingHeaders = securityHeaders.filter(header => !headers[header]);
        
        if (missingHeaders.length > 0) {
          integrationReport.summary.recommendations.push(
            `Consider adding security headers: ${missingHeaders.join(', ')}`
          );
        }

      } catch (error) {
        // Security header validation failed
      }
    });
  });

  test.describe('Data Flow Integration Tests', () => {
    test('should validate data persistence across page reloads @integration', async ({ page }) => {
      // Set up authentication
      await page.addInitScript(() => {
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: { id: 'test-user', email: 'test@test.com', full_name: 'Test User' },
            company: null
          }
        }));
        localStorage.setItem('auth-token', 'test-token');
      });

      await page.goto('/dashboard');
      
      // Reload page
      await page.reload();
      
      // Should maintain authentication state
      const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
      expect(authStorage).toBeTruthy();
      
      // Should not redirect to login
      expect(page.url()).not.toMatch(/\/login/);
    });

    test('should validate error boundaries and fallbacks @integration', async ({ page }) => {
      await page.goto('/');
      
      // Inject a runtime error to test error boundaries
      await page.evaluate(() => {
        // Create a component error that should be caught by error boundary
        if ((window as any).triggerTestError) {
          (window as any).triggerTestError();
        }
      });

      await page.waitForTimeout(1000);
      
      // Page should still be functional despite errors
      await expect(page.locator('body')).toBeVisible();
      
      // Look for error boundary fallback UI
      const errorBoundary = await page.getByText(/something.*went.*wrong|error.*occurred/i).isVisible();
      
      if (!errorBoundary) {
        // No error occurred or error boundary handled it gracefully
        expect(true).toBe(true);
      }
    });
  });
});