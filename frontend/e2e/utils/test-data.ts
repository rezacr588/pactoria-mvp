import { faker } from '@faker-js/faker';

export interface TestUserData {
  email: string;
  password: string;
  name?: string;
  full_name: string;
  company?: string;
  company_name?: string;
  timezone?: string;
  role?: string;
}

export interface TestContractData {
  title: string;
  description?: string;
  contract_type: string;
  plain_english_input: string;
  content?: string;
  client_name?: string;
  client_email?: string;
  supplier_name?: string;
  contract_value?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  type?: string;
}

export class TestUser {
  static admin(): TestUserData {
    return {
      email: 'admin@test.com',
      password: 'TestPassword123!',
      name: 'Admin User',
      full_name: 'Admin User',
      company: 'Test Company',
      company_name: 'Test Company',
      timezone: 'Europe/London',
      role: 'admin'
    };
  }

  static regular(): TestUserData {
    return {
      email: 'user@test.com',
      password: 'TestPassword123!',
      name: 'Regular User',
      full_name: 'Regular User',
      company: 'Test Company',
      company_name: 'Test Company',
      timezone: 'Europe/London',
      role: 'user'
    };
  }

  static random(): TestUserData {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    
    return {
      email,
      password: 'TestPassword123!',
      name: `${firstName} ${lastName}`,
      full_name: `${firstName} ${lastName}`,
      company: faker.company.name(),
      company_name: faker.company.name(),
      timezone: 'Europe/London',
      role: 'user'
    };
  }
}

export class TestContract {
  static serviceAgreement(): TestContractData {
    return {
      title: 'Service Agreement - Web Development',
      contract_type: 'service_agreement',
      plain_english_input: 'I need a contract for web development services. The contractor will develop a website for $5000 over 3 months starting January 1st, 2024.',
      client_name: 'Tech Startup Ltd',
      client_email: 'client@techstartup.com',
      supplier_name: 'Dev Agency Inc',
      contract_value: 5000,
      currency: 'GBP',
      start_date: '2024-01-01',
      end_date: '2024-03-31'
    };
  }

  static nda(): TestContractData {
    return {
      title: 'Non-Disclosure Agreement - Product Development',
      contract_type: 'nda',
      plain_english_input: 'I need an NDA for sharing confidential product information with a potential partner. This should cover proprietary technology and business plans.',
      client_name: 'Innovation Corp',
      client_email: 'legal@innovation.com',
      supplier_name: 'Partner Company'
    };
  }

  static employmentContract(): TestContractData {
    return {
      title: 'Employment Contract - Software Engineer',
      contract_type: 'employment_contract',
      plain_english_input: 'Employment contract for a software engineer position. Salary £60,000 per year, 25 days holiday, 6 months probation period, flexible working arrangements.',
      client_name: 'Tech Solutions Ltd',
      client_email: 'hr@techsolutions.com',
      contract_value: 60000,
      currency: 'GBP',
      start_date: '2024-02-01'
    };
  }

  static random(): TestContractData {
    const contractTypes = [
      'service_agreement',
      'employment_contract',
      'supplier_agreement',
      'nda',
      'consultancy'
    ];

    const type = faker.helpers.arrayElement(contractTypes);
    const title = `${faker.company.buzzVerb()} ${faker.company.buzzNoun()} - ${type.replace('_', ' ')}`;
    
    return {
      title,
      contract_type: type,
      plain_english_input: faker.lorem.paragraphs(2),
      client_name: faker.company.name(),
      client_email: faker.internet.email(),
      supplier_name: faker.company.name(),
      contract_value: faker.number.int({ min: 1000, max: 100000 }),
      currency: faker.helpers.arrayElement(['GBP', 'USD', 'EUR']),
      start_date: faker.date.future().toISOString().split('T')[0],
      end_date: faker.date.future().toISOString().split('T')[0]
    };
  }
}

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me'
  },
  contracts: {
    list: '/contracts',
    create: '/contracts',
    get: (id: string) => `/contracts/${id}`,
    update: (id: string) => `/contracts/${id}`,
    delete: (id: string) => `/contracts/${id}`,
    generate: (id: string) => `/contracts/${id}/generate`,
    analyze: (id: string) => `/contracts/${id}/analyze`
  },
  analytics: {
    dashboard: '/analytics/dashboard',
    business: '/analytics/business',
    timeSeries: (metric: string) => `/analytics/time-series/${metric}`
  },
  templates: {
    list: '/contracts/templates'
  },
  health: '/health'
};

// Mock API responses for testing without backend
export const MockResponses = {
  auth: {
    login: {
      token: {
        access_token: 'mock-jwt-token',
        token_type: 'bearer',
        expires_in: 3600
      },
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        timezone: 'Europe/London',
        company_id: 'test-company-id',
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString()
      },
      company: {
        id: 'test-company-id',
        name: 'Test Company',
        subscription_tier: 'premium',
        max_users: 10,
        created_at: new Date().toISOString()
      }
    }
  },
  contracts: {
    list: {
      contracts: [
        {
          id: 'contract-1',
          title: 'Test Service Agreement',
          contract_type: 'service_agreement',
          status: 'draft',
          client_name: 'Test Client',
          contract_value: 5000,
          currency: 'GBP',
          version: 1,
          is_current_version: true,
          company_id: 'test-company-id',
          created_by: 'test-user-id',
          created_at: new Date().toISOString()
        }
      ],
      total: 1,
      page: 1,
      size: 10,
      pages: 1
    }
  },
  analytics: {
    dashboard: {
      business_metrics: {
        total_contracts: 25,
        active_contracts: 18,
        draft_contracts: 5,
        completed_contracts: 2,
        terminated_contracts: 0,
        total_contract_value: 125000,
        average_contract_value: 5000,
        compliance_score_average: 85.5,
        high_risk_contracts: 2,
        contracts_this_month: 8,
        contracts_last_month: 6,
        growth_rate: 33.3
      },
      summary: {
        total_contracts: 25,
        total_portfolio_value: 125000,
        average_compliance_score: 85.5,
        monthly_growth_rate: 33.3,
        high_risk_contracts: 2,
        key_insights: ['Contract volume increased by 33%'],
        overall_health: 'good',
        recommended_actions: ['Review high-risk contracts']
      }
    }
  }
};

// Utility functions to generate test data
export function generateTestUser(): TestUserData {
  return TestUser.random();
}

export function generateTestContract(): TestContractData {
  return TestContract.random();
}