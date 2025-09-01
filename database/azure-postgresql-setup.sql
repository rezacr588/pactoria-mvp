-- Azure PostgreSQL Flexible Server Setup Script
-- Optimized for Burstable tier (B1ms) cost efficiency

-- Create database if not exists (run as admin)
-- CREATE DATABASE pactoria_mvp;

-- Connect to pactoria_mvp database
\c pactoria_mvp;

-- Create extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS system_metrics CASCADE;
DROP TABLE IF EXISTS contract_versions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS compliance_scores CASCADE;
DROP TABLE IF EXISTS ai_generations CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Drop existing enums if they exist
DROP TYPE IF EXISTS subscription_tier CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS contract_status CASCADE;
DROP TYPE IF EXISTS template_category CASCADE;
DROP TYPE IF EXISTS action_type CASCADE;

-- Create enums
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'business');
CREATE TYPE user_role AS ENUM ('admin', 'contract_manager', 'legal_reviewer', 'viewer');
CREATE TYPE contract_status AS ENUM ('draft', 'pending_review', 'approved', 'active', 'expired', 'terminated');
CREATE TYPE template_category AS ENUM ('service_agreements', 'employment_contracts', 'supplier_agreements', 'ndas', 'terms_conditions');
CREATE TYPE action_type AS ENUM ('create', 'read', 'update', 'delete', 'approve', 'reject', 'export');

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    subscription_tier subscription_tier DEFAULT 'starter',
    
    -- UK company details
    registration_number VARCHAR(20),
    registered_office TEXT,
    vat_number VARCHAR(20),
    
    -- Contact information
    primary_contact_email VARCHAR(255),
    phone_number VARCHAR(50),
    website VARCHAR(255),
    
    -- Subscription details
    max_users INTEGER DEFAULT 5,
    max_contracts INTEGER DEFAULT 50,
    storage_limit_mb INTEGER DEFAULT 1000,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT companies_name_check CHECK (length(name) >= 2),
    CONSTRAINT companies_max_users_check CHECK (max_users > 0),
    CONSTRAINT companies_max_contracts_check CHECK (max_contracts > 0)
);

-- Users table  
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    
    -- Status and role
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    role user_role DEFAULT 'contract_manager',
    department VARCHAR(100),
    
    -- Invitation system
    invitation_token VARCHAR(255) UNIQUE,
    invited_at TIMESTAMP WITH TIME ZONE,
    invited_by UUID REFERENCES users(id),
    
    -- Company association
    company_id UUID REFERENCES companies(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- User preferences
    timezone VARCHAR(50) DEFAULT 'Europe/London',
    preferences JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT users_email_check CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
    CONSTRAINT users_full_name_check CHECK (length(full_name) >= 2)
);

-- Templates table
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category template_category NOT NULL,
    
    -- Template content
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    version VARCHAR(20) DEFAULT '1.0',
    
    -- UK legal compliance
    uk_compliant BOOLEAN DEFAULT TRUE,
    compliance_notes TEXT,
    last_legal_review TIMESTAMP WITH TIME ZONE,
    
    -- Ownership
    company_id UUID REFERENCES companies(id),
    created_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT templates_name_check CHECK (length(name) >= 3),
    CONSTRAINT templates_content_check CHECK (length(content) >= 50)
);

-- Contracts table
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Contract content
    content TEXT NOT NULL,
    content_hash VARCHAR(64), -- SHA-256 hash for integrity
    
    -- Status and workflow
    status contract_status DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    
    -- Parties
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_details JSONB DEFAULT '{}'::jsonb,
    
    -- Financial details
    contract_value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'GBP',
    
    -- Dates
    start_date DATE,
    end_date DATE,
    signature_date DATE,
    
    -- Template relationship
    template_id UUID REFERENCES templates(id),
    
    -- AI generation details
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_generation_id UUID,
    
    -- Ownership and company
    company_id UUID REFERENCES companies(id) NOT NULL,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- File attachments
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Tags and categorization
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT contracts_title_check CHECK (length(title) >= 3),
    CONSTRAINT contracts_content_check CHECK (length(content) >= 10),
    CONSTRAINT contracts_version_check CHECK (version > 0),
    CONSTRAINT contracts_value_check CHECK (contract_value IS NULL OR contract_value >= 0),
    CONSTRAINT contracts_dates_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- AI Generations table
