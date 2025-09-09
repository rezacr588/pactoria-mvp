export const API_URL = process.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const APP_URL = process.env.APP_URL || 'http://localhost:5173';

export const TEST_TIMEOUT = {
  short: 5000,
  medium: 15000,
  long: 30000,
  veryLong: 60000
};

export const TEST_USER = {
  email: 'test@pactoria.com',
  password: 'Test123!@#',
  fullName: 'Test User',
  companyName: 'Test Company Ltd'
};

export const DEMO_USER = {
  email: 'demo@pactoria.com',
  password: 'Demo123!' // Updated to match actual demo password
};
