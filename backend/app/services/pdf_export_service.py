"""
PDF Export Service for Contract Content
Generates professional PDF documents from contract content
"""

from typing import Optional, Dict, Any
from datetime import datetime
import tempfile
import os
from decimal import Decimal

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from app.domain.entities.contract import Contract
from app.domain.value_objects import Money


class PDFExportService:
    """Service for generating PDF exports of contracts"""

    def __init__(self):
        if not REPORTLAB_AVAILABLE:
            raise ImportError(
                "ReportLab is required for PDF generation. Install with: pip install reportlab"
            )
        
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom styles for contract formatting"""
        
        # Contract title style
        self.styles.add(ParagraphStyle(
            name='ContractTitle',
            parent=self.styles['Title'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.black,
            fontName='Helvetica-Bold'
        ))

        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold',
            textColor=colors.black,
            borderWidth=1,
            borderColor=colors.grey,
            borderPadding=5,
            backColor=colors.lightgrey
        ))

        # Contract body style
        self.styles.add(ParagraphStyle(
            name='ContractBody',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=12,
            alignment=TA_JUSTIFY,
            fontName='Times-Roman',
            leading=14
        ))

        # Contract details style
        self.styles.add(ParagraphStyle(
            name='ContractDetails',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            fontName='Helvetica',
            leading=12
        ))

        # Signature style
        self.styles.add(ParagraphStyle(
            name='Signature',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=30,
            fontName='Helvetica'
        ))

    def export_contract_to_pdf(
        self,
        contract: Contract,
        output_path: Optional[str] = None,
        include_risk_assessment: bool = True,
        include_compliance_score: bool = True
    ) -> str:
        """
        Export contract to PDF format
        
        Args:
            contract: Contract entity to export
            output_path: Optional path for output file. If None, creates temp file
            include_risk_assessment: Whether to include risk assessment in PDF
            include_compliance_score: Whether to include compliance score in PDF
            
        Returns:
            Path to generated PDF file
        """
        
        if not output_path:
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(
                delete=False, suffix='.pdf', prefix=f'contract_{contract.id.value}_'
            )
            output_path = temp_file.name
            temp_file.close()

        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )

        # Build PDF content
        story = []
        
        # Add contract header
        self._add_contract_header(story, contract)
        
        # Add contract details table
        self._add_contract_details(story, contract)
        
        # Add contract content
        self._add_contract_content(story, contract)
        
        # Add risk assessment if available and requested
        if include_risk_assessment and contract.risk_assessment:
            self._add_risk_assessment(story, contract.risk_assessment)
        
        # Add compliance score if available and requested  
        if include_compliance_score and contract.compliance_score:
            self._add_compliance_score(story, contract.compliance_score)
        
        # Add signature section
        self._add_signature_section(story, contract)
        
        # Add footer
        self._add_footer(story)

        # Build PDF
        doc.build(story)
        
        return output_path

    def _add_contract_header(self, story: list, contract: Contract):
        """Add contract header with title and basic info"""
        
        # Contract title
        title = contract.title or f"{contract.contract_type.value.replace('_', ' ').title()}"
        story.append(Paragraph(title.upper(), self.styles['ContractTitle']))
        story.append(Spacer(1, 20))

        # Contract type and status
        header_info = f"Contract Type: {contract.contract_type.value.replace('_', ' ').title()} | "
        header_info += f"Status: {contract.status.value.title()} | "
        header_info += f"Version: {contract.version}"
        
        story.append(Paragraph(header_info, self.styles['ContractDetails']))
        story.append(Spacer(1, 15))

    def _add_contract_details(self, story: list, contract: Contract):
        """Add contract details in table format"""
        
        # Prepare contract details data
        details_data = [
            ['Contract Details', ''],
        ]

        # Add client information
        if contract.client and contract.client.name:
            details_data.append(['Client:', contract.client.name])
            if contract.client.email:
                details_data.append(['Client Email:', str(contract.client.email)])

        # Add supplier information  
        if contract.supplier and contract.supplier.name:
            details_data.append(['Supplier:', contract.supplier.name])
            if contract.supplier.email:
                details_data.append(['Supplier Email:', str(contract.supplier.email)])

        # Add contract value
        if contract.contract_value:
            details_data.append([
                'Contract Value:', 
                f"{contract.contract_value.currency} {contract.contract_value.amount:,.2f}"
            ])

        # Add contract period
        if contract.date_range:
            period_str = ""
            if contract.date_range.start_date:
                period_str += contract.date_range.start_date.strftime('%d/%m/%Y')
            if contract.date_range.end_date:
                if period_str:
                    period_str += " - "
                period_str += contract.date_range.end_date.strftime('%d/%m/%Y')
            if period_str:
                details_data.append(['Contract Period:', period_str])

        # Add creation info
        details_data.append(['Created:', contract.created_at.strftime('%d/%m/%Y at %H:%M')])
        
        if contract.updated_at and contract.updated_at != contract.created_at:
            details_data.append(['Last Updated:', contract.updated_at.strftime('%d/%m/%Y at %H:%M')])

        # Create table
        if len(details_data) > 1:  # Only add if we have actual data
            details_table = Table(details_data, colWidths=[2*inch, 4*inch])
            details_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            
            story.append(details_table)
            story.append(Spacer(1, 20))

    def _add_contract_content(self, story: list, contract: Contract):
        """Add main contract content"""
        
        # Get effective content
        content = contract.get_effective_content()
        
        if not content:
            story.append(Paragraph("CONTRACT TERMS", self.styles['SectionHeader']))
            story.append(Paragraph(
                "No contract content has been generated yet.",
                self.styles['ContractBody']
            ))
            return

        # Parse content into sections
        sections = self._parse_content_sections(content)
        
        for section_title, section_content in sections:
            # Add section header
            story.append(Paragraph(section_title.upper(), self.styles['SectionHeader']))
            
            # Add section content
            paragraphs = section_content.split('\n\n')
            for paragraph in paragraphs:
                if paragraph.strip():
                    # Clean up paragraph text for PDF
                    cleaned_paragraph = paragraph.strip().replace('\n', ' ')
                    story.append(Paragraph(cleaned_paragraph, self.styles['ContractBody']))
            
            story.append(Spacer(1, 10))

    def _parse_content_sections(self, content: str) -> list:
        """Parse contract content into sections"""
        
        sections = []
        lines = content.split('\n')
        current_section = None
        current_content = []

        for line in lines:
            line = line.strip()
            
            # Check if this is a section header
            if (line.isupper() and len(line.split()) <= 5 and 
                not line.startswith('WHEREAS') and not line.startswith('NOW THEREFORE')):
                
                # Save previous section
                if current_section and current_content:
                    sections.append((current_section, '\n'.join(current_content)))
                
                # Start new section
                current_section = line
                current_content = []
                
            elif current_section and line:
                current_content.append(line)
            elif not current_section and line:
                # Content before any section headers
                if not sections:
                    sections.append(('CONTRACT TERMS', ''))
                if sections and sections[-1][0] == 'CONTRACT TERMS':
                    existing_content = sections[-1][1]
                    sections[-1] = ('CONTRACT TERMS', existing_content + '\n' + line if existing_content else line)
                else:
                    sections.append(('CONTRACT TERMS', line))

        # Add final section
        if current_section and current_content:
            sections.append((current_section, '\n'.join(current_content)))

        # If no sections found, treat entire content as single section
        if not sections and content.strip():
            sections.append(('CONTRACT TERMS', content.strip()))

        return sections

    def _add_risk_assessment(self, story: list, risk_assessment):
        """Add risk assessment section to PDF"""
        
        story.append(PageBreak())
        story.append(Paragraph("RISK ASSESSMENT", self.styles['SectionHeader']))
        
        # Overall risk score
        overall_score = getattr(risk_assessment, 'overall_score', 0)
        risk_level = getattr(risk_assessment, 'risk_level', 'Unknown')
        
        risk_summary = f"Overall Risk Score: {overall_score}/10 - {risk_level} Risk Level"
        story.append(Paragraph(risk_summary, self.styles['ContractBody']))
        story.append(Spacer(1, 10))

        # Risk factors
        risk_factors = getattr(risk_assessment, 'risk_factors', [])
        if risk_factors:
            story.append(Paragraph("Risk Factors:", self.styles['ContractBody']))
            
            for factor in risk_factors[:5]:  # Limit to top 5 factors
                factor_text = f"• {factor.get('factor_name', 'Unknown Factor')}: "
                factor_text += f"Score {factor.get('score', 0)}/10 "
                factor_text += f"({factor.get('severity', 'Unknown')} severity)"
                
                story.append(Paragraph(factor_text, self.styles['ContractBody']))
                
                if factor.get('description'):
                    story.append(Paragraph(
                        f"  {factor['description']}", 
                        self.styles['ContractBody']
                    ))
            
            story.append(Spacer(1, 10))

        # Recommendations
        recommendations = getattr(risk_assessment, 'priority_actions', [])
        if recommendations:
            story.append(Paragraph("Recommendations:", self.styles['ContractBody']))
            
            for rec in recommendations[:5]:  # Limit to top 5 recommendations
                story.append(Paragraph(f"• {rec}", self.styles['ContractBody']))

    def _add_compliance_score(self, story: list, compliance_score):
        """Add compliance score section to PDF"""
        
        story.append(Spacer(1, 20))
        story.append(Paragraph("COMPLIANCE ANALYSIS", self.styles['SectionHeader']))
        
        # Overall compliance
        overall_score = getattr(compliance_score, 'overall_score', 0)
        story.append(Paragraph(
            f"Overall Compliance Score: {overall_score}%",
            self.styles['ContractBody']
        ))
        
        # Individual compliance areas
        compliance_areas = [
            ('GDPR Compliance', getattr(compliance_score, 'gdpr_compliance', 0)),
            ('Employment Law', getattr(compliance_score, 'employment_law_compliance', 0)),
            ('Consumer Rights', getattr(compliance_score, 'consumer_rights_compliance', 0)),
            ('Commercial Terms', getattr(compliance_score, 'commercial_terms_compliance', 0)),
        ]
        
        for area_name, score in compliance_areas:
            if score > 0:
                story.append(Paragraph(
                    f"{area_name}: {score}%",
                    self.styles['ContractBody']
                ))

    def _add_signature_section(self, story: list, contract: Contract):
        """Add signature section to PDF"""
        
        story.append(Spacer(1, 30))
        story.append(Paragraph("SIGNATURES", self.styles['SectionHeader']))
        story.append(Spacer(1, 20))

        # Create signature table
        signature_data = [
            ['Party', 'Signature', 'Date'],
        ]

        # Add client signature line
        if contract.client and contract.client.name:
            signature_data.append([
                contract.client.name + '\n(Client)',
                '_' * 30,
                '_' * 15
            ])

        # Add supplier signature line
        if contract.supplier and contract.supplier.name:
            signature_data.append([
                contract.supplier.name + '\n(Supplier)',
                '_' * 30,
                '_' * 15
            ])

        signature_table = Table(signature_data, colWidths=[2*inch, 2.5*inch, 1.5*inch])
        signature_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 20),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(signature_table)

    def _add_footer(self, story: list):
        """Add footer to PDF"""
        
        story.append(Spacer(1, 30))
        
        footer_text = f"Generated by Pactoria on {datetime.now().strftime('%d/%m/%Y at %H:%M')} UTC"
        story.append(Paragraph(footer_text, self.styles['ContractDetails']))


# Singleton instance
pdf_export_service = PDFExportService() if REPORTLAB_AVAILABLE else None