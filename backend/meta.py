import hashlib
import hmac
import json
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

import models
from database import get_db

router = APIRouter()
GRAPH = "https://graph.facebook.com/v24.0"


def _secret() -> str:
    return os.getenv("META_APP_SECRET", "")


def _verify_token() -> str:
    return os.getenv("META_VERIFY_TOKEN", "")


@router.get("/webhook/meta")
def verify(request: Request):
    p = request.query_params
    token = _verify_token()
    if p.get("hub.mode") == "subscribe" and token and p.get("hub.verify_token") == token:
        return Response(content=p.get("hub.challenge", ""), media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")


async def _customer_name(psid: str, token: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{GRAPH}/{psid}", params={"fields": "name", "access_token": token}
            )
        if r.status_code == 200 and r.json().get("name"):
            return r.json()["name"]
    except httpx.HTTPError:
        pass
    return f"Facebook user {psid[-4:]}"


@router.post("/webhook/meta")
async def receive(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    sig = request.headers.get("X-Hub-Signature-256", "")
    expected = "sha256=" + hmac.new(_secret().encode(), raw, hashlib.sha256).hexdigest()
    if not _secret() or not hmac.compare_digest(sig, expected):
        raise HTTPException(status_code=403, detail="Bad signature")

    payload = json.loads(raw)
    if payload.get("object") != "page":
        return {"status": "ignored"}

    for entry in payload.get("entry", []):
        page_id = str(entry.get("id"))
        acct = db.query(models.ChannelAccount).filter_by(page_id=page_id).first()
        if acct is None:
            continue
        for ev in entry.get("messaging", []):
            msg = ev.get("message")
            if not msg or msg.get("is_echo"):
                continue
            psid = ev["sender"]["id"]
            prev = (
                db.query(models.Message)
                .filter_by(
                    vendor_id=acct.vendor_id,
                    channel="facebook",
                    customer_contact=psid,
                    direction="in",
                )
                .first()
            )
            name = prev.customer_name if prev else await _customer_name(psid, acct.access_token)
            db.add(
                models.Message(
                    vendor_id=acct.vendor_id,
                    customer_name=name,
                    customer_contact=psid,
                    channel="facebook",
                    page_id=page_id,
                    direction="in",
                    text=msg.get("text") or "[attachment]",
                )
            )
    db.commit()
    return {"status": "ok"}


def send_facebook_reply(db: Session, page_id: str, psid: str, text: str) -> None:
    acct = db.query(models.ChannelAccount).filter_by(page_id=page_id).first()
    if acct is None:
        raise HTTPException(status_code=400, detail="Facebook page not connected")
    r = httpx.post(
        f"{GRAPH}/me/messages",
        params={"access_token": acct.access_token},
        json={
            "recipient": {"id": psid},
            "messaging_type": "RESPONSE",
            "message": {"text": text},
        },
        timeout=15,
    )
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Facebook error: {r.text[:200]}")