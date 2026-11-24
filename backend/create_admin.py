"""Create the platform admin account (or promote an existing account).

Run from the backend folder with the venv active:   python create_admin.py
The password is typed in the terminal and never stored in a file.
"""
import getpass

import bcrypt
from sqlalchemy.orm import Session

import models
from database import engine

models.Base.metadata.create_all(bind=engine)

email = input("Admin email: ").strip().lower()
if not email:
    raise SystemExit("Email is required.")

with Session(engine) as db:
    existing = db.query(models.Vendor).filter_by(email=email).first()
    if existing:
        existing.role = "admin"
        existing.is_active = True
        db.commit()
        print(f"Existing account {email} is now an admin.")
        raise SystemExit(0)

    password = getpass.getpass("Admin password (6 to 72 characters): ")
    if not 6 <= len(password) <= 72:
        raise SystemExit("Password must be 6 to 72 characters.")

    slug, n = "aiooms-admin", 1
    while db.query(models.Vendor).filter_by(shop_slug=slug).first():
        n += 1
        slug = f"aiooms-admin-{n}"

    db.add(
        models.Vendor(
            name="Platform Admin",
            email=email,
            password_hash=bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
            shop_name="AIOOMS Admin",
            shop_slug=slug,
            role="admin",
            is_active=True,
        )
    )
    db.commit()
    print(f"Admin account created: {email}")
