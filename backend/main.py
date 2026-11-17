from fastapi import FastAPI

app = FastAPI(title="AIOOMS API")

@app.get("/health")
def health():
    return {"status": "ok"}
