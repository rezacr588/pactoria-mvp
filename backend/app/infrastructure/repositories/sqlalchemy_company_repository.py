"""
SQLAlchemy Company Repository Implementation
Concrete implementation of CompanyRepository using SQLAlchemy ORM
Follows DDD patterns with proper domain/infrastructure separation
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from sqlalchemy.exc import IntegrityError

from app.domain.entities.company import (
    Company, CompanyId, CompanyNumber, CompanySize, CompanyType, 
    CompanyStatus, IndustryType, BusinessAddress
)
from app.domain.repositories.company_repository import CompanyRepository
from app.domain.value_objects import Email
from app.domain.exceptions import (
    CompanyNotFoundError, DomainValidationError, ConcurrencyError
)
from app.infrastructure.database.models import Company as CompanyModel
from app.domain.event_publishing.domain_event_publisher import DomainEventPublisher


class SQLAlchemyCompanyRepository(CompanyRepository):
    """SQLAlchemy implementation of Company Repository"""
    
    def __init__(self, db_session: Session, event_publisher: DomainEventPublisher = None):
        self._db = db_session
        self._event_publisher = event_publisher
    
    async def save(self, company: Company) -> None:
        """Save company to database"""
        try:
            # Find existing model
            model = self._db.query(CompanyModel).filter(
                CompanyModel.id == company.id.value
            ).first()
            
            if model:
                # Check optimistic locking
                if model.version != company.version:
                    raise ConcurrencyError(
                        f"Company version mismatch. Expected {company.version}, got {model.version}",
                        entity_id=company.id.value,
                        expected_version=company.version,
                        actual_version=model.version
                    )
                
                # Update existing model
                self._update_model_from_domain(model, company)
            else:
                # Create new model
                model = self._create_model_from_domain(company)
                self._db.add(model)
            
            # Commit transaction
            self._db.commit()
            
            # Publish domain events
            if self._event_publisher and company.has_domain_events():
                for event in company.get_domain_events():
                    await self._event_publisher.publish(event)
                company.clear_domain_events()
                
        except IntegrityError as e:
            self._db.rollback()
            if "company_number" in str(e):
                raise DomainValidationError("Company number already exists")
            elif "vat_number" in str(e):
                raise DomainValidationError("VAT number already exists")
            else:
                raise DomainValidationError(f"Database constraint violation: {str(e)}")
        except Exception as e:
            self._db.rollback()
            raise
    
    async def get_by_id(self, company_id: CompanyId) -> Optional[Company]:
        """Get company by its unique identifier"""
        model = self._db.query(CompanyModel).filter(
            CompanyModel.id == company_id.value
        ).first()
        
        if not model:
            return None
        
        return self._create_domain_from_model(model)
    
    async def get_by_company_number(self, company_number: CompanyNumber) -> Optional[Company]:
        """Get company by UK Companies House number"""
        model = self._db.query(CompanyModel).filter(
            CompanyModel.company_number == company_number.value
        ).first()
        
        if not model:
            return None
        
        return self._create_domain_from_model(model)
    
    async def get_by_name(self, name: str, exact_match: bool = False) -> List[Company]:
        """Search companies by name"""
        query = self._db.query(CompanyModel)
        
        if exact_match:
            query = query.filter(CompanyModel.name == name)
        else:
            # Case-insensitive fuzzy search
            query = query.filter(
                CompanyModel.name.ilike(f"%{name}%")
            )
        
        models = query.order_by(CompanyModel.name).limit(50).all()
        return [self._create_domain_from_model(model) for model in models]
    
    async def get_by_user_id(self, user_id: str) -> List[Company]:
        """Get all companies created by a specific user"""
        models = self._db.query(CompanyModel).filter(
            CompanyModel.created_by_user_id == user_id
        ).order_by(CompanyModel.created_at.desc()).all()
        
        return [self._create_domain_from_model(model) for model in models]
    
    async def get_by_industry(self, industry: IndustryType) -> List[Company]:
        """Get companies in a specific industry"""
        models = self._db.query(CompanyModel).filter(
            CompanyModel.industry == industry
        ).order_by(CompanyModel.name).all()
        
        return [self._create_domain_from_model(model) for model in models]
    
    async def get_by_size(self, company_size: CompanySize) -> List[Company]:
        """Get companies of a specific size"""
        models = self._db.query(CompanyModel).filter(
            CompanyModel.company_size == company_size
        ).order_by(CompanyModel.name).all()
        
        return [self._create_domain_from_model(model) for model in models]
    
    async def get_verified_companies(self) -> List[Company]:
        """Get all verified companies"""
        models = self._db.query(CompanyModel).filter(
            CompanyModel.is_verified == True
        ).order_by(CompanyModel.verified_at.desc()).all()
        
        return [self._create_domain_from_model(model) for model in models]
    
    async def get_companies_requiring_compliance_check(self) -> List[Company]:
        """Get companies that require compliance monitoring"""
        # Companies with compliance requirements and not recently checked
        models = self._db.query(CompanyModel).filter(
            CompanyModel.compliance_requirements.op('json_length')() > 0
        ).order_by(CompanyModel.last_activity_at.asc()).all()
        
        return [self._create_domain_from_model(model) for model in models]
    
    async def get_active_companies(self, 
                                  limit: Optional[int] = None,
                                  offset: Optional[int] = None) -> List[Company]:
        """Get active companies with pagination"""
        query = self._db.query(CompanyModel).filter(
            CompanyModel.status == CompanyStatus.ACTIVE
        ).order_by(CompanyModel.created_at.desc())
        
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)
        
        models = query.all()
        return [self._create_domain_from_model(model) for model in models]
    
    async def get_companies_by_subscription_tier(self, tier: str) -> List[Company]:
        """Get companies by subscription tier"""
        models = self._db.query(CompanyModel).filter(
            CompanyModel.subscription_tier == tier
        ).order_by(CompanyModel.created_at.desc()).all()
        
        return [self._create_domain_from_model(model) for model in models]
    
    async def get_company_statistics(self) -> Dict[str, Any]:
        """Get overall company statistics"""
        # Total companies
        total_companies = self._db.query(CompanyModel).count()
        
        # Active companies
        active_companies = self._db.query(CompanyModel).filter(
            CompanyModel.status == CompanyStatus.ACTIVE
        ).count()
        
        # Verified companies
        verified_companies = self._db.query(CompanyModel).filter(
            CompanyModel.is_verified == True
        ).count()
        
        # Companies by size
        size_stats = self._db.query(
            CompanyModel.company_size, 
            func.count(CompanyModel.id)
        ).group_by(CompanyModel.company_size).all()
        
        # Companies by industry
        industry_stats = self._db.query(
            CompanyModel.industry,
            func.count(CompanyModel.id)
        ).group_by(CompanyModel.industry).all()
        
        # Companies by subscription tier
        subscription_stats = self._db.query(
            CompanyModel.subscription_tier,
            func.count(CompanyModel.id)
        ).group_by(CompanyModel.subscription_tier).all()
        
        return {
            "total_companies": total_companies,
            "active_companies": active_companies,
            "verified_companies": verified_companies,
            "verification_rate": verified_companies / total_companies if total_companies > 0 else 0,
            "companies_by_size": {size.value: count for size, count in size_stats},
            "companies_by_industry": {industry.value: count for industry, count in industry_stats},
            "companies_by_subscription": {tier.value: count for tier, count in subscription_stats}
        }
    
    async def search_companies(self, 
                              query: str,
                              filters: Optional[Dict[str, Any]] = None,
                              limit: Optional[int] = None,
                              offset: Optional[int] = None) -> List[Company]:
        """Advanced company search with filters"""
        db_query = self._db.query(CompanyModel)
        
        # Text search across name, company number, and postcode
        if query:
            search_conditions = [
                CompanyModel.name.ilike(f"%{query}%"),
                CompanyModel.company_number.ilike(f"%{query}%"),
                CompanyModel.postcode.ilike(f"%{query}%")
            ]
            db_query = db_query.filter(or_(*search_conditions))
        
        # Apply filters
        if filters:
            if filters.get('industry'):
                db_query = db_query.filter(CompanyModel.industry == filters['industry'])
            
            if filters.get('company_size'):
                db_query = db_query.filter(CompanyModel.company_size == filters['company_size'])
            
            if filters.get('is_verified') is not None:
                db_query = db_query.filter(CompanyModel.is_verified == filters['is_verified'])
            
            if filters.get('subscription_tier'):
                db_query = db_query.filter(CompanyModel.subscription_tier == filters['subscription_tier'])
            
            if filters.get('postcode'):
                db_query = db_query.filter(
                    CompanyModel.postcode.ilike(f"{filters['postcode']}%")
                )
        
        # Order by relevance (name match first, then creation date)
        db_query = db_query.order_by(
            CompanyModel.name.ilike(f"%{query}%").desc() if query else CompanyModel.created_at.desc(),
            CompanyModel.created_at.desc()
        )
        
        # Apply pagination
        if offset:
            db_query = db_query.offset(offset)
        if limit:
            db_query = db_query.limit(limit)
        
        models = db_query.all()
        return [self._create_domain_from_model(model) for model in models]
    
    async def exists_by_company_number(self, company_number: CompanyNumber) -> bool:
        """Check if company exists by company number"""
        return self._db.query(CompanyModel).filter(
            CompanyModel.company_number == company_number.value
        ).first() is not None
    
    async def delete(self, company_id: CompanyId) -> None:
        """Delete company from persistence store (soft delete recommended)"""
        model = self._db.query(CompanyModel).filter(
            CompanyModel.id == company_id.value
        ).first()
        
        if not model:
            raise CompanyNotFoundError(f"Company not found: {company_id.value}")
        
        # Soft delete by marking as dissolved
        model.status = CompanyStatus.DISSOLVED
        model.updated_at = datetime.utcnow()
        
        try:
            self._db.commit()
        except Exception:
            self._db.rollback()
            raise
    
    async def get_companies_with_expired_subscriptions(self) -> List[Company]:
        """Get companies with expired subscriptions"""
        # This would require subscription expiry tracking in the model
        # For now, return empty list as subscription logic needs to be implemented
        return []
    
    async def get_companies_for_monthly_reset(self) -> List[Company]:
        """Get companies that need monthly contract count reset"""
        # Get companies where monthly_contract_count > 0
        models = self._db.query(CompanyModel).filter(
            CompanyModel.monthly_contract_count > 0
        ).all()
        
        return [self._create_domain_from_model(model) for model in models]
    
    # Private helper methods
    def _create_model_from_domain(self, company: Company) -> CompanyModel:
        """Create SQLAlchemy model from domain entity"""
        return CompanyModel(
            id=company.id.value,
            name=company.name,
            company_type=company.company_type,
            company_number=company.company_number.value if company.company_number else None,
            vat_number=company.vat_number.value if company.vat_number else None,
            industry=company.industry,
            company_size=company.company_size,
            status=company.status,
            primary_contact_email=company.primary_contact_email.value,
            phone_number=company.phone_number,
            website=company.website,
            address_line1=company.address.line1,
            address_line2=company.address.line2,
            city=company.address.city,
            county=company.address.county,
            postcode=company.address.postcode,
            country=company.address.country,
            subscription_tier=company.subscription_tier,
            max_users=company.max_team_members,
            max_contracts_per_month=company.max_contracts_per_month,
            monthly_contract_count=company.monthly_contract_count,
            is_verified=company.is_verified,
            verified_at=company.verified_at,
            verification_data=company._verification_data if hasattr(company, '_verification_data') else None,
            is_vat_registered=company.is_vat_registered,
            compliance_requirements=company.compliance_requirements,
            created_by_user_id=company.created_by_user_id,
            last_activity_at=company._last_activity_at if hasattr(company, '_last_activity_at') else None,
            features_enabled=company.features_enabled,
            version=company.version,
            created_at=company.created_at,
            updated_at=company.updated_at
        )
    
    def _update_model_from_domain(self, model: CompanyModel, company: Company) -> None:
        """Update SQLAlchemy model from domain entity"""
        model.name = company.name
        model.company_type = company.company_type
        model.company_number = company.company_number.value if company.company_number else None
        model.vat_number = company.vat_number.value if company.vat_number else None
        model.industry = company.industry
        model.company_size = company.company_size
        model.status = company.status
        model.primary_contact_email = company.primary_contact_email.value
        model.phone_number = company.phone_number
        model.website = company.website
        model.address_line1 = company.address.line1
        model.address_line2 = company.address.line2
        model.city = company.address.city
        model.county = company.address.county
        model.postcode = company.address.postcode
        model.country = company.address.country
        model.subscription_tier = company.subscription_tier
        model.max_users = company.max_team_members
        model.max_contracts_per_month = company.max_contracts_per_month
        model.monthly_contract_count = company.monthly_contract_count
        model.is_verified = company.is_verified
        model.verified_at = company.verified_at
        model.verification_data = company._verification_data if hasattr(company, '_verification_data') else None
        model.is_vat_registered = company.is_vat_registered
        model.compliance_requirements = company.compliance_requirements
        model.last_activity_at = company._last_activity_at if hasattr(company, '_last_activity_at') else None
        model.features_enabled = company.features_enabled
        model.version = company.version
        model.updated_at = company.updated_at
    
    def _create_domain_from_model(self, model: CompanyModel) -> Company:
        """Create domain entity from SQLAlchemy model"""
        # Create value objects
        company_id = CompanyId(model.id)
        primary_contact_email = Email(model.primary_contact_email)
        
        company_number = None
        if model.company_number:
            from app.domain.entities.company import CompanyNumber
            company_number = CompanyNumber(model.company_number)
        
        vat_number = None
        if model.vat_number:
            from app.domain.entities.company import VATNumber
            vat_number = VATNumber(model.vat_number)
        
        address = BusinessAddress(
            line1=model.address_line1,
            line2=model.address_line2,
            city=model.city,
            county=model.county,
            postcode=model.postcode,
            country=model.country
        )
        
        # Reconstruct domain entity from persistence
        company = Company.from_persistence(
            company_id=company_id,
            name=model.name,
            company_type=model.company_type,
            industry=model.industry,
            address=address,
            primary_contact_email=primary_contact_email,
            created_by_user_id=model.created_by_user_id,
            company_number=company_number,
            vat_number=vat_number,
            company_size=model.company_size,
            status=model.status,
            is_verified=model.is_verified,
            verified_at=model.verified_at,
            verification_data=model.verification_data,
            is_vat_registered=model.is_vat_registered,
            compliance_requirements=model.compliance_requirements or [],
            subscription_tier=model.subscription_tier,
            max_team_members=model.max_users,
            max_contracts_per_month=model.max_contracts_per_month,
            monthly_contract_count=model.monthly_contract_count,
            phone_number=model.phone_number,
            website=model.website,
            last_activity_at=model.last_activity_at,
            features_enabled=model.features_enabled or [],
            version=model.version,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
        
        return company