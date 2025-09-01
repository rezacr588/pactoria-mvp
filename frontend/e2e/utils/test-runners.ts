import { spawn, ChildProcess } from 'child_process';
import path from 'path';

/**
 * Test runner utilities for different test scenarios
 */

export interface TestRunOptions {
  browser?: 'chromium' | 'firefox' | 'webkit' | 'all';
  headed?: boolean;
  debug?: boolean;
  project?: string;
  grep?: string;
  reporter?: string;
  workers?: number;
  retries?: number;
  timeout?: number;
  outputDir?: string;
}

export interface TestRunResult {
  success: boolean;
  output: string;
  duration: number;
  testCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
}

/**
 * Advanced test runner with different execution modes
 */
export class TestRunner {
  private projectRoot: string;
  private defaultOptions: TestRunOptions;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.defaultOptions = {
      browser: 'chromium',
      headed: false,
      debug: false,
      workers: 1,
      retries: 2,
      timeout: 30000,
      reporter: 'html',
      outputDir: 'test-results'
    };
  }

  /**
   * Run smoke tests - critical user journeys only
   */
  async runSmokeTests(options: Partial<TestRunOptions> = {}): Promise<TestRunResult> {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      grep: options.grep || '@smoke',
      workers: 1, // Run smoke tests serially for reliability
      reporter: 'list'
    };

    console.log('🔥 Running Smoke Tests...');
    console.log('Testing critical user journeys');
    
    return await this.executeTests(testOptions, [
      'e2e/auth/auth.spec.ts',
      'e2e/contracts/contracts-crud.spec.ts',
      'e2e/navigation/navigation.spec.ts'
    ]);
  }

  /**
   * Run regression tests - comprehensive test suite
   */
  async runRegressionTests(options: Partial<TestRunOptions> = {}): Promise<TestRunResult> {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      workers: options.workers || 4,
      reporter: 'html'
    };

    console.log('🔍 Running Regression Tests...');
    console.log('Comprehensive test coverage across all features');
    
    return await this.executeTests(testOptions);
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests(options: Partial<TestRunOptions> = {}): Promise<TestRunResult> {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      workers: 1, // Performance tests should run serially
      timeout: 60000, // Longer timeout for performance tests
      reporter: 'json'
    };

    console.log('⚡ Running Performance Tests...');
    console.log('Measuring load times, responsiveness, and resource usage');
    
    return await this.executeTests(testOptions, [
      'e2e/performance/performance.spec.ts'
    ]);
  }

  /**
   * Run accessibility tests
   */
  async runAccessibilityTests(options: Partial<TestRunOptions> = {}): Promise<TestRunResult> {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      reporter: 'json'
    };

    console.log('♿ Running Accessibility Tests...');
    console.log('Checking WCAG compliance and keyboard navigation');
    
    return await this.executeTests(testOptions, [
      'e2e/accessibility/accessibility.spec.ts'
    ]);
  }

  /**
   * Run cross-browser tests
   */
  async runCrossBrowserTests(options: Partial<TestRunOptions> = {}): Promise<TestRunResult> {
    const browsers = ['chromium', 'firefox', 'webkit'];
    const results: TestRunResult[] = [];

    console.log('🌐 Running Cross-Browser Tests...');
    
    for (const browser of browsers) {
      console.log(`Testing on ${browser}...`);
      
      const testOptions = {
        ...this.defaultOptions,
        ...options,
        browser: browser as any,
        workers: 1
      };

      const result = await this.executeTests(testOptions, [
        'e2e/auth/auth.spec.ts',
        'e2e/contracts/contracts-crud.spec.ts',
        'e2e/responsive/responsive.spec.ts'
      ]);

      results.push(result);
    }

    // Aggregate results
    const aggregated: TestRunResult = {
      success: results.every(r => r.success),
      output: results.map(r => r.output).join('\n'),
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      testCount: results.reduce((sum, r) => sum + r.testCount, 0),
      passedCount: results.reduce((sum, r) => sum + r.passedCount, 0),
      failedCount: results.reduce((sum, r) => sum + r.failedCount, 0),
      skippedCount: results.reduce((sum, r) => sum + r.skippedCount, 0)
    };

    return aggregated;
  }

  /**
   * Run visual regression tests
   */
  async runVisualTests(options: Partial<TestRunOptions> = {}): Promise<TestRunResult> {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      workers: 1, // Visual tests need to be consistent
      timeout: 45000
    };

    console.log('📸 Running Visual Regression Tests...');
    console.log('Comparing screenshots against baselines');
    
    // Set environment variable for visual testing
    process.env.VISUAL_TESTING = 'true';
    
    return await this.executeTests(testOptions, [
      'e2e/responsive/responsive.spec.ts',
      'e2e/forms/form-validation.spec.ts'
    ]);
  }

  /**
   * Run API integration tests
   */
  async runApiTests(options: Partial<TestRunOptions> = {}): Promise<TestRunResult> {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      timeout: 45000 // API tests may need longer timeout
    };

    console.log('🔌 Running API Integration Tests...');
    console.log('Testing frontend-backend integration');
    
    return await this.executeTests(testOptions, [
      'e2e/integrations/api-integration.spec.ts'
    ]);
  }

  /**
   * Run tests in debug mode
   */
  async runDebugMode(testFile?: string, options: Partial<TestRunOptions> = {}): Promise<TestRunResult> {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      headed: true,
      debug: true,
      workers: 1,
      timeout: 0, // No timeout in debug mode
      reporter: 'line'
    };

    console.log('🐛 Running Tests in Debug Mode...');
    if (testFile) {
      console.log(`Debugging: ${testFile}`);
    }
    
    const testFiles = testFile ? [testFile] : undefined;
    return await this.executeTests(testOptions, testFiles);
  }

  /**
   * Run tests by feature/tag
   */
  async runByTag(tag: string, options: Partial<TestRunOptions> = {}): Promise<TestRunResult> {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      grep: `@${tag}`
    };

    console.log(`🏷️ Running Tests Tagged: @${tag}...`);
    
    return await this.executeTests(testOptions);
  }

  /**
   * Execute Playwright tests with given options
   */
  private async executeTests(options: TestRunOptions, testFiles?: string[]): Promise<TestRunResult> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const args = this.buildPlaywrightArgs(options, testFiles);
      
      console.log(`Executing: npx playwright test ${args.join(' ')}`);
      
      const child = spawn('npx', ['playwright', 'test', ...args], {
        cwd: this.projectRoot,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, ...this.buildEnvVars(options) }
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text);
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error(text);
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const result = this.parseTestResults(output + errorOutput, code === 0, duration);
        
        if (code === 0) {
          resolve(result);
        } else {
          resolve({
            ...result,
            success: false
          });
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to start test process: ${error.message}`));
      });
    });
  }

  /**
   * Build Playwright command line arguments
   */
  private buildPlaywrightArgs(options: TestRunOptions, testFiles?: string[]): string[] {
    const args: string[] = [];

    if (testFiles && testFiles.length > 0) {
      args.push(...testFiles);
    }

    if (options.project) {
      args.push('--project', options.project);
    } else if (options.browser && options.browser !== 'all') {
      args.push('--project', options.browser);
    }

    if (options.headed) {
      args.push('--headed');
    }

    if (options.debug) {
      args.push('--debug');
    }

    if (options.grep) {
      args.push('--grep', options.grep);
    }

    if (options.reporter) {
      args.push('--reporter', options.reporter);
    }

    if (options.workers !== undefined) {
      args.push('--workers', options.workers.toString());
    }

    if (options.retries !== undefined) {
      args.push('--retries', options.retries.toString());
    }

    if (options.timeout !== undefined) {
      args.push('--timeout', options.timeout.toString());
    }

    if (options.outputDir) {
      args.push('--output', options.outputDir);
    }

    return args;
  }

  /**
   * Build environment variables for test execution
   */
  private buildEnvVars(options: TestRunOptions): Record<string, string> {
    const env: Record<string, string> = {};

    if (options.debug) {
      env.DEBUG = 'pw:test*';
      env.PWDEBUG = '1';
    }

    // Set test-specific environment variables
    env.NODE_ENV = 'test';
    env.PLAYWRIGHT_TEST = 'true';

    return env;
  }

  /**
   * Parse test results from Playwright output
   */
  private parseTestResults(output: string, success: boolean, duration: number): TestRunResult {
    // Parse Playwright output to extract test statistics
    // This is a simplified parser - in practice you'd use the JSON reporter
    
    const testCountMatch = output.match(/(\d+) passed/);
    const passedCount = testCountMatch ? parseInt(testCountMatch[1]) : 0;
    
    const failedMatch = output.match(/(\d+) failed/);
    const failedCount = failedMatch ? parseInt(failedMatch[1]) : 0;
    
    const skippedMatch = output.match(/(\d+) skipped/);
    const skippedCount = skippedMatch ? parseInt(skippedMatch[1]) : 0;
    
    const testCount = passedCount + failedCount + skippedCount;

    return {
      success,
      output,
      duration,
      testCount,
      passedCount,
      failedCount,
      skippedCount
    };
  }
}

/**
 * Test environment management
 */
export class TestEnvironment {
  /**
   * Set up test environment
   */
  static async setup(): Promise<void> {
    console.log('🛠️ Setting up test environment...');
    
    // Clear any existing test data
    await this.clearTestData();
    
    // Start services if needed
    await this.startServices();
    
    console.log('✅ Test environment ready');
  }

  /**
   * Tear down test environment
   */
  static async teardown(): Promise<void> {
    console.log('🧹 Tearing down test environment...');
    
    // Clean up test data
    await this.clearTestData();
    
    // Stop services
    await this.stopServices();
    
    console.log('✅ Test environment cleaned up');
  }

  /**
   * Clear test data
   */
  private static async clearTestData(): Promise<void> {
    // Implementation depends on your data storage
    console.log('Clearing test data...');
  }

  /**
   * Start required services
   */
  private static async startServices(): Promise<void> {
    // Start mock servers, databases, etc.
    console.log('Starting services...');
  }

  /**
   * Stop services
   */
  private static async stopServices(): Promise<void> {
    // Stop services
    console.log('Stopping services...');
  }
}

/**
 * Test reporting utilities
 */
export class TestReporter {
  /**
   * Generate comprehensive test report
   */
  static generateReport(results: TestRunResult[]): string {
    const totalTests = results.reduce((sum, r) => sum + r.testCount, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passedCount, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failedCount, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const successRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(2) : '0';

    return `
📊 E2E Test Report
═══════════════════════════════════════
📈 Summary:
   Total Tests: ${totalTests}
   ✅ Passed: ${totalPassed}
   ❌ Failed: ${totalFailed}
   📊 Success Rate: ${successRate}%
   ⏱️ Total Duration: ${Math.round(totalDuration / 1000)}s

🔍 Details:
${results.map((result, index) => `
   Run ${index + 1}:
   - Tests: ${result.testCount}
   - Passed: ${result.passedCount}
   - Failed: ${result.failedCount}
   - Duration: ${Math.round(result.duration / 1000)}s
`).join('')}
═══════════════════════════════════════
    `;
  }

  /**
   * Send test results to external services
   */
  static async sendResults(results: TestRunResult[], service: 'slack' | 'teams' | 'email'): Promise<void> {
    const report = this.generateReport(results);
    
    // Implementation would depend on the service
    console.log(`Sending results to ${service}:`, report);
  }
}

/**
 * Parallel test execution utility
 */
export class ParallelTestRunner {
  /**
   * Run multiple test suites in parallel
   */
  static async runInParallel(
    runner: TestRunner,
    testSuites: Array<{ name: string; fn: () => Promise<TestRunResult> }>
  ): Promise<Map<string, TestRunResult>> {
    console.log('🚀 Running test suites in parallel...');
    
    const promises = testSuites.map(async (suite) => {
      console.log(`Starting ${suite.name}...`);
      const result = await suite.fn();
      console.log(`${suite.name} completed: ${result.success ? '✅' : '❌'}`);
      return [suite.name, result] as [string, TestRunResult];
    });

    const results = await Promise.all(promises);
    
    return new Map(results);
  }
}

export default TestRunner;