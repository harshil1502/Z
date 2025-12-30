"""
Alert service - Handles alert evaluation and notifications.
"""

import json
from datetime import datetime
from typing import Any, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.options import OptionsFlow
from app.models.user import User, UserAlert

logger = structlog.get_logger(__name__)


class AlertService:
    """Service for managing and triggering alerts."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active_alerts(
        self,
        symbol: Optional[str] = None,
    ) -> list[UserAlert]:
        """Get all active alerts, optionally filtered by symbol."""
        query = select(UserAlert).where(UserAlert.is_active == True)

        if symbol:
            # Include alerts for specific symbol OR alerts for all symbols (None)
            query = query.where(
                (UserAlert.symbol == symbol.upper()) | (UserAlert.symbol == None)
            )

        result = await self.db.execute(query)
        return result.scalars().all()

    async def evaluate_alert(
        self,
        alert: UserAlert,
        flow: OptionsFlow,
        context: dict[str, Any],
    ) -> bool:
        """
        Evaluate if an alert should be triggered.

        Args:
            alert: The alert to evaluate
            flow: Current flow data
            context: Additional context (baseline stats, etc.)

        Returns:
            True if alert should trigger, False otherwise
        """
        conditions = alert.conditions

        # Get the field to check
        field = conditions.get("field", "volume")
        comparison = conditions.get("comparison", "gt")
        threshold = conditions.get("value", 0)
        value_type = conditions.get("value_type", "absolute")

        # Get current value
        current_value = getattr(flow, field, None)
        if current_value is None:
            return False

        # Calculate comparison value based on type
        if value_type == "multiplier" and field in context:
            # e.g., volume > 3x average
            compare_value = context.get(f"avg_{field}", 0) * threshold
        elif value_type == "percentage" and field in context:
            # e.g., OI change > 50%
            baseline = context.get(f"prev_{field}", 0)
            compare_value = baseline * (1 + threshold / 100) if baseline else 0
        else:
            # Absolute value
            compare_value = threshold

        # Perform comparison
        result = self._compare(current_value, comparison, compare_value)

        logger.debug(
            "Alert evaluation",
            alert_id=alert.id,
            field=field,
            current=current_value,
            threshold=compare_value,
            comparison=comparison,
            triggered=result,
        )

        return result

    def _compare(self, value: Any, comparison: str, threshold: Any) -> bool:
        """Perform comparison operation."""
        try:
            value = float(value)
            threshold = float(threshold)
        except (ValueError, TypeError):
            return False

        comparisons = {
            "gt": value > threshold,
            "gte": value >= threshold,
            "lt": value < threshold,
            "lte": value <= threshold,
            "eq": value == threshold,
        }

        return comparisons.get(comparison, False)

    async def trigger_alert(
        self,
        alert: UserAlert,
        flow: OptionsFlow,
        message: str,
    ) -> None:
        """
        Trigger an alert and send notifications.

        Args:
            alert: The alert being triggered
            flow: Flow data that triggered the alert
            message: Alert message
        """
        # Update alert stats
        alert.trigger_count += 1
        alert.last_triggered_at = datetime.utcnow()
        await self.db.commit()

        # Get user for notification
        user_result = await self.db.execute(
            select(User).where(User.id == alert.user_id)
        )
        user = user_result.scalar_one_or_none()

        if not user:
            logger.warning("Alert triggered but user not found", alert_id=alert.id)
            return

        # Send notifications based on channels
        channels = alert.notification_channels

        if channels.get("email"):
            await self._send_email_notification(user, alert, message)

        if channels.get("telegram"):
            await self._send_telegram_notification(user, alert, message)

        if channels.get("push"):
            await self._send_push_notification(user, alert, message)

        logger.info(
            "Alert triggered",
            alert_id=alert.id,
            alert_name=alert.name,
            user_id=user.id,
            channels=list(channels.keys()),
        )

    async def _send_email_notification(
        self,
        user: User,
        alert: UserAlert,
        message: str,
    ) -> None:
        """Send email notification."""
        # TODO: Implement email sending (e.g., with SendGrid, AWS SES)
        logger.info(
            "Email notification",
            user_email=user.email,
            alert_name=alert.name,
            message=message,
        )

    async def _send_telegram_notification(
        self,
        user: User,
        alert: UserAlert,
        message: str,
    ) -> None:
        """Send Telegram notification."""
        if not user.telegram_chat_id:
            return

        # TODO: Implement Telegram bot integration
        logger.info(
            "Telegram notification",
            chat_id=user.telegram_chat_id,
            alert_name=alert.name,
            message=message,
        )

    async def _send_push_notification(
        self,
        user: User,
        alert: UserAlert,
        message: str,
    ) -> None:
        """Send push notification."""
        # TODO: Implement push notifications (e.g., with Firebase)
        logger.info(
            "Push notification",
            user_id=user.id,
            alert_name=alert.name,
            message=message,
        )

    async def process_flow_for_alerts(
        self,
        flow: OptionsFlow,
        symbol: str,
        context: dict[str, Any],
    ) -> list[UserAlert]:
        """
        Process a new flow data point and check all relevant alerts.

        Args:
            flow: New flow data
            symbol: Symbol name
            context: Additional context (baseline stats)

        Returns:
            List of alerts that were triggered
        """
        triggered_alerts = []

        # Get all active alerts for this symbol
        alerts = await self.get_active_alerts(symbol)

        for alert in alerts:
            try:
                if await self.evaluate_alert(alert, flow, context):
                    # Build message
                    message = self._build_alert_message(alert, flow, symbol)
                    await self.trigger_alert(alert, flow, message)
                    triggered_alerts.append(alert)
            except Exception as e:
                logger.error(
                    "Error evaluating alert",
                    alert_id=alert.id,
                    error=str(e),
                )

        return triggered_alerts

    def _build_alert_message(
        self,
        alert: UserAlert,
        flow: OptionsFlow,
        symbol: str,
    ) -> str:
        """Build human-readable alert message."""
        return (
            f"Alert: {alert.name}\n"
            f"Symbol: {symbol}\n"
            f"Type: {alert.alert_type}\n"
            f"LTP: {flow.ltp}\n"
            f"Volume: {flow.volume}\n"
            f"OI: {flow.oi}\n"
            f"Time: {flow.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
        )
