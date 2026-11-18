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