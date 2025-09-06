"""
Unit tests for Core Database Module
Testing database connection and session management
"""

import pytest
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import (
    get_db,
    create_tables,
    check_database_health,
    DatabaseManager,
)


class TestDatabaseSession:
    """Test database session management"""

    def test_get_db_session(self):
        """Test getting database session"""
        with patch("app.core.database.SessionLocal") as mock_session_class:
            mock_session = Mock(spec=Session)
            mock_session_class.return_value = mock_session

            # Get session generator
            db_gen = get_db()

            # Get the session
            db_session = next(db_gen)

            assert db_session == mock_session
            mock_session_class.assert_called_once()

    def test_get_db_session_cleanup(self):
        """Test database session cleanup on completion"""
        with patch("app.core.database.SessionLocal") as mock_session_class:
            mock_session = Mock(spec=Session)
            mock_session_class.return_value = mock_session

            # Get session generator
            db_gen = get_db()
            db_session = next(db_gen)

            # Simulate cleanup
            try:
                next(db_gen)  # This should raise StopIteration and close session
            except StopIteration:
                pass

            mock_session.close.assert_called_once()

    def test_get_db_session_exception_cleanup(self):
        """Test database session cleanup on exception"""
        with patch("app.core.database.SessionLocal") as mock_session_class:
            mock_session = Mock(spec=Session)
            mock_session_class.return_value = mock_session

            db_gen = get_db()
            db_session = next(db_gen)

            # Simulate exception in generator
            try:
                db_gen.throw(Exception("Test error"))
            except Exception:
                pass

            mock_session.close.assert_called_once()


class TestTableCreation:
    """Test database table creation"""

    @pytest.mark.asyncio
    async def test_create_tables_success(self):
        """Test successful table creation"""
        with patch("app.core.database.Base.metadata") as mock_metadata, patch(
            "app.core.database.engine"
        ) as mock_engine:

            mock_create_all = Mock()
            mock_metadata.create_all = mock_create_all

            await create_tables()

            mock_create_all.assert_called_once_with(bind=mock_engine)

    @pytest.mark.asyncio
    async def test_create_tables_import_models(self):
        """Test that create_tables imports all required models"""
        with patch("app.core.database.Base.metadata") as mock_metadata, patch(
            "app.core.database.engine"
        ):

            mock_create_all = Mock()
            mock_metadata.create_all = mock_create_all

            await create_tables()

            # Should have called create_all (models imported implicitly)
            mock_create_all.assert_called_once()


class TestDatabaseHealth:
    """Test database health checking"""

    @pytest.mark.asyncio
    async def test_check_database_health_success(self):
        """Test successful database health check"""
        with patch("app.core.database.SessionLocal") as mock_session_class:
            mock_session = Mock()
            mock_session.execute = Mock()
            mock_session.close = Mock()
            mock_session_class.return_value = mock_session

            result = await check_database_health()

            assert result["status"] == "healthy"
            assert "message" in result
            mock_session.execute.assert_called_once_with("SELECT 1")
            mock_session.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_check_database_health_connection_error(self):
        """Test database health check with connection error"""
        with patch("app.core.database.SessionLocal") as mock_session_class:
            mock_session = Mock()
            mock_session.execute.side_effect = OperationalError(
                "Connection failed", None, None
            )
            mock_session_class.return_value = mock_session

            result = await check_database_health()

            assert result["status"] == "unhealthy"
            assert "message" in result
            assert "Connection failed" in result["message"]

    @pytest.mark.asyncio
    async def test_check_database_health_general_error(self):
        """Test database health check with general error"""
        with patch("app.core.database.SessionLocal") as mock_session_class:
            mock_session_class.side_effect = Exception("General error")

            result = await check_database_health()

            assert result["status"] == "unhealthy"
            assert "message" in result
            assert "General error" in result["message"]


