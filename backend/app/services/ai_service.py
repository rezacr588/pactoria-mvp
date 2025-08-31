"""
AI Service for Pactoria MVP
Integrates with Groq API for contract generation and analysis
Uses OpenAI GPT-OSS-120B model for high-quality legal content
"""
import time
import json
import logging
from typing import Dict, List, Optional, Any
from groq import Groq
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIGenerationRequest(BaseModel):
    """AI generation request model"""
    prompt: str
    context: Optional[Dict[str, Any]] = None
    max_tokens: Optional[int] = 2000
    temperature: Optional[float] = 0.7


class AIGenerationResponse(BaseModel):
    """AI generation response model"""
    content: str
    model_name: str
    model_version: Optional[str]
    processing_time_ms: float
    token_usage: Optional[Dict[str, int]]
    confidence_score: Optional[float]


class ContractGenerationResponse(AIGenerationResponse):
    """Contract-specific generation response model"""
    pass


class ContractGenerationRequest(BaseModel):
    """Contract generation request model"""
    plain_english_input: str
    contract_type: str
    client_name: Optional[str] = None
    supplier_name: Optional[str] = None
    contract_value: Optional[float] = None
    currency: Optional[str] = "GBP"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    additional_terms: Optional[List[str]] = None


class ComplianceAnalysisRequest(BaseModel):
    """Compliance analysis request model"""
    contract_content: str
    contract_type: str
    jurisdiction: str = "UK"


class ComplianceAnalysisResponse(BaseModel):
    """Compliance analysis response model"""
    overall_score: float
    gdpr_compliance: float
    employment_law_compliance: float
    consumer_rights_compliance: float
    commercial_terms_compliance: float
    risk_score: int
    risk_factors: List[str]
    recommendations: List[str]
    analysis_raw: str


class GroqAIService:
    """Groq AI service client"""
    
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL
        logger.info(f"Initialized Groq AI service with model: {self.model}")
    
    async def generate_content(self, request: AIGenerationRequest) -> AIGenerationResponse:
        """Generate content using Groq API"""
        start_time = time.time()
        
        try:
            # Build messages for chat completion
            messages = [
                {
                    "role": "system",
                    "content": "You are a UK legal expert AI assistant specializing in contract drafting and legal compliance. Provide accurate, professional legal content that complies with UK laws and regulations."
                },
                {
                    "role": "user", 
                    "content": request.prompt
                }
            ]
            
            # Add context if provided
            if request.context:
                context_message = f"Additional context: {json.dumps(request.context, indent=2)}"
                messages.insert(1, {"role": "system", "content": context_message})
            
            # Make API call
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=request.temperature
            )
            
            processing_time = (time.time() - start_time) * 1000
            
            # Extract response content
            content = response.choices[0].message.content
            
            # Calculate confidence score (simplified heuristic)
            confidence_score = self._calculate_confidence_score(content, request.prompt)
            
            return AIGenerationResponse(
                content=content,
                model_name=self.model,
                model_version=None,  # Groq doesn't provide version info
                processing_time_ms=processing_time,
                token_usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                } if response.usage else None,
                confidence_score=confidence_score
            )
            
        except Exception as e:
            logger.error(f"AI generation failed: {str(e)}")
            raise Exception(f"AI service error: {str(e)}")
    
    async def generate_contract(self, request: ContractGenerationRequest) -> ContractGenerationResponse:
        """Generate contract from plain English input"""
        
        # Build comprehensive prompt for contract generation
        prompt = self._build_contract_prompt(request)
        
        ai_request = AIGenerationRequest(
            prompt=prompt,
            context={
                "contract_type": request.contract_type,
                "client_name": request.client_name,
                "supplier_name": request.supplier_name,
                "contract_value": request.contract_value,
                "currency": request.currency
            },
            max_tokens=3000,
            temperature=0.3  # Lower temperature for legal documents
        )
        
        response = await self.generate_content(ai_request)
        
        # Convert to ContractGenerationResponse
        return ContractGenerationResponse(
            content=response.content,
            model_name=response.model_name,
            model_version=response.model_version,
            processing_time_ms=response.processing_time_ms,
            token_usage=response.token_usage,
            confidence_score=response.confidence_score
        )
    
    async def analyze_compliance(self, request: ComplianceAnalysisRequest) -> ComplianceAnalysisResponse:
        """Analyze contract for legal compliance"""
        
        prompt = self._build_compliance_prompt(request)
        
        ai_request = AIGenerationRequest(
            prompt=prompt,
            context={
                "contract_type": request.contract_type,
                "jurisdiction": request.jurisdiction
            },
            max_tokens=2000,
            temperature=0.2  # Very low temperature for analysis
        )
        
        response = await self.generate_content(ai_request)
        
        # Parse compliance analysis from AI response
        return self._parse_compliance_response(response.content)
    
    async def validate_contract_compliance(self, contract_content: str, contract_type: str) -> Dict[str, Any]:
        """Validate contract compliance - wrapper for analyze_compliance"""
        request = ComplianceAnalysisRequest(
            contract_content=contract_content,
            contract_type=contract_type
        )
        
        response = await self.analyze_compliance(request)
        
        # Convert to dictionary format expected by API endpoints
        return {
            "overall_score": response.overall_score,
            "gdpr_compliance": response.gdpr_compliance,
            "employment_law_compliance": response.employment_law_compliance,
            "consumer_rights_compliance": response.consumer_rights_compliance,
            "commercial_terms_compliance": response.commercial_terms_compliance,
            "risk_score": response.risk_score,
            "risk_factors": response.risk_factors,
            "recommendations": response.recommendations,
            "analysis_raw": response.analysis_raw
        }
    
    def _build_contract_prompt(self, request: ContractGenerationRequest) -> str:
        """Build comprehensive prompt for contract generation"""
        
        prompt = f"""
Generate a professional UK legal contract based on the following requirements:

CONTRACT TYPE: {request.contract_type}
PLAIN ENGLISH REQUIREMENTS: {request.plain_english_input}

CONTRACT DETAILS:
- Client: {request.client_name or 'Not specified'}
- Supplier: {request.supplier_name or 'Not specified'}
- Value: {f"{request.contract_value} {request.currency}" if request.contract_value else "Not specified"}
- Start Date: {request.start_date or 'Not specified'}  
- End Date: {request.end_date or 'Not specified'}

ADDITIONAL TERMS: {', '.join(request.additional_terms) if request.additional_terms else 'None'}

REQUIREMENTS:
1. Ensure full compliance with UK law and regulations
2. Include all necessary legal clauses and protections
3. Use professional legal language and structure
4. Include GDPR compliance clauses where applicable
5. Add appropriate termination and dispute resolution clauses
6. Ensure the contract is enforceable under UK jurisdiction
7. Include standard UK commercial terms where appropriate

Generate a complete, professional contract that can be used as-is for business purposes.
"""
        
        return prompt.strip()
    
    def _build_compliance_prompt(self, request: ComplianceAnalysisRequest) -> str:
        """Build prompt for compliance analysis"""
        
        prompt = f"""
Analyze the following UK {request.contract_type} contract for legal compliance and provide a detailed assessment:

CONTRACT CONTENT:
{request.contract_content}

ANALYSIS REQUIREMENTS:
1. Overall compliance with UK law (score 0-1)
2. GDPR compliance (score 0-1)
3. Employment law compliance if applicable (score 0-1)
4. Consumer rights compliance if applicable (score 0-1)
5. Commercial terms compliance (score 0-1)
6. Risk assessment (score 1-10, where 1=low risk, 10=high risk)
7. Specific risk factors identified
8. Recommendations for improvement

Please provide the analysis in the following JSON format:
{{
    "overall_score": 0.95,
    "gdpr_compliance": 0.98,
    "employment_law_compliance": 0.92,
    "consumer_rights_compliance": 0.96,
    "commercial_terms_compliance": 0.94,
    "risk_score": 3,
    "risk_factors": ["List of specific risks identified"],
    "recommendations": ["List of improvement recommendations"]
}}

After the JSON, provide a detailed analysis explaining your assessment.
"""
        
        return prompt.strip()
    
    def _calculate_confidence_score(self, content: str, prompt: str) -> float:
        """Calculate confidence score based on content quality heuristics"""
        
        # Simple heuristics for confidence scoring
        score = 0.8  # Base score
        
        # Length-based scoring
        if len(content) > 500:
            score += 0.1
        if len(content) < 100:
            score -= 0.2
            
        # Content quality indicators
        legal_terms = ['whereas', 'hereby', 'agreement', 'party', 'terms', 'conditions']
        found_terms = sum(1 for term in legal_terms if term.lower() in content.lower())
        score += min(found_terms * 0.02, 0.1)
        
        # Ensure score is between 0 and 1
        return max(0.0, min(1.0, score))
    
    def _parse_compliance_response(self, content: str) -> ComplianceAnalysisResponse:
        """Parse compliance analysis response from AI"""
        
        try:
            # Try to extract JSON from response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            
            if json_start != -1 and json_end != -1:
                json_content = content[json_start:json_end]
                parsed_data = json.loads(json_content)
                
                return ComplianceAnalysisResponse(
                    overall_score=parsed_data.get('overall_score', 0.8),
                    gdpr_compliance=parsed_data.get('gdpr_compliance', 0.8),
                    employment_law_compliance=parsed_data.get('employment_law_compliance', 0.8),
                    consumer_rights_compliance=parsed_data.get('consumer_rights_compliance', 0.8),
                    commercial_terms_compliance=parsed_data.get('commercial_terms_compliance', 0.8),
                    risk_score=parsed_data.get('risk_score', 5),
                    risk_factors=parsed_data.get('risk_factors', []),
                    recommendations=parsed_data.get('recommendations', []),
                    analysis_raw=content
                )
            
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to parse compliance response: {e}")
        
        # Fallback response if parsing fails
        return ComplianceAnalysisResponse(
            overall_score=0.8,
            gdpr_compliance=0.8,
            employment_law_compliance=0.8,
            consumer_rights_compliance=0.8,
            commercial_terms_compliance=0.8,
            risk_score=5,
            risk_factors=["Analysis parsing failed - manual review required"],
            recommendations=["Please review contract manually for compliance"],
            analysis_raw=content
        )

    async def health_check(self) -> Dict[str, Any]:
        """Check AI service health"""
        try:
            # Simple health check by making a minimal API call
            test_request = AIGenerationRequest(
                prompt="Respond with 'OK' if you can process this request.",
                max_tokens=10,
                temperature=0.1
            )
            
            response = await self.generate_content(test_request)
            
            return {
                "status": "healthy",
                "model": self.model,
                "response_time_ms": response.processing_time_ms,
                "token_usage": response.token_usage
            }
            
        except Exception as e:
            logger.error(f"AI service health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "model": self.model
            }


# Global AI service instance
ai_service = GroqAIService()