// API Service Layer
// Centralized API configuration and error handling

import type { 
  Notification,
  PaginatedNotificationResponse 
} from '../types';
import { env } from '../config/env';

// Use centralized environment configuration
const API_BASE_URL = env.get('API_URL');
const DEBUG_API_CALLS = env.get('DEBUG_API_CALLS');

// Connection status tracking
let connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// API Response type
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Request configuration
interface RequestConfig extends RequestInit {
  params?: Record<string, any>;
}

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper function to convert parameters to strings
function stringifyParams(params: Record<string, any>): Record<string, string> {
  const stringParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      stringParams[key] = String(value);
    }
  });
  return stringParams;
}

// Helper function to build URL with query params
function buildUrl(endpoint: string, params?: Record<string, any>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    const stringParams = stringifyParams(params);
    Object.entries(stringParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
}

// Health check function
async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      connectionStatus = 'connected';
      lastHealthCheck = Date.now();
      return true;
    } else {
      connectionStatus = 'error';
      return false;
    }
  } catch (error) {
    connectionStatus = 'error';
    return false;
  }
}

// Get connection status
export function getConnectionStatus(): typeof connectionStatus {
  return connectionStatus;
}

// Force health check
export async function forceHealthCheck(): Promise<boolean> {
  return await checkApiHealth();
}

// Automatic health check if needed
async function ensureConnection(): Promise<void> {
  const now = Date.now();
  if (now - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
    await checkApiHealth();
  }
}

// Main API request function with retry logic
async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, ...fetchConfig } = config;
  const maxRetries = env.get('ERROR_RETRY_ATTEMPTS');
  const retryDelay = env.get('ERROR_RETRY_DELAY');
  
  // Ensure connection before making request
  await ensureConnection();
  
  // Get auth token - check both new and old storage locations
  let token: string | null = null;
  const tokenKey = env.get('TOKEN_STORAGE_KEY');
  
  // Try new token storage first
  token = localStorage.getItem(tokenKey);
  
  // Fallback to Zustand storage for backward compatibility
  if (!token) {
    const authStorage = localStorage.getItem('auth-storage');
    token = authStorage ? JSON.parse(authStorage).state?.token : null;
  }

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

  let lastError: Error | null = null;

  // Retry logic
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const url = buildUrl(endpoint, params);
      
      // Debug logging
      if (DEBUG_API_CALLS) {
        console.log(`🌐 API Request (Attempt ${attempt + 1}/${maxRetries + 1}): ${finalConfig.method || 'GET'} ${url}`, {
          headers: finalConfig.headers,
          body: finalConfig.body
        });
      }
      
      const response = await fetch(url, finalConfig);

      // Handle non-2xx responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const apiError = new ApiError(
          response.status,
          errorData?.detail || errorData?.message || `HTTP error! status: ${response.status}`,
          errorData
        );
        
        // Don't retry on authentication errors or client errors (4xx except 408, 429)
        if (response.status === 401 || response.status === 403 || 
           (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429)) {
          throw apiError;
        }
        
        lastError = apiError;
        
        // If this is our last attempt, throw the error
        if (attempt === maxRetries) {
          throw apiError;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        continue;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        connectionStatus = 'connected';
        return {} as T;
      }

      const data = await response.json();
      
      // Debug logging
      if (DEBUG_API_CALLS) {
        console.log(`✅ API Response: ${finalConfig.method || 'GET'} ${url}`, data);
      }
      
      connectionStatus = 'connected';
      return data as T;
      
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof ApiError) {
        // Don't retry ApiErrors (already handled above)
        throw error;
      }
      
      // Network or other errors - retry
      if (attempt === maxRetries) {
        connectionStatus = 'error';
        throw new ApiError(
          0,
          error instanceof Error ? error.message : 'An unexpected error occurred'
        );
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new ApiError(0, 'Request failed after all retries');
}

