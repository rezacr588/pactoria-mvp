export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  timezone: string;
  company_id: string | null;
  created_at: string;
  last_login_at: string | null;
  // Additional properties for UI consistency
  avatar?: string;
  name?: string; // Computed from full_name or display name
  company?: string; // Company name for display
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
  status: string; // Changed to string to match API response - backend returns various status values
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

// Advanced Search Types
export interface SearchOperator {
  AND: 'AND';
  OR: 'OR';
  NOT: 'NOT';
}

export interface SortDirection {
  ASC: 'ASC';
  DESC: 'DESC';
}

export interface DateRangeFilter {
  gte?: string;
  lte?: string;
  eq?: string;
}

export interface NumericRangeFilter {
  gte?: number;
  lte?: number;
  eq?: number;
}

export interface SortCriteria {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface ContractSearchFilters {
  status?: string[];
  contract_type?: string[];
  client_name?: string;
  supplier_name?: string;
  contract_value?: NumericRangeFilter;
  start_date?: DateRangeFilter;
  end_date?: DateRangeFilter;
  created_at?: DateRangeFilter;
  updated_at?: DateRangeFilter;
  has_compliance_score?: boolean;
  compliance_score?: NumericRangeFilter;
  risk_score?: NumericRangeFilter;
  template_id?: string[];
  created_by?: string[];
}

export interface ContractSearchRequest {
  query?: string;
  operator?: 'AND' | 'OR' | 'NOT';
  fields?: string[];
  filters?: ContractSearchFilters;
  sort?: SortCriteria[];
  page?: number;
  size?: number;
  select_fields?: string[];
  include_total?: boolean;
  highlight?: boolean;
}

export interface SearchHighlight {
  field: string;
  fragments: string[];
}

export interface ContractSearchResult {
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
  highlights?: SearchHighlight[];
}

export interface ContractSearchResults {
  items: ContractSearchResult[];
  total?: number;
  page: number;
  size: number;
  pages?: number;
  took_ms: number;
  query: string;
  filters_applied: Record<string, any>;
}

export interface UserSearchFilters {
  role?: string[];
  is_active?: boolean;
  department?: string[];
  created_at?: DateRangeFilter;
  last_login_at?: DateRangeFilter;
}

export interface UserSearchRequest {
  query?: string;
  operator?: 'AND' | 'OR' | 'NOT';
  fields?: string[];
  filters?: UserSearchFilters;
  sort?: SortCriteria[];
  page?: number;
  size?: number;
  select_fields?: string[];
  include_total?: boolean;
}

export interface UserSearchResult {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
  highlights?: SearchHighlight[];
}

export interface UserSearchResults {
  items: UserSearchResult[];
  total?: number;
  page: number;
  size: number;
  pages?: number;
  took_ms: number;
  query: string;
  filters_applied: Record<string, any>;
}

export interface TemplateSearchFilters {
  contract_type?: string[];
  category?: string[];
  is_active?: boolean;
  suitable_for?: string[];
  version?: string;
}

export interface TemplateSearchRequest {
  query?: string;
  operator?: 'AND' | 'OR' | 'NOT';
  fields?: string[];
  filters?: TemplateSearchFilters;
  sort?: SortCriteria[];
  page?: number;
  size?: number;
  select_fields?: string[];
  include_total?: boolean;
}

export interface TemplateSearchResult {
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
  highlights?: SearchHighlight[];
}

export interface TemplateSearchResults {
  items: TemplateSearchResult[];
  total?: number;
  page: number;
  size: number;
  pages?: number;
  took_ms: number;
  query: string;
  filters_applied: Record<string, any>;
}

// Bulk Operations Types
export interface ContractBulkUpdateFields {
  status?: string;
  client_name?: string;
  supplier_name?: string;
  contract_value?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  final_content?: string;
}

export interface BulkContractUpdateRequest {
  contract_ids: string[];
  updates: ContractBulkUpdateFields;
}

export interface BulkContractDeleteRequest {
  contract_ids: string[];
  deletion_reason?: string;
  hard_delete?: boolean;
}

export interface BulkContractExportRequest {
  contract_ids: string[];
  format: 'CSV' | 'EXCEL' | 'PDF' | 'JSON';
  fields?: string[];
  include_content?: boolean;
  include_versions?: boolean;
}

export interface UserInvitation {
  email: string;
  full_name: string;
  role: string;
  department?: string;
  send_email?: boolean;
}

export interface BulkUserInviteRequest {
  invitations: UserInvitation[];
}

export interface BulkUserRoleChangeRequest {
  user_ids: string[];
  new_role: string;
}

export interface BulkOperationError {
  resource_id: string;
  error_code: string;
  error_message: string;
  details?: Record<string, any>;
}

export interface BulkOperationResponse {
  operation_type: string;
  total_requested: number;
  success_count: number;
  failed_count: number;
  processing_time_ms: number;
  updated_ids?: string[];
  deleted_ids?: string[];
  invited_emails?: string[];
  errors?: BulkOperationError[];
  warnings?: string[];
}

export interface BulkExportResponse {
  export_id: string;
  format: 'CSV' | 'EXCEL' | 'PDF' | 'JSON';
  total_records: number;
  file_size_bytes?: number;
  download_url?: string;
  expires_at?: string;
  processing_time_ms: number;
}

export interface BulkOperationStatus {
  operation_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress_percentage: number;
  message?: string;
  started_at: string;
  completed_at?: string;
  result?: BulkOperationResponse;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  timestamp: string;
  message_id?: string;
}

export interface ConnectionMessage extends WebSocketMessage {
  type: 'connection';
  status: string;
  user_id: string;
  company_id: string;
  session_id?: string;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  error_code: string;
  error_message: string;
  details?: Record<string, any>;
}

export interface ContractUpdateMessage extends WebSocketMessage {
  type: 'contract_update' | 'contract_created' | 'contract_deleted' | 'contract_status_changed';
  contract_id: string;
  contract_title: string;
  updated_by?: string;
  updated_by_name?: string;
  created_by?: string;
  created_by_name?: string;
  deleted_by?: string;
  deleted_by_name?: string;
  changes?: Record<string, any>;
  version?: number;
  deletion_reason?: string;
}

export interface NotificationMessage extends WebSocketMessage {
  type: 'notification';
  title: string;
  message: string;
  notification_type: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  target_user_id?: string;
  target_role?: string;
  data?: Record<string, any>;
  action_url?: string;
  expires_at?: string;
}

export interface SystemMessage extends WebSocketMessage {
  type: 'system';
  message: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  affects_all_users: boolean;
  maintenance_mode: boolean;
  estimated_duration?: string;
}

export interface AlertMessage extends WebSocketMessage {
  type: 'alert';
  title: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'SECURITY' | 'COMPLIANCE' | 'SYSTEM' | 'BUSINESS';
  affected_contracts?: string[];
  action_required: boolean;
  auto_dismiss: boolean;
  dismiss_after?: number;
}

export interface BulkOperationMessage extends WebSocketMessage {
  type: 'bulk_operation';
  operation_id: string;
  operation_type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress_percentage: number;
  processed_count: number;
  total_count: number;
  success_count: number;
  failed_count: number;
  eta_seconds?: number;
  current_item?: string;
  error_message?: string;
}

// Audit Trail Types
export interface AuditEntry {
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
  risk_level: 'low' | 'medium' | 'high';
  compliance_flag: boolean;
  metadata?: Record<string, any>;
}

export interface AuditEntryFilter {
  user_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  risk_level?: string;
  compliance_flag?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface AuditStats {
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
}

export interface PaginatedAuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface AuditExportRequest {
  filters?: AuditEntryFilter;
  format?: 'JSON' | 'CSV' | 'PDF';
  include_metadata?: boolean;
}

export interface AuditExportResponse {
  export_id: string;
  format: string;
  total_records: number;
  file_size_bytes?: number;
  download_url?: string;
  expires_at?: string;
  processing_time_ms: number;
}

// Notifications Types
export interface Notification {
  id: string;
  type: 'deadline' | 'compliance' | 'team' | 'system' | 'contract';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  action_required: boolean;
  read: boolean;
  timestamp: string;
  user_id: string;
  related_contract?: {
    id: string;
    name: string;
  };
  metadata?: Record<string, any>;
}

export interface NotificationCreate {
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
}

export interface NotificationStats {
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
}

export interface PaginatedNotificationResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
  page: number;
  size: number;
  pages: number;
}

// Team Management Types
export interface TeamMemberNew {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  department?: string;
  is_active: boolean;
  joined_at: string;
  last_active: string;
  avatar_url?: string;
  invitation_status?: 'pending' | 'accepted' | 'expired';
  invited_by?: string;
  invited_at?: string;
}

export interface TeamMemberInvite {
  full_name: string;
  email: string;
  role: string;
  department?: string;
  send_email?: boolean;
}

export interface TeamStats {
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
}

export interface TeamRole {
  value: string;
  name: string;
  description: string;
  permissions: string;
}

// Integration Types
export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  logo_url?: string;
  features: string[];
  status: 'connected' | 'available' | 'pending' | 'error';
  is_popular: boolean;
  is_premium: boolean;
  setup_time_minutes: number;
  last_sync?: string;
  sync_status?: 'success' | 'warning' | 'error';
  connections_count: number;
  rating: number;
  price_tier: 'free' | 'premium' | 'enterprise';
  documentation_url?: string;
  webhook_url?: string;
  api_key_required: boolean;
}

export interface IntegrationConnection {
  id: string;
  integration_id: string;
  user_id: string;
  company_id: string;
  status: 'active' | 'pending' | 'error' | 'disconnected';
  connected_at: string;
  last_sync?: string;
  sync_status?: string;
  configuration: Record<string, any>;
  error_message?: string;
}

export interface IntegrationConnect {
  configuration?: Record<string, any>;
  api_key?: string;
  webhook_url?: string;
}

export interface IntegrationStats {
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
}

export interface IntegrationCategory {
  value: string;
  name: string;
  description: string;
}

export interface IntegrationSyncStatus {
  integration_id: string;
  status: string;
  last_sync: string;
  next_sync: string;
  error_message?: string;
  sync_frequency: string;
  records_synced: number;
}