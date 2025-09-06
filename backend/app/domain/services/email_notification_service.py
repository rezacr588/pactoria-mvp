"""
Email Notification Service for Contract Deadlines
Provides email notifications for contract deadline management as required by MVP
Follows DDD patterns and provides UK SME-focused messaging
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
import logging

from app.domain.entities.company import Company
from app.domain.entities.contract import Contract
from app.domain.value_objects import Email, ContractStatus
from app.core.config import settings


logger = logging.getLogger(__name__)


class NotificationType(str, Enum):
    """Types of contract notifications"""

    DEADLINE_REMINDER = "deadline_reminder"
    DEADLINE_OVERDUE = "deadline_overdue"
    CONTRACT_EXPIRING = "contract_expiring"
    CONTRACT_EXPIRED = "contract_expired"
    COMPLIANCE_REVIEW_NEEDED = "compliance_review_needed"
    RISK_ASSESSMENT_ALERT = "risk_assessment_alert"


class NotificationPriority(str, Enum):
    """Priority levels for notifications"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


@dataclass
class NotificationRecipient:
    """Notification recipient information"""

    email: Email
    full_name: str
    role: str
    language: str = "en-GB"  # UK English default


@dataclass
class NotificationTemplate:
    """Email notification template"""

    notification_type: NotificationType
    subject_template: str
    html_template: str
    text_template: str
    priority: NotificationPriority
    send_before_days: List[int] = field(
        default_factory=list
    )  # Days before deadline to send

    def format_subject(self, variables: Dict[str, Any]) -> str:
        """Format subject line with variables"""
        return self.subject_template.format(**variables)

    def format_html_body(self, variables: Dict[str, Any]) -> str:
        """Format HTML body with variables"""
        return self.html_template.format(**variables)

    def format_text_body(self, variables: Dict[str, Any]) -> str:
        """Format text body with variables"""
        return self.text_template.format(**variables)


@dataclass
class NotificationContext:
    """Context information for notifications"""

    contract: Contract
    company: Company
    recipients: List[NotificationRecipient]
    deadline_date: datetime
    days_until_deadline: int
    additional_context: Dict[str, Any] = field(default_factory=dict)


