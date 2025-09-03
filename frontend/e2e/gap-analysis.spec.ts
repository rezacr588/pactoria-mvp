import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * COMPREHENSIVE FRONTEND-BACKEND INTEGRATION GAP ANALYSIS
 * 
 * This test suite analyzes the current state of frontend-backend integration
 * and generates a detailed report identifying gaps, missing connections,
 * and production readiness issues.
 */

interface ApiEndpoint {
  method: string;
  path: string;
  implemented: boolean;
  tested: boolean;
  hasError: boolean;
  errorType?: string;
  responseTime?: number;
  expectedResponse?: any;
  actualResponse?: any;
  usedByComponents: string[];
  critical: boolean;
}

interface GapAnalysisReport {
  generatedAt: string;
  testEnvironment: {
    baseUrl: string;
    apiBaseUrl: string;
    backendAvailable: boolean;
  };
  summary: {
    totalEndpoints: number;
    implementedEndpoints: number;
    workingEndpoints: number;
    failingEndpoints: number;
    missingEndpoints: number;
    criticalIssues: number;
    productionReadiness: string;
    overallScore: number;
  };
  endpoints: ApiEndpoint[];
  missingFeatures: string[];
  criticalIssues: string[];
  recommendations: string[];
  productionBlockers: string[];
  implementationPriority: {
    high: string[];
    medium: string[];
    low: string[];
  };
}

class GapAnalyzer {
  private page: Page;
  private report: GapAnalysisReport;
  private apiRequests: Map<string, any> = new Map();
  private apiResponses: Map<string, any> = new Map();

  constructor(page: Page) {
    this.page = page;
    this.report = {
      generatedAt: new Date().toISOString(),
      testEnvironment: {
        baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
        apiBaseUrl: process.env.VITE_API_URL || 'http://localhost:8000/api/v1',
        backendAvailable: false
      },
      summary: {
        totalEndpoints: 0,
        implementedEndpoints: 0,
        workingEndpoints: 0,
        failingEndpoints: 0,
        missingEndpoints: 0,
        criticalIssues: 0,
        productionReadiness: 'Not Ready',
        overallScore: 0
      },
      endpoints: [],
      missingFeatures: [],
      criticalIssues: [],
      recommendations: [],
      productionBlockers: [],
      implementationPriority: {
        high: [],
        medium: [],
        low: []
      }
    };
  }

  async setupNetworkMonitoring() {
    // Track all API requests
    this.page.on('request', request => {
      if (request.url().includes('/api/v1/')) {
        const key = `${request.method()} ${request.url()}`;
        this.apiRequests.set(key, {
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData(),
          timestamp: Date.now()
        });
      }
    });

    // Track all API responses
    this.page.on('response', response => {
      if (response.url().includes('/api/v1/')) {
        const key = `${response.request().method()} ${response.url()}`;
        this.apiResponses.set(key, {
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
          timestamp: Date.now()
        });
      }
    });

    // Track failed requests
    this.page.on('requestfailed', request => {
      if (request.url().includes('/api/v1/')) {
        const key = `${request.method()} ${request.url()}`;
        this.apiResponses.set(key, {
          status: 0,
          statusText: 'FAILED',
          error: request.failure()?.errorText || 'Network error',
          timestamp: Date.now()
        });
      }
    });
  }

  async checkBackendAvailability(): Promise<boolean> {
    try {
      // Try to make a simple request to check if backend is running
      const response = await this.page.request.get(`${this.report.testEnvironment.apiBaseUrl}/health`, {
        timeout: 5000
      });
      this.report.testEnvironment.backendAvailable = response.ok();
      return response.ok();
    } catch (error) {
      this.report.testEnvironment.backendAvailable = false;
      return false;
    }
  }