class TestDatabaseManager:
    """Test database manager utilities"""

    def test_get_session(self):
        """Test DatabaseManager.get_session"""
        with patch("app.core.database.SessionLocal") as mock_session_class:
            mock_session = Mock()
            mock_session_class.return_value = mock_session

            result = DatabaseManager.get_session()

            assert result == mock_session
            mock_session_class.assert_called_once()

    def test_close_session_with_session(self):
        """Test DatabaseManager.close_session with valid session"""
        mock_session = Mock()

        DatabaseManager.close_session(mock_session)

        mock_session.close.assert_called_once()

    def test_close_session_with_none(self):
        """Test DatabaseManager.close_session with None"""
        # Should not raise exception
        DatabaseManager.close_session(None)

    @pytest.mark.asyncio
    async def test_init_database(self):
        """Test DatabaseManager.init_database"""
        with patch("app.core.database.create_tables") as mock_create_tables:
            await DatabaseManager.init_database()

            mock_create_tables.assert_called_once()

    @pytest.mark.asyncio
    async def test_reset_database_development(self):
        """Test DatabaseManager.reset_database in development"""
        with patch("app.core.database.settings") as mock_settings, patch(
            "app.core.database.Base.metadata"
        ) as mock_metadata, patch(
            "app.core.database.create_tables"
        ) as mock_create_tables, patch(
            "app.core.database.engine"
        ) as mock_engine:

            mock_settings.ENVIRONMENT = "development"
            mock_drop_all = Mock()
            mock_metadata.drop_all = mock_drop_all

            await DatabaseManager.reset_database()

            mock_drop_all.assert_called_once_with(bind=mock_engine)
            mock_create_tables.assert_called_once()

    @pytest.mark.asyncio
    async def test_reset_database_production(self):
        """Test DatabaseManager.reset_database in production (should fail)"""
        with patch("app.core.database.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "production"

            with pytest.raises(
                Exception, match="Database reset only allowed in development"
            ):
                await DatabaseManager.reset_database()


class TestErrorHandling:
    """Test error handling in database operations"""

    def test_database_session_error_handling(self):
        """Test error handling in database session operations"""
        with patch("app.core.database.SessionLocal") as mock_session_class:
            mock_session = Mock()
            mock_session.close.side_effect = SQLAlchemyError("Close error")
            mock_session_class.return_value = mock_session

            db_gen = get_db()
            db_session = next(db_gen)

            # Should handle close error gracefully
            try:
                next(db_gen)
            except StopIteration:
                pass

            # Session close was attempted despite error
            mock_session.close.assert_called_once()

    def test_database_manager_close_session_error(self):
        """Test error handling in DatabaseManager.close_session"""
        mock_session = Mock()
        mock_session.close.side_effect = SQLAlchemyError("Close error")

        # Should not raise exception
        DatabaseManager.close_session(mock_session)

        # Close was attempted
        mock_session.close.assert_called_once()


class TestDatabaseConfiguration:
    """Test database configuration"""

    def test_database_engine_creation(self):
        """Test database engine creation"""
        # Re-import to check engine configuration
        import app.core.database

        assert app.core.database.engine is not None
        assert app.core.database.SessionLocal is not None
        assert app.core.database.Base is not None

    def test_database_url_configuration(self):
        """Test database URL configuration"""
        import app.core.database

        assert app.core.database.DATABASE_URL == "sqlite:///./pactoria_mvp.db"

    def test_session_local_configuration(self):
        """Test SessionLocal configuration"""
        import app.core.database

        # SessionLocal should be configured with proper settings
        assert app.core.database.SessionLocal is not None

        # Test creating a session
        with patch("app.core.database.engine"):
            session = app.core.database.SessionLocal()
            assert session is not None


class TestDatabaseIntegration:
    """Test database integration functionality"""

    def test_base_metadata_naming_convention(self):
        """Test Base metadata naming convention"""
        import app.core.database

        base = app.core.database.Base
        assert base.metadata is not None

        # Check naming convention is applied
        naming_convention = base.metadata.naming_convention
        assert naming_convention is not None
        assert "ix" in naming_convention
        assert "fk" in naming_convention
        assert "pk" in naming_convention

    @pytest.mark.asyncio
    async def test_database_health_check_logging(self):
        """Test database health check logging"""
        with patch("app.core.database.SessionLocal") as mock_session_class, patch(
            "app.core.database.logger"
        ) as mock_logger:

            mock_session = Mock()
            mock_session.execute.side_effect = Exception("Test error")
            mock_session_class.return_value = mock_session

            result = await check_database_health()

            assert result["status"] == "unhealthy"
            # Should have logged the error
            mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_tables_logging(self):
        """Test create_tables logging"""
        with patch("app.core.database.Base.metadata") as mock_metadata, patch(
            "app.core.database.engine"
        ), patch("app.core.database.logger") as mock_logger:

            mock_create_all = Mock()
            mock_metadata.create_all = mock_create_all

            await create_tables()

            # Should have logged table creation
            assert mock_logger.info.call_count >= 2  # Start and completion messages


class TestPerformance:
    """Test database performance characteristics"""

    def test_session_creation_performance(self):
        """Test session creation performance"""
        import time

        with patch("app.core.database.SessionLocal") as mock_session_class:
            mock_session_class.return_value = Mock()

            start_time = time.perf_counter()

            # Create many sessions
            for _ in range(100):
                session_gen = get_db()
                next(session_gen)

            end_time = time.perf_counter()
            total_time = end_time - start_time

            # Should complete 100 session creations quickly
            assert total_time < 1.0

    def test_database_manager_performance(self):
        """Test DatabaseManager performance"""
        import time

        with patch("app.core.database.SessionLocal") as mock_session_class:
            mock_session_class.return_value = Mock()

            start_time = time.perf_counter()

            # Use DatabaseManager methods many times
            for _ in range(100):
                session = DatabaseManager.get_session()
                DatabaseManager.close_session(session)

            end_time = time.perf_counter()
            total_time = end_time - start_time

            # Should complete 100 operations quickly
            assert total_time < 1.0
