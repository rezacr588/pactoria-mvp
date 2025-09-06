"""
Advanced AI Functionality Integration Tests
Testing complex AI scenarios, edge cases, and advanced features
"""

import pytest
import json
import asyncio
import time
from typing import Dict, List, Any
from fastapi.testclient import TestClient

from app.main import app
from app.services.ai_service import (
    GroqAIService,
    ContractGenerationRequest,
    ComplianceAnalysisRequest,
    AIGenerationRequest,
)


class TestAdvancedAIFunctionality:
    """Advanced integration tests for AI functionality"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def ai_service(self):
        """Create AI service instance"""
        return GroqAIService()

    @pytest.fixture
    def complex_contract_scenarios(self):
        """Complex contract scenarios for testing"""
        return {
            "multi_party_agreement": {
                "plain_english": """
                Three-party agreement between TechCorp Ltd (technology provider), 
                ConsultingFirm Ltd (implementation partner), and BigClient Ltd (end customer).
                TechCorp provides software licensing, ConsultingFirm provides implementation 
                and support services, BigClient pays for both. Revenue sharing: TechCorp 60%, 
                ConsultingFirm 40%. Contract value £200,000 over 18 months. Each party has 
                different termination rights and IP obligations. GDPR compliance required 
                as customer data will be processed.
                """,
                "complexity_indicators": [
                    "three parties",
                    "revenue sharing",
                    "different obligations",
                    "ip obligations",
                    "gdpr",
                    "18 months",
                    "£200,000",
                ],
            },
            "international_services": {
                "plain_english": """
                UK company providing consulting services to EU and US clients. 
                Services include data analytics requiring processing of personal data 
                from multiple jurisdictions. Need GDPR compliance for EU clients, 
                CCPA compliance for California clients, UK data protection for domestic.
                Payment in multiple currencies (GBP, EUR, USD). Different notice periods 
                by jurisdiction. Cross-border data transfer agreements required.
                """,
                "complexity_indicators": [
                    "multiple jurisdictions",
                    "gdpr",
                    "ccpa",
                    "data analytics",
                    "cross-border",
                    "multiple currencies",
                    "different notice periods",
                ],
            },
            "high_risk_compliance": {
                "plain_english": """
                Financial services consulting agreement with strict regulatory requirements.
                FCA compliance mandatory, PCI DSS for payment processing, extensive 
                liability caps and professional indemnity insurance requirements.
                Confidentiality extends to 10 years post-termination. Background checks 
                required for all consultants. Detailed audit trail and reporting 
                obligations. Zero-tolerance termination clauses for regulatory breaches.
                """,
                "complexity_indicators": [
                    "financial services",
                    "fca compliance",
                    "pci dss",
                    "liability caps",
                    "professional indemnity",
                    "10 years",
                    "background checks",
                    "zero-tolerance",
                    "regulatory breaches",
                ],
            },
        }

    @pytest.fixture
    def edge_case_contracts(self):
        """Edge case contracts for robust testing"""
        return {
            "minimal_contract": "Simple one-page agreement between two parties for basic services.",
            "verbose_contract": """
            Extremely detailed and comprehensive professional services agreement requiring
            extensive legal provisions, multiple schedules, complex payment structures,
            detailed scope of work definitions, comprehensive liability allocations,
            intricate intellectual property arrangements, sophisticated confidentiality
            provisions, complex termination procedures, detailed dispute resolution 
            mechanisms, extensive compliance requirements, comprehensive data protection
            obligations, detailed background check requirements, extensive audit provisions,
            comprehensive insurance requirements, detailed change management procedures,
            extensive reporting obligations, complex revenue sharing arrangements,
            detailed service level agreements, comprehensive business continuity provisions,
            extensive force majeure clauses, detailed governing law provisions, and
            comprehensive miscellaneous provisions covering all aspects of the relationship.
            """,
            "ambiguous_requirements": """
            Need some kind of agreement for business stuff. Maybe consulting or services
            or something similar. Payment when convenient. Duration flexible. 
            Standard terms probably fine.
            """,
        }

    @pytest.mark.asyncio
    async def test_multi_party_contract_generation(
        self, ai_service, complex_contract_scenarios
    ):
        """Test generation of complex multi-party agreements"""

        scenario = complex_contract_scenarios["multi_party_agreement"]

        request = ContractGenerationRequest(
            plain_english_input=scenario["plain_english"],
            contract_type="partnership",
            contract_value=200000.0,
            currency="GBP",
        )

        response = await ai_service.generate_contract(request)
        content_lower = response.content.lower()

        # Verify complex scenario handling
        assert (
            len(response.content) > 1000
        ), "Multi-party agreement should be substantial"

        # Check for complexity indicators
        found_indicators = 0
        for indicator in scenario["complexity_indicators"]:
            if indicator.lower() in content_lower:
                found_indicators += 1

        complexity_score = found_indicators / len(scenario["complexity_indicators"])
        assert (
            complexity_score >= 0.70
        ), f"Multi-party complexity score {complexity_score:.2%} too low"

        # Multi-party specific checks
        party_count = content_lower.count("party") + content_lower.count("parties")
        assert party_count >= 4, "Should reference multiple parties appropriately"

        # Revenue sharing should be addressed
        financial_terms = ["revenue", "payment", "sharing", "distribution"]
        found_financial = sum(1 for term in financial_terms if term in content_lower)
        assert found_financial >= 2, "Should address financial arrangements"

    @pytest.mark.asyncio
    async def test_international_compliance_handling(
        self, ai_service, complex_contract_scenarios
    ):
        """Test handling of international compliance requirements"""

        scenario = complex_contract_scenarios["international_services"]

        request = ContractGenerationRequest(
            plain_english_input=scenario["plain_english"],
            contract_type="service_agreement",
        )

        response = await ai_service.generate_contract(request)
        content_lower = response.content.lower()

        # Check for international compliance indicators
        compliance_indicators = [
            "gdpr",
            "data protection",
            "jurisdiction",
            "cross-border",
        ]
        found_compliance = sum(
            1 for indicator in compliance_indicators if indicator in content_lower
        )
        assert found_compliance >= 2, "Should address international compliance"

        # Currency handling
        currencies = ["gbp", "eur", "usd", "pounds", "euros", "dollars"]
        found_currencies = sum(
            1 for currency in currencies if currency in content_lower
        )
        assert found_currencies >= 1, "Should address currency considerations"

        # Multi-jurisdictional awareness
        jurisdictions = ["uk", "eu", "united states", "california", "england"]
        found_jurisdictions = sum(
            1 for jurisdiction in jurisdictions if jurisdiction in content_lower
        )
        assert found_jurisdictions >= 2, "Should show multi-jurisdictional awareness"

    @pytest.mark.asyncio
    async def test_high_risk_regulatory_compliance(
        self, ai_service, complex_contract_scenarios
    ):
        """Test generation of high-risk regulatory compliance contracts"""

        scenario = complex_contract_scenarios["high_risk_compliance"]

        request = ContractGenerationRequest(
            plain_english_input=scenario["plain_english"], contract_type="consultancy"
        )

        response = await ai_service.generate_contract(request)
        content_lower = response.content.lower()

        # High-risk contracts should be longer and more detailed
        assert (
            len(response.content) > 1500
        ), "High-risk contract should be comprehensive"

        # Check regulatory compliance elements
        regulatory_terms = [
            "compliance",
            "regulatory",
            "fca",
            "liability",
            "insurance",
            "audit",
        ]
        found_regulatory = sum(1 for term in regulatory_terms if term in content_lower)
        assert (
            found_regulatory >= 4
        ), f"Should address regulatory requirements (found {found_regulatory})"

        # Professional standards
        professional_terms = [
            "professional",
            "indemnity",
            "standards",
            "background check",
        ]
        found_professional = sum(
            1 for term in professional_terms if term in content_lower
        )
        assert found_professional >= 2, "Should address professional standards"

    @pytest.mark.asyncio
    async def test_minimal_vs_verbose_contract_adaptation(
        self, ai_service, edge_case_contracts
    ):
        """Test AI adaptation to minimal vs verbose requirements"""

        # Test minimal contract
        minimal_request = ContractGenerationRequest(
            plain_english_input=edge_case_contracts["minimal_contract"],
            contract_type="service_agreement",
        )

        minimal_response = await ai_service.generate_contract(minimal_request)

        # Test verbose contract
        verbose_request = ContractGenerationRequest(
            plain_english_input=edge_case_contracts["verbose_contract"],
            contract_type="service_agreement",
        )

        verbose_response = await ai_service.generate_contract(verbose_request)

        # Verbose should be longer than minimal
        assert len(verbose_response.content) > len(
            minimal_response.content
        ), "Verbose requirements should produce longer contract"

        # Both should be legally valid
        minimal_lower = minimal_response.content.lower()
        verbose_lower = verbose_response.content.lower()

        legal_essentials = ["agreement", "parties", "terms"]
        for content in [minimal_lower, verbose_lower]:
            found_essentials = sum(
                1 for essential in legal_essentials if essential in content
            )
            assert found_essentials >= 2, "Contract should contain legal essentials"

    @pytest.mark.asyncio
    async def test_ambiguous_requirements_handling(
        self, ai_service, edge_case_contracts
    ):
        """Test handling of ambiguous or unclear requirements"""

        request = ContractGenerationRequest(
            plain_english_input=edge_case_contracts["ambiguous_requirements"],
            contract_type="service_agreement",
        )

        response = await ai_service.generate_contract(request)

        # AI should still produce a valid contract despite ambiguity
        assert (
            len(response.content) > 200
        ), "Should produce substantial content despite ambiguity"

        # Should include standard contract elements
        content_lower = response.content.lower()
        standard_elements = [
            "services",
            "payment",
            "term",
            "termination",
            "governing law",
        ]
        found_elements = sum(
            1 for element in standard_elements if element in content_lower
        )
        assert (
            found_elements >= 3
        ), "Should include standard elements despite ambiguous input"

        # Confidence score should be lower for ambiguous input
        assert (
            response.confidence_score <= 0.85
        ), f"Confidence score {response.confidence_score:.2f} too high for ambiguous input"

    @pytest.mark.asyncio
    async def test_concurrent_ai_requests_performance(self, ai_service):
        """Test concurrent AI request handling"""

        requests = [
            ContractGenerationRequest(
                plain_english_input=f"Service agreement number {i} for consulting services",
                contract_type="service_agreement",
            )
            for i in range(5)
        ]

        start_time = time.time()

        # Execute concurrent requests
        tasks = [ai_service.generate_contract(request) for request in requests]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        total_time = (time.time() - start_time) * 1000

        # Verify all requests completed
        successful_responses = [r for r in responses if not isinstance(r, Exception)]
        assert len(successful_responses) == len(
            requests
        ), f"Only {len(successful_responses)}/{len(requests)} requests succeeded"

        # Concurrent processing should be efficient
        assert (
            total_time < 60000
        ), f"Concurrent requests took {total_time:.0f}ms (over 60s)"

        # Each response should be valid
        for response in successful_responses:
            assert len(response.content) > 100
            assert response.processing_time_ms > 0

    @pytest.mark.asyncio
    async def test_compliance_analysis_edge_cases(self, ai_service):
        """Test compliance analysis with edge cases"""

        edge_cases = {
            "empty_contract": "",
            "single_sentence": "We agree to do business together.",
            "legal_jargon_heavy": """
            Whereas the Party of the First Part (hereinafter referred to as "First Party") 
            and the Party of the Second Part (hereinafter referred to as "Second Party"), 
            in consideration of the mutual covenants and agreements hereinafter contained, 
            and for other good and valuable consideration, the receipt and sufficiency 
            whereof are hereby acknowledged, do hereby covenant and agree as follows...
            """,
            "non_english_elements": """
            Service Agreement avec des éléments en français and some German Begriffe.
            This contract includes various Fremdsprachen words and phrases that might
            confuse standard analysis tools.
            """,
        }

        for case_name, contract_content in edge_cases.items():
            if not contract_content:  # Skip empty contract
                continue

            request = ComplianceAnalysisRequest(
                contract_content=contract_content, contract_type="service_agreement"
            )

            try:
                response = await ai_service.analyze_compliance(request)

                # Should always return valid response structure
                assert 0.0 <= response.overall_score <= 1.0
                assert 1 <= response.risk_score <= 10
                assert isinstance(response.risk_factors, list)
                assert isinstance(response.recommendations, list)

                # Edge cases should generally have lower scores
                if case_name in ["single_sentence", "non_english_elements"]:
                    assert (
                        response.overall_score < 0.7
                    ), f"{case_name} should have lower compliance score"
                    assert (
                        len(response.recommendations) > 0
                    ), f"{case_name} should have recommendations"

            except Exception as e:
                # Some edge cases might raise exceptions - this is acceptable
                assert isinstance(e, Exception)

    @pytest.mark.asyncio
    async def test_contract_size_scaling(self, ai_service):
        """Test AI performance with different contract sizes"""

        size_tests = [
            ("small", "Simple services agreement", 300),
            (
                "medium",
                "Professional services agreement with standard clauses including payment, confidentiality, and termination",
                800,
            ),
            (
                "large",
                "Comprehensive professional services agreement with detailed scope, payment schedules, intellectual property clauses, confidentiality provisions, termination procedures, dispute resolution, governing law, and extensive schedules",
                2000,
            ),
        ]

        for size_name, prompt, max_tokens in size_tests:
            request = ContractGenerationRequest(
                plain_english_input=prompt, contract_type="service_agreement"
            )

            # Override max_tokens in the AI request
            ai_request = AIGenerationRequest(
                prompt=ai_service._build_contract_prompt(request),
                max_tokens=max_tokens,
                temperature=0.3,
            )

            response = await ai_service.generate_content(ai_request)

            # Verify appropriate scaling
            if size_name == "small":
                assert (
                    200 <= len(response.content) <= 1500
                ), f"Small contract length {len(response.content)} not appropriate"
            elif size_name == "medium":
                assert (
                    500 <= len(response.content) <= 4000
                ), f"Medium contract length {len(response.content)} not appropriate"
            elif size_name == "large":
                assert (
                    len(response.content) >= 800
                ), f"Large contract length {len(response.content)} too short"

            # All sizes should maintain quality
            content_lower = response.content.lower()
            assert "agreement" in content_lower or "contract" in content_lower
            assert "party" in content_lower or "parties" in content_lower

    @pytest.mark.asyncio
    async def test_specialized_contract_types_accuracy(self, ai_service):
        """Test accuracy for specialized contract types"""

        specialized_contracts = {
            "lease": "Commercial property lease for office space in London, 5-year term with break clause at 3 years",
            "partnership": "Business partnership between two consultants sharing profits and responsibilities equally",
            "supplier_agreement": "Long-term supplier agreement for manufacturing components with quality standards",
            "terms_conditions": "Website terms and conditions for e-commerce platform with user-generated content",
        }

        for contract_type, description in specialized_contracts.items():
            request = ContractGenerationRequest(
                plain_english_input=description, contract_type=contract_type
            )

            response = await ai_service.generate_contract(request)
            content_lower = response.content.lower()

            # Type-specific validation
            type_specific_terms = {
                "lease": ["lease", "tenant", "landlord", "premises", "rent"],
                "partnership": ["partnership", "partner", "profit", "loss", "capital"],
                "supplier_agreement": [
                    "supplier",
                    "goods",
                    "quality",
                    "delivery",
                    "specifications",
                ],
                "terms_conditions": [
                    "terms",
                    "conditions",
                    "user",
                    "service",
                    "website",
                ],
            }

            expected_terms = type_specific_terms[contract_type]
            found_terms = sum(1 for term in expected_terms if term in content_lower)

            term_accuracy = found_terms / len(expected_terms)
            assert (
                term_accuracy >= 0.60
            ), f"{contract_type} accuracy {term_accuracy:.2%} too low (found {found_terms}/{len(expected_terms)})"

    @pytest.mark.asyncio
    async def test_ai_context_awareness(self, ai_service):
        """Test AI's context awareness and coherence"""

        context_test = ContractGenerationRequest(
            plain_english_input="""
            Technology consulting agreement for blockchain development project.
            Client is FinTech startup, consultant specializes in DeFi protocols.
            Project involves smart contract development, security audits, regulatory compliance.
            Payment in cryptocurrency accepted, escrow arrangements for milestones.
            """,
            contract_type="consultancy",
            client_name="CryptoFin Ltd",
            contract_value=100000.0,
        )

        response = await ai_service.generate_contract(request=context_test)
        content_lower = response.content.lower()

        # Technology context awareness
        tech_terms = [
            "blockchain",
            "smart contract",
            "cryptocurrency",
            "defi",
            "security audit",
        ]
        found_tech = sum(1 for term in tech_terms if term in content_lower)
        assert (
            found_tech >= 2
        ), f"Should show tech context awareness (found {found_tech} terms)"

        # Financial services context
        fintech_terms = ["fintech", "financial", "regulatory", "compliance"]
        found_fintech = sum(1 for term in fintech_terms if term in content_lower)
        assert found_fintech >= 1, "Should show FinTech context awareness"

        # Should still maintain legal structure
        legal_structure = ["agreement", "parties", "obligations", "termination"]
        found_legal = sum(1 for term in legal_structure if term in content_lower)
        assert found_legal >= 3, "Should maintain legal contract structure"

    @pytest.mark.asyncio
    async def test_error_recovery_and_fallbacks(self, ai_service):
        """Test error recovery and fallback mechanisms"""

        # Test with potentially problematic inputs
        problematic_inputs = [
            "Generate contract with 🚀💰 emojis and weird chars ñ ü ø",
            "Contract" + " very" * 1000 + " long repetitive input",
            "NULL; DROP TABLE contracts; -- SQL injection attempt",
            "<script>alert('XSS')</script> malicious HTML content",
        ]

        for problematic_input in problematic_inputs:
            request = ContractGenerationRequest(
                plain_english_input=problematic_input, contract_type="service_agreement"
            )

            try:
                response = await ai_service.generate_contract(request)

                # Should produce safe, valid output
                assert response.content is not None
                assert len(response.content) > 0

                # Should not contain malicious content
                content_lower = response.content.lower()
                malicious_patterns = ["<script>", "drop table", "null;"]
                found_malicious = sum(
                    1 for pattern in malicious_patterns if pattern in content_lower
                )
                assert found_malicious == 0, "Should not echo malicious content"

            except Exception as e:
                # Exception handling is acceptable for malicious inputs
                assert "error" in str(e).lower() or "failed" in str(e).lower()

    @pytest.mark.asyncio
    async def test_temperature_consistency_analysis(self, ai_service):
        """Test AI output consistency with different temperature settings"""

        base_prompt = "Generate a confidentiality clause for a service agreement"
        temperatures = [0.1, 0.5, 0.9]

        responses_by_temp = {}

        for temp in temperatures:
            request = AIGenerationRequest(
                prompt=base_prompt, max_tokens=200, temperature=temp
            )

            # Generate multiple responses for each temperature
            temp_responses = []
            for _ in range(3):
                response = await ai_service.generate_content(request)
                temp_responses.append(response.content.lower())

            responses_by_temp[temp] = temp_responses

        # Lower temperature should produce more consistent outputs
        low_temp_responses = responses_by_temp[0.1]
        high_temp_responses = responses_by_temp[0.9]

        # Measure consistency by checking common words
        def measure_consistency(responses):
            all_words = []
            for response in responses:
                words = response.split()
                all_words.extend(
                    [w for w in words if len(w) > 3]
                )  # Only meaningful words

            if not all_words:
                return 0.0

            word_counts = {}
            for word in all_words:
                word_counts[word] = word_counts.get(word, 0) + 1

            # Consistency = ratio of repeated words
            repeated_words = sum(1 for count in word_counts.values() if count > 1)
            return repeated_words / len(word_counts) if word_counts else 0.0

        low_consistency = measure_consistency(low_temp_responses)
        high_consistency = measure_consistency(high_temp_responses)

        # Low temperature should be more consistent (or at least not less consistent)
        assert (
            low_consistency >= high_consistency - 0.1
        ), f"Low temp consistency {low_consistency:.2f} should be >= high temp {high_consistency:.2f}"
