"""
Export Service - Handles contract and data export operations
Implements various export formats with proper data formatting and security
"""
import csv
import json
import uuid
import time
import io
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, TextIO
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import BackgroundTasks

from app.domain.exceptions import DomainValidationError, BusinessRuleViolationError
from app.infrastructure.database.models import User, Contract, ContractStatus, ContractType
from app.schemas.bulk import (
    BulkContractExportRequest, BulkExportResponse, BulkOperationFormat
)
from app.core.config import settings
from app.core.datetime_utils import get_current_utc


@dataclass
class ExportResult:
    """Result of an export operation"""
    export_id: str
    format: BulkOperationFormat
    total_records: int
    file_size_bytes: int
    file_path: str
    processing_time_ms: float


class ExportService:
    """
    Domain service for exporting contract data in various formats
    Handles CSV, Excel, PDF, and JSON exports with proper formatting
    """
    
    # Configuration constants
    MAX_EXPORT_RECORDS = 10000
    EXPORT_EXPIRY_HOURS = 24
    EXPORT_BASE_PATH = "exports"
    
    def __init__(self, db: Session):
        self.db = db
        self.export_base_path = Path(settings.UPLOAD_DIR) / self.EXPORT_BASE_PATH
        self.export_base_path.mkdir(parents=True, exist_ok=True)
    
    async def export_contracts(
        self,
        request: BulkContractExportRequest,
        current_user: User,
        background_tasks: BackgroundTasks
    ) -> BulkExportResponse:
        """
        Export contracts in the requested format
        For large exports, process in background
        """
        start_time = time.time()
        
        # Validate request
        self._validate_export_request(request)
        
        # Generate export ID
        export_id = str(uuid.uuid4())
        
        # Get contracts to export
        contracts = self._get_contracts_for_export(request.contract_ids, current_user)
        
        if len(contracts) > 1000:
            # For large exports, process in background
            background_tasks.add_task(
                self._process_large_export,
                export_id,
                contracts,
                request,
                current_user
            )
            
            # Return immediate response for background processing
            return BulkExportResponse(
                export_id=export_id,
                format=request.format,
                total_records=len(contracts),
                processing_time_ms=(time.time() - start_time) * 1000,
                download_url=f"/api/v1/exports/{export_id}/download",
                expires_at=get_current_utc() + timedelta(hours=self.EXPORT_EXPIRY_HOURS)
            )
        
        # Process small exports synchronously
        try:
            export_result = await self._process_export(export_id, contracts, request)
            
            processing_time_ms = (time.time() - start_time) * 1000
            
            return BulkExportResponse(
                export_id=export_result.export_id,
                format=export_result.format,
                total_records=export_result.total_records,
                file_size_bytes=export_result.file_size_bytes,
                download_url=f"/api/v1/exports/{export_id}/download",
                expires_at=get_current_utc() + timedelta(hours=self.EXPORT_EXPIRY_HOURS),
                processing_time_ms=processing_time_ms
            )
            
        except Exception as e:
            raise BusinessRuleViolationError(f"Export failed: {str(e)}")
    
    async def export_audit_log(
        self,
        current_user: User,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        format: BulkOperationFormat = BulkOperationFormat.CSV
    ) -> BulkExportResponse:
        """Export audit log for compliance reporting"""
        # This would be implemented similarly to contract export
        # but specifically for audit log data
        raise NotImplementedError("Audit log export not yet implemented")
    
    async def export_compliance_report(
        self,
        current_user: User,
        report_type: str = "summary",
        format: BulkOperationFormat = BulkOperationFormat.PDF
    ) -> BulkExportResponse:
        """Export compliance reports"""
        # This would generate compliance reports in various formats
        raise NotImplementedError("Compliance report export not yet implemented")
    
    # Private methods
    
    def _validate_export_request(self, request: BulkContractExportRequest):
        """Validate export request parameters"""
        if len(request.contract_ids) > self.MAX_EXPORT_RECORDS:
            raise DomainValidationError(
                f"Export limit exceeded. Maximum: {self.MAX_EXPORT_RECORDS} contracts"
            )
        
        if not request.contract_ids:
            raise DomainValidationError("At least one contract ID must be provided")
    
    def _get_contracts_for_export(self, contract_ids: List[str], user: User) -> List[Contract]:
        """Get contracts that belong to user's company for export"""
        contracts = self.db.query(Contract).filter(
            and_(
                Contract.id.in_(contract_ids),
                Contract.company_id == user.company_id,
                Contract.is_current_version == True
            )
        ).all()
        
        return contracts
    
    async def _process_export(
        self,
        export_id: str,
        contracts: List[Contract],
        request: BulkContractExportRequest
    ) -> ExportResult:
        """Process the export operation"""
        
        if request.format == BulkOperationFormat.CSV:
            return await self._export_to_csv(export_id, contracts, request)
        elif request.format == BulkOperationFormat.JSON:
            return await self._export_to_json(export_id, contracts, request)
        elif request.format == BulkOperationFormat.EXCEL:
            return await self._export_to_excel(export_id, contracts, request)
        elif request.format == BulkOperationFormat.PDF:
            return await self._export_to_pdf(export_id, contracts, request)
        else:
            raise DomainValidationError(f"Unsupported export format: {request.format}")
    
    async def _process_large_export(
        self,
        export_id: str,
        contracts: List[Contract],
        request: BulkContractExportRequest,
        user: User
    ):
        """Process large export in background"""
        try:
            await self._process_export(export_id, contracts, request)
            # Would update export status in database/cache here
        except Exception as e:
            # Would log error and update export status here
            pass
    
    async def _export_to_csv(
        self,
        export_id: str,
        contracts: List[Contract],
        request: BulkContractExportRequest
    ) -> ExportResult:
        """Export contracts to CSV format"""
        start_time = time.time()
        
        # Determine fields to export
        fields = request.fields or self._get_default_export_fields()
        
        # Create CSV file
        file_path = self.export_base_path / f"{export_id}.csv"
        
        with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fields)
            writer.writeheader()
            
            for contract in contracts:
                row_data = self._contract_to_dict(contract, fields, request.include_content)
                writer.writerow(row_data)
        
        file_size = file_path.stat().st_size
        processing_time_ms = (time.time() - start_time) * 1000
        
        return ExportResult(
            export_id=export_id,
            format=BulkOperationFormat.CSV,
            total_records=len(contracts),
            file_size_bytes=file_size,
            file_path=str(file_path),
            processing_time_ms=processing_time_ms
        )
    
    async def _export_to_json(
        self,
        export_id: str,
        contracts: List[Contract],
        request: BulkContractExportRequest
    ) -> ExportResult:
        """Export contracts to JSON format"""
        start_time = time.time()
        
        # Determine fields to export
        fields = request.fields or self._get_default_export_fields()
        
        # Create JSON data
        export_data = {
            "export_id": export_id,
            "exported_at": get_current_utc().isoformat(),
            "total_contracts": len(contracts),
            "contracts": []
        }
        
        for contract in contracts:
            contract_data = self._contract_to_dict(contract, fields, request.include_content)
            
            if request.include_versions:
                # Would add version history here if implemented
                contract_data["versions"] = []
            
            export_data["contracts"].append(contract_data)
        
        # Write JSON file
        file_path = self.export_base_path / f"{export_id}.json"
        
        with open(file_path, 'w', encoding='utf-8') as jsonfile:
            json.dump(export_data, jsonfile, indent=2, default=str)
        
        file_size = file_path.stat().st_size
        processing_time_ms = (time.time() - start_time) * 1000
        
        return ExportResult(
            export_id=export_id,
            format=BulkOperationFormat.JSON,
            total_records=len(contracts),
            file_size_bytes=file_size,
            file_path=str(file_path),
            processing_time_ms=processing_time_ms
        )
    
    async def _export_to_excel(
        self,
        export_id: str,
        contracts: List[Contract],
        request: BulkContractExportRequest
    ) -> ExportResult:
        """Export contracts to Excel format"""
        # Would use openpyxl or xlsxwriter to create Excel files
        # For now, fall back to CSV
        return await self._export_to_csv(export_id, contracts, request)
    
    async def _export_to_pdf(
        self,
        export_id: str,
        contracts: List[Contract],
        request: BulkContractExportRequest
    ) -> ExportResult:
        """Export contracts to PDF format"""
        # Would use reportlab or similar to create PDF reports
        # For now, raise not implemented
        raise NotImplementedError("PDF export not yet implemented")
    
    def _get_default_export_fields(self) -> List[str]:
        """Get default fields for export"""
        return [
            'id', 'title', 'contract_type', 'status', 'client_name', 'supplier_name',
            'contract_value', 'currency', 'start_date', 'end_date', 'created_at',
            'updated_at', 'version'
        ]
    
    def _contract_to_dict(
        self,
        contract: Contract,
        fields: List[str],
        include_content: bool = False
    ) -> Dict[str, Any]:
        """Convert contract to dictionary for export"""
        data = {}
        
        # Map contract fields to export data
        field_mapping = {
            'id': contract.id,
            'title': contract.title,
            'contract_type': contract.contract_type.value if contract.contract_type else None,
            'status': contract.status.value if contract.status else None,
            'client_name': contract.client_name,
            'supplier_name': contract.supplier_name,
            'client_email': contract.client_email,
            'contract_value': contract.contract_value,
            'currency': contract.currency,
            'start_date': contract.start_date.isoformat() if contract.start_date else None,
            'end_date': contract.end_date.isoformat() if contract.end_date else None,
            'created_at': contract.created_at.isoformat() if contract.created_at else None,
            'updated_at': contract.updated_at.isoformat() if contract.updated_at else None,
            'version': contract.version,
            'plain_english_input': contract.plain_english_input if include_content else None,
            'generated_content': contract.generated_content if include_content else None,
            'final_content': contract.final_content if include_content else None
        }
        
        # Add compliance and risk scores if available
        if hasattr(contract, 'compliance_scores') and contract.compliance_scores:
            latest_score = contract.compliance_scores[0]  # Assuming relationship is set up
            field_mapping.update({
                'compliance_score': latest_score.overall_score,
                'risk_score': latest_score.risk_score
            })
        
        # Include only requested fields
        for field in fields:
            if field in field_mapping:
                data[field] = field_mapping[field]
        
        return data


# Factory function for dependency injection
def get_export_service(db: Session) -> ExportService:
    """Factory function to create export service"""
    return ExportService(db)