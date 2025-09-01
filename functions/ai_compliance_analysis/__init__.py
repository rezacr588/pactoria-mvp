"""
Azure Functions - AI Compliance Analysis Endpoint
Analyzes contracts for UK legal compliance
"""
import json
import logging
import os
from typing import Dict, Any, List
import azure.functions as func
from groq import Groq
import tiktoken
import re


# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Groq client
groq_client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

# UK Legal Compliance Requirements
UK_COMPLIANCE_CHECKLIST = {
    "governing_law": {
        "description": "Contract specifies English/Welsh/Scottish law",
        "keywords": ["english law", "laws of england", "welsh law", "scottish law"],
        "weight": 0.15
    },
    "jurisdiction": {
        "description": "Court jurisdiction specified for UK",
        "keywords": ["english courts", "courts of england", "uk jurisdiction", "british courts"],
        "weight": 0.15
    },
    "data_protection": {
        "description": "GDPR and Data Protection Act 2018 compliance",
        "keywords": ["gdpr", "data protection act 2018", "data protection", "personal data"],
        "weight": 0.20
    },
    "consumer_rights": {
        "description": "Consumer Rights Act 2015 compliance (if applicable)",
        "keywords": ["consumer rights act", "consumer protection", "unfair terms"],
        "weight": 0.10
    },
    "statutory_requirements": {
        "description": "Statutory notice periods and requirements",
        "keywords": ["statutory", "written notice", "notice period"],
        "weight": 0.10
    },
    "company_registration": {
        "description": "Company registration details included",
        "keywords": ["company registration", "registered office", "companies house"],
        "weight": 0.10
    },
    "payment_terms": {
        "description": "Late payment interest rates comply with UK law",
        "keywords": ["bank of england", "base rate", "late payment", "interest"],
        "weight": 0.10
    },
    "termination_clauses": {
        "description": "Proper termination and notice provisions",
        "keywords": ["termination", "notice", "breach", "cure period"],
        "weight": 0.10
    }
}

def count_tokens(text: str) -> int:
    """Count tokens for cost monitoring"""
    try:
        encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
        return len(encoding.encode(text))
    except Exception:
        return len(text) // 4

def analyze_compliance_with_groq(contract_text: str) -> Dict[str, Any]:
    """Analyze contract compliance using Groq API"""
    
    # Create comprehensive analysis prompt
    prompt = f"""
You are a UK legal compliance expert. Analyze the following contract for UK legal compliance.

Contract Text:
{contract_text}

Provide a detailed compliance analysis covering:

1. GOVERNING LAW & JURISDICTION
- Is English/Welsh/Scottish law specified?
- Are UK courts designated for jurisdiction?

2. DATA PROTECTION COMPLIANCE
- GDPR compliance mentioned?
- Data Protection Act 2018 referenced?
- Personal data handling addressed?

3. CONSUMER PROTECTION (if applicable)
- Consumer Rights Act 2015 compliance
- Unfair contract terms avoided

4. STATUTORY REQUIREMENTS
- Proper notice periods
- Written notice requirements
- Company registration details

5. PAYMENT TERMS
- Late payment interest rates
- Bank of England base rate references

6. TERMINATION & BREACH
- Proper termination clauses
- Cure periods specified
- Notice requirements

7. OVERALL ASSESSMENT
- Compliance score (0-100)
- Major issues identified
- Recommendations for improvement

Format your response as a structured analysis with specific recommendations.
"""
    
    try:
        input_tokens = count_tokens(prompt + contract_text)
        logger.info(f"Compliance analysis input tokens: {input_tokens}")
        
        response = groq_client.chat.completions.create(
            model="llama-3.1-70b-versatile",  # More capable model for legal analysis
            messages=[{
                "role": "system",
                "content": "You are a UK legal compliance expert with deep knowledge of English contract law, GDPR, consumer protection, and commercial regulations."
            }, {
                "role": "user", 
                "content": prompt
            }],
            max_tokens=1500,
            temperature=0.1
        )
        
        analysis_text = response.choices[0].message.content
        output_tokens = count_tokens(analysis_text)
        
        logger.info(f"Compliance analysis output tokens: {output_tokens}")
        
        return {
            "ai_analysis": analysis_text,
            "token_usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens
            }
        }
        
    except Exception as e:
        logger.error(f"Groq API error: {str(e)}")
        raise

def calculate_detailed_compliance_score(contract_text: str) -> Dict[str, Any]:
    """Calculate detailed compliance score using keyword analysis"""
    
    contract_lower = contract_text.lower()
    total_score = 0.0
    max_possible_score = 0.0
    detailed_scores = {}
    
    for category, details in UK_COMPLIANCE_CHECKLIST.items():
        category_score = 0.0
        found_keywords = []
        
        # Check for keywords in this category
        for keyword in details["keywords"]:
            if keyword.lower() in contract_lower:
                category_score = 1.0  # Found compliance indicator
                found_keywords.append(keyword)
                break
        
        # Weight the score
        weighted_score = category_score * details["weight"]
        total_score += weighted_score
        max_possible_score += details["weight"]
        
        detailed_scores[category] = {
            "score": category_score,
            "weighted_score": weighted_score,
            "found_keywords": found_keywords,
            "description": details["description"],
            "compliant": category_score > 0
        }
    
    # Calculate overall percentage
    overall_percentage = (total_score / max_possible_score) * 100 if max_possible_score > 0 else 0
    
    return {
        "overall_score": round(overall_percentage, 1),
        "total_weighted_score": round(total_score, 3),
        "max_possible_score": round(max_possible_score, 3),
        "detailed_scores": detailed_scores,
        "compliance_level": get_compliance_level(overall_percentage)
    }

def get_compliance_level(score: float) -> str:
    """Get compliance level based on score"""
    if score >= 95:
        return "Excellent"
    elif score >= 85:
        return "Good"
    elif score >= 70:
        return "Acceptable" 
    elif score >= 50:
        return "Needs Improvement"
    else:
        return "Poor"

def extract_key_issues(contract_text: str, compliance_scores: Dict[str, Any]) -> List[str]:
    """Extract key compliance issues"""
    issues = []
    
    # Check for missing critical elements
    for category, details in compliance_scores["detailed_scores"].items():
        if not details["compliant"]:
            if category in ["governing_law", "jurisdiction", "data_protection"]:
                issues.append(f"CRITICAL: Missing {details['description']}")
            else:
                issues.append(f"Missing {details['description']}")
    
    # Check for specific problematic patterns
    contract_lower = contract_text.lower()
    
    if "foreign law" in contract_lower or "us law" in contract_lower:
        issues.append("WARNING: Non-UK governing law detected")
    
    if "arbitration" in contract_lower and "uk" not in contract_lower:
        issues.append("WARNING: Foreign arbitration clause may not be UK compliant")
    
    return issues

def generate_recommendations(compliance_scores: Dict[str, Any], issues: List[str]) -> List[str]:
    """Generate improvement recommendations"""
    recommendations = []
    
    # Based on compliance scores
    for category, details in compliance_scores["detailed_scores"].items():
        if not details["compliant"]:
            if category == "governing_law":
                recommendations.append("Add governing law clause: 'This Agreement shall be governed by and construed in accordance with English law'")
            elif category == "jurisdiction":
                recommendations.append("Add jurisdiction clause: 'The parties submit to the exclusive jurisdiction of the English courts'")
            elif category == "data_protection":
                recommendations.append("Add GDPR compliance clause: 'Both parties agree to comply with the General Data Protection Regulation (GDPR) and the Data Protection Act 2018'")
            elif category == "payment_terms":
                recommendations.append("Add late payment clause: 'Interest on overdue amounts at 8% per annum above the Bank of England base rate'")
    
    # Based on overall score
    overall_score = compliance_scores["overall_score"]
    if overall_score < 70:
        recommendations.append("Consider having this contract reviewed by a UK qualified solicitor")
    
    if overall_score < 50:
        recommendations.append("URGENT: This contract requires significant revision to meet UK legal standards")
    
    return recommendations

def main(req: func.HttpRequest) -> func.HttpResponse:
    """Main Azure Function handler"""
    
    logger.info('AI Compliance Analysis function triggered')
    
    try:
        # Parse request
        req_body = req.get_json()
        if not req_body:
            return func.HttpResponse(
                json.dumps({"error": "Request body required"}),
                status_code=400,
                headers={"Content-Type": "application/json"}
            )
        
        contract_text = req_body.get('contract_text')
        if not contract_text:
            return func.HttpResponse(
                json.dumps({"error": "contract_text field required"}),
                status_code=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Validate contract length
        if len(contract_text) > 50000:  # Limit for cost control
            return func.HttpResponse(
                json.dumps({"error": "Contract text too long (max 50,000 characters)"}),
                status_code=400,
                headers={"Content-Type": "application/json"}
            )
        
        logger.info(f"Analyzing contract of {len(contract_text)} characters")
        
        # Perform detailed compliance analysis
        compliance_scores = calculate_detailed_compliance_score(contract_text)
        
        # Extract key issues
        key_issues = extract_key_issues(contract_text, compliance_scores)
        
        # Generate recommendations
        recommendations = generate_recommendations(compliance_scores, key_issues)
        
        # Get AI analysis (if requested and score is low)
        ai_analysis = None
        token_usage = None
        
        if req_body.get('include_ai_analysis', False) or compliance_scores["overall_score"] < 80:
            try:
                ai_result = analyze_compliance_with_groq(contract_text)
                ai_analysis = ai_result["ai_analysis"]
                token_usage = ai_result["token_usage"]
            except Exception as e:
                logger.warning(f"AI analysis failed: {str(e)}")
                ai_analysis = "AI analysis unavailable"
        
        # Compile final result
        result = {
            "compliance_analysis": {
                "overall_score": compliance_scores["overall_score"],
                "compliance_level": compliance_scores["compliance_level"],
                "detailed_scores": compliance_scores["detailed_scores"],
                "key_issues": key_issues,
                "recommendations": recommendations
            },
            "ai_analysis": ai_analysis,
            "token_usage": token_usage,
            "analyzed_at": func.utcnow().isoformat(),
            "contract_length": len(contract_text)
        }
        
        logger.info(f"Compliance analysis completed. Score: {compliance_scores['overall_score']}%")
        
        return func.HttpResponse(
            json.dumps(result, indent=2),
            status_code=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": "Internal server error"}),
            status_code=500,
            headers={"Content-Type": "application/json"}
        )