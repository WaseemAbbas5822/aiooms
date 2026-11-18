import os
import re
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
TOKEN_HOURS = 24

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")

app = FastAPI(title="AIOOMS API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Schemas ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    shop_name: str = Field(min_length=1)


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


# ---------- Routes ----------
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
    
    # ---------- Products and variants (Feature 2) ----------
from typing import List


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
    