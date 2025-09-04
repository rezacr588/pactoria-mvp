#!/usr/bin/env node

/**
 * Backend Health Check Script
 * Verifies connectivity to production backend and tests key endpoints
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

const PRODUCTION_API_URL = 'https://pactoria-backend-new.ashyforest-7d7631da.eastus.azurecontainerapps.io/api/v1';
const LOCAL_API_URL = 'http://localhost:8000/api/v1';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(url, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Pactoria-Frontend-HealthCheck/1.0'
      },
      timeout
    };

    const startTime = Date.now();
    
    const req = lib.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            data: jsonData,
            responseTime,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            responseTime,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        error: error.message,
        code: error.code,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        code: 'TIMEOUT',
        responseTime: timeout
      });
    });

    req.end();
  });
}

async function checkEndpoint(name, url, expectedStatus = 200, isProduction = false) {
  log(`\n${colors.blue}Testing ${name}...${colors.reset}`);
  log(`URL: ${url}`);
  
  if (isProduction) {
    log(`⏳ ${colors.yellow}Note: Production backend may take 30-60s for cold start${colors.reset}`);
  }
  
  try {
    const result = await makeRequest(url);
    
    if (result.status === expectedStatus) {
      log(`✅ ${colors.green}SUCCESS${colors.reset} - Status: ${result.status} - Response time: ${result.responseTime}ms`);
      if (isProduction && result.responseTime > 5000) {
        log(`📝 ${colors.blue}Cold start detected - backend is now warmed up${colors.reset}`);
      }
      return { success: true, responseTime: result.responseTime, data: result.data };
    } else {
      log(`⚠️  ${colors.yellow}UNEXPECTED STATUS${colors.reset} - Expected: ${expectedStatus}, Got: ${result.status} - Response time: ${result.responseTime}ms`);
      return { success: false, responseTime: result.responseTime, status: result.status };
    }
  } catch (error) {
    if (isProduction && (error.code === 'TIMEOUT' || error.code === 'ECONNRESET')) {
      log(`⚠️  ${colors.yellow}COLD START TIMEOUT${colors.reset} - Backend may be starting up`);
      log(`💡 ${colors.blue}Try: Visit ${url.replace('/health', '').replace('/api/v1', '/api/v1/health')} in browser to warm it up${colors.reset}`);
    } else {
      log(`❌ ${colors.red}FAILED${colors.reset} - ${error.error} (${error.code}) - Time: ${error.responseTime}ms`);
    }
    return { success: false, error: error.error, code: error.code };
  }
}

async function checkCORS(baseUrl) {
  log(`\n${colors.blue}Testing CORS configuration...${colors.reset}`);
  
  // Note: This is a simple check. In browser, CORS is more complex
  try {
    const result = await makeRequest(baseUrl + '/health');
    const corsHeaders = {
      'access-control-allow-origin': result.headers['access-control-allow-origin'],
      'access-control-allow-methods': result.headers['access-control-allow-methods'],
      'access-control-allow-headers': result.headers['access-control-allow-headers']
    };
    
    log(`CORS Headers present:`);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value) {
        log(`  ✅ ${key}: ${value}`);
      } else {
        log(`  ❓ ${key}: Not present`);
      }
    });
    
    return corsHeaders;
  } catch (error) {
    log(`❌ Could not check CORS headers: ${error.error}`);
    return null;
  }
}

async function main() {
  log(`${colors.bold}🔍 Pactoria Backend Health Check${colors.reset}`);
  log(`${colors.bold}===================================${colors.reset}`);
  
  const results = {
    production: {},
    local: {}
  };

  // Check Production Backend
  log(`\n${colors.bold}${colors.blue}📡 PRODUCTION BACKEND${colors.reset}`);
  log(`Base URL: ${PRODUCTION_API_URL}`);
  
  const prodEndpoints = [
    ['Health Check', PRODUCTION_API_URL + '/health', 200],
    ['Root API', PRODUCTION_API_URL, 200],
    ['Auth Endpoint (should be 422 without body)', PRODUCTION_API_URL + '/auth/login', 422]
  ];

  for (const [name, url, expectedStatus] of prodEndpoints) {
    results.production[name] = await checkEndpoint(name, url, expectedStatus, true);
  }

  await checkCORS(PRODUCTION_API_URL);

  // Check Local Backend (optional)
  log(`\n${colors.bold}${colors.yellow}🏠 LOCAL BACKEND (Optional)${colors.reset}`);
  log(`Base URL: ${LOCAL_API_URL}`);
  
  const localEndpoints = [
    ['Health Check', LOCAL_API_URL + '/health', 200],
    ['Root API', LOCAL_API_URL, 200]
  ];

  for (const [name, url, expectedStatus] of localEndpoints) {
    results.local[name] = await checkEndpoint(name, url, expectedStatus);
  }

  // Summary
  log(`\n${colors.bold}📊 SUMMARY${colors.reset}`);
  log(`${colors.bold}============${colors.reset}`);
  
  const prodSuccesses = Object.values(results.production).filter(r => r.success).length;
  const prodTotal = Object.keys(results.production).length;
  
  if (prodSuccesses === prodTotal) {
    log(`🎉 ${colors.green}Production backend is healthy! (${prodSuccesses}/${prodTotal} checks passed)${colors.reset}`);
    log(`\n${colors.bold}Ready to use: npm run dev:prod-backend${colors.reset}`);
  } else {
    const coldStartIssues = Object.values(results.production).filter(r => r.code === 'TIMEOUT').length;
    if (coldStartIssues > 0) {
      log(`❄️  ${colors.blue}Production backend appears to be in cold start mode (${prodSuccesses}/${prodTotal} checks passed)${colors.reset}`);
      log(`💡 ${colors.yellow}Try visiting https://pactoria-backend-new.ashyforest-7d7631da.eastus.azurecontainerapps.io/api/v1/health in your browser to warm it up${colors.reset}`);
      log(`⏳ Then run this check again in 30-60 seconds${colors.reset}`);
    } else {
      log(`⚠️  ${colors.yellow}Production backend issues detected (${prodSuccesses}/${prodTotal} checks passed)${colors.reset}`);
    }
  }

  const localSuccesses = Object.values(results.local).filter(r => r.success).length;
  const localTotal = Object.keys(results.local).length;
  
  if (localSuccesses > 0) {
    log(`🏠 ${colors.blue}Local backend: ${localSuccesses}/${localTotal} checks passed${colors.reset}`);
  } else {
    log(`🏠 ${colors.gray}Local backend: Not running (this is normal for prod-backend testing)${colors.reset}`);
  }

  // Environment setup instructions
  log(`\n${colors.bold}🚀 USAGE INSTRUCTIONS${colors.reset}`);
  log(`${colors.bold}====================${colors.reset}`);
  log(`\nTo run frontend with production backend:`);
  log(`  ${colors.green}npm run dev:prod-backend${colors.reset}`);
  log(`\nTo run frontend with local backend:`);
  log(`  ${colors.green}npm run dev${colors.reset}`);
  log(`\nTo switch back and forth, just stop the dev server (Ctrl+C) and run the other command.`);
  
  process.exit(prodSuccesses === prodTotal ? 0 : 1);
}

// Run the health check
main().catch(console.error);