"""
Azure Functions - AI Contract Generation Endpoint
Optimized for consumption plan with minimal memory usage
"""
import json
import logging
import os
from typing import Dict, Any
import azure.functions as func
from groq import Groq
import tiktoken


# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Groq client
groq_client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

# UK Legal Contract Templates
CONTRACT_TEMPLATES = {
    "service_agreement": """
TERMS OF SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into on [DATE] between:

CLIENT: [CLIENT_NAME]
Address: [CLIENT_ADDRESS] 
Company Registration: [CLIENT_REGISTRATION]

SERVICE PROVIDER: [PROVIDER_NAME]
Address: [PROVIDER_ADDRESS]
Company Registration: [PROVIDER_REGISTRATION]

1. SERVICES
The Provider agrees to provide the following services:
[SERVICES_DESCRIPTION]

2. TERM
This Agreement shall commence on [START_DATE] and continue for [DURATION].

3. PAYMENT TERMS
- Total Fee: £[AMOUNT]
- Payment Schedule: [PAYMENT_TERMS]
- Late Payment: Interest at 8% per annum above Bank of England base rate

4. UK LEGAL COMPLIANCE
This Agreement is governed by English Law and subject to the jurisdiction of English Courts.

5. DATA PROTECTION
Both parties agree to comply with UK GDPR and Data Protection Act 2018.

6. INTELLECTUAL PROPERTY
All intellectual property rights remain with the respective owners as defined herein.

7. TERMINATION
Either party may terminate this Agreement with [NOTICE_PERIOD] written notice.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

CLIENT: _________________ 
Date: _________

SERVICE PROVIDER: _________________
Date: _________
""",
    
    "employment_contract": """
EMPLOYMENT CONTRACT

EMPLOYER: [EMPLOYER_NAME]
Address: [EMPLOYER_ADDRESS]
Company Registration: [EMPLOYER_REGISTRATION]

EMPLOYEE: [EMPLOYEE_NAME]
Address: [EMPLOYEE_ADDRESS]
National Insurance: [NI_NUMBER]

1. EMPLOYMENT DETAILS
Position: [JOB_TITLE]
Start Date: [START_DATE]
Salary: £[SALARY] per annum
Working Hours: [HOURS] hours per week

2. PROBATIONARY PERIOD
[PROBATION_LENGTH] months from start date

3. NOTICE PERIODS
Employee: [EMPLOYEE_NOTICE]
Employer: [EMPLOYER_NOTICE]

4. ANNUAL LEAVE
[HOLIDAY_DAYS] days per year plus UK bank holidays

5. SICK PAY
Statutory Sick Pay as per UK legislation

6. PENSION
Auto-enrollment in company pension scheme as required by UK law

7. CONFIDENTIALITY
Employee agrees to maintain confidentiality of company information

8. DATA PROTECTION
This contract complies with UK GDPR and employment law

This contract is governed by English law.

EMPLOYER: _________________
Date: _________

EMPLOYEE: _________________
Date: _________
""",

    "nda": """
NON-DISCLOSURE AGREEMENT (NDA)

DISCLOSING PARTY: [DISCLOSING_PARTY]
RECEIVING PARTY: [RECEIVING_PARTY]

Date: [DATE]

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means [CONFIDENTIAL_INFO_DEFINITION]

2. OBLIGATIONS
The Receiving Party agrees to:
- Keep information confidential
- Not disclose to third parties
- Use only for permitted purposes

3. EXCLUSIONS
This Agreement does not apply to information that:
- Is publicly available
- Was known before disclosure
- Is independently developed

4. TERM
This Agreement remains in effect for [DURATION] years

5. UK LEGAL COMPLIANCE
Governed by English law and jurisdiction of English Courts

6. DATA PROTECTION
Complies with UK GDPR and Data Protection Act 2018

DISCLOSING PARTY: _________________
Date: _________

RECEIVING PARTY: _________________
Date: _________
"""
}

def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
    """Count tokens in text for cost estimation"""
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except Exception:
        # Fallback estimation: ~4 characters per token
        return len(text) // 4

