#!/usr/bin/env python3
"""
Test PDF export functionality directly
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, '/Users/rezazeraat/Desktop/Pactoria-MVP/backend')

async def test_pdf_dependencies():
    """Test if PDF dependencies are working"""
    
    print("🔍 Testing PDF Export Dependencies\n")
    
    # Test ReportLab import (same as the endpoint does)
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
        from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
        REPORTLAB_AVAILABLE = True
        print("✅ ReportLab imports: SUCCESS")
    except ImportError as e:
        REPORTLAB_AVAILABLE = False
        print(f"❌ ReportLab imports: FAILED - {e}")
    
    # Test python-docx import
    try:
        from docx import Document
        from docx.shared import Inches
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        PYTHON_DOCX_AVAILABLE = True
        print("✅ python-docx imports: SUCCESS")
    except ImportError as e:
        PYTHON_DOCX_AVAILABLE = False
        print(f"❌ python-docx imports: FAILED - {e}")
    
    print(f"\n📊 Results:")
    print(f"   REPORTLAB_AVAILABLE: {REPORTLAB_AVAILABLE}")
    print(f"   PYTHON_DOCX_AVAILABLE: {PYTHON_DOCX_AVAILABLE}")
    
    if REPORTLAB_AVAILABLE:
        print("\n✅ PDF export should now work!")
        print("✅ The '503 Service Unavailable' error should be resolved")
    else:
        print("\n❌ PDF export will still fail")
        print("❌ Additional ReportLab installation required")
    
    # Test creating a simple PDF
    if REPORTLAB_AVAILABLE:
        try:
            import io
            from reportlab.lib.pagesizes import A4
            from reportlab.platypus import SimpleDocTemplate, Paragraph
            from reportlab.lib.styles import getSampleStyleSheet
            
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []
            
            story.append(Paragraph("Test PDF Export", styles['Title']))
            story.append(Paragraph("This is a test PDF created by Pactoria.", styles['Normal']))
            
            doc.build(story)
            pdf_data = buffer.getvalue()
            buffer.close()
            
            print(f"✅ PDF generation test: SUCCESS (created {len(pdf_data)} bytes)")
            
        except Exception as e:
            print(f"❌ PDF generation test: FAILED - {e}")

if __name__ == "__main__":
    asyncio.run(test_pdf_dependencies())