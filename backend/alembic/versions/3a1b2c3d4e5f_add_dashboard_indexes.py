"""Add dashboard indexes for high-speed foreign key lookups

Revision ID: 3a1b2c3d4e5f
Revises: 249060805573
Create Date: 2026-11-10 10:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '3a1b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = '249060805573'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Indexes on ai_scheduled_interviews
    op.create_index(op.f('ix_ai_scheduled_interviews_student_id'), 'ai_scheduled_interviews', ['student_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_ai_scheduled_interviews_interviewer_id'), 'ai_scheduled_interviews', ['interviewer_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_ai_scheduled_interviews_status'), 'ai_scheduled_interviews', ['status'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_ai_scheduled_interviews_created_at'), 'ai_scheduled_interviews', ['created_at'], unique=False, if_not_exists=True)

    # Indexes on practice_sessions
    op.create_index(op.f('ix_practice_sessions_student_id'), 'practice_sessions', ['student_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_practice_sessions_status'), 'practice_sessions', ['status'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_practice_sessions_started_at'), 'practice_sessions', ['started_at'], unique=False, if_not_exists=True)

    # Indexes on ai_questions
    op.create_index(op.f('ix_ai_questions_session_id'), 'ai_questions', ['session_id'], unique=False, if_not_exists=True)

def downgrade() -> None:
    op.drop_index(op.f('ix_ai_questions_session_id'), table_name='ai_questions', if_exists=True)
    op.drop_index(op.f('ix_practice_sessions_started_at'), table_name='practice_sessions', if_exists=True)
    op.drop_index(op.f('ix_practice_sessions_status'), table_name='practice_sessions', if_exists=True)
    op.drop_index(op.f('ix_practice_sessions_student_id'), table_name='practice_sessions', if_exists=True)
    op.drop_index(op.f('ix_ai_scheduled_interviews_created_at'), table_name='ai_scheduled_interviews', if_exists=True)
    op.drop_index(op.f('ix_ai_scheduled_interviews_status'), table_name='ai_scheduled_interviews', if_exists=True)
    op.drop_index(op.f('ix_ai_scheduled_interviews_interviewer_id'), table_name='ai_scheduled_interviews', if_exists=True)
    op.drop_index(op.f('ix_ai_scheduled_interviews_student_id'), table_name='ai_scheduled_interviews', if_exists=True)