// API methods
export const api = {
  // GET request
  get: <T>(endpoint: string, params?: Record<string, any>) =>
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

// Advanced Search Service
export class SearchService {
  static async searchContracts(request: {
    query?: string;
    operator?: 'AND' | 'OR' | 'NOT';
    fields?: string[];
    filters?: any;
    sort?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
    page?: number;
    size?: number;
    select_fields?: string[];
    include_total?: boolean;
    highlight?: boolean;
  }) {
    return api.post<{
      items: Array<{
        id: string;
        title: string;
        contract_type: string;
        status: string;
        client_name?: string;
        supplier_name?: string;
        contract_value?: number;
        currency?: string;
        start_date?: string;
        end_date?: string;
        created_at: string;
        updated_at?: string;
        version: number;
        compliance_score?: number;
        risk_score?: number;
        highlights?: Array<{
          field: string;
          fragments: string[];
        }>;
      }>;
      total?: number;
      page: number;
      size: number;
      pages?: number;
      took_ms: number;
      query: string;
      filters_applied: Record<string, any>;
    }>('/search/contracts', request);
  }

  static async searchUsers(request: {
    query?: string;
    operator?: 'AND' | 'OR' | 'NOT';
    fields?: string[];
    filters?: any;
    sort?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
    page?: number;
    size?: number;
    select_fields?: string[];
    include_total?: boolean;
  }) {
    return api.post<{
      items: Array<{
        id: string;
        email: string;
        full_name: string;
        role: string;
        department?: string;
        is_active: boolean;
        created_at: string;
        last_login_at?: string;
        highlights?: Array<{
          field: string;
          fragments: string[];
        }>;
      }>;
      total?: number;
      page: number;
      size: number;
      pages?: number;
      took_ms: number;
      query: string;
      filters_applied: Record<string, any>;
    }>('/search/users', request);
  }

  static async searchTemplates(request: {
    query?: string;
    operator?: 'AND' | 'OR' | 'NOT';
    fields?: string[];
    filters?: any;
    sort?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
    page?: number;
    size?: number;
    select_fields?: string[];
    include_total?: boolean;
  }) {
    return api.post<{
      items: Array<{
        id: string;
        name: string;
        category: string;
        contract_type: string;
        description: string;
        version: string;
        is_active: boolean;
        suitable_for: string[];
        created_at: string;
        updated_at?: string;
        highlights?: Array<{
          field: string;
          fragments: string[];
        }>;
      }>;
      total?: number;
      page: number;
      size: number;
      pages?: number;
      took_ms: number;
      query: string;
      filters_applied: Record<string, any>;
    }>('/search/templates', request);
  }

  static async quickSearchContracts(params: {
    q?: string;
    status?: string;
    type?: string;
    client?: string;
    page?: number;
    size?: number;
  }) {
    return api.get<{
      items: Array<{
        id: string;
        title: string;
        contract_type: string;
        status: string;
        client_name?: string;
        supplier_name?: string;
        contract_value?: number;
        currency?: string;
        start_date?: string;
        end_date?: string;
        created_at: string;
        updated_at?: string;
        version: number;
        compliance_score?: number;
        risk_score?: number;
      }>;
      total?: number;
      page: number;
      size: number;
      pages?: number;
      took_ms: number;
      query: string;
      filters_applied: Record<string, any>;
    }>('/search/contracts/quick', params);
  }

  static async getContractSearchSuggestions(params: {
    q: string;
    limit?: number;
    type?: string;
  }) {
    return api.get<{
      suggestions: string[];
      query: string;
      total: number;
    }>('/search/suggestions/contracts', params);
  }

  static async getContractSearchFacets() {
    return api.get<{
      facets: {
        status: Array<{ value: string; count: number }>;
        contract_type: Array<{ value: string; count: number }>;
        value_ranges: Array<{ min?: number; max?: number; count: number }>;
      };
      generated_at: string;
    }>('/search/facets/contracts');
  }
}

// Bulk Operations Service
export class BulkService {
  static async bulkUpdateContracts(request: {
    contract_ids: string[];
    updates: {
      status?: string;
      client_name?: string;
      supplier_name?: string;
      contract_value?: number;
      currency?: string;
      start_date?: string;
      end_date?: string;
      final_content?: string;
    };
  }) {
    return api.post<{
      operation_type: string;
      total_requested: number;
      success_count: number;
      failed_count: number;
      processing_time_ms: number;
      updated_ids?: string[];
      errors?: Array<{
        resource_id: string;
        error_code: string;
        error_message: string;
        details?: Record<string, any>;
      }>;
      warnings?: string[];
    }>('/bulk/contracts/update', request);
  }

  static async bulkDeleteContracts(request: {
    contract_ids: string[];
    deletion_reason?: string;
    hard_delete?: boolean;
  }) {
    return api.post<{
      operation_type: string;
      total_requested: number;
      success_count: number;
      failed_count: number;
      processing_time_ms: number;
      deleted_ids?: string[];
      errors?: Array<{
        resource_id: string;
        error_code: string;
        error_message: string;
        details?: Record<string, any>;
      }>;
      warnings?: string[];
    }>('/bulk/contracts/delete', request);
  }

  static async bulkExportContracts(request: {
    contract_ids: string[];
    format: 'CSV' | 'EXCEL' | 'PDF' | 'JSON';
    fields?: string[];
    include_content?: boolean;
    include_versions?: boolean;
  }) {
    return api.post<{
      export_id: string;
      format: 'CSV' | 'EXCEL' | 'PDF' | 'JSON';
      total_records: number;
      file_size_bytes?: number;
      download_url?: string;
      expires_at?: string;
      processing_time_ms: number;
    }>('/bulk/contracts/export', request);
  }

  static async bulkInviteUsers(request: {
    invitations: Array<{
      email: string;
      full_name: string;
      role: string;
      department?: string;
      send_email?: boolean;
    }>;
  }) {
    return api.post<{
      operation_type: string;
      total_requested: number;
      success_count: number;
      failed_count: number;
      processing_time_ms: number;
      invited_emails?: string[];
      errors?: Array<{
        resource_id: string;
        error_code: string;
        error_message: string;
        details?: Record<string, any>;
      }>;
      warnings?: string[];
    }>('/bulk/users/invite', request);
  }

  static async bulkChangeUserRoles(request: {
    user_ids: string[];
    new_role: string;
  }) {
    return api.post<{
      operation_type: string;
      total_requested: number;
      success_count: number;
      failed_count: number;
      processing_time_ms: number;
      updated_ids?: string[];
      errors?: Array<{
        resource_id: string;
        error_code: string;
        error_message: string;
        details?: Record<string, any>;
      }>;
      warnings?: string[];
    }>('/bulk/users/role-change', request);
  }

  static async getBulkOperationStatus(operationId: string) {
    return api.get<{
      operation_id: string;
      status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
      progress_percentage: number;
      message?: string;
      started_at: string;
      completed_at?: string;
      result?: any;
    }>(`/bulk/status/${operationId}`);
  }
}

// Enhanced Template Service
export class TemplateService {
  static async getTemplates(params?: {
    page?: number;
    size?: number;
    contract_type?: string;
    category?: string;
    search?: string;
  }) {
    return api.get<{
      templates: Array<{
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
      }>;
      total: number;
      page: number;
      size: number;
      pages: number;
    }>('/templates', params);
  }

  static async getTemplate(id: string) {
    return api.get<{
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
    }>(`/templates/${id}`);
  }

  static async createTemplate(data: {
    name: string;
    category: string;
    contract_type: string;
    description: string;
    template_content: string;
    compliance_features?: string[];
    legal_notes?: string;
    version?: string;
    suitable_for?: string[];
  }) {
    return api.post<{
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
    }>('/templates', data);
  }

  static async updateTemplate(id: string, data: {
    name?: string;
    category?: string;
    description?: string;
    template_content?: string;
    compliance_features?: string[];
    legal_notes?: string;
    version?: string;
    is_active?: boolean;
    suitable_for?: string[];
  }) {
    return api.put<{
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
    }>(`/templates/${id}`, data);
  }

  static async deleteTemplate(id: string) {
    return api.delete<void>(`/templates/${id}`);
  }

  static async getTemplateCategories() {
    return api.get<string[]>('/templates/categories');
  }

  static async getTemplateContractTypes() {
    return api.get<string[]>('/templates/contract-types');
  }
}

// WebSocket Service
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, (message: any) => void> = new Map();
  private connectionHandlers: Array<(connected: boolean) => void> = [];
  private connectionId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  connect(token: string) {
    try {
      const wsUrl = `${env.get('WS_URL')}/connect?token=${encodeURIComponent(token)}`;
      
      if (DEBUG_API_CALLS) {
        console.log('🔌 Connecting to WebSocket:', wsUrl);
      }
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.connectionHandlers.forEach(handler => handler(true));
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            handler(message);
          }
          // Also call generic message handler
          const genericHandler = this.messageHandlers.get('*');
          if (genericHandler) {
            genericHandler(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.connectionHandlers.forEach(handler => handler(false));
        
        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(token);
          }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  onMessage(type: string, handler: (message: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  onConnection(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
  }

  ping() {
    this.send({ type: 'ping' });
  }

  subscribe(topics: string[]) {
    this.send({ type: 'subscribe', topics });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  static async getStats() {
    return api.get<{
      websocket_stats: {
        active_connections: number;
        uptime_seconds: number;
      };
      generated_at: string;
    }>('/ws/stats');
  }

  static async getHealth() {
    return api.get<{
      status: string;
      service: string;
      active_connections: number;
      uptime_seconds: number;
      background_tasks: string;
    }>('/ws/health');
  }
}

// Audit Service
export class AuditService {
  static async getAuditEntries(params?: {
    page?: number;
    size?: number;
    user_id?: string;
    action?: string;
    resource_type?: string;
    risk_level?: string;
    compliance_flag?: boolean;
    search?: string;
    date_from?: string;
    date_to?: string;
  }) {
    return api.get<{
      entries: Array<{
        id: string;
        timestamp: string;
        user_id: string;
        user_name: string;
        user_role: string;
        action: string;
        resource_type: string;
        resource_id: string;
        resource_name: string;
        details: string;
        ip_address: string;
        user_agent: string;
        location?: string;
        risk_level: string;
        compliance_flag: boolean;
        metadata?: Record<string, any>;
      }>;
      total: number;
      page: number;
      size: number;
      pages: number;
    }>('/audit/entries', params);
  }

  static async getAuditEntry(entryId: string) {
    return api.get<{
      id: string;
      timestamp: string;
      user_id: string;
      user_name: string;
      user_role: string;
      action: string;
      resource_type: string;
      resource_id: string;
      resource_name: string;
      details: string;
      ip_address: string;
      user_agent: string;
      location?: string;
      risk_level: string;
      compliance_flag: boolean;
      metadata?: Record<string, any>;
    }>(`/audit/entries/${entryId}`);
  }

  static async getAuditStats() {
    return api.get<{
      total_events: number;
      high_risk_events: number;
      compliance_flags: number;
      events_today: number;
      events_this_week: number;
      events_this_month: number;
      most_active_users: Array<{
        user_name: string;
        action_count: number;
      }>;
      most_common_actions: Array<{
        action: string;
        count: number;
      }>;
      risk_distribution: Record<string, number>;
    }>('/audit/stats');
  }

  static async exportAuditEntries(exportRequest: {
    filters?: any;
    format?: string;
    include_metadata?: boolean;
  }) {
    return api.post<{
      export_id: string;
      format: string;
      total_records: number;
      file_size_bytes?: number;
      download_url?: string;
      expires_at?: string;
      processing_time_ms: number;
    }>('/audit/entries/export', exportRequest);
  }
}

// Notifications Service
export class NotificationsService {
  static async getNotifications(params?: {
    page?: number;
    size?: number;
    type?: string;
    priority?: string;
    read?: boolean;
    action_required?: boolean;
    search?: string;
  }) {
    return api.get<PaginatedNotificationResponse>('/notifications', params);
  }

  static async getNotification(notificationId: string) {
    return api.get<Notification>(`/notifications/${notificationId}`);
  }

  static async markAsRead(notificationId: string) {
    return api.put<{
      message: string;
      notification_id: string;
      read: boolean;
      updated_at: string;
    }>(`/notifications/${notificationId}/read`);
  }

  static async markAllAsRead() {
    return api.put<{
      message: string;
      updated_count: number;
      updated_at: string;
    }>('/notifications/read-all');
  }

  static async deleteNotification(notificationId: string) {
    return api.delete<{
      message: string;
      notification_id: string;
      deleted_at: string;
    }>(`/notifications/${notificationId}`);
  }

  static async getNotificationStats() {
    return api.get<{
      total_notifications: number;
      unread_count: number;
      high_priority_count: number;
      action_required_count: number;
      notifications_by_type: Record<string, number>;
      recent_activity: Array<{
        type: string;
        count: number;
        last_occurred: string;
      }>;
    }>('/notifications/stats/summary');
  }

  static async createNotification(data: {
    type: string;
    title: string;
    message: string;
    priority?: string;
    action_required?: boolean;
    target_user_id?: string;
    target_role?: string;
    related_contract_id?: string;
    expires_at?: string;
    metadata?: Record<string, any>;
  }) {
    return api.post<{
      id: string;
      type: string;
      title: string;
      message: string;
      priority: string;
      action_required: boolean;
      read: boolean;
      timestamp: string;
      user_id: string;
      related_contract?: {
        id: string;
        name: string;
      };
      metadata?: Record<string, any>;
    }>('/notifications', data);
  }
}

// Team Management Service
export class TeamService {
  static async getTeamMembers(params?: {
    include_inactive?: boolean;
    role?: string;
    department?: string;
  }) {
    return api.get<Array<{
      id: string;
      full_name: string;
      email: string;
      role: string;
      department?: string;
      is_active: boolean;
      joined_at: string;
      last_active: string;
      avatar_url?: string;
      invitation_status?: string;
      invited_by?: string;
      invited_at?: string;
    }>>('/team/members', params);
  }

  static async getTeamMember(memberId: string) {
    return api.get<{
      id: string;
      full_name: string;
      email: string;
      role: string;
      department?: string;
      is_active: boolean;
      joined_at: string;
      last_active: string;
      avatar_url?: string;
      invitation_status?: string;
      invited_by?: string;
      invited_at?: string;
    }>(`/team/members/${memberId}`);
  }

  static async inviteTeamMember(data: {
    full_name: string;
    email: string;
    role: string;
    department?: string;
    send_email?: boolean;
  }) {
    return api.post<{
      id: string;
      full_name: string;
      email: string;
      role: string;
      department?: string;
      is_active: boolean;
      joined_at: string;
      last_active: string;
      avatar_url?: string;
      invitation_status?: string;
      invited_by?: string;
      invited_at?: string;
    }>('/team/invite', data);
  }

  static async updateMemberRole(memberId: string, role: string) {
    return api.put<{
      message: string;
      member_id: string;
      new_role: string;
      updated_by: string;
      updated_at: string;
    }>(`/team/members/${memberId}/role`, { role });
  }

  static async removeTeamMember(memberId: string) {
    return api.delete<{
      message: string;
      member_id: string;
      removed_by: string;
      removed_at: string;
    }>(`/team/members/${memberId}`);
  }

  static async resendInvitation(memberId: string, sendEmail = true) {
    return api.post<{
      message: string;
      member_id: string;
      email_sent: boolean;
      resent_by: string;
      resent_at: string;
    }>(`/team/members/${memberId}/resend-invite`, { send_email: sendEmail });
  }

  static async getTeamStats() {
    return api.get<{
      total_members: number;
      active_members: number;
      pending_invitations: number;
      members_by_role: Record<string, number>;
      members_by_department: Record<string, number>;
      recent_activity: Array<{
        type: string;
        member_name: string;
        date: string;
      }>;
    }>('/team/stats');
  }

  static async getAvailableRoles() {
    return api.get<{
      roles: Array<{
        value: string;
        name: string;
        description: string;
        permissions: string;
      }>;
    }>('/team/roles');
  }
}

// Integrations Service
export class IntegrationsService {
  static async getIntegrations(params?: {
    category?: string;
    status?: string;
    price_tier?: string;
    popular_only?: boolean;
    search?: string;
  }) {
    return api.get<Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      provider: string;
      logo_url?: string;
      features: string[];
      status: string;
      is_popular: boolean;
      is_premium: boolean;
      setup_time_minutes: number;
      last_sync?: string;
      sync_status?: string;
      connections_count: number;
      rating: number;
      price_tier: string;
      documentation_url?: string;
      webhook_url?: string;
      api_key_required: boolean;
    }>>('/integrations', params);
  }

  static async getIntegration(integrationId: string) {
    return api.get<{
      id: string;
      name: string;
      description: string;
      category: string;
      provider: string;
      logo_url?: string;
      features: string[];
      status: string;
      is_popular: boolean;
      is_premium: boolean;
      setup_time_minutes: number;
      last_sync?: string;
      sync_status?: string;
      connections_count: number;
      rating: number;
      price_tier: string;
      documentation_url?: string;
      webhook_url?: string;
      api_key_required: boolean;
    }>(`/integrations/${integrationId}`);
  }

  static async connectIntegration(integrationId: string, data: {
    configuration?: Record<string, any>;
    api_key?: string;
    webhook_url?: string;
  }) {
    return api.post<{
      message: string;
      connection_id: string;
      integration_id: string;
      status: string;
      connected_at: string;
    }>(`/integrations/${integrationId}/connect`, data);
  }

  static async disconnectIntegration(integrationId: string) {
    return api.delete<{
      message: string;
      integration_id: string;
      disconnected_at: string;
    }>(`/integrations/${integrationId}/disconnect`);
  }

  static async configureIntegration(integrationId: string, data: {
    configuration: Record<string, any>;
    webhook_url?: string;
  }) {
    return api.put<{
      message: string;
      integration_id: string;
      updated_at: string;
    }>(`/integrations/${integrationId}/configure`, data);
  }

  static async getSyncStatus(integrationId: string) {
    return api.get<{
      integration_id: string;
      status: string;
      last_sync: string;
      next_sync: string;
      error_message?: string;
      sync_frequency: string;
      records_synced: number;
    }>(`/integrations/${integrationId}/sync-status`);
  }

  static async triggerSync(integrationId: string) {
    return api.post<{
      message: string;
      integration_id: string;
      sync_job_id: string;
      estimated_completion: string;
    }>(`/integrations/${integrationId}/sync`);
  }

  static async getIntegrationStats() {
    return api.get<{
      total_available: number;
      connected_count: number;
      available_count: number;
      error_count: number;
      pending_count: number;
      by_category: Record<string, number>;
      by_status: Record<string, number>;
      most_popular: Array<{
        name: string;
        connections: number;
        rating: number;
      }>;
    }>('/integrations/stats/summary');
  }

  static async getIntegrationCategories() {
    return api.get<{
      categories: Array<{
        value: string;
        name: string;
        description: string;
      }>;
    }>('/integrations/categories/list');
  }
}

// User Management Service
export class UserService {
  static async getProfile() {
    return api.get<{
      id: string;
      email: string;
      full_name: string;
      phone?: string;
      job_title?: string;
      bio?: string;
      avatar_url?: string;
      is_active: boolean;
      timezone: string;
      date_format: string;
      currency: string;
      language: string;
      company_id: string | null;
      created_at: string;
      last_login_at: string | null;
      notification_preferences?: {
        email_notifications: boolean;
        contract_deadlines: boolean;
        compliance_alerts: boolean;
        team_updates: boolean;
        marketing_emails: boolean;
        weekly_digest: boolean;
      };
    }>('/auth/me');
  }

  static async updateProfile(data: {
    full_name?: string;
    phone?: string;
    job_title?: string;
    bio?: string;
    timezone?: string;
    date_format?: string;
    currency?: string;
    language?: string;
  }) {
    return api.put<{
      id: string;
      email: string;
      full_name: string;
      phone?: string;
      job_title?: string;
      bio?: string;
      avatar_url?: string;
      is_active: boolean;
      timezone: string;
      date_format: string;
      currency: string;
      language: string;
      company_id: string | null;
      created_at: string;
      last_login_at: string | null;
    }>('/auth/me', data);
  }

  static async updateNotificationPreferences(preferences: {
    email_notifications?: boolean;
    contract_deadlines?: boolean;
    compliance_alerts?: boolean;
    team_updates?: boolean;
    marketing_emails?: boolean;
    weekly_digest?: boolean;
  }) {
    return api.put<{
      message: string;
      preferences: Record<string, boolean>;
    }>('/auth/notifications', { notification_preferences: preferences });
  }

  static async changePassword(data: {
    current_password: string;
    new_password: string;
  }) {
    return api.post<{
      message: string;
      updated_at: string;
    }>('/auth/change-password', data);
  }

  static async enable2FA() {
    return api.post<{
      secret: string;
      qr_code: string;
      backup_codes: string[];
    }>('/auth/2fa/enable');
  }

  static async disable2FA(data: {
    password: string;
    code?: string;
  }) {
    return api.post<{
      message: string;
      disabled_at: string;
    }>('/auth/2fa/disable', data);
  }

  static async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.upload<{
      avatar_url: string;
      message: string;
    }>('/auth/avatar', formData);
  }
}

// Company Management Service
export class CompanyService {
  static async getCompany() {
    return api.get<{
      id: string;
      name: string;
      address?: string;
      city?: string;
      postcode?: string;
      country?: string;
      website?: string;
      vat_number?: string;
      company_number?: string;
      subscription_tier: string;
      max_users: number;
      max_contracts?: number;
      storage_limit_gb?: number;
      ai_credits_monthly?: number;
      created_at: string;
      updated_at?: string;
      owner_id: string;
      contract_defaults?: {
        payment_terms: string;
        jurisdiction: string;
        governing_law: string;
        currency: string;
      };
    }>('/company');
  }

  static async updateCompany(data: {
    name?: string;
    address?: string;
    city?: string;
    postcode?: string;
    country?: string;
    website?: string;
    vat_number?: string;
    company_number?: string;
    contract_defaults?: {
      payment_terms: string;
      jurisdiction: string;
      governing_law: string;
      currency: string;
    };
  }) {
    return api.put<{
      id: string;
      name: string;
      address?: string;
      city?: string;
      postcode?: string;
      country?: string;
      website?: string;
      vat_number?: string;
      company_number?: string;
      subscription_tier: string;
      max_users: number;
      max_contracts?: number;
      storage_limit_gb?: number;
      ai_credits_monthly?: number;
      created_at: string;
      updated_at?: string;
      owner_id: string;
      contract_defaults?: {
        payment_terms: string;
        jurisdiction: string;
        governing_law: string;
        currency: string;
      };
    }>('/company', data);
  }

  static async getUsageStats() {
    return api.get<{
      users_count: number;
      users_limit: number;
      contracts_count: number;
      contracts_limit?: number;
      storage_used_gb: number;
      storage_limit_gb?: number;
      ai_credits_used: number;
      ai_credits_limit?: number;
      period_start: string;
      period_end: string;
    }>('/company/usage');
  }

  static async getSubscription() {
    return api.get<{
      tier: string;
      status: string;
      price_monthly: number;
      currency: string;
      features: string[];
      next_billing_date?: string;
      payment_method?: string;
      auto_renew: boolean;
    }>('/company/subscription');
  }

  static async upgradeSubscription(tier: string) {
    return api.post<{
      message: string;
      new_tier: string;
      effective_date: string;
      price_monthly: number;
    }>('/company/subscription/upgrade', { tier });
  }
}

// Export types
export type { ApiResponse, ApiError };
