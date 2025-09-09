#!/usr/bin/env python3
"""
Azure App Service F1 Tier Optimized Startup Script
Handles cold starts, sleep prevention, and resource optimization
"""
import os
import sys
import asyncio
import threading
import time
import logging
import signal
from contextlib import asynccontextmanager

# Configure logging for Azure App Service
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Azure App Service specific configurations
AZURE_FUNCTIONS_ENVIRONMENT = os.getenv('AZURE_FUNCTIONS_ENVIRONMENT', '')
WEBSITE_HOSTNAME = os.getenv('WEBSITE_HOSTNAME', '')
PORT = int(os.getenv('PORT', '8000'))
BIND_HOST = os.getenv('BIND_HOST', '0.0.0.0')

# F1 tier optimization settings
ENABLE_KEEPALIVE = os.getenv('ENABLE_KEEPALIVE', 'true').lower() == 'true'
KEEPALIVE_INTERVAL = int(os.getenv('KEEPALIVE_INTERVAL', '240'))  # 4 minutes
GUNICORN_WORKERS = int(os.getenv('GUNICORN_WORKERS', '1'))
GUNICORN_THREADS = int(os.getenv('GUNICORN_THREADS', '2'))
GUNICORN_TIMEOUT = int(os.getenv('GUNICORN_TIMEOUT', '120'))


class AzureF1Optimizer:
    """Optimization manager for Azure App Service F1 tier"""
    
    def __init__(self):
        self.keepalive_thread = None
        self.shutdown_event = threading.Event()
        
    def start_keepalive_service(self):
        """Start keep-alive service to prevent F1 tier sleep"""
        if not ENABLE_KEEPALIVE:
            return
            
        def keepalive_worker():
            """Background worker to keep the app awake"""
            import httpx
            
            base_url = f"http://localhost:{PORT}"
            health_url = f"{base_url}/health"
            
            logger.info(f"Starting keep-alive service (interval: {KEEPALIVE_INTERVAL}s)")
            
            while not self.shutdown_event.is_set():
                try:
                    # Internal health check to keep app warm
                    with httpx.Client(timeout=10.0) as client:
                        response = client.get(health_url)
                        if response.status_code == 200:
                            logger.debug("Keep-alive ping successful")
                        else:
                            logger.warning(f"Keep-alive ping failed: {response.status_code}")
                except Exception as e:
                    logger.debug(f"Keep-alive ping error (normal during startup): {e}")
                
                # Wait for next ping or shutdown
                self.shutdown_event.wait(KEEPALIVE_INTERVAL)
                
            logger.info("Keep-alive service stopped")
        
        # Start keep-alive in background thread
        self.keepalive_thread = threading.Thread(
            target=keepalive_worker, 
            daemon=True, 
            name="keepalive-worker"
        )
        self.keepalive_thread.start()
        
    def stop_keepalive_service(self):
        """Stop keep-alive service"""
        if self.keepalive_thread:
            logger.info("Stopping keep-alive service...")
            self.shutdown_event.set()
            self.keepalive_thread.join(timeout=5.0)


def setup_signal_handlers(optimizer):
    """Setup graceful shutdown signal handlers"""
    def signal_handler(sig, frame):
        logger.info(f"Received signal {sig}, shutting down gracefully...")
        optimizer.stop_keepalive_service()
        sys.exit(0)
    
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)


def get_gunicorn_config():
    """Generate Gunicorn configuration optimized for F1 tier"""
    return {
        'bind': f'{BIND_HOST}:{PORT}',
        'workers': GUNICORN_WORKERS,
        'threads': GUNICORN_THREADS,
        'worker_class': 'uvicorn.workers.UvicornWorker',
        'worker_connections': 100,  # Limited for F1 tier
        'max_requests': 1000,
        'max_requests_jitter': 50,
        'timeout': GUNICORN_TIMEOUT,
        'keepalive': 5,
        'preload_app': True,  # Memory optimization
        'reload': False,
        'access_log_format': '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s',
        'accesslog': '-',
        'errorlog': '-',
        'loglevel': 'info',
        'capture_output': True,
        'enable_stdio_inheritance': True
    }