class EmailNotificationService:
    """
    Domain service for contract deadline email notifications
    Provides SME-focused messaging and UK business context
    """

    def __init__(self):
        self.templates = self._initialize_templates()
        self.smtp_config = self._get_smtp_config()

    def check_and_send_deadline_notifications(
        self, contracts: List[Contract], companies: Dict[str, Company]
    ) -> List[Dict[str, Any]]:
        """
        Check contracts for upcoming deadlines and send notifications
        Returns list of notifications sent
        """
        notifications_sent = []
        current_date = datetime.now(timezone.utc)

        for contract in contracts:
            company = companies.get(contract.company_id)
            if not company:
                logger.warning(f"Company not found for contract {contract.id}")
                continue

            # Check various deadline types
            deadline_checks = [
                self._check_contract_expiry(contract, current_date),
                self._check_renewal_deadline(contract, current_date),
                self._check_payment_deadline(contract, current_date),
                self._check_compliance_review_deadline(contract, current_date),
            ]

            for deadline_info in deadline_checks:
                if deadline_info:
                    try:
                        notification_result = self._send_deadline_notification(
                            deadline_info, contract, company
                        )
                        if notification_result:
                            notifications_sent.append(notification_result)
                    except Exception as e:
                        logger.error(
                            f"Failed to send notification for contract {contract.id}: {e}"
                        )

        return notifications_sent

    def send_contract_risk_alert(
        self, contract: Contract, company: Company, risk_assessment: Any
    ) -> Optional[Dict[str, Any]]:
        """Send risk assessment alert for high-risk contracts"""
        if not risk_assessment.requires_review():
            return None

        template = self.templates[NotificationType.RISK_ASSESSMENT_ALERT]
        recipients = self._get_contract_stakeholders(
            contract, company, include_legal_reviewers=True
        )

        variables = {
            "contract_title": contract.title,
            "company_name": company.name,
            "risk_score": risk_assessment.overall_score,
            "risk_level": risk_assessment.risk_level,
            "key_concerns": ", ".join(risk_assessment.key_concerns[:3]),
            "priority_actions": ", ".join(risk_assessment.priority_actions[:3]),
            "contract_url": self._get_contract_url(contract.id),
            "support_email": "support@pactoria.com",
        }

        return self._send_notification_email(template, recipients, variables)

    def send_compliance_review_reminder(
        self, contract: Contract, company: Company
    ) -> Optional[Dict[str, Any]]:
        """Send compliance review reminder for non-compliant contracts"""
        if not contract.requires_compliance_review():
            return None

        template = self.templates[NotificationType.COMPLIANCE_REVIEW_NEEDED]
        recipients = self._get_contract_stakeholders(
            contract, company, include_legal_reviewers=True
        )

        variables = {
            "contract_title": contract.title,
            "company_name": company.name,
            "compliance_score": (
                f"{contract.compliance_score.overall_score:.1%}"
                if contract.compliance_score
                else "Unknown"
            ),
            "contract_url": self._get_contract_url(contract.id),
            "support_email": "support@pactoria.com",
        }

        return self._send_notification_email(template, recipients, variables)

    def _check_contract_expiry(
        self, contract: Contract, current_date: datetime
    ) -> Optional[Dict[str, Any]]:
        """Check for contract expiry deadlines"""
        if not contract.date_range or not contract.date_range.end_date:
            return None

        days_until_expiry = (contract.date_range.end_date - current_date).days

        # Send notifications at 30, 14, 7, and 1 days before expiry
        notification_days = [30, 14, 7, 1]

        for days_before in notification_days:
            if days_until_expiry == days_before:
                notification_type = NotificationType.CONTRACT_EXPIRING
                if days_until_expiry <= 0:
                    notification_type = NotificationType.CONTRACT_EXPIRED

                return {
                    "type": notification_type,
                    "deadline_date": contract.date_range.end_date,
                    "days_until": days_until_expiry,
                    "context": "contract_expiry",
                }

        return None

    def _check_renewal_deadline(
        self, contract: Contract, current_date: datetime
    ) -> Optional[Dict[str, Any]]:
        """Check for renewal deadlines (assuming 60 days before expiry for renewal action)"""
        if not contract.date_range or not contract.date_range.end_date:
            return None

        if contract.status != ContractStatus.ACTIVE:
            return None

        # Calculate renewal deadline (60 days before expiry)
        renewal_deadline = contract.date_range.end_date - timedelta(days=60)
        days_until_renewal = (renewal_deadline - current_date).days

        # Send renewal reminders at 30, 14, 7 days before renewal deadline
        if days_until_renewal in [30, 14, 7]:
            return {
                "type": NotificationType.DEADLINE_REMINDER,
                "deadline_date": renewal_deadline,
                "days_until": days_until_renewal,
                "context": "renewal_action_needed",
            }

        return None

    def _check_payment_deadline(
        self, contract: Contract, current_date: datetime
    ) -> Optional[Dict[str, Any]]:
        """Check for payment deadlines (simplified - would need payment schedule integration)"""
        # This is a placeholder - in a real implementation, this would check
        # against payment schedules or milestones stored in the contract
        return None

    def _check_compliance_review_deadline(
        self, contract: Contract, current_date: datetime
    ) -> Optional[Dict[str, Any]]:
        """Check for compliance review deadlines"""
        if not contract.requires_compliance_review():
            return None

        # For MVP, send reminder if compliance review needed and contract is older than 7 days
        contract_age_days = (current_date - contract.created_at).days

        if contract_age_days >= 7 and contract.status == ContractStatus.DRAFT:
            return {
                "type": NotificationType.COMPLIANCE_REVIEW_NEEDED,
                "deadline_date": current_date,  # Immediate review needed
                "days_until": 0,
                "context": "compliance_review_overdue",
            }

        return None

    def _send_deadline_notification(
        self, deadline_info: Dict[str, Any], contract: Contract, company: Company
    ) -> Optional[Dict[str, Any]]:
        """Send deadline notification email"""
        notification_type = deadline_info["type"]
        template = self.templates.get(notification_type)

        if not template:
            logger.warning(
                f"No template found for notification type: {notification_type}"
            )
            return None

        recipients = self._get_contract_stakeholders(contract, company)

        variables = {
            "contract_title": contract.title,
            "company_name": company.name,
            "deadline_date": deadline_info["deadline_date"].strftime("%d %B %Y"),
            "days_until": deadline_info["days_until"],
            "contract_type": contract.contract_type.value.replace("_", " ").title(),
            "contract_url": self._get_contract_url(contract.id),
            "context": deadline_info["context"],
            "support_email": "support@pactoria.com",
        }

        return self._send_notification_email(template, recipients, variables)

    def _send_notification_email(
        self,
        template: NotificationTemplate,
        recipients: List[NotificationRecipient],
        variables: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Send notification email to recipients"""
        if not recipients:
            logger.warning("No recipients for notification")
            return None

        try:
            subject = template.format_subject(variables)
            html_body = template.format_html_body(variables)
            text_body = template.format_text_body(variables)

            # For MVP, we'll send individual emails to each recipient
            sent_count = 0
            for recipient in recipients:
                try:
                    # Personalize variables for each recipient
                    personal_variables = {
                        **variables,
                        "recipient_name": recipient.full_name,
                    }
                    personal_subject = template.subject_template.format(
                        **personal_variables
                    )
                    personal_html = template.html_template.format(**personal_variables)
                    personal_text = template.text_template.format(**personal_variables)

                    success = self._send_email(
                        recipient.email, personal_subject, personal_html, personal_text
                    )

                    if success:
                        sent_count += 1

                except Exception as e:
                    logger.error(f"Failed to send email to {recipient.email}: {e}")

            return {
                "notification_type": template.notification_type.value,
                "recipients_sent": sent_count,
                "total_recipients": len(recipients),
                "subject": subject,
                "sent_at": datetime.now(timezone.utc).isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return None

    def _send_email(
        self, recipient_email: Email, subject: str, html_body: str, text_body: str
    ) -> bool:
        """Send individual email"""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = formataddr(("Pactoria", self.smtp_config["from_email"]))
            msg["To"] = recipient_email.value

            # Add text and HTML parts
            text_part = MIMEText(text_body, "plain")
            html_part = MIMEText(html_body, "html")

            msg.attach(text_part)
            msg.attach(html_part)

            # For MVP development, we'll log emails instead of actually sending
            # In production, this would use proper SMTP or email service
            if settings.DEBUG:
                logger.info(f"EMAIL [DEV MODE]: To: {recipient_email.value}")
                logger.info(f"EMAIL [DEV MODE]: Subject: {subject}")
                logger.info(f"EMAIL [DEV MODE]: Body: {text_body[:200]}...")
                return True
            else:
                # Production email sending would go here
                # This is a placeholder for actual SMTP implementation
                return self._send_via_smtp(msg)

        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    def _send_via_smtp(self, message: MIMEMultipart) -> bool:
        """Send email via SMTP (placeholder for production implementation)"""
        # This would be implemented for production
        # For MVP, we'll just return True to simulate success
        return True

    def _get_contract_stakeholders(
        self,
        contract: Contract,
        company: Company,
        include_legal_reviewers: bool = False,
    ) -> List[NotificationRecipient]:
        """Get list of stakeholders who should receive contract notifications"""
        recipients = []

        # For MVP, we'll send to company primary contact
        # In full implementation, this would query team members with relevant roles
        recipients.append(
            NotificationRecipient(
                email=company.primary_contact_email,
                full_name=company.name,
                role="admin",
            )
        )

        # Add contract creator if different
        # This would require user lookup in full implementation

        return recipients

    def _get_contract_url(self, contract_id: str) -> str:
        """Generate URL for contract viewing"""
        # This would generate the actual frontend URL
        base_url = "https://app.pactoria.com"  # Would come from config
        return f"{base_url}/contracts/{contract_id}"

    def _get_smtp_config(self) -> Dict[str, Any]:
        """Get SMTP configuration"""
        return {
            "smtp_server": "localhost",  # Would come from config
            "smtp_port": 587,
            "username": "",
            "password": "",
            "from_email": "notifications@pactoria.com",
            "use_tls": True,
        }

    def _initialize_templates(self) -> Dict[NotificationType, NotificationTemplate]:
        """Initialize notification templates for UK SME context"""
        templates = {}

        # Contract expiring notification
        templates[NotificationType.CONTRACT_EXPIRING] = NotificationTemplate(
            notification_type=NotificationType.CONTRACT_EXPIRING,
            subject_template="Contract Expiring: {contract_title} - Action Required",
            html_template="""
            <html>
            <body>
                <h2>Contract Expiring Soon</h2>
                <p>Dear {recipient_name},</p>
                <p>This is a reminder that your contract <strong>{contract_title}</strong> will expire in <strong>{days_until} days</strong> on {deadline_date}.</p>
                
                <h3>What you need to do:</h3>
                <ul>
                    <li>Review if the contract needs to be renewed</li>
                    <li>Contact the other party if renewal is required</li>
                    <li>Prepare any necessary documentation</li>
                </ul>
                
                <p><a href="{contract_url}" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Contract</a></p>
                
                <p>If you need assistance, please contact our support team at {support_email}</p>
                
                <p>Best regards,<br>The Pactoria Team</p>
            </body>
            </html>
            """,
            text_template="""
            Contract Expiring Soon
            
            Dear {recipient_name},
            
            This is a reminder that your contract "{contract_title}" will expire in {days_until} days on {deadline_date}.
            
            What you need to do:
            - Review if the contract needs to be renewed
            - Contact the other party if renewal is required
            - Prepare any necessary documentation
            
            View contract: {contract_url}
            
            If you need assistance, please contact our support team at {support_email}
            
            Best regards,
            The Pactoria Team
            """,
            priority=NotificationPriority.HIGH,
            send_before_days=[30, 14, 7, 1],
        )

        # Risk assessment alert
        templates[NotificationType.RISK_ASSESSMENT_ALERT] = NotificationTemplate(
            notification_type=NotificationType.RISK_ASSESSMENT_ALERT,
            subject_template="High Risk Contract Alert: {contract_title}",
            html_template="""
            <html>
            <body>
                <h2 style="color: #d32f2f;">High Risk Contract Alert</h2>
                <p>Dear {recipient_name},</p>
                <p>Our AI risk assessment has identified potential concerns with contract <strong>{contract_title}</strong>.</p>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 5px;">
                    <h4>Risk Assessment Summary:</h4>
                    <ul>
                        <li><strong>Risk Score:</strong> {risk_score}/10 ({risk_level})</li>
                        <li><strong>Key Concerns:</strong> {key_concerns}</li>
                        <li><strong>Recommended Actions:</strong> {priority_actions}</li>
                    </ul>
                </div>
                
                <p><strong>We recommend legal review before proceeding with this contract.</strong></p>
                
                <p><a href="{contract_url}" style="background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Contract</a></p>
                
                <p>If you need assistance, please contact our support team at {support_email}</p>
                
                <p>Best regards,<br>The Pactoria Team</p>
            </body>
            </html>
            """,
            text_template="""
            High Risk Contract Alert
            
            Dear {recipient_name},
            
            Our AI risk assessment has identified potential concerns with contract "{contract_title}".
            
            Risk Assessment Summary:
            - Risk Score: {risk_score}/10 ({risk_level})
            - Key Concerns: {key_concerns}
            - Recommended Actions: {priority_actions}
            
            We recommend legal review before proceeding with this contract.
            
            Review contract: {contract_url}
            
            If you need assistance, please contact our support team at {support_email}
            
            Best regards,
            The Pactoria Team
            """,
            priority=NotificationPriority.URGENT,
        )

        # Compliance review needed
        templates[NotificationType.COMPLIANCE_REVIEW_NEEDED] = NotificationTemplate(
            notification_type=NotificationType.COMPLIANCE_REVIEW_NEEDED,
            subject_template="Compliance Review Required: {contract_title}",
            html_template="""
            <html>
            <body>
                <h2>Compliance Review Required</h2>
                <p>Dear {recipient_name},</p>
                <p>Contract <strong>{contract_title}</strong> requires a compliance review to ensure it meets UK legal requirements.</p>
                
                <div style="background-color: #e3f2fd; border: 1px solid #64b5f6; padding: 15px; margin: 15px 0; border-radius: 5px;">
                    <h4>Current Compliance Status:</h4>
                    <p>Compliance Score: <strong>{compliance_score}</strong></p>
                    <p>This contract needs review to ensure it complies with current UK legislation including GDPR, employment law, and commercial regulations.</p>
                </div>
                
                <p><a href="{contract_url}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Contract</a></p>
                
                <p>If you need assistance, please contact our support team at {support_email}</p>
                
                <p>Best regards,<br>The Pactoria Team</p>
            </body>
            </html>
            """,
            text_template="""
            Compliance Review Required
            
            Dear {recipient_name},
            
            Contract "{contract_title}" requires a compliance review to ensure it meets UK legal requirements.
            
            Current Compliance Status:
            Compliance Score: {compliance_score}
            
            This contract needs review to ensure it complies with current UK legislation including GDPR, employment law, and commercial regulations.
            
            Review contract: {contract_url}
            
            If you need assistance, please contact our support team at {support_email}
            
            Best regards,
            The Pactoria Team
            """,
            priority=NotificationPriority.MEDIUM,
        )

        return templates


# Singleton instance for application use
email_notification_service = EmailNotificationService()
