"""
UK Legal Compliance Engine - Domain service for UK business law compliance
Provides comprehensive compliance checking, regulatory monitoring, and legal validation
Tailored specifically for UK SME market requirements
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from enum import Enum
import re

from app.domain.entities.company import Company, IndustryType, CompanySize, CompanyType
from app.domain.entities.template import ComplianceFramework, LegalJurisdiction
from app.domain.value_objects import ContractType, Money


class ComplianceLevel(str, Enum):
    """Compliance assessment levels"""

    COMPLIANT = "compliant"
    MINOR_ISSUES = "minor_issues"
    MAJOR_ISSUES = "major_issues"
    NON_COMPLIANT = "non_compliant"
    REQUIRES_REVIEW = "requires_review"


class RiskLevel(str, Enum):
    """Risk assessment levels"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class UKRegulationType(str, Enum):
    """Types of UK regulations"""

    STATUTORY = "statutory"  # Acts of Parliament
    REGULATORY = "regulatory"  # Regulatory instruments
    COMMON_LAW = "common_law"  # Case law
    EU_RETAINED = "eu_retained"  # Retained EU law
    GUIDANCE = "guidance"  # Government guidance
    INDUSTRY_STANDARD = "industry_standard"  # Industry codes


@dataclass
class ComplianceRule:
    """Individual compliance rule"""

    rule_id: str
    title: str
    description: str
    regulation_type: UKRegulationType
    applicable_frameworks: List[ComplianceFramework]
    applicable_industries: List[IndustryType] = field(default_factory=list)
    applicable_company_sizes: List[CompanySize] = field(default_factory=list)
    applicable_contract_types: List[ContractType] = field(default_factory=list)
    jurisdiction: LegalJurisdiction = LegalJurisdiction.UK_WIDE

    # Rule implementation
    pattern: Optional[str] = None  # Regex pattern to match
    required_clauses: List[str] = field(default_factory=list)
    prohibited_clauses: List[str] = field(default_factory=list)
    validation_function: Optional[str] = None  # Custom validation function name

    # Metadata
    legal_reference: Optional[str] = None
    guidance_url: Optional[str] = None
    last_updated: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True


@dataclass
class ComplianceViolation:
    """Compliance rule violation"""

    rule_id: str
    rule_title: str
    severity: RiskLevel
    description: str
    location: Optional[str] = None  # Where in document the violation occurs
    suggested_fix: Optional[str] = None
    legal_reference: Optional[str] = None
    auto_fixable: bool = False


@dataclass
class ComplianceAssessment:
    """Complete compliance assessment result"""

    overall_level: ComplianceLevel
    overall_score: float  # 0-100
    risk_level: RiskLevel
    violations: List[ComplianceViolation]
    passed_rules: List[str]
    warnings: List[str]
    recommendations: List[str]
    assessed_at: datetime
    assessment_duration_ms: float

    # Framework-specific scores
    framework_scores: Dict[str, float] = field(default_factory=dict)

    def is_compliant(self) -> bool:
        """Check if overall compliant"""
        return self.overall_level in [
            ComplianceLevel.COMPLIANT,
            ComplianceLevel.MINOR_ISSUES,
        ]

    def has_critical_violations(self) -> bool:
        """Check if there are critical violations"""
        return any(v.severity == RiskLevel.CRITICAL for v in self.violations)

    def get_violations_by_severity(
        self, severity: RiskLevel
    ) -> List[ComplianceViolation]:
        """Get violations of specific severity"""
        return [v for v in self.violations if v.severity == severity]


