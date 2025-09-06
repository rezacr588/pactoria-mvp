/**
 * Environment Configuration
 * Centralized environment variable management with validation and type safety
 */

export interface EnvConfig {
  // API Configuration
  API_URL: string;
  WS_URL: string;
  
  // App Configuration
  APP_NAME: string;
  APP_VERSION: string;
  ENVIRONMENT: 'development' | 'production' | 'staging';
  
  // Feature Flags
  DEBUG_API_CALLS: boolean;
  ENABLE_ANALYTICS: boolean;
  ENABLE_AI_FEATURES: boolean;
  ENABLE_TEMPLATES: boolean;
  
  // Error Handling
  ERROR_RETRY_ATTEMPTS: number;
  ERROR_RETRY_DELAY: number;
  
  // Security
  TOKEN_STORAGE_KEY: string;
}

class EnvironmentConfig {
  private config: EnvConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): EnvConfig {
    const apiUrl = import.meta.env.VITE_API_URL;
    
    // Validate API URL is present in production
    if (import.meta.env.PROD && !apiUrl) {
      throw new Error(
        'VITE_API_URL must be configured in production environment. ' +
        'Please set this environment variable in your deployment configuration.'
      );
    }

    // Generate WebSocket URL from API URL
    const wsUrl = apiUrl 
      ? apiUrl.replace('/api/v1', '').replace('http', 'ws').replace('https', 'wss') + '/api/v1/ws'
      : 'ws://localhost:8000/api/v1/ws';

    return {
      // API Configuration
      API_URL: apiUrl || 'http://localhost:8000/api/v1',
      WS_URL: wsUrl,
      
      // App Configuration
      APP_NAME: import.meta.env.VITE_APP_NAME || 'Pactoria MVP',
      APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
      ENVIRONMENT: (import.meta.env.VITE_ENVIRONMENT || 
                   (import.meta.env.DEV ? 'development' : 'production')) as EnvConfig['ENVIRONMENT'],
      
      // Feature Flags
      DEBUG_API_CALLS: import.meta.env.VITE_DEBUG_API_CALLS === 'true',
      ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
      ENABLE_AI_FEATURES: import.meta.env.VITE_ENABLE_AI_FEATURES !== 'false',
      ENABLE_TEMPLATES: import.meta.env.VITE_ENABLE_TEMPLATES !== 'false',
      
      // Error Handling
      ERROR_RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_ERROR_RETRY_ATTEMPTS || '3'),
      ERROR_RETRY_DELAY: parseInt(import.meta.env.VITE_ERROR_RETRY_DELAY || '1000'),
      
      // Security
      TOKEN_STORAGE_KEY: import.meta.env.VITE_TOKEN_STORAGE_KEY || 'pactoria-auth-token',
    };
  }

  private validateConfig(): void {
    const errors: string[] = [];

    // Validate API URL format
    if (!this.isValidUrl(this.config.API_URL)) {
      errors.push(`Invalid API_URL format: ${this.config.API_URL}`);
    }

    // Validate environment
    if (!['development', 'production', 'staging'].includes(this.config.ENVIRONMENT)) {
      errors.push(`Invalid ENVIRONMENT: ${this.config.ENVIRONMENT}`);
    }

    // Validate retry configuration
    if (this.config.ERROR_RETRY_ATTEMPTS < 0 || this.config.ERROR_RETRY_ATTEMPTS > 10) {
      errors.push(`ERROR_RETRY_ATTEMPTS must be between 0 and 10`);
    }

    if (this.config.ERROR_RETRY_DELAY < 0) {
      errors.push(`ERROR_RETRY_DELAY must be positive`);
    }

    if (errors.length > 0) {
      throw new Error(`Environment configuration errors:\n${errors.join('\n')}`);
    }
  }

  private isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }

  public getConfig(): EnvConfig {
    return { ...this.config };
  }

  public get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  public isDevelopment(): boolean {
    return this.config.ENVIRONMENT === 'development';
  }

  public isProduction(): boolean {
    return this.config.ENVIRONMENT === 'production';
  }

  public isStaging(): boolean {
    return this.config.ENVIRONMENT === 'staging';
  }

  // Azure Static Web Apps detection
  public isAzureStaticWebApp(): boolean {
    return typeof window !== 'undefined' && 
           window.location.hostname.includes('azurestaticapps.net');
  }

  // Production backend detection
  public isUsingProductionBackend(): boolean {
    return this.config.API_URL.includes('azurecontainerapps.io') || 
           this.config.API_URL.includes('azure.com');
  }

  // Log configuration in development
  public logConfig(): void {
    if (this.isDevelopment()) {
      console.group('🔧 Environment Configuration');
      console.log('Environment:', this.config.ENVIRONMENT);
      console.log('API URL:', this.config.API_URL);
      console.log('WebSocket URL:', this.config.WS_URL);
      console.log('Debug API calls:', this.config.DEBUG_API_CALLS);
      console.log('Using production backend:', this.isUsingProductionBackend());
      console.log('Azure Static Web App:', this.isAzureStaticWebApp());
      console.groupEnd();
    }
  }
}

// Create singleton instance
const envConfig = new EnvironmentConfig();

// Log configuration in development
envConfig.logConfig();

// Export configuration
export const env = envConfig;
export default envConfig;