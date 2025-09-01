"""
Template seeder for Pactoria MVP
Seeds common UK contract templates into the database
"""
import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from app.core.config import settings
from app.core.database import get_db
from app.infrastructure.database.models import Template, ContractType


# UK SME contract templates
TEMPLATE_DATA = [
    {
        "name": "UK Employment Contract - Full-time",
        "category": "Employment",
        "contract_type": ContractType.EMPLOYMENT_CONTRACT,
        "description": "Comprehensive full-time employment contract compliant with UK employment law",
        "template_content": """EMPLOYMENT AGREEMENT

This Employment Agreement is made between:

EMPLOYER: {{company_name}}
Address: {{company_address}}

EMPLOYEE: {{employee_name}}
Address: {{employee_address}}

1. COMMENCEMENT OF EMPLOYMENT
Your employment with the Company will commence on {{start_date}}.

2. JOB TITLE AND DUTIES
Your job title is {{job_title}}. Your duties are set out in the job description which may be updated from time to time.

3. PLACE OF WORK
Your normal place of work will be {{work_location}}.

4. HOURS OF WORK
Your normal working hours are {{working_hours}} per week, Monday to Friday.

5. SALARY
Your annual salary is £{{annual_salary}} payable monthly in arrears.

6. HOLIDAYS
You are entitled to {{holiday_days}} days paid annual leave per year plus public holidays.

7. NOTICE PERIOD
Either party may terminate this agreement by giving {{notice_period}} written notice.

8. CONFIDENTIALITY
You must not disclose confidential information during or after employment.

9. DATA PROTECTION
The Company processes personal data in accordance with UK GDPR and Data Protection Act 2018.

This contract is governed by English law and subject to the jurisdiction of English courts.

Employer: _________________     Employee: _________________
Date: ___________              Date: ___________""",
        "compliance_features": [
            "UK Employment Rights Act 1996",
            "Working Time Regulations 1998",
            "UK GDPR compliance",
            "Equality Act 2010",
            "Health and Safety at Work Act 1974"
        ],
        "legal_notes": "This template complies with UK employment law requirements. Ensure job description and company handbook are referenced appropriately.",
        "suitable_for": ["SME", "Startup", "Traditional business"]
    },
    {
        "name": "Service Agreement - Professional Services",
        "category": "Professional Services",
        "contract_type": ContractType.SERVICE_AGREEMENT,
        "description": "Professional services agreement for UK businesses engaging consultants or service providers",
        "template_content": """PROFESSIONAL SERVICES AGREEMENT

This Agreement is made between:

CLIENT: {{client_name}}
Address: {{client_address}}

SERVICE PROVIDER: {{provider_name}}
Address: {{provider_address}}

1. SERVICES
The Service Provider agrees to provide the following services:
{{service_description}}

2. TERM
This Agreement shall commence on {{start_date}} and continue until {{end_date}} unless terminated earlier.

3. FEES AND PAYMENT
The total fee is £{{service_fee}} ({{currency}}) payable {{payment_terms}}.

4. INTELLECTUAL PROPERTY
All work product created shall be owned by {{ip_owner}}.

5. CONFIDENTIALITY
Both parties agree to maintain confidentiality of proprietary information.

6. LIABILITY
Liability is limited to the total fees paid under this Agreement.

7. TERMINATION
Either party may terminate with {{notice_period}} written notice.

8. GOVERNING LAW
This Agreement is governed by the laws of England and Wales.

9. DATA PROTECTION
Personal data will be processed in compliance with UK GDPR.

Client: _________________     Service Provider: _________________
Date: ___________           Date: ___________""",
        "compliance_features": [
            "UK contract law compliance",
            "UK GDPR data protection",
            "Consumer Rights Act 2015",
            "Late Payment Legislation"
        ],
        "legal_notes": "Suitable for consulting, design, development, and other professional services. Adjust liability clauses based on service risk level.",
        "suitable_for": ["Consultants", "Freelancers", "Professional services", "Creative agencies"]
    },
    {
        "name": "Non-Disclosure Agreement (NDA) - Mutual",
        "category": "Confidentiality",
        "contract_type": ContractType.NDA,
        "description": "Mutual non-disclosure agreement for protecting confidential information",
        "template_content": """MUTUAL NON-DISCLOSURE AGREEMENT

This Agreement is made between:

PARTY A: {{party_a_name}}
Address: {{party_a_address}}

PARTY B: {{party_b_name}}
Address: {{party_b_address}}

1. PURPOSE
The parties wish to explore {{business_purpose}} and may disclose confidential information.

2. CONFIDENTIAL INFORMATION
Confidential Information means any information marked as confidential or that would reasonably be considered confidential.

3. OBLIGATIONS
Each party agrees to:
- Keep confidential information secret
- Use it only for the stated purpose
- Not disclose to third parties
- Return or destroy upon request

4. EXCEPTIONS
This Agreement does not apply to information that:
- Is publicly available
- Was known before disclosure
- Is independently developed
- Is required to be disclosed by law

5. TERM
This Agreement remains in effect for {{duration}} from the date of signing.

6. REMEDIES
Breach may cause irreparable harm warranting injunctive relief.

7. GOVERNING LAW
This Agreement is governed by English law.

Party A: _________________     Party B: _________________
Date: ___________            Date: ___________""",
        "compliance_features": [
            "Trade secrets protection",
            "UK contract law",
            "Equitable remedies",
            "Commercial confidentiality"
        ],
        "legal_notes": "Suitable for business discussions, partnerships, and due diligence. Consider specific carve-outs for particular industries.",
        "suitable_for": ["Startups", "M&A", "Joint ventures", "Business partnerships"]
    },
    {
        "name": "Supplier/Vendor Agreement",
        "category": "Commercial",
        "contract_type": ContractType.SUPPLIER_AGREEMENT,
        "description": "Standard supplier agreement for goods and services procurement",
        "template_content": """SUPPLIER AGREEMENT

This Agreement is made between:

BUYER: {{buyer_name}}
Address: {{buyer_address}}

SUPPLIER: {{supplier_name}}
Address: {{supplier_address}}

1. SUPPLY OF GOODS/SERVICES
The Supplier agrees to supply {{goods_services}} in accordance with specifications.

2. PRICING AND PAYMENT
Prices are as set out in Schedule A. Payment terms: {{payment_terms}}.

3. DELIVERY
Delivery shall be to {{delivery_address}} on {{delivery_schedule}}.

4. QUALITY AND WARRANTIES
Goods/services must meet agreed specifications and industry standards.

5. RISK AND TITLE
Risk passes on delivery. Title passes on payment in full.

6. LIABILITY AND INSURANCE
Supplier maintains insurance of £{{insurance_amount}} and limits liability accordingly.

7. TERMINATION
Either party may terminate with {{notice_period}} notice or immediately for material breach.

8. FORCE MAJEURE
Neither party is liable for delays due to circumstances beyond reasonable control.

9. COMPLIANCE
Supplier complies with all applicable laws including health and safety regulations.

10. DATA PROTECTION
Personal data processed in accordance with UK GDPR requirements.

Buyer: _________________     Supplier: _________________
Date: ___________          Date: ___________""",
        "compliance_features": [
            "Sale of Goods Act 1979",
            "Supply of Goods and Services Act 1982",
            "Consumer Rights Act 2015",
            "UK GDPR compliance",
            "Health and Safety regulations"
        ],
        "legal_notes": "Suitable for ongoing supplier relationships. Adjust terms based on goods/services complexity and value.",
        "suitable_for": ["Manufacturing", "Retail", "Service businesses", "E-commerce"]
    },
    {
        "name": "Website Terms and Conditions",
        "category": "Digital",
        "contract_type": ContractType.TERMS_CONDITIONS,
        "description": "Standard terms and conditions for UK business websites",
        "template_content": """WEBSITE TERMS AND CONDITIONS

1. ABOUT THESE TERMS
These terms govern your use of {{website_name}} (the "Website") operated by {{company_name}}.

2. USING OUR WEBSITE
By using our Website, you accept these terms. We may update these terms at any time.

3. SERVICES
We provide {{service_description}} through our Website.

4. USER ACCOUNTS
You are responsible for maintaining account security and all activities under your account.

5. PAYMENT AND REFUNDS
{{payment_terms}}
Refund policy: {{refund_policy}}

6. INTELLECTUAL PROPERTY
All content on the Website is owned by {{company_name}} or licensed to us.

7. USER CONTENT
You grant us a licence to use content you submit to the Website.

8. PROHIBITED USES
You must not use the Website for illegal purposes or in violation of these terms.

9. LIABILITY
Our liability is limited to the maximum extent permitted by law.

10. PRIVACY
Personal data is processed according to our Privacy Policy and UK GDPR.

11. COOKIES
We use cookies as described in our Cookie Policy.

12. GOVERNING LAW
These terms are governed by English law and subject to English courts.

13. CONTACT
Questions about these terms: {{contact_email}}

Last updated: {{last_updated}}""",
        "compliance_features": [
            "E-Commerce Regulations 2002",
            "Consumer Rights Act 2015",
            "UK GDPR compliance",
            "Cookie Regulations",
            "Distance Selling Regulations"
        ],
        "legal_notes": "Essential for any UK business website. Must be easily accessible and clearly presented to users.",
        "suitable_for": ["E-commerce", "SaaS", "Digital services", "Online businesses"]
    },
    {
        "name": "Consultancy Agreement - Fixed Term",
        "category": "Professional Services",
        "contract_type": ContractType.CONSULTANCY,
        "description": "Fixed-term consultancy agreement for specialist advisory services",
        "template_content": """CONSULTANCY AGREEMENT

This Agreement is made between:

CLIENT: {{client_name}}
Address: {{client_address}}

CONSULTANT: {{consultant_name}}
Address: {{consultant_address}}

1. SERVICES
The Consultant will provide {{consulting_services}} for the project "{{project_name}}".

2. TERM
This Agreement is for {{project_duration}} commencing {{start_date}}.

3. FEES
Total fee: £{{total_fee}}
Payment schedule: {{payment_schedule}}

4. WORKING ARRANGEMENTS
The Consultant will work {{work_arrangement}} and provide regular updates.

5. DELIVERABLES
Key deliverables: {{deliverables}}
Delivery dates: {{delivery_dates}}

6. INTELLECTUAL PROPERTY
Work product belongs to {{ip_ownership}} unless otherwise specified.

7. CONFIDENTIALITY
Consultant agrees to maintain strict confidentiality of Client information.

8. STATUS
Consultant is an independent contractor, not an employee.

9. LIABILITY
Consultant's liability is limited to fees paid under this Agreement.

10. TERMINATION
Either party may terminate with {{notice_period}} written notice.

11. GOVERNING LAW
This Agreement is governed by English law.

Client: _________________     Consultant: _________________
Date: ___________           Date: ___________""",
        "compliance_features": [
            "IR35 compliance considerations",
            "Professional indemnity requirements",
            "UK contract law",
            "Self-employment regulations"
        ],
        "legal_notes": "Consider IR35 implications for tax status. Ensure clear independence indicators are included.",
        "suitable_for": ["Management consultants", "Technical specialists", "Interim managers", "Project consultants"]
    }
]


def seed_templates(db: Session):
    """Seed template data into the database"""
    try:
        print("Starting template seeding...")
        
        # Check if templates already exist
        existing_count = db.query(Template).count()
        if existing_count > 0:
            print(f"Templates already exist ({existing_count}). Skipping seeding.")
            return
        
        # Create templates
        for template_data in TEMPLATE_DATA:
            template = Template(**template_data)
            db.add(template)
            print(f"Added template: {template.name}")
        
        db.commit()
        print(f"Successfully seeded {len(TEMPLATE_DATA)} templates!")
        
    except Exception as e:
        print(f"Error seeding templates: {e}")
        db.rollback()
        raise


async def async_seed_templates():
    """Async wrapper for template seeding"""
    try:
        # Use the same engine and session as the main app
        from app.core.database import SessionLocal
        
        with SessionLocal() as db:
            seed_templates(db)
            
    except Exception as e:
        print(f"Failed to seed templates: {e}")
        raise


if __name__ == "__main__":
    # Run seeding
    asyncio.run(async_seed_templates())