CREATE TABLE ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Request details
    prompt TEXT NOT NULL,
    template_type VARCHAR(100),
    client_details JSONB DEFAULT '{}'::jsonb,
    
    -- Response details
    generated_content TEXT NOT NULL,
    model_used VARCHAR(100) DEFAULT 'groq-llama',
    
    -- Token usage and cost tracking
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost DECIMAL(10,4),
    
    -- Quality metrics
    compliance_score DECIMAL(3,2), -- 0.00 to 1.00
    generation_time_ms INTEGER,
    
    -- Ownership
    company_id UUID REFERENCES companies(id),
    created_by UUID REFERENCES users(id),
    
    -- Contract association
    contract_id UUID REFERENCES contracts(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT ai_generations_compliance_score_check CHECK (compliance_score IS NULL OR (compliance_score >= 0 AND compliance_score <= 1))
);

-- Compliance Scores table
CREATE TABLE compliance_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Contract reference
    contract_id UUID REFERENCES contracts(id) NOT NULL,
    
    -- Overall compliance
    overall_score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
    compliance_level VARCHAR(20),
    
    -- Detailed scores
    governing_law_score DECIMAL(3,2),
    jurisdiction_score DECIMAL(3,2),
    data_protection_score DECIMAL(3,2),
    consumer_rights_score DECIMAL(3,2),
    statutory_requirements_score DECIMAL(3,2),
    company_registration_score DECIMAL(3,2),
    payment_terms_score DECIMAL(3,2),
    termination_clauses_score DECIMAL(3,2),
    
    -- Analysis details
    key_issues TEXT[],
    recommendations TEXT[],
    analysis_notes TEXT,
    
    -- Analysis metadata
    analyzer_version VARCHAR(20) DEFAULT '1.0',
    analysis_duration_ms INTEGER,
    
    -- AI analysis
    ai_analysis_included BOOLEAN DEFAULT FALSE,
    ai_token_usage INTEGER,
    
    -- Ownership
    analyzed_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT compliance_scores_overall_check CHECK (overall_score >= 0 AND overall_score <= 100),
    CONSTRAINT compliance_scores_detail_check CHECK (
        governing_law_score IS NULL OR (governing_law_score >= 0 AND governing_law_score <= 1)
    )
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Action details
    action_type action_type NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'contract', 'template', 'user', etc.
    resource_id UUID NOT NULL,
    
    -- User and company
    user_id UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    
    -- Action details
    action_description VARCHAR(500),
    old_values JSONB,
    new_values JSONB,
    
    -- Request context
    ip_address INET,
    user_agent VARCHAR(500),
    request_path VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexing for compliance
    retention_until TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 years')
);

-- Contract Versions table (for version history)
CREATE TABLE contract_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Contract reference
    contract_id UUID REFERENCES contracts(id) NOT NULL,
    version_number INTEGER NOT NULL,
    
    -- Version content
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_hash VARCHAR(64),
    
    -- Change details
    change_summary VARCHAR(500),
    changed_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT contract_versions_version_check CHECK (version_number > 0),
    UNIQUE(contract_id, version_number)
);

-- System Metrics table (for monitoring)
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Metric details
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(20),
    
    -- Context
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES users(id),
    resource_type VARCHAR(50),
    resource_id UUID,
    
    -- Metadata
    dimensions JSONB DEFAULT '{}'::jsonb,
    tags VARCHAR[],
    
    -- Timestamps
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Partitioning helper (for future partitioning by month)
    partition_key DATE DEFAULT CURRENT_DATE
);

-- Create indexes for performance
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_contracts_company_id ON contracts(company_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_by ON contracts(created_by);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);
CREATE INDEX idx_contracts_tags ON contracts USING GIN(tags);

