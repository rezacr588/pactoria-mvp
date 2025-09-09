// Test script to verify all API connections
// Run with: npx tsx src/tests/testConnections.ts

import { 
  AuthService,
  ContractService,
  TemplateService,
  AnalyticsService,
  TeamService,
  NotificationsService,
  AuditService,
  IntegrationsService,
  SearchService,
  UserService,
  CompanyService
} from '../services/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

interface TestResult {
  service: string;
  endpoint: string;
  status: 'success' | 'error' | 'skipped';
  message?: string;
  responseTime?: number;
}

const results: TestResult[] = [];

function logTestStart(service: string, endpoint: string) {
  console.log(`${colors.cyan}Testing${colors.reset} ${colors.bright}${service}.${endpoint}${colors.reset}...`);
}

function logTestResult(result: TestResult) {
  const statusColor = result.status === 'success' ? colors.green : 
                      result.status === 'error' ? colors.red : 
                      colors.yellow;
  
  const statusIcon = result.status === 'success' ? '✓' : 
                     result.status === 'error' ? '✗' : 
                     '○';
  
  console.log(
    `  ${statusColor}${statusIcon}${colors.reset} ${result.service}.${result.endpoint} - ${statusColor}${result.status}${colors.reset}` +
    (result.responseTime ? ` (${result.responseTime}ms)` : '') +
    (result.message ? ` - ${result.message}` : '')
  );
  
  results.push(result);
}

async function testEndpoint(
  service: string,
  endpoint: string,
  testFn: () => Promise<any>,
  requireAuth = true
) {
  logTestStart(service, endpoint);
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    const responseTime = Date.now() - startTime;
    
    logTestResult({
      service,
      endpoint,
      status: 'success',
      responseTime
    });
    
    return result;
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Check if it's an auth error (expected for protected endpoints without token)
    if (requireAuth && (error.status === 401 || error.status === 403)) {
      logTestResult({
        service,
        endpoint,
        status: 'success',
        message: 'Protected endpoint (auth required)',
        responseTime
      });
    } else if (error.status === 404) {
      logTestResult({
        service,
        endpoint,
        status: 'error',
        message: 'Endpoint not found (404)',
        responseTime
      });
    } else {
      logTestResult({
        service,
        endpoint,
        status: 'error',
        message: error.message || 'Unknown error',
        responseTime
      });
    }
    
    return null;
  }
}

