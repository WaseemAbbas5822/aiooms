import os
import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from dotenv import load_dotenv

load_dotenv()

import bcrypt
import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

import meta
import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me-dev-secret-32bytes")
ALGORITHM = "HS256"
TOKEN_HOURS = 24

ORDER_STATUSES = ["Pending", "Confirmed", "Dispatched", "Delivered", "Returned", "Cancelled"]
CHANNELS = ["shop", "facebook", "instagram"]

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")

app = FastAPI(title="AIOOMS API")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):3000",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(meta.router)


# ---------- Schemas ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    shop_name: str = Field(min_length=1)


class VariantIn(BaseModel):
    size: str = ""
    colour: str = ""
    stock: int = Field(default=0, ge=0)


class ProductIn(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""
    price: float = Field(ge=0)
    image_url: str = ""
    low_stock_level: int = Field(default=5, ge=0)
    variants: List[VariantIn] = []


class CustomerMessageIn(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    customer_contact: str = Field(default="", max_length=100)
    text: str = Field(min_length=1, max_length=1000)
    product_id: Optional[int] = None


class ReplyIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class SimMessageIn(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    channel: str
    text: str = Field(min_length=1, max_length=1000)
    product_id: Optional[int] = None


class OrderIn(BaseModel):
    message_id: int
    variant_id: int
    quantity: int = Field(ge=1)


class StatusIn(BaseModel):
    status: str


class ConnectIn(BaseModel):
    page_id: str
    access_token: str


# ---------- Helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def make_slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def make_token(vendor_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)
    payload = {"sub": str(vendor_id), "exp": expires}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def current_vendor(
    token: str = Depends(oauth2), db: Session = Depends(get_db)
) -> models.Vendor:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        vendor_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    vendor = db.get(models.Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=401, detail="Vendor not found")
    return vendor


def product_out(p: models.Product) -> dict:
    return {
        "id": p.id,
        "title": p.title,
        "description": p.description,
        "price": p.price,
        "image_url": p.image_url,
        "low_stock_level": p.low_stock_level,
        "variants": [
            {"id": v.id, "size": v.size, "colour": v.colour, "stock": v.stock}
            for v in p.variants
        ],
        "low_stock": any(v.stock <= p.low_stock_level for v in p.variants),
    }


def own_product(db: Session, vendor: models.Vendor, product_id: int) -> models.Product:
    p = db.get(models.Product, product_id)
    if p is None or p.vendor_id != vendor.id:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


def message_out(m: models.Message) -> dict:
    product = None
    if m.product is not None:
        product = {
            "id": m.product.id,
            "title": m.product.title,
            "variants": [
                {"id": v.id, "size": v.size, "colour": v.colour, "stock": v.stock}
                for v in m.product.variants
            ],
        }
    return {
        "id": m.id,
        "customer_name": m.customer_name,
        "customer_contact": m.customer_contact,
        "channel": m.channel,
        "direction": m.direction,
        "text": m.text,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "product": product,
    }


def order_out(o: models.Order) -> dict:
    return {
        "id": o.id,
        "customer_name": o.customer_name,
        "customer_contact": o.customer_contact,
        "product_title": o.product_title,
        "variant_label": o.variant_label,
        "quantity": o.quantity,
        "unit_price": o.unit_price,
        "total": o.unit_price * o.quantity,
        "status": o.status,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


# ---------- Routes: basic and auth (Feature 1) ----------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/register", status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(models.Vendor).filter_by(email=email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    base = make_slug(data.shop_name) or "shop"
    slug, n = base, 1
    while db.query(models.Vendor).filter_by(shop_slug=slug).first():
        n += 1
        slug = f"{base}-{n}"

    vendor = models.Vendor(
        name=data.name,
        email=email,
        password_hash=hash_password(data.password),
        shop_name=data.shop_name,
        shop_slug=slug,
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return {"id": vendor.id, "shop_slug": vendor.shop_slug}


@app.post("/auth/login")
def login(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    vendor = db.query(models.Vendor).filter_by(email=form.username.lower()).first()
    if vendor is None or not verify_password(form.password, vendor.password_hash):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return {"access_token": make_token(vendor.id), "token_type": "bearer"}


@app.get("/auth/me")
def me(vendor: models.Vendor = Depends(current_vendor)):
    return {
        "id": vendor.id,
        "name": vendor.name,
        "email": vendor.email,
        "shop_name": vendor.shop_name,
        "shop_slug": vendor.shop_slug,
    }


# ---------- Routes: products and variants (Feature 2) ----------
@app.get("/products")
def list_products(
    vendor: models.Vendor = Depends(current_vendor), db: Session = Depends(get_db)
):
    items = db.query(models.Product).filter_by(vendor_id=vendor.id).all()
    return [product_out(p) for p in items]


@app.post("/products", status_code=201)
def create_product(
    data: ProductIn,
    vendor: models.Vendor = Depends(current_vendor),
    db: Session = Depends(get_db),
):
    p = models.Product(
        vendor_id=vendor.id,
        title=data.title,
        description=data.description,
        price=data.price,
        image_url=data.image_url,
        low_stock_level=data.low_stock_level,
        variants=[models.Variant(**v.model_dump()) for v in data.variants],
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return product_out(p)


@app.put("/products/{product_id}")
def update_product(
    product_id: int,
    data: ProductIn,
    vendor: models.Vendor = Depends(current_vendor),
    db: Session = Depends(get_db),
):
    p = own_product(db, vendor, product_id)
    p.title = data.title
    p.description = data.description
    p.price = data.price
    p.image_url = data.image_url
    p.low_stock_level = data.low_stock_level
    p.variants = [models.Variant(**v.model_dump()) for v in data.variants]
    db.commit()
    db.refresh(p)
    return product_out(p)


@app.delete("/products/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    vendor: models.Vendor = Depends(current_vendor),
    db: Session = Depends(get_db),
):
    p = own_product(db, vendor, product_id)
    db.delete(p)
    db.commit()


# ---------- Routes: public shop (Feature 3) ----------
@app.get("/shops/{slug}")
def public_shop(slug: str, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter_by(shop_slug=slug).first()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Shop not found")
    products = db.query(models.Product).filter_by(vendor_id=vendor.id).all()
    return {
        "shop_name": vendor.shop_name,
        "shop_slug": vendor.shop_slug,
        "products": [
            {
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "price": p.price,
                "image_url": p.image_url,
                "variants": [
                    {"id": v.id, "size": v.size, "colour": v.colour}
                    for v in p.variants
                    if v.stock > 0
                ],
            }
            for p in products
        ],
    }


@app.post("/shops/{slug}/messages", status_code=201)
def customer_message(
    slug: str, data: CustomerMessageIn, db: Session = Depends(get_db)
):
    vendor = db.query(models.Vendor).filter_by(shop_slug=slug).first()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Shop not found")
    if data.product_id is not None:
        product = db.get(models.Product, data.product_id)
        if product is None or product.vendor_id != vendor.id:
            raise HTTPException(status_code=400, detail="Invalid product")
    msg = models.Message(
        vendor_id=vendor.id,
        product_id=data.product_id,
        customer_name=data.customer_name,
        customer_contact=data.customer_contact,
        text=data.text,
        channel="shop",
        direction="in",
    )
    db.add(msg)
    db.commit()
    return {"status": "sent"}


# ---------- Routes: inbox and orders (Feature 4) ----------
@app.get("/messages")
def list_messages(
    vendor: models.Vendor = Depends(current_vendor), db: Session = Depends(get_db)
):
    items = (
        db.query(models.Message)
        .filter_by(vendor_id=vendor.id)
        .order_by(models.Message.created_at.desc())
        .all()
    )
    return [message_out(m) for m in items]


@app.post("/messages/simulate", status_code=201)
def simulate_message(
    data: SimMessageIn,
    vendor: models.Vendor = Depends(current_vendor),
    db: Session = Depends(get_db),
):
    if data.channel not in CHANNELS:
        raise HTTPException(status_code=400, detail="Invalid channel")
    if data.product_id is not None:
        own_product(db, vendor, data.product_id)
    m = models.Message(
        vendor_id=vendor.id,
        product_id=data.product_id,
        customer_name=data.customer_name,
        text=data.text,
        channel=data.channel,
        direction="in",
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return message_out(m)


@app.post("/messages/{message_id}/reply", status_code=201)
def reply_message(
    message_id: int,
    data: ReplyIn,
    vendor: models.Vendor = Depends(current_vendor),
    db: Session = Depends(get_db),
):
    src = db.get(models.Message, message_id)
    if src is None or src.vendor_id != vendor.id:
        raise HTTPException(status_code=404, detail="Message not found")
    if src.channel == "facebook" and src.customer_contact and src.page_id:
        meta.send_facebook_reply(db, src.page_id, src.customer_contact, data.text)
    m = models.Message(
        vendor_id=vendor.id,
        product_id=src.product_id,
        customer_name=src.customer_name,
        customer_contact=src.customer_contact,
        channel=src.channel,
        page_id=src.page_id,
        direction="out",
        text=data.text,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return message_out(m)


@app.get("/orders")
def list_orders(
    vendor: models.Vendor = Depends(current_vendor), db: Session = Depends(get_db)
):
    items = (
        db.query(models.Order)
        .filter_by(vendor_id=vendor.id)
        .order_by(models.Order.created_at.desc())
        .all()
    )
    return [order_out(o) for o in items]


@app.post("/orders", status_code=201)
def create_order(
    data: OrderIn,
    vendor: models.Vendor = Depends(current_vendor),
    db: Session = Depends(get_db),
):
    msg = db.get(models.Message, data.message_id)
    if msg is None or msg.vendor_id != vendor.id or msg.direction != "in":
        raise HTTPException(status_code=404, detail="Message not found")
    variant = db.get(models.Variant, data.variant_id)
    if variant is None or variant.product.vendor_id != vendor.id:
        raise HTTPException(status_code=404, detail="Variant not found")
    if variant.stock < data.quantity:
        raise HTTPException(status_code=400, detail=f"Only {variant.stock} in stock")
    variant.stock -= data.quantity
    order = models.Order(
        vendor_id=vendor.id,
        message_id=msg.id,
        variant_id=variant.id,
        customer_name=msg.customer_name,
        customer_contact=msg.customer_contact,
        product_title=variant.product.title,
        variant_label=f"{variant.size or '-'} / {variant.colour or '-'}",
        quantity=data.quantity,
        unit_price=variant.product.price,
        status="Pending",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order_out(order)


@app.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    data: StatusIn,
    vendor: models.Vendor = Depends(current_vendor),
    db: Session = Depends(get_db),
):
    if data.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    order = db.get(models.Order, order_id)
    if order is None or order.vendor_id != vendor.id:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.stock_restored and data.status not in ("Returned", "Cancelled"):
        raise HTTPException(
            status_code=400, detail="Cancelled/returned orders cannot be reopened"
        )
    if data.status in ("Returned", "Cancelled") and not order.stock_restored:
        variant = db.get(models.Variant, order.variant_id) if order.variant_id else None
        if variant is not None:
            variant.stock += order.quantity
        order.stock_restored = True
    order.status = data.status
    db.commit()
    db.refresh(order)
    return order_out(order)


# ---------- Routes: connect Facebook pages (Meta) ----------
@app.post("/channels/facebook", status_code=201)
def connect_facebook(
    data: ConnectIn,
    vendor: models.Vendor = Depends(current_vendor),
    db: Session = Depends(get_db),
):
    acct = db.query(models.ChannelAccount).filter_by(page_id=data.page_id).first()
    if acct:
        acct.vendor_id = vendor.id
        acct.access_token = data.access_token
    else:
        db.add(
            models.ChannelAccount(
                vendor_id=vendor.id, page_id=data.page_id, access_token=data.access_token
            )
        )
    db.commit()
    return {"status": "connected"}