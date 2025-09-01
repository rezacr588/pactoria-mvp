"""
Comprehensive Test Data Factories and Fixtures
Provides realistic test data generation for E2E testing scenarios
"""
import random
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from faker import Faker

from app.infrastructure.database.models import (
    ContractType, ContractStatus, UserRole, SubscriptionTier
)


class TestDataFactories:
    """Comprehensive test data factories for realistic E2E testing"""
    
    def __init__(self, locale='en_GB'):
        """Initialize with UK locale for realistic UK business data"""
        self.fake = Faker(locale)
        
    def generate_company_data(self, **overrides) -> Dict[str, Any]:
        """Generate realistic UK company data"""
        company_name = self.fake.company()
        
        data = {
            "id": str(uuid.uuid4()),
            "name": company_name,
            "registration_number": f"{self.fake.random_int(min=10000000, max=99999999)}",
            "address": f"{self.fake.street_address()}, {self.fake.city()}, {self.fake.postcode()}",
            "subscription_tier": random.choice(list(SubscriptionTier)),
            "max_users": random.choice([5, 25, 100]),
            "settings": {
                "timezone": "Europe/London",
                "default_contract_template": None,
                "compliance_level": "standard",
                "notification_preferences": {
                    "email_notifications": True,
                    "contract_updates": True,
                    "compliance_alerts": True
                },
                "branding": {
                    "primary_color": self.fake.hex_color(),
                    "logo_url": None
                }
            }
        }
        
        data.update(overrides)
        return data
    
    def generate_user_data(self, company_id: str = None, role: UserRole = None, **overrides) -> Dict[str, Any]:
        """Generate realistic user data"""
        first_name = self.fake.first_name()
        last_name = self.fake.last_name()
        
        data = {
            "id": str(uuid.uuid4()),
            "email": self.fake.unique.email(),
            "full_name": f"{first_name} {last_name}",
            "password": "TestPassword123!",
            "company_id": company_id,
            "role": role or random.choice(list(UserRole)),
            "department": random.choice([
                "Legal", "Operations", "Finance", "HR", "Management", 
                "Compliance", "Procurement", "Sales", "Marketing"
            ]),
            "is_active": True,
            "timezone": "Europe/London",
            "notification_preferences": {
                "email_notifications": random.choice([True, False]),
                "contract_updates": True,
                "compliance_alerts": random.choice([True, False]),
                "weekly_summaries": random.choice([True, False])
            },
            "last_login_at": self.fake.date_time_between(start_date='-30d', end_date='now'),
            "invited_at": self.fake.date_time_between(start_date='-60d', end_date='-30d') if random.choice([True, False]) else None
        }
        
        data.update(overrides)
        return data
    
    def generate_contract_data(self, company_id: str, created_by: str, template_id: str = None, **overrides) -> Dict[str, Any]:
        """Generate realistic contract data"""
        contract_type = random.choice(list(ContractType))
        
        # Generate contract type-specific data
        type_specific_data = self._get_contract_type_specific_data(contract_type)
        
        start_date = self.fake.date_between(start_date='-30d', end_date='+30d')
        end_date = start_date + timedelta(days=random.randint(90, 1095))  # 3 months to 3 years
        
        data = {
            "id": str(uuid.uuid4()),
            "title": type_specific_data["title"],
            "contract_type": contract_type,
            "status": random.choice(list(ContractStatus)),
            "plain_english_input": type_specific_data["plain_english_input"],
            "generated_content": None,  # Will be generated later
            "final_content": None,
            "client_name": type_specific_data["client_name"],
            "client_email": self.fake.company_email(),
            "supplier_name": type_specific_data["supplier_name"],
            "supplier_email": self.fake.company_email(),
            "contract_value": type_specific_data["contract_value"],
            "currency": "GBP",
            "start_date": start_date,
            "end_date": end_date,
            "version": 1,
            "is_current_version": True,
            "company_id": company_id,
            "template_id": template_id,
            "created_by": created_by,
            "created_at": self.fake.date_time_between(start_date='-90d', end_date='now'),
            "updated_at": None
        }
        
        data.update(overrides)
        return data
    
    def _get_contract_type_specific_data(self, contract_type: ContractType) -> Dict[str, Any]:
        """Generate contract type-specific realistic data"""
        if contract_type == ContractType.SERVICE_AGREEMENT:
            return {
                "title": f"{self.fake.catch_phrase()} Services Agreement",
                "plain_english_input": f"Professional services agreement for {self.fake.bs()}. The work involves {self.fake.catch_phrase().lower()} with deliverables including {self.fake.bs()}. Payment terms are {random.choice(['NET 30', 'NET 15', 'payment on completion'])} with total value of approximately £{random.randint(25, 150)}k. The agreement should include confidentiality clauses, intellectual property ownership terms, and termination provisions.",
                "client_name": self.fake.company(),
                "supplier_name": f"{self.fake.last_name()} {random.choice(['Consulting', 'Services', 'Solutions', 'Partners'])}",
                "contract_value": float(random.randint(25000, 150000))
            }
        
        elif contract_type == ContractType.EMPLOYMENT_CONTRACT:
            job_titles = [
                "Senior Software Developer", "Marketing Manager", "Legal Counsel",
                "Operations Director", "Financial Analyst", "HR Business Partner",
                "Sales Executive", "Project Manager", "Data Scientist", "UX Designer"
            ]
            
            return {
                "title": f"Employment Contract - {random.choice(job_titles)}",
                "plain_english_input": f"Full-time employment contract for {random.choice(job_titles)} position. Annual salary of £{random.randint(35, 120)}k with {random.randint(20, 30)} days holiday allowance. The role includes {self.fake.bs()} responsibilities. Standard benefits package including pension contributions, health insurance, and flexible working arrangements. Notice period of {random.choice([1, 2, 3])} months for both parties.",
                "client_name": self.fake.company(),
                "supplier_name": self.fake.name(),
                "contract_value": float(random.randint(35000, 120000))
            }
        
        elif contract_type == ContractType.NDA:
            return {
                "title": f"Non-Disclosure Agreement - {self.fake.company()}",
                "plain_english_input": f"Mutual non-disclosure agreement for sharing confidential information regarding {self.fake.bs()}. The agreement covers {random.choice(['technical specifications', 'business plans', 'financial information', 'customer data', 'proprietary processes'])} and has a term of {random.choice([2, 3, 5])} years. Includes standard exceptions for publicly available information and independently developed materials.",
                "client_name": self.fake.company(),
                "supplier_name": self.fake.company(),
                "contract_value": 0.0
            }
        
        elif contract_type == ContractType.SUPPLIER_AGREEMENT:
            return {
                "title": f"Supplier Agreement - {self.fake.company()}",
                "plain_english_input": f"Supplier agreement for provision of {random.choice(['materials', 'components', 'software licenses', 'maintenance services', 'equipment'])}. Annual commitment of approximately £{random.randint(50, 300)}k with {random.choice(['quarterly', 'monthly', 'annual'])} billing. Includes service level agreements, quality standards, delivery schedules, and penalty clauses for non-performance.",
                "client_name": self.fake.company(),
                "supplier_name": f"{self.fake.company()} Limited",
                "contract_value": float(random.randint(50000, 300000))
            }
        
        elif contract_type == ContractType.CONSULTANCY:
            return {
                "title": f"Consultancy Agreement - {self.fake.bs().title()}",
                "plain_english_input": f"Consultancy agreement for {self.fake.bs()} project spanning {random.randint(3, 12)} months. The consultant will provide expertise in {self.fake.catch_phrase().lower()} with specific deliverables including analysis, recommendations, and implementation support. Daily rate of £{random.randint(500, 1500)} with estimated {random.randint(30, 100)} days total engagement.",
                "client_name": self.fake.company(),
                "supplier_name": f"{self.fake.last_name()} Consulting Limited",
                "contract_value": float(random.randint(30000, 120000))
            }
        
        elif contract_type == ContractType.LEASE:
            return {
                "title": f"Lease Agreement - {self.fake.street_name()} Property",
                "plain_english_input": f"Commercial lease agreement for {random.randint(1000, 10000)} sq ft office space at {self.fake.address()}. Monthly rent of £{random.randint(2000, 15000)} with {random.randint(3, 10)} year term. Includes {random.choice(['utilities', 'parking', 'maintenance', 'service charge'])} and break clause after {random.randint(2, 5)} years. Standard commercial lease terms with rent reviews and repair obligations.",
                "client_name": self.fake.company(),
                "supplier_name": f"{self.fake.last_name()} Property Limited",
                "contract_value": float(random.randint(24000, 180000))  # Annual rent
            }
        
        else:  # TERMS_CONDITIONS or PARTNERSHIP
            return {
                "title": f"Terms and Conditions - {self.fake.company()}",
                "plain_english_input": f"Standard terms and conditions for {self.fake.bs()} services. Covers payment terms, liability limitations, intellectual property rights, and dispute resolution. Includes GDPR compliance provisions and consumer rights protections. Updated to reflect current UK legislation and industry best practices.",
                "client_name": self.fake.company(),
                "supplier_name": "Various Customers",
                "contract_value": 0.0
            }
    
    def generate_template_data(self, contract_type: ContractType = None, **overrides) -> Dict[str, Any]:
        """Generate realistic template data"""
        contract_type = contract_type or random.choice(list(ContractType))
        
        template_names = {
            ContractType.SERVICE_AGREEMENT: [
                "Standard Professional Services Agreement",
                "IT Services Contract Template",
                "Management Consulting Agreement",
                "Technical Services Contract"
            ],
            ContractType.EMPLOYMENT_CONTRACT: [
                "Standard Employment Contract",
                "Senior Executive Employment Agreement",
                "Fixed-Term Employment Contract",
                "Part-Time Employment Agreement"
            ],
            ContractType.NDA: [
                "Mutual Non-Disclosure Agreement",
                "One-Way Confidentiality Agreement",
                "Employee NDA Template",
                "Vendor Confidentiality Agreement"
            ],
            ContractType.SUPPLIER_AGREEMENT: [
                "Standard Supplier Agreement",
                "Preferred Supplier Contract",
                "Master Service Agreement",
                "Vendor Services Contract"
            ]
        }
        
        names = template_names.get(contract_type, ["Generic Contract Template"])
        
        data = {
            "id": str(uuid.uuid4()),
            "name": random.choice(names),
            "category": contract_type.value.replace('_', ' ').title(),
            "contract_type": contract_type,
            "description": f"Standard UK {contract_type.value.replace('_', ' ')} template compliant with current legislation",
            "template_content": self._generate_template_content(contract_type),
            "compliance_features": self._get_compliance_features(contract_type),
            "legal_notes": f"This template has been reviewed for compliance with UK {contract_type.value.replace('_', ' ')} requirements as of {self.fake.date_this_year()}.",
            "version": f"{random.randint(1, 5)}.{random.randint(0, 9)}",
            "is_active": random.choice([True, True, True, False]),  # 75% active
            "suitable_for": self._get_suitable_for_list(contract_type)
        }
        
        data.update(overrides)
        return data
    
    def _generate_template_content(self, contract_type: ContractType) -> str:
        """Generate realistic template content"""
        base_content = f"""
{contract_type.value.replace('_', ' ').title().upper()}

This {contract_type.value.replace('_', ' ')} ("Agreement") is entered into on [DATE] between:

1. [PARTY_1_NAME], a company incorporated in England and Wales with company number [COMPANY_NUMBER], having its registered office at [PARTY_1_ADDRESS] ("Company")

2. [PARTY_2_NAME], [PARTY_2_TYPE] with address at [PARTY_2_ADDRESS] ("Counterparty")

WHEREAS, the parties wish to enter into this agreement for [PURPOSE];

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, the parties agree as follows:

1. DEFINITIONS AND INTERPRETATION
   1.1 Definitions specific to this agreement
   1.2 Interpretation rules

2. SCOPE OF WORK/SERVICES
   [SCOPE_DESCRIPTION]

3. TERM AND TERMINATION
   3.1 This Agreement shall commence on [START_DATE] and continue until [END_DATE]
   3.2 Either party may terminate this Agreement upon [NOTICE_PERIOD] written notice

4. PAYMENT TERMS
   4.1 Payment obligations and schedules
   4.2 Late payment provisions

5. INTELLECTUAL PROPERTY
   5.1 Ownership and licensing provisions
   5.2 Work product ownership

6. CONFIDENTIALITY
   6.1 Definition of confidential information
   6.2 Obligations and exceptions

7. DATA PROTECTION
   7.1 GDPR compliance provisions
   7.2 Data processing terms

8. LIABILITY AND INDEMNIFICATION
   8.1 Limitation of liability
   8.2 Indemnification terms

9. GOVERNING LAW
   This Agreement shall be governed by and construed in accordance with the laws of England and Wales.

10. DISPUTE RESOLUTION
    Any disputes shall be resolved through [DISPUTE_RESOLUTION_METHOD].

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

[SIGNATURE_BLOCKS]
        """
        
        return base_content.strip()
    
    def _get_compliance_features(self, contract_type: ContractType) -> List[str]:
        """Get compliance features for contract type"""
        base_features = ["gdpr", "uk_law", "commercial_law"]
        
        type_specific = {
            ContractType.EMPLOYMENT_CONTRACT: ["employment_law", "working_time_directive", "equality_act"],
            ContractType.CONSUMER_AGREEMENT: ["consumer_rights", "unfair_terms", "distance_selling"],
            ContractType.NDA: ["confidentiality", "data_protection"],
            ContractType.SUPPLIER_AGREEMENT: ["procurement_law", "competition_law"],
            ContractType.SERVICE_AGREEMENT: ["professional_standards", "service_law"],
            ContractType.LEASE: ["landlord_tenant_law", "property_law"]
        }
        
        return base_features + type_specific.get(contract_type, [])
    
    def _get_suitable_for_list(self, contract_type: ContractType) -> List[str]:
        """Get suitable for list based on contract type"""
        base_suitable = ["SMEs", "startups", "established_businesses"]
        
        type_specific = {
            ContractType.SERVICE_AGREEMENT: ["consultancies", "agencies", "freelancers"],
            ContractType.EMPLOYMENT_CONTRACT: ["all_employers", "hr_departments"],
            ContractType.NDA: ["all_businesses", "partnerships", "joint_ventures"],
            ContractType.SUPPLIER_AGREEMENT: ["procurement_teams", "vendors", "manufacturers"],
            ContractType.CONSULTANCY: ["consulting_firms", "advisory_services"],
            ContractType.LEASE: ["property_managers", "tenants", "landlords"]
        }
        
        return base_suitable + type_specific.get(contract_type, [])
    
    def generate_compliance_score_data(self, contract_id: str, **overrides) -> Dict[str, Any]:
        """Generate realistic compliance score data"""
        # Generate correlated scores (good contracts tend to be good across all areas)
        base_score = random.uniform(0.7, 0.98)
        variance = 0.1
        
        data = {
            "id": str(uuid.uuid4()),
            "contract_id": contract_id,
            "overall_score": base_score,
            "gdpr_compliance": max(0.0, min(1.0, base_score + random.uniform(-variance, variance))),
            "employment_law_compliance": max(0.0, min(1.0, base_score + random.uniform(-variance, variance))),
            "consumer_rights_compliance": max(0.0, min(1.0, base_score + random.uniform(-variance, variance))),
            "commercial_terms_compliance": max(0.0, min(1.0, base_score + random.uniform(-variance, variance))),
            "risk_score": random.randint(1, 10) if base_score < 0.8 else random.randint(1, 5),
            "risk_factors": self._generate_risk_factors(base_score),
            "recommendations": self._generate_recommendations(base_score),
            "analysis_date": self.fake.date_time_between(start_date='-30d', end_date='now'),
            "analysis_version": f"v{random.randint(1, 3)}.{random.randint(0, 9)}",
            "analysis_raw": "Comprehensive AI analysis completed with UK legal compliance review."
        }
        
        data.update(overrides)
        return data
    
    def _generate_risk_factors(self, compliance_score: float) -> List[str]:
        """Generate realistic risk factors based on compliance score"""
        all_risks = [
            "Missing GDPR Article 28 compliance clauses",
            "Unclear termination provisions",
            "Insufficient liability limitations",
            "Weak intellectual property protections",
            "Inadequate dispute resolution mechanisms",
            "Missing force majeure provisions", 
            "Unclear payment terms",
            "Insufficient data protection measures",
            "Ambiguous scope of work definitions",
            "Missing confidentiality obligations",
            "Inadequate indemnification clauses",
            "Unclear governing law provisions"
        ]
        
        # Lower compliance = more risk factors
        if compliance_score >= 0.9:
            num_risks = random.randint(0, 2)
        elif compliance_score >= 0.8:
            num_risks = random.randint(1, 4)
        else:
            num_risks = random.randint(3, 6)
        
        return random.sample(all_risks, min(num_risks, len(all_risks)))
    
    def _generate_recommendations(self, compliance_score: float) -> List[str]:
        """Generate realistic recommendations based on compliance score"""
        all_recommendations = [
            "Add GDPR Article 28 compliant data processing clauses",
            "Include clear termination notice periods (minimum 30 days)",
            "Define specific liability limitations and exclusions",
            "Add comprehensive intellectual property ownership terms",
            "Include alternative dispute resolution mechanisms",
            "Add force majeure clause for contract protection",
            "Clarify payment terms and late payment penalties",
            "Strengthen data protection and privacy provisions",
            "Define scope of work with specific deliverables",
            "Add mutual confidentiality and non-disclosure terms",
            "Include comprehensive indemnification provisions",
            "Specify governing law as England and Wales",
            "Add compliance monitoring and review mechanisms"
        ]
        
        # Lower compliance = more recommendations
        if compliance_score >= 0.9:
            num_recommendations = random.randint(1, 3)
        elif compliance_score >= 0.8:
            num_recommendations = random.randint(2, 5)
        else:
            num_recommendations = random.randint(4, 8)
        
        return random.sample(all_recommendations, min(num_recommendations, len(all_recommendations)))
    
    def generate_ai_generation_data(self, contract_id: str, **overrides) -> Dict[str, Any]:
        """Generate realistic AI generation data"""
        models = ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768"]
        
        data = {
            "id": str(uuid.uuid4()),
            "model_name": random.choice(models),
            "model_version": f"{random.randint(1, 3)}.{random.randint(0, 9)}",
            "input_prompt": "Generate comprehensive UK legal contract based on provided requirements...",
            "generated_content": self._generate_realistic_contract_content(),
            "processing_time_ms": random.randint(1500, 8000),  # 1.5-8 seconds
            "token_usage": {
                "prompt_tokens": random.randint(100, 500),
                "completion_tokens": random.randint(800, 2500),
                "total_tokens": random.randint(900, 3000)
            },
            "confidence_score": random.uniform(0.85, 0.98),
            "created_at": self.fake.date_time_between(start_date='-7d', end_date='now')
        }
        
        data.update(overrides)
        return data
    
    def _generate_realistic_contract_content(self) -> str:
        """Generate realistic generated contract content"""
        return f"""
PROFESSIONAL SERVICES AGREEMENT

This Professional Services Agreement ("Agreement") is entered into on {self.fake.date()} between:

1. CLIENT: {self.fake.company()}, a company incorporated in England and Wales with company number {self.fake.random_int(min=10000000, max=99999999)}, having its registered office at {self.fake.address()} ("Client")

2. SERVICE PROVIDER: {self.fake.company()} Limited, a company incorporated in England and Wales with company number {self.fake.random_int(min=10000000, max=99999999)}, having its registered office at {self.fake.address()} ("Service Provider")

WHEREAS, Client desires to obtain certain professional services from Service Provider, and Service Provider is willing to provide such services subject to the terms and conditions set forth herein;

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, the parties agree as follows:

1. SERVICES
Service Provider shall provide {self.fake.bs()} services as detailed in Schedule A attached hereto and incorporated herein by reference.

2. PAYMENT TERMS
Client shall pay Service Provider the fees set forth in Schedule B. Payment is due within thirty (30) days of invoice date. Late payments shall incur interest at 2% per month.

3. TERM
This Agreement shall commence on {self.fake.future_date()} and shall continue until {self.fake.future_date(end_date='+365d')} unless earlier terminated in accordance with the provisions hereof.

4. CONFIDENTIALITY
Both parties acknowledge they may have access to confidential information and agree to maintain strict confidentiality in accordance with UK data protection laws.

5. INTELLECTUAL PROPERTY
All work product created by Service Provider in the course of providing services shall be the exclusive property of Client, subject to Service Provider's retained rights in pre-existing materials.

6. LIABILITY AND INDEMNIFICATION
Service Provider's liability shall be limited to the total fees paid under this Agreement. Both parties agree to indemnify each other against third-party claims arising from their respective breaches.

7. GDPR COMPLIANCE
Both parties agree to comply with the General Data Protection Regulation (GDPR) and all applicable UK data protection laws.

8. TERMINATION
Either party may terminate this Agreement upon thirty (30) days written notice. Upon termination, all outstanding fees shall become immediately due and payable.

9. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the English courts.

10. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties and supersedes all prior understandings and agreements.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

CLIENT:                           SERVICE PROVIDER:

By: _____________________        By: _____________________
Name: {self.fake.name()}         Name: {self.fake.name()}
Title: Director                   Title: Director
Date: ___________________        Date: ___________________
        """.strip()
    
    def generate_audit_log_data(self, user_id: str, resource_type: str = "contract", **overrides) -> Dict[str, Any]:
        """Generate realistic audit log data"""
        event_types = {
            "contract": ["created", "updated", "deleted", "activated", "completed", "generated", "analyzed"],
            "user": ["created", "updated", "invited", "activated", "deactivated", "role_changed"],
            "file": ["uploaded", "downloaded", "deleted"],
            "company": ["created", "updated", "subscription_changed"]
        }
        
        data = {
            "id": str(uuid.uuid4()),
            "event_type": f"{resource_type}_{random.choice(event_types.get(resource_type, ['updated']))}",
            "resource_type": resource_type,
            "resource_id": str(uuid.uuid4()),
            "user_id": user_id,
            "ip_address": self.fake.ipv4(),
            "user_agent": self.fake.user_agent(),
            "old_values": {"status": "draft", "title": "Old Title"} if random.choice([True, False]) else None,
            "new_values": {"status": "active", "title": "New Title"},
            "additional_data": {
                "session_id": str(uuid.uuid4()),
                "request_id": str(uuid.uuid4()),
                "duration_ms": random.randint(50, 2000)
            },
            "timestamp": self.fake.date_time_between(start_date='-30d', end_date='now')
        }
        
        data.update(overrides)
        return data
    
    def generate_bulk_test_data(self, company_id: str, user_id: str, count: int = 100) -> Dict[str, List[Dict[str, Any]]]:
        """Generate bulk test data for performance and stress testing"""
        return {
            "contracts": [
                self.generate_contract_data(company_id, user_id, 
                    title=f"Bulk Test Contract {i+1:04d}",
                    plain_english_input=f"Bulk generated contract {i+1} for performance testing with realistic content and comprehensive requirements."
                ) 
                for i in range(count)
            ],
            "users": [
                self.generate_user_data(company_id, 
                    email=f"bulk-user-{i+1:04d}@testcompany.com",
                    full_name=f"Bulk Test User {i+1:04d}"
                ) 
                for i in range(count // 10)  # 10% as many users as contracts
            ],
            "templates": [
                self.generate_template_data(contract_type=contract_type,
                    name=f"Bulk Test {contract_type.value.replace('_', ' ').title()} Template {i+1}"
                )
                for i, contract_type in enumerate(list(ContractType))
            ]
        }
    
    def generate_realistic_business_scenario(self, scenario_name: str) -> Dict[str, Any]:
        """Generate realistic business scenario data"""
        scenarios = {
            "tech_startup": {
                "company": self.generate_company_data(
                    name="InnovateTech Solutions Ltd",
                    subscription_tier=SubscriptionTier.PROFESSIONAL,
                    max_users=25
                ),
                "contracts": [
                    # Employment contracts for team
                    self.generate_contract_data("", "", 
                        contract_type=ContractType.EMPLOYMENT_CONTRACT,
                        title="Employment Contract - Senior Developer",
                        contract_value=75000.0
                    ),
                    # Service agreements with clients
                    self.generate_contract_data("", "",
                        contract_type=ContractType.SERVICE_AGREEMENT,
                        title="Software Development Services - FinTech Client",
                        contract_value=150000.0
                    ),
                    # NDAs with partners
                    self.generate_contract_data("", "",
                        contract_type=ContractType.NDA,
                        title="Mutual NDA - Strategic Partnership",
                        contract_value=0.0
                    )
                ]
            },
            
            "consulting_firm": {
                "company": self.generate_company_data(
                    name="Strategic Advisory Partners",
                    subscription_tier=SubscriptionTier.BUSINESS,
                    max_users=100
                ),
                "contracts": [
                    # Multiple client engagements
                    self.generate_contract_data("", "",
                        contract_type=ContractType.CONSULTANCY,
                        title="Digital Transformation Consultancy",
                        contract_value=250000.0
                    ),
                    # Supplier agreements
                    self.generate_contract_data("", "",
                        contract_type=ContractType.SUPPLIER_AGREEMENT,
                        title="IT Infrastructure Supplier Agreement",
                        contract_value=80000.0
                    )
                ]
            },
            
            "manufacturing_company": {
                "company": self.generate_company_data(
                    name="Premium Manufacturing Ltd",
                    subscription_tier=SubscriptionTier.BUSINESS,
                    max_users=50
                ),
                "contracts": [
                    # Multiple supplier agreements
                    self.generate_contract_data("", "",
                        contract_type=ContractType.SUPPLIER_AGREEMENT,
                        title="Raw Materials Supply Agreement",
                        contract_value=500000.0
                    ),
                    # Lease agreements for facilities
                    self.generate_contract_data("", "",
                        contract_type=ContractType.LEASE,
                        title="Manufacturing Facility Lease",
                        contract_value=120000.0  # Annual rent
                    )
                ]
            }
        }
        
        return scenarios.get(scenario_name, scenarios["tech_startup"])


# Global instance for use in tests
test_data_factories = TestDataFactories()


# Pytest fixtures for common test data patterns
import pytest

@pytest.fixture
def realistic_company_data():
    """Generate realistic company data"""
    return test_data_factories.generate_company_data()

@pytest.fixture  
def realistic_user_data():
    """Generate realistic user data"""
    return test_data_factories.generate_user_data()

@pytest.fixture
def realistic_contract_data():
    """Generate realistic contract data"""
    return test_data_factories.generate_contract_data("test-company-id", "test-user-id")

@pytest.fixture
def business_scenario_data():
    """Generate complete business scenario"""
    return test_data_factories.generate_realistic_business_scenario("tech_startup")

@pytest.fixture
def bulk_test_data():
    """Generate bulk test data"""
    return test_data_factories.generate_bulk_test_data("test-company-id", "test-user-id", 50)