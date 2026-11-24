"""Platform admin: overview analytics and vendor list (counts only, no message text).

summarize_* functions are pure (no database calls) so they are easy to test.
build_* functions load the rows and call them.
"""
from collections import Counter
from datetime import datetime, timedelta, timezone

import models
from analytics import CHANNELS, ORDER_STATUSES, _as_pk


def _total(order):
    return order.unit_price * order.quantity


def _is_sale(order):
    return order.status not in ("Cancelled", "Returned")


def _within_days(dt, now, days):
    if dt is None:
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return timedelta(0) <= now - dt <= timedelta(days=days)


def summarize_platform(vendors, products, orders, messages, now=None):
    now = now or datetime.now(timezone.utc)
    shops = [v for v in vendors if v.role != "admin"]
    shop_ids = {v.id for v in shops}
    products = [p for p in products if p.vendor_id in shop_ids]
    orders = [o for o in orders if o.vendor_id in shop_ids]
    incoming = [m for m in messages if m.vendor_id in shop_ids and m.direction == "in"]

    today = _as_pk(now).date()
    new_today = sum(
        1 for v in shops if v.created_at is not None and _as_pk(v.created_at).date() == today
    )

    orders_by_status = {s: 0 for s in ORDER_STATUSES}
    for o in orders:
        orders_by_status[o.status] = orders_by_status.get(o.status, 0) + 1

    messages_by_channel = {c: 0 for c in CHANNELS}
    for m in incoming:
        messages_by_channel[m.channel] = messages_by_channel.get(m.channel, 0) + 1

    low_stock = sum(
        1 for p in products for v in p.variants if v.stock <= p.low_stock_level
    )
    suspended = sum(1 for v in shops if v.is_active is False)

    return {
        "vendors": {
            "total": len(shops),
            "active": len(shops) - suspended,
            "suspended": suspended,
            "new_today": new_today,
            "new_7_days": sum(1 for v in shops if _within_days(v.created_at, now, 7)),
            "new_30_days": sum(1 for v in shops if _within_days(v.created_at, now, 30)),
        },
        "totals": {
            "products": len(products),
            "orders": len(orders),
            "messages": len(incoming),
            "sales": sum(_total(o) for o in orders if _is_sale(o)),
        },
        "orders_by_status": orders_by_status,
        "messages_by_channel": messages_by_channel,
        "low_stock_items": low_stock,
    }


def summarize_vendors(vendors, products, orders, messages, connected_ids, search=""):
    q = search.strip().lower()
    n_products = Counter(p.vendor_id for p in products)
    n_orders = Counter(o.vendor_id for o in orders)
    n_messages = Counter(m.vendor_id for m in messages if m.direction == "in")
    sales = Counter()
    for o in orders:
        if _is_sale(o):
            sales[o.vendor_id] += _total(o)

    rows = []
    for v in vendors:
        if v.role == "admin":
            continue
        text = " ".join([v.name or "", v.email or "", v.shop_name or "", v.shop_slug or ""]).lower()
        if q and q not in text:
            continue
        rows.append(
            {
                "id": v.id,
                "name": v.name,
                "email": v.email,
                "shop_name": v.shop_name,
                "shop_slug": v.shop_slug,
                "is_active": v.is_active is not False,
                "joined": v.created_at.isoformat() if v.created_at else None,
                "products": n_products[v.id],
                "orders": n_orders[v.id],
                "messages": n_messages[v.id],
                "sales": sales[v.id],
                "facebook_connected": v.id in connected_ids,
            }
        )
    rows.sort(key=lambda r: r["id"], reverse=True)
    return rows


def _load(db):
    return (
        db.query(models.Vendor).all(),
        db.query(models.Product).all(),
        db.query(models.Order).all(),
        db.query(models.Message).all(),
    )


def build_overview(db, now=None):
    vendors, products, orders, messages = _load(db)
    return summarize_platform(vendors, products, orders, messages, now)


def build_vendor_rows(db, search=""):
    vendors, products, orders, messages = _load(db)
    connected = {c.vendor_id for c in db.query(models.ChannelAccount).all()}
    return summarize_vendors(vendors, products, orders, messages, connected, search)
