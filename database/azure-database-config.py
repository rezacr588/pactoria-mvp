"""
Azure PostgreSQL Flexible Server Configuration
Optimized for Burstable tier (B1ms) cost efficiency
"""
import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from urllib.parse import quote_plus
import psycopg2
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class AzurePostgreSQLConfig:
    """Azure PostgreSQL connection configuration optimized for cost and performance"""
    
    def __init__(self, environment: str = "production"):
        self.environment = environment
        self.server_name = os.getenv('AZURE_POSTGRESQL_HOST', 'pactoria-db.postgres.database.azure.com')
        self.database_name = os.getenv('AZURE_POSTGRESQL_DATABASE', 'pactoria_mvp')
        self.username = os.getenv('AZURE_POSTGRESQL_USER', 'pactoria_admin')
        self.password = os.getenv('AZURE_POSTGRESQL_PASSWORD', '')
        self.port = int(os.getenv('AZURE_POSTGRESQL_PORT', '5432'))
        
        # Connection pool settings optimized for B1ms (1 vCore)
        self.pool_size = int(os.getenv('DB_POOL_SIZE', '2'))  # Small pool for B1ms
        self.max_overflow = int(os.getenv('DB_MAX_OVERFLOW', '1'))  # Minimal overflow
        self.pool_timeout = int(os.getenv('DB_POOL_TIMEOUT', '30'))
        self.pool_recycle = int(os.getenv('DB_POOL_RECYCLE', '3600'))  # 1 hour
        
        # SSL configuration
        self.ssl_mode = os.getenv('AZURE_POSTGRESQL_SSL_MODE', 'require')
        
    def get_connection_string(self, include_db: bool = True) -> str:
        """Get SQLAlchemy connection string"""
        
        # URL encode password to handle special characters
        encoded_password = quote_plus(self.password)
        
        # Base connection string
        if include_db:
            conn_str = f"postgresql://{self.username}:{encoded_password}@{self.server_name}:{self.port}/{self.database_name}"
        else:
            conn_str = f"postgresql://{self.username}:{encoded_password}@{self.server_name}:{self.port}/postgres"
        
        # Add SSL mode
        conn_str += f"?sslmode={self.ssl_mode}"
        
        return conn_str
    
    def get_psycopg2_params(self, include_db: bool = True) -> Dict[str, Any]:
        """Get psycopg2 connection parameters"""
        
        params = {
            'host': self.server_name,
            'port': self.port,
            'user': self.username,
            'password': self.password,
            'sslmode': self.ssl_mode,
            'connect_timeout': 10,
            'application_name': 'Pactoria-MVP'
        }
        
        if include_db:
            params['database'] = self.database_name
        else:
            params['database'] = 'postgres'
            
        return params
    
    def create_engine(self, include_db: bool = True):
        """Create SQLAlchemy engine with optimized settings"""
        
        connection_string = self.get_connection_string(include_db)
        
        # Engine configuration optimized for B1ms tier
        engine_config = {
            'poolclass': QueuePool,
            'pool_size': self.pool_size,
            'max_overflow': self.max_overflow,
            'pool_timeout': self.pool_timeout,
            'pool_recycle': self.pool_recycle,
            'pool_pre_ping': True,  # Verify connections before use
            'echo': False,  # Disable SQL logging in production
            'connect_args': {
                'connect_timeout': 10,
                'application_name': 'Pactoria-MVP',
                'options': '-c default_transaction_isolation=read_committed'
            }
        }
        
        if self.environment == "development":
            engine_config['echo'] = True  # Enable SQL logging in development
        
        return create_engine(connection_string, **engine_config)
    
    def test_connection(self) -> Dict[str, Any]:
        """Test database connection and return status"""
        
        try:
            # Test with psycopg2 first
            params = self.get_psycopg2_params()
            conn = psycopg2.connect(**params)
            cursor = conn.cursor()
            
            # Test basic query
            cursor.execute("SELECT version(), current_database(), current_user;")
            result = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            return {
                'status': 'success',
                'message': 'Connection successful',
                'postgresql_version': result[0].split()[1] if result else 'Unknown',
                'database': result[1] if result else 'Unknown',
                'user': result[2] if result else 'Unknown'
            }
            
        except psycopg2.Error as e:
            logger.error(f"PostgreSQL connection error: {e}")
            return {
                'status': 'error',
                'message': f'Connection failed: {str(e)}',
                'error_code': e.pgcode if hasattr(e, 'pgcode') else None
            }
        except Exception as e:
            logger.error(f"Unexpected connection error: {e}")
            return {
                'status': 'error',
                'message': f'Unexpected error: {str(e)}'
            }

