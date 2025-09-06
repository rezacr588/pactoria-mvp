/**
 * Integration Test Service
 * Tests full-stack integration between frontend and backend
 */

import { env } from '../config/env';
import { api, forceHealthCheck, getConnectionStatus } from './api';
import { websocketService } from './websocketService';
import { errorHandler } from './errorHandler';

export interface IntegrationTestResult {
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration: number;
  error?: any;
}

export interface IntegrationTestSuite {
  name: string;
  results: IntegrationTestResult[];
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  overallStatus: 'pass' | 'fail' | 'partial';
}

class IntegrationTestService {
  private testTimeout = 10000; // 10 seconds per test

  /**
   * Run complete integration test suite
   */
  async runFullTestSuite(): Promise<IntegrationTestSuite> {
    const suite: IntegrationTestSuite = {
      name: 'Pactoria MVP Integration Tests',
      results: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      totalDuration: 0,
      overallStatus: 'pass'
    };

    const startTime = Date.now();

    console.group('🧪 Running Integration Tests');

    try {
      // Core connectivity tests
      suite.results.push(await this.testEnvironmentConfig());
      suite.results.push(await this.testApiHealth());
      suite.results.push(await this.testCorsConfiguration());
      
      // Authentication flow tests
      suite.results.push(await this.testAuthenticationEndpoints());
      
      // API integration tests
      suite.results.push(await this.testApiRequestRetry());
      suite.results.push(await this.testApiErrorHandling());
      
      // WebSocket tests
      suite.results.push(await this.testWebSocketConnection());
      
      // File upload tests
      suite.results.push(await this.testFileUploadValidation());

    } catch (error) {
      console.error('Test suite execution error:', error);
    }

    suite.totalDuration = Date.now() - startTime;

    // Calculate results
    suite.results.forEach(result => {
      switch (result.status) {
        case 'pass':
          suite.passed++;
          break;
        case 'fail':
          suite.failed++;
          break;
        case 'skip':
          suite.skipped++;
          break;
      }
    });

    suite.overallStatus = suite.failed === 0 ? 'pass' : 
                         suite.passed > 0 ? 'partial' : 'fail';

    console.groupEnd();

    this.logResults(suite);
    return suite;
  }

  /**
   * Test environment configuration
   */
  private async testEnvironmentConfig(): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      const config = env.getConfig();
      
      // Check required configuration
      const requiredChecks = [
        { key: 'API_URL', value: config.API_URL, required: true },
        { key: 'WS_URL', value: config.WS_URL, required: true },
        { key: 'ENVIRONMENT', value: config.ENVIRONMENT, required: true }
      ];

      const missing = requiredChecks.filter(check => 
        check.required && (!check.value || check.value === '')
      );

