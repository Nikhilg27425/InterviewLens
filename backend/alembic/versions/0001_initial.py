"""Initial schema

Revision ID: 0001
Revises: 
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users
    op.create_table(
        'users',
        sa.Column('id',              postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email',           sa.String(255), nullable=False, unique=True),
        sa.Column('full_name',       sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role',            sa.String(20),  nullable=False),
        sa.Column('is_active',       sa.Boolean,     default=True),
        sa.Column('company',         sa.String(255), nullable=True),
        sa.Column('created_at',      sa.DateTime(timezone=True)),
        sa.Column('updated_at',      sa.DateTime(timezone=True)),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # Problems
    op.create_table(
        'problems',
        sa.Column('id',                  postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('slug',                sa.String(120), nullable=False, unique=True),
        sa.Column('title',               sa.String(255), nullable=False),
        sa.Column('difficulty',          sa.String(10),  nullable=False),
        sa.Column('points',              sa.Integer,     default=10),
        sa.Column('description',         sa.Text,        nullable=False),
        sa.Column('constraints',         sa.Text),
        sa.Column('examples',            sa.Text),
        sa.Column('starter_code',        sa.Text),
        sa.Column('custom_test_default', sa.Text,        nullable=True),
        sa.Column('order_index',         sa.Integer,     default=0),
    )
    op.create_index('ix_problems_slug', 'problems', ['slug'])

    # Test cases
    op.create_table(
        'test_cases',
        sa.Column('id',          postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('problem_id',  postgresql.UUID(as_uuid=True), sa.ForeignKey('problems.id', ondelete='CASCADE')),
        sa.Column('label',       sa.String(255), nullable=False),
        sa.Column('stdin',       sa.Text,        nullable=False),
        sa.Column('expected',    sa.Text,        nullable=False),
        sa.Column('is_hidden',   sa.Boolean,     default=False),
        sa.Column('order_index', sa.Integer,     default=0),
    )

    # Interview sessions
    op.create_table(
        'interview_sessions',
        sa.Column('id',               postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('access_token',     sa.String(64),  nullable=False, unique=True),
        sa.Column('title',            sa.String(255), nullable=False),
        sa.Column('status',           sa.String(20),  nullable=False),
        sa.Column('interviewer_id',   postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('candidate_id',     postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('problem_ids',      sa.Text,        nullable=True),
        sa.Column('duration_minutes', sa.Integer,     default=60),
        sa.Column('started_at',       sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended_at',         sa.DateTime(timezone=True), nullable=True),
        sa.Column('scheduled_at',     sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at',       sa.DateTime(timezone=True)),
        sa.Column('candidate_name',   sa.String(255), nullable=True),
        sa.Column('candidate_role',   sa.String(255), nullable=True),
        sa.Column('notes',            sa.Text,        nullable=True),
        sa.Column('ai_summary',       sa.Text,        nullable=True),
        sa.Column('final_score',      sa.Integer,     nullable=True),
    )
    op.create_index('ix_sessions_access_token', 'interview_sessions', ['access_token'])

    # Submissions
    op.create_table(
        'submissions',
        sa.Column('id',             postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id',     postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_sessions.id', ondelete='CASCADE')),
        sa.Column('problem_id',     postgresql.UUID(as_uuid=True), sa.ForeignKey('problems.id')),
        sa.Column('candidate_id',   postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('language',       sa.String(40),  nullable=False),
        sa.Column('source_code',    sa.Text,        nullable=False),
        sa.Column('results_json',   sa.Text,        nullable=True),
        sa.Column('passed_cases',   sa.Integer,     default=0),
        sa.Column('total_cases',    sa.Integer,     default=0),
        sa.Column('is_accepted',    sa.Boolean,     default=False),
        sa.Column('avg_runtime_ms', sa.Float,       nullable=True),
        sa.Column('avg_memory_kb',  sa.Float,       nullable=True),
        sa.Column('is_final',       sa.Boolean,     default=False),
        sa.Column('submitted_at',   sa.DateTime(timezone=True)),
    )

    # Proctoring signals
    op.create_table(
        'proctoring_signals',
        sa.Column('id',              postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id',      postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_sessions.id', ondelete='CASCADE')),
        sa.Column('candidate_id',    postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('signal_type',     sa.String(40),  nullable=False),
        sa.Column('risk_level',      sa.String(20),  nullable=False),
        sa.Column('detail',          sa.Text,        nullable=True),
        sa.Column('elapsed_seconds', sa.Integer,     nullable=True),
        sa.Column('timestamp',       sa.DateTime(timezone=True)),
    )
    op.create_index('ix_signals_session', 'proctoring_signals', ['session_id'])
    op.create_index('ix_signals_type',    'proctoring_signals', ['signal_type'])

    # Code snapshots
    op.create_table(
        'code_snapshots',
        sa.Column('id',              postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id',      postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_sessions.id', ondelete='CASCADE')),
        sa.Column('problem_id',      postgresql.UUID(as_uuid=True), sa.ForeignKey('problems.id'), nullable=True),
        sa.Column('language',        sa.String(40),  nullable=False),
        sa.Column('source_code',     sa.Text,        nullable=False),
        sa.Column('char_count',      sa.Integer,     default=0),
        sa.Column('chars_added',     sa.Integer,     default=0),
        sa.Column('chars_removed',   sa.Integer,     default=0),
        sa.Column('keystroke_rate',  sa.Float,       nullable=True),
        sa.Column('elapsed_seconds', sa.Integer,     nullable=True),
        sa.Column('captured_at',     sa.DateTime(timezone=True)),
    )

    # Similarity reports
    op.create_table(
        'similarity_reports',
        sa.Column('id',               postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id',       postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_sessions.id', ondelete='CASCADE')),
        sa.Column('problem_id',       postgresql.UUID(as_uuid=True), sa.ForeignKey('problems.id'), nullable=True),
        sa.Column('submission_id',    postgresql.UUID(as_uuid=True), sa.ForeignKey('submissions.id'), nullable=True),
        sa.Column('language',         sa.String(40),  nullable=False),
        sa.Column('overall_score',    sa.Float,       default=0.0),
        sa.Column('structural_score', sa.Float,       default=0.0),
        sa.Column('token_score',      sa.Float,       default=0.0),
        sa.Column('literal_score',    sa.Float,       default=0.0),
        sa.Column('matched_source',   sa.String(512), nullable=True),
        sa.Column('source_type',      sa.String(64),  nullable=True),
        sa.Column('is_flagged',       sa.Boolean,     default=False),
        sa.Column('diff_json',        sa.Text,        nullable=True),
        sa.Column('analyzed_at',      sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table('similarity_reports')
    op.drop_table('code_snapshots')
    op.drop_table('proctoring_signals')
    op.drop_table('submissions')
    op.drop_table('interview_sessions')
    op.drop_table('test_cases')
    op.drop_table('problems')
    op.drop_table('users')
