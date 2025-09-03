"""Test migration - add index for testing

Revision ID: 0efe6db14c37
Revises: 25c82965692c
Create Date: 2025-09-03 11:34:22.296957

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0efe6db14c37'
down_revision: Union[str, None] = '25c82965692c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add an index on templates.category for better query performance
    op.create_index('idx_templates_category', 'templates', ['category'])


def downgrade() -> None:
    # Remove the index
    op.drop_index('idx_templates_category', 'templates')