  async analyzeCriticalUserFlows() {
    console.log('Analyzing critical user flows...');

    const flows = [
      {
        name: 'User Registration & Login',
        path: '/login',
        actions: async () => {
          await this.page.goto('/login');
          await this.page.fill('[name="email"]', 'test@example.com');
          await this.page.fill('[name="password"]', 'password123');
          await this.page.click('button[type="submit"]');
          await this.page.waitForTimeout(2000);
        },
        expectedEndpoints: [
          'POST /auth/login',
          'GET /auth/me'
        ],
        critical: true
      },
      {
        name: 'Dashboard Data Loading',
        path: '/dashboard',
        actions: async () => {
          await this.page.goto('/dashboard');
          await this.page.waitForTimeout(3000);
        },
        expectedEndpoints: [
          'GET /analytics/dashboard',
          'GET /contracts'
        ],
        critical: true
      },
      {
        name: 'Contract List & Search',
        path: '/contracts',
        actions: async () => {
          await this.page.goto('/contracts');
          await this.page.waitForTimeout(2000);
          
          const searchInput = this.page.locator('input[placeholder*="Search"]').first();
          if (await searchInput.isVisible()) {
            await searchInput.fill('test contract');
            await this.page.waitForTimeout(1000);
          }
        },
        expectedEndpoints: [
          'GET /contracts',
          'GET /search/contracts/quick'
        ],
        critical: true
      },
      {
        name: 'Contract Creation',
        path: '/contracts/new',
        actions: async () => {
          await this.page.goto('/contracts/new');
          await this.page.waitForTimeout(2000);
          
          // Try to fill form if it exists
          try {
            await this.page.fill('[name="title"]', 'Test Contract');
            await this.page.selectOption('[name="contract_type"]', { index: 0 });
            await this.page.fill('[name="client_name"]', 'Test Client');
            await this.page.waitForTimeout(500);
          } catch (e) {
            // Form might not be available
          }
        },
        expectedEndpoints: [
          'GET /contracts/templates',
          'POST /contracts'
        ],
        critical: true
      },
      {
        name: 'Analytics Dashboard',
        path: '/analytics',
        actions: async () => {
          await this.page.goto('/analytics');
          await this.page.waitForTimeout(3000);
        },
        expectedEndpoints: [
          'GET /analytics/dashboard',
          'GET /analytics/business'
        ],
        critical: false
      },
      {
        name: 'Team Management',
        path: '/team',
        actions: async () => {
          await this.page.goto('/team');
          await this.page.waitForTimeout(2000);
        },
        expectedEndpoints: [
          'GET /team/members',
          'GET /team/roles'
        ],
        critical: false
      },
      {
        name: 'Notifications',
        path: '/notifications',
        actions: async () => {
          await this.page.goto('/notifications');
          await this.page.waitForTimeout(2000);
        },
        expectedEndpoints: [
          'GET /notifications',
          'GET /notifications/stats/summary'
        ],
        critical: false
      },
      {
        name: 'Templates Management',
        path: '/templates',
        actions: async () => {
          await this.page.goto('/templates');
          await this.page.waitForTimeout(2000);
        },
        expectedEndpoints: [
          'GET /templates',
          'GET /templates/categories'
        ],
        critical: false
      },
      {
        name: 'Integrations',
        path: '/integrations',
        actions: async () => {
          await this.page.goto('/integrations');
          await this.page.waitForTimeout(2000);
        },
        expectedEndpoints: [
          'GET /integrations',
          'GET /integrations/categories/list'
        ],
        critical: false
      },
      {
        name: 'Audit Trail',
        path: '/audit',
        actions: async () => {
          await this.page.goto('/audit');
          await this.page.waitForTimeout(2000);
        },
        expectedEndpoints: [
          'GET /audit/entries',
          'GET /audit/stats'
        ],
        critical: false
      }
    ];

    for (const flow of flows) {
      console.log(`Testing flow: ${flow.name}`);
      
      try {
        this.apiRequests.clear();
        this.apiResponses.clear();
        
        await flow.actions();
        
        // Check which expected endpoints were called
        for (const endpoint of flow.expectedEndpoints) {
          const [method, path] = endpoint.split(' ');
          const found = Array.from(this.apiRequests.keys()).some(key => 
            key.includes(method) && key.includes(path.replace(/\{[^}]+\}/g, ''))
          );
          
          const responseKey = Array.from(this.apiResponses.keys()).find(key => 
            key.includes(method) && key.includes(path.replace(/\{[^}]+\}/g, ''))
          );
          
          const response = responseKey ? this.apiResponses.get(responseKey) : null;
          
          this.report.endpoints.push({
            method,
            path,
            implemented: found,
            tested: true,
            hasError: response ? response.status >= 400 || response.status === 0 : !found,
            errorType: response?.error || (response?.status >= 400 ? `HTTP ${response.status}` : undefined),
            responseTime: response ? response.timestamp - (this.apiRequests.get(responseKey!)?.timestamp || 0) : undefined,
            usedByComponents: [flow.name],
            critical: flow.critical
          });
        }
        
      } catch (error) {
        console.error(`Error testing flow ${flow.name}:`, error);
        this.report.criticalIssues.push(`Flow "${flow.name}" failed: ${error}`);
      }
    }
  }

  async analyzeApiEndpointCoverage() {
    console.log('Analyzing API endpoint coverage...');

    // All endpoints defined in the API service
    const allEndpoints = [
      // Authentication
      { method: 'POST', path: '/auth/login', critical: true, component: 'LoginPage' },
      { method: 'POST', path: '/auth/register', critical: true, component: 'LoginPage' },
      { method: 'GET', path: '/auth/me', critical: true, component: 'AuthStore' },
      { method: 'PUT', path: '/auth/me', critical: false, component: 'SettingsPage' },

      // Contracts
      { method: 'GET', path: '/contracts', critical: true, component: 'ContractsPage' },
      { method: 'POST', path: '/contracts', critical: true, component: 'ContractCreatePage' },
      { method: 'GET', path: '/contracts/{id}', critical: true, component: 'ContractViewPage' },
      { method: 'PUT', path: '/contracts/{id}', critical: true, component: 'ContractEditPage' },
      { method: 'DELETE', path: '/contracts/{id}', critical: true, component: 'ContractActions' },
      { method: 'POST', path: '/contracts/{id}/generate', critical: true, component: 'ContractGeneration' },
      { method: 'POST', path: '/contracts/{id}/analyze', critical: true, component: 'ComplianceAnalysis' },
      { method: 'GET', path: '/contracts/templates', critical: true, component: 'TemplateSelector' },

      // Analytics
      { method: 'GET', path: '/analytics/dashboard', critical: true, component: 'DashboardPage' },
      { method: 'GET', path: '/analytics/business', critical: false, component: 'AnalyticsPage' },
      { method: 'GET', path: '/analytics/time-series/{metric}', critical: false, component: 'ChartsComponent' },

      // Search
      { method: 'POST', path: '/search/contracts', critical: true, component: 'AdvancedSearch' },
      { method: 'POST', path: '/search/users', critical: false, component: 'UserSearch' },
      { method: 'POST', path: '/search/templates', critical: false, component: 'TemplateSearch' },
      { method: 'GET', path: '/search/contracts/quick', critical: true, component: 'QuickSearch' },
      { method: 'GET', path: '/search/suggestions/contracts', critical: false, component: 'SearchSuggestions' },
      { method: 'GET', path: '/search/facets/contracts', critical: false, component: 'SearchFilters' },

      // Bulk Operations
      { method: 'POST', path: '/bulk/contracts/update', critical: false, component: 'BulkOperations' },
      { method: 'POST', path: '/bulk/contracts/delete', critical: false, component: 'BulkOperations' },
      { method: 'POST', path: '/bulk/contracts/export', critical: false, component: 'ExportFeature' },
      { method: 'POST', path: '/bulk/users/invite', critical: false, component: 'TeamInvite' },
      { method: 'POST', path: '/bulk/users/role-change', critical: false, component: 'RoleManagement' },
      { method: 'GET', path: '/bulk/status/{operationId}', critical: false, component: 'BulkStatus' },

      // Templates
      { method: 'GET', path: '/templates', critical: false, component: 'TemplatesPage' },
      { method: 'POST', path: '/templates', critical: false, component: 'TemplateCreate' },
      { method: 'GET', path: '/templates/{id}', critical: false, component: 'TemplateView' },
      { method: 'PUT', path: '/templates/{id}', critical: false, component: 'TemplateEdit' },
      { method: 'DELETE', path: '/templates/{id}', critical: false, component: 'TemplateDelete' },
      { method: 'GET', path: '/templates/categories', critical: false, component: 'TemplateFilters' },
      { method: 'GET', path: '/templates/contract-types', critical: false, component: 'TemplateFilters' },

      // WebSocket
      { method: 'GET', path: '/ws/stats', critical: false, component: 'WebSocketService' },
      { method: 'GET', path: '/ws/health', critical: false, component: 'WebSocketService' },

      // Notifications
      { method: 'GET', path: '/notifications', critical: false, component: 'NotificationsPage' },
      { method: 'GET', path: '/notifications/{id}', critical: false, component: 'NotificationDetail' },
      { method: 'PUT', path: '/notifications/{id}/read', critical: false, component: 'NotificationActions' },
      { method: 'PUT', path: '/notifications/read-all', critical: false, component: 'NotificationActions' },
      { method: 'DELETE', path: '/notifications/{id}', critical: false, component: 'NotificationActions' },
      { method: 'GET', path: '/notifications/stats/summary', critical: false, component: 'NotificationBadge' },
      { method: 'POST', path: '/notifications', critical: false, component: 'AdminNotifications' },

      // Team Management
      { method: 'GET', path: '/team/members', critical: false, component: 'TeamPage' },
      { method: 'GET', path: '/team/members/{id}', critical: false, component: 'TeamMemberDetail' },
      { method: 'POST', path: '/team/invite', critical: false, component: 'TeamInvite' },
      { method: 'PUT', path: '/team/members/{id}/role', critical: false, component: 'RoleChange' },
      { method: 'DELETE', path: '/team/members/{id}', critical: false, component: 'TeamActions' },
      { method: 'POST', path: '/team/members/{id}/resend-invite', critical: false, component: 'InviteActions' },
      { method: 'GET', path: '/team/stats', critical: false, component: 'TeamDashboard' },
      { method: 'GET', path: '/team/roles', critical: false, component: 'RoleSelector' },

      // Integrations
      { method: 'GET', path: '/integrations', critical: false, component: 'IntegrationsPage' },
      { method: 'GET', path: '/integrations/{id}', critical: false, component: 'IntegrationDetail' },
      { method: 'POST', path: '/integrations/{id}/connect', critical: false, component: 'IntegrationConnect' },
      { method: 'DELETE', path: '/integrations/{id}/disconnect', critical: false, component: 'IntegrationActions' },
      { method: 'PUT', path: '/integrations/{id}/configure', critical: false, component: 'IntegrationConfig' },
      { method: 'GET', path: '/integrations/{id}/sync-status', critical: false, component: 'IntegrationStatus' },
      { method: 'POST', path: '/integrations/{id}/sync', critical: false, component: 'IntegrationSync' },
      { method: 'GET', path: '/integrations/stats/summary', critical: false, component: 'IntegrationsDashboard' },
      { method: 'GET', path: '/integrations/categories/list', critical: false, component: 'IntegrationFilters' },

      // Audit
      { method: 'GET', path: '/audit/entries', critical: false, component: 'AuditTrailPage' },
      { method: 'GET', path: '/audit/entries/{id}', critical: false, component: 'AuditEntryDetail' },
      { method: 'GET', path: '/audit/stats', critical: false, component: 'AuditDashboard' },
      { method: 'POST', path: '/audit/entries/export', critical: false, component: 'AuditExport' }
    ];

    // Check each endpoint against the tested ones
    const testedEndpoints = new Set(this.report.endpoints.map(e => `${e.method} ${e.path}`));
    
    for (const endpoint of allEndpoints) {
      const key = `${endpoint.method} ${endpoint.path}`;
      const existing = this.report.endpoints.find(e => `${e.method} ${e.path}` === key);
      
      if (!existing) {
        this.report.endpoints.push({
          method: endpoint.method,
          path: endpoint.path,
          implemented: false,
          tested: false,
          hasError: true,
          errorType: 'NOT_TESTED',
          usedByComponents: [endpoint.component],
          critical: endpoint.critical
        });
      }
    }
  }

  async generateReport() {
    console.log('Generating gap analysis report...');

    // Calculate summary statistics
    this.report.summary.totalEndpoints = this.report.endpoints.length;
    this.report.summary.implementedEndpoints = this.report.endpoints.filter(e => e.implemented).length;
    this.report.summary.workingEndpoints = this.report.endpoints.filter(e => e.implemented && !e.hasError).length;
    this.report.summary.failingEndpoints = this.report.endpoints.filter(e => e.implemented && e.hasError).length;
    this.report.summary.missingEndpoints = this.report.endpoints.filter(e => !e.implemented).length;
    this.report.summary.criticalIssues = this.report.endpoints.filter(e => e.critical && (e.hasError || !e.implemented)).length;

    // Calculate production readiness score
    const criticalEndpoints = this.report.endpoints.filter(e => e.critical);
    const workingCriticalEndpoints = criticalEndpoints.filter(e => e.implemented && !e.hasError);
    const criticalScore = criticalEndpoints.length > 0 ? (workingCriticalEndpoints.length / criticalEndpoints.length) * 100 : 0;

    const overallScore = this.report.summary.totalEndpoints > 0 ? 
      (this.report.summary.workingEndpoints / this.report.summary.totalEndpoints) * 100 : 0;

    this.report.summary.overallScore = Math.round(overallScore);

    // Determine production readiness
    if (criticalScore >= 95 && overallScore >= 80) {
      this.report.summary.productionReadiness = 'READY';
    } else if (criticalScore >= 85 && overallScore >= 70) {
      this.report.summary.productionReadiness = 'NEARLY_READY';
    } else if (criticalScore >= 70) {
      this.report.summary.productionReadiness = 'MAJOR_GAPS';
    } else {
      this.report.summary.productionReadiness = 'NOT_READY';
    }

    // Identify missing features
    const missingCritical = this.report.endpoints.filter(e => e.critical && (!e.implemented || e.hasError));
    this.report.missingFeatures = missingCritical.map(e => `${e.method} ${e.path} - ${e.usedByComponents.join(', ')}`);

    // Add critical issues
    this.report.criticalIssues.push(
      ...missingCritical.map(e => `Critical endpoint ${e.method} ${e.path} is ${!e.implemented ? 'not implemented' : 'failing'}`)
    );

    // Add backend availability issues
    if (!this.report.testEnvironment.backendAvailable) {
      this.report.criticalIssues.push('Backend API server is not available or not responding');
      this.report.productionBlockers.push('Backend API must be running and accessible');
    }

    // Generate recommendations
    this.generateRecommendations();
    this.prioritizeImplementation();

    return this.report;
  }

  private generateRecommendations() {
    const recommendations = [
      'Implement missing critical API endpoints to ensure core functionality works',
      'Set up proper error handling for all API calls with user-friendly error messages',
      'Add loading states and skeleton screens for better user experience',
      'Implement retry mechanisms for failed API requests',
      'Add comprehensive logging for API requests and responses',
      'Set up API response caching where appropriate to improve performance',
      'Implement proper authentication token refresh mechanisms',
      'Add API endpoint monitoring and health checks',
      'Create mock API responses for development and testing',
      'Set up API documentation and contract testing'
    ];

    // Add specific recommendations based on findings
    if (this.report.summary.failingEndpoints > 0) {
      recommendations.push('Fix failing API endpoints - check backend implementation and error responses');
    }

    if (this.report.summary.missingEndpoints > 10) {
      recommendations.push('Consider implementing endpoints in phases, starting with critical user flows');
    }

    if (!this.report.testEnvironment.backendAvailable) {
      recommendations.push('Set up backend development environment and ensure API server is running');
    }

    const criticalFailures = this.report.endpoints.filter(e => e.critical && e.hasError).length;
    if (criticalFailures > 0) {
      recommendations.push(`${criticalFailures} critical endpoints are failing - these must be fixed before production`);
    }

    this.report.recommendations = recommendations;
  }

  private prioritizeImplementation() {
    const critical = this.report.endpoints.filter(e => e.critical && (!e.implemented || e.hasError));
    const medium = this.report.endpoints.filter(e => !e.critical && (!e.implemented || e.hasError));
    const low = this.report.endpoints.filter(e => e.implemented && !e.hasError);

    this.report.implementationPriority = {
      high: critical.map(e => `${e.method} ${e.path} - ${e.usedByComponents.join(', ')}`),
      medium: medium.slice(0, 10).map(e => `${e.method} ${e.path} - ${e.usedByComponents.join(', ')}`),
      low: ['Performance optimizations', 'Additional error handling', 'UI/UX improvements']
    };

    // Add production blockers
    if (critical.length > 0) {
      this.report.productionBlockers.push(`${critical.length} critical API endpoints not working`);
    }

    const authIssues = critical.filter(e => e.path.includes('/auth/'));
    if (authIssues.length > 0) {
      this.report.productionBlockers.push('Authentication system not fully functional');
    }

    const contractIssues = critical.filter(e => e.path.includes('/contracts'));
    if (contractIssues.length > 0) {
      this.report.productionBlockers.push('Core contract management features not working');
    }
  }
}

