#!/usr/bin/env python3
"""
Pactoria MVP - Production Connection Setup Script
Securely configures local environment to connect to production resources
"""

import os
import sys
import getpass
import shutil
from pathlib import Path
from typing import Dict, Optional
import subprocess

class ProductionConnectionSetup:
    """Handles secure setup of local-to-production connection"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.env_template = self.project_root / ".env.local-to-prod"
        self.frontend_env_template = self.project_root / "frontend" / ".env.local-to-prod"
        self.env_target = self.project_root / ".env"
        self.frontend_env_target = self.project_root / "frontend" / ".env.local"
        
    def display_warning(self):
        """Display important warning about production connection"""
        print("\n" + "="*80)
        print("⚠️  PRODUCTION CONNECTION SETUP WARNING ⚠️")
        print("="*80)
        print("""
🔴 CRITICAL: You are about to configure your LOCAL environment to connect 
   directly to PRODUCTION resources including:
   • Production Database (Azure PostgreSQL)
   • Production API endpoints
   • Production file storage
   
🔴 ALL DATA CHANGES WILL BE REAL AND PERMANENT
🔴 This setup is intended for:
   • Data injection/migration
   • Production testing
   • Debugging production issues
   
🔴 DO NOT use this for regular development work
🔴 Always backup production data before making changes
        """)
        print("="*80)
        
        response = input("\nDo you understand the risks and want to continue? (type 'YES' to continue): ")
        if response != "YES":
            print("Setup cancelled for safety.")
            sys.exit(0)
    
    def get_production_credentials(self) -> Dict[str, str]:
        """Securely collect production credentials"""
        print("\n📋 Collecting Production Credentials...")
        print("Note: Credentials will not be echoed to screen\n")
        
        credentials = {}
        
        # Database credentials
        print("🗄️  Azure PostgreSQL Database:")
        credentials['db_host'] = input("PostgreSQL Host (e.g., pactoria-db.postgres.database.azure.com): ").strip()
        credentials['db_name'] = input("Database Name (default: pactoria_mvp): ").strip() or "pactoria_mvp"
        credentials['db_user'] = input("Database User (e.g., pactoria_admin): ").strip()
        credentials['db_password'] = getpass.getpass("Database Password: ")
        
        # Security keys
        print("\n🔐 Security Credentials:")
        credentials['secret_key'] = getpass.getpass("Production SECRET_KEY: ")
        credentials['jwt_secret'] = getpass.getpass("Production JWT_SECRET_KEY: ")
        
        # API keys
        print("\n🤖 API Keys:")
        credentials['groq_api_key'] = getpass.getpass("Production GROQ_API_KEY: ")
        
        # Azure Storage (optional)
        print("\n☁️  Azure Storage (optional, press Enter to skip):")
        credentials['storage_account'] = input("Storage Account Name: ").strip()
        if credentials['storage_account']:
            credentials['storage_key'] = getpass.getpass("Storage Account Key: ")
        else:
            credentials['storage_key'] = ""
        
        return credentials
    
    def validate_credentials(self, credentials: Dict[str, str]) -> bool:
        """Basic validation of required credentials"""
        required_fields = ['db_host', 'db_user', 'db_password', 'secret_key', 'jwt_secret']
        missing_fields = [field for field in required_fields if not credentials.get(field)]
        
        if missing_fields:
            print(f"\n❌ Missing required credentials: {', '.join(missing_fields)}")
            return False
        
        print("✅ All required credentials provided")
        return True
    
    def backup_current_env(self):
        """Backup current environment files"""
        print("\n💾 Backing up current environment files...")
        
        if self.env_target.exists():
            backup_path = self.project_root / ".env.backup"
            shutil.copy2(self.env_target, backup_path)
            print(f"   Backed up {self.env_target} → {backup_path}")
        
        if self.frontend_env_target.exists():
            backup_path = self.project_root / "frontend" / ".env.local.backup"
            shutil.copy2(self.frontend_env_target, backup_path)
            print(f"   Backed up {self.frontend_env_target} → {backup_path}")
    
    def configure_backend_env(self, credentials: Dict[str, str]):
        """Configure backend environment file"""
        print("\n🔧 Configuring backend environment...")
        
        if not self.env_template.exists():
            print(f"❌ Template file not found: {self.env_template}")
            return False
        
        # Read template
        with open(self.env_template, 'r') as f:
            content = f.read()
        
        # Replace placeholders
        replacements = {
            'YOUR_PRODUCTION_PASSWORD': credentials['db_password'],
            'pactoria-db.postgres.database.azure.com': credentials['db_host'],
            'pactoria_mvp': credentials['db_name'],
            'pactoria_admin': credentials['db_user'],
            'your-production-secret-key-here': credentials['secret_key'],
            'your-production-jwt-secret-key-here': credentials['jwt_secret'],
            'your-production-groq-api-key-here': credentials.get('groq_api_key', ''),
            'your-production-storage-account': credentials.get('storage_account', ''),
            'your-production-storage-key': credentials.get('storage_key', '')
        }
        
        for placeholder, value in replacements.items():
            content = content.replace(placeholder, value)
        
        # Write configured file
        with open(self.env_target, 'w') as f:
            f.write(content)
        
        print(f"   ✅ Backend environment configured: {self.env_target}")
        return True
    
    def configure_frontend_env(self):
        """Configure frontend environment file"""
        print("\n🎨 Configuring frontend environment...")
        
        if not self.frontend_env_template.exists():
            print(f"❌ Template file not found: {self.frontend_env_template}")
            return False
        
        # Copy template to target
        shutil.copy2(self.frontend_env_template, self.frontend_env_target)
        print(f"   ✅ Frontend environment configured: {self.frontend_env_target}")
        return True
    
    def test_connection(self) -> bool:
        """Test the production connection"""
        print("\n🔍 Testing production connection...")
        
        try:
            # Test database connection using the azure config
            azure_config_path = self.project_root / "database" / "azure-database-config.py"
            if azure_config_path.exists():
                result = subprocess.run([
                    sys.executable, str(azure_config_path)
                ], capture_output=True, text=True, cwd=self.project_root)
                
                if result.returncode == 0:
                    print("   ✅ Database connection test passed")
                    return True
                else:
                    print(f"   ❌ Database connection test failed: {result.stderr}")
                    return False
            else:
                print("   ⚠️  Database test script not found, skipping connection test")
                return True
                
        except Exception as e:
            print(f"   ❌ Connection test error: {e}")
            return False
    
    def create_mode_switcher(self):
        """Create scripts to easily switch between modes"""
        print("\n🔄 Creating mode switching scripts...")
        
        # Switch to local mode script
        switch_to_local = self.project_root / "scripts" / "switch-to-local.sh"
        switch_to_local.parent.mkdir(exist_ok=True)
        
        local_script_content = """#!/bin/bash
# Switch back to local development mode

echo "🔄 Switching to LOCAL development mode..."

# Restore backend env
if [ -f ".env.backup" ]; then
    cp .env.backup .env
    echo "   ✅ Restored backend environment"
else
    echo "   ⚠️  No backup found, using default local config"
    cp .env.example .env 2>/dev/null || echo "DATABASE_URL=sqlite:///./pactoria_mvp.db" > .env
fi

# Restore frontend env
cd frontend
if [ -f ".env.local.backup" ]; then
    cp .env.local.backup .env.local
    echo "   ✅ Restored frontend environment"
else
    echo "   ⚠️  No frontend backup found"
fi
cd ..

echo "✅ Switched to LOCAL mode"
echo "   Backend: localhost:8000 (SQLite)"
echo "   Frontend: localhost:5173"
"""
        
        with open(switch_to_local, 'w') as f:
            f.write(local_script_content)
        os.chmod(switch_to_local, 0o755)
        
        # Switch to production mode script
        switch_to_prod = self.project_root / "scripts" / "switch-to-prod.sh"
        prod_script_content = f"""#!/bin/bash
# Switch to local-to-production mode

echo "⚠️  Switching to LOCAL→PRODUCTION mode..."
echo "🔴 This connects your local app to PRODUCTION resources!"

read -p "Are you sure? (type 'yes'): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

# Run the setup script
python3 scripts/setup-prod-connection.py

echo "✅ Switched to LOCAL→PRODUCTION mode"
echo "   Backend: localhost:8000 (Production Database)"
echo "   Frontend: localhost:5173 → Production API"
"""
        
        with open(switch_to_prod, 'w') as f:
            f.write(prod_script_content)
        os.chmod(switch_to_prod, 0o755)
        
        print(f"   ✅ Created mode switching scripts:")
        print(f"      {switch_to_local}")
        print(f"      {switch_to_prod}")
    
    def run_setup(self):
        """Run the complete setup process"""
        print("🚀 Pactoria MVP - Production Connection Setup")
        
        # Display warning
        self.display_warning()
        
        # Get credentials
        credentials = self.get_production_credentials()
        
        # Validate credentials
        if not self.validate_credentials(credentials):
            return False
        
        # Backup current environment
        self.backup_current_env()
        
        # Configure environments
        if not self.configure_backend_env(credentials):
            return False
        
        if not self.configure_frontend_env():
            return False
        
        # Test connection
        connection_ok = self.test_connection()
        
        # Create mode switcher
        self.create_mode_switcher()
        
        # Final instructions
        print("\n" + "="*80)
        print("✅ PRODUCTION CONNECTION SETUP COMPLETE")
        print("="*80)
        
        if connection_ok:
            print("🟢 Database connection test: PASSED")
        else:
            print("🟡 Database connection test: FAILED (check credentials)")
        
        print("""
📋 NEXT STEPS:
1. Start your backend server: cd backend && python -m app.main
2. Start your frontend: cd frontend && npm run dev
3. Your local app will now connect to PRODUCTION resources

🔄 SWITCHING MODES:
• Return to local mode: ./scripts/switch-to-local.sh  
• Switch to prod mode: ./scripts/switch-to-prod.sh

⚠️  SAFETY REMINDERS:
• All changes affect PRODUCTION data
• Always backup before bulk operations
• Monitor your usage and costs
• Switch back to local mode when done
        """)
        print("="*80)
        
        return True

def main():
    setup = ProductionConnectionSetup()
    success = setup.run_setup()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()