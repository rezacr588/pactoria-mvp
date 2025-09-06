"""
Unit tests for Company domain entity
Tests business rules, validation, and domain events
Following TDD principles with comprehensive coverage
"""

import pytest
from datetime import datetime, timezone
from uuid import uuid4

from app.domain.entities.company import (
    Company,
    CompanyId,
    CompanyNumber,
    VATNumber,
    BusinessAddress,
    CompanyType,
    IndustryType,
    CompanySize,
    CompanyStatus,
    CompanyRegistered,
    CompanyVerified,
    CompanyDetailsUpdated,
)
from app.domain.value_objects import Email
from app.domain.exceptions import DomainValidationError, BusinessRuleViolationError


class TestCompanyId:
    """Test CompanyId value object"""

    def test_valid_company_id(self):
        """Test creating valid company ID"""
        company_id = CompanyId("test-company-123")
        assert company_id.value == "test-company-123"
        assert str(company_id) == "test-company-123"

    def test_empty_company_id_raises_error(self):
        """Test empty company ID raises validation error"""
        with pytest.raises(DomainValidationError, match="Company ID cannot be empty"):
            CompanyId("")

        with pytest.raises(DomainValidationError, match="Company ID cannot be empty"):
            CompanyId("   ")


class TestCompanyNumber:
    """Test UK Companies House number validation"""

    def test_valid_company_numbers(self):
        """Test valid UK company number formats"""
        valid_numbers = [
            "12345678",  # Standard 8 digits
            "1234567",  # 7 digits (older companies)
            "SC123456",  # Scottish company
            "NI123456",  # Northern Ireland company
            "OC123456",  # LLP company
        ]

        for number in valid_numbers:
            company_number = CompanyNumber(number)
            assert company_number.value == number

    def test_invalid_company_numbers(self):
        """Test invalid company number formats"""
        invalid_numbers = [
            "",  # Empty
            "123",  # Too short
            "123456789",  # Too long
            "ABC123456",  # Invalid prefix
            "12345ABC",  # Letters in number part
        ]

        for number in invalid_numbers:
            with pytest.raises(
                DomainValidationError, match="Invalid UK company number"
            ):
                CompanyNumber(number)


class TestVATNumber:
    """Test UK VAT number validation"""

    def test_valid_vat_numbers(self):
        """Test valid UK VAT number formats"""
        valid_numbers = [
            "123456789",  # 9 digits
            "GB123456789",  # With GB prefix
            "123456789012",  # 12 digits
        ]

        for number in valid_numbers:
            vat_number = VATNumber(number)
            assert vat_number.value == number

    def test_invalid_vat_numbers(self):
        """Test invalid VAT number formats"""
        invalid_numbers = [
            "",  # Empty
            "12345",  # Too short
            "1234567890123",  # Too long
            "GB12345",  # With prefix but too short
            "12345ABC9",  # Contains letters
        ]

        for number in invalid_numbers:
            with pytest.raises(DomainValidationError, match="Invalid UK VAT number"):
                VATNumber(number)


