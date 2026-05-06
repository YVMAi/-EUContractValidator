import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.documents import router as documents_router
from backend.routers.supplements import router as supplements_router

app = FastAPI(title="ContractGuard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise in-memory state
app.state.contract_text = None
app.state.boq_text = None
app.state.contract_pages = 0
app.state.boq_pages = 0
app.state.contract_value = 0.0
app.state.supplement_history = []
app.state.supplement_reports = []
app.state.supplement_summaries = []
app.state.supplement_count = 0
app.state.cumulative_register = {}
app.state.total_claimed = 0.0
app.state.total_approved = 0.0

app.include_router(documents_router, prefix="/api")
app.include_router(supplements_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8001, reload=True)