test.describe('Comprehensive Gap Analysis', () => {
  let analyzer: GapAnalyzer;

  test('Generate Complete Frontend-Backend Integration Report', async ({ page }) => {
    analyzer = new GapAnalyzer(page);
    
    console.log('Starting comprehensive gap analysis...');
    
    // Setup network monitoring
    await analyzer.setupNetworkMonitoring();
    
    // Check if backend is available
    const backendAvailable = await analyzer.checkBackendAvailability();
    console.log(`Backend available: ${backendAvailable}`);
    
    // Analyze critical user flows
    await analyzer.analyzeCriticalUserFlows();
    
    // Analyze API endpoint coverage
    await analyzer.analyzeApiEndpointCoverage();
    
    // Generate the final report
    const report = await analyzer.generateReport();
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'frontend-backend-integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown report
    const markdownReport = generateMarkdownReport(report);
    const markdownPath = path.join(process.cwd(), 'INTEGRATION_GAP_ANALYSIS.md');
    fs.writeFileSync(markdownPath, markdownReport);
    
    console.log(`Full report saved to: ${reportPath}`);
    console.log(`Markdown report saved to: ${markdownPath}`);
    
    // Print summary to console
    console.log('\n=== INTEGRATION GAP ANALYSIS SUMMARY ===');
    console.log(`Production Readiness: ${report.summary.productionReadiness}`);
    console.log(`Overall Score: ${report.summary.overallScore}%`);
    console.log(`Total Endpoints: ${report.summary.totalEndpoints}`);
    console.log(`Working Endpoints: ${report.summary.workingEndpoints}`);
    console.log(`Failing Endpoints: ${report.summary.failingEndpoints}`);
    console.log(`Missing Endpoints: ${report.summary.missingEndpoints}`);
    console.log(`Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`\nProduction Blockers: ${report.productionBlockers.length}`);
    report.productionBlockers.forEach(blocker => console.log(`  - ${blocker}`));
    
    // Test assertions
    expect(report).toBeDefined();
    expect(report.summary.totalEndpoints).toBeGreaterThan(0);
    
    // Fail test if there are critical issues that block production
    if (report.productionBlockers.length > 0) {
      console.error('\n❌ PRODUCTION BLOCKERS FOUND - This application is NOT ready for production');
      // Note: We don't fail the test here as this is an analysis, not a functional test
    } else {
      console.log('\n✅ No critical production blockers found');
    }
  });
});

function generateMarkdownReport(report: GapAnalysisReport): string {
  return `# Frontend-Backend Integration Gap Analysis Report

**Generated:** ${new Date(report.generatedAt).toLocaleString()}

## Executive Summary

| Metric | Value |
|--------|-------|
| **Production Readiness** | **${report.summary.productionReadiness}** |
| **Overall Score** | **${report.summary.overallScore}%** |
| Total Endpoints | ${report.summary.totalEndpoints} |
| Working Endpoints | ${report.summary.workingEndpoints} |
| Failing Endpoints | ${report.summary.failingEndpoints} |
| Missing Endpoints | ${report.summary.missingEndpoints} |
| Critical Issues | ${report.summary.criticalIssues} |

## Test Environment

- **Frontend URL:** ${report.testEnvironment.baseUrl}
- **API Base URL:** ${report.testEnvironment.apiBaseUrl}
- **Backend Available:** ${report.testEnvironment.backendAvailable ? '✅ Yes' : '❌ No'}

## Production Readiness Assessment

### ${report.summary.productionReadiness === 'READY' ? '✅' : report.summary.productionReadiness === 'NEARLY_READY' ? '⚠️' : '❌'} ${report.summary.productionReadiness.replace('_', ' ')}

${getReadinessDescription(report.summary.productionReadiness)}

## Critical Issues

${report.criticalIssues.length === 0 ? '✅ No critical issues found' : report.criticalIssues.map(issue => `- ❌ ${issue}`).join('\n')}

## Production Blockers

${report.productionBlockers.length === 0 ? '✅ No production blockers identified' : report.productionBlockers.map(blocker => `- 🚫 ${blocker}`).join('\n')}

## API Endpoint Analysis

### Critical Endpoints
${report.endpoints.filter(e => e.critical).map(endpoint => 
  `- ${endpoint.implemented && !endpoint.hasError ? '✅' : '❌'} \`${endpoint.method} ${endpoint.path}\` (${endpoint.usedByComponents.join(', ')})`
).join('\n')}

### All Endpoints Status
| Method | Path | Status | Error | Components |
|--------|------|--------|-------|------------|
${report.endpoints.map(e => 
  `| ${e.method} | ${e.path} | ${e.implemented && !e.hasError ? '✅ Working' : e.implemented ? '⚠️ Failing' : '❌ Missing'} | ${e.errorType || 'None'} | ${e.usedByComponents.join(', ')} |`
).join('\n')}

## Missing Features

${report.missingFeatures.length === 0 ? '✅ All critical features are connected' : report.missingFeatures.map(feature => `- ❌ ${feature}`).join('\n')}

## Implementation Priority

### High Priority (Must Fix for Production)
${report.implementationPriority.high.map(item => `- 🔴 ${item}`).join('\n')}

### Medium Priority (Should Fix Soon)
${report.implementationPriority.medium.map(item => `- 🟡 ${item}`).join('\n')}

### Low Priority (Nice to Have)
${report.implementationPriority.low.map(item => `- 🟢 ${item}`).join('\n')}

## Recommendations

${report.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

## Next Steps

### For MVP Launch:
1. **Fix all critical endpoints** - Ensure authentication and core contract management work
2. **Implement proper error handling** - Users should see meaningful error messages
3. **Set up backend monitoring** - Know when APIs are down
4. **Add loading states** - Improve user experience during API calls

### For Full Production:
1. **Implement remaining endpoints** - Complete all features
2. **Add comprehensive testing** - Unit, integration, and E2E tests
3. **Performance optimization** - Caching, lazy loading, pagination
4. **Security hardening** - Input validation, rate limiting, CORS

### For Long-term Success:
1. **API documentation** - Keep frontend and backend contracts in sync
2. **Monitoring and alerting** - Proactive issue detection
3. **Automated deployment** - CI/CD pipeline with integration tests
4. **Performance metrics** - Track API response times and error rates

---

*This report was generated automatically by the integration testing suite. For questions or issues, contact the development team.*
`;
}

function getReadinessDescription(readiness: string): string {
  switch (readiness) {
    case 'READY':
      return 'The application is ready for production deployment. All critical endpoints are working correctly.';
    case 'NEARLY_READY':
      return 'The application is nearly ready for production. Minor issues need to be resolved, but core functionality works.';
    case 'MAJOR_GAPS':
      return 'The application has major gaps that prevent production deployment. Significant work is needed on API integration.';
    case 'NOT_READY':
      return 'The application is not ready for production. Critical functionality is missing or broken.';
    default:
      return 'Unknown readiness status.';
  }
}