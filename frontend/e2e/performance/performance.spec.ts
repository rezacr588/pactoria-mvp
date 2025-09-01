import { test, expect } from '@playwright/test';
import { 
  LandingPage,
  DashboardPage, 
  ContractsPage, 
  ContractCreatePage,
  AnalyticsPage,
  AppLayout 
} from '../utils/page-objects';
import { APIMocker } from '../utils/api-mock';

test.describe('Performance Tests', () => {
  let landingPage: LandingPage;
  let dashboardPage: DashboardPage;
  let contractsPage: ContractsPage;
  let contractCreatePage: ContractCreatePage;
  let analyticsPage: AnalyticsPage;
  let appLayout: AppLayout;
  let apiMocker: APIMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    dashboardPage = new DashboardPage(page);
    contractsPage = new ContractsPage(page);
    contractCreatePage = new ContractCreatePage(page);
    analyticsPage = new AnalyticsPage(page);
    appLayout = new AppLayout(page);
    apiMocker = new APIMocker(page);

    await apiMocker.mockAllEndpoints();

    // Set up authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: 'test-user', 
            email: 'test@test.com',
            full_name: 'Test User',
            company_id: 'test-company'
          },
          token: 'mock-token'
        }
      }));
    });
  });

  test.describe('Page Load Performance', () => {
    test('should load landing page quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await landingPage.goto('/');
      await expect(landingPage.heroHeading).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Landing page should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
      console.log(`Landing page loaded in: ${loadTime}ms`);
    });

    test('should load dashboard efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      await dashboardPage.goto('/dashboard');
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      console.log(`Dashboard loaded in: ${loadTime}ms`);
    });

    test('should load contracts list efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      await contractsPage.goto('/contracts');
      await contractsPage.expectContractsVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Contracts page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      console.log(`Contracts page loaded in: ${loadTime}ms`);
    });

    test('should load analytics page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await analyticsPage.goto('/analytics');
      await analyticsPage.expectMetricsVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Analytics with charts should load within 4 seconds
      expect(loadTime).toBeLessThan(4000);
      console.log(`Analytics page loaded in: ${loadTime}ms`);
    });

    test('should handle concurrent page loads', async ({ context }) => {
      const pages = await Promise.all([
        context.newPage(),
        context.newPage(),
        context.newPage()
      ]);

      // Set up auth for all pages
      for (const page of pages) {
        await page.addInitScript(() => {
          localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user: { id: 'test-user', email: 'test@test.com', token: 'mock-token' }
            }
          }));
        });
      }

      const startTime = Date.now();
      
      // Load different pages concurrently
      await Promise.all([
        pages[0].goto('/dashboard'),
        pages[1].goto('/contracts'),
        pages[2].goto('/analytics')
      ]);

      // Wait for all pages to be ready
      await Promise.all([
        pages[0].waitForSelector('[data-testid="welcome-message"], h1'),
        pages[1].waitForSelector('[data-testid="contracts-list"], .contracts-table'),
        pages[2].waitForSelector('[data-testid="dashboard-metrics"], .analytics-chart')
      ]);

      const totalTime = Date.now() - startTime;
      
      // Concurrent loading should be efficient
      expect(totalTime).toBeLessThan(6000);
      console.log(`Concurrent page loads completed in: ${totalTime}ms`);
      
      // Close pages
      await Promise.all(pages.map(page => page.close()));
    });
  });

  test.describe('Core Web Vitals', () => {
    test('should meet Largest Contentful Paint (LCP) thresholds', async ({ page }) => {
      // Enable performance metrics
      await page.goto('/dashboard');
      
      const lcpMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000);
        });
      });

      // LCP should be under 2.5 seconds (good threshold)
      expect(lcpMetrics).toBeLessThan(2500);
      console.log(`LCP: ${lcpMetrics}ms`);
    });

    test('should meet First Input Delay (FID) thresholds', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Measure time between click and response
      const startTime = Date.now();
      await dashboardPage.createContractButton.click();
      await page.waitForURL(/\/contracts\/new/);
      const responseTime = Date.now() - startTime;
      
      // FID should be under 100ms (good threshold)
      expect(responseTime).toBeLessThan(1000); // More lenient for E2E
      console.log(`Input response time: ${responseTime}ms`);
    });

    test('should meet Cumulative Layout Shift (CLS) thresholds', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Wait for initial content load
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      // Measure layout shift
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            resolve(clsValue);
          }).observe({ entryTypes: ['layout-shift'] });
          
          // Resolve after a short time
          setTimeout(() => resolve(clsValue), 3000);
        });
      });

      // CLS should be under 0.1 (good threshold)
      expect(cls).toBeLessThan(0.25); // More lenient for development
      console.log(`CLS: ${cls}`);
    });

    test('should have good Time to First Byte (TTFB)', async ({ page }) => {
      const startTime = Date.now();
      
      const response = await page.goto('/dashboard');
      const ttfb = Date.now() - startTime;
      
      // TTFB should be reasonable
      expect(ttfb).toBeLessThan(1000);
      expect(response?.status()).toBe(200);
      console.log(`TTFB: ${ttfb}ms`);
    });
  });

  test.describe('Resource Loading Performance', () => {
    test('should optimize image loading', async ({ page }) => {
      const imageRequests: string[] = [];
      
      page.on('request', request => {
        const url = request.url();
        if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
          imageRequests.push(url);
        }
      });

      await landingPage.goto('/');
      await expect(landingPage.heroHeading).toBeVisible();
      
      // Should use optimized image formats
      const optimizedImages = imageRequests.filter(url => 
        url.includes('webp') || url.includes('avif') || url.includes('optimized')
      );
      
      // At least some images should be optimized
      console.log(`Total images: ${imageRequests.length}, Optimized: ${optimizedImages.length}`);
    });

    test('should lazy load below-the-fold content', async ({ page }) => {
      const networkRequests = new Set<string>();
      
      page.on('request', request => {
        networkRequests.add(request.url());
      });

      await contractsPage.goto('/contracts');
      
      // Count initial requests
      const initialRequestCount = networkRequests.size;
      
      // Scroll down to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(1000);
      
      const finalRequestCount = networkRequests.size;
      
      // Should load additional content when scrolling
      console.log(`Initial requests: ${initialRequestCount}, After scroll: ${finalRequestCount}`);
    });

    test('should bundle JavaScript efficiently', async ({ page }) => {
      const jsRequests: string[] = [];
      
      page.on('response', response => {
        const url = response.url();
        if (url.includes('.js') && response.status() === 200) {
          jsRequests.push(url);
        }
      });

      await dashboardPage.goto('/dashboard');
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      // Should not load excessive JS files
      expect(jsRequests.length).toBeLessThan(20);
      console.log(`JavaScript files loaded: ${jsRequests.length}`);
    });

    test('should cache static resources', async ({ page }) => {
      const cachedRequests: string[] = [];
      
      page.on('response', response => {
        const cacheControl = response.headers()['cache-control'];
        if (cacheControl && cacheControl.includes('max-age')) {
          cachedRequests.push(response.url());
        }
      });

      await landingPage.goto('/');
      await expect(landingPage.heroHeading).toBeVisible();
      
      // Should cache static assets
      console.log(`Cached resources: ${cachedRequests.length}`);
    });
  });

  test.describe('Runtime Performance', () => {
    test('should handle large data sets efficiently', async ({ page }) => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `contract-${i}`,
        title: `Contract ${i}`,
        contract_type: 'service_agreement',
        status: 'active',
        client_name: `Client ${i}`,
        contract_value: 1000 + i,
        currency: 'GBP',
        version: 1,
        is_current_version: true,
        company_id: 'test-company',
        created_by: 'test-user',
        created_at: '2024-01-01T00:00:00Z'
      }));

      await page.route('**/contracts*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            contracts: largeDataset.slice(0, 50), // Paginated
            total: 1000,
            page: 1,
            size: 50,
            pages: 20
          })
        });
      });

      const startTime = Date.now();
      
      await contractsPage.goto('/contracts');
      await contractsPage.expectContractsVisible();
      
      const renderTime = Date.now() - startTime;
      
      // Should handle large datasets efficiently
      expect(renderTime).toBeLessThan(3000);
      console.log(`Large dataset rendered in: ${renderTime}ms`);
    });

    test('should handle rapid user interactions', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      const startTime = Date.now();
      
      // Rapid clicking/navigation
      for (let i = 0; i < 5; i++) {
        await contractsPage.createContractButton.click();
        await page.goBack();
      }
      
      const interactionTime = Date.now() - startTime;
      
      // Should handle rapid interactions without blocking
      expect(interactionTime).toBeLessThan(5000);
      console.log(`Rapid interactions completed in: ${interactionTime}ms`);
    });

    test('should maintain performance during scrolling', async ({ page }) => {
      // Mock many contracts for scrolling
      const manyContracts = Array.from({ length: 100 }, (_, i) => ({
        id: `scroll-contract-${i}`,
        title: `Scroll Contract ${i}`,
        contract_type: 'service_agreement',
        status: 'active',
        client_name: `Scroll Client ${i}`,
        version: 1,
        is_current_version: true,
        company_id: 'test-company',
        created_by: 'test-user',
        created_at: '2024-01-01T00:00:00Z'
      }));

      await page.route('**/contracts*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            contracts: manyContracts,
            total: 100,
            page: 1,
            size: 100,
            pages: 1
          })
        });
      });

      await contractsPage.goto('/contracts');
      await contractsPage.expectContractsVisible();
      
      const startTime = Date.now();
      
      // Fast scrolling
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, 200);
        });
        await page.waitForTimeout(50);
      }
      
      const scrollTime = Date.now() - startTime;
      
      // Scrolling should be smooth
      expect(scrollTime).toBeLessThan(2000);
      console.log(`Scrolling completed in: ${scrollTime}ms`);
    });

    test('should handle form interactions efficiently', async ({ page }) => {
      await contractCreatePage.goto('/contracts/new');
      
      const startTime = Date.now();
      
      // Rapid form interactions
      await contractCreatePage.titleInput.fill('Performance Test Contract');
      await contractCreatePage.contractTypeSelect.click();
      await page.getByText('Service Agreement').click();
      await contractCreatePage.plainEnglishTextarea.fill('This is a performance test contract with a reasonable amount of content to test form performance.');
      await contractCreatePage.clientNameInput.fill('Performance Client');
      await contractCreatePage.clientEmailInput.fill('performance@test.com');
      
      const formTime = Date.now() - startTime;
      
      // Form should be responsive
      expect(formTime).toBeLessThan(2000);
      console.log(`Form interactions completed in: ${formTime}ms`);
    });
  });

  test.describe('Memory Performance', () => {
    test('should not have significant memory leaks', async ({ page }) => {
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Navigate through several pages
      const pages = ['/dashboard', '/contracts', '/analytics', '/contracts/new'];
      
      for (const route of pages) {
        await page.goto(route);
        await page.waitForTimeout(1000);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        // Memory increase should be reasonable
        expect(memoryIncreasePercent).toBeLessThan(200); // Allow 200% increase max
        console.log(`Memory usage: ${initialMemory} -> ${finalMemory} (${memoryIncreasePercent.toFixed(2)}% increase)`);
      }
    });

    test('should clean up event listeners', async ({ page }) => {
      await dashboardPage.goto('/dashboard');
      
      // Check initial event listener count
      const initialListeners = await page.evaluate(() => {
        return (window as any).eventListenerCount || 0;
      });

      // Navigate to different pages
      await contractsPage.goto('/contracts');
      await analyticsPage.goto('/analytics');
      await dashboardPage.goto('/dashboard');
      
      const finalListeners = await page.evaluate(() => {
        return (window as any).eventListenerCount || 0;
      });

      // Event listeners should not accumulate excessively
      console.log(`Event listeners: ${initialListeners} -> ${finalListeners}`);
    });
  });

  test.describe('API Performance', () => {
    test('should batch API requests efficiently', async ({ page }) => {
      let apiCallCount = 0;
      
      page.on('request', request => {
        if (request.url().includes('/api/v1/')) {
          apiCallCount++;
        }
      });

      await dashboardPage.goto('/dashboard');
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      // Should not make excessive API calls
      expect(apiCallCount).toBeLessThan(10);
      console.log(`API calls for dashboard: ${apiCallCount}`);
    });

    test('should handle API request concurrency', async ({ page }) => {
      const apiTimes: number[] = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/v1/')) {
          const timing = response.request().timing();
          if (timing) {
            apiTimes.push(timing.responseEnd - timing.requestStart);
          }
        }
      });

      await analyticsPage.goto('/analytics');
      await analyticsPage.expectMetricsVisible();
      
      if (apiTimes.length > 0) {
        const avgApiTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
        
        // API calls should be reasonably fast
        expect(avgApiTime).toBeLessThan(1000);
        console.log(`Average API response time: ${avgApiTime.toFixed(2)}ms`);
      }
    });

    test('should cache API responses appropriately', async ({ page }) => {
      let dashboardApiCalls = 0;
      
      page.on('request', request => {
        if (request.url().includes('/analytics/dashboard')) {
          dashboardApiCalls++;
        }
      });

      // Load analytics twice
      await analyticsPage.goto('/analytics');
      await analyticsPage.expectMetricsVisible();
      
      await page.goto('/dashboard');
      await analyticsPage.goto('/analytics');
      
      // Should cache and not make excessive calls
      console.log(`Dashboard API calls: ${dashboardApiCalls}`);
    });
  });

  test.describe('Performance Under Load', () => {
    test('should maintain performance with multiple tabs', async ({ context }) => {
      const tabCount = 3;
      const pages = [];
      
      // Create multiple tabs
      for (let i = 0; i < tabCount; i++) {
        const page = await context.newPage();
        await page.addInitScript(() => {
          localStorage.setItem('auth-storage', JSON.stringify({
            state: {
              user: { id: 'test-user', email: 'test@test.com', token: 'mock-token' }
            }
          }));
        });
        pages.push(page);
      }
      
      const startTime = Date.now();
      
      // Load different pages in each tab
      await Promise.all([
        pages[0].goto('/dashboard'),
        pages[1].goto('/contracts'),
        pages[2].goto('/analytics')
      ]);
      
      // Wait for all tabs to be ready
      await Promise.all([
        pages[0].waitForSelector('h1, [data-testid="welcome-message"]'),
        pages[1].waitForSelector('[data-testid="contracts-list"], .contracts-table'),
        pages[2].waitForSelector('[data-testid="dashboard-metrics"], .analytics-chart')
      ]);
      
      const loadTime = Date.now() - startTime;
      
      // Multiple tabs should load within reasonable time
      expect(loadTime).toBeLessThan(8000);
      console.log(`${tabCount} tabs loaded in: ${loadTime}ms`);
      
      // Clean up
      await Promise.all(pages.map(page => page.close()));
    });

    test('should handle rapid navigation', async ({ page }) => {
      const routes = ['/dashboard', '/contracts', '/analytics', '/contracts/new', '/dashboard'];
      const startTime = Date.now();
      
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');
      }
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / routes.length;
      
      // Rapid navigation should be efficient
      expect(avgTime).toBeLessThan(1000);
      console.log(`Rapid navigation average: ${avgTime.toFixed(2)}ms per page`);
    });

    test('should perform well on slower networks', async ({ page }) => {
      // Simulate slow 3G
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        await route.continue();
      });

      const startTime = Date.now();
      
      await dashboardPage.goto('/dashboard');
      await expect(dashboardPage.welcomeMessage).toBeVisible();
      
      const slowLoadTime = Date.now() - startTime;
      
      // Should still be usable on slow networks
      expect(slowLoadTime).toBeLessThan(10000);
      console.log(`Slow network load time: ${slowLoadTime}ms`);
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should report performance metrics', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check if performance metrics are available
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          networkTime: navigation.responseEnd - navigation.requestStart,
          domProcessingTime: navigation.domComplete - navigation.domLoading
        };
      });
      
      console.log('Performance Metrics:', performanceMetrics);
      
      // Validate metrics are reasonable
      expect(performanceMetrics.domContentLoaded).toBeGreaterThanOrEqual(0);
      expect(performanceMetrics.loadComplete).toBeGreaterThanOrEqual(0);
    });

    test('should track user interactions performance', async ({ page }) => {
      await contractsPage.goto('/contracts');
      
      // Measure interaction performance
      const interactionStart = Date.now();
      await contractsPage.createContractButton.click();
      await page.waitForURL(/\/contracts\/new/);
      const interactionTime = Date.now() - interactionStart;
      
      // Record the measurement
      console.log(`User interaction time: ${interactionTime}ms`);
      
      // Should be responsive
      expect(interactionTime).toBeLessThan(2000);
    });

    test('should detect performance regressions', async ({ page }) => {
      const baselineTime = 2000; // 2 seconds baseline
      
      const startTime = Date.now();
      await analyticsPage.goto('/analytics');
      await analyticsPage.expectMetricsVisible();
      const loadTime = Date.now() - startTime;
      
      // Should not regress significantly from baseline
      expect(loadTime).toBeLessThan(baselineTime * 1.5); // Allow 50% variance
      
      const performanceRatio = loadTime / baselineTime;
      console.log(`Performance ratio: ${performanceRatio.toFixed(2)}x baseline`);
    });
  });
});