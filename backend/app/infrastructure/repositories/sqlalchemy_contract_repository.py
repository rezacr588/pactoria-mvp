"""
SQLAlchemy Contract Repository Implementation
Concrete implementation of ContractRepository using SQLAlchemy ORM
Follows DDD patterns with proper domain/infrastructure separation
"""

from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.domain.entities.contract import Contract, ContractId
from app.domain.repositories.contract_repository import (
    ContractRepository,
    ContractFilter,
    PageRequest,
    PageResult,
)
from app.domain.value_objects import (
    ContractStatus,
    ContractType,
    Email,
    ContractParty,
    Money,
    DateRange,
)
from app.domain.exceptions import ContractNotFoundError, ConcurrencyError
from app.infrastructure.database.models import Contract as ContractModel
from app.domain.event_publishing.domain_event_publisher import DomainEventPublisher


class SQLAlchemyContractRepository(ContractRepository):
    """SQLAlchemy implementation of Contract Repository"""

    def __init__(
        self, db_session: Session, event_publisher: DomainEventPublisher = None
    ):
        self._db = db_session
        self._event_publisher = event_publisher

    async def save(self, contract: Contract) -> Contract:
        """Save contract to database"""
        # Find existing model
        model = (
            self._db.query(ContractModel)
            .filter(ContractModel.id == contract.id.value)
            .first()
        )

        if model:
            # Check optimistic locking
            if model.version != contract.version:
                raise ConcurrencyError(
                    f"Contract version mismatch. Expected {contract.version}, got {model.version}",
                    entity_id=contract.id.value,
                    expected_version=contract.version,
                    actual_version=model.version,
                )

            # Update existing model
            self._update_model_from_domain(model, contract)
        else:
            # Create new model
            model = self._create_model_from_domain(contract)
            self._db.add(model)

        self._db.commit()
        self._db.refresh(model)

        # Publish domain events after successful save
        if self._event_publisher and contract.has_domain_events():
            await self._publish_domain_events(contract)

        return contract

    async def find_by_id(self, contract_id: ContractId) -> Optional[Contract]:
        """Find contract by ID"""
        model = (
            self._db.query(ContractModel)
            .filter(ContractModel.id == contract_id.value)
            .first()
        )

        if not model:
            return None

        return self._to_domain(model)

    async def get_by_id(self, contract_id: ContractId) -> Contract:
        """Get contract by ID, raise exception if not found"""
        contract = await self.find_by_id(contract_id)
        if not contract:
            raise ContractNotFoundError(
                f"Contract with ID {contract_id.value} not found"
            )
        return contract

    async def find_by_company(
        self, company_id: str, page_request: Optional[PageRequest] = None
    ) -> PageResult:
        """Find contracts by company with pagination"""
        if not page_request:
            page_request = PageRequest()

        query = self._db.query(ContractModel).filter(
            ContractModel.company_id == company_id,
            ContractModel.is_current_version,
        )

        total_items = query.count()

        models = (
            query.order_by(ContractModel.created_at.desc())
            .offset(page_request.offset)
            .limit(page_request.size)
            .all()
        )

        contracts = [self._to_domain(model) for model in models]

        return PageResult(
            items=contracts,
            total_items=total_items,
            page=page_request.page,
            size=page_request.size,
        )

    async def find_with_filter(
        self,
        contract_filter: ContractFilter,
        page_request: Optional[PageRequest] = None,
    ) -> PageResult:
        """Find contracts with filter criteria"""
        if not page_request:
            page_request = PageRequest()

        query = self._db.query(ContractModel)
        query = self._apply_filter(query, contract_filter)

        total_items = query.count()

        models = (
            query.order_by(ContractModel.created_at.desc())
            .offset(page_request.offset)
            .limit(page_request.size)
            .all()
        )

        contracts = [self._to_domain(model) for model in models]

        return PageResult(
            items=contracts,
            total_items=total_items,
            page=page_request.page,
            size=page_request.size,
        )

    async def count_by_company(self, company_id: str) -> int:
        """Count contracts for company"""
        return (
            self._db.query(ContractModel)
            .filter(
                ContractModel.company_id == company_id,
                ContractModel.is_current_version,
            )
            .count()
        )

    async def count_with_filter(self, contract_filter: ContractFilter) -> int:
        """Count contracts with filter"""
        query = self._db.query(ContractModel)
        query = self._apply_filter(query, contract_filter)
        return query.count()

    async def exists(self, contract_id: ContractId) -> bool:
        """Check if contract exists"""
        return (
            self._db.query(ContractModel)
            .filter(ContractModel.id == contract_id.value)
            .first()
            is not None
        )

    async def delete(self, contract_id: ContractId) -> None:
        """Delete contract from database"""
        model = (
            self._db.query(ContractModel)
            .filter(ContractModel.id == contract_id.value)
            .first()
        )

        if not model:
            raise ContractNotFoundError(
                f"Contract with ID {contract_id.value} not found"
            )

        self._db.delete(model)
        self._db.commit()

    async def find_expiring_contracts(self, days_ahead: int = 30) -> List[Contract]:
        """Find contracts expiring within specified days"""
        cutoff_date = datetime.utcnow() + timedelta(days=days_ahead)

        models = (
            self._db.query(ContractModel)
            .filter(
                and_(
                    ContractModel.end_date.isnot(None),
                    ContractModel.end_date <= cutoff_date,
                    ContractModel.status == ContractStatus.ACTIVE.value,
                    ContractModel.is_current_version,
                )
            )
            .all()
        )

        return [self._to_domain(model) for model in models]

    async def find_contracts_requiring_compliance_review(
        self, company_id: str
    ) -> List[Contract]:
        """Find contracts requiring compliance review"""
        # Contracts without compliance scores or with low scores
        models = (
            self._db.query(ContractModel)
            .filter(
                and_(
                    ContractModel.company_id == company_id,
                    ContractModel.status.in_(
                        [ContractStatus.DRAFT.value, ContractStatus.ACTIVE.value]
                    ),
                    ContractModel.is_current_version,
                    or_(
                        # No compliance analysis
                        ContractModel.compliance_scores is None,
                        # Or low compliance score (assuming we join with compliance table)
                        # This would need adjustment based on actual schema
                    ),
                )
            )
            .all()
        )

        return [self._to_domain(model) for model in models]

    def _apply_filter(self, query, contract_filter: ContractFilter):
        """Apply filter criteria to query"""
        if contract_filter.company_id:
            query = query.filter(ContractModel.company_id == contract_filter.company_id)

        if contract_filter.contract_type:
            query = query.filter(
                ContractModel.contract_type == contract_filter.contract_type.value
            )

        if contract_filter.status:
            query = query.filter(ContractModel.status == contract_filter.status.value)

        if contract_filter.created_by_user_id:
            query = query.filter(
                ContractModel.created_by == contract_filter.created_by_user_id
            )

        if contract_filter.client_name:
            query = query.filter(
                ContractModel.client_name.ilike(f"%{contract_filter.client_name}%")
            )

        if contract_filter.supplier_name:
            query = query.filter(
                ContractModel.supplier_name.ilike(f"%{contract_filter.supplier_name}%")
            )

        if contract_filter.title_contains:
            query = query.filter(
                ContractModel.title.ilike(f"%{contract_filter.title_contains}%")
            )

        if contract_filter.created_after:
            query = query.filter(
                ContractModel.created_at >= contract_filter.created_after
            )

        if contract_filter.created_before:
            query = query.filter(
                ContractModel.created_at <= contract_filter.created_before
            )

        if contract_filter.min_value:
            query = query.filter(
                ContractModel.contract_value >= contract_filter.min_value
            )

        if contract_filter.max_value:
            query = query.filter(
                ContractModel.contract_value <= contract_filter.max_value
            )

        # Always filter to current versions only
        query = query.filter(ContractModel.is_current_version)

        return query

    def _create_model_from_domain(self, contract: Contract) -> ContractModel:
        """Create database model from domain entity"""
        return ContractModel(
            id=contract.id.value,
            title=contract.title,
            contract_type=contract.contract_type.value,
            status=contract.status.value,
            plain_english_input=contract.plain_english_input,
            client_name=contract.client.name,
            client_email=contract.client.email.value if contract.client.email else None,
            supplier_name=contract.supplier.name if contract.supplier else None,
            supplier_email=(
                contract.supplier.email.value
                if contract.supplier and contract.supplier.email
                else None
            ),
            contract_value=(
                contract.contract_value.amount if contract.contract_value else None
            ),
            currency=(
                contract.contract_value.currency if contract.contract_value else None
            ),
            start_date=contract.date_range.start_date if contract.date_range else None,
            end_date=contract.date_range.end_date if contract.date_range else None,
            generated_content=contract.generated_content,
            final_content=contract.final_content,
            company_id=contract.company_id,
            created_by=contract.created_by_user_id,
            version=contract.version,
            is_current_version=True,
            created_at=contract.created_at,
            updated_at=contract.updated_at,
        )

    def _update_model_from_domain(self, model: ContractModel, contract: Contract):
        """Update database model from domain entity"""
        model.title = contract.title
        model.status = contract.status.value
        model.plain_english_input = contract.plain_english_input
        model.client_name = contract.client.name
        model.client_email = (
            contract.client.email.value if contract.client.email else None
        )
        model.supplier_name = contract.supplier.name if contract.supplier else None
        model.supplier_email = (
            contract.supplier.email.value
            if contract.supplier and contract.supplier.email
            else None
        )
        model.contract_value = (
            contract.contract_value.amount if contract.contract_value else None
        )
        model.currency = (
            contract.contract_value.currency if contract.contract_value else None
        )
        model.start_date = (
            contract.date_range.start_date if contract.date_range else None
        )
        model.end_date = contract.date_range.end_date if contract.date_range else None
        model.generated_content = contract.generated_content
        model.final_content = contract.final_content
        model.version = contract.version
        model.updated_at = contract.updated_at

    def _to_domain(self, model: ContractModel) -> Contract:
        """Convert database model to domain entity using proper factory method"""
        # Create contract ID
        contract_id = ContractId(model.id)

        # Create client party
        client = ContractParty(
            name=model.client_name,
            email=Email(model.client_email) if model.client_email else None,
        )

        # Create supplier party if exists
        supplier = None
        if model.supplier_name:
            supplier = ContractParty(
                name=model.supplier_name,
                email=Email(model.supplier_email) if model.supplier_email else None,
            )

        # Create contract value if available
        contract_value = None
        if model.contract_value and model.currency:
            contract_value = Money(model.contract_value, model.currency)

        # Create date range if available
        date_range = None
        if model.start_date and model.end_date:
            date_range = DateRange(model.start_date, model.end_date)

        # Use the proper factory method for reconstruction
        return Contract.from_persistence(
            contract_id=contract_id,
            title=model.title,
            contract_type=ContractType(model.contract_type),
            status=ContractStatus(model.status),
            plain_english_input=model.plain_english_input,
            client=client,
            supplier=supplier,
            created_by_user_id=model.created_by,
            company_id=model.company_id,
            version=model.version,
            created_at=model.created_at,
            updated_at=model.updated_at,
            contract_value=contract_value,
            date_range=date_range,
            generated_content=model.generated_content,
            final_content=model.final_content,
            # Additional fields can be added as the model evolves
            ai_metadata=getattr(model, "ai_metadata", None),
            compliance_score=None,  # Would need to be loaded from related table/json field
            risk_assessment=None,  # Would need to be loaded from related table/json field
            activated_at=getattr(model, "activated_at", None),
            activated_by_user_id=getattr(model, "activated_by_user_id", None),
            completed_at=getattr(model, "completed_at", None),
            completed_by_user_id=getattr(model, "completed_by_user_id", None),
            terminated_at=getattr(model, "terminated_at", None),
            terminated_by_user_id=getattr(model, "terminated_by_user_id", None),
            termination_reason=getattr(model, "termination_reason", None),
        )

    async def _publish_domain_events(self, contract: Contract) -> None:
        """Publish domain events from the contract"""
        if self._event_publisher and contract.has_domain_events():
            for event in contract.get_domain_events():
                await self._event_publisher.publish(event)
            contract.clear_domain_events()
