"""Test cases for Feature 5 (dashboard analytics).

Run from the backend folder:  pytest tests -v
Needs:  pip install pytest httpx
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main
import models
from database import get_db

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSession = sessionmaker(bind=engine, autoflush=False)


@pytest.fixture()
def client():
    models.Base.metadata.drop_all(engine)
    models.Base.metadata.create_all(engine)

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[get_db] = override_db
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def signup(client, email="a@test.com", shop="Rehan Boutique"):
    r = client.post("/auth/register", json={
        "name": "Vendor", "email": email, "password": "secret123", "shop_name": shop})
    assert r.status_code == 201
    r = client.post("/auth/login", data={"username": email, "password": "secret123"})
    return {"Authorization": "Bearer " + r.json()["access_token"]}


def add_product(client, h, title="Suit", price=1000, level=5, stocks=(2, 10)):
    variants = [{"size": s, "colour": "red", "stock": n}
                for s, n in zip(["M", "L", "XL"], stocks)]
    r = client.post("/products", headers=h, json={
        "title": title, "price": price, "low_stock_level": level, "variants": variants})
    assert r.status_code == 201
    return r.json()


def add_message(client, h, product_id=None, channel="facebook", name="Ali"):
    r = client.post("/messages/simulate", headers=h, json={
        "customer_name": name, "channel": channel, "text": "medium available hai?",
        "product_id": product_id})
    assert r.status_code == 201
    return r.json()


def add_order(client, h, message_id, variant_id, qty=1):
    r = client.post("/orders", headers=h, json={
        "message_id": message_id, "variant_id": variant_id, "quantity": qty})
    assert r.status_code == 201
    return r.json()


def summary(client, h):
    r = client.get("/dashboard/summary", headers=h)
    assert r.status_code == 200
    return r.json()


# TC-01
def test_dashboard_requires_login(client):
    assert client.get("/dashboard/summary").status_code == 401


# TC-02
def test_empty_dashboard(client):
    h = signup(client)
    d = summary(client, h)
    assert d["shop_link"] == "/business/rehan-boutique"
    assert d["totals"] == {"products": 0, "orders": 0, "messages": 0}
    assert d["low_stock_items"] == []
    assert all(n == 0 for n in d["orders_by_status"].values())
    assert d["daily"]["orders_today"] == 0
    assert d["daily"]["cod_to_collect"] == 0


# TC-03
def test_low_stock_items_listed(client):
    h = signup(client)
    add_product(client, h, level=5, stocks=(2, 10))   # M is low, L is fine
    d = summary(client, h)
    assert len(d["low_stock_items"]) == 1
    assert d["low_stock_items"][0]["size"] == "M"
    assert d["low_stock_items"][0]["stock"] == 2
    assert d["daily"]["low_stock_count"] == 1


# TC-04
def test_messages_per_channel(client):
    h = signup(client)
    add_message(client, h, channel="facebook")
    add_message(client, h, channel="facebook")
    add_message(client, h, channel="instagram")
    d = summary(client, h)
    assert d["messages_by_channel"] == {"shop": 0, "facebook": 2, "instagram": 1}
    assert d["totals"]["messages"] == 3


# TC-05
def test_replies_are_not_counted_as_enquiries(client):
    h = signup(client)
    m = add_message(client, h)
    client.post(f"/messages/{m['id']}/reply", headers=h, json={"text": "yes"})
    assert summary(client, h)["messages_by_channel"]["facebook"] == 1


# TC-06
def test_orders_by_status_and_stock_restore(client):
    h = signup(client)
    p = add_product(client, h, stocks=(10, 10))
    m = add_message(client, h, p["id"])
    o = add_order(client, h, m["id"], p["variants"][0]["id"], qty=3)
    d = summary(client, h)
    assert d["orders_by_status"]["Pending"] == 1
    assert d["products"][0]["total_stock"] == 17          # 10 - 3 + 10

    client.patch(f"/orders/{o['id']}/status", headers=h, json={"status": "Cancelled"})
    d = summary(client, h)
    assert d["orders_by_status"]["Cancelled"] == 1
    assert d["orders_by_status"]["Pending"] == 0
    assert d["products"][0]["total_stock"] == 20          # stock restored


# TC-07
def test_enquiries_and_orders_per_product(client):
    h = signup(client)
    suit = add_product(client, h, title="Suit")
    shawl = add_product(client, h, title="Shawl")
    m1 = add_message(client, h, suit["id"])
    add_message(client, h, suit["id"])
    add_message(client, h, shawl["id"])
    add_order(client, h, m1["id"], suit["variants"][1]["id"])
    perf = {r["title"]: r for r in summary(client, h)["products_performance"]}
    assert perf["Suit"] == {"title": "Suit", "enquiries": 2, "orders": 1}
    assert perf["Shawl"] == {"title": "Shawl", "enquiries": 1, "orders": 0}


# TC-08
def test_daily_summary_and_cod_amount(client):
    h = signup(client)
    p = add_product(client, h, price=1000, stocks=(20, 20))
    v = p["variants"][1]["id"]
    m1, m2, m3 = (add_message(client, h, p["id"]) for _ in range(3))
    add_order(client, h, m1["id"], v, qty=2)               # 2000 pending
    add_order(client, h, m2["id"], v, qty=1)               # 1000 pending
    o3 = add_order(client, h, m3["id"], v, qty=1)          # 1000 -> delivered
    client.patch(f"/orders/{o3['id']}/status", headers=h, json={"status": "Delivered"})
    daily = summary(client, h)["daily"]
    assert daily["orders_today"] == 3
    assert daily["cod_to_collect"] == 3000                 # delivered order excluded
    assert daily["sales_today"] == 4000


# TC-09
def test_vendor_data_is_separate(client):
    h1 = signup(client, "a@test.com", "Shop A")
    h2 = signup(client, "b@test.com", "Shop B")
    p = add_product(client, h1)
    m = add_message(client, h1, p["id"])
    add_order(client, h1, m["id"], p["variants"][1]["id"])
    d2 = summary(client, h2)
    assert d2["totals"] == {"products": 0, "orders": 0, "messages": 0}
    assert d2["shop_link"] == "/business/shop-b"