def generate_contract_with_groq(
    contract_type: str,
    client_details: Dict[str, str],
    specific_requirements: str
) -> Dict[str, Any]:
    """Generate contract using Groq API"""
    
    # Get base template
    base_template = CONTRACT_TEMPLATES.get(contract_type)
    if not base_template:
        raise ValueError(f"Unknown contract type: {contract_type}")
    
    # Create prompt for AI generation
    prompt = f"""
You are a UK legal expert specializing in commercial contracts. Generate a legally compliant contract based on the following:

Contract Type: {contract_type}
Base Template: {base_template}

Client Details:
{json.dumps(client_details, indent=2)}

Specific Requirements:
{specific_requirements}

Instructions:
1. Use the base template as a foundation
2. Fill in all placeholder fields with provided details
3. Ensure UK legal compliance (English law, UK GDPR, etc.)
4. Add specific clauses for the requirements
5. Use clear, professional language
6. Include all necessary legal provisions

Generate a complete, ready-to-use contract:
"""
    
    try:
        # Count tokens for monitoring
        input_tokens = count_tokens(prompt)
        logger.info(f"Input tokens: {input_tokens}")
        
        # Call Groq API
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Fast and cost-effective
            messages=[{
                "role": "system", 
                "content": "You are a UK legal expert specializing in contract generation. Always ensure UK legal compliance."
            }, {
                "role": "user",
                "content": prompt
            }],
            max_tokens=2048,  # Limit for cost control
            temperature=0.1   # Low temperature for consistency
        )
        
        generated_contract = response.choices[0].message.content
        output_tokens = count_tokens(generated_contract)
        
        logger.info(f"Output tokens: {output_tokens}")
        
        # Calculate compliance score (simplified)
        compliance_score = calculate_compliance_score(generated_contract)
        
        return {
            "contract": generated_contract,
            "compliance_score": compliance_score,
            "token_usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens
            },
            "template_used": contract_type,
            "generated_at": func.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Groq API error: {str(e)}")
        raise

def calculate_compliance_score(contract_text: str) -> float:
    """Calculate UK legal compliance score (simplified)"""
    
    # Key compliance indicators for UK contracts
    compliance_indicators = [
        "english law",
        "jurisdiction",
        "gdpr",
        "data protection act 2018",
        "written notice",
        "company registration",
        "bank of england",
        "statutory"
    ]
    
    contract_lower = contract_text.lower()
    score = 0.0
    
    for indicator in compliance_indicators:
        if indicator in contract_lower:
            score += 1.0
    
    # Normalize score (0-1)
    max_score = len(compliance_indicators)
    normalized_score = min(score / max_score, 1.0)
    
    return round(normalized_score, 2)

def validate_request(req_body: Dict[str, Any]) -> Dict[str, str]:
    """Validate request parameters"""
    
    required_fields = ['contract_type', 'client_details']
    for field in required_fields:
        if field not in req_body:
            raise ValueError(f"Missing required field: {field}")
    
    contract_type = req_body['contract_type']
    if contract_type not in CONTRACT_TEMPLATES:
        available_types = list(CONTRACT_TEMPLATES.keys())
        raise ValueError(f"Invalid contract type. Available: {available_types}")
    
    client_details = req_body['client_details']
    if not isinstance(client_details, dict):
        raise ValueError("client_details must be a dictionary")
    
    return {
        'contract_type': contract_type,
        'client_details': client_details,
        'specific_requirements': req_body.get('specific_requirements', '')
    }

def main(req: func.HttpRequest) -> func.HttpResponse:
    """Main Azure Function handler"""
    
    logger.info('AI Contract Generation function triggered')
    
    try:
        # Parse request
        req_body = req.get_json()
        if not req_body:
            return func.HttpResponse(
                json.dumps({"error": "Request body required"}),
                status_code=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Validate request
        validated_params = validate_request(req_body)
        
        # Generate contract
        result = generate_contract_with_groq(
            contract_type=validated_params['contract_type'],
            client_details=validated_params['client_details'],
            specific_requirements=validated_params['specific_requirements']
        )
        
        logger.info(f"Contract generated successfully. Compliance score: {result['compliance_score']}")
        
        return func.HttpResponse(
            json.dumps(result, indent=2),
            status_code=200,
            headers={"Content-Type": "application/json"}
        )
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=400,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": "Internal server error"}),
            status_code=500,
            headers={"Content-Type": "application/json"}
        )