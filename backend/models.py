from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    shop_name = Column(String, nullable=False)
    shop_slug = Column(String, unique=True, index=True, nullable=False)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    price = Column(Float, nullable=False)
    image_url = Column(String, default="")
    low_stock_level = Column(Integer, default=5)
    variants = relationship(
        "Variant", back_populates="product", cascade="all, delete-orphan"
    )


class Variant(Base):
    __tablename__ = "variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    size = Column(String, default="")
    colour = Column(String, default="")
    stock = Column(Integer, default=0)
    product = relationship("Product", back_populates="variants")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    customer_name = Column(String, nullable=False)
    customer_contact = Column(String, default="")
    channel = Column(String, default="shop")  # shop, facebook, instagram
    direction = Column(String, default="in")  # in = customer, out = vendor
    text = Column(String, nullable=False)
    page_id = Column(String, nullable=True)  # Facebook page the message came through
    created_at = Column(DateTime(timezone=True), default=utcnow)

    product = relationship("Product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    variant_id = Column(Integer, nullable=True)
    customer_name = Column(String, nullable=False)
    customer_contact = Column(String, default="")
    product_title = Column(String, nullable=False)
    variant_label = Column(String, default="")
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    status = Column(String, default="Pending")
    stock_restored = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class ChannelAccount(Base):
    __tablename__ = "channel_accounts"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    channel = Column(String, default="facebook")
    page_id = Column(String, unique=True, index=True, nullable=False)
    access_token = Column(String, nullable=False)