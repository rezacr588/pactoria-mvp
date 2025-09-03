# Database Schema and Models Documentation

**Pactoria MVP Backend - Complete Database Architecture**

## Table of Contents

1. [Database Overview](#database-overview)
2. [Schema Design](#schema-design)
3. [Core Tables](#core-tables)
4. [Relationships and Constraints](#relationships-and-constraints)
5. [Indexes and Performance](#indexes-and-performance)
6. [Data Integrity](#data-integrity)
7. [Migration Strategy](#migration-strategy)
8. [Backup and Recovery](#backup-and-recovery)

---

## Database Overview

The Pactoria backend uses a relational database design optimized for contract management, AI integration, and comprehensive audit trails. The schema supports multi-tenancy, version control, and UK legal compliance requirements.

### Database Platforms

| Environment | Database | Configuration |
|-------------|----------|---------------|
| Development | SQLite | Single file, zero configuration |
| Testing | SQLite | In-memory or file-based |
| Staging | Azure Database for PostgreSQL | Flexible server, 32GB storage |
| Production | Azure Database for PostgreSQL | High availability, automated backups |

### Key Design Principles

- **Multi-Tenancy**: Company-based data isolation
- **Audit Trail**: Complete change tracking for compliance
- **Version Control**: Full history of contract changes
- **Performance**: Optimized indexes for common queries
- **Scalability**: Designed for growth to 10,000+ contracts
- **Compliance**: GDPR-ready with data retention policies

---

## Schema Design

### Entity Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Companies    │────│     Users       │────│   Audit Logs   │
│                 │ 1:N│                 │ 1:N│                 │
│ • id (PK)       │    │ • id (PK)       │    │ • id (PK)       │
│ • name          │    │ • email (UK)    │    │ • event_type    │
│ • subscription  │    │ • company_id(FK)│    │ • user_id (FK)  │
│ • settings      │    │ • role          │    │ • timestamp     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │ 1:N                   │ 1:N
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Contracts    │────│ Contract        │    │   Templates     │
│                 │ 1:N│ Versions        │    │                 │
│ • id (PK)       │    │                 │    │ • id (PK)       │
│ • title         │    │ • id (PK)       │    │ • name          │
│ • status        │    │ • version_num   │    │ • contract_type │
│ • content       │    │ • content       │    │ • template_content│
│ • company_id(FK)│    │ • contract_id(FK)│   │ • compliance    │
│ • template_id(FK)│   └─────────────────┘    └─────────────────┘
└─────────────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  AI Generations │    │ Compliance      │    │ System Metrics  │
│                 │    │ Scores          │    │                 │
│ • id (PK)       │    │                 │    │ • id (PK)       │
│ • model_name    │    │ • id (PK)       │    │ • metric_name   │
│ • input_prompt  │    │ • overall_score │    │ • metric_value  │
│ • generated_content│ │ • gdpr_score    │    │ • company_id(FK)│
│ • confidence    │    │ • risk_score    │    │ • timestamp     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Database Configuration

```python
# Development Configuration (SQLite)
DATABASE_URL = "sqlite:///./pactoria_mvp.db"

# Production Configuration (PostgreSQL)
DATABASE_URL = "postgresql://user:password@host:5432/pactoria_prod"

# SQLAlchemy Engine Settings
engine = create_engine(
    DATABASE_URL,
    echo=False,              # SQL logging (True for debug)
    pool_size=20,            # Connection pool size
    max_overflow=30,         # Additional connections
    pool_pre_ping=True,      # Validate connections
    pool_recycle=3600,       # Recycle connections hourly
)
```

---

## Core Tables

### Users Table

**Purpose**: User authentication and profile management with role-based access control.

```sql
CREATE TABLE users (
    id VARCHAR PRIMARY KEY,              -- UUID format
    email VARCHAR UNIQUE NOT NULL,       -- Email address (UK domains common)
    full_name VARCHAR NOT NULL,          -- Display name
    hashed_password VARCHAR NOT NULL,    -- bcrypt hashed password
    is_active BOOLEAN DEFAULT TRUE,      -- Account status
    is_admin BOOLEAN DEFAULT FALSE,      -- System admin flag
    role VARCHAR DEFAULT 'contract_manager', -- User role enum
    department VARCHAR,                  -- Optional department
    
    -- Multi-user invitation system
    invitation_token VARCHAR UNIQUE,     -- Invitation token for bulk invites
    invited_at TIMESTAMP WITH TIME ZONE, -- When invited
    invited_by VARCHAR REFERENCES users(id), -- Who sent invitation
    
    -- Company association (multi-tenant)
    company_id VARCHAR NOT NULL REFERENCES companies(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- User preferences
    timezone VARCHAR DEFAULT 'Europe/London', -- UK timezone default
    notification_preferences JSON DEFAULT '{}' -- Notification settings
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_invitation_token ON users(invitation_token);
```

**Business Rules:**
- Email must be unique across the system
- Users must belong to a company (multi-tenant)
- Default timezone is UK (Europe/London)
- Role-based access control with 4 levels
- Support for bulk user invitations

### Companies Table

**Purpose**: Multi-tenant organization management with subscription tiers.

```sql
CREATE TABLE companies (
    id VARCHAR PRIMARY KEY,              -- UUID format
    name VARCHAR NOT NULL,               -- Company name
    registration_number VARCHAR,         -- UK company registration
    address TEXT,                        -- UK postal address
    
    -- Subscription management
    subscription_tier VARCHAR DEFAULT 'starter', -- Subscription level
    max_users INTEGER DEFAULT 5,         -- User limit per subscription
    
    -- Company settings
    settings JSON DEFAULT '{}',          -- Company-specific configuration
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_subscription ON companies(subscription_tier);
```

**Business Rules:**
- Starter subscription limited to 5 users
- Company settings stored as flexible JSON
- UK company registration numbers supported
- Subscription tiers: STARTER, PROFESSIONAL, BUSINESS

### Contracts Table

**Purpose**: Core contract management with lifecycle tracking and AI integration.

```sql
CREATE TABLE contracts (
    id VARCHAR PRIMARY KEY,              -- UUID format
    title VARCHAR NOT NULL,              -- Contract title
    contract_type VARCHAR NOT NULL,      -- Service agreement, employment, etc.
    status VARCHAR DEFAULT 'draft',     -- Contract lifecycle status
    
    -- Content management
    plain_english_input TEXT,           -- Original natural language input
    generated_content TEXT,             -- AI-generated content
    final_content TEXT,                 -- Human-approved final content
    
    -- Contract parties
    client_name VARCHAR,                -- Primary party name
    client_email VARCHAR,               -- Primary party email
    supplier_name VARCHAR,              -- Secondary party name (optional)
    supplier_email VARCHAR,             -- Secondary party email (optional)
    
    -- Financial information
    contract_value DECIMAL(12,2),       -- Contract value (pounds sterling)
    currency VARCHAR DEFAULT 'GBP',     -- ISO currency code
    
    -- Contract timeline
    start_date TIMESTAMP WITH TIME ZONE, -- Contract start date
    end_date TIMESTAMP WITH TIME ZONE,   -- Contract end date (optional)
    
    -- Version control
    version INTEGER DEFAULT 1,          -- Current version number
    is_current_version BOOLEAN DEFAULT TRUE, -- Latest version flag
    
    -- Multi-tenant and relationships
    company_id VARCHAR NOT NULL REFERENCES companies(id),
    template_id VARCHAR REFERENCES templates(id),
    created_by VARCHAR NOT NULL REFERENCES users(id),
    ai_generation_id VARCHAR REFERENCES ai_generations(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Performance indexes
CREATE INDEX idx_contracts_company_id ON contracts(company_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_type ON contracts(contract_type);
CREATE INDEX idx_contracts_created_by ON contracts(created_by);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);
CREATE INDEX idx_contracts_end_date ON contracts(end_date) WHERE end_date IS NOT NULL;

-- Full-text search support (PostgreSQL)
CREATE INDEX idx_contracts_title_search ON contracts USING gin(to_tsvector('english', title));
CREATE INDEX idx_contracts_content_search ON contracts USING gin(to_tsvector('english', coalesce(final_content, generated_content, '')));
```

**Business Rules:**
- Contracts start in DRAFT status
- Version increments on content changes
- Multi-currency support (defaults to GBP)
- Optional end dates for open-ended contracts
- Full audit trail via separate audit logs

### AI Generations Table

**Purpose**: Track AI-powered content generation with performance metrics.

```sql
CREATE TABLE ai_generations (
    id VARCHAR PRIMARY KEY,              -- UUID format
    
    -- Model information
    model_name VARCHAR NOT NULL,         -- AI model identifier
    model_version VARCHAR,               -- Model version (optional)
    
    -- Generation data
    input_prompt TEXT NOT NULL,          -- Complete prompt sent to AI
    generated_content TEXT NOT NULL,     -- AI response content
    
    -- Performance metrics
    processing_time_ms DECIMAL(10,2),    -- Generation time in milliseconds
    token_usage JSON,                    -- Token counts (prompt, completion, total)
    confidence_score DECIMAL(3,2),      -- AI confidence (0.0-1.0)
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_ai_generations_model ON ai_generations(model_name);
CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at);
CREATE INDEX idx_ai_generations_processing_time ON ai_generations(processing_time_ms);
```

**Business Rules:**
- All AI generations are logged for audit purposes
- Performance metrics tracked for optimization
- Confidence scoring for quality assessment
- Token usage tracking for cost management

### Compliance Scores Table

**Purpose**: UK legal compliance analysis with detailed scoring breakdown.

```sql
CREATE TABLE compliance_scores (
    id VARCHAR PRIMARY KEY,              -- UUID format
    contract_id VARCHAR NOT NULL REFERENCES contracts(id),
    
    -- Overall compliance
    overall_score DECIMAL(3,2) NOT NULL, -- Overall compliance (0.0-1.0)
    
    -- UK-specific compliance areas
    gdpr_compliance DECIMAL(3,2),        -- GDPR compliance score
    employment_law_compliance DECIMAL(3,2), -- UK employment law
    consumer_rights_compliance DECIMAL(3,2), -- UK consumer rights
    commercial_terms_compliance DECIMAL(3,2), -- Commercial law
    
    -- Risk assessment
    risk_score INTEGER,                  -- Risk score (1-10 scale)
    risk_factors JSON DEFAULT '[]',     -- Identified risk factors
    recommendations JSON DEFAULT '[]',   -- AI recommendations
    
    -- Analysis metadata
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analysis_version VARCHAR,           -- Analysis system version
    analysis_raw TEXT                   -- Raw AI analysis output
);

-- Performance indexes
CREATE INDEX idx_compliance_scores_contract ON compliance_scores(contract_id);
CREATE INDEX idx_compliance_scores_overall ON compliance_scores(overall_score);
CREATE INDEX idx_compliance_scores_risk ON compliance_scores(risk_score);
CREATE INDEX idx_compliance_scores_date ON compliance_scores(analysis_date);
```

**Business Rules:**
- Compliance scores on 0.0-1.0 scale
- Score >= 0.95 considered compliant for UK law
- Risk scores on 1-10 scale (1=low, 10=high)
- Historical compliance tracking for trends

### Templates Table

**Purpose**: UK legal contract templates with compliance features.

```sql
CREATE TABLE templates (
    id VARCHAR PRIMARY KEY,              -- UUID format
    name VARCHAR NOT NULL,               -- Template name
    category VARCHAR NOT NULL,           -- Template category
    contract_type VARCHAR NOT NULL,      -- Associated contract type
    
    -- Template content
    description TEXT NOT NULL,           -- Template description
    template_content TEXT NOT NULL,      -- Template body with placeholders
    
    -- UK legal features
    compliance_features JSON DEFAULT '[]', -- Built-in compliance features
    legal_notes TEXT,                    -- UK legal guidance notes
    
    -- Version and status
    version VARCHAR DEFAULT '1.0',      -- Template version
    is_active BOOLEAN DEFAULT TRUE,     -- Active status
    suitable_for JSON DEFAULT '[]',     -- Use case suitability
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Performance indexes
CREATE INDEX idx_templates_contract_type ON templates(contract_type);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_is_active ON templates(is_active);
```

**Business Rules:**
- 20+ UK legal templates required for MVP
- Templates include built-in compliance features
- Version control for template updates
- Categorized by use case and contract type

### Contract Versions Table

**Purpose**: Complete version history for contract content changes.

```sql
CREATE TABLE contract_versions (
    id VARCHAR PRIMARY KEY,              -- UUID format
    contract_id VARCHAR NOT NULL REFERENCES contracts(id),
    version_number INTEGER NOT NULL,     -- Sequential version number
    
    -- Version content
    content TEXT NOT NULL,               -- Full contract content at this version
    change_summary TEXT,                 -- Summary of changes made
    
    -- Version metadata
    created_by VARCHAR NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint on contract_id + version_number
    UNIQUE(contract_id, version_number)
);

-- Performance indexes
CREATE INDEX idx_contract_versions_contract ON contract_versions(contract_id);
CREATE INDEX idx_contract_versions_version ON contract_versions(contract_id, version_number);
CREATE INDEX idx_contract_versions_created_at ON contract_versions(created_at);
```

**Business Rules:**
- Every content change creates a new version
- Complete content stored (not diffs)
- Version numbers sequential within each contract
- Created by user tracked for accountability

### Audit Logs Table

**Purpose**: Comprehensive audit trail for compliance and security.

```sql
CREATE TABLE audit_logs (
    id VARCHAR PRIMARY KEY,              -- UUID format
    
    -- Event identification
    event_type VARCHAR NOT NULL,         -- Type of event (create, update, delete)
    resource_type VARCHAR NOT NULL,      -- Type of resource affected
    resource_id VARCHAR,                 -- ID of affected resource
    
    -- User context
    user_id VARCHAR REFERENCES users(id), -- User who performed action
    ip_address VARCHAR,                  -- Client IP address
    user_agent VARCHAR,                  -- Client user agent
    
    -- Change tracking
    old_values JSON,                     -- Previous values
    new_values JSON,                     -- New values
    additional_data JSON,                -- Extra context data
    
    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contract-specific linking
    contract_id VARCHAR REFERENCES contracts(id)
);

-- Performance indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_contract_id ON audit_logs(contract_id);
```

**Business Rules:**
- All significant actions are logged
- Complete before/after state captured
- Client context (IP, user agent) recorded
- Retention policy: 7 years for compliance

### System Metrics Table

**Purpose**: Business intelligence and system performance tracking.

```sql
CREATE TABLE system_metrics (
    id VARCHAR PRIMARY KEY,              -- UUID format
    
    -- Metric identification
    metric_name VARCHAR NOT NULL,        -- Metric identifier
    metric_value DECIMAL(12,4) NOT NULL, -- Metric value
    metric_unit VARCHAR,                 -- Unit of measurement
    
    -- Context
    company_id VARCHAR REFERENCES companies(id), -- Company-specific metrics
    user_id VARCHAR REFERENCES users(id),       -- User-specific metrics
    
    -- Additional context
    tags JSON DEFAULT '{}',              -- Flexible tagging system
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX idx_system_metrics_company ON system_metrics(company_id);
CREATE INDEX idx_system_metrics_name_timestamp ON system_metrics(metric_name, timestamp);
```

**Business Rules:**
- Metrics collected for business intelligence
- Company-level and user-level metrics
- Flexible tagging for categorization
- Time-series data for trend analysis

---

## Relationships and Constraints

### Foreign Key Relationships

```sql
-- User relationships
ALTER TABLE users ADD CONSTRAINT fk_users_company 
    FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE users ADD CONSTRAINT fk_users_invited_by 
    FOREIGN KEY (invited_by) REFERENCES users(id);

-- Contract relationships
ALTER TABLE contracts ADD CONSTRAINT fk_contracts_company 
    FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE contracts ADD CONSTRAINT fk_contracts_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE contracts ADD CONSTRAINT fk_contracts_template 
    FOREIGN KEY (template_id) REFERENCES templates(id);
ALTER TABLE contracts ADD CONSTRAINT fk_contracts_ai_generation 
    FOREIGN KEY (ai_generation_id) REFERENCES ai_generations(id);

-- Version control relationships
ALTER TABLE contract_versions ADD CONSTRAINT fk_versions_contract 
    FOREIGN KEY (contract_id) REFERENCES contracts(id);
ALTER TABLE contract_versions ADD CONSTRAINT fk_versions_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id);

-- Compliance relationships
ALTER TABLE compliance_scores ADD CONSTRAINT fk_compliance_contract 
    FOREIGN KEY (contract_id) REFERENCES contracts(id);

-- Audit relationships
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_user 
    FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_contract 
    FOREIGN KEY (contract_id) REFERENCES contracts(id);
```

### Check Constraints

```sql
-- Compliance score validation
ALTER TABLE compliance_scores ADD CONSTRAINT check_overall_score 
    CHECK (overall_score >= 0.0 AND overall_score <= 1.0);
ALTER TABLE compliance_scores ADD CONSTRAINT check_gdpr_score 
    CHECK (gdpr_compliance IS NULL OR (gdpr_compliance >= 0.0 AND gdpr_compliance <= 1.0));
ALTER TABLE compliance_scores ADD CONSTRAINT check_risk_score 
    CHECK (risk_score IS NULL OR (risk_score >= 1 AND risk_score <= 10));

-- Contract value validation
ALTER TABLE contracts ADD CONSTRAINT check_contract_value_positive 
    CHECK (contract_value IS NULL OR contract_value >= 0);

-- Date validation
ALTER TABLE contracts ADD CONSTRAINT check_contract_dates 
    CHECK (end_date IS NULL OR end_date > start_date);

-- Version validation
ALTER TABLE contracts ADD CONSTRAINT check_version_positive 
    CHECK (version > 0);
ALTER TABLE contract_versions ADD CONSTRAINT check_version_number_positive 
    CHECK (version_number > 0);
```

### Unique Constraints

```sql
-- User uniqueness
ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT uk_users_invitation_token UNIQUE (invitation_token);

-- Contract version uniqueness
ALTER TABLE contract_versions ADD CONSTRAINT uk_contract_versions 
    UNIQUE (contract_id, version_number);

-- Template name uniqueness within category
ALTER TABLE templates ADD CONSTRAINT uk_templates_name_category 
    UNIQUE (name, category);
```

---

## Indexes and Performance

### Query Performance Optimization

```sql
-- Most common queries and their indexes

-- 1. List contracts for company (pagination)
CREATE INDEX idx_contracts_company_created ON contracts(company_id, created_at DESC);

-- 2. Search contracts by title/content
CREATE INDEX idx_contracts_search ON contracts 
    USING gin(to_tsvector('english', title || ' ' || coalesce(final_content, generated_content, '')));

-- 3. Filter contracts by status and type
CREATE INDEX idx_contracts_status_type_company ON contracts(company_id, status, contract_type);

-- 4. Find expiring contracts
CREATE INDEX idx_contracts_expiring ON contracts(end_date) 
    WHERE status = 'active' AND end_date IS NOT NULL;

-- 5. User login lookup
CREATE INDEX idx_users_email_active ON users(email) WHERE is_active = true;

-- 6. Audit trail queries
CREATE INDEX idx_audit_logs_resource_timestamp ON audit_logs(resource_type, resource_id, timestamp DESC);

-- 7. Compliance trend analysis
CREATE INDEX idx_compliance_company_date ON compliance_scores(contract_id, analysis_date);
```

### Performance Monitoring Queries

```sql
-- Query performance analysis
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE tablename IN ('contracts', 'users', 'compliance_scores', 'audit_logs')
ORDER BY tablename, attname;

-- Index usage statistics
SELECT 
    schemaname,
    tablename,
    attname,
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## Data Integrity

### Database Triggers

```sql
-- Automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Data Validation Functions

```sql
-- Validate UK company registration numbers
CREATE OR REPLACE FUNCTION validate_uk_company_number(company_number VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    -- UK company numbers are 8 digits, optionally prefixed with 2-3 letters
    RETURN company_number ~ '^([A-Z]{2,3})?[0-9]{8}$';
END;
$$ LANGUAGE plpgsql;

-- Validate UK postal codes
CREATE OR REPLACE FUNCTION validate_uk_postcode(postcode VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic UK postcode format validation
    RETURN upper(postcode) ~ '^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$';
END;
$$ LANGUAGE plpgsql;
```

### Backup and Integrity Checks

```sql
-- Data integrity verification
CREATE OR REPLACE FUNCTION verify_data_integrity()
RETURNS TABLE(table_name TEXT, issue_description TEXT, affected_rows BIGINT) AS $$
BEGIN
    -- Check for orphaned contracts
    RETURN QUERY
    SELECT 'contracts'::TEXT, 'Orphaned contracts without company'::TEXT, 
           COUNT(*)::BIGINT
    FROM contracts c 
    LEFT JOIN companies co ON c.company_id = co.id 
    WHERE co.id IS NULL;
    
    -- Check for users without companies
    RETURN QUERY
    SELECT 'users'::TEXT, 'Users without company'::TEXT, 
           COUNT(*)::BIGINT
    FROM users u 
    LEFT JOIN companies c ON u.company_id = c.id 
    WHERE c.id IS NULL;
    
    -- Check for compliance scores outside valid range
    RETURN QUERY
    SELECT 'compliance_scores'::TEXT, 'Invalid compliance scores'::TEXT, 
           COUNT(*)::BIGINT
    FROM compliance_scores 
    WHERE overall_score < 0 OR overall_score > 1
       OR (gdpr_compliance IS NOT NULL AND (gdpr_compliance < 0 OR gdpr_compliance > 1))
       OR (risk_score IS NOT NULL AND (risk_score < 1 OR risk_score > 10));
END;
$$ LANGUAGE plpgsql;
```

---

## Migration Strategy

### Alembic Configuration

```python
# alembic/env.py
from app.infrastructure.database.models import Base
from app.core.config import settings

# Target metadata for auto-generation
target_metadata = Base.metadata

# Database URL from settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
```

### Migration Scripts

```python
# migrations/versions/001_initial_schema.py
"""Initial database schema

Revision ID: 001
Revises: 
Create Date: 2025-01-01 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    # Create companies table first (referenced by users)
    op.create_table('companies',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('registration_number', sa.String(), nullable=True),
        sa.Column('subscription_tier', sa.String(), nullable=False),
        sa.Column('max_users', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('company_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    
    # Additional tables...

def downgrade():
    op.drop_table('users')
    op.drop_table('companies')
```

### Production Migration Process

```bash
# 1. Backup production database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration on staging
alembic upgrade head

# 3. Apply to production (with downtime)
alembic upgrade head

# 4. Verify data integrity
python -c "
from app.infrastructure.database.models import verify_data_integrity
print(list(verify_data_integrity()))
"
```

---

## Backup and Recovery

### Automated Backup Strategy

```bash
#!/bin/bash
# backup_database.sh - Automated backup script

# Configuration
BACKUP_DIR="/var/backups/pactoria"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Full database backup
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/full_backup_$TIMESTAMP.sql.gz

# Schema-only backup
pg_dump --schema-only $DATABASE_URL > $BACKUP_DIR/schema_backup_$TIMESTAMP.sql

# Data-only backup for critical tables
pg_dump --data-only -t contracts -t users -t companies $DATABASE_URL | gzip > $BACKUP_DIR/critical_data_$TIMESTAMP.sql.gz

# Cleanup old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"
```

### Point-in-Time Recovery

```bash
# Azure Database for PostgreSQL - Point-in-time recovery
az postgres flexible-server restore \
  --resource-group rg-pactoria-prod \
  --name pactoria-db-restored \
  --source-server pactoria-db-prod \
  --restore-time "2025-01-01T12:00:00Z"
```

### Disaster Recovery Testing

```python
# test_disaster_recovery.py
import asyncio
from app.core.database import get_db
from app.infrastructure.database.models import *

async def test_data_recovery():
    """Test data integrity after restoration."""
    async with get_db() as db:
        # Verify critical data exists
        company_count = await db.query(Company).count()
        user_count = await db.query(User).count()
        contract_count = await db.query(Contract).count()
        
        print(f"Recovery verification:")
        print(f"Companies: {company_count}")
        print(f"Users: {user_count}")
        print(f"Contracts: {contract_count}")
        
        # Verify relationships
        orphaned_contracts = await db.query(Contract).filter(
            ~Contract.company_id.in_(
                db.query(Company.id).subquery()
            )
        ).count()
        
        print(f"Orphaned contracts: {orphaned_contracts}")
        
        return orphaned_contracts == 0

if __name__ == "__main__":
    result = asyncio.run(test_data_recovery())
    print(f"Recovery test: {'PASSED' if result else 'FAILED'}")
```

---

This comprehensive database documentation provides complete coverage of the schema design, relationships, performance considerations, and operational procedures for the Pactoria backend database.