class UKComplianceRuleEngine:
    """
    UK-specific compliance rule engine
    Contains all the UK legal compliance rules and validation logic
    """

    def __init__(self):
        self._rules: Dict[str, ComplianceRule] = {}
        self._initialize_uk_rules()

    def _initialize_uk_rules(self):
        """Initialize UK-specific compliance rules"""

        # GDPR and Data Protection Rules
        self._add_rule(
            ComplianceRule(
                rule_id="GDPR_001",
                title="Data Protection Clause Required",
                description="Contracts processing personal data must include GDPR compliance clauses",
                regulation_type=UKRegulationType.STATUTORY,
                applicable_frameworks=[ComplianceFramework.GDPR],
                pattern=r"(?i)(personal\s+data|data\s+protection|gdpr|data\s+controller|data\s+processor)",
                required_clauses=["data_protection_clause"],
                legal_reference="General Data Protection Regulation 2016/679, Data Protection Act 2018",
                guidance_url="https://ico.org.uk/for-organisations/guide-to-data-protection/",
            )
        )

        self._add_rule(
            ComplianceRule(
                rule_id="GDPR_002",
                title="Lawful Basis for Processing",
                description="Must specify lawful basis for processing personal data",
                regulation_type=UKRegulationType.STATUTORY,
                applicable_frameworks=[ComplianceFramework.GDPR],
                validation_function="validate_lawful_basis",
                legal_reference="GDPR Article 6",
            )
        )

        # Unfair Contract Terms Act Rules
        self._add_rule(
            ComplianceRule(
                rule_id="UCTA_001",
                title="Liability Exclusion Limitations",
                description="Cannot exclude liability for death or personal injury",
                regulation_type=UKRegulationType.STATUTORY,
                applicable_frameworks=[ComplianceFramework.COMMERCIAL_LAW],
                prohibited_clauses=["death_injury_exclusion"],
                legal_reference="Unfair Contract Terms Act 1977, s.2(1)",
                applicable_contract_types=[
                    ContractType.SERVICE_AGREEMENT,
                    ContractType.SUPPLIER_AGREEMENT,
                ],
            )
        )

        self._add_rule(
            ComplianceRule(
                rule_id="UCTA_002",
                title="Reasonableness Test for Exclusions",
                description="Liability exclusions must satisfy reasonableness test",
                regulation_type=UKRegulationType.STATUTORY,
                applicable_frameworks=[ComplianceFramework.COMMERCIAL_LAW],
                validation_function="validate_reasonableness",
                legal_reference="Unfair Contract Terms Act 1977, s.11",
            )
        )

        # Employment Law Rules
        self._add_rule(
            ComplianceRule(
                rule_id="EMP_001",
                title="Minimum Notice Period",
                description="Employment contracts must specify minimum notice periods",
                regulation_type=UKRegulationType.STATUTORY,
                applicable_frameworks=[ComplianceFramework.EMPLOYMENT_LAW],
                applicable_contract_types=[ContractType.EMPLOYMENT_CONTRACT],
                required_clauses=["notice_period"],
                legal_reference="Employment Rights Act 1996, s.86",
            )
        )

        self._add_rule(
            ComplianceRule(
                rule_id="EMP_002",
                title="Holiday Entitlement",
                description="Must specify statutory minimum holiday entitlement",
                regulation_type=UKRegulationType.STATUTORY,
                applicable_frameworks=[ComplianceFramework.EMPLOYMENT_LAW],
                applicable_contract_types=[ContractType.EMPLOYMENT_CONTRACT],
                pattern=r"(?i)(holiday|annual\s+leave|vacation)",
                legal_reference="Working Time Regulations 1998",
            )
        )

        # Consumer Rights Act Rules
        self._add_rule(
            ComplianceRule(
                rule_id="CRA_001",
                title="Consumer Rights Protection",
                description="B2C contracts must not unfairly prejudice consumer rights",
                regulation_type=UKRegulationType.STATUTORY,
                applicable_frameworks=[ComplianceFramework.CONSUMER_RIGHTS],
                validation_function="validate_consumer_fairness",
                legal_reference="Consumer Rights Act 2015",
            )
        )

        # Company Law Rules
        self._add_rule(
            ComplianceRule(
                rule_id="CO_001",
                title="Director Authority Requirements",
                description="Contracts binding companies must ensure director has authority",
                regulation_type=UKRegulationType.STATUTORY,
                applicable_frameworks=[ComplianceFramework.COMPANY_LAW],
                applicable_company_sizes=[
                    CompanySize.SMALL,
                    CompanySize.MEDIUM,
                    CompanySize.LARGE,
                ],
                validation_function="validate_director_authority",
                legal_reference="Companies Act 2006",
            )
        )

        # Competition Law Rules
        self._add_rule(
            ComplianceRule(
                rule_id="COMP_001",
                title="Anti-Competitive Clauses",
                description="Prohibit clauses that restrict competition",
                regulation_type=UKRegulationType.STATUTORY,
                applicable_frameworks=[ComplianceFramework.COMPETITION_LAW],
                prohibited_clauses=[
                    "non_compete_excessive",
                    "price_fixing",
                    "market_sharing",
                ],
                legal_reference="Competition Act 1998",
            )
        )

        # Financial Services Rules
        self._add_rule(
            ComplianceRule(
                rule_id="FIN_001",
                title="FCA Authorization Requirements",
                description="Financial services contracts require FCA authorization",
                regulation_type=UKRegulationType.REGULATORY,
                applicable_frameworks=[ComplianceFramework.FINANCIAL_SERVICES],
                applicable_industries=[IndustryType.FINANCE],
                validation_function="validate_fca_authorization",
                legal_reference="Financial Services and Markets Act 2000",
            )
        )

        # Health & Safety Rules
        self._add_rule(
            ComplianceRule(
                rule_id="HS_001",
                title="Health & Safety Duties",
                description="Employment contracts must address H&S duties",
                regulation_type=UKRegulationType.STATUTORY,
                applicable_frameworks=[ComplianceFramework.HEALTH_SAFETY],
                applicable_contract_types=[ContractType.EMPLOYMENT_CONTRACT],
                required_clauses=["health_safety_duties"],
                legal_reference="Health and Safety at Work etc. Act 1974",
            )
        )

        # IP and Confidentiality Rules
        self._add_rule(
            ComplianceRule(
                rule_id="IP_001",
                title="Confidentiality Duration Limits",
                description="Confidentiality clauses should have reasonable time limits",
                regulation_type=UKRegulationType.COMMON_LAW,
                applicable_frameworks=[ComplianceFramework.COMMERCIAL_LAW],
                validation_function="validate_confidentiality_duration",
                legal_reference="Common law reasonableness principles",
            )
        )

        # Brexit/Post-EU Rules
        self._add_rule(
            ComplianceRule(
                rule_id="BREXIT_001",
                title="Retained EU Law References",
                description="Update references to retained EU law post-Brexit",
                regulation_type=UKRegulationType.EU_RETAINED,
                applicable_frameworks=[ComplianceFramework.COMMERCIAL_LAW],
                validation_function="validate_eu_law_references",
                legal_reference="European Union (Withdrawal) Act 2018",
            )
        )

    def _add_rule(self, rule: ComplianceRule):
        """Add a compliance rule to the engine"""
        self._rules[rule.rule_id] = rule

    def get_applicable_rules(
        self,
        company: Company,
        contract_type: ContractType,
        frameworks: List[ComplianceFramework] = None,
    ) -> List[ComplianceRule]:
        """Get rules applicable to specific company and contract"""
        applicable_rules = []

        for rule in self._rules.values():
            if not rule.is_active:
                continue

            # Check framework applicability
            if frameworks:
                if not any(f in rule.applicable_frameworks for f in frameworks):
                    continue

            # Check industry applicability
            if rule.applicable_industries:
                if company.industry not in rule.applicable_industries:
                    continue

            # Check company size applicability
            if rule.applicable_company_sizes:
                if company.company_size not in rule.applicable_company_sizes:
                    continue

            # Check contract type applicability
            if rule.applicable_contract_types:
                if contract_type not in rule.applicable_contract_types:
                    continue

            # Check jurisdiction (assume UK-wide for now)
            if rule.jurisdiction != LegalJurisdiction.UK_WIDE:
                # Could add company location checking here
                pass

            applicable_rules.append(rule)

        return applicable_rules

    def validate_contract(
        self,
        contract_content: str,
        company: Company,
        contract_type: ContractType,
        contract_value: Optional[Money] = None,
    ) -> ComplianceAssessment:
        """Validate contract against UK compliance rules"""
        start_time = datetime.now(timezone.utc)

        # Get applicable rules
        applicable_rules = self.get_applicable_rules(company, contract_type)

        violations: List[ComplianceViolation] = []
        passed_rules: List[str] = []
        warnings: List[str] = []
        recommendations: List[str] = []
        framework_scores: Dict[str, float] = {}

        # Validate against each rule
        for rule in applicable_rules:
            try:
                violation = self._validate_rule(
                    rule, contract_content, company, contract_value
                )
                if violation:
                    violations.append(violation)
                else:
                    passed_rules.append(rule.rule_id)
            except Exception as e:
                warnings.append(f"Could not validate rule {rule.rule_id}: {str(e)}")

        # Calculate framework-specific scores
        for framework in ComplianceFramework:
            framework_rules = [
                r for r in applicable_rules if framework in r.applicable_frameworks
            ]
            if framework_rules:
                framework_passed = len(
                    [r for r in framework_rules if r.rule_id in passed_rules]
                )
                framework_scores[framework.value] = (
                    framework_passed / len(framework_rules)
                ) * 100

        # Calculate overall compliance
        overall_score = self._calculate_overall_score(violations, len(applicable_rules))
        overall_level = self._determine_compliance_level(overall_score, violations)
        risk_level = self._determine_risk_level(violations)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            violations, company, contract_type
        )

        end_time = datetime.now(timezone.utc)
        duration_ms = (end_time - start_time).total_seconds() * 1000

        return ComplianceAssessment(
            overall_level=overall_level,
            overall_score=overall_score,
            risk_level=risk_level,
            violations=violations,
            passed_rules=passed_rules,
            warnings=warnings,
            recommendations=recommendations,
            assessed_at=start_time,
            assessment_duration_ms=duration_ms,
            framework_scores=framework_scores,
        )

    def _validate_rule(
        self,
        rule: ComplianceRule,
        content: str,
        company: Company,
        contract_value: Optional[Money],
    ) -> Optional[ComplianceViolation]:
        """Validate a single compliance rule"""

        # Pattern-based validation
        if rule.pattern:
            if not re.search(rule.pattern, content, re.IGNORECASE | re.MULTILINE):
                return ComplianceViolation(
                    rule_id=rule.rule_id,
                    rule_title=rule.title,
                    severity=RiskLevel.MEDIUM,
                    description=f"Required pattern not found: {rule.description}",
                    suggested_fix=f"Add clauses related to: {rule.title}",
                    legal_reference=rule.legal_reference,
                )

        # Required clauses validation
        if rule.required_clauses:
            for required_clause in rule.required_clauses:
                if not self._check_clause_present(content, required_clause):
                    return ComplianceViolation(
                        rule_id=rule.rule_id,
                        rule_title=rule.title,
                        severity=RiskLevel.HIGH,
                        description=f"Required clause missing: {required_clause}",
                        suggested_fix=f"Add {required_clause} clause as required by {rule.legal_reference}",
                        legal_reference=rule.legal_reference,
                        auto_fixable=True,
                    )

        # Prohibited clauses validation
        if rule.prohibited_clauses:
            for prohibited_clause in rule.prohibited_clauses:
                if self._check_clause_present(content, prohibited_clause):
                    return ComplianceViolation(
                        rule_id=rule.rule_id,
                        rule_title=rule.title,
                        severity=RiskLevel.CRITICAL,
                        description=f"Prohibited clause found: {prohibited_clause}",
                        suggested_fix=f"Remove or modify {prohibited_clause} clause",
                        legal_reference=rule.legal_reference,
                    )

        # Custom validation functions
        if rule.validation_function:
            return self._execute_custom_validation(
                rule, content, company, contract_value
            )

        return None

    def _check_clause_present(self, content: str, clause_identifier: str) -> bool:
        """Check if a specific clause is present in content"""
        # Map clause identifiers to detection patterns
        clause_patterns = {
            "data_protection_clause": r"(?i)(data\s+protection|gdpr|personal\s+data\s+processing)",
            "notice_period": r"(?i)(notice\s+period|termination\s+notice|\d+\s*(days?|weeks?|months?)\s*notice)",
            "health_safety_duties": r"(?i)(health\s+and\s+safety|h&s|hasawa|safety\s+duties)",
            "death_injury_exclusion": r"(?i)(exclude.*liability.*death|exclude.*liability.*personal\s+injury)",
            "non_compete_excessive": r"(?i)(non-compete|restraint.*trade|not.*compete.*\d+\s*years)",
            "price_fixing": r"(?i)(fix.*price|price.*agreement|pricing.*arrangement)",
            "market_sharing": r"(?i)(market.*sharing|divide.*market|allocate.*customers)",
        }

        pattern = clause_patterns.get(clause_identifier)
        if pattern:
            return bool(re.search(pattern, content, re.IGNORECASE | re.MULTILINE))

        # Fallback to simple keyword search
        return clause_identifier.lower() in content.lower()

    def _execute_custom_validation(
        self,
        rule: ComplianceRule,
        content: str,
        company: Company,
        contract_value: Optional[Money],
    ) -> Optional[ComplianceViolation]:
        """Execute custom validation functions"""

        if rule.validation_function == "validate_lawful_basis":
            return self._validate_lawful_basis(rule, content)

        elif rule.validation_function == "validate_reasonableness":
            return self._validate_reasonableness(rule, content, contract_value)

        elif rule.validation_function == "validate_consumer_fairness":
            return self._validate_consumer_fairness(rule, content, company)

        elif rule.validation_function == "validate_director_authority":
            return self._validate_director_authority(rule, content, company)

        elif rule.validation_function == "validate_fca_authorization":
            return self._validate_fca_authorization(rule, content, company)

        elif rule.validation_function == "validate_confidentiality_duration":
            return self._validate_confidentiality_duration(rule, content)

        elif rule.validation_function == "validate_eu_law_references":
            return self._validate_eu_law_references(rule, content)

        return None

    def _validate_lawful_basis(
        self, rule: ComplianceRule, content: str
    ) -> Optional[ComplianceViolation]:
        """Validate GDPR lawful basis specification"""
        lawful_bases = [
            "consent",
            "contract",
            "legal obligation",
            "vital interests",
            "public task",
            "legitimate interests",
        ]

        content_lower = content.lower()
        if any(basis in content_lower for basis in lawful_bases):
            return None

        return ComplianceViolation(
            rule_id=rule.rule_id,
            rule_title=rule.title,
            severity=RiskLevel.HIGH,
            description="No lawful basis for processing personal data specified",
            suggested_fix="Add specific lawful basis (consent, contract, legal obligation, etc.)",
            legal_reference=rule.legal_reference,
        )

    def _validate_reasonableness(
        self, rule: ComplianceRule, content: str, contract_value: Optional[Money]
    ) -> Optional[ComplianceViolation]:
        """Validate reasonableness of liability exclusions"""
        # Look for broad exclusions
        broad_exclusions = [
            "all liability",
            "any liability",
            "entire liability",
            "total liability",
            "liability whatsoever",
        ]

        content_lower = content.lower()
        for exclusion in broad_exclusions:
            if exclusion in content_lower:
                # Check if there are reasonable limitations
                if not any(
                    term in content_lower
                    for term in ["subject to", "except for", "save for"]
                ):
                    return ComplianceViolation(
                        rule_id=rule.rule_id,
                        rule_title=rule.title,
                        severity=RiskLevel.HIGH,
                        description="Unreasonable broad liability exclusion may be unenforceable",
                        suggested_fix="Add exceptions for fraud, negligence, or statutory rights",
                        legal_reference=rule.legal_reference,
                    )

        return None

    def _validate_consumer_fairness(
        self, rule: ComplianceRule, content: str, company: Company
    ) -> Optional[ComplianceViolation]:
        """Validate consumer fairness (B2C contracts)"""
        # Look for unfair terms indicators
        unfair_indicators = [
            "irrevocably",
            "without recourse",
            "no refund",
            "final sale",
            "exclude all warranties",
            "buyer beware",
        ]

        content_lower = content.lower()
        for indicator in unfair_indicators:
            if indicator in content_lower:
                return ComplianceViolation(
                    rule_id=rule.rule_id,
                    rule_title=rule.title,
                    severity=RiskLevel.MEDIUM,
                    description=f"Potentially unfair term found: {indicator}",
                    suggested_fix="Review term fairness under Consumer Rights Act 2015",
                    legal_reference=rule.legal_reference,
                )

        return None

    def _validate_director_authority(
        self, rule: ComplianceRule, content: str, company: Company
    ) -> Optional[ComplianceViolation]:
        """Validate director signing authority"""
        if company.company_type in [
            CompanyType.PRIVATE_LIMITED,
            CompanyType.PUBLIC_LIMITED,
        ]:
            authority_terms = [
                "duly authorized",
                "acting within authority",
                "board resolution",
            ]

            content_lower = content.lower()
            if not any(term in content_lower for term in authority_terms):
                return ComplianceViolation(
                    rule_id=rule.rule_id,
                    rule_title=rule.title,
                    severity=RiskLevel.MEDIUM,
                    description="No confirmation of director's authority to bind company",
                    suggested_fix="Add clause confirming signatory's authority to bind the company",
                    legal_reference=rule.legal_reference,
                )

        return None

    def _validate_fca_authorization(
        self, rule: ComplianceRule, content: str, company: Company
    ) -> Optional[ComplianceViolation]:
        """Validate FCA authorization for financial services"""
        if company.industry == IndustryType.FINANCE:
            fca_terms = [
                "fca authorized",
                "financial conduct authority",
                "regulated activity",
            ]

            content_lower = content.lower()
            if not any(term in content_lower for term in fca_terms):
                return ComplianceViolation(
                    rule_id=rule.rule_id,
                    rule_title=rule.title,
                    severity=RiskLevel.CRITICAL,
                    description="Financial services contract missing FCA authorization reference",
                    suggested_fix="Add FCA authorization details and regulatory disclosures",
                    legal_reference=rule.legal_reference,
                )

        return None

    def _validate_confidentiality_duration(
        self, rule: ComplianceRule, content: str
    ) -> Optional[ComplianceViolation]:
        """Validate confidentiality clause duration"""
        # Look for excessive confidentiality periods
        duration_pattern = r"(?i)confidential.*(\d+)\s*(years?)"
        match = re.search(duration_pattern, content)

        if match:
            years = int(match.group(1))
            if years > 10:  # Arbitrary threshold for "excessive"
                return ComplianceViolation(
                    rule_id=rule.rule_id,
                    rule_title=rule.title,
                    severity=RiskLevel.MEDIUM,
                    description=f"Confidentiality period of {years} years may be unreasonable",
                    suggested_fix="Consider reducing confidentiality period to 5-7 years",
                    legal_reference=rule.legal_reference,
                )

        return None

    def _validate_eu_law_references(
        self, rule: ComplianceRule, content: str
    ) -> Optional[ComplianceViolation]:
        """Validate EU law references post-Brexit"""
        eu_references = [
            "eu directive",
            "european directive",
            "eu regulation",
            "european regulation",
            "brussels regulation",
            "rome regulation",
        ]

        content_lower = content.lower()
        for ref in eu_references:
            if ref in content_lower and "retained" not in content_lower:
                return ComplianceViolation(
                    rule_id=rule.rule_id,
                    rule_title=rule.title,
                    severity=RiskLevel.LOW,
                    description="EU law reference may need updating for retained EU law",
                    suggested_fix="Update to reference 'retained EU law' where applicable",
                    legal_reference=rule.legal_reference,
                )

        return None

    def _calculate_overall_score(
        self, violations: List[ComplianceViolation], total_rules: int
    ) -> float:
        """Calculate overall compliance score"""
        if total_rules == 0:
            return 100.0

        # Weight violations by severity
        violation_weights = {
            RiskLevel.LOW: 5,
            RiskLevel.MEDIUM: 15,
            RiskLevel.HIGH: 30,
            RiskLevel.CRITICAL: 50,
        }

        total_deductions = sum(
            violation_weights.get(v.severity, 10) for v in violations
        )
        score = max(0, 100 - total_deductions)

        return round(score, 1)

    def _determine_compliance_level(
        self, score: float, violations: List[ComplianceViolation]
    ) -> ComplianceLevel:
        """Determine overall compliance level"""
        critical_violations = [
            v for v in violations if v.severity == RiskLevel.CRITICAL
        ]
        high_violations = [v for v in violations if v.severity == RiskLevel.HIGH]

        if critical_violations:
            return ComplianceLevel.NON_COMPLIANT
        elif high_violations or score < 60:
            return ComplianceLevel.MAJOR_ISSUES
        elif score < 80:
            return ComplianceLevel.MINOR_ISSUES
        elif score < 95:
            return ComplianceLevel.REQUIRES_REVIEW
        else:
            return ComplianceLevel.COMPLIANT

    def _determine_risk_level(self, violations: List[ComplianceViolation]) -> RiskLevel:
        """Determine overall risk level"""
        if any(v.severity == RiskLevel.CRITICAL for v in violations):
            return RiskLevel.CRITICAL
        elif any(v.severity == RiskLevel.HIGH for v in violations):
            return RiskLevel.HIGH
        elif any(v.severity == RiskLevel.MEDIUM for v in violations):
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _generate_recommendations(
        self,
        violations: List[ComplianceViolation],
        company: Company,
        contract_type: ContractType,
    ) -> List[str]:
        """Generate compliance recommendations"""
        recommendations = []

        # Critical violations first
        critical = [v for v in violations if v.severity == RiskLevel.CRITICAL]
        if critical:
            recommendations.append(
                "URGENT: Address critical compliance violations before contract execution"
            )

        # High-risk violations
        high = [v for v in violations if v.severity == RiskLevel.HIGH]
        if high:
            recommendations.append(
                "Strongly recommend legal review for high-risk violations"
            )

        # Industry-specific recommendations
        if (
            company.industry == IndustryType.FINANCE
            and contract_type == ContractType.SERVICE_AGREEMENT
        ):
            recommendations.append(
                "Consider additional FCA regulatory requirements for financial services"
            )

        if company.industry == IndustryType.HEALTHCARE:
            recommendations.append(
                "Ensure compliance with healthcare-specific regulations"
            )

        # Company size recommendations
        if company.company_size == CompanySize.MICRO:
            recommendations.append(
                "Consider using simplified contract templates for micro businesses"
            )

        # Contract type recommendations
        if contract_type == ContractType.EMPLOYMENT_CONTRACT:
            recommendations.append(
                "Ensure all statutory employment rights are properly addressed"
            )

        return recommendations

    def get_regulatory_updates(self, since_date: datetime) -> List[Dict[str, Any]]:
        """Get regulatory updates since specified date (placeholder for future implementation)"""
        # This would integrate with government APIs or legal databases
        # For now, return empty list
        return []

    def suggest_clause_improvements(
        self, content: str, company: Company, contract_type: ContractType
    ) -> List[str]:
        """Suggest clause improvements for better compliance"""
        suggestions = []

        assessment = self.validate_contract(content, company, contract_type)

        # Convert violations to improvement suggestions
        for violation in assessment.violations:
            if violation.suggested_fix:
                suggestions.append(violation.suggested_fix)

        # Add general improvements
        content_lower = content.lower()

        if "force majeure" not in content_lower:
            suggestions.append("Consider adding a force majeure clause")

        if "dispute resolution" not in content_lower:
            suggestions.append("Add dispute resolution and governing law clauses")

        if company.is_vat_registered and "vat" not in content_lower:
            suggestions.append(
                "Include VAT treatment clauses as company is VAT registered"
            )

        return suggestions


# Singleton instance for global use
uk_compliance_engine = UKComplianceRuleEngine()