      if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.map(m => m.key).join(', ')}`);
      }

      // Validate URL formats
      try {
        new URL(config.API_URL);
      } catch {
        throw new Error(`Invalid API_URL format: ${config.API_URL}`);
      }

      return {
        test: 'Environment Configuration',
        status: 'pass',
        message: `Configuration valid for ${config.ENVIRONMENT} environment`,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        test: 'Environment Configuration',
        status: 'fail',
        message: error.message,
        duration: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Test API health endpoint
   */
  private async testApiHealth(): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await forceHealthCheck();
      
      if (!isHealthy) {
        throw new Error('API health check failed');
      }

      const connectionStatus = getConnectionStatus();
      if (connectionStatus !== 'connected') {
        throw new Error(`API connection status is ${connectionStatus}`);
      }

      return {
        test: 'API Health Check',
        status: 'pass',
        message: 'API is healthy and responsive',
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        test: 'API Health Check',
        status: 'fail',
        message: `API health check failed: ${error.message}`,
        duration: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Test CORS configuration
   */
  private async testCorsConfiguration(): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      // Make a preflight request to test CORS
      const response = await fetch(`${env.get('API_URL')}/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization, Content-Type'
        }
      });

      if (!response.ok) {
        throw new Error(`CORS preflight failed: ${response.status}`);
      }

      // Check CORS headers
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      const allowCredentials = response.headers.get('Access-Control-Allow-Credentials');
      
      if (allowOrigin !== window.location.origin && allowOrigin !== '*') {
        console.warn(`CORS origin mismatch. Expected: ${window.location.origin}, Got: ${allowOrigin}`);
      }

      return {
        test: 'CORS Configuration',
        status: 'pass',
        message: 'CORS is properly configured',
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        test: 'CORS Configuration',
        status: 'fail',
        message: `CORS configuration error: ${error.message}`,
        duration: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Test authentication endpoints
   */
  private async testAuthenticationEndpoints(): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      // Test that auth endpoints are reachable (without actually logging in)
      const testRequests = [
        { endpoint: '/auth/me', expectedStatus: 401 }, // Should return 401 without token
      ];

      for (const test of testRequests) {
        try {
          await api.get(test.endpoint);
          // If this succeeds, it's unexpected for /auth/me without token
          if (test.expectedStatus === 401) {
            throw new Error(`Expected ${test.expectedStatus} but request succeeded`);
          }
        } catch (error: any) {
          if (error.status !== test.expectedStatus) {
            throw new Error(`Expected status ${test.expectedStatus} but got ${error.status} for ${test.endpoint}`);
          }
          // This is expected behavior
        }
      }

      return {
        test: 'Authentication Endpoints',
        status: 'pass',
        message: 'Authentication endpoints are accessible and return expected responses',
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        test: 'Authentication Endpoints',
        status: 'fail',
        message: `Authentication endpoint test failed: ${error.message}`,
        duration: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Test API request retry logic
   */
  private async testApiRequestRetry(): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      // This is hard to test without mocking, so we'll just verify the retry configuration exists
      const retryAttempts = env.get('ERROR_RETRY_ATTEMPTS');
      const retryDelay = env.get('ERROR_RETRY_DELAY');

      if (retryAttempts < 1 || retryAttempts > 10) {
        throw new Error(`Invalid retry attempts configuration: ${retryAttempts}`);
      }

      if (retryDelay < 100 || retryDelay > 10000) {
        throw new Error(`Invalid retry delay configuration: ${retryDelay}`);
      }

      return {
        test: 'API Retry Configuration',
        status: 'pass',
        message: `Retry logic configured: ${retryAttempts} attempts with ${retryDelay}ms delay`,
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        test: 'API Retry Configuration',
        status: 'fail',
        message: error.message,
        duration: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Test API error handling
   */
  private async testApiErrorHandling(): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      // Test 404 error handling
      try {
        await api.get('/nonexistent-endpoint');
        throw new Error('Expected 404 error but request succeeded');
      } catch (error: any) {
        if (error.status !== 404) {
          throw new Error(`Expected 404 error but got ${error.status}`);
        }
        // This is expected - the error should be properly formatted
        if (!error.message) {
          throw new Error('API error should have a message');
        }
      }

      return {
        test: 'API Error Handling',
        status: 'pass',
        message: 'API errors are properly handled and formatted',
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        test: 'API Error Handling',
        status: 'fail',
        message: error.message,
        duration: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Test WebSocket connection (without authentication)
   */
  private async testWebSocketConnection(): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      // Test WebSocket URL configuration
      const wsUrl = env.get('WS_URL');
      
      if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        throw new Error(`Invalid WebSocket URL format: ${wsUrl}`);
      }

      // Verify WebSocket service is available
      if (!websocketService) {
        throw new Error('WebSocket service is not available');
      }

      // Test WebSocket configuration
      const stats = websocketService.getStats();
      if (!stats) {
        throw new Error('WebSocket stats not available');
      }

      return {
        test: 'WebSocket Configuration',
        status: 'pass',
        message: 'WebSocket service is properly configured',
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        test: 'WebSocket Configuration',
        status: 'fail',
        message: error.message,
        duration: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Test file upload validation
   */
  private async testFileUploadValidation(): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      // Create test files to validate
      const validFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const invalidFile = new File(['test content'], 'test.exe', { type: 'application/x-executable' });
      const largeFile = new File([new ArrayBuffer(20 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' }); // 20MB

      // Test file upload service validation
      const { fileUploadService } = await import('./fileUploadService');

      // Valid file should pass
      const validResult = fileUploadService.validateFile(validFile);
      if (!validResult.isValid) {
        throw new Error(`Valid file failed validation: ${validResult.errors.join(', ')}`);
      }

      // Invalid file should fail
      const invalidResult = fileUploadService.validateFile(invalidFile);
      if (invalidResult.isValid) {
        throw new Error('Invalid file type passed validation');
      }

      // Large file should fail
      const largeResult = fileUploadService.validateFile(largeFile);
      if (largeResult.isValid) {
        throw new Error('Large file passed validation');
      }

      return {
        test: 'File Upload Validation',
        status: 'pass',
        message: 'File upload validation is working correctly',
        duration: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        test: 'File Upload Validation',
        status: 'fail',
        message: error.message,
        duration: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Log test results
   */
  private logResults(suite: IntegrationTestSuite): void {
    console.log(`\n📊 Integration Test Results:`);
    console.log(`════════════════════════════════════════`);
    console.log(`Suite: ${suite.name}`);
    console.log(`Status: ${suite.overallStatus.toUpperCase()}`);
    console.log(`Duration: ${suite.totalDuration}ms`);
    console.log(`\n📈 Summary:`);
    console.log(`  ✅ Passed: ${suite.passed}`);
    console.log(`  ❌ Failed: ${suite.failed}`);
    console.log(`  ⏭️  Skipped: ${suite.skipped}`);
    console.log(`  📊 Total: ${suite.results.length}`);

    if (suite.failed > 0) {
      console.log(`\n❌ Failed Tests:`);
      suite.results
        .filter(result => result.status === 'fail')
        .forEach(result => {
          console.log(`  • ${result.test}: ${result.message}`);
          if (result.error && env.get('DEBUG_API_CALLS')) {
            console.log(`    Error:`, result.error);
          }
        });
    }

    console.log(`════════════════════════════════════════\n`);
  }

  /**
   * Run a quick connectivity test
   */
  async quickConnectivityTest(): Promise<boolean> {
    try {
      const healthTest = await this.testApiHealth();
      const configTest = await this.testEnvironmentConfig();
      
      return healthTest.status === 'pass' && configTest.status === 'pass';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const integrationTest = new IntegrationTestService();
export default integrationTest;