def setup_azure_environment():
    """Setup Azure-specific environment variables and configurations"""
    logger.info("Setting up Azure App Service environment...")
    
    # Set production environment
    os.environ['ENVIRONMENT'] = 'production'
    os.environ['DEBUG'] = 'false'
    
    # Validate critical environment variables
    critical_vars = ['SECRET_KEY', 'JWT_SECRET_KEY']
    missing_vars = []
    
    for var in critical_vars:
        if not os.getenv(var) or os.getenv(var) in ['change-this-in-production', 'change-this-in-production-immediately']:
            missing_vars.append(var)
    
    if missing_vars:
        logger.error(f"Critical environment variables not set or using default values: {missing_vars}")
        logger.error("Please set proper values before deploying to production!")
    
    # Validate Groq API key
    if not os.getenv('GROQ_API_KEY'):
        logger.warning("GROQ_API_KEY not set - AI features will not work")
    else:
        logger.info("Groq API key configured")
    
    # Azure App Service specific settings
    if WEBSITE_HOSTNAME:
        logger.info(f"Running on Azure App Service: {WEBSITE_HOSTNAME}")
        
        # Set CORS origins for Azure
        cors_origins = [
            f"https://{WEBSITE_HOSTNAME}",
            "https://*.azurestaticapps.net",
            "https://*.azure.com"
        ]
        os.environ['CORS_ORIGINS'] = ','.join(cors_origins)
        
        # Azure database connection with enhanced connection string handling
        if not os.getenv('DATABASE_URL'):
            # Try Azure PostgreSQL connection string first
            if os.getenv('AZURE_POSTGRESQL_CONNECTION_STRING'):
                database_url = os.getenv('AZURE_POSTGRESQL_CONNECTION_STRING')
                os.environ['DATABASE_URL'] = database_url
                logger.info("Using Azure PostgreSQL connection string")
            # Build from individual components
            elif all([os.getenv('AZURE_POSTGRESQL_HOST'), os.getenv('AZURE_POSTGRESQL_DATABASE'), 
                     os.getenv('AZURE_POSTGRESQL_USER'), os.getenv('AZURE_POSTGRESQL_PASSWORD')]):
                db_server = os.getenv('AZURE_POSTGRESQL_HOST')
                db_name = os.getenv('AZURE_POSTGRESQL_DATABASE')
                db_user = os.getenv('AZURE_POSTGRESQL_USER')
                db_password = os.getenv('AZURE_POSTGRESQL_PASSWORD')
                
                database_url = f"postgresql://{db_user}:{db_password}@{db_server}:5432/{db_name}?sslmode=require"
                os.environ['DATABASE_URL'] = database_url
                logger.info(f"Using Azure PostgreSQL: {db_server}")
            # Azure SQL Database support
            elif all([os.getenv('AZURE_SQL_SERVER'), os.getenv('AZURE_SQL_DATABASE'), 
                     os.getenv('AZURE_SQL_USER'), os.getenv('AZURE_SQL_PASSWORD')]):
                sql_server = os.getenv('AZURE_SQL_SERVER')
                sql_db = os.getenv('AZURE_SQL_DATABASE')
                sql_user = os.getenv('AZURE_SQL_USER')
                sql_password = os.getenv('AZURE_SQL_PASSWORD')
                
                database_url = f"mssql+pyodbc://{sql_user}:{sql_password}@{sql_server}:1433/{sql_db}?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no"
                os.environ['DATABASE_URL'] = database_url
                logger.info(f"Using Azure SQL Database: {sql_server}")
            else:
                # Fallback to SQLite for local development or simple deployments
                logger.info("No Azure database configured, using SQLite")
    
    # Set upload directory for Azure
    os.environ['UPLOAD_DIR'] = '/tmp/uploads'  # Azure App Service writable temp
    
    logger.info("Azure environment setup complete")


def run_with_gunicorn():
    """Run application with Gunicorn for production"""
    try:
        import gunicorn.app.wsgiapp as wsgi
        
        # Setup Azure environment
        setup_azure_environment()
        
        # Initialize F1 optimizer
        optimizer = AzureF1Optimizer()
        setup_signal_handlers(optimizer)
        
        # Start keep-alive service
        optimizer.start_keepalive_service()
        
        # Get Gunicorn config
        config = get_gunicorn_config()
        
        logger.info(f"Starting Pactoria MVP on {config['bind']}")
        logger.info(f"Gunicorn config: {GUNICORN_WORKERS} workers, {GUNICORN_THREADS} threads")
        
        # Prepare Gunicorn arguments
        sys.argv = [
            'gunicorn',
            '--bind', config['bind'],
            '--workers', str(config['workers']),
            '--threads', str(config['threads']),
            '--worker-class', config['worker_class'],
            '--worker-connections', str(config['worker_connections']),
            '--max-requests', str(config['max_requests']),
            '--max-requests-jitter', str(config['max_requests_jitter']),
            '--timeout', str(config['timeout']),
            '--keepalive', str(config['keepalive']),
            '--preload',
            '--access-logfile', '-',
            '--error-logfile', '-',
            '--log-level', config['loglevel'],
            '--capture-output',
            '--enable-stdio-inheritance',
            'app.main:app'
        ]
        
        # Run Gunicorn
        wsgi.run()
        
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        optimizer.stop_keepalive_service()
    except Exception as e:
        logger.error(f"Failed to start with Gunicorn: {e}")
        sys.exit(1)


def run_with_uvicorn():
    """Fallback to Uvicorn for development"""
    try:
        import uvicorn
        
        logger.info("Starting with Uvicorn (development mode)")
        
        uvicorn.run(
            "app.main:app",
            host=BIND_HOST,
            port=PORT,
            reload=False,
            log_level="info",
            access_log=True
        )
        
    except Exception as e:
        logger.error(f"Failed to start with Uvicorn: {e}")
        sys.exit(1)


def main():
    """Main startup function"""
    logger.info("=" * 60)
    logger.info("Pactoria MVP - Azure App Service F1 Startup")
    logger.info("=" * 60)
    
    # Log environment info
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Port: {PORT}")
    logger.info(f"Host: {BIND_HOST}")
    logger.info(f"Azure Functions Environment: {AZURE_FUNCTIONS_ENVIRONMENT}")
    logger.info(f"Website Hostname: {WEBSITE_HOSTNAME}")
    
    # Choose startup method
    try:
        # Try Gunicorn first (production)
        import gunicorn
        run_with_gunicorn()
    except ImportError:
        logger.warning("Gunicorn not available, falling back to Uvicorn")
        run_with_uvicorn()


if __name__ == "__main__":
    main()