async function runTests() {
  console.log(`\n${colors.bright}${colors.blue}=== Pactoria API Connection Tests ===${colors.reset}\n`);
  
  // Test Auth Service (public endpoints)
  console.log(`${colors.bright}Auth Service:${colors.reset}`);
  await testEndpoint('AuthService', 'getCurrentUser', () => AuthService.getCurrentUser(), true);
  
  // Test Contract Service
  console.log(`\n${colors.bright}Contract Service:${colors.reset}`);
  await testEndpoint('ContractService', 'getContracts', () => ContractService.getContracts({ page: 1, size: 5 }), true);
  await testEndpoint('ContractService', 'getTemplates', () => ContractService.getTemplates(), true);
  
  // Test Template Service
  console.log(`\n${colors.bright}Template Service:${colors.reset}`);
  await testEndpoint('TemplateService', 'getTemplates', () => TemplateService.getTemplates({ page: 1, size: 5 }), true);
  await testEndpoint('TemplateService', 'getTemplateCategories', () => TemplateService.getTemplateCategories(), true);
  await testEndpoint('TemplateService', 'getTemplateContractTypes', () => TemplateService.getTemplateContractTypes(), true);
  
  // Test Analytics Service
  console.log(`\n${colors.bright}Analytics Service:${colors.reset}`);
  await testEndpoint('AnalyticsService', 'getDashboard', () => AnalyticsService.getDashboard(), true);
  await testEndpoint('AnalyticsService', 'getBusinessMetrics', () => AnalyticsService.getBusinessMetrics(), true);
  
  // Test Team Service
  console.log(`\n${colors.bright}Team Service:${colors.reset}`);
  await testEndpoint('TeamService', 'getTeamMembers', () => TeamService.getTeamMembers(), true);
  await testEndpoint('TeamService', 'getTeamStats', () => TeamService.getTeamStats(), true);
  await testEndpoint('TeamService', 'getAvailableRoles', () => TeamService.getAvailableRoles(), true);
  
  // Test Notifications Service
  console.log(`\n${colors.bright}Notifications Service:${colors.reset}`);
  await testEndpoint('NotificationsService', 'getNotifications', () => NotificationsService.getNotifications({ page: 1, size: 5 }), true);
  await testEndpoint('NotificationsService', 'getNotificationStats', () => NotificationsService.getNotificationStats(), true);
  
  // Test Audit Service
  console.log(`\n${colors.bright}Audit Service:${colors.reset}`);
  await testEndpoint('AuditService', 'getAuditEntries', () => AuditService.getAuditEntries({ page: 1, size: 5 }), true);
  await testEndpoint('AuditService', 'getAuditStats', () => AuditService.getAuditStats(), true);
  
  // Test Integrations Service
  console.log(`\n${colors.bright}Integrations Service:${colors.reset}`);
  await testEndpoint('IntegrationsService', 'getIntegrations', () => IntegrationsService.getIntegrations(), true);
  await testEndpoint('IntegrationsService', 'getIntegrationStats', () => IntegrationsService.getIntegrationStats(), true);
  await testEndpoint('IntegrationsService', 'getIntegrationCategories', () => IntegrationsService.getIntegrationCategories(), true);
  
  // Test Search Service
  console.log(`\n${colors.bright}Search Service:${colors.reset}`);
  await testEndpoint('SearchService', 'quickSearchContracts', () => SearchService.quickSearchContracts({ q: 'test', page: 1, size: 5 }), true);
  await testEndpoint('SearchService', 'getContractSearchFacets', () => SearchService.getContractSearchFacets(), true);
  
  // Test User Service
  console.log(`\n${colors.bright}User Service:${colors.reset}`);
  await testEndpoint('UserService', 'getProfile', () => UserService.getProfile(), true);
  
  // Test Company Service
  console.log(`\n${colors.bright}Company Service:${colors.reset}`);
  await testEndpoint('CompanyService', 'getCompany', () => CompanyService.getCompany(), true);
  await testEndpoint('CompanyService', 'getUsageStats', () => CompanyService.getUsageStats(), true);
  await testEndpoint('CompanyService', 'getSubscription', () => CompanyService.getSubscription(), true);
  
  // Summary
  console.log(`\n${colors.bright}${colors.blue}=== Test Summary ===${colors.reset}\n`);
  
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  
  console.log(`${colors.green}✓ Success: ${successCount}${colors.reset}`);
  if (errorCount > 0) {
    console.log(`${colors.red}✗ Errors: ${errorCount}${colors.reset}`);
  }
  if (skippedCount > 0) {
    console.log(`${colors.yellow}○ Skipped: ${skippedCount}${colors.reset}`);
  }
  
  // List errors
  if (errorCount > 0) {
    console.log(`\n${colors.red}${colors.bright}Failed Endpoints:${colors.reset}`);
    results
      .filter(r => r.status === 'error')
      .forEach(r => {
        console.log(`  ${colors.red}✗${colors.reset} ${r.service}.${r.endpoint}: ${r.message}`);
      });
  }
  
  // Average response time
  const timings = results.filter(r => r.responseTime).map(r => r.responseTime!);
  if (timings.length > 0) {
    const avgTime = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
    console.log(`\n${colors.cyan}Average Response Time: ${avgTime}ms${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}Note:${colors.reset} Most endpoints require authentication. 401/403 errors are expected without a valid token.`);
  console.log(`To test with authentication, first login through the UI and then run these tests.\n`);
}

// Check if running in Node.js environment
if (typeof window === 'undefined') {
  runTests().catch(error => {
    console.error(`\n${colors.red}${colors.bright}Test execution failed:${colors.reset}`, error);
    process.exit(1);
  });
} else {
  console.log('This script should be run in Node.js environment, not in the browser.');
}

export { runTests };
