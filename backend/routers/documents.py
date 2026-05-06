from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from backend.models.schemas import ContractDetails, SessionStatus, UploadResponse
from backend.services.gemini_client import extract_contract_details
from backend.services.pdf_parser import extract_text

router = APIRouter()


@router.post("/upload-documents", response_model=UploadResponse)
async def upload_documents(
    request: Request,
    contract_pdf: UploadFile = File(...),
    boq_pdf: UploadFile = File(...),
):
    if contract_pdf.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="contract_pdf must be a PDF file")
    if boq_pdf.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="boq_pdf must be a PDF file")

    contract_bytes = await contract_pdf.read()
    boq_bytes = await boq_pdf.read()

    try:
        contract_text, contract_pages = extract_text(contract_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Contract PDF error: {e}")

    try:
        boq_text, boq_pages = extract_text(boq_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"BOQ PDF error: {e}")

    try:
        details_dict = extract_contract_details(contract_text, boq_text)
        contract_details = ContractDetails.model_validate(details_dict)
    except Exception:
        contract_details = ContractDetails(confidence="LOW")

    state = request.app.state
    state.contract_text = contract_text
    state.boq_text = boq_text
    state.contract_pages = contract_pages
    state.boq_pages = boq_pages
    state.contract_value = contract_details.contract_value_net or 0.0
    state.contract_details = contract_details

    return UploadResponse(
        status="ok",
        contract_pages=contract_pages,
        boq_pages=boq_pages,
        contract_word_count=len(contract_text.split()),
        boq_word_count=len(boq_text.split()),
        contract_details=contract_details,
    )


@router.delete("/reset-session")
async def reset_session(request: Request):
    state = request.app.state
    state.contract_text = None
    state.boq_text = None
    state.contract_pages = 0
    state.boq_pages = 0
    state.contract_value = 0.0
    state.contract_details = None
    state.supplement_reports = []
    state.total_claimed = 0.0
    state.total_approved = 0.0
    return {"status": "reset"}


@router.get("/session-status", response_model=SessionStatus)
async def get_session_status(request: Request):
    state = request.app.state
    contract_loaded = bool(getattr(state, "contract_text", None))
    boq_loaded = bool(getattr(state, "boq_text", None))
    supplements_analysed = len(getattr(state, "supplement_reports", []))
    total_claimed = getattr(state, "total_claimed", 0.0)
    total_approved = getattr(state, "total_approved", 0.0)
    contract_value = getattr(state, "contract_value", 0.0)
    contract_details = getattr(state, "contract_details", None)

    cumulative_pct = (
        (total_claimed / contract_value * 100) if contract_value > 0 else 0.0
    )

    return SessionStatus(
        contract_loaded=contract_loaded,
        boq_loaded=boq_loaded,
        supplements_analysed=supplements_analysed,
        total_claimed=total_claimed,
        total_approved=total_approved,
        cumulative_pct_of_contract=round(cumulative_pct, 2),
        ready=contract_loaded and boq_loaded,
        contract_details=contract_details,
    )
