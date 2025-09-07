#!/usr/bin/env python3
"""
Script to seed sample notifications for testing
"""
import sys
import os
from datetime import datetime, timezone, timedelta

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import SessionLocal
from app.infrastructure.database.models import (
    Notification, User, NotificationType, NotificationPriority
)

def seed_notifications():
    """Create sample notifications for testing"""
    db = SessionLocal()
    
    try:
        # Get a test user (create one if doesn't exist)
        test_user = db.query(User).filter(User.email == "demo@pactoria.com").first()
        
        if not test_user:
            print("No demo user found. Please create a user first.")
            return
            
        print(f"Found user: {test_user.full_name} ({test_user.id})")
        
        # Check if notifications already exist
        existing_count = db.query(Notification).filter(
            Notification.user_id == test_user.id
        ).count()
        
        if existing_count > 0:
            print(f"User already has {existing_count} notifications. Skipping seeding.")
            return
        
        # Create sample notifications
        notifications = [
            {
                "type": NotificationType.DEADLINE,
                "title": "Contract Review Due Tomorrow",
                "message": "Marketing Consultant Agreement requires your review and approval before the deadline.",
                "priority": NotificationPriority.HIGH,
                "action_required": True,
                "read": False,
                "user_id": test_user.id,
                "created_at": datetime.now(timezone.utc) - timedelta(hours=2),
                "notification_metadata": {"contract_id": "sample-contract-1"}
            },
            {
                "type": NotificationType.COMPLIANCE,
                "title": "GDPR Compliance Alert",
                "message": "Data Processing Agreement needs GDPR clause updates to maintain compliance.",
                "priority": NotificationPriority.HIGH,
                "action_required": True,
                "read": False,
                "user_id": test_user.id,
                "created_at": datetime.now(timezone.utc) - timedelta(hours=6),
                "notification_metadata": {"compliance_type": "GDPR"}
            },
            {
                "type": NotificationType.CONTRACT,
                "title": "Contract Signed",
                "message": "TechCorp Website Development contract has been signed by all parties.",
                "priority": NotificationPriority.MEDIUM,
                "action_required": False,
                "read": True,
                "user_id": test_user.id,
                "created_at": datetime.now(timezone.utc) - timedelta(days=1),
                "read_at": datetime.now(timezone.utc) - timedelta(hours=12),
                "notification_metadata": {"contract_id": "sample-contract-2", "parties": ["TechCorp", "Client"]}
            },
            {
                "type": NotificationType.TEAM,
                "title": "New Team Member Added",
                "message": "Sarah Johnson has been added to your team with Editor permissions.",
                "priority": NotificationPriority.LOW,
                "action_required": False,
                "read": True,
                "user_id": test_user.id,
                "created_at": datetime.now(timezone.utc) - timedelta(days=2),
                "read_at": datetime.now(timezone.utc) - timedelta(days=2),
                "notification_metadata": {"new_member": "Sarah Johnson", "role": "Editor"}
            },
            {
                "type": NotificationType.SYSTEM,
                "title": "System Maintenance Scheduled",
                "message": "Planned maintenance scheduled for Sunday 2:00 AM - 4:00 AM GMT.",
                "priority": NotificationPriority.LOW,
                "action_required": False,
                "read": False,
                "user_id": test_user.id,
                "created_at": datetime.now(timezone.utc) - timedelta(days=3),
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "notification_metadata": {"maintenance_window": "Sunday 2:00-4:00 GMT"}
            }
        ]
        
        # Create notification objects
        for notif_data in notifications:
            notification = Notification(**notif_data)
            db.add(notification)
        
        db.commit()
        print(f"✅ Created {len(notifications)} sample notifications for user {test_user.full_name}")
        
        # Show summary
        total = db.query(Notification).filter(Notification.user_id == test_user.id).count()
        unread = db.query(Notification).filter(
            Notification.user_id == test_user.id,
            Notification.read == False
        ).count()
        
        print(f"📊 Total notifications: {total}")
        print(f"📊 Unread notifications: {unread}")
        
    except Exception as e:
        print(f"❌ Error seeding notifications: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🌱 Seeding sample notifications...")
    seed_notifications()
    print("✅ Done!")