"""Database models for Pactoria MVP"""
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class ContractType(str, enum.Enum):
    SERVICE_AGREEMENT = "service_agreement"
    EMPLOYMENT_CONTRACT = "employment_contract"
    SUPPLIER_AGREEMENT = "supplier_agreement"
    NDA = "nda"
    TERMS_CONDITIONS = "terms_conditions"
    CONSULTANCY = "consultancy"
    PARTNERSHIP = "partnership"
    LEASE = "lease"


class SubscriptionTier(str, enum.Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    BUSINESS = "business"


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    company = relationship("Company", back_populates="users")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    timezone = Column(String, default="Europe/London")
    notification_preferences = Column(JSON, default={})
    
    created_contracts = relationship("Contract", back_populates="created_by_user", foreign_keys="Contract.created_by")
    audit_logs = relationship("AuditLog", back_populates="user")


class Company(Base):
    __tablename__ = "companies"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    registration_number = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    
    subscription_tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.STARTER)
    max_users = Column(Integer, default=5)
    
    settings = Column(JSON, default={})
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    users = relationship("User", back_populates="company")
    contracts = relationship("Contract", back_populates="company")


class Template(Base):
    __tablename__ = "templates"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    contract_type = Column(Enum(ContractType), nullable=False)
    
    description = Column(Text, nullable=False)
    template_content = Column(Text, nullable=False)
    
    compliance_features = Column(JSON, default=[])
    legal_notes = Column(Text, nullable=True)
    
    version = Column(String, default="1.0")
    is_active = Column(Boolean, default=True)
    suitable_for = Column(JSON, default=[])
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    contracts = relationship("Contract", back_populates="template")


class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    contract_type = Column(Enum(ContractType), nullable=False)
    status = Column(Enum(ContractStatus), default=ContractStatus.DRAFT)
    
    plain_english_input = Column(Text, nullable=True)
    generated_content = Column(Text, nullable=True)
    final_content = Column(Text, nullable=True)
    
    client_name = Column(String, nullable=True)
    client_email = Column(String, nullable=True)
    supplier_name = Column(String, nullable=True)
    supplier_email = Column(String, nullable=True)
    
    contract_value = Column(Float, nullable=True)
    currency = Column(String, default="GBP")
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    version = Column(Integer, default=1)
    is_current_version = Column(Boolean, default=True)
    
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    company = relationship("Company", back_populates="contracts")
    
    template_id = Column(String, ForeignKey("templates.id"), nullable=True)
    template = relationship("Template", back_populates="contracts")
    
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_by_user = relationship("User", back_populates="created_contracts", foreign_keys=[created_by])
    
    ai_generation_id = Column(String, ForeignKey("ai_generations.id"), nullable=True)
    ai_generation = relationship("AIGeneration", back_populates="contract")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    versions = relationship("ContractVersion", back_populates="contract")
    compliance_scores = relationship("ComplianceScore", back_populates="contract")
    audit_logs = relationship("AuditLog", back_populates="contract")


class ContractVersion(Base):
    __tablename__ = "contract_versions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String, ForeignKey("contracts.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    
    content = Column(Text, nullable=False)
    change_summary = Column(Text, nullable=True)
    
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    contract = relationship("Contract", back_populates="versions")


class AIGeneration(Base):
    __tablename__ = "ai_generations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    model_name = Column(String, nullable=False)
    model_version = Column(String, nullable=True)
    
    input_prompt = Column(Text, nullable=False)
    generated_content = Column(Text, nullable=False)
    
    processing_time_ms = Column(Float, nullable=True)
    token_usage = Column(JSON, nullable=True)
    confidence_score = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    contract = relationship("Contract", back_populates="ai_generation")


class ComplianceScore(Base):
    __tablename__ = "compliance_scores"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String, ForeignKey("contracts.id"), nullable=False)
    
    overall_score = Column(Float, nullable=False)
    
    gdpr_compliance = Column(Float, nullable=True)
    employment_law_compliance = Column(Float, nullable=True)
    consumer_rights_compliance = Column(Float, nullable=True)
    commercial_terms_compliance = Column(Float, nullable=True)
    
    risk_score = Column(Integer, nullable=True)
    risk_factors = Column(JSON, default=[])
    recommendations = Column(JSON, default=[])
    
    analysis_date = Column(DateTime(timezone=True), server_default=func.now())
    analysis_version = Column(String, nullable=True)
    analysis_raw = Column(Text, nullable=True)
    
    contract = relationship("Contract", back_populates="compliance_scores")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    event_type = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=True)
    
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    additional_data = Column(JSON, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="audit_logs")
    contract_id = Column(String, ForeignKey("contracts.id"), nullable=True)
    contract = relationship("Contract", back_populates="audit_logs")


class SystemMetrics(Base):
    __tablename__ = "system_metrics"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    metric_name = Column(String, nullable=False)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String, nullable=True)
    
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    tags = Column(JSON, default={})
    timestamp = Column(DateTime(timezone=True), server_default=func.now())