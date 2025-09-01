export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  timezone: string;
  company_id: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface Company {
  id: string;
  name: string;
  registration_number?: string;
  address?: string;
  subscription_tier: string;
  max_users: number;
  created_at: string;
}

export interface AuthResponse {
  token: {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
  user: User;
  company: Company | null;
}

export type ContractType = 
  | 'service_agreement'
  | 'employment_contract'
  | 'supplier_agreement'
  | 'nda'
  | 'terms_conditions'
  | 'consultancy'
  | 'partnership'
  | 'lease';

export interface AIGenerationResponse {
  id: string;
  model_name: string;
  model_version?: string;
  input_prompt: string;
  generated_content: string;
  processing_time_ms?: number;
  token_usage?: Record<string, number>;
  confidence_score?: number;
  created_at: string;
}

export interface ComplianceScoreResponse {
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
}

// Legacy interfaces - keeping for backward compatibility
export interface ComplianceIssue {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

export interface RiskFactor {
  name: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  score: number;
}

export interface RiskAssessment {
  overall: number;
  factors: RiskFactor[];
  recommendations: string[];
  lastUpdated: Date;
}

export interface Contract {
  id: string;
  title: string;
  contract_type: string;
  status: 'draft' | 'active' | 'completed' | 'expired' | 'terminated';
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
}

export interface ContractListResponse {
  contracts: Contract[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Legacy - keeping for backward compatibility
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
  joinedAt: Date;
  lastActive: Date;
  signatureStatus?: 'pending' | 'signed' | 'declined';
  signedAt?: Date;
}

export interface ContractTemplate {
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
}

// Analytics interfaces
export interface BusinessMetrics {
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
}

export interface UserMetrics {
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
}

export interface ContractTypeMetrics {
  contract_type: string;
  count: number;
  percentage: number;
  total_value: number;
  average_value: number;
  compliance_score?: number;
}

export interface ComplianceMetrics {
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
}

export interface TimeSeriesData {
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
}

export interface DashboardResponse {
  business_metrics: BusinessMetrics;
  user_metrics: UserMetrics;
  contract_types: ContractTypeMetrics[];
  compliance_metrics: ComplianceMetrics;
  recent_contracts_trend: TimeSeriesData;
  contract_value_trend: TimeSeriesData;
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
}