class TestBusinessAddress:
    """Test UK business address validation"""

    def test_valid_address(self):
        """Test creating valid business address"""
        address = BusinessAddress(
            line1="123 Test Street",
            city="London",
            postcode="SW1A 1AA",
            line2="Suite 100",
            county="Greater London",
        )

        assert address.line1 == "123 Test Street"
        assert address.line2 == "Suite 100"
        assert address.city == "London"
        assert address.county == "Greater London"
        assert address.postcode == "SW1A 1AA"
        assert address.country == "United Kingdom"

    def test_minimal_valid_address(self):
        """Test address with only required fields"""
        address = BusinessAddress(
            line1="123 Test Street", city="London", postcode="SW1A 1AA"
        )

        assert address.line2 is None
        assert address.county is None
        assert address.country == "United Kingdom"

    def test_invalid_address_missing_required_fields(self):
        """Test address validation with missing required fields"""
        with pytest.raises(
            DomainValidationError, match="Address line 1 cannot be empty"
        ):
            BusinessAddress(line1="", city="London", postcode="SW1A 1AA")

        with pytest.raises(DomainValidationError, match="City cannot be empty"):
            BusinessAddress(line1="123 Test Street", city="", postcode="SW1A 1AA")

        with pytest.raises(DomainValidationError, match="Postcode cannot be empty"):
            BusinessAddress(line1="123 Test Street", city="London", postcode="")

    def test_invalid_postcode_format(self):
        """Test invalid UK postcode formats"""
        invalid_postcodes = [
            "INVALID",  # Invalid format
            "12345",  # US-style zip
            "SW1A",  # Incomplete
        ]

        for postcode in invalid_postcodes:
            with pytest.raises(DomainValidationError, match="Invalid UK postcode"):
                BusinessAddress(
                    line1="123 Test Street", city="London", postcode=postcode
                )

    def test_formatted_address(self):
        """Test formatted address output"""
        address = BusinessAddress(
            line1="123 Test Street",
            city="London",
            postcode="SW1A 1AA",
            line2="Suite 100",
            county="Greater London",
        )

        formatted = address.formatted_address()
        expected = "123 Test Street, Suite 100, London, Greater London, SW1A 1AA, United Kingdom"
        assert formatted == expected


class TestCompany:
    """Test Company aggregate root"""

    @pytest.fixture
    def valid_company_data(self):
        """Fixture with valid company data"""
        return {
            "company_id": CompanyId(str(uuid4())),
            "name": "Test Company Ltd",
            "company_type": CompanyType.PRIVATE_LIMITED,
            "industry": IndustryType.TECHNOLOGY,
            "address": BusinessAddress(
                line1="123 Test Street", city="London", postcode="SW1A 1AA"
            ),
            "primary_contact_email": Email("test@company.com"),
            "created_by_user_id": str(uuid4()),
        }

    def test_create_company_with_valid_data(self, valid_company_data):
        """Test creating company with valid data"""
        company = Company(**valid_company_data)

        assert company.id == valid_company_data["company_id"]
        assert company.name == valid_company_data["name"]
        assert company.company_type == valid_company_data["company_type"]
        assert company.industry == valid_company_data["industry"]
        assert company.status == CompanyStatus.ACTIVE
        assert company.company_size == CompanySize.SMALL
        assert not company.is_verified
        assert not company.is_vat_registered
        assert company.subscription_tier == "starter"
        assert company.max_team_members == 5
        assert company.max_contracts_per_month == 50
        assert company.monthly_contract_count == 0

    def test_register_company_factory_method(self, valid_company_data):
        """Test company registration factory method"""
        company = Company.register(**valid_company_data)

        # Should have domain event
        assert company.has_domain_events()
        events = company.get_domain_events()
        assert len(events) == 1
        assert isinstance(events[0], CompanyRegistered)
        assert events[0].company_name == valid_company_data["name"]

    def test_company_name_validation(self, valid_company_data):
        """Test company name validation"""
        # Empty name
        with pytest.raises(DomainValidationError, match="Company name cannot be empty"):
            valid_company_data["name"] = ""
            Company(**valid_company_data)

        # Too long name (over 160 characters)
        with pytest.raises(DomainValidationError, match="Company name too long"):
            valid_company_data["name"] = "A" * 161
            Company(**valid_company_data)

    def test_update_company_name(self, valid_company_data):
        """Test updating company name"""
        company = Company(**valid_company_data)
        user_id = str(uuid4())

        company.update_name("New Company Name Ltd", user_id)

        assert company.name == "New Company Name Ltd"
        assert company.version == 2  # Version incremented

        # Should have domain event
        assert company.has_domain_events()
        events = company.get_domain_events()
        assert any(isinstance(event, CompanyDetailsUpdated) for event in events)

    def test_update_address(self, valid_company_data):
        """Test updating business address"""
        company = Company(**valid_company_data)
        user_id = str(uuid4())

        new_address = BusinessAddress(
            line1="456 New Street", city="Manchester", postcode="M1 1AA"
        )

        company.update_address(new_address, user_id)

        assert company.address == new_address
        assert company.version == 2

    def test_register_vat_number(self, valid_company_data):
        """Test registering VAT number"""
        company = Company(**valid_company_data)
        user_id = str(uuid4())

        vat_number = VATNumber("123456789")
        company.register_vat_number(vat_number, user_id)

        assert company.vat_number == vat_number
        assert company.is_vat_registered
        assert "vat_compliance" in company.compliance_requirements
        assert company.version == 2

    def test_verify_with_companies_house(self, valid_company_data):
        """Test Companies House verification"""
        # Create company with company number
        valid_company_data["company_number"] = CompanyNumber("12345678")
        company = Company(**valid_company_data)
        user_id = str(uuid4())

        verification_data = {
            "name": "Verified Company Name Ltd",
            "company_status": "active",
            "verification_source": "companies_house",
        }

        company.verify_with_companies_house(verification_data, user_id)

        assert company.is_verified
        assert company.verified_at is not None
        assert company.name == "Verified Company Name Ltd"  # Name updated from CH

        # Should have verification event
        events = company.get_domain_events()
        verification_events = [e for e in events if isinstance(e, CompanyVerified)]
        assert len(verification_events) == 1

    def test_verify_without_company_number_fails(self, valid_company_data):
        """Test verification fails without company number"""
        company = Company(**valid_company_data)
        user_id = str(uuid4())

        with pytest.raises(
            BusinessRuleViolationError,
            match="Cannot verify company without company number",
        ):
            company.verify_with_companies_house({}, user_id)

    def test_upgrade_subscription(self, valid_company_data):
        """Test subscription upgrade"""
        company = Company(**valid_company_data)
        user_id = str(uuid4())

        company.upgrade_subscription("professional", user_id)

        assert company.subscription_tier == "professional"
        assert company.max_team_members == 20
        assert company.max_contracts_per_month == 200
        assert "advanced_analytics" in company.features_enabled
        assert "api_access" in company.features_enabled

    def test_invalid_subscription_tier(self, valid_company_data):
        """Test invalid subscription tier"""
        company = Company(**valid_company_data)
        user_id = str(uuid4())

        with pytest.raises(
            BusinessRuleViolationError, match="Invalid subscription tier"
        ):
            company.upgrade_subscription("invalid_tier", user_id)

    def test_increment_monthly_contracts(self, valid_company_data):
        """Test incrementing monthly contract count"""
        company = Company(**valid_company_data)

        # Should work within limit
        company.increment_monthly_contracts()
        assert company.monthly_contract_count == 1

        # Test reaching limit
        company._monthly_contract_count = 49  # Near limit
        company.increment_monthly_contracts()
        assert company.monthly_contract_count == 50

        # Should fail when over limit
        with pytest.raises(
            BusinessRuleViolationError, match="Monthly contract limit reached"
        ):
            company.increment_monthly_contracts()

    def test_reset_monthly_contract_count(self, valid_company_data):
        """Test resetting monthly contract count"""
        company = Company(**valid_company_data)
        company._monthly_contract_count = 25

        company.reset_monthly_contract_count()

        assert company.monthly_contract_count == 0
        assert company.version == 2

    def test_update_company_size(self, valid_company_data):
        """Test updating company size"""
        company = Company(**valid_company_data)
        user_id = str(uuid4())

        company.update_company_size(CompanySize.MEDIUM, user_id)

        assert company.company_size == CompanySize.MEDIUM
        assert company.version == 2

    def test_large_company_auto_upgrade(self, valid_company_data):
        """Test large company automatic enterprise upgrade"""
        company = Company(**valid_company_data)
        user_id = str(uuid4())

        company.update_company_size(CompanySize.LARGE, user_id)

        assert company.subscription_tier == "enterprise"
        assert company.max_team_members == 100
        assert company.max_contracts_per_month == 1000

    def test_sme_eligibility(self, valid_company_data):
        """Test SME eligibility check"""
        company = Company(**valid_company_data)

        # Small company should be SME eligible
        assert company.is_sme_eligible()

        # Large company should not be SME eligible
        company._company_size = CompanySize.LARGE
        assert not company.is_sme_eligible()

    def test_compliance_requirements(self, valid_company_data):
        """Test compliance requirements determination"""
        # Basic company
        company = Company(**valid_company_data)
        requirements = company.compliance_requirements

        assert "gdpr" in requirements
        assert "data_protection" in requirements
        assert "vat_compliance" not in requirements  # Not VAT registered

        # VAT registered company
        vat_company_data = valid_company_data.copy()
        vat_company_data["vat_number"] = VATNumber("123456789")
        vat_company = Company(**vat_company_data)

        assert "vat_compliance" in vat_company.compliance_requirements

    def test_applicable_regulations(self, valid_company_data):
        """Test applicable regulations for different industries"""
        # Technology company
        company = Company(**valid_company_data)
        regulations = company.get_applicable_regulations()

        assert "GDPR" in regulations
        assert "Data Protection Act 2018" in regulations

        # Finance company
        valid_company_data["industry"] = IndustryType.FINANCE
        finance_company = Company(**valid_company_data)
        finance_regulations = finance_company.get_applicable_regulations()

        assert "FCA Regulations" in finance_regulations
        assert "Money Laundering Regulations" in finance_regulations

    def test_requires_compliance_check(self, valid_company_data):
        """Test compliance check requirement"""
        company = Company(**valid_company_data)

        # Should require compliance check (has requirements)
        assert company.requires_compliance_check()

    def test_can_add_team_member(self, valid_company_data):
        """Test team member addition capability"""
        company = Company(**valid_company_data)

        # Basic implementation always returns True
        # Real implementation would check current team size
        assert company.can_add_team_member()

    def test_from_persistence_reconstruction(self, valid_company_data):
        """Test reconstructing company from persistence data"""
        original_company = Company(**valid_company_data)

        # Simulate persistence reconstruction
        reconstructed = Company.from_persistence(
            company_id=original_company.id,
            name=original_company.name,
            company_type=original_company.company_type,
            industry=original_company.industry,
            address=original_company.address,
            primary_contact_email=original_company.primary_contact_email,
            created_by_user_id=original_company.created_by_user_id,
            version=2,
            created_at=datetime.now(timezone.utc),
        )

        assert reconstructed.id == original_company.id
        assert reconstructed.name == original_company.name
        assert reconstructed.version == 2
        assert not reconstructed.has_domain_events()  # Events cleared

    def test_domain_events_lifecycle(self, valid_company_data):
        """Test domain events are properly managed"""
        company = Company.register(**valid_company_data)

        # Should have registration event
        assert company.has_domain_events()
        events = company.get_domain_events()
        assert len(events) == 1

        # Clear events
        company.clear_domain_events()
        assert not company.has_domain_events()
        assert len(company.get_domain_events()) == 0

    def test_entity_equality(self, valid_company_data):
        """Test entity equality based on ID"""
        company1 = Company(**valid_company_data)

        # Same ID should be equal
        valid_company_data["name"] = "Different Name"
        company2 = Company(**valid_company_data)
        assert company1 == company2

        # Different ID should not be equal
        valid_company_data["company_id"] = CompanyId(str(uuid4()))
        company3 = Company(**valid_company_data)
        assert company1 != company3

    def test_version_management(self, valid_company_data):
        """Test version management for optimistic concurrency"""
        company = Company(**valid_company_data)
        initial_version = company.version

        # Operations should increment version
        company.update_name("New Name", str(uuid4()))
        assert company.version == initial_version + 1

        company.set_phone_number("01234567890", str(uuid4()))
        assert company.version == initial_version + 2

        company.set_website("https://example.com", str(uuid4()))
        assert company.version == initial_version + 3
