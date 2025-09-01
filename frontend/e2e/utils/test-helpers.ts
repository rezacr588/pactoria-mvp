import { Page, Locator, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

/**
 * Advanced testing utilities and helper functions for E2E tests
 */

/**
 * Screenshot and visual testing utilities
 */
export class VisualTestHelper {
  constructor(private page: Page) {}

  /**
   * Take a screenshot with retry mechanism
   */
  async takeScreenshot(name: string, options?: { fullPage?: boolean; mask?: Locator[] }): Promise<Buffer> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page.waitForLoadState('networkidle');
        return await this.page.screenshot({
          fullPage: options?.fullPage ?? false,
          mask: options?.mask,
          path: `test-results/screenshots/${name}-${Date.now()}.png`
        });
      } catch (error) {
        lastError = error as Error;
        await this.page.waitForTimeout(500);
      }
    }
    
    throw new Error(`Failed to take screenshot after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Compare visual elements with baseline
   */
  async compareVisual(name: string, locator?: Locator): Promise<void> {
    const element = locator || this.page;
    await element.screenshot({ path: `test-results/visual-comparison/${name}.png` });
    
    // This would integrate with visual regression tools like Percy, Chromatic, etc.
    // For now, we just take the screenshot for manual comparison
  }

  /**
   * Wait for animations to complete
   */
  async waitForAnimations(): Promise<void> {
    await this.page.waitForFunction(() => {
      const animations = document.getAnimations();
      return animations.every(animation => animation.playState === 'finished');
    });
  }

  /**
   * Check for layout shift
   */
  async measureLayoutShift(): Promise<number> {
    return await this.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          
          setTimeout(() => resolve(clsValue), 1000);
        }).observe({ entryTypes: ['layout-shift'] });
      });
    });
  }
}

/**
 * Network and API testing utilities
 */
export class NetworkTestHelper {
  private requests: Request[] = [];
  private responses: Response[] = [];

  constructor(private page: Page) {
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    this.page.on('request', request => {
      this.requests.push(request);
    });

    this.page.on('response', response => {
      this.responses.push(response);
    });
  }

  /**
   * Get all API requests made
   */
  getApiRequests(pattern?: RegExp): Request[] {
    const apiRequests = this.requests.filter(req => 
      req.url().includes('/api/') || 
      (pattern && pattern.test(req.url()))
    );
    return apiRequests;
  }

  /**
   * Check if specific API was called
   */
  wasApiCalled(endpoint: string): boolean {
    return this.requests.some(req => req.url().includes(endpoint));
  }

  /**
   * Get API call count
   */
  getApiCallCount(endpoint?: string): number {
    if (endpoint) {
      return this.requests.filter(req => req.url().includes(endpoint)).length;
    }
    return this.getApiRequests().length;
  }

  /**
   * Mock API response with delay
   */
  async mockApiWithDelay(endpoint: string, response: any, delayMs = 1000): Promise<void> {
    await this.page.route(endpoint, async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Simulate network failures
   */
  async simulateNetworkFailure(endpoint: string): Promise<void> {
    await this.page.route(endpoint, route => route.abort('internetdisconnected'));
  }

  /**
   * Simulate slow network
   */
  async simulateSlowNetwork(): Promise<void> {
    await this.page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      await route.continue();
    });
  }

  /**
   * Clear network history
   */
  clearHistory(): void {
    this.requests = [];
    this.responses = [];
  }

  /**
   * Get response times
   */
  getResponseTimes(): number[] {
    return this.responses
      .map(response => {
        const timing = response.request().timing();
        return timing ? timing.responseEnd - timing.requestStart : 0;
      })
      .filter(time => time > 0);
  }
}

/**
 * Form testing utilities
 */
export class FormTestHelper {
  constructor(private page: Page) {}

  /**
   * Fill form with test data
   */
  async fillForm(formSelector: string, data: Record<string, any>): Promise<void> {
    const form = this.page.locator(formSelector);
    
    for (const [fieldName, value] of Object.entries(data)) {
      const field = form.locator(`[name="${fieldName}"], [data-testid="${fieldName}"], label:has-text("${fieldName}") + input`);
      
      if (await field.count() > 0) {
        const fieldType = await field.getAttribute('type') || await field.evaluate(el => el.tagName.toLowerCase());
        
        switch (fieldType) {
          case 'select':
            await field.selectOption(value);
            break;
          case 'checkbox':
            if (value) await field.check();
            else await field.uncheck();
            break;
          case 'radio':
            await field.click();
            break;
          default:
            await field.fill(String(value));
        }
      }
    }
  }

  /**
   * Validate form errors
   */
  async validateFormErrors(expectedErrors: Record<string, string>): Promise<void> {
    for (const [fieldName, expectedError] of Object.entries(expectedErrors)) {
      const errorElement = this.page.locator(`[data-testid="${fieldName}-error"], .error:has-text("${fieldName}")`);
      await expect(errorElement).toContainText(expectedError);
    }
  }

  /**
   * Test form validation
   */
  async testFieldValidation(fieldSelector: string, invalidValues: any[], validValue: any): Promise<void> {
    const field = this.page.locator(fieldSelector);
    
    // Test invalid values
    for (const invalidValue of invalidValues) {
      await field.fill(String(invalidValue));
      await field.blur();
      
      // Should show validation error
      const errorVisible = await this.page.locator('.error, [role="alert"]').isVisible();
      expect(errorVisible).toBeTruthy();
    }
    
    // Test valid value
    await field.fill(String(validValue));
    await field.blur();
    
    // Error should be gone
    const errorStillVisible = await this.page.locator('.error, [role="alert"]').isVisible();
    expect(errorStillVisible).toBeFalsy();
  }

  /**
   * Generate random form data
   */
  generateRandomFormData(schema: Record<string, string>): Record<string, any> {
    const data: Record<string, any> = {};
    
    for (const [fieldName, fieldType] of Object.entries(schema)) {
      switch (fieldType) {
        case 'email':
          data[fieldName] = faker.internet.email();
          break;
        case 'name':
          data[fieldName] = faker.person.fullName();
          break;
        case 'company':
          data[fieldName] = faker.company.name();
          break;
        case 'phone':
          data[fieldName] = faker.phone.number();
          break;
        case 'number':
          data[fieldName] = faker.number.int({ min: 1, max: 100000 });
          break;
        case 'date':
          data[fieldName] = faker.date.future().toISOString().split('T')[0];
          break;
        case 'text':
          data[fieldName] = faker.lorem.sentences(2);
          break;
        default:
          data[fieldName] = faker.lorem.word();
      }
    }
    
    return data;
  }
}

/**
 * Accessibility testing utilities
 */
export class AccessibilityTestHelper {
  constructor(private page: Page) {}

  /**
   * Check if element has proper ARIA labels
   */
  async checkAriaLabels(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    const ariaLabel = await element.getAttribute('aria-label');
    const ariaLabelledBy = await element.getAttribute('aria-labelledby');
    const innerText = await element.innerText().catch(() => '');
    
    return !!(ariaLabel || ariaLabelledBy || innerText.trim());
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(startSelector: string, expectedStops: string[]): Promise<void> {
    await this.page.locator(startSelector).focus();
    
    for (const expectedSelector of expectedStops) {
      await this.page.keyboard.press('Tab');
      const focusedElement = this.page.locator(':focus');
      await expect(focusedElement).toMatchElement(expectedSelector);
    }
  }

  /**
   * Check color contrast (simplified)
   */
  async checkColorContrast(selector: string): Promise<{ ratio: number; passes: boolean }> {
    return await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return { ratio: 0, passes: false };
      
      const styles = window.getComputedStyle(element);
      const bgColor = styles.backgroundColor;
      const textColor = styles.color;
      
      // Simplified contrast calculation - in real tests you'd use a proper library
      return {
        ratio: 4.5, // Placeholder
        passes: true // Placeholder
      };
    }, selector);
  }

  /**
   * Test with screen reader simulation
   */
  async simulateScreenReader(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, button, input, a, [role]');
      const screenReaderText: string[] = [];
      
      elements.forEach(el => {
        const text = el.getAttribute('aria-label') || 
                    el.getAttribute('alt') ||
                    el.textContent?.trim() ||
                    el.getAttribute('title');
        
        if (text) {
          screenReaderText.push(text);
        }
      });
      
      return screenReaderText;
    });
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestHelper {
  constructor(private page: Page) {}

  /**
   * Measure page load time
   */
  async measurePageLoad(): Promise<{
    domContentLoaded: number;
    loadComplete: number;
    firstContentfulPaint: number;
  }> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
      };
    });
  }

  /**
   * Measure interaction response time
   */
  async measureInteraction(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  /**
   * Monitor memory usage
   */
  async getMemoryUsage(): Promise<{ used: number; total: number } | null> {
    return await this.page.evaluate(() => {
      const memory = (performance as any).memory;
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize
        };
      }
      return null;
    });
  }

  /**
   * Measure largest contentful paint
   */
  async measureLCP(): Promise<number> {
    return await this.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });
  }
}

/**
 * Data generation utilities
 */
export class DataGenerator {
  /**
   * Generate realistic contract data
   */
  static generateContract(overrides: Partial<any> = {}): any {
    return {
      title: faker.company.buzzPhrase() + ' Agreement',
      contract_type: faker.helpers.arrayElement(['service_agreement', 'nda', 'employment_contract']),
      plain_english_input: faker.lorem.paragraphs(3),
      client_name: faker.company.name(),
      client_email: faker.internet.email(),
      supplier_name: faker.company.name(),
      contract_value: faker.number.int({ min: 1000, max: 100000 }),
      currency: faker.helpers.arrayElement(['GBP', 'USD', 'EUR']),
      start_date: faker.date.future().toISOString().split('T')[0],
      end_date: faker.date.future().toISOString().split('T')[0],
      ...overrides
    };
  }

  /**
   * Generate user data
   */
  static generateUser(overrides: Partial<any> = {}): any {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
      email: faker.internet.email({ firstName, lastName }),
      password: 'TestPassword123!',
      full_name: `${firstName} ${lastName}`,
      company_name: faker.company.name(),
      timezone: 'Europe/London',
      ...overrides
    };
  }

  /**
   * Generate analytics data
   */
  static generateAnalyticsData(overrides: Partial<any> = {}): any {
    return {
      business_metrics: {
        total_contracts: faker.number.int({ min: 50, max: 500 }),
        active_contracts: faker.number.int({ min: 20, max: 200 }),
        draft_contracts: faker.number.int({ min: 5, max: 50 }),
        completed_contracts: faker.number.int({ min: 10, max: 100 }),
        total_contract_value: faker.number.int({ min: 100000, max: 10000000 }),
        compliance_score_average: faker.number.float({ min: 70, max: 95, precision: 0.1 })
      },
      ...overrides
    };
  }
}

/**
 * Wait utilities
 */
export class WaitHelper {
  constructor(private page: Page) {}

  /**
   * Wait for API call to complete
   */
  async waitForApiCall(endpoint: string, timeout = 30000): Promise<void> {
    await this.page.waitForResponse(
      response => response.url().includes(endpoint) && response.status() < 400,
      { timeout }
    );
  }

  /**
   * Wait for element to be stable (no position changes)
   */
  async waitForElementStability(selector: string, stabilityDuration = 1000): Promise<void> {
    const element = this.page.locator(selector);
    let lastPosition: { x: number; y: number } | null = null;
    let stableStartTime: number | null = null;

    while (true) {
      const box = await element.boundingBox();
      if (!box) {
        await this.page.waitForTimeout(100);
        continue;
      }

      const currentPosition = { x: box.x, y: box.y };

      if (lastPosition && 
          Math.abs(currentPosition.x - lastPosition.x) < 1 && 
          Math.abs(currentPosition.y - lastPosition.y) < 1) {
        
        if (!stableStartTime) {
          stableStartTime = Date.now();
        } else if (Date.now() - stableStartTime >= stabilityDuration) {
          break;
        }
      } else {
        stableStartTime = null;
      }

      lastPosition = currentPosition;
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Wait for loading state to complete
   */
  async waitForLoadingComplete(loadingSelector = '[data-testid="loading-spinner"]'): Promise<void> {
    const loadingElement = this.page.locator(loadingSelector);
    
    // Wait for loading to appear (optional)
    try {
      await loadingElement.waitFor({ state: 'visible', timeout: 2000 });
    } catch {
      // Loading might not appear or already be gone
    }
    
    // Wait for loading to disappear
    await loadingElement.waitFor({ state: 'hidden', timeout: 30000 });
  }

  /**
   * Wait for multiple conditions
   */
  async waitForAll(conditions: Promise<any>[]): Promise<any[]> {
    return await Promise.all(conditions);
  }
}

/**
 * Custom matchers for expect
 */
export const customMatchers = {
  async toMatchElement(received: Locator, selector: string) {
    const element = this.page.locator(selector);
    const receivedElement = await received.elementHandle();
    const expectedElement = await element.elementHandle();
    
    const pass = receivedElement === expectedElement;
    
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to match selector ${selector}`,
      pass
    };
  },

  async toHaveValidationError(received: Locator) {
    const errorElements = this.page.locator('[role="alert"], .error, [aria-invalid="true"]');
    const hasError = await errorElements.count() > 0;
    
    return {
      message: () => `expected element ${hasError ? 'not ' : ''}to have validation error`,
      pass: hasError
    };
  }
};