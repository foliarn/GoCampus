"""add_reviews_table

Revision ID: 8eef7fa1e720
Revises: bb1e831c5cc2
Create Date: 2026-01-13 20:55:01.701221

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8eef7fa1e720'
down_revision: Union[str, Sequence[str], None] = 'bb1e831c5cc2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'reviews',
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('reservation_id', sa.Integer(), nullable=False),
        sa.Column('reviewer_id', sa.Integer(), nullable=False),
        sa.Column('driver_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False),
        sa.PrimaryKeyConstraint('review_id'),
        sa.ForeignKeyConstraint(['reservation_id'], ['reservations.reservation_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['driver_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='chk_rating_range'),
        sa.UniqueConstraint('reservation_id', name='uq_one_review_per_reservation')
    )
    op.create_index('ix_reviews_review_id', 'reviews', ['review_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_reviews_review_id', table_name='reviews')
    op.drop_table('reviews')