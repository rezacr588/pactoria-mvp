#!/usr/bin/env node

/**
 * Environment Switcher Utility
 * Quick way to copy environment configurations for different setups
 */

import fs from 'fs';
import path from 'path';

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

const envFiles = {
  'local': '.env.local',
  'prod-backend': '.env.prod-backend',
  'production': '.env.production'
};

const descriptions = {
  'local': 'Local frontend → Local backend (full local development)',
  'prod-backend': 'Local frontend → Production backend (frontend testing against live data)',
  'production': 'Production frontend → Production backend (full production)'
};

function showHelp() {
  log(`${colors.bold}🔄 Environment Switcher${colors.reset}`);
  log(`${colors.bold}=====================${colors.reset}\n`);
  
  log(`Available environments:\n`);
  
  Object.entries(descriptions).forEach(([env, desc]) => {
    const available = fs.existsSync(envFiles[env]) ? '✅' : '❌';
    log(`  ${available} ${colors.blue}${env.padEnd(12)}${colors.reset} - ${desc}`);
  });
  
  log(`\n${colors.bold}Usage:${colors.reset}`);
  log(`  node scripts/switch-env.js <environment>`);
  log(`  npm run switch-env <environment>\n`);
  
  log(`${colors.bold}Examples:${colors.reset}`);
  log(`  node scripts/switch-env.js prod-backend`);
  log(`  node scripts/switch-env.js local`);
  
  log(`\n${colors.bold}Current environment:${colors.reset}`);
  if (fs.existsSync('.env')) {
    const currentContent = fs.readFileSync('.env', 'utf8');
    const apiUrl = currentContent.match(/VITE_API_URL=(.+)/)?.[1];
    if (apiUrl) {
      if (apiUrl.includes('localhost')) {
        log(`  🏠 ${colors.blue}Local backend${colors.reset} (${apiUrl})`);
      } else if (apiUrl.includes('azurecontainerapps.io')) {
        log(`  ☁️  ${colors.green}Production backend${colors.reset} (${apiUrl})`);
      } else {
        log(`  ❓ Custom backend (${apiUrl})`);
      }
    } else {
      log(`  ❓ Unknown - no VITE_API_URL found`);
    }
  } else {
    log(`  ❌ No .env file found`);
  }
}

function switchEnvironment(targetEnv) {
  if (!envFiles[targetEnv]) {
    log(`❌ ${colors.red}Unknown environment: ${targetEnv}${colors.reset}\n`);
    showHelp();
    process.exit(1);
  }
  
  const sourceFile = envFiles[targetEnv];
  
  if (!fs.existsSync(sourceFile)) {
    log(`❌ ${colors.red}Environment file not found: ${sourceFile}${colors.reset}`);
    log(`Available files:`);
    Object.entries(envFiles).forEach(([env, file]) => {
      const exists = fs.existsSync(file) ? '✅' : '❌';
      log(`  ${exists} ${file}`);
    });
    process.exit(1);
  }
  
  try {
    // Backup existing .env if it exists
    if (fs.existsSync('.env')) {
      const backupName = `.env.backup.${Date.now()}`;
      fs.copyFileSync('.env', backupName);
      log(`📦 Backed up existing .env to ${backupName}`);
    }
    
    // Copy the target environment file to .env
    fs.copyFileSync(sourceFile, '.env');
    
    log(`✅ ${colors.green}Switched to ${targetEnv} environment${colors.reset}`);
    log(`📄 Copied ${sourceFile} → .env`);
    log(`📋 ${descriptions[targetEnv]}\n`);
    
    // Show the API URL that will be used
    const content = fs.readFileSync('.env', 'utf8');
    const apiUrl = content.match(/VITE_API_URL=(.+)/)?.[1];
    if (apiUrl) {
      log(`🌐 API URL: ${colors.blue}${apiUrl}${colors.reset}`);
    }
    
    log(`\n${colors.bold}Next steps:${colors.reset}`);
    if (targetEnv === 'prod-backend') {
      log(`1. Run: ${colors.green}npm run check-backend${colors.reset} (to verify connection)`);
      log(`2. Run: ${colors.green}npm run dev${colors.reset} (to start frontend)`);
      log(`3. Your local frontend will connect to production backend`);
    } else if (targetEnv === 'local') {
      log(`1. Make sure your local backend is running on port 8000`);
      log(`2. Run: ${colors.green}npm run dev${colors.reset} (to start frontend)`);
      log(`3. Your local frontend will connect to local backend`);
    } else {
      log(`1. Run: ${colors.green}npm run build${colors.reset} (for production build)`);
      log(`2. Deploy the built files to your hosting service`);
    }
    
  } catch (error) {
    log(`❌ ${colors.red}Failed to switch environment: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  const targetEnv = args[0];
  switchEnvironment(targetEnv);
}

main();