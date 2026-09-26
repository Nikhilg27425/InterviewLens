"""add candidate_email to sessions

Revision ID: 0003
Revises: 0002
Create Date: 2024-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add candidate_email field to interview_sessions table
    op.execute("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS candidate_email VARCHAR(255)")


def downgrade() -> None:
    # Remove candidate_email field
    op.drop_column('interview_sessions', 'candidate_email')
