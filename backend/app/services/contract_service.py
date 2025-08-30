"""
Contract Service for Pactoria MVP
Handles contract business logic and database operations
"""
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from uuid import uuid4

from app.core.datetime_utils import get_current_utc

logger = logging.getLogger(__name__)


class ContractService:
    """
    Contract business logic service
    Following MVP requirements for contract management
    """
    
    def __init__(self):
        # Mock data storage - will be replaced with database
        self.contracts = {}
        self.contract_versions = {}
    
    async def create_contract(
        self,
        title: str,
        contract_type: str,
        plain_english_input: str,
        generated_content: str,
        user_id: str,
        company_id: str,
        ai_metadata: Dict[str, Any],
        compliance_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new contract with AI generation and compliance data
        """
        contract_id = str(uuid4())
        
        contract = {
            "id": contract_id,
            "title": title,
            "contract_type": contract_type,
            "status": "draft",
            "version": 1,
            "plain_english_input": plain_english_input,
            "generated_content": generated_content,
            "final_content": None,
            "created_by_id": user_id,
            "company_id": company_id,
            "created_at": get_current_utc(),
            "updated_at": get_current_utc(),
            "ai_generation": ai_metadata,
            "compliance_score": compliance_data
        }
        
        self.contracts[contract_id] = contract
        
        # Create initial version
        await self._create_version(
            contract_id, 1, generated_content, 
            "Initial AI generation", user_id
        )
        
        logger.info(f"Created contract {contract_id}: {title}")
        return contract
    
    async def get_contract(self, contract_id: str) -> Optional[Dict[str, Any]]:
        """Get contract by ID"""
        return self.contracts.get(contract_id)
    
    async def update_contract(
        self,
        contract_id: str,
        updates: Dict[str, Any],
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Update contract with version control
        MVP requirement: Version control with audit trail
        """
        contract = self.contracts.get(contract_id)
        if not contract:
            return None
        
        # Create new version if content changed
        if "content" in updates and updates["content"] != contract.get("final_content"):
            new_version = contract["version"] + 1
            await self._create_version(
                contract_id, new_version, updates["content"],
                f"Updated by user {user_id}", user_id
            )
            contract["version"] = new_version
        
        # Update contract
        for key, value in updates.items():
            if key == "content":
                contract["final_content"] = value
            else:
                contract[key] = value
        
        contract["updated_at"] = get_current_utc()
        
        logger.info(f"Updated contract {contract_id}")
        return contract
    
    async def list_contracts(
        self,
        company_id: str,
        page: int = 1,
        per_page: int = 20,
        contract_type: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List contracts with filtering and pagination
        """
        # Filter by company
        company_contracts = [
            c for c in self.contracts.values() 
            if c["company_id"] == company_id
        ]
        
        # Apply filters
        if contract_type:
            company_contracts = [
                c for c in company_contracts 
                if c["contract_type"] == contract_type
            ]
        
        if status:
            company_contracts = [
                c for c in company_contracts 
                if c["status"] == status
            ]
        
        # Sort by created_at desc
        company_contracts.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Pagination
        total = len(company_contracts)
        start = (page - 1) * per_page
        end = start + per_page
        contracts = company_contracts[start:end]
        
        return {
            "contracts": contracts,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
    
    async def delete_contract(self, contract_id: str, user_id: str) -> bool:
        """
        Soft delete contract (keep for audit trail)
        """
        contract = self.contracts.get(contract_id)
        if not contract:
            return False
        
        contract["status"] = "deleted"
        contract["deleted_at"] = get_current_utc()
        contract["deleted_by"] = user_id
        
        logger.info(f"Deleted contract {contract_id}")
        return True
    
    async def get_contract_versions(self, contract_id: str) -> List[Dict[str, Any]]:
        """
        Get version history for contract
        MVP requirement: Version control with audit trail
        """
        contract_versions = [
            version for version in self.contract_versions.values()
            if version["contract_id"] == contract_id
        ]
        
        # Sort by version number
        contract_versions.sort(key=lambda x: x["version_number"])
        return contract_versions
    
    async def _create_version(
        self,
        contract_id: str,
        version_number: int,
        content: str,
        changes_summary: str,
        user_id: str
    ) -> str:
        """Create a new contract version"""
        version_id = str(uuid4())
        
        version = {
            "id": version_id,
            "contract_id": contract_id,
            "version_number": version_number,
            "content": content,
            "changes_summary": changes_summary,
            "created_by_id": user_id,
            "created_at": get_current_utc()
        }
        
        self.contract_versions[version_id] = version
        return version_id
    
    async def export_contract_pdf(self, contract_id: str) -> Optional[Dict[str, Any]]:
        """
        Export contract as PDF
        MVP requirement: PDF generation and export
        """
        contract = self.contracts.get(contract_id)
        if not contract:
            return None
        
        # Mock PDF generation - would use actual PDF library
        pdf_data = {
            "filename": f"contract_{contract_id}.pdf",
            "size_bytes": 2048,  # Mock size
            "download_url": f"/api/v1/files/contracts/{contract_id}.pdf",
            "generated_at": get_current_utc()
        }
        
        logger.info(f"Generated PDF for contract {contract_id}")
        return pdf_data
    
    async def get_contract_statistics(self, company_id: str) -> Dict[str, Any]:
        """Get contract statistics for company dashboard"""
        company_contracts = [
            c for c in self.contracts.values()
            if c["company_id"] == company_id
        ]
        
        stats = {
            "total_contracts": len(company_contracts),
            "draft_contracts": len([c for c in company_contracts if c["status"] == "draft"]),
            "active_contracts": len([c for c in company_contracts if c["status"] == "active"]),
            "contracts_this_month": len([
                c for c in company_contracts
                if c["created_at"].month == get_current_utc().month
            ]),
            "average_compliance_score": self._calculate_avg_compliance(company_contracts),
            "contract_types": self._get_contract_type_breakdown(company_contracts)
        }
        
        return stats
    
    def _calculate_avg_compliance(self, contracts: List[Dict[str, Any]]) -> float:
        """Calculate average compliance score"""
        scores = [
            c["compliance_score"]["overall_score"] 
            for c in contracts 
            if c.get("compliance_score")
        ]
        return sum(scores) / len(scores) if scores else 0.0
    
    def _get_contract_type_breakdown(self, contracts: List[Dict[str, Any]]) -> Dict[str, int]:
        """Get breakdown of contract types"""
        breakdown = {}
        for contract in contracts:
            contract_type = contract["contract_type"]
            breakdown[contract_type] = breakdown.get(contract_type, 0) + 1
        return breakdown