def initialize_database():
    """Initialize database with tables and data"""
    
    logger.info("Initializing Azure PostgreSQL database...")
    
    config = AzurePostgreSQLConfig()
    
    # Test connection first
    test_result = config.test_connection()
    if test_result['status'] != 'success':
        raise Exception(f"Database connection failed: {test_result['message']}")
    
    logger.info(f"Connected to PostgreSQL: {test_result['postgresql_version']}")
    
    # Create engine
    engine = config.create_engine()
    
    try:
        # Read and execute setup script
        script_path = os.path.join(os.path.dirname(__file__), 'azure-postgresql-setup.sql')
        
        if not os.path.exists(script_path):
            raise FileNotFoundError(f"Setup script not found: {script_path}")
        
        with open(script_path, 'r') as f:
            setup_script = f.read()
        
        # Execute setup script
        with engine.connect() as conn:
            # Split script into individual statements
            statements = [stmt.strip() for stmt in setup_script.split(';') if stmt.strip()]
            
            for stmt in statements:
                if stmt.startswith('--') or not stmt:
                    continue
                
                try:
                    conn.execute(text(stmt))
                    conn.commit()
                except Exception as e:
                    if "already exists" in str(e).lower():
                        logger.info(f"Skipping existing object: {str(e)[:100]}...")
                        continue
                    else:
                        logger.error(f"Error executing statement: {stmt[:100]}...")
                        raise
        
        logger.info("✅ Database initialization completed successfully")
        
        return {
            'status': 'success',
            'message': 'Database initialized successfully',
            'database_url': config.server_name
        }
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return {
            'status': 'error',
            'message': f'Database initialization failed: {str(e)}'
        }

def get_database_stats() -> Dict[str, Any]:
    """Get database statistics for monitoring"""
    
    config = AzurePostgreSQLConfig()
    engine = config.create_engine()
    
    try:
        with engine.connect() as conn:
            # Get table counts
            tables_query = """
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as live_tuples,
                n_dead_tup as dead_tuples
            FROM pg_stat_user_tables
            ORDER BY n_live_tup DESC;
            """
            
            tables_result = conn.execute(text(tables_query)).fetchall()
            
            # Get database size
            size_query = """
            SELECT 
                pg_size_pretty(pg_database_size(current_database())) as database_size,
                pg_database_size(current_database()) as database_size_bytes;
            """
            
            size_result = conn.execute(text(size_query)).fetchone()
            
            # Get connection stats
            connections_query = """
            SELECT 
                count(*) as total_connections,
                count(*) FILTER (WHERE state = 'active') as active_connections,
                count(*) FILTER (WHERE state = 'idle') as idle_connections
            FROM pg_stat_activity
            WHERE datname = current_database();
            """
            
            conn_result = conn.execute(text(connections_query)).fetchone()
            
            return {
                'status': 'success',
                'database_size': size_result[0] if size_result else 'Unknown',
                'database_size_bytes': size_result[1] if size_result else 0,
                'connections': {
                    'total': conn_result[0] if conn_result else 0,
                    'active': conn_result[1] if conn_result else 0,
                    'idle': conn_result[2] if conn_result else 0
                },
                'tables': [
                    {
                        'schema': row[0],
                        'table': row[1],
                        'inserts': row[2],
                        'updates': row[3],
                        'deletes': row[4],
                        'live_tuples': row[5],
                        'dead_tuples': row[6]
                    }
                    for row in tables_result
                ]
            }
            
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        return {
            'status': 'error',
            'message': f'Failed to get database stats: {str(e)}'
        }

if __name__ == "__main__":
    # Test the configuration
    logging.basicConfig(level=logging.INFO)
    
    print("Testing Azure PostgreSQL connection...")
    
    config = AzurePostgreSQLConfig()
    result = config.test_connection()
    
    print(f"Connection test result: {result}")
    
    if result['status'] == 'success':
        print("\n✅ Database connection successful!")
        print(f"PostgreSQL Version: {result['postgresql_version']}")
        print(f"Database: {result['database']}")
        print(f"User: {result['user']}")
        
        # Get stats
        print("\nGetting database statistics...")
        stats = get_database_stats()
        if stats['status'] == 'success':
            print(f"Database Size: {stats['database_size']}")
            print(f"Active Connections: {stats['connections']['active']}")
            print(f"Tables: {len(stats['tables'])}")
        
    else:
        print(f"\n❌ Database connection failed: {result['message']}")
        
        if result.get('error_code'):
            print(f"Error Code: {result['error_code']}")