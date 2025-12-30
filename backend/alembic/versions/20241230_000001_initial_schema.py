"""Initial database schema

Revision ID: 20241230_000001
Revises:
Create Date: 2024-12-30 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20241230_000001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create symbols table
    op.create_table(
        'symbols',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=True),
        sa.Column('exchange', sa.String(length=10), nullable=False),
        sa.Column('segment', sa.String(length=20), nullable=True),
        sa.Column('lot_size', sa.Integer(), nullable=True),
        sa.Column('tick_size', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_symbols_symbol', 'symbols', ['symbol'], unique=True)

    # Create options_contracts table
    op.create_table(
        'options_contracts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('symbol_id', sa.Integer(), nullable=False),
        sa.Column('strike_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('expiry_date', sa.Date(), nullable=False),
        sa.Column('option_type', sa.String(length=2), nullable=False),
        sa.Column('contract_symbol', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['symbol_id'], ['symbols.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('contract_symbol')
    )
    op.create_index('idx_contract_lookup', 'options_contracts', ['symbol_id', 'strike_price', 'expiry_date', 'option_type'])
    op.create_index('ix_options_contracts_expiry_date', 'options_contracts', ['expiry_date'])
    op.create_index('ix_options_contracts_symbol_id', 'options_contracts', ['symbol_id'])

    # Create options_flow table
    op.create_table(
        'options_flow',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('contract_id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ltp', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('bid_price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('ask_price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('bid_qty', sa.BigInteger(), nullable=True),
        sa.Column('ask_qty', sa.BigInteger(), nullable=True),
        sa.Column('volume', sa.BigInteger(), nullable=True),
        sa.Column('oi', sa.BigInteger(), nullable=True),
        sa.Column('oi_change', sa.BigInteger(), nullable=True),
        sa.Column('total_traded_value', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('iv', sa.Numeric(precision=8, scale=4), nullable=True),
        sa.Column('delta', sa.Numeric(precision=8, scale=6), nullable=True),
        sa.Column('gamma', sa.Numeric(precision=12, scale=10), nullable=True),
        sa.Column('theta', sa.Numeric(precision=8, scale=4), nullable=True),
        sa.Column('vega', sa.Numeric(precision=8, scale=4), nullable=True),
        sa.Column('underlying_price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('is_unusual', sa.Boolean(), nullable=True, default=False),
        sa.Column('unusual_flags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['contract_id'], ['options_contracts.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_flow_timestamp', 'options_flow', ['timestamp'])
    op.create_index('idx_flow_unusual', 'options_flow', ['is_unusual'], postgresql_where=sa.text('is_unusual = true'))
    op.create_index('ix_options_flow_contract_id', 'options_flow', ['contract_id'])

    # Create fii_dii_data table
    op.create_table(
        'fii_dii_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('category', sa.String(length=10), nullable=False),
        sa.Column('segment', sa.String(length=20), nullable=False),
        sa.Column('buy_value', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('sell_value', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('net_value', sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column('long_contracts', sa.BigInteger(), nullable=True),
        sa.Column('short_contracts', sa.BigInteger(), nullable=True),
        sa.Column('net_contracts', sa.BigInteger(), nullable=True),
        sa.Column('is_provisional', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_fii_dii_date', 'fii_dii_data', ['date'])

    # Create bulk_block_deals table
    op.create_table(
        'bulk_block_deals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('symbol_id', sa.Integer(), nullable=False),
        sa.Column('deal_type', sa.String(length=10), nullable=False),
        sa.Column('client_name', sa.String(length=200), nullable=True),
        sa.Column('buy_sell', sa.String(length=1), nullable=True),
        sa.Column('quantity', sa.BigInteger(), nullable=True),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['symbol_id'], ['symbols.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_bulk_block_deals_date', 'bulk_block_deals', ['date'])
    op.create_index('ix_bulk_block_deals_symbol_id', 'bulk_block_deals', ['symbol_id'])

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=True),
        sa.Column('subscription_tier', sa.String(length=20), nullable=True, default='free'),
        sa.Column('subscription_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_superuser', sa.Boolean(), nullable=True, default=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('telegram_chat_id', sa.String(length=50), nullable=True),
        sa.Column('preferences', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Create user_alerts table
    op.create_table(
        'user_alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('symbol', sa.String(length=20), nullable=True),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('conditions', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('notification_channels', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('trigger_count', sa.Integer(), nullable=True, default=0),
        sa.Column('last_triggered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_alerts_user_id', 'user_alerts', ['user_id'])

    # Create user_watchlists table
    op.create_table(
        'user_watchlists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('symbols', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_watchlists_user_id', 'user_watchlists', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_user_watchlists_user_id', table_name='user_watchlists')
    op.drop_table('user_watchlists')
    op.drop_index('ix_user_alerts_user_id', table_name='user_alerts')
    op.drop_table('user_alerts')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
    op.drop_index('ix_bulk_block_deals_symbol_id', table_name='bulk_block_deals')
    op.drop_index('ix_bulk_block_deals_date', table_name='bulk_block_deals')
    op.drop_table('bulk_block_deals')
    op.drop_index('idx_fii_dii_date', table_name='fii_dii_data')
    op.drop_table('fii_dii_data')
    op.drop_index('ix_options_flow_contract_id', table_name='options_flow')
    op.drop_index('idx_flow_unusual', table_name='options_flow')
    op.drop_index('idx_flow_timestamp', table_name='options_flow')
    op.drop_table('options_flow')
    op.drop_index('ix_options_contracts_symbol_id', table_name='options_contracts')
    op.drop_index('ix_options_contracts_expiry_date', table_name='options_contracts')
    op.drop_index('idx_contract_lookup', table_name='options_contracts')
    op.drop_table('options_contracts')
    op.drop_index('ix_symbols_symbol', table_name='symbols')
    op.drop_table('symbols')
