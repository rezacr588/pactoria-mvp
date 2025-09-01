"""
Advanced Search Service - Domain service for complex search operations
Implements business logic for advanced search with filters, sorting, and pagination
"""
import time
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple, Union
from dataclasses import dataclass
from sqlalchemy.orm import Session, Query
from sqlalchemy import and_, or_, func, text, desc, asc

from app.domain.exceptions import (
    DomainValidationError, BusinessRuleViolationError, CompanyAccessError
)
from app.infrastructure.database.models import (
    User, Contract, Template, ContractStatus, ContractType, UserRole
)
from app.schemas.search import (
    ContractSearchRequest, UserSearchRequest, TemplateSearchRequest,
    ContractSearchResults, UserSearchResults, TemplateSearchResults,
    ContractSearchResult, UserSearchResult, TemplateSearchResult,
    SearchOperator, SortDirection, DateRangeFilter, NumericRangeFilter,
    SearchHighlight
)
from app.core.validation import ResourceValidator


@dataclass
class SearchContext:
    """Context for search operations"""
    user: User
    query: str
    page: int
    size: int
    include_total: bool
    highlight: bool


class AdvancedSearchService:
    """
    Domain service for advanced search operations
    Handles complex queries, filtering, sorting, and result formatting
    """
    
    # Configuration constants
    MAX_SEARCH_RESULTS = 10000
    MIN_QUERY_LENGTH = 2
    DEFAULT_PAGE_SIZE = 20
    
    def __init__(self, db: Session):
        self.db = db
    
    async def search_contracts(
        self,
        request: ContractSearchRequest,
        current_user: User
    ) -> ContractSearchResults:
        """
        Advanced contract search with filters and sorting
        """
        start_time = time.time()
        
        # Validate user and request
        self._validate_search_request(request)
        ResourceValidator.validate_user_has_company(current_user)
        
        # Build search context
        context = SearchContext(
            user=current_user,
            query=request.query,
            page=request.page,
            size=request.size,
            include_total=request.include_total,
            highlight=request.highlight
        )
        
        try:
            # Build base query
            query = self._build_contract_base_query(current_user)
            
            # Apply text search
            if request.query:
                query = self._apply_contract_text_search(
                    query, request.query, request.operator, request.fields
                )
            
            # Apply filters
            query = self._apply_contract_filters(query, request.filters)
            
            # Get total count before pagination
            total = query.count() if request.include_total else None
            
            # Apply sorting
            if request.sort:
                query = self._apply_sorting(query, request.sort, Contract)
            else:
                query = query.order_by(desc(Contract.updated_at))
            
            # Apply pagination
            offset = (request.page - 1) * request.size
            contracts = query.offset(offset).limit(request.size).all()
            
            # Convert to search results
            items = [
                self._contract_to_search_result(contract, context)
                for contract in contracts
            ]
            
            # Calculate pages
            pages = None
            if total is not None:
                pages = (total + request.size - 1) // request.size
            
            took_ms = (time.time() - start_time) * 1000
            
            return ContractSearchResults(
                items=items,
                total=total,
                page=request.page,
                size=request.size,
                pages=pages,
                took_ms=took_ms,
                query=request.query,
                filters_applied=self._get_applied_filters_summary(request.filters)
            )
            
        except Exception as e:
            raise BusinessRuleViolationError(f"Contract search failed: {str(e)}")
    
    async def search_users(
        self,
        request: UserSearchRequest,
        current_user: User
    ) -> UserSearchResults:
        """
        Advanced user search with filters and sorting
        """
        start_time = time.time()
        
        # Validate user and request
        self._validate_search_request(request)
        ResourceValidator.validate_user_has_company(current_user)
        
        # Build search context
        context = SearchContext(
            user=current_user,
            query=request.query,
            page=request.page,
            size=request.size,
            include_total=request.include_total,
            highlight=False  # Users don't need highlighting for security
        )
        
        try:
            # Build base query (only users in same company)
            query = self.db.query(User).filter(
                User.company_id == current_user.company_id
            )
            
            # Apply text search
            if request.query:
                query = self._apply_user_text_search(
                    query, request.query, request.operator, request.fields
                )
            
            # Apply filters
            query = self._apply_user_filters(query, request.filters)
            
            # Get total count before pagination
            total = query.count() if request.include_total else None
            
            # Apply sorting
            if request.sort:
                query = self._apply_sorting(query, request.sort, User)
            else:
                query = query.order_by(User.full_name)
            
            # Apply pagination
            offset = (request.page - 1) * request.size
            users = query.offset(offset).limit(request.size).all()
            
            # Convert to search results
            items = [
                self._user_to_search_result(user, context)
                for user in users
            ]
            
            # Calculate pages
            pages = None
            if total is not None:
                pages = (total + request.size - 1) // request.size
            
            took_ms = (time.time() - start_time) * 1000
            
            return UserSearchResults(
                items=items,
                total=total,
                page=request.page,
                size=request.size,
                pages=pages,
                took_ms=took_ms,
                query=request.query,
                filters_applied=self._get_applied_filters_summary(request.filters)
            )
            
        except Exception as e:
            raise BusinessRuleViolationError(f"User search failed: {str(e)}")
    
    async def search_templates(
        self,
        request: TemplateSearchRequest,
        current_user: User
    ) -> TemplateSearchResults:
        """
        Advanced template search with filters and sorting
        """
        start_time = time.time()
        
        # Validate user and request
        self._validate_search_request(request)
        
        # Build search context
        context = SearchContext(
            user=current_user,
            query=request.query,
            page=request.page,
            size=request.size,
            include_total=request.include_total,
            highlight=request.highlight if hasattr(request, 'highlight') else False
        )
        
        try:
            # Build base query (all active templates)
            query = self.db.query(Template).filter(Template.is_active == True)
            
            # Apply text search
            if request.query:
                query = self._apply_template_text_search(
                    query, request.query, request.operator, request.fields
                )
            
            # Apply filters
            query = self._apply_template_filters(query, request.filters)
            
            # Get total count before pagination
            total = query.count() if request.include_total else None
            
            # Apply sorting
            if request.sort:
                query = self._apply_sorting(query, request.sort, Template)
            else:
                query = query.order_by(Template.name)
            
            # Apply pagination
            offset = (request.page - 1) * request.size
            templates = query.offset(offset).limit(request.size).all()
            
            # Convert to search results
            items = [
                self._template_to_search_result(template, context)
                for template in templates
            ]
            
            # Calculate pages
            pages = None
            if total is not None:
                pages = (total + request.size - 1) // request.size
            
            took_ms = (time.time() - start_time) * 1000
            
            return TemplateSearchResults(
                items=items,
                total=total,
                page=request.page,
                size=request.size,
                pages=pages,
                took_ms=took_ms,
                query=request.query,
                filters_applied=self._get_applied_filters_summary(request.filters)
            )
            
        except Exception as e:
            raise BusinessRuleViolationError(f"Template search failed: {str(e)}")
    
    # Private helper methods
    
    def _validate_search_request(self, request):
        """Validate search request parameters"""
        if request.query and len(request.query.strip()) < self.MIN_QUERY_LENGTH:
            raise DomainValidationError(
                f"Search query must be at least {self.MIN_QUERY_LENGTH} characters long"
            )
        
        if request.page < 1:
            raise DomainValidationError("Page number must be >= 1")
        
        if request.size > 1000:
            raise DomainValidationError("Page size cannot exceed 1000")
        
        # Validate total results limit
        max_offset = (request.page - 1) * request.size
        if max_offset > self.MAX_SEARCH_RESULTS:
            raise DomainValidationError(
                f"Cannot retrieve results beyond offset {self.MAX_SEARCH_RESULTS}"
            )
    
    def _build_contract_base_query(self, user: User) -> Query:
        """Build base contract query with company isolation"""
        return self.db.query(Contract).filter(
            and_(
                Contract.company_id == user.company_id,
                Contract.is_current_version == True
            )
        )
    
    def _apply_contract_text_search(
        self,
        query: Query,
        search_text: str,
        operator: SearchOperator,
        fields: Optional[List[str]]
    ) -> Query:
        """Apply text search to contract query"""
        
        # Default searchable fields
        if not fields:
            fields = ['title', 'client_name', 'supplier_name', 'plain_english_input']
        
        # Build search conditions
        search_conditions = []
        
        for field in fields:
            if hasattr(Contract, field):
                column = getattr(Contract, field)
                if operator == SearchOperator.AND:
                    # For AND, all terms must be present
                    terms = search_text.split()
                    field_conditions = []
                    for term in terms:
                        field_conditions.append(column.ilike(f"%{term}%"))
                    if field_conditions:
                        search_conditions.append(and_(*field_conditions))
                else:
                    # For OR, any match is sufficient
                    search_conditions.append(column.ilike(f"%{search_text}%"))
        
        if search_conditions:
            if operator == SearchOperator.AND:
                query = query.filter(or_(*search_conditions))
            else:
                query = query.filter(or_(*search_conditions))
        
        return query
    
    def _apply_contract_filters(self, query: Query, filters) -> Query:
        """Apply advanced filters to contract query"""
        
        if filters.status:
            status_enums = [ContractStatus(status.lower()) for status in filters.status]
            query = query.filter(Contract.status.in_(status_enums))
        
        if filters.contract_type:
            type_enums = [ContractType(ctype.lower()) for ctype in filters.contract_type]
            query = query.filter(Contract.contract_type.in_(type_enums))
        
        if filters.client_name:
            query = query.filter(Contract.client_name.ilike(f"%{filters.client_name}%"))
        
        if filters.supplier_name:
            query = query.filter(Contract.supplier_name.ilike(f"%{filters.supplier_name}%"))
        
        if filters.contract_value:
            query = self._apply_numeric_filter(query, Contract.contract_value, filters.contract_value)
        
        if filters.start_date:
            query = self._apply_date_filter(query, Contract.start_date, filters.start_date)
        
        if filters.end_date:
            query = self._apply_date_filter(query, Contract.end_date, filters.end_date)
        
        if filters.created_at:
            query = self._apply_date_filter(query, Contract.created_at, filters.created_at)
        
        if filters.updated_at:
            query = self._apply_date_filter(query, Contract.updated_at, filters.updated_at)
        
        if filters.template_id:
            query = query.filter(Contract.template_id.in_(filters.template_id))
        
        if filters.created_by:
            query = query.filter(Contract.created_by.in_(filters.created_by))
        
        return query
    
    def _apply_user_text_search(
        self,
        query: Query,
        search_text: str,
        operator: SearchOperator,
        fields: Optional[List[str]]
    ) -> Query:
        """Apply text search to user query"""
        
        # Default searchable fields
        if not fields:
            fields = ['email', 'full_name', 'department']
        
        # Build search conditions
        search_conditions = []
        
        for field in fields:
            if hasattr(User, field):
                column = getattr(User, field)
                if operator == SearchOperator.AND:
                    # For AND, all terms must be present
                    terms = search_text.split()
                    field_conditions = []
                    for term in terms:
                        field_conditions.append(column.ilike(f"%{term}%"))
                    if field_conditions:
                        search_conditions.append(and_(*field_conditions))
                else:
                    # For OR, any match is sufficient
                    search_conditions.append(column.ilike(f"%{search_text}%"))
        
        if search_conditions:
            query = query.filter(or_(*search_conditions))
        
        return query
    
    def _apply_user_filters(self, query: Query, filters) -> Query:
        """Apply advanced filters to user query"""
        
        if filters.role:
            role_enums = [UserRole(role.lower()) for role in filters.role if role.lower() in [r.value for r in UserRole]]
            query = query.filter(User.role.in_(role_enums))
        
        if filters.is_active is not None:
            query = query.filter(User.is_active == filters.is_active)
        
        if filters.department:
            query = query.filter(User.department.in_(filters.department))
        
        if filters.created_at:
            query = self._apply_date_filter(query, User.created_at, filters.created_at)
        
        if filters.last_login_at:
            query = self._apply_date_filter(query, User.last_login_at, filters.last_login_at)
        
        return query
    
    def _apply_template_text_search(
        self,
        query: Query,
        search_text: str,
        operator: SearchOperator,
        fields: Optional[List[str]]
    ) -> Query:
        """Apply text search to template query"""
        
        # Default searchable fields
        if not fields:
            fields = ['name', 'description', 'category']
        
        # Build search conditions
        search_conditions = []
        
        for field in fields:
            if hasattr(Template, field):
                column = getattr(Template, field)
                if operator == SearchOperator.AND:
                    # For AND, all terms must be present
                    terms = search_text.split()
                    field_conditions = []
                    for term in terms:
                        field_conditions.append(column.ilike(f"%{term}%"))
                    if field_conditions:
                        search_conditions.append(and_(*field_conditions))
                else:
                    # For OR, any match is sufficient
                    search_conditions.append(column.ilike(f"%{search_text}%"))
        
        if search_conditions:
            query = query.filter(or_(*search_conditions))
        
        return query
    
    def _apply_template_filters(self, query: Query, filters) -> Query:
        """Apply advanced filters to template query"""
        
        if filters.contract_type:
            type_enums = [ContractType(ctype.lower()) for ctype in filters.contract_type]
            query = query.filter(Template.contract_type.in_(type_enums))
        
        if filters.category:
            query = query.filter(Template.category.in_(filters.category))
        
        if filters.is_active is not None:
            query = query.filter(Template.is_active == filters.is_active)
        
        if filters.version:
            query = query.filter(Template.version == filters.version)
        
        return query
    
    def _apply_date_filter(self, query: Query, column, date_filter: DateRangeFilter) -> Query:
        """Apply date range filter to query"""
        if date_filter.gte:
            query = query.filter(column >= date_filter.gte)
        if date_filter.lte:
            query = query.filter(column <= date_filter.lte)
        if date_filter.eq:
            query = query.filter(func.date(column) == func.date(date_filter.eq))
        return query
    
    def _apply_numeric_filter(self, query: Query, column, numeric_filter: NumericRangeFilter) -> Query:
        """Apply numeric range filter to query"""
        if numeric_filter.gte is not None:
            query = query.filter(column >= numeric_filter.gte)
        if numeric_filter.lte is not None:
            query = query.filter(column <= numeric_filter.lte)
        if numeric_filter.eq is not None:
            query = query.filter(column == numeric_filter.eq)
        return query
    
    def _apply_sorting(self, query: Query, sort_criteria: List, model_class) -> Query:
        """Apply sorting to query"""
        for sort in sort_criteria:
            if hasattr(model_class, sort.field):
                column = getattr(model_class, sort.field)
                if sort.direction == SortDirection.DESC:
                    query = query.order_by(desc(column))
                else:
                    query = query.order_by(asc(column))
        return query
    
    def _contract_to_search_result(self, contract: Contract, context: SearchContext) -> ContractSearchResult:
        """Convert contract to search result"""
        result = ContractSearchResult(
            id=contract.id,
            title=contract.title,
            contract_type=contract.contract_type.value,
            status=contract.status.value,
            client_name=contract.client_name,
            supplier_name=contract.supplier_name,
            contract_value=contract.contract_value,
            currency=contract.currency,
            start_date=contract.start_date,
            end_date=contract.end_date,
            created_at=contract.created_at,
            updated_at=contract.updated_at,
            version=contract.version
        )
        
        # Add highlighting if requested
        if context.highlight and context.query:
            result.highlights = self._generate_highlights(contract, context.query, 'contract')
        
        return result
    
    def _user_to_search_result(self, user: User, context: SearchContext) -> UserSearchResult:
        """Convert user to search result"""
        return UserSearchResult(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value if user.role else "VIEWER",
            department=user.department,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login_at=user.last_login_at
        )
    
    def _template_to_search_result(self, template: Template, context: SearchContext) -> TemplateSearchResult:
        """Convert template to search result"""
        result = TemplateSearchResult(
            id=template.id,
            name=template.name,
            category=template.category,
            contract_type=template.contract_type.value,
            description=template.description,
            version=template.version,
            is_active=template.is_active,
            suitable_for=template.suitable_for or [],
            created_at=template.created_at,
            updated_at=template.updated_at
        )
        
        # Add highlighting if requested
        if context.highlight and context.query:
            result.highlights = self._generate_highlights(template, context.query, 'template')
        
        return result
    
    def _generate_highlights(self, obj, query: str, obj_type: str) -> List[SearchHighlight]:
        """Generate search term highlights"""
        highlights = []
        
        # For now, return empty highlights - would implement full highlighting logic here
        # This would involve finding matching terms and creating highlighted fragments
        
        return highlights
    
    def _get_applied_filters_summary(self, filters) -> Dict[str, Any]:
        """Get summary of applied filters"""
        summary = {}
        
        if hasattr(filters, 'status') and filters.status:
            summary['status'] = filters.status
        
        if hasattr(filters, 'contract_type') and filters.contract_type:
            summary['contract_type'] = filters.contract_type
        
        if hasattr(filters, 'role') and filters.role:
            summary['role'] = filters.role
        
        return summary


# Factory function for dependency injection
def get_search_service(db: Session) -> AdvancedSearchService:
    """Factory function to create search service"""
    return AdvancedSearchService(db)