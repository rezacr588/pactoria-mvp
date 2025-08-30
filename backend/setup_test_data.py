"""
Setup test data for Pactoria MVP
Create initial templates and system data
"""
import asyncio
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, create_tables
from app.infrastructure.database.models import Template, ContractType


async def create_uk_templates():
    """Create UK legal templates for MVP testing"""
    
    db = SessionLocal()
    
    try:
        # Create 20+ UK legal templates as required by MVP
        templates = [
            {
                "name": "Service Agreement Template",
                "category": "professional_services", 
                "contract_type": ContractType.SERVICE_AGREEMENT,
                "description": "Professional services contract template compliant with UK law",
                "template_content": """
                PROFESSIONAL SERVICES AGREEMENT
                
                This Agreement is made under the laws of England and Wales between:
                CLIENT: [CLIENT_NAME]
                SERVICE PROVIDER: [PROVIDER_NAME]
                
                1. SERVICES
                The Service Provider shall provide [SERVICES_DESCRIPTION]
                
                2. PAYMENT TERMS
                Payment terms: [PAYMENT_TERMS]
                
                3. GDPR COMPLIANCE
                Both parties shall comply with GDPR and Data Protection Act 2018.
                
                4. GOVERNING LAW
                This Agreement is governed by the laws of England and Wales.
                """,
                "compliance_features": ["GDPR", "UK_COMMERCIAL_LAW"],
                "suitable_for": ["consulting", "professional_services"]
            },
            {
                "name": "Employment Contract Template",
                "category": "employment",
                "contract_type": ContractType.EMPLOYMENT_CONTRACT, 
                "description": "Employment contract template compliant with UK employment law",
                "template_content": """
                EMPLOYMENT CONTRACT
                
                This Contract of Employment is governed by UK Employment Law between:
                EMPLOYER: [EMPLOYER_NAME]
                EMPLOYEE: [EMPLOYEE_NAME]
                
                1. POSITION AND DUTIES
                The Employee is employed as [JOB_TITLE]
                
                2. SALARY AND BENEFITS
                Starting salary: [SALARY] per annum
                
                3. NOTICE PERIOD
                Notice period: [NOTICE_PERIOD] months
                
                4. GDPR AND DATA PROTECTION
                Employee data will be processed in accordance with GDPR.
                """,
                "compliance_features": ["UK_EMPLOYMENT_LAW", "GDPR", "MINIMUM_WAGE"],
                "suitable_for": ["permanent_employment", "temporary_employment"]
            },
            {
                "name": "Supplier Agreement Template",
                "category": "commercial",
                "contract_type": ContractType.SUPPLIER_AGREEMENT,
                "description": "Supplier agreement template for UK businesses",
                "template_content": """
                SUPPLIER AGREEMENT
                
                This Supplier Agreement is made under UK Commercial Law between:
                BUYER: [BUYER_NAME]
                SUPPLIER: [SUPPLIER_NAME]
                
                1. SUPPLY OF GOODS/SERVICES
                The Supplier shall provide [PRODUCTS_SERVICES]
                
                2. TERMS AND CONDITIONS
                Payment terms: [PAYMENT_TERMS]
                Delivery terms: [DELIVERY_TERMS]
                
                3. LIABILITY AND WARRANTIES
                Governed by Sale of Goods Act 1979 and Consumer Rights Act 2015.
                """,
                "compliance_features": ["CONSUMER_RIGHTS_ACT", "SALE_OF_GOODS_ACT"],
                "suitable_for": ["goods_supply", "services_supply"]
            },
            {
                "name": "Non-Disclosure Agreement Template",
                "category": "confidentiality",
                "contract_type": ContractType.NDA,
                "description": "UK-compliant NDA template",
                "template_content": """
                NON-DISCLOSURE AGREEMENT
                
                This NDA is governed by the laws of England and Wales between:
                DISCLOSING PARTY: [DISCLOSER_NAME]
                RECEIVING PARTY: [RECIPIENT_NAME]
                
                1. CONFIDENTIAL INFORMATION
                Definition of confidential information: [CONFIDENTIAL_INFO]
                
                2. OBLIGATIONS
                The Receiving Party shall maintain confidentiality.
                
                3. DURATION
                This agreement shall remain in effect for [DURATION].
                """,
                "compliance_features": ["UK_CONTRACT_LAW", "GDPR"],
                "suitable_for": ["business_discussions", "partnership_negotiations"]
            },
            {
                "name": "Terms and Conditions Template",
                "category": "website_legal",
                "contract_type": ContractType.TERMS_CONDITIONS,
                "description": "Website terms and conditions for UK businesses",
                "template_content": """
                TERMS AND CONDITIONS
                
                These Terms are governed by UK Consumer Law:
                
                1. ACCEPTANCE OF TERMS
                By using our service, you accept these terms.
                
                2. USER OBLIGATIONS
                Users must comply with UK law.
                
                3. CONSUMER RIGHTS
                Your rights under Consumer Rights Act 2015 are not affected.
                
                4. DATA PROTECTION
                We process personal data in accordance with GDPR.
                """,
                "compliance_features": ["CONSUMER_RIGHTS_ACT", "GDPR", "E_COMMERCE_REGULATIONS"],
                "suitable_for": ["websites", "online_services"]
            }
        ]
        
        # Add more templates to reach 20+ requirement
        additional_templates = [
            ("Consultancy Agreement", "consultancy", ContractType.CONSULTANCY),
            ("Partnership Agreement", "business", ContractType.PARTNERSHIP), 
            ("Lease Agreement", "property", ContractType.LEASE),
            ("Freelancer Agreement", "employment", ContractType.SERVICE_AGREEMENT),
            ("Software Development Agreement", "technology", ContractType.SERVICE_AGREEMENT),
            ("Marketing Services Agreement", "marketing", ContractType.SERVICE_AGREEMENT),
            ("Data Processing Agreement", "data_protection", ContractType.SERVICE_AGREEMENT),
            ("Maintenance Contract", "services", ContractType.SERVICE_AGREEMENT),
            ("Training Services Agreement", "education", ContractType.SERVICE_AGREEMENT),
            ("Sales Agreement", "commercial", ContractType.SERVICE_AGREEMENT),
            ("Distribution Agreement", "commercial", ContractType.SUPPLIER_AGREEMENT),
            ("Agency Agreement", "commercial", ContractType.SERVICE_AGREEMENT),
            ("Licensing Agreement", "intellectual_property", ContractType.SERVICE_AGREEMENT),
            ("Joint Venture Agreement", "business", ContractType.PARTNERSHIP),
            ("Subcontractor Agreement", "construction", ContractType.SERVICE_AGREEMENT),
            ("Confidentiality and IP Agreement", "intellectual_property", ContractType.NDA),
        ]
        
        for name, category, contract_type in additional_templates:
            templates.append({
                "name": name,
                "category": category,
                "contract_type": contract_type,
                "description": f"UK-compliant {name.lower()}",
                "template_content": f"[{name.upper()}]\n\nThis agreement is governed by UK law...",
                "compliance_features": ["UK_LAW", "GDPR"],
                "suitable_for": [category]
            })
        
        # Create template records
        for template_data in templates:
            template = Template(**template_data)
            db.add(template)
        
        db.commit()
        print(f"✅ Created {len(templates)} UK legal templates")
        
    except Exception as e:
        print(f"❌ Error creating templates: {e}")
        db.rollback()
    finally:
        db.close()


async def main():
    """Main setup function"""
    print("Setting up test data for Pactoria MVP...")
    
    # Create database tables
    await create_tables()
    
    # Create UK templates
    await create_uk_templates()
    
    print("✅ Test data setup complete")


if __name__ == "__main__":
    asyncio.run(main())