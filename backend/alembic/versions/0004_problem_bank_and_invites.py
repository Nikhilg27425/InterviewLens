"""problem bank metadata + session invite tracking

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-26 18:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # IF NOT EXISTS: tables may already have been created by create_all
    op.execute("ALTER TABLE problems ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '[]'")
    op.execute("ALTER TABLE problems ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id)")
    op.execute("ALTER TABLE problems ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()")
    op.execute("ALTER TABLE problems ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()")
    op.execute("UPDATE problems SET tags = '[]' WHERE tags IS NULL")
    op.execute("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ")


def downgrade() -> None:
    op.drop_column('interview_sessions', 'invite_sent_at')
    op.drop_column('problems', 'updated_at')
    op.drop_column('problems', 'created_at')
    op.drop_column('problems', 'created_by')
    op.drop_column('problems', 'tags')
