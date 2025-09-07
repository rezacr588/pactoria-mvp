"""
Bulk Operations Service for Pactoria MVP
Handles bulk contract operations, imports, and exports
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.core.database import get_db
from app.core.datetime_utils import get_current_utc
from app.infrastructure.database.models import Contract, User, Company
from app.schemas.bulk import (
    BulkOperationType,
    BulkOperationStatus,
    BulkContractOperation,
    BulkOperationResponse,
    BulkOperationItem,
    BulkExportRequest,
    BulkExportResponse,
    BulkImportRequest,
    BulkImportResponse
)
from app.services.audit_service import log_audit_event
import logging

logger = logging.getLogger(__name__)


class BulkOperationsService:
    """Service for handling bulk operations on contracts"""
    
    def __init__(self, db: Session):
        self.db = db
        self._operation_store: Dict[str, Dict] = {}  # In-memory store for demo
    
    async def execute_bulk_contract_operation(
        self,
        operation: BulkContractOperation,
        user: User
    ) -> BulkOperationResponse:
        """Execute bulk operation on contracts"""
        operation_id = str(uuid4())
        started_at = get_current_utc()
        
        logger.info(f"Starting bulk operation {operation_id} for user {user.id}")
        
        # Store operation metadata
        self._operation_store[operation_id] = {
            "status": BulkOperationStatus.PROCESSING,
            "started_at": started_at,
            "user_id": user.id,
            "operation": operation
        }
        
        try:
            results = []
            successful_items = 0
            failed_items = 0
            
            # Get contracts with permission check
            contracts = self.db.query(Contract).filter(
                and_(
                    Contract.id.in_(operation.contract_ids),
                    Contract.company_id == user.company_id
                )
            ).all()
            
            found_ids = {contract.id for contract in contracts}
            
            # Process each contract
            for contract_id in operation.contract_ids:
                if contract_id not in found_ids:
                    results.append(BulkOperationItem(
                        item_id=contract_id,
                        success=False,
                        error_message="Contract not found or access denied"
                    ))
                    failed_items += 1
                    continue
                
                try:
                    contract = next(c for c in contracts if c.id == contract_id)
                    success = await self._process_single_contract_operation(
                        contract, operation, user
                    )
                    
                    if success:
                        results.append(BulkOperationItem(
                            item_id=contract_id,
                            success=True,
                            result={"operation": operation.operation_type.value}
                        ))
                        successful_items += 1
                    else:
                        results.append(BulkOperationItem(
                            item_id=contract_id,
                            success=False,
                            error_message="Operation failed"
                        ))
                        failed_items += 1
                        
                except Exception as e:
                    logger.error(f"Error processing contract {contract_id}: {e}")
                    results.append(BulkOperationItem(
                        item_id=contract_id,
                        success=False,
                        error_message=str(e)
                    ))
                    failed_items += 1
            
            # Commit all changes
            self.db.commit()
            
            completed_at = get_current_utc()
            processing_time = (completed_at - started_at).total_seconds()
            
            # Determine final status
            if failed_items == 0:
                status = BulkOperationStatus.COMPLETED
            elif successful_items == 0:
                status = BulkOperationStatus.FAILED
            else:
                status = BulkOperationStatus.PARTIAL_SUCCESS
            
            # Update operation store
            self._operation_store[operation_id].update({
                "status": status,
                "completed_at": completed_at,
                "results": results
            })
            
            # Log audit event
            await log_audit_event(
                db=self.db,
                user_id=user.id,
                company_id=user.company_id,
                action=f"bulk_{operation.operation_type.value}",
                resource_type="contract",
                resource_id=operation_id,
                details={
                    "total_items": len(operation.contract_ids),
                    "successful_items": successful_items,
                    "failed_items": failed_items
                }
            )
            
            return BulkOperationResponse(
                success=status in [BulkOperationStatus.COMPLETED, BulkOperationStatus.PARTIAL_SUCCESS],
                message=f"Bulk {operation.operation_type.value} operation completed",
                operation_id=operation_id,
                operation_type=operation.operation_type,
                status=status,
                total_items=len(operation.contract_ids),
                successful_items=successful_items,
                failed_items=failed_items,
                items=results,
                started_at=started_at.isoformat(),
                completed_at=completed_at.isoformat(),
                processing_time_seconds=processing_time
            )
            
        except Exception as e:
            logger.error(f"Bulk operation {operation_id} failed: {e}")
            self.db.rollback()
            
            # Update operation store
            self._operation_store[operation_id].update({
                "status": BulkOperationStatus.FAILED,
                "completed_at": get_current_utc(),
                "error": str(e)
            })
            
            return BulkOperationResponse(
                success=False,
                message=f"Bulk operation failed: {str(e)}",
                operation_id=operation_id,
                operation_type=operation.operation_type,
                status=BulkOperationStatus.FAILED,
                total_items=len(operation.contract_ids),
                successful_items=0,
                failed_items=len(operation.contract_ids),
                items=[
                    BulkOperationItem(
                        item_id=contract_id,
                        success=False,
                        error_message=str(e)
                    )
                    for contract_id in operation.contract_ids
                ],
                started_at=started_at.isoformat()
            )
    
    async def _process_single_contract_operation(
        self,
        contract: Contract,
        operation: BulkContractOperation,
        user: User
    ) -> bool:
        """Process single contract operation"""
        try:
            if operation.operation_type == BulkOperationType.DELETE:
                self.db.delete(contract)
                return True
                
            elif operation.operation_type == BulkOperationType.ARCHIVE:
                contract.is_archived = True
                contract.archived_at = get_current_utc()
                contract.archived_by = user.id
                return True
                
            elif operation.operation_type == BulkOperationType.RESTORE:
                contract.is_archived = False
                contract.archived_at = None
                contract.archived_by = None
                return True
                
            elif operation.operation_type == BulkOperationType.UPDATE:
                if operation.update_data:
                    for field, value in operation.update_data.items():
                        if hasattr(contract, field):
                            setattr(contract, field, value)
                    contract.updated_at = get_current_utc()
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Error processing single contract operation: {e}")
            return False
    
    async def get_operation_status(self, operation_id: str) -> Optional[Dict]:
        """Get status of bulk operation"""
        return self._operation_store.get(operation_id)
    
    async def export_contracts(
        self,
        export_request: BulkExportRequest,
        user: User
    ) -> BulkExportResponse:
        """Export contracts to specified format"""
        export_id = str(uuid4())
        
        try:
            # Query contracts with filters
            query = self.db.query(Contract).filter(
                Contract.company_id == user.company_id
            )
            
            if export_request.filters:
                # Apply filters (simplified implementation)
                for field, value in export_request.filters.items():
                    if hasattr(Contract, field):
                        query = query.filter(getattr(Contract, field) == value)
            
            contracts = query.all()
            
            # Generate download URL (in real implementation, create actual file)
            download_url = f"/api/v1/bulk/downloads/{export_id}.{export_request.export_format}"
            
            # Set expiration time
            expires_at = get_current_utc() + timedelta(hours=24)
            
            logger.info(f"Created export {export_id} with {len(contracts)} contracts")
            
            return BulkExportResponse(
                success=True,
                message="Export created successfully",
                export_id=export_id,
                download_url=download_url,
                expires_at=expires_at.isoformat(),
                record_count=len(contracts)
            )
            
        except Exception as e:
            logger.error(f"Export failed: {e}")
            return BulkExportResponse(
                success=False,
                message=f"Export failed: {str(e)}",
                export_id=export_id,
                download_url="",
                expires_at="",
                record_count=0
            )
    
    async def import_contracts(
        self,
        import_request: BulkImportRequest,
        file_data: bytes,
        user: User
    ) -> BulkImportResponse:
        """Import contracts from file"""
        import_id = str(uuid4())
        
        try:
            # Parse file data based on format
            records = await self._parse_import_file(file_data, import_request.file_format)
            
            # Validate records
            validation_errors = []
            if not import_request.skip_validation:
                validation_errors = await self._validate_import_records(records, import_request.mapping)
            
            # Import valid records
            imported_count = 0
            failed_count = 0
            
            for record in records:
                try:
                    # Map fields and create contract
                    contract_data = self._map_import_record(record, import_request.mapping)
                    contract_data["company_id"] = user.company_id
                    contract_data["created_by"] = user.id
                    
                    contract = Contract(**contract_data)
                    self.db.add(contract)
                    imported_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to import record: {e}")
                    failed_count += 1
                    validation_errors.append({
                        "record": record,
                        "error": str(e)
                    })
            
            self.db.commit()
            
            status = BulkOperationStatus.COMPLETED if failed_count == 0 else BulkOperationStatus.PARTIAL_SUCCESS
            
            return BulkImportResponse(
                success=True,
                message="Import completed",
                import_id=import_id,
                status=status,
                total_records=len(records),
                imported_records=imported_count,
                failed_records=failed_count,
                validation_errors=validation_errors
            )
            
        except Exception as e:
            logger.error(f"Import failed: {e}")
            return BulkImportResponse(
                success=False,
                message=f"Import failed: {str(e)}",
                import_id=import_id,
                status=BulkOperationStatus.FAILED,
                total_records=0,
                imported_records=0,
                failed_records=0,
                validation_errors=[{"error": str(e)}]
            )
    
    async def _parse_import_file(self, file_data: bytes, file_format: str) -> List[Dict]:
        """Parse import file based on format"""
        # Simplified implementation - in production, use proper parsers
        if file_format == "json":
            import json
            return json.loads(file_data.decode())
        elif file_format == "csv":
            import csv
            import io
            reader = csv.DictReader(io.StringIO(file_data.decode()))
            return list(reader)
        else:
            raise ValueError(f"Unsupported file format: {file_format}")
    
    async def _validate_import_records(self, records: List[Dict], mapping: Dict[str, str]) -> List[Dict]:
        """Validate import records"""
        errors = []
        required_fields = ["title", "contract_type"]
        
        for i, record in enumerate(records):
            record_errors = []
            
            # Check required fields
            for field in required_fields:
                mapped_field = mapping.get(field)
                if not mapped_field or not record.get(mapped_field):
                    record_errors.append(f"Missing required field: {field}")
            
            if record_errors:
                errors.append({
                    "record_index": i,
                    "record": record,
                    "errors": record_errors
                })
        
        return errors
    
    def _map_import_record(self, record: Dict, mapping: Dict[str, str]) -> Dict:
        """Map import record fields to contract fields"""
        mapped_record = {}
        
        for contract_field, import_field in mapping.items():
            if import_field in record:
                mapped_record[contract_field] = record[import_field]
        
        return mapped_record


async def get_bulk_operations_service(db: Session = Depends(get_db)) -> BulkOperationsService:
    """Dependency to get bulk operations service"""
    return BulkOperationsService(db)