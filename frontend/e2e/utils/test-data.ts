/**
 * Test Data Fixtures for E2E Tests
 * Minimal set of test data used across e2e test suites
 */

export interface User {
  email: string;
  password: string;
  full_name: string;
  company_name?: string;
}

export interface Contract {
  title: string;
  contract_type: string;
  client_name: string;
  client_email: string;
  service_description: string;
  contract_value: string;
  currency: string;
  start_date: string;
  end_date: string;
  status?: string;
}

/**
 * Test User fixtures
 */
export class TestUser {
  static admin(): User {
    return {
      email: 'admin@pactoria.com',
      password: 'AdminPassword123!',
      full_name: 'Admin User',
      company_name: 'Pactoria Admin'
    };
  }

  static standard(): User {
    return {
      email: 'test@pactoria.com',
      password: 'TestPassword123!',
      full_name: 'Test User',
      company_name: 'Test Company Ltd'
    };
  }

  static random(): User {
    const randomId = Math.floor(Math.random() * 10000);
    return {
      email: `user${randomId}@test.com`,
      password: 'Password123!',
      full_name: `Test User ${randomId}`,
      company_name: `Company ${randomId} Ltd`
    };
  }

  static invalid(): User {
    return {
      email: 'invalid@test.com',
      password: 'wrong',
      full_name: 'Invalid User'
    };
  }
}

/**
 * Test Contract fixtures
 */
export class TestContract {
  static serviceAgreement(): Contract {
    return {
      title: 'Service Agreement - Test',
      contract_type: 'service_agreement',
      client_name: 'Test Client Ltd',
      client_email: 'client@test.com',
      service_description: 'Professional services including consultation, development, and support for web application development project. This includes requirements gathering, design, implementation, testing, and deployment phases.',
      contract_value: '10000',
      currency: 'GBP',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      status: 'draft'
    };
  }

  static nda(): Contract {
    return {
      title: 'Non-Disclosure Agreement - Test',
      contract_type: 'nda',
      client_name: 'Confidential Client Corp',
      client_email: 'legal@confidential.com',
      service_description: 'Mutual non-disclosure agreement for protection of confidential information shared between parties during business negotiations.',
      contract_value: '0',
      currency: 'GBP',
      start_date: '2025-01-01',
      end_date: '2026-01-01',
      status: 'draft'
    };
  }

  static employment(): Contract {
    return {
      title: 'Employment Contract - Test',
      contract_type: 'employment',
      client_name: 'John Doe',
      client_email: 'john.doe@example.com',
      service_description: 'Full-time employment contract for Software Developer position with standard terms and conditions.',
      contract_value: '50000',
      currency: 'GBP',
      start_date: '2025-02-01',
      end_date: '2026-02-01',
      status: 'active'
    };
  }

  static random(): Contract {
    const randomId = Math.floor(Math.random() * 10000);
    return {
      title: `Test Contract ${randomId}`,
      contract_type: 'service_agreement',
      client_name: `Client ${randomId}`,
      client_email: `client${randomId}@test.com`,
      service_description: `Test service description for contract ${randomId}`,
      contract_value: `${randomId}`,
      currency: 'GBP',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      status: 'draft'
    };
  }
}

/**
 * Form data for testing form validation
 */
export const FormData = {
  valid: {
    email: 'valid@example.com',
    password: 'StrongPassword123!',
    full_name: 'Jane Doe',
    company_name: 'Valid Company Ltd',
    phone: '+44 20 1234 5678',
    message: 'This is a valid test message for form submission.'
  },
  invalid: {
    email: 'invalid-email',
    password: '123',
    full_name: '',
    company_name: 'A',
    phone: '123',
    message: ''
  },
  xss: {
    email: '<script>alert("xss")</script>@test.com',
    password: '<img src=x onerror=alert("xss")>',
    full_name: '<iframe src="javascript:alert(\'xss\')"></iframe>',
    company_name: '"><script>alert("xss")</script>',
    message: '<body onload=alert("xss")>'
  }
};

/**
 * Sample contract content for testing
 */
export const SampleContractContent = {
  simple: 'This is a simple test contract for e2e testing purposes.',
  detailed: `
    CONTRACT AGREEMENT
    
    This agreement is entered into between Party A and Party B.
    
    1. SERVICES
    Party A agrees to provide the following services...
    
    2. PAYMENT TERMS
    Party B agrees to pay...
    
    3. CONFIDENTIALITY
    Both parties agree to maintain confidentiality...
    
    4. TERMINATION
    This agreement may be terminated...
  `,
  withAIGenerated: 'Generate a professional service agreement for web development services including project planning, development, testing, and deployment phases with standard UK legal terms.'
};