CREATE INDEX idx_templates_company_id ON templates(company_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_active ON templates(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_ai_generations_company_id ON ai_generations(company_id);
CREATE INDEX idx_ai_generations_contract_id ON ai_generations(contract_id);
CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at);

CREATE INDEX idx_compliance_scores_contract_id ON compliance_scores(contract_id);
CREATE INDEX idx_compliance_scores_overall_score ON compliance_scores(overall_score);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

CREATE INDEX idx_contract_versions_contract_id ON contract_versions(contract_id);

CREATE INDEX idx_system_metrics_company_id ON system_metrics(company_id);
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at);
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default UK legal templates
INSERT INTO templates (name, description, category, content, variables, is_default, uk_compliant) VALUES
(
    'UK Service Agreement Template',
    'Standard UK service agreement compliant with English law',
    'service_agreements',
    'TERMS OF SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into on {{contract_date}} between:

CLIENT: {{client_name}}
Address: {{client_address}}
Company Registration: {{client_registration}}

SERVICE PROVIDER: {{provider_name}}
Address: {{provider_address}}
Company Registration: {{provider_registration}}

1. SERVICES
The Provider agrees to provide the following services:
{{services_description}}

2. TERM
This Agreement shall commence on {{start_date}} and continue for {{contract_duration}}.

3. PAYMENT TERMS
- Total Fee: £{{contract_amount}}
- Payment Schedule: {{payment_terms}}
- Late Payment: Interest at 8% per annum above Bank of England base rate

4. UK LEGAL COMPLIANCE
This Agreement is governed by English Law and subject to the jurisdiction of English Courts.

5. DATA PROTECTION
Both parties agree to comply with UK GDPR and Data Protection Act 2018.

6. INTELLECTUAL PROPERTY
All intellectual property rights remain with the respective owners as defined herein.

7. TERMINATION
Either party may terminate this Agreement with {{notice_period}} written notice.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.',
    '["contract_date", "client_name", "client_address", "client_registration", "provider_name", "provider_address", "provider_registration", "services_description", "start_date", "contract_duration", "contract_amount", "payment_terms", "notice_period"]',
    TRUE,
    TRUE
),
(
    'UK Employment Contract Template',
    'Standard UK employment contract compliant with employment law',
    'employment_contracts',
    'EMPLOYMENT CONTRACT

EMPLOYER: {{employer_name}}
Address: {{employer_address}}
Company Registration: {{employer_registration}}

EMPLOYEE: {{employee_name}}
Address: {{employee_address}}
National Insurance: {{ni_number}}

1. EMPLOYMENT DETAILS
Position: {{job_title}}
Start Date: {{start_date}}
Salary: £{{annual_salary}} per annum
Working Hours: {{weekly_hours}} hours per week

2. PROBATIONARY PERIOD
{{probation_period}} months from start date

3. NOTICE PERIODS
Employee: {{employee_notice}}
Employer: {{employer_notice}}

4. ANNUAL LEAVE
{{annual_leave_days}} days per year plus UK bank holidays

5. SICK PAY
Statutory Sick Pay as per UK legislation

6. PENSION
Auto-enrollment in company pension scheme as required by UK law

7. CONFIDENTIALITY
Employee agrees to maintain confidentiality of company information

8. DATA PROTECTION
This contract complies with UK GDPR and employment law

This contract is governed by English law.',
    '["employer_name", "employer_address", "employer_registration", "employee_name", "employee_address", "ni_number", "job_title", "start_date", "annual_salary", "weekly_hours", "probation_period", "employee_notice", "employer_notice", "annual_leave_days"]',
    TRUE,
    TRUE
),
(
    'UK Non-Disclosure Agreement Template',
    'Standard UK NDA template compliant with confidentiality laws',
    'ndas',
    'NON-DISCLOSURE AGREEMENT (NDA)

DISCLOSING PARTY: {{disclosing_party}}
RECEIVING PARTY: {{receiving_party}}

Date: {{agreement_date}}

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means {{confidential_info_definition}}

2. OBLIGATIONS
The Receiving Party agrees to:
- Keep information confidential
- Not disclose to third parties
- Use only for permitted purposes

3. EXCLUSIONS
This Agreement does not apply to information that:
- Is publicly available
- Was known before disclosure
- Is independently developed

4. TERM
This Agreement remains in effect for {{agreement_duration}} years

5. UK LEGAL COMPLIANCE
Governed by English law and jurisdiction of English Courts

6. DATA PROTECTION
Complies with UK GDPR and Data Protection Act 2018',
    '["disclosing_party", "receiving_party", "agreement_date", "confidential_info_definition", "agreement_duration"]',
    TRUE,
    TRUE
);

-- Create a default admin user (password: admin123 - change this immediately!)
INSERT INTO users (email, full_name, hashed_password, is_admin, role) VALUES
('admin@pactoria.com', 'System Administrator', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeULyLw3xAE1K7foa', TRUE, 'admin');

-- Create performance monitoring views
CREATE VIEW contract_summary AS
SELECT 
    c.id,
    c.title,
    c.status,
    c.contract_value,
    c.start_date,
    c.end_date,
    u.full_name as created_by_name,
    comp.name as company_name,
    cs.overall_score as compliance_score
FROM contracts c
LEFT JOIN users u ON c.created_by = u.id
LEFT JOIN companies comp ON c.company_id = comp.id  
LEFT JOIN compliance_scores cs ON c.id = cs.contract_id
WHERE c.status != 'deleted';

CREATE VIEW user_activity_summary AS
SELECT 
    u.id,
    u.full_name,
    u.email,
    u.role,
    u.last_login_at,
    COUNT(c.id) as contracts_created,
    COUNT(al.id) as total_actions
FROM users u
LEFT JOIN contracts c ON u.id = c.created_by
LEFT JOIN audit_logs al ON u.id = al.user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.full_name, u.email, u.role, u.last_login_at;

-- Grant appropriate permissions (adjust as needed for your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pactoria_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pactoria_app_user;

-- Display table information
\dt
\d+ companies

-- Success message
SELECT 'Azure PostgreSQL database setup completed successfully!' as status;