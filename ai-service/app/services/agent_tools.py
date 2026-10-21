from app.services.db_tools import get_order_by_number_sync

def check_order_status(order_id: str) -> str:
    order = get_order_by_number_sync(order_id)
    if not order:
        return f"Order {order_id} status: Order ID not found in system."

    items = ", ".join(i.get("name", "") for i in order.get("items", [])) or "items"
    status = order.get("status", "unknown")
    eta = order.get("etaMinutes", "?")
    return (
        f"Order {order.get('orderNumber', order_id)} status: {status}. "
        f"Items: {items}. ETA: {eta} minutes."
    )