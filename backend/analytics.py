"""Feature 5: dashboard and sales analytics.

summarize() is a pure function (no database calls) so it is easy to test.
build_dashboard() loads one vendor's rows and passes them to summarize().
"""
from datetime import datetime, timedelta, timezone

import models

# Pakistan has no daylight saving, so a fixed UTC+5 offset is enough.
PK = timezone(timedelta(hours=5))

ORDER_STATUSES = ["Pending", "Confirmed", "Dispatched", "Delivered", "Returned", "Cancelled"]
CHANNELS = ["shop", "facebook", "instagram"]
# Orders still waiting for the customer's cash (cash on delivery).
OPEN_STATUSES = ("Pending", "Confirmed", "Dispatched")


def _as_pk(dt):
    """Treat naive datetimes as UTC, then convert to Pakistan time."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(PK)


def _total(order):
    return order.unit_price * order.quantity


def summarize(vendor, products, orders, messages, now=None):
    now = now or datetime.now(timezone.utc)
    today = _as_pk(now).date()

    # Products, stock and low-stock items
    product_rows, low_stock_items = [], []
    for p in products:
        total_stock = sum(v.stock for v in p.variants)
        product_rows.append(
            {"id": p.id, "title": p.title, "total_stock": total_stock,
             "variant_count": len(p.variants)}
        )
        for v in p.variants:
            if v.stock <= p.low_stock_level:
                low_stock_items.append(
                    {"product_id": p.id, "title": p.title, "size": v.size,
                     "colour": v.colour, "stock": v.stock,
                     "low_stock_level": p.low_stock_level}
                )

    # Orders by status
    orders_by_status = {s: 0 for s in ORDER_STATUSES}
    for o in orders:
        orders_by_status[o.status] = orders_by_status.get(o.status, 0) + 1

    # Incoming messages per channel
    messages_by_channel = {c: 0 for c in CHANNELS}
    incoming = [m for m in messages if m.direction == "in"]
    for m in incoming:
        messages_by_channel[m.channel] = messages_by_channel.get(m.channel, 0) + 1

    # Enquiries and orders per product (matched by title)
    per_product = {}

    def row(title):
        return per_product.setdefault(title, {"title": title, "enquiries": 0, "orders": 0})

    for m in incoming:
        if m.product is not None:
            row(m.product.title)["enquiries"] += 1
    for o in orders:
        row(o.product_title)["orders"] += 1
    products_performance = sorted(
        per_product.values(), key=lambda r: (-r["orders"], -r["enquiries"], r["title"])
    )

    # Daily summary
    todays = [o for o in orders if _as_pk(o.created_at) and _as_pk(o.created_at).date() == today]
    daily = {
        "date": today.isoformat(),
        "orders_today": len(todays),
        "sales_today": sum(_total(o) for o in todays if o.status not in ("Cancelled", "Returned")),
        "cod_to_collect": sum(_total(o) for o in orders if o.status in OPEN_STATUSES),
        "low_stock_count": len(low_stock_items),
    }

    return {
        "shop_name": vendor.shop_name,
        "shop_link": f"/business/{vendor.shop_slug}",
        "totals": {
            "products": len(products),
            "orders": len(orders),
            "messages": len(incoming),
        },
        "products": product_rows,
        "low_stock_items": low_stock_items,
        "orders_by_status": orders_by_status,
        "messages_by_channel": messages_by_channel,
        "products_performance": products_performance,
        "daily": daily,
    }


def build_dashboard(db, vendor, now=None):
    products = db.query(models.Product).filter_by(vendor_id=vendor.id).all()
    orders = db.query(models.Order).filter_by(vendor_id=vendor.id).all()
    messages = db.query(models.Message).filter_by(vendor_id=vendor.id).all()
    return summarize(vendor, products, orders, messages, now)
