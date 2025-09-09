"""
AI Risk Assessment Service for Contract Analysis
Provides comprehensive risk scoring (1-10 scale) as required by MVP
Follows DDD patterns and integrates with UK compliance engine
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime, timezone
from enum import Enum
import re
from decimal import Decimal

from app.domain.entities.company import Company, IndustryType, CompanySize
from app.domain.value_objects import ContractType, Money
from app.domain.services.uk_compliance_engine import (
    uk_compliance_engine,
    ComplianceAssessment,
    RiskLevel,
)


class RiskCategory(str, Enum):
    """Categories of contract risks for UK SMEs"""

    LEGAL_COMPLIANCE = "legal_compliance"
    FINANCIAL_EXPOSURE = "financial_exposure"
    OPERATIONAL_IMPACT = "operational_impact"
    REPUTATIONAL_RISK = "reputational_risk"
    TERMINATION_RISK = "termination_risk"
    PERFORMANCE_RISK = "performance_risk"
    CONFIDENTIALITY_RISK = "confidentiality_risk"
    DISPUTE_RESOLUTION = "dispute_resolution"


@dataclass
class RiskFactor:
    """Individual risk factor assessment"""

    category: RiskCategory
    factor_name: str
    score: float  # 1-10 scale
    severity: RiskLevel
    description: str
    impact_description: str
    mitigation_suggestion: str
    confidence: float  # 0-1 confidence in assessment
    detected_patterns: List[str] = field(default_factory=list)


@dataclass
class ContractRiskAssessment:
    """Comprehensive contract risk assessment result"""

    overall_score: float  # 1-10 scale (1=lowest risk, 10=highest risk)
    risk_level: RiskLevel
    risk_factors: List[RiskFactor]
    assessment_summary: str
    key_concerns: List[str]
    priority_actions: List[str]
    assessment_confidence: float  # 0-1 overall confidence

    # Category breakdown
    category_scores: Dict[str, float] = field(default_factory=dict)

    # Business context
    sme_specific_risks: List[str] = field(default_factory=list)
    industry_specific_risks: List[str] = field(default_factory=list)

    # Assessment metadata
    assessed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    assessment_duration_ms: float = 0.0

    def get_high_risk_factors(self) -> List[RiskFactor]:
        """Get factors with high or critical risk"""
        return [
            f
            for f in self.risk_factors
            if f.severity in [RiskLevel.HIGH, RiskLevel.CRITICAL]
        ]

    def get_category_risk_level(self, category: RiskCategory) -> RiskLevel:
        """Get risk level for specific category"""
        category_factors = [f for f in self.risk_factors if f.category == category]
        if not category_factors:
            return RiskLevel.LOW

        max_severity = max(f.severity for f in category_factors)
        return max_severity

    def requires_legal_review(self) -> bool:
        """Determine if contract requires legal review"""
        return (
            self.overall_score >= 7.0
            or self.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
            or any(f.severity == RiskLevel.CRITICAL for f in self.risk_factors)
        )

    def is_suitable_for_sme(self) -> bool:
        """Check if contract is suitable for SME without extensive legal support"""
        return self.overall_score <= 6.0 and self.risk_level != RiskLevel.CRITICAL


class AIRiskAssessmentService:
    """
    AI-powered risk assessment service for UK SME contracts
    Integrates with UK compliance engine and provides business-focused risk analysis
    """

    def __init__(self):
        self.compliance_engine = uk_compliance_engine

        # Risk assessment rules and patterns
        self._initialize_risk_patterns()

        # Industry-specific risk modifiers
        self._initialize_industry_modifiers()

        # SME-specific risk considerations
        self._initialize_sme_risk_factors()

    def assess_contract_risk(
        self,
        contract_content: str,
        company: Company,
        contract_type: ContractType,
        contract_value: Optional[Money] = None,
    ) -> ContractRiskAssessment:
        """
        Perform comprehensive risk assessment of contract
        Returns risk score on 1-10 scale with detailed analysis
        """
        start_time = datetime.now(timezone.utc)

        # Get compliance assessment first
        compliance_assessment = self.compliance_engine.validate_contract(
            contract_content, company, contract_type, contract_value
        )

        # Analyze risk factors
        risk_factors = []

        # 1. Legal Compliance Risks
        legal_risks = self._assess_legal_compliance_risks(
            compliance_assessment, company
        )
        risk_factors.extend(legal_risks)

        # 2. Financial Exposure Risks
        financial_risks = self._assess_financial_risks(
            contract_content, contract_value, company
        )
        risk_factors.extend(financial_risks)

        # 3. Operational Impact Risks
        operational_risks = self._assess_operational_risks(
            contract_content, contract_type, company
        )
        risk_factors.extend(operational_risks)

        # 4. Termination and Performance Risks
        termination_risks = self._assess_termination_risks(
            contract_content, contract_type
        )
        risk_factors.extend(termination_risks)

        # 5. Reputational Risks
        reputation_risks = self._assess_reputational_risks(contract_content, company)
        risk_factors.extend(reputation_risks)

        # 6. Confidentiality and IP Risks
        confidentiality_risks = self._assess_confidentiality_risks(
            contract_content, company
        )
        risk_factors.extend(confidentiality_risks)

        # 7. Dispute Resolution Risks
        dispute_risks = self._assess_dispute_resolution_risks(contract_content, company)
        risk_factors.extend(dispute_risks)

        # Calculate overall risk score and assessment
        overall_score = self._calculate_overall_risk_score(
            risk_factors, compliance_assessment
        )
        risk_level = self._determine_risk_level(overall_score, risk_factors)

        # Generate category scores
        category_scores = self._calculate_category_scores(risk_factors)

        # Generate business-focused insights
        key_concerns = self._identify_key_concerns(risk_factors, company)
        priority_actions = self._generate_priority_actions(risk_factors, company)
        sme_specific_risks = self._identify_sme_risks(risk_factors, company)
        industry_specific_risks = self._identify_industry_risks(risk_factors, company)

        # Generate assessment summary
        assessment_summary = self._generate_assessment_summary(
            overall_score, risk_level, risk_factors, company
        )

        # Calculate assessment confidence
        assessment_confidence = self._calculate_assessment_confidence(risk_factors)

        end_time = datetime.now(timezone.utc)
        duration_ms = (end_time - start_time).total_seconds() * 1000

        return ContractRiskAssessment(
            overall_score=overall_score,
            risk_level=risk_level,
            risk_factors=risk_factors,
            assessment_summary=assessment_summary,
            key_concerns=key_concerns,
            priority_actions=priority_actions,
            assessment_confidence=assessment_confidence,
            category_scores=category_scores,
            sme_specific_risks=sme_specific_risks,
            industry_specific_risks=industry_specific_risks,
            assessment_duration_ms=duration_ms,
        )

    def _assess_legal_compliance_risks(
        self, compliance_assessment: ComplianceAssessment, company: Company
    ) -> List[RiskFactor]:
        """Assess legal compliance risks based on compliance engine results"""
        risks = []

        # Overall compliance risk
        compliance_score = 10.0 - (
            compliance_assessment.overall_score / 10.0
        )  # Invert and scale
        if compliance_score > 2.0:
            severity = (
                RiskLevel.LOW
                if compliance_score < 4.0
                else (
                    RiskLevel.MEDIUM
                    if compliance_score < 7.0
                    else (
                        RiskLevel.HIGH if compliance_score < 9.0 else RiskLevel.CRITICAL
                    )
                )
            )

            risks.append(
                RiskFactor(
                    category=RiskCategory.LEGAL_COMPLIANCE,
                    factor_name="UK Legal Compliance",
                    score=compliance_score,
                    severity=severity,
                    description=f"Contract compliance score: {compliance_assessment.overall_score}%",
                    impact_description=f"Non-compliance could result in {len(compliance_assessment.violations)} legal issues",
                    mitigation_suggestion="Address compliance violations before contract execution",
                    confidence=0.9,
                )
            )

        # Specific violation risks
        for violation in compliance_assessment.violations:
            violation_score = {
                RiskLevel.LOW: 3.0,
                RiskLevel.MEDIUM: 5.5,
                RiskLevel.HIGH: 8.0,
                RiskLevel.CRITICAL: 9.5,
            }.get(violation.severity, 5.0)

            risks.append(
                RiskFactor(
                    category=RiskCategory.LEGAL_COMPLIANCE,
                    factor_name=violation.rule_title,
                    score=violation_score,
                    severity=violation.severity,
                    description=violation.description,
                    impact_description="Legal liability and regulatory penalties",
                    mitigation_suggestion=violation.suggested_fix
                    or "Seek legal advice",
                    confidence=0.8,
                )
            )

        return risks

    def _assess_financial_risks(
        self, content: str, contract_value: Optional[Money], company: Company
    ) -> List[RiskFactor]:
        """Assess financial exposure risks"""
        risks = []
        content_lower = content.lower()

        # Contract value risk assessment
        if contract_value and contract_value.amount > 0:
            # Risk increases with contract value relative to company size
            value_risk_score = self._calculate_value_risk(contract_value, company)
            if value_risk_score > 3.0:
                risks.append(
                    RiskFactor(
                        category=RiskCategory.FINANCIAL_EXPOSURE,
                        factor_name="Contract Value Exposure",
                        score=value_risk_score,
                        severity=(
                            RiskLevel.HIGH
                            if value_risk_score > 7.0
                            else RiskLevel.MEDIUM
                        ),
                        description=f"High value contract: {contract_value}",
                        impact_description="Significant financial exposure for SME",
                        mitigation_suggestion="Consider payment milestones and performance bonds",
                        confidence=0.9,
                    )
                )

        # Payment terms risks
        payment_risk = self._assess_payment_terms(content_lower)
        if payment_risk:
            risks.append(payment_risk)

        # Penalty and liability risks
        penalty_risk = self._assess_penalty_clauses(content_lower)
        if penalty_risk:
            risks.append(penalty_risk)

        # Indemnity risks
        indemnity_risk = self._assess_indemnity_clauses(content_lower)
        if indemnity_risk:
            risks.append(indemnity_risk)

        return risks

    def _assess_operational_risks(
        self, content: str, contract_type: ContractType, company: Company
    ) -> List[RiskFactor]:
        """Assess operational impact risks"""
        risks = []
        content_lower = content.lower()

        # Performance obligations risk
        performance_risk = self._assess_performance_obligations(
            content_lower, contract_type
        )
        if performance_risk:
            risks.append(performance_risk)

        # Resource allocation risk
        resource_risk = self._assess_resource_requirements(content_lower, company)
        if resource_risk:
            risks.append(resource_risk)

        # Timeline and delivery risks
        timeline_risk = self._assess_timeline_pressures(content_lower)
        if timeline_risk:
            risks.append(timeline_risk)

        return risks

    def _assess_termination_risks(
        self, content: str, contract_type: ContractType
    ) -> List[RiskFactor]:
        """Assess termination and exit risks"""
        risks = []
        content_lower = content.lower()

        # Termination clause analysis
        termination_patterns = [
            r"terminate.*immediately",
            r"without.*notice",
            r"no.*cause.*termination",
            r"termination.*fee",
        ]

        termination_score = 3.0
        detected_patterns = []

        for pattern in termination_patterns:
            if re.search(pattern, content_lower):
                termination_score += 1.5
                detected_patterns.append(pattern)

        if termination_score > 4.0:
            risks.append(
                RiskFactor(
                    category=RiskCategory.TERMINATION_RISK,
                    factor_name="Unfavorable Termination Terms",
                    score=min(termination_score, 10.0),
                    severity=(
                        RiskLevel.HIGH if termination_score > 7.0 else RiskLevel.MEDIUM
                    ),
                    description="Contract contains potentially unfavorable termination clauses",
                    impact_description="Risk of unexpected contract termination with limited recourse",
                    mitigation_suggestion="Negotiate more balanced termination terms",
                    confidence=0.7,
                    detected_patterns=detected_patterns,
                )
            )

        return risks

    def _assess_reputational_risks(
        self, content: str, company: Company
    ) -> List[RiskFactor]:
        """Assess reputational risks"""
        risks = []
        content_lower = content.lower()

        # Public disclosure risks
        disclosure_patterns = [
            r"public.*disclosure",
            r"press.*release",
            r"marketing.*use",
            r"reference.*client",
        ]

        disclosure_score = 2.0
        for pattern in disclosure_patterns:
            if re.search(pattern, content_lower):
                disclosure_score += 2.0

        if disclosure_score > 4.0:
            risks.append(
                RiskFactor(
                    category=RiskCategory.REPUTATIONAL_RISK,
                    factor_name="Public Disclosure Risk",
                    score=disclosure_score,
                    severity=RiskLevel.MEDIUM,
                    description="Contract allows counterparty to use company name/information publicly",
                    impact_description="Potential reputational risk from public association",
                    mitigation_suggestion="Add approval requirements for public use of company information",
                    confidence=0.8,
                )
            )

        return risks

    def _assess_confidentiality_risks(
        self, content: str, company: Company
    ) -> List[RiskFactor]:
        """Assess confidentiality and IP risks"""
        risks = []
        content_lower = content.lower()

        # Confidentiality adequacy
        if "confidential" not in content_lower:
            risks.append(
                RiskFactor(
                    category=RiskCategory.CONFIDENTIALITY_RISK,
                    factor_name="Missing Confidentiality Provisions",
                    score=6.0,
                    severity=RiskLevel.MEDIUM,
                    description="Contract lacks confidentiality protections",
                    impact_description="Business information may not be protected",
                    mitigation_suggestion="Add comprehensive confidentiality clauses",
                    confidence=0.9,
                )
            )

        # IP ownership risks
        ip_patterns = [
            r"intellectual.*property",
            r"work.*product",
            r"deliverable.*ownership",
            r"copyright.*ownership",
        ]

        ip_mentioned = any(re.search(pattern, content_lower) for pattern in ip_patterns)
        if not ip_mentioned and company.industry in [
            IndustryType.TECHNOLOGY,
            IndustryType.CREATIVE,
        ]:
            risks.append(
                RiskFactor(
                    category=RiskCategory.CONFIDENTIALITY_RISK,
                    factor_name="Unclear IP Ownership",
                    score=7.0,
                    severity=RiskLevel.HIGH,
                    description="Intellectual property ownership not clearly defined",
                    impact_description="Risk of disputes over IP ownership",
                    mitigation_suggestion="Clearly define IP ownership and licensing terms",
                    confidence=0.8,
                )
            )

        return risks

    def _assess_dispute_resolution_risks(
        self, content: str, company: Company
    ) -> List[RiskFactor]:
        """Assess dispute resolution risks"""
        risks = []
        content_lower = content.lower()

        # Check for dispute resolution mechanisms
        dispute_mechanisms = [
            "arbitration",
            "mediation",
            "dispute resolution",
            "governing law",
        ]
        mechanisms_found = [m for m in dispute_mechanisms if m in content_lower]

        if not mechanisms_found:
            risks.append(
                RiskFactor(
                    category=RiskCategory.DISPUTE_RESOLUTION,
                    factor_name="No Dispute Resolution Mechanism",
                    score=6.5,
                    severity=RiskLevel.MEDIUM,
                    description="Contract lacks dispute resolution procedures",
                    impact_description="Expensive litigation may be only recourse for disputes",
                    mitigation_suggestion="Add mediation/arbitration clauses and specify governing law",
                    confidence=0.9,
                )
            )

        # Check for unfavorable jurisdiction
        if "jurisdiction" in content_lower:
            # Look for non-UK jurisdictions that could be expensive for SME
            foreign_jurisdictions = ["new york", "delaware", "california", "singapore"]
            for jurisdiction in foreign_jurisdictions:
                if jurisdiction in content_lower:
                    risks.append(
                        RiskFactor(
                            category=RiskCategory.DISPUTE_RESOLUTION,
                            factor_name="Foreign Jurisdiction Risk",
                            score=7.5,
                            severity=RiskLevel.HIGH,
                            description=f"Contract specifies {jurisdiction} jurisdiction",
                            impact_description="High costs for UK SME to pursue disputes abroad",
                            mitigation_suggestion="Negotiate UK jurisdiction or mutual jurisdiction clauses",
                            confidence=0.8,
                        )
                    )
                    break

        return risks

    def _calculate_value_risk(self, contract_value: Money, company: Company) -> float:
        """Calculate risk based on contract value relative to company size"""
        # Estimate company revenue based on size (rough approximations)
        size_revenue_estimates = {
            CompanySize.MICRO: Decimal("500000"),  # £500k
            CompanySize.SMALL: Decimal("5000000"),  # £5M
            CompanySize.MEDIUM: Decimal("25000000"),  # £25M
            CompanySize.LARGE: Decimal("100000000"),  # £100M
        }

        estimated_revenue = size_revenue_estimates.get(
            company.company_size, Decimal("5000000")
        )
        value_ratio = contract_value.amount / estimated_revenue

        # Risk increases exponentially with contract value ratio
        if value_ratio < 0.01:  # <1% of revenue
            return 2.0
        elif value_ratio < 0.05:  # <5% of revenue
            return 4.0
        elif value_ratio < 0.1:  # <10% of revenue
            return 6.0
        elif value_ratio < 0.2:  # <20% of revenue
            return 8.0
        else:  # >20% of revenue
            return 9.5

    def _assess_payment_terms(self, content_lower: str) -> Optional[RiskFactor]:
        """Assess payment terms risks"""
        risky_payment_patterns = [
            r"payment.*180.*days",
            r"payment.*6.*months",
            r"payment.*completion",
            r"no.*payment.*until",
        ]

        for pattern in risky_payment_patterns:
            if re.search(pattern, content_lower):
                return RiskFactor(
                    category=RiskCategory.FINANCIAL_EXPOSURE,
                    factor_name="Unfavorable Payment Terms",
                    score=7.0,
                    severity=RiskLevel.HIGH,
                    description="Contract has extended payment terms or payment conditions",
                    impact_description="Cash flow impact on SME operations",
                    mitigation_suggestion="Negotiate shorter payment terms or milestone payments",
                    confidence=0.8,
                )

        return None

    def _assess_penalty_clauses(self, content_lower: str) -> Optional[RiskFactor]:
        """Assess penalty and liquidated damages clauses"""
        penalty_patterns = [
            r"penalty.*\£.*\d+",
            r"liquidated.*damages",
            r"fine.*breach",
            r"damages.*\d+.*percent",
        ]

        penalty_score = 3.0
        detected_penalties = []

        for pattern in penalty_patterns:
            if re.search(pattern, content_lower):
                penalty_score += 2.0
                detected_penalties.append(pattern)

        if penalty_score > 5.0:
            return RiskFactor(
                category=RiskCategory.FINANCIAL_EXPOSURE,
                factor_name="High Penalty Exposure",
                score=penalty_score,
                severity=RiskLevel.HIGH if penalty_score > 7.0 else RiskLevel.MEDIUM,
                description="Contract contains penalty clauses",
                impact_description="Financial penalties for breach or poor performance",
                mitigation_suggestion="Review penalty amounts for reasonableness and cap exposure",
                confidence=0.7,
                detected_patterns=detected_penalties,
            )

        return None

    def _assess_indemnity_clauses(self, content_lower: str) -> Optional[RiskFactor]:
        """Assess indemnity clause risks"""
        broad_indemnity_patterns = [
            r"indemnify.*all.*claims",
            r"hold.*harmless.*any.*loss",
            r"unlimited.*indemnity",
            r"indemnify.*consequential.*damages",
        ]

        for pattern in broad_indemnity_patterns:
            if re.search(pattern, content_lower):
                return RiskFactor(
                    category=RiskCategory.FINANCIAL_EXPOSURE,
                    factor_name="Broad Indemnity Obligations",
                    score=8.0,
                    severity=RiskLevel.HIGH,
                    description="Contract contains broad indemnification requirements",
                    impact_description="Unlimited liability for third-party claims",
                    mitigation_suggestion="Limit indemnity to specific scenarios and cap financial exposure",
                    confidence=0.8,
                )

        return None

    def _assess_performance_obligations(
        self, content_lower: str, contract_type: ContractType
    ) -> Optional[RiskFactor]:
        """Assess performance obligation complexity"""
        complex_performance_indicators = [
            r"service.*level.*agreement",
            r"sla.*\d+.*percent",
            r"performance.*metrics",
            r"deliverable.*specification",
            r"milestone.*schedule",
        ]

        complexity_score = 3.0
        for pattern in complex_performance_indicators:
            if re.search(pattern, content_lower):
                complexity_score += 1.5

        if complexity_score > 6.0:
            return RiskFactor(
                category=RiskCategory.OPERATIONAL_IMPACT,
                factor_name="Complex Performance Requirements",
                score=complexity_score,
                severity=RiskLevel.MEDIUM,
                description="Contract has complex performance obligations",
                impact_description="Risk of performance failures and disputes",
                mitigation_suggestion="Ensure performance requirements are realistic and measurable",
                confidence=0.7,
            )

        return None

    def _assess_resource_requirements(
        self, content_lower: str, company: Company
    ) -> Optional[RiskFactor]:
        """Assess resource allocation risks"""
        resource_intensive_patterns = [
            r"dedicated.*team",
            r"exclusive.*resource",
            r"24/7.*support",
            r"continuous.*availability",
        ]

        for pattern in resource_intensive_patterns:
            if re.search(pattern, content_lower):
                # Higher risk for smaller companies
                risk_score = 7.0 if company.company_size == CompanySize.MICRO else 5.5

                return RiskFactor(
                    category=RiskCategory.OPERATIONAL_IMPACT,
                    factor_name="Resource Intensive Requirements",
                    score=risk_score,
                    severity=RiskLevel.HIGH if risk_score > 6.5 else RiskLevel.MEDIUM,
                    description="Contract requires significant resource allocation",
                    impact_description="May strain SME operational capacity",
                    mitigation_suggestion="Assess internal capacity and consider resource planning",
                    confidence=0.8,
                )

        return None

    def _assess_timeline_pressures(self, content_lower: str) -> Optional[RiskFactor]:
        """Assess timeline and delivery pressure risks"""
        urgent_timeline_patterns = [
            r"immediate.*delivery",
            r"asap.*completion",
            r"rush.*delivery",
            r"expedited.*timeline",
        ]

        for pattern in urgent_timeline_patterns:
            if re.search(pattern, content_lower):
                return RiskFactor(
                    category=RiskCategory.PERFORMANCE_RISK,
                    factor_name="Aggressive Timeline Requirements",
                    score=6.5,
                    severity=RiskLevel.MEDIUM,
                    description="Contract has tight delivery timelines",
                    impact_description="Risk of delays and performance penalties",
                    mitigation_suggestion="Ensure timeline is realistic and include contingency provisions",
                    confidence=0.7,
                )

        return None

    def _calculate_overall_risk_score(
        self,
        risk_factors: List[RiskFactor],
        compliance_assessment: ComplianceAssessment,
    ) -> float:
        """Calculate weighted overall risk score (1-10 scale)"""
        if not risk_factors:
            return 2.0  # Base risk for any contract

        # Weight factors by category importance for SMEs
        category_weights = {
            RiskCategory.LEGAL_COMPLIANCE: 0.25,
            RiskCategory.FINANCIAL_EXPOSURE: 0.25,
            RiskCategory.OPERATIONAL_IMPACT: 0.15,
            RiskCategory.TERMINATION_RISK: 0.15,
            RiskCategory.PERFORMANCE_RISK: 0.1,
            RiskCategory.DISPUTE_RESOLUTION: 0.05,
            RiskCategory.REPUTATIONAL_RISK: 0.03,
            RiskCategory.CONFIDENTIALITY_RISK: 0.02,
        }

        weighted_score = 0.0
        total_weight = 0.0

        for factor in risk_factors:
            weight = category_weights.get(factor.category, 0.05)
            confidence_adjustment = factor.confidence
            weighted_score += factor.score * weight * confidence_adjustment
            total_weight += weight * confidence_adjustment

        if total_weight > 0:
            overall_score = weighted_score / total_weight
        else:
            overall_score = 3.0  # Default medium-low risk

        # Ensure score is in 1-10 range
        return max(1.0, min(10.0, round(overall_score, 1)))

    def _determine_risk_level(
        self, overall_score: float, risk_factors: List[RiskFactor]
    ) -> RiskLevel:
        """Determine overall risk level"""
        # Check for critical factors first
        if any(f.severity == RiskLevel.CRITICAL for f in risk_factors):
            return RiskLevel.CRITICAL

        # Score-based determination
        if overall_score >= 8.5:
            return RiskLevel.CRITICAL
        elif overall_score >= 7.0:
            return RiskLevel.HIGH
        elif overall_score >= 4.5:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _calculate_category_scores(
        self, risk_factors: List[RiskFactor]
    ) -> Dict[str, float]:
        """Calculate average scores per category"""
        category_scores = {}

        for category in RiskCategory:
            category_factors = [f for f in risk_factors if f.category == category]
            if category_factors:
                avg_score = sum(f.score for f in category_factors) / len(
                    category_factors
                )
                category_scores[category.value] = round(avg_score, 1)
            else:
                category_scores[category.value] = 1.0  # No risk detected

        return category_scores

    def _identify_key_concerns(
        self, risk_factors: List[RiskFactor], company: Company
    ) -> List[str]:
        """Identify key business concerns for SME"""
        concerns = []

        high_risk_factors = [
            f
            for f in risk_factors
            if f.severity in [RiskLevel.HIGH, RiskLevel.CRITICAL]
        ]

        for factor in high_risk_factors[:5]:  # Top 5 concerns
            concerns.append(f"{factor.factor_name}: {factor.impact_description}")

        return concerns

    def _generate_priority_actions(
        self, risk_factors: List[RiskFactor], company: Company
    ) -> List[str]:
        """Generate priority actions for risk mitigation"""
        actions = []

        # Critical actions first
        critical_factors = [f for f in risk_factors if f.severity == RiskLevel.CRITICAL]
        for factor in critical_factors:
            actions.append(f"URGENT: {factor.mitigation_suggestion}")

        # High priority actions
        high_factors = [f for f in risk_factors if f.severity == RiskLevel.HIGH]
        for factor in high_factors[:3]:  # Top 3 high-priority actions
            actions.append(f"HIGH: {factor.mitigation_suggestion}")

        # SME-specific general advice
        if any(f.score > 7.0 for f in risk_factors):
            actions.append("Consider legal review before contract execution")

        return actions[:7]  # Limit to 7 most important actions

    def _identify_sme_risks(
        self, risk_factors: List[RiskFactor], company: Company
    ) -> List[str]:
        """Identify SME-specific risks"""
        sme_risks = []

        # Resource constraints
        resource_factors = [
            f for f in risk_factors if f.category == RiskCategory.OPERATIONAL_IMPACT
        ]
        if resource_factors:
            sme_risks.append(
                "Resource allocation constraints typical for SME operations"
            )

        # Financial exposure
        financial_factors = [
            f for f in risk_factors if f.category == RiskCategory.FINANCIAL_EXPOSURE
        ]
        if any(f.score > 6.0 for f in financial_factors):
            sme_risks.append(
                "High financial exposure relative to typical SME cash flow"
            )

        # Legal support limitations
        legal_factors = [
            f for f in risk_factors if f.category == RiskCategory.LEGAL_COMPLIANCE
        ]
        if any(f.score > 7.0 for f in legal_factors):
            sme_risks.append("Complex legal issues may require external legal support")

        return sme_risks

    def _identify_industry_risks(
        self, risk_factors: List[RiskFactor], company: Company
    ) -> List[str]:
        """Identify industry-specific risks"""
        industry_risks = []

        # Technology industry risks
        if company.industry == IndustryType.TECHNOLOGY:
            ip_factors = [
                f
                for f in risk_factors
                if f.category == RiskCategory.CONFIDENTIALITY_RISK
            ]
            if ip_factors:
                industry_risks.append("IP protection critical for technology companies")

        # Professional services risks
        if company.industry == IndustryType.PROFESSIONAL_SERVICES:
            performance_factors = [
                f for f in risk_factors if f.category == RiskCategory.PERFORMANCE_RISK
            ]
            if performance_factors:
                industry_risks.append(
                    "Professional liability and service quality standards"
                )

        # Financial services risks
        if company.industry == IndustryType.FINANCE:
            compliance_factors = [
                f for f in risk_factors if f.category == RiskCategory.LEGAL_COMPLIANCE
            ]
            if compliance_factors:
                industry_risks.append(
                    "Additional FCA regulatory compliance requirements"
                )

        return industry_risks

    def _generate_assessment_summary(
        self,
        overall_score: float,
        risk_level: RiskLevel,
        risk_factors: List[RiskFactor],
        company: Company,
    ) -> str:
        """Generate human-readable assessment summary"""
        risk_level_descriptions = {
            RiskLevel.LOW: "low risk",
            RiskLevel.MEDIUM: "moderate risk",
            RiskLevel.HIGH: "high risk",
            RiskLevel.CRITICAL: "critical risk",
        }

        risk_desc = risk_level_descriptions.get(risk_level, "unknown risk")

        summary = f"This contract presents {risk_desc} (score: {overall_score}/10) for {company.name}. "

        high_risk_count = len(
            [
                f
                for f in risk_factors
                if f.severity in [RiskLevel.HIGH, RiskLevel.CRITICAL]
            ]
        )

        if high_risk_count == 0:
            summary += (
                "No major risk concerns identified. Standard due diligence recommended."
            )
        elif high_risk_count <= 2:
            summary += f"{high_risk_count} significant risk area(s) identified requiring attention."
        else:
            summary += f"Multiple significant risks identified ({
                high_risk_count} areas). Legal review strongly recommended."

        # Add SME-specific context
        if company.company_size in [CompanySize.MICRO, CompanySize.SMALL]:
            if overall_score > 7.0:
                summary += " Given the company's size, these risks could have significant business impact."

        return summary

    def _calculate_assessment_confidence(self, risk_factors: List[RiskFactor]) -> float:
        """Calculate overall confidence in risk assessment"""
        if not risk_factors:
            return 0.5  # Low confidence with no factors

        # Average confidence across all factors, weighted by significance
        total_weighted_confidence = 0.0
        total_weight = 0.0

        for factor in risk_factors:
            weight = factor.score / 10.0  # Higher risk factors get more weight
            total_weighted_confidence += factor.confidence * weight
            total_weight += weight

        if total_weight > 0:
            return round(total_weighted_confidence / total_weight, 2)
        else:
            return 0.5

    def _initialize_risk_patterns(self):
        """Initialize risk detection patterns"""
        # This would be expanded with more sophisticated pattern recognition
        pass

    def _initialize_industry_modifiers(self):
        """Initialize industry-specific risk modifiers"""
        # This would contain industry-specific risk adjustments
        pass

    def _initialize_sme_risk_factors(self):
        """Initialize SME-specific risk considerations"""
        # This would contain SME-specific risk patterns and thresholds
        pass


# Singleton instance for application use
ai_risk_assessment_service = AIRiskAssessmentService()
