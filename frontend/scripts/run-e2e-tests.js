#!/usr/bin/env node

/**
 * Comprehensive E2E Test Runner Script
 * 
 * This script provides a unified interface for running different types of E2E tests
 * with proper setup, execution, and reporting.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class E2ETestRunner {
  constructor() {
    this.projectRoot = process.cwd();
    this.testResults = new Map();
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  async checkPrerequisites() {
    this.log('🔍 Checking prerequisites...', 'cyan');

    // Check if Playwright is installed
    try {
      await this.runCommand('npx', ['playwright', '--version'], { silent: true });
      this.log('✅ Playwright is installed', 'green');
    } catch (error) {
      this.log('❌ Playwright not found. Installing...', 'red');
      await this.runCommand('npm', ['run', 'test:e2e:install']);
    }

    // Check if application is running
    try {
      const response = await fetch('http://localhost:5173');
      if (response.ok) {
        this.log('✅ Frontend application is running', 'green');
      } else {
        throw new Error('Application not responding');
      }
    } catch (error) {
      this.log('⚠️ Frontend application not running on port 5173', 'yellow');
      this.log('Please start the application with: npm run dev', 'yellow');
      
      const shouldStart = await this.askUser('Would you like to start the application now? (y/N): ');
      if (shouldStart.toLowerCase() === 'y') {
        await this.startApplication();
      } else {
        process.exit(1);
      }
    }
  }

  async startApplication() {
    this.log('🚀 Starting frontend application...', 'cyan');
    
    // This would start the application in the background
    // For now, we'll just provide instructions
    this.log('Please run "npm run dev" in another terminal and press Enter when ready...', 'yellow');
    await this.waitForUserInput();
  }

  async runTestSuite(suiteName, options = {}) {
    this.log(`\n${'='.repeat(50)}`, 'cyan');
    this.log(`🧪 Running ${suiteName} Tests`, 'bright');
    this.log(`${'='.repeat(50)}`, 'cyan');

    const startTime = Date.now();

    try {
      const result = await this.executePlaywrightTest(options);
      const duration = Date.now() - startTime;
      
      this.testResults.set(suiteName, {
        success: result.success,
        duration,
        output: result.output
      });

      if (result.success) {
        this.log(`✅ ${suiteName} tests completed successfully`, 'green');
      } else {
        this.log(`❌ ${suiteName} tests failed`, 'red');
      }

    } catch (error) {
      this.log(`💥 ${suiteName} tests crashed: ${error.message}`, 'red');
      this.testResults.set(suiteName, {
        success: false,
        duration: Date.now() - startTime,
        output: error.message
      });
    }
  }

  async executePlaywrightTest(options = {}) {
    const args = ['playwright', 'test'];
    
    // Add test files if specified
    if (options.files) {
      args.push(...options.files);
    }

    // Add other options
    if (options.project) args.push('--project', options.project);
    if (options.headed) args.push('--headed');
    if (options.debug) args.push('--debug');
    if (options.grep) args.push('--grep', options.grep);
    if (options.reporter) args.push('--reporter', options.reporter);
    if (options.workers) args.push('--workers', options.workers);
    if (options.retries !== undefined) args.push('--retries', options.retries);
    if (options.timeout) args.push('--timeout', options.timeout);

    const result = await this.runCommand('npx', args, { 
      returnOutput: true,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ...(options.env || {})
      }
    });

    return result;
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const { silent = false, returnOutput = false, env } = options;
      
      if (!silent) {
        this.log(`Running: ${command} ${args.join(' ')}`, 'blue');
      }

      const child = spawn(command, args, {
        stdio: returnOutput ? ['inherit', 'pipe', 'pipe'] : 'inherit',
        env: env || process.env,
        shell: process.platform === 'win32'
      });

      let output = '';
      let errorOutput = '';

      if (returnOutput) {
        child.stdout?.on('data', (data) => {
          const text = data.toString();
          output += text;
          if (!silent) process.stdout.write(text);
        });

        child.stderr?.on('data', (data) => {
          const text = data.toString();
          errorOutput += text;
          if (!silent) process.stderr.write(text);
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output: output + errorOutput
          });
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async askUser(question) {
    return new Promise((resolve) => {
      process.stdout.write(question);
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim());
      });
    });
  }

  async waitForUserInput() {
    return new Promise((resolve) => {
      process.stdin.once('data', () => resolve());
    });
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.testResults.size;
    const passedTests = Array.from(this.testResults.values()).filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('📊 E2E TEST EXECUTION SUMMARY', 'bright');
    this.log('='.repeat(60), 'cyan');

    this.log(`\n📈 Overall Results:`, 'bright');
    this.log(`   Total Test Suites: ${totalTests}`, 'cyan');
    this.log(`   ✅ Passed: ${passedTests}`, 'green');
    this.log(`   ❌ Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'cyan');
    this.log(`   ⏱️ Total Duration: ${Math.round(totalDuration / 1000)}s`, 'cyan');

    this.log(`\n🔍 Detailed Results:`, 'bright');
    
    for (const [suiteName, result] of this.testResults) {
      const status = result.success ? '✅' : '❌';
      const color = result.success ? 'green' : 'red';
      const duration = Math.round(result.duration / 1000);
      
      this.log(`   ${status} ${suiteName}: ${duration}s`, color);
    }

    this.log('\n' + '='.repeat(60), 'cyan');

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration,
      totalTests,
      passedTests,
      failedTests,
      results: Object.fromEntries(this.testResults)
    };

    const reportPath = path.join(this.projectRoot, 'test-results', 'e2e-summary.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📄 Detailed report saved to: ${reportPath}`, 'cyan');

    return failedTests === 0;
  }

  async runSmokeTests() {
    await this.runTestSuite('Smoke', {
      grep: '@smoke',
      reporter: 'list',
      workers: '1',
      retries: 1
    });
  }

  async runRegressionTests() {
    await this.runTestSuite('Regression', {
      reporter: 'html',
      workers: '4',
      retries: 2
    });
  }

  async runPerformanceTests() {
    await this.runTestSuite('Performance', {
      files: ['e2e/performance/performance.spec.ts'],
      reporter: 'json',
      workers: '1',
      timeout: '60000'
    });
  }

  async runAccessibilityTests() {
    await this.runTestSuite('Accessibility', {
      files: ['e2e/accessibility/accessibility.spec.ts'],
      reporter: 'json',
      workers: '2'
    });
  }

  async runCrossBrowserTests() {
    const browsers = ['chromium', 'firefox', 'webkit'];
    
    for (const browser of browsers) {
      await this.runTestSuite(`Cross-Browser (${browser})`, {
        project: browser,
        files: ['e2e/auth/auth.spec.ts', 'e2e/contracts/contracts-crud.spec.ts'],
        workers: '1'
      });
    }
  }

  async runVisualTests() {
    await this.runTestSuite('Visual Regression', {
      files: ['e2e/responsive/responsive.spec.ts'],
      workers: '1',
      env: {
        VISUAL_TESTING: 'true'
      }
    });
  }

  async runCustomTests(testPattern) {
    await this.runTestSuite(`Custom (${testPattern})`, {
      grep: testPattern,
      reporter: 'list'
    });
  }

  async run() {
    this.log('🎭 Pactoria E2E Test Runner', 'bright');
    this.log('================================\n', 'cyan');

    const args = process.argv.slice(2);
    const command = args[0] || 'help';

    try {
      await this.checkPrerequisites();

      switch (command) {
        case 'smoke':
          await this.runSmokeTests();
          break;

        case 'regression':
          await this.runRegressionTests();
          break;

        case 'performance':
          await this.runPerformanceTests();
          break;

        case 'accessibility':
          await this.runAccessibilityTests();
          break;

        case 'cross-browser':
          await this.runCrossBrowserTests();
          break;

        case 'visual':
          await this.runVisualTests();
          break;

        case 'all':
          await this.runSmokeTests();
          await this.runRegressionTests();
          await this.runPerformanceTests();
          await this.runAccessibilityTests();
          break;

        case 'custom':
          const pattern = args[1];
          if (!pattern) {
            this.log('❌ Please provide a test pattern for custom tests', 'red');
            process.exit(1);
          }
          await this.runCustomTests(pattern);
          break;

        case 'help':
        default:
          this.showHelp();
          return;
      }

      const success = this.generateReport();
      process.exit(success ? 0 : 1);

    } catch (error) {
      this.log(`💥 Test execution failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  showHelp() {
    this.log('Usage: node scripts/run-e2e-tests.js <command>', 'bright');
    this.log('\nAvailable commands:', 'cyan');
    this.log('  smoke          Run smoke tests (critical user journeys)', 'yellow');
    this.log('  regression     Run full regression test suite', 'yellow');
    this.log('  performance    Run performance and load tests', 'yellow');
    this.log('  accessibility  Run accessibility compliance tests', 'yellow');
    this.log('  cross-browser  Run tests across multiple browsers', 'yellow');
    this.log('  visual         Run visual regression tests', 'yellow');
    this.log('  all            Run all test suites', 'yellow');
    this.log('  custom <pattern> Run tests matching pattern', 'yellow');
    this.log('  help           Show this help message', 'yellow');
    this.log('\nExamples:', 'cyan');
    this.log('  node scripts/run-e2e-tests.js smoke', 'green');
    this.log('  node scripts/run-e2e-tests.js custom "@auth"', 'green');
    this.log('  node scripts/run-e2e-tests.js all', 'green');
  }
}

// Run the script if called directly
if (require.main === module) {
  const runner = new E2ETestRunner();
  runner.run().catch((error) => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });
}

module.exports = E2ETestRunner;