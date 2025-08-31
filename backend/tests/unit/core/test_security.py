"""
Unit tests for Core Security Module
Testing JWT token management and password hashing functionality
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, Mock
from jose import jwt, JWTError

from app.core.security import (
    create_access_token,
    verify_token,
    get_password_hash,
    verify_password,
    create_password_reset_token,
    verify_password_reset_token,
    generate_secure_token
)


class TestPasswordHashing:
    """Test password hashing functionality"""
    
    def test_get_password_hash(self):
        """Test password hashing"""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert hashed.startswith("$2b$")  # bcrypt hash format
    
    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed = get_password_hash(password)
        
        assert verify_password(wrong_password, hashed) is False
    
    def test_verify_password_empty(self):
        """Test password verification with empty passwords"""
        hashed = get_password_hash("test")
        
        assert verify_password("", hashed) is False
        assert verify_password("test", "") is False


class TestJWTTokens:
    """Test JWT token functionality"""
    
    def test_create_access_token_with_subject(self):
        """Test creating access token with subject"""
        subject = "user123"
        token = create_access_token(subject)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token contains correct subject
        from app.core.config import settings
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        assert payload["sub"] == subject
    
    def test_create_access_token_with_custom_expiration(self):
        """Test creating access token with custom expiration"""
        subject = "user123"
        expires_delta = timedelta(hours=2)
        
        with patch('app.core.security.get_current_utc') as mock_utc:
            mock_now = datetime(2023, 1, 1, 12, 0, 0)
            mock_utc.return_value = mock_now
            
            token = create_access_token(subject, expires_delta)
        
            # Decode within the same mock context to avoid expiration
            from app.core.config import settings
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], options={"verify_exp": False})
        
        expected_exp = mock_now + expires_delta
        actual_exp = datetime.fromtimestamp(payload["exp"])
        
        # Allow for small timing differences
        assert abs((actual_exp - expected_exp).total_seconds()) < 1
    
    def test_create_access_token_default_expiration(self):
        """Test creating access token with default expiration"""
        subject = "user123"
        
        with patch('app.core.security.get_current_utc') as mock_utc:
            mock_now = datetime(2023, 1, 1, 12, 0, 0)
            mock_utc.return_value = mock_now
            
            token = create_access_token(subject)
            
            # Decode within the same mock context to avoid expiration
            from app.core.config import settings
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], options={"verify_exp": False})
        
        expected_exp = mock_now + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
        actual_exp = datetime.fromtimestamp(payload["exp"])
        
        assert abs((actual_exp - expected_exp).total_seconds()) < 1
    
    def test_create_access_token_integer_subject(self):
        """Test creating access token with integer subject"""
        subject = 12345
        token = create_access_token(subject)
        
        from app.core.config import settings
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        assert payload["sub"] == "12345"  # Should be converted to string
    
    def test_verify_token_valid(self):
        """Test verifying valid token"""
        subject = "user123"
        token = create_access_token(subject)
        
        result = verify_token(token)
        assert result == subject
    
    def test_verify_token_invalid_signature(self):
        """Test verifying token with invalid signature"""
        # Create token with wrong secret
        from jose import jwt
        token = jwt.encode({"sub": "user123"}, "wrong_secret", algorithm="HS256")
        
        result = verify_token(token)
        assert result is None
    
    def test_verify_token_expired(self):
        """Test verifying expired token"""
        subject = "user123"
        # Create token that expired 1 hour ago
        expires_delta = timedelta(hours=-1)
        token = create_access_token(subject, expires_delta)
        
        result = verify_token(token)
        assert result is None
    
    def test_verify_token_malformed(self):
        """Test verifying malformed token"""
        result = verify_token("invalid.token.format")
        assert result is None
    
    def test_verify_token_no_subject(self):
        """Test verifying token without subject"""
        from app.core.config import settings
        from app.core.datetime_utils import get_current_utc
        token = jwt.encode({"exp": (get_current_utc() + timedelta(hours=1)).timestamp()}, 
                          settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        
        result = verify_token(token)
        assert result is None
    
    def test_verify_token_empty(self):
        """Test verifying empty token"""
        result = verify_token("")
        assert result is None


class TestPasswordResetTokens:
    """Test password reset token functionality"""
    
    def test_create_password_reset_token(self):
        """Test creating password reset token"""
        email = "test@example.com"
        
        with patch('app.core.security.get_current_utc') as mock_utc:
            mock_now = datetime(2023, 1, 1, 12, 0, 0)
            mock_utc.return_value = mock_now
            
            token = create_password_reset_token(email)
        
            assert token is not None
            assert isinstance(token, str)
            assert len(token) > 0
            
            # Verify token structure within mock context
            from app.core.config import settings
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], options={"verify_exp": False})
            assert payload["sub"] == email
            assert payload["type"] == "password_reset"
    
    def test_verify_password_reset_token_valid(self):
        """Test verifying valid password reset token"""
        email = "test@example.com"
        token = create_password_reset_token(email)
        
        result = verify_password_reset_token(token)
        assert result == email
    
    def test_verify_password_reset_token_wrong_type(self):
        """Test verifying token with wrong type"""
        email = "test@example.com"
        
        # Create regular access token instead of reset token
        from app.core.config import settings
        from app.core.datetime_utils import get_current_utc
        token = jwt.encode(
            {"sub": email, "type": "access", "exp": (get_current_utc() + timedelta(hours=1)).timestamp()},
            settings.SECRET_KEY, 
            algorithm=settings.JWT_ALGORITHM
        )
        
        result = verify_password_reset_token(token)
        assert result is None
    
    def test_verify_password_reset_token_no_type(self):
        """Test verifying token without type field"""
        email = "test@example.com"
        
        from app.core.config import settings
        from app.core.datetime_utils import get_current_utc
        token = jwt.encode(
            {"sub": email, "exp": (get_current_utc() + timedelta(hours=1)).timestamp()},
            settings.SECRET_KEY, 
            algorithm=settings.JWT_ALGORITHM
        )
        
        result = verify_password_reset_token(token)
        assert result is None
    
    def test_verify_password_reset_token_expired(self):
        """Test verifying expired password reset token"""
        email = "test@example.com"
        
        # Mock time to create expired token
        with patch('app.core.security.get_current_utc') as mock_utc:
            from app.core.datetime_utils import get_current_utc
            # Set time 2 hours ago so token expires 1 hour ago
            mock_utc.return_value = get_current_utc() - timedelta(hours=2)
            token = create_password_reset_token(email)
        
        result = verify_password_reset_token(token)
        assert result is None
    
    def test_verify_password_reset_token_invalid(self):
        """Test verifying invalid password reset token"""
        result = verify_password_reset_token("invalid.token")
        assert result is None


class TestSecureTokenGeneration:
    """Test secure token generation"""
    
    def test_generate_secure_token_default_length(self):
        """Test generating secure token with default length"""
        token = generate_secure_token()
        
        assert isinstance(token, str)
        assert len(token) == 32  # Default length
        assert token.isalnum()  # Should only contain alphanumeric characters
    
    def test_generate_secure_token_custom_length(self):
        """Test generating secure token with custom length"""
        length = 16
        token = generate_secure_token(length)
        
        assert isinstance(token, str)
        assert len(token) == length
        assert token.isalnum()
    
    def test_generate_secure_token_uniqueness(self):
        """Test that generated tokens are unique"""
        tokens = [generate_secure_token() for _ in range(100)]
        
        # All tokens should be unique
        assert len(set(tokens)) == 100
    
    def test_generate_secure_token_zero_length(self):
        """Test generating secure token with zero length"""
        token = generate_secure_token(0)
        
        assert isinstance(token, str)
        assert len(token) == 0
    
    def test_generate_secure_token_large_length(self):
        """Test generating secure token with large length"""
        length = 1000
        token = generate_secure_token(length)
        
        assert isinstance(token, str)
        assert len(token) == length
        assert token.isalnum()


class TestErrorHandling:
    """Test error handling in security functions"""
    
    def test_jwt_error_handling(self):
        """Test JWT error handling"""
        with patch('app.core.security.jwt.decode') as mock_decode:
            mock_decode.side_effect = JWTError("Token error")
            
            result = verify_token("some_token")
            assert result is None
    
    def test_validation_error_handling(self):
        """Test validation error handling"""
        from pydantic import ValidationError
        
        with patch('app.core.security.jwt.decode') as mock_decode:
            # Create a proper ValidationError for Pydantic v2
            mock_decode.side_effect = ValidationError.from_exception_data('ValidationError', [])
            
            result = verify_token("some_token")
            assert result is None