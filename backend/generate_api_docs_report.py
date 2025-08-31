#!/usr/bin/env python3
"""
Generate comprehensive API documentation report for Pactoria MVP
"""
import json
import requests
import sys
from typing import Dict, Any

def get_openapi_schema() -> Dict[str, Any]:
    """Get OpenAPI schema from running server or local file"""
    try:
        # Try to get from running server first
        response = requests.get("http://localhost:8000/openapi.json", timeout=5)
        if response.status_code == 200:
            return response.json()
    except:
        pass
    
    # Fallback to generating schema directly
    from app.main import app
    return app.openapi()

def analyze_documentation(schema: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze the documentation completeness"""
    
    # Count endpoints by method
    endpoints_by_method = {}
    total_endpoints = 0
    documented_endpoints = 0
    endpoints_with_auth = 0
    endpoints_with_examples = 0
    
    paths = schema.get('paths', {})
    
    for path, methods in paths.items():
        for method, details in methods.items():
            total_endpoints += 1
            
            # Count by HTTP method
            if method.upper() not in endpoints_by_method:
                endpoints_by_method[method.upper()] = 0
            endpoints_by_method[method.upper()] += 1
            
            # Check if documented (has summary and description)
            if details.get('summary') and details.get('description'):
                documented_endpoints += 1
                
            # Check if has authentication
            if ('security' in details or 
                'dependencies' in str(details) or 
                any('Bearer' in str(resp) for resp in details.get('responses', {}).values())):
                endpoints_with_auth += 1
                
            # Check if has examples (in request body or responses)
            has_examples = False
            if 'requestBody' in details:
                has_examples = True
            if any('example' in str(resp) for resp in details.get('responses', {}).values()):
                has_examples = True
            if has_examples:
                endpoints_with_examples += 1
    
    # Count schemas with examples
    components = schema.get('components', {})
    schemas = components.get('schemas', {})
    schemas_with_examples = 0
    
    for schema_name, schema_def in schemas.items():
        if ('example' in schema_def or 
            'examples' in schema_def or 
            'json_schema_extra' in str(schema_def)):
            schemas_with_examples += 1
    
    return {
        'total_endpoints': total_endpoints,
        'documented_endpoints': documented_endpoints,
        'documentation_percentage': round((documented_endpoints / total_endpoints * 100) if total_endpoints > 0 else 0, 1),
        'endpoints_by_method': endpoints_by_method,
        'endpoints_with_auth': endpoints_with_auth,
        'auth_percentage': round((endpoints_with_auth / total_endpoints * 100) if total_endpoints > 0 else 0, 1),
        'endpoints_with_examples': endpoints_with_examples,
        'examples_percentage': round((endpoints_with_examples / total_endpoints * 100) if total_endpoints > 0 else 0, 1),
        'total_schemas': len(schemas),
        'schemas_with_examples': schemas_with_examples,
        'schema_examples_percentage': round((schemas_with_examples / len(schemas) * 100) if schemas else 0, 1)
    }

def generate_report():
    """Generate comprehensive documentation report"""
    
    print("🚀 Pactoria MVP - API Documentation Report")
    print("=" * 50)
    
    try:
        schema = get_openapi_schema()
        stats = analyze_documentation(schema)
        
        # Basic info
        info = schema.get('info', {})
        print(f"📋 API Title: {info.get('title', 'N/A')}")
        print(f"📋 Version: {info.get('version', 'N/A')}")
        print(f"📋 OpenAPI Version: {schema.get('openapi', 'N/A')}")
        
        # Contact and metadata
        if 'contact' in info:
            contact = info['contact']
            print(f"📧 Contact: {contact.get('name', 'N/A')} ({contact.get('email', 'N/A')})")
        
        if 'license' in info:
            license_info = info['license']
            print(f"⚖️  License: {license_info.get('name', 'N/A')}")
            
        print()
        
        # Documentation statistics
        print("📊 Documentation Statistics")
        print("-" * 30)
        print(f"Total Endpoints: {stats['total_endpoints']}")
        print(f"Fully Documented: {stats['documented_endpoints']} ({stats['documentation_percentage']}%)")
        print(f"With Authentication: {stats['endpoints_with_auth']} ({stats['auth_percentage']}%)")
        print(f"With Examples: {stats['endpoints_with_examples']} ({stats['examples_percentage']}%)")
        print()
        
        # HTTP Methods breakdown
        print("🔀 Endpoints by HTTP Method")
        print("-" * 30)
        for method, count in sorted(stats['endpoints_by_method'].items()):
            print(f"{method}: {count}")
        print()
        
        # Schema statistics
        print("📝 Schema Documentation")
        print("-" * 30)
        print(f"Total Schemas: {stats['total_schemas']}")
        print(f"With Examples: {stats['schemas_with_examples']} ({stats['schema_examples_percentage']}%)")
        print()
        
        # Security schemes
        components = schema.get('components', {})
        security_schemes = components.get('securitySchemes', {})
        
        print("🔐 Security Schemes")
        print("-" * 30)
        if security_schemes:
            for name, scheme in security_schemes.items():
                print(f"{name}: {scheme.get('type', 'N/A')} ({scheme.get('scheme', 'N/A')})")
        else:
            print("No security schemes configured")
        print()
        
        # Tags
        tags = schema.get('tags', [])
        print("🏷️  API Tags")
        print("-" * 30)
        if tags:
            for tag in tags:
                print(f"• {tag.get('name', 'N/A')}: {tag.get('description', 'No description')}")
        else:
            print("No tags configured")
        print()
        
        # Servers
        servers = schema.get('servers', [])
        print("🖥️  Configured Servers")
        print("-" * 30)
        if servers:
            for server in servers:
                print(f"• {server.get('url', 'N/A')}: {server.get('description', 'No description')}")
        else:
            print("No servers configured")
        print()
        
        # Quality assessment
        print("✅ Documentation Quality Assessment")
        print("-" * 40)
        
        quality_score = (
            stats['documentation_percentage'] * 0.4 +
            stats['auth_percentage'] * 0.3 +
            stats['examples_percentage'] * 0.2 +
            stats['schema_examples_percentage'] * 0.1
        )
        
        print(f"Overall Quality Score: {quality_score:.1f}/100")
        
        if quality_score >= 90:
            print("🏆 Excellent! Comprehensive documentation")
        elif quality_score >= 75:
            print("🥈 Good documentation with minor gaps")
        elif quality_score >= 60:
            print("🥉 Adequate documentation, room for improvement")
        else:
            print("⚠️  Documentation needs significant improvement")
            
        print()
        print("🎯 Recommendations:")
        
        if stats['documentation_percentage'] < 90:
            print("• Add comprehensive descriptions to all endpoints")
        if stats['auth_percentage'] < 100:
            print("• Document authentication requirements for all protected endpoints")
        if stats['examples_percentage'] < 80:
            print("• Add request/response examples to more endpoints")
        if stats['schema_examples_percentage'] < 90:
            print("• Add examples to all Pydantic schemas")
            
        if quality_score >= 90:
            print("• Documentation is comprehensive! Consider adding integration examples.")
        
    except Exception as e:
        print(f"❌ Error generating report: {e}")
        sys.exit(1)

if __name__ == "__main__":
    generate_report()