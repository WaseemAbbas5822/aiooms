"""Test cases for the platform admin area.

Run from the backend folder:  pytest tests -v
"""
import models
from test_dashboard import (  # noqa: F401  (client is a pytest fixture)
    TestingSession,
    add_message,
    add_order,
    add_product,
    client,
    signup,
)


def make_admin(client, email="admin@test.com"):
    h = signup(client, email, "Admin Shop")
    db = TestingSession()
    db.query(models.Vendor).filter_by(email=email).first().role = "admin"
    db.commit()
    db.close()
    return h


def vendor_id(client, h):
    return client.get("/auth/me", headers=h).json()["id"]


# TC-A1
def test_admin_routes_need_login(client):
    assert client.get("/admin/overview").status_code == 401
    assert client.get("/admin/vendors").status_code == 401


# TC-A2
def test_normal_vendor_cannot_open_admin(client):
    h = signup(client, "v@test.com", "Vendor Shop")
    assert client.get("/admin/overview", headers=h).status_code == 403
    assert client.get("/admin/vendors", headers=h).status_code == 403


# TC-A3
def test_overview_counts_platform_totals(client):
    admin = make_admin(client)
    a = signup(client, "a@test.com", "Shop A")
    signup(client, "b@test.com", "Shop B")
    p = add_product(client, a, price=1000, stocks=(2, 10))          # M is low stock
    m1 = add_message(client, a, p["id"], channel="facebook")
    add_message(client, a, p["id"], channel="instagram")
    add_order(client, a, m1["id"], p["variants"][1]["id"], qty=2)   # sales 2000
    d = client.get("/admin/overview", headers=admin).json()
    assert d["vendors"]["total"] == 2            # admin is not counted as a vendor
    assert d["vendors"]["active"] == 2
    assert d["vendors"]["suspended"] == 0
    assert d["vendors"]["new_today"] == 2
    assert d["totals"] == {"products": 1, "orders": 1, "messages": 2, "sales": 2000}
    assert d["orders_by_status"]["Pending"] == 1
    assert d["messages_by_channel"] == {"shop": 0, "facebook": 1, "instagram": 1}
    assert d["low_stock_items"] == 1


# TC-A4
def test_vendor_list_has_counts_and_search(client):
    admin = make_admin(client)
    a = signup(client, "a@test.com", "Lahore Boutique")
    signup(client, "b@test.com", "Karachi Store")
    p = add_product(client, a, price=500, stocks=(5, 5))
    m = add_message(client, a, p["id"])
    add_order(client, a, m["id"], p["variants"][0]["id"], qty=2)
    rows = client.get("/admin/vendors", headers=admin).json()
    assert {r["shop_name"] for r in rows} == {"Lahore Boutique", "Karachi Store"}
    lahore = next(r for r in rows if r["shop_name"] == "Lahore Boutique")
    assert (lahore["products"], lahore["orders"], lahore["messages"], lahore["sales"]) == (1, 1, 1, 1000)
    assert lahore["facebook_connected"] is False
    found = client.get("/admin/vendors?search=karachi", headers=admin).json()
    assert [r["shop_name"] for r in found] == ["Karachi Store"]


# TC-A5
def test_suspend_blocks_login_token_and_public_shop(client):
    admin = make_admin(client)
    v = signup(client, "v@test.com", "Vendor Shop")
    vid = vendor_id(client, v)
    assert client.get("/shops/vendor-shop").status_code == 200

    r = client.patch(f"/admin/vendors/{vid}/active", headers=admin, json={"is_active": False})
    assert r.status_code == 200 and r.json()["is_active"] is False

    login = client.post("/auth/login", data={"username": "v@test.com", "password": "secret123"})
    assert login.status_code == 403                                   # cannot log in
    assert client.get("/products", headers=v).status_code == 401      # old token stops working
    assert client.get("/shops/vendor-shop").status_code == 404        # shop page hidden
    d = client.get("/admin/overview", headers=admin).json()
    assert d["vendors"]["suspended"] == 1 and d["vendors"]["active"] == 0


# TC-A6
def test_reactivate_restores_access(client):
    admin = make_admin(client)
    v = signup(client, "v@test.com", "Vendor Shop")
    vid = vendor_id(client, v)
    client.patch(f"/admin/vendors/{vid}/active", headers=admin, json={"is_active": False})
    client.patch(f"/admin/vendors/{vid}/active", headers=admin, json={"is_active": True})
    login = client.post("/auth/login", data={"username": "v@test.com", "password": "secret123"})
    assert login.status_code == 200
    assert client.get("/shops/vendor-shop").status_code == 200


# TC-A7
def test_admin_cannot_be_suspended_and_unknown_vendor(client):
    admin = make_admin(client)
    admin_id = vendor_id(client, admin)
    r = client.patch(f"/admin/vendors/{admin_id}/active", headers=admin, json={"is_active": False})
    assert r.status_code == 400
    r = client.patch("/admin/vendors/9999/active", headers=admin, json={"is_active": False})
    assert r.status_code == 404


# TC-A8
def test_vendor_cannot_suspend_others(client):
    a = signup(client, "a@test.com", "Shop A")
    b = signup(client, "b@test.com", "Shop B")
    r = client.patch(f"/admin/vendors/{vendor_id(client, b)}/active", headers=a, json={"is_active": False})
    assert r.status_code == 403
