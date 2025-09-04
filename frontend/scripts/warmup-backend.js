#!/usr/bin/env node

/**
 * Backend Warmup Script
 * Wakes up the production backend from cold start
 */

import https from 'https';

const PRODUCTION_API_URL = 'https://pactoria-backend-new.ashyforest-7d7631da.eastus.azurecontainerapps.io/api/v1';

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

function makeWarmupRequest(url, timeout = 90000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Pactoria-Frontend-Warmup/1.0'
      },
      timeout
    };

    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          status: res.statusCode,
          responseTime,
          data
        });
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

async function warmupBackend() {
  log(`${colors.bold}🔥 Backend Warmup Tool${colors.reset}`);
  log(`${colors.bold}====================${colors.reset}\n`);
  
  log(`🎯 Target: ${PRODUCTION_API_URL}/health`);
  log(`⏳ ${colors.yellow}Sending warmup request (may take 30-90 seconds)...${colors.reset}`);
  
  const startTime = Date.now();
  
  try {
    const result = await makeWarmupRequest(PRODUCTION_API_URL + '/health');
    const totalTime = Date.now() - startTime;
    
    if (result.status === 200) {
      log(`✅ ${colors.green}Backend is now warmed up!${colors.reset}`);
      log(`⚡ Response time: ${result.responseTime}ms`);
      
      if (result.responseTime > 10000) {
        log(`❄️  ${colors.blue}Cold start detected and resolved${colors.reset}`);
      }
      
      log(`\n${colors.bold}🚀 Ready to start development:${colors.reset}`);
      log(`   ${colors.green}npm run dev:prod-backend${colors.reset}`);
      
    } else {
      log(`⚠️  ${colors.yellow}Unexpected response: HTTP ${result.status}${colors.reset}`);
      log(`   Response time: ${result.responseTime}ms`);
    }
    
  } catch (error) {
    log(`❌ ${colors.red}Warmup failed: ${error.error}${colors.reset}`);
    
    if (error.code === 'TIMEOUT') {
      log(`💡 ${colors.blue}The backend might be experiencing issues or very slow cold start${colors.reset}`);
      log(`   Try again in a few minutes or contact the backend team`);
    } else if (error.code === 'ENOTFOUND') {
      log(`🌐 ${colors.blue}DNS resolution failed - check your internet connection${colors.reset}`);
    } else {
      log(`🔧 Error code: ${error.code}`);
    }
  }
}

// Run the warmup
warmupBackend().catch(console.error);