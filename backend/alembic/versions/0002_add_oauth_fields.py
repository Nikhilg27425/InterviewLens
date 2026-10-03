"""add oauth fields

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make hashed_password nullable for OAuth users
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(255),
                    nullable=True)
    
    # Add OAuth fields (IF NOT EXISTS: tables may have been created by create_all)
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500)")

    # Create index on oauth_id for faster lookups
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_oauth_id ON users (oauth_id)")


def downgrade() -> None:
    op.drop_index('ix_users_oauth_id', table_name='users')
    op.drop_column('users', 'profile_picture')
    op.drop_column('users', 'oauth_id')
    op.drop_column('users', 'oauth_provider')
    
    # Make hashed_password non-nullable again
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(255),
                    nullable=False)
