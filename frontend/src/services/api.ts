// API Service Layer
// Centralized API configuration and error handling

// Configuration from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const DEBUG_API_CALLS = import.meta.env.VITE_DEBUG_API_CALLS === 'true';
const ERROR_RETRY_ATTEMPTS = parseInt(import.meta.env.VITE_ERROR_RETRY_ATTEMPTS || '3');
const ERROR_RETRY_DELAY = parseInt(import.meta.env.VITE_ERROR_RETRY_DELAY || '1000');

// API Response type
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Request configuration
interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
}

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper function to build URL with query params
function buildUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
}

// Main API request function
async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, ...fetchConfig } = config;
  
  // Get auth token from localStorage
  const authStorage = localStorage.getItem('auth-storage');
  const token = authStorage ? JSON.parse(authStorage).state?.token : null;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const finalConfig: RequestInit = {
    ...fetchConfig,
    headers: {
      ...defaultHeaders,
      ...fetchConfig.headers,
    },
  };

  try {
    const url = buildUrl(endpoint, params);
    
    // Debug logging
    if (DEBUG_API_CALLS) {
      console.log(`🌐 API Request: ${finalConfig.method || 'GET'} ${url}`, {
        headers: finalConfig.headers,
        body: finalConfig.body
      });
    }
    
    const response = await fetch(url, finalConfig);

    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiError(
        response.status,
        errorData?.message || `HTTP error! status: ${response.status}`,
        errorData
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    
    // Debug logging
    if (DEBUG_API_CALLS) {
      console.log(`✅ API Response: ${finalConfig.method || 'GET'} ${url}`, data);
    }
    
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      0,
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

// API methods
export const api = {
  // GET request
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    apiRequest<T>(endpoint, { method: 'GET', params }),

  // POST request
  post: <T>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // PUT request
  put: <T>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // PATCH request
  patch: <T>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // DELETE request
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),

  // File upload
  upload: <T>(endpoint: string, formData: FormData) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData
        // Browser will set it automatically with boundary
      },
    }),
};

// Specific API service classes
export class AuthService {
  static async login(email: string, password: string) {
    return api.post<{
      token: {
        access_token: string;
        token_type: string;
        expires_in: number;
      };
      user: {
        id: string;
        email: string;
        full_name: string;
        is_active: boolean;
        timezone: string;
        company_id: string | null;
        created_at: string;
        last_login_at: string | null;
      };
      company: {
        id: string;
        name: string;
        subscription_tier: string;
        max_users: number;
        created_at: string;
      } | null;
    }>('/auth/login', { email, password });
  }

  static async register(data: {
    email: string;
    password: string;
    full_name: string;
    company_name?: string;
    timezone?: string;
  }) {
    return api.post<{
      token: {
        access_token: string;
        token_type: string;
        expires_in: number;
      };
      user: {
        id: string;
        email: string;
        full_name: string;
        is_active: boolean;
        timezone: string;
        company_id: string | null;
        created_at: string;
        last_login_at: string | null;
      };
      company: {
        id: string;
        name: string;
        subscription_tier: string;
        max_users: number;
        created_at: string;
      } | null;
    }>('/auth/register', data);
  }

  static async getCurrentUser() {
    return api.get<{
      id: string;
      email: string;
      full_name: string;
      is_active: boolean;
      timezone: string;
      company_id: string | null;
      created_at: string;
      last_login_at: string | null;
    }>('/auth/me');
  }

  static async updateProfile(data: {
    full_name?: string;
    timezone?: string;
    notification_preferences?: Record<string, any>;
  }) {
    return api.put<{
      id: string;
      email: string;
      full_name: string;
      is_active: boolean;
      timezone: string;
      company_id: string | null;
      created_at: string;
      last_login_at: string | null;
    }>('/auth/me', data);
  }
}

export class ContractService {
  static async getContracts(params?: {
    page?: number;
    size?: number;
    contract_type?: string;
    status?: string;
    search?: string;
  }) {
    return api.get<{
      contracts: Array<{
        id: string;
        title: string;
        contract_type: string;
        status: string;
        plain_english_input?: string;
        generated_content?: string;
        final_content?: string;
        client_name?: string;
        client_email?: string;
        supplier_name?: string;
        contract_value?: number;
        currency: string;
        start_date?: string;
        end_date?: string;
        version: number;
        is_current_version: boolean;
        company_id: string;
        template_id?: string;
        created_by: string;
        ai_generation_id?: string;
        created_at: string;
        updated_at?: string;
      }>;
      total: number;
      page: number;
      size: number;
      pages: number;
    }>('/contracts', params);
  }

  static async getContract(id: string) {
    return api.get<{
      id: string;
      title: string;
      contract_type: string;
      status: string;
      plain_english_input?: string;
      generated_content?: string;
      final_content?: string;
      client_name?: string;
      client_email?: string;
      supplier_name?: string;
      contract_value?: number;
      currency: string;
      start_date?: string;
      end_date?: string;
      version: number;
      is_current_version: boolean;
      company_id: string;
      template_id?: string;
      created_by: string;
      ai_generation_id?: string;
      created_at: string;
      updated_at?: string;
    }>(`/contracts/${id}`);
  }

  static async createContract(data: {
    title: string;
    contract_type: string;
    plain_english_input: string;
    client_name?: string;
    client_email?: string;
    supplier_name?: string;
    contract_value?: number;
    currency?: string;
    start_date?: string;
    end_date?: string;
    template_id?: string;
  }) {
    return api.post<{
      id: string;
      title: string;
      contract_type: string;
      status: string;
      plain_english_input?: string;
      generated_content?: string;
      final_content?: string;
      client_name?: string;
      client_email?: string;
      supplier_name?: string;
      contract_value?: number;
      currency: string;
      start_date?: string;
      end_date?: string;
      version: number;
      is_current_version: boolean;
      company_id: string;
      template_id?: string;
      created_by: string;
      ai_generation_id?: string;
      created_at: string;
      updated_at?: string;
    }>('/contracts', data);
  }

  static async updateContract(id: string, data: {
    title?: string;
    status?: string;
    client_name?: string;
    client_email?: string;
    supplier_name?: string;
    contract_value?: number;
    currency?: string;
    start_date?: string;
    end_date?: string;
    final_content?: string;
  }) {
    return api.put<{
      id: string;
      title: string;
      contract_type: string;
      status: string;
      plain_english_input?: string;
      generated_content?: string;
      final_content?: string;
      client_name?: string;
      client_email?: string;
      supplier_name?: string;
      contract_value?: number;
      currency: string;
      start_date?: string;
      end_date?: string;
      version: number;
      is_current_version: boolean;
      company_id: string;
      template_id?: string;
      created_by: string;
      ai_generation_id?: string;
      created_at: string;
      updated_at?: string;
    }>(`/contracts/${id}`, data);
  }

  static async deleteContract(id: string) {
    return api.delete<void>(`/contracts/${id}`);
  }

  static async generateContent(id: string, regenerate = false) {
    return api.post<{
      id: string;
      model_name: string;
      model_version?: string;
      input_prompt: string;
      generated_content: string;
      processing_time_ms?: number;
      token_usage?: Record<string, number>;
      confidence_score?: number;
      created_at: string;
    }>(`/contracts/${id}/generate`, { regenerate });
  }

  static async analyzeCompliance(id: string, force_reanalysis = false) {
    return api.post<{
      id: string;
      contract_id: string;
      overall_score: number;
      gdpr_compliance?: number;
      employment_law_compliance?: number;
      consumer_rights_compliance?: number;
      commercial_terms_compliance?: number;
      risk_score?: number;
      risk_factors: string[];
      recommendations: string[];
      analysis_date: string;
      analysis_version?: string;
    }>(`/contracts/${id}/analyze`, { force_reanalysis });
  }

  static async getTemplates(params?: {
    contract_type?: string;
    category?: string;
  }) {
    return api.get<Array<{
      id: string;
      name: string;
      category: string;
      contract_type: string;
      description: string;
      template_content: string;
      compliance_features: string[];
      legal_notes?: string;
      version: string;
      is_active: boolean;
      suitable_for: string[];
      created_at: string;
      updated_at?: string;
    }>>('/contracts/templates', params);
  }
}

export class AnalyticsService {
  static async getDashboard() {
    return api.get<{
      business_metrics: {
        total_contracts: number;
        active_contracts: number;
        draft_contracts: number;
        completed_contracts: number;
        terminated_contracts: number;
        total_contract_value: number;
        average_contract_value: number;
        compliance_score_average: number;
        high_risk_contracts: number;
        contracts_this_month: number;
        contracts_last_month: number;
        growth_rate: number;
      };
      user_metrics: {
        total_users: number;
        active_users_30d: number;
        new_users_this_month: number;
        user_engagement_score: number;
        contracts_per_user: number;
        most_active_users: Array<{
          user_id: string;
          name: string;
          email: string;
          contract_count: number;
        }>;
      };
      contract_types: Array<{
        contract_type: string;
        count: number;
        percentage: number;
        total_value: number;
        average_value: number;
        compliance_score?: number;
      }>;
      compliance_metrics: {
        overall_compliance_average: number;
        gdpr_compliance_average: number;
        employment_law_compliance_average: number;
        consumer_rights_compliance_average: number;
        commercial_terms_compliance_average: number;
        high_risk_contracts_count: number;
        medium_risk_contracts_count: number;
        low_risk_contracts_count: number;
        compliance_trend: string;
        recommendations_count: number;
      };
      recent_contracts_trend: {
        metric_name: string;
        period: string;
        data_points: Array<{
          date: string;
          value: number;
          count?: number;
        }>;
        total: number;
        average: number;
        trend_direction: string;
        trend_percentage: number;
      };
      contract_value_trend: {
        metric_name: string;
        period: string;
        data_points: Array<{
          date: string;
          value: number;
          count?: number;
        }>;
        total: number;
        average: number;
        trend_direction: string;
        trend_percentage: number;
      };
      summary: {
        total_contracts: number;
        total_portfolio_value: number;
        average_compliance_score: number;
        monthly_growth_rate: number;
        high_risk_contracts: number;
        key_insights: string[];
        overall_health: string;
        recommended_actions: string[];
      };
    }>('/analytics/dashboard');
  }

  static async getBusinessMetrics() {
    return api.get<{
      total_contracts: number;
      active_contracts: number;
      draft_contracts: number;
      completed_contracts: number;
      terminated_contracts: number;
      total_contract_value: number;
      average_contract_value: number;
      compliance_score_average: number;
      high_risk_contracts: number;
      contracts_this_month: number;
      contracts_last_month: number;
      growth_rate: number;
    }>('/analytics/business');
  }

  static async getTimeSeries(metric: string, period: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'MONTHLY', days = 30) {
    return api.get<{
      metric_name: string;
      period: string;
      data_points: Array<{
        date: string;
        value: number;
        count?: number;
      }>;
      total: number;
      average: number;
      trend_direction: string;
      trend_percentage: number;
    }>(`/analytics/time-series/${metric}`, { period, days: days.toString() });
  }
}

// Export types
export type { ApiResponse, ApiError };