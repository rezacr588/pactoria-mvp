"""
AI Service Integration for Contract Generation
Provides integration with AI models (OpenAI, Anthropic Claude) for intelligent contract generation
Supports UK legal requirements and business-specific customization
"""

import asyncio
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from enum import Enum
import logging

import openai
from anthropic import AsyncAnthropic

from app.core.config import settings
from app.domain.value_objects import ContractType, Money
from app.domain.entities.company import IndustryType, CompanySize


class AIProvider(str, Enum):
    """Supported AI providers"""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE_OPENAI = "azure_openai"


class ContractComplexity(str, Enum):
    """Contract complexity levels for AI generation"""

    SIMPLE = "simple"  # Basic terms, standard clauses
    MODERATE = "moderate"  # Custom clauses, industry-specific terms
    COMPLEX = "complex"  # Advanced legal structures, multi-party


@dataclass
class ContractGenerationRequest:
    """Request for AI contract generation"""

    plain_english_description: str
    contract_type: ContractType
    client_name: str
    supplier_name: Optional[str]
    contract_value: Optional[Money]
    duration_months: Optional[int]
    industry: IndustryType
    company_size: CompanySize
    complexity: ContractComplexity = ContractComplexity.MODERATE
    uk_jurisdiction: bool = True
    include_gdpr_clauses: bool = True
    include_termination_clauses: bool = True
    include_liability_caps: bool = True
    additional_requirements: List[str] = None
    avoid_clauses: List[str] = None


@dataclass
class AIGenerationResult:
    """Result from AI contract generation"""

    generated_content: str
    confidence_score: float
    processing_time_ms: float
    model_used: str
    model_version: Optional[str]
    tokens_used: Dict[str, int]
    warnings: List[str]
    suggestions: List[str]
    compliance_notes: List[str]
    estimated_legal_review_needed: bool


class AIServiceError(Exception):
    """AI service specific errors"""

    def __init__(
        self,
        message: str,
        provider: Optional[str] = None,
        error_code: Optional[str] = None,
    ):
        super().__init__(message)
        self.provider = provider
        self.error_code = error_code


class BaseAIService(ABC):
    """Abstract base class for AI service implementations"""

    @abstractmethod
    async def generate_contract(
        self, request: ContractGenerationRequest
    ) -> AIGenerationResult:
        """Generate contract content using AI"""
        pass

    @abstractmethod
    async def analyze_contract_compliance(
        self, contract_content: str
    ) -> Dict[str, Any]:
        """Analyze contract for UK legal compliance"""
        pass

    @abstractmethod
    async def suggest_improvements(self, contract_content: str) -> List[str]:
        """Suggest improvements to contract content"""
        pass


class OpenAIContractService(BaseAIService):
    """OpenAI-based contract generation service"""

    def __init__(
        self, api_key: Optional[str] = None, model: str = "gpt-4", max_retries: int = 3
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model
        self.max_retries = max_retries
        self.logger = logging.getLogger(__name__)

        if not self.api_key:
            raise AIServiceError("OpenAI API key not configured")

        openai.api_key = self.api_key

    async def generate_contract(
        self, request: ContractGenerationRequest
    ) -> AIGenerationResult:
        """Generate contract using OpenAI GPT model"""
        start_time = time.time()

        try:
            # Build system prompt for UK legal context
            system_prompt = self._build_system_prompt(request)

            # Build user prompt with specific requirements
            user_prompt = self._build_user_prompt(request)

            # Call OpenAI API
            response = await self._call_openai_api(system_prompt, user_prompt)

            processing_time = (time.time() - start_time) * 1000

            # Parse response and create result
            return self._parse_openai_response(response, processing_time)

        except Exception as e:
            self.logger.error(f"OpenAI contract generation failed: {e}")
            raise AIServiceError(f"Contract generation failed: {str(e)}", "openai")

    async def analyze_contract_compliance(
        self, contract_content: str
    ) -> Dict[str, Any]:
        """Analyze contract for UK legal compliance using OpenAI"""
        system_prompt = """
        You are a UK legal compliance expert. Analyze the provided contract for compliance with:
        - UK Contract Law
        - GDPR and Data Protection Act 2018
        - Employment law (if applicable)
        - Consumer Rights Act 2015 (if applicable)
        - Unfair Contract Terms Act 1977
        
        Provide a detailed analysis with compliance score (0-100) and specific recommendations.
        """

        user_prompt = (
            f"Analyze this contract for UK legal compliance:\n\n{contract_content}"
        )

        try:
            response = await self._call_openai_api(system_prompt, user_prompt)

            # Parse compliance analysis
            content = response.choices[0].message.content

            return {
                "compliance_analysis": content,
                "analyzed_at": datetime.now(timezone.utc).isoformat(),
                "model_used": self.model,
            }

        except Exception as e:
            self.logger.error(f"Compliance analysis failed: {e}")
            raise AIServiceError(f"Compliance analysis failed: {str(e)}", "openai")

    async def suggest_improvements(self, contract_content: str) -> List[str]:
        """Suggest contract improvements using OpenAI"""
        system_prompt = """
        You are a UK commercial lawyer. Review the contract and suggest specific improvements for:
        - Clarity and enforceability
        - Risk mitigation
        - UK legal compliance
        - Commercial protection
        
        Provide numbered, actionable suggestions.
        """

        user_prompt = f"Suggest improvements for this contract:\n\n{contract_content}"

        try:
            response = await self._call_openai_api(system_prompt, user_prompt)
            content = response.choices[0].message.content

            # Extract numbered suggestions
            suggestions = []
            for line in content.split("\n"):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith("-")):
                    suggestions.append(line)

            return suggestions

        except Exception as e:
            self.logger.error(f"Contract improvement suggestions failed: {e}")
            return []

    async def _call_openai_api(self, system_prompt: str, user_prompt: str) -> Any:
        """Call OpenAI API with retry logic"""
        for attempt in range(self.max_retries):
            try:
                response = await openai.ChatCompletion.acreate(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.3,  # Lower temperature for more consistent legal content
                    max_tokens=4000,
                    timeout=60,
                )
                return response

            except openai.error.RateLimitError:
                if attempt < self.max_retries - 1:
                    wait_time = (2**attempt) * 2  # Exponential backoff
                    await asyncio.sleep(wait_time)
                    continue
                raise AIServiceError(
                    "OpenAI rate limit exceeded", "openai", "rate_limit"
                )

            except openai.error.OpenAIError as e:
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(1)
                    continue
                raise AIServiceError(f"OpenAI API error: {str(e)}", "openai")

    def _build_system_prompt(self, request: ContractGenerationRequest) -> str:
        """Build system prompt for UK contract generation"""
        return f"""
        You are an expert UK commercial lawyer specializing in contract drafting for {request.industry.value} businesses.
        
        Generate a professional, legally sound contract that:
        - Complies with UK law and jurisdiction
        - Follows standard UK commercial contract structure
        - Includes appropriate UK legal clauses and terminology
        - Is tailored for {request.company_size.value} businesses
        - Considers {request.complexity.value} complexity level
        
        Contract Structure:
        1. Title and Parties
        2. Recitals/Background
        3. Definitions
        4. Main Terms and Obligations
        5. Payment Terms (if applicable)
        6. Duration and Termination
        7. Liability and Indemnity
        8. Data Protection (GDPR compliance)
        9. General Provisions
        10. Governing Law and Jurisdiction (UK)
        
        Important: Use clear, professional language appropriate for UK commercial contracts.
        Include specific UK legal references where relevant.
        Ensure GDPR compliance clauses if personal data is involved.
        """

    def _build_user_prompt(self, request: ContractGenerationRequest) -> str:
        """Build user prompt with specific contract requirements"""
        prompt_parts = [
            f"Generate a {request.contract_type.value} contract with the following requirements:",
            "",
            f"Plain English Description: {request.plain_english_description}",
            f"Client: {request.client_name}",
        ]

        if request.supplier_name:
            prompt_parts.append(f"Supplier: {request.supplier_name}")

        if request.contract_value:
            prompt_parts.append(f"Contract Value: {request.contract_value}")

        if request.duration_months:
            prompt_parts.append(f"Duration: {request.duration_months} months")

        prompt_parts.extend(
            [
                f"Industry: {request.industry.value}",
                f"Company Size: {request.company_size.value}",
                f"Complexity Level: {request.complexity.value}",
            ]
        )

        if request.additional_requirements:
            prompt_parts.append("Additional Requirements:")
            for req in request.additional_requirements:
                prompt_parts.append(f"- {req}")

        if request.avoid_clauses:
            prompt_parts.append("Avoid These Clauses:")
            for clause in request.avoid_clauses:
                prompt_parts.append(f"- {clause}")

        prompt_parts.extend(
            [
                "",
                "Special Instructions:",
                "- Use UK English spelling and terminology",
                "- Include specific UK legal references where appropriate",
                "- Ensure all clauses are enforceable under UK law",
                "- Include appropriate limitation periods under UK law",
                "- Add GDPR compliance clauses if processing personal data",
                "- Use clear, professional language suitable for business use",
                "",
                "Please generate the complete contract now:",
            ]
        )

        return "\n".join(prompt_parts)

    def _parse_openai_response(
        self, response: Any, processing_time: float
    ) -> AIGenerationResult:
        """Parse OpenAI response into result object"""
        choice = response.choices[0]
        content = choice.message.content

        # Calculate confidence score based on finish reason and content quality
        confidence_score = 0.8  # Base confidence
        if choice.finish_reason == "stop":
            confidence_score = 0.9
        elif choice.finish_reason == "length":
            confidence_score = 0.6  # May be truncated

        # Extract usage information
        usage = response.usage
        tokens_used = {
            "prompt_tokens": usage.prompt_tokens,
            "completion_tokens": usage.completion_tokens,
            "total_tokens": usage.total_tokens,
        }

        # Generate warnings and suggestions based on content analysis
        warnings = self._analyze_content_for_warnings(content)
        suggestions = self._generate_content_suggestions(content)
        compliance_notes = self._extract_compliance_notes(content)

        # Determine if legal review is needed
        legal_review_needed = (
            confidence_score < 0.8 or len(warnings) > 2 or "complex" in content.lower()
        )

        return AIGenerationResult(
            generated_content=content,
            confidence_score=confidence_score,
            processing_time_ms=processing_time,
            model_used=self.model,
            model_version=response.model,
            tokens_used=tokens_used,
            warnings=warnings,
            suggestions=suggestions,
            compliance_notes=compliance_notes,
            estimated_legal_review_needed=legal_review_needed,
        )

    def _analyze_content_for_warnings(self, content: str) -> List[str]:
        """Analyze generated content for potential warnings"""
        warnings = []

        # Check for missing essential clauses
        essential_clauses = [
            ("termination", "Termination clauses may be missing"),
            ("liability", "Liability limitation clauses may be missing"),
            ("data protection", "Data protection clauses may be missing"),
            ("governing law", "Governing law clause may be missing"),
        ]

        for clause, warning in essential_clauses:
            if clause not in content.lower():
                warnings.append(warning)

        # Check content length
        if len(content) < 1000:
            warnings.append(
                "Generated content may be too short for a complete contract"
            )

        return warnings

    def _generate_content_suggestions(self, content: str) -> List[str]:
        """Generate suggestions based on content analysis"""
        suggestions = []

        if "shall" not in content.lower():
            suggestions.append(
                "Consider using 'shall' for obligations to improve legal clarity"
            )

        if "force majeure" not in content.lower():
            suggestions.append("Consider adding a force majeure clause")

        if "dispute resolution" not in content.lower():
            suggestions.append("Consider adding dispute resolution procedures")

        return suggestions

    def _extract_compliance_notes(self, content: str) -> List[str]:
        """Extract compliance-related notes"""
        notes = []

        if "gdpr" in content.lower() or "data protection" in content.lower():
            notes.append("GDPR compliance clauses included")

        if "uk law" in content.lower() or "english law" in content.lower():
            notes.append("UK governing law specified")

        if "unfair contract terms" in content.lower():
            notes.append("Unfair Contract Terms Act considerations included")

        return notes


class AnthropicContractService(BaseAIService):
    """Anthropic Claude-based contract generation service"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "claude-3-sonnet-20240229",
        max_retries: int = 3,
    ):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.model = model
        self.max_retries = max_retries
        self.logger = logging.getLogger(__name__)

        if not self.api_key:
            raise AIServiceError("Anthropic API key not configured")

        self.client = AsyncAnthropic(api_key=self.api_key)

    async def generate_contract(
        self, request: ContractGenerationRequest
    ) -> AIGenerationResult:
        """Generate contract using Anthropic Claude"""
        start_time = time.time()

        try:
            # Build prompts
            system_prompt = self._build_system_prompt(request)
            user_prompt = self._build_user_prompt(request)

            # Call Anthropic API
            response = await self._call_anthropic_api(system_prompt, user_prompt)

            processing_time = (time.time() - start_time) * 1000

            return self._parse_anthropic_response(response, processing_time)

        except Exception as e:
            self.logger.error(f"Anthropic contract generation failed: {e}")
            raise AIServiceError(f"Contract generation failed: {str(e)}", "anthropic")

    async def analyze_contract_compliance(
        self, contract_content: str
    ) -> Dict[str, Any]:
        """Analyze contract compliance using Claude"""
        system_prompt = """
        You are a UK legal compliance expert. Analyze the contract for compliance with UK law.
        Focus on practical compliance issues and provide actionable recommendations.
        """

        user_prompt = (
            f"Analyze this contract for UK legal compliance:\n\n{contract_content}"
        )

        try:
            response = await self._call_anthropic_api(system_prompt, user_prompt)

            return {
                "compliance_analysis": response.content[0].text,
                "analyzed_at": datetime.now(timezone.utc).isoformat(),
                "model_used": self.model,
            }

        except Exception as e:
            self.logger.error(f"Compliance analysis failed: {e}")
            raise AIServiceError(f"Compliance analysis failed: {str(e)}", "anthropic")

    async def suggest_improvements(self, contract_content: str) -> List[str]:
        """Suggest improvements using Claude"""
        system_prompt = "You are a UK commercial lawyer. Provide specific, actionable contract improvements."
        user_prompt = f"Suggest improvements for this contract:\n\n{contract_content}"

        try:
            response = await self._call_anthropic_api(system_prompt, user_prompt)
            content = response.content[0].text

            # Extract suggestions
            suggestions = []
            for line in content.split("\n"):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith("-")):
                    suggestions.append(line)

            return suggestions

        except Exception as e:
            self.logger.error(f"Contract improvement suggestions failed: {e}")
            return []

    async def _call_anthropic_api(self, system_prompt: str, user_prompt: str) -> Any:
        """Call Anthropic API with retry logic"""
        for attempt in range(self.max_retries):
            try:
                response = await self.client.messages.create(
                    model=self.model,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}],
                    max_tokens=4000,
                    temperature=0.3,
                )
                return response

            except Exception as e:
                if attempt < self.max_retries - 1:
                    wait_time = (2**attempt) * 2
                    await asyncio.sleep(wait_time)
                    continue
                raise AIServiceError(f"Anthropic API error: {str(e)}", "anthropic")

    def _build_system_prompt(self, request: ContractGenerationRequest) -> str:
        """Build system prompt for UK contract generation"""
        return f"""
        You are an expert UK commercial lawyer specializing in drafting contracts for {request.industry.value} businesses.
        
        Create a comprehensive, legally sound contract that complies with UK commercial law.
        The contract should be professional, clear, and enforceable under UK jurisdiction.
        
        Key requirements:
        - UK law and jurisdiction
        - GDPR compliance where applicable
        - Industry-specific considerations for {request.industry.value}
        - Appropriate for {request.company_size.value} business
        - {request.complexity.value} complexity level
        
        Use standard UK commercial contract structure and terminology.
        """

    def _build_user_prompt(self, request: ContractGenerationRequest) -> str:
        """Build user prompt - same as OpenAI implementation"""
        return self._build_user_prompt_common(request)

    def _parse_anthropic_response(
        self, response: Any, processing_time: float
    ) -> AIGenerationResult:
        """Parse Anthropic response into result object"""
        content = response.content[0].text

        # Calculate confidence based on response quality
        confidence_score = 0.85  # Claude generally provides high-quality output

        # Extract usage information
        tokens_used = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
        }

        warnings = self._analyze_content_for_warnings(content)
        suggestions = self._generate_content_suggestions(content)
        compliance_notes = self._extract_compliance_notes(content)

        legal_review_needed = len(warnings) > 1

        return AIGenerationResult(
            generated_content=content,
            confidence_score=confidence_score,
            processing_time_ms=processing_time,
            model_used=self.model,
            model_version=response.model,
            tokens_used=tokens_used,
            warnings=warnings,
            suggestions=suggestions,
            compliance_notes=compliance_notes,
            estimated_legal_review_needed=legal_review_needed,
        )


class AIContractService:
    """
    Main AI service that coordinates between different providers
    Implements fallback and load balancing strategies
    """

    def __init__(self, primary_provider: AIProvider = AIProvider.OPENAI):
        self.primary_provider = primary_provider
        self.services: Dict[AIProvider, BaseAIService] = {}
        self.logger = logging.getLogger(__name__)

        # Initialize available services
        self._initialize_services()

    def _initialize_services(self):
        """Initialize AI service providers based on configuration"""
        try:
            if settings.OPENAI_API_KEY:
                self.services[AIProvider.OPENAI] = OpenAIContractService()
        except Exception as e:
            self.logger.warning(f"Failed to initialize OpenAI service: {e}")

        try:
            if settings.ANTHROPIC_API_KEY:
                self.services[AIProvider.ANTHROPIC] = AnthropicContractService()
        except Exception as e:
            self.logger.warning(f"Failed to initialize Anthropic service: {e}")

    async def generate_contract(
        self, request: ContractGenerationRequest
    ) -> AIGenerationResult:
        """
        Generate contract using primary provider with fallback
        """
        # Try primary provider first
        if self.primary_provider in self.services:
            try:
                return await self.services[self.primary_provider].generate_contract(
                    request
                )
            except AIServiceError as e:
                self.logger.warning(
                    f"Primary provider {self.primary_provider} failed: {e}"
                )

        # Try fallback providers
        for provider, service in self.services.items():
            if provider != self.primary_provider:
                try:
                    self.logger.info(f"Falling back to {provider}")
                    return await service.generate_contract(request)
                except AIServiceError as e:
                    self.logger.warning(f"Fallback provider {provider} failed: {e}")
                    continue

        raise AIServiceError("All AI providers failed")

    async def analyze_contract_compliance(
        self, contract_content: str
    ) -> Dict[str, Any]:
        """Analyze contract compliance using available provider"""
        for provider, service in self.services.items():
            try:
                return await service.analyze_contract_compliance(contract_content)
            except AIServiceError:
                continue

        raise AIServiceError("Contract compliance analysis failed")

    async def suggest_improvements(self, contract_content: str) -> List[str]:
        """Suggest improvements using available provider"""
        for provider, service in self.services.items():
            try:
                return await service.suggest_improvements(contract_content)
            except AIServiceError:
                continue

        return []  # Return empty list if all providers fail

    def get_available_providers(self) -> List[AIProvider]:
        """Get list of available AI providers"""
        return list(self.services.keys())

    def is_provider_available(self, provider: AIProvider) -> bool:
        """Check if specific provider is available"""
        return provider in self.services
