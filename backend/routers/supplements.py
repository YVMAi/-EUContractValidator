from datetime import datetime, timezone
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from backend.models.schemas import (
    AnalysisResponse,
    CumulativeItem,
    PassOneResult,
    PassOneStatus,
    PMDecision,
    Recommendation,
    RedFlag,
    Severity,
    Confidence,
    SupplementReport,
    SupplementStatus,
    SupplementSummary,
)
from backend.services.arithmetic_verifier import verify_arithmetic
from backend.services.gemini_client import analyse_supplement
from backend.services.json_validator import validate_report
from backend.services.pass_one_checker import run_pass_one
from backend.services.pdf_parser import extract_text

router = APIRouter()


def _make_empty_report(supplement_number: str, pass_one: PassOneResult) -> SupplementReport:
    """Build a minimal SupplementReport for Pass 1 failures (no Gemini call)."""
    from backend.models.schemas import (
        CheckResult, CheckStatus, Checks, FinancialSummary, ProvisionalDayworkSummary,
    )

    empty_check = CheckResult(status=CheckStatus.FAIL, notes="Pass 1 failed — analysis not run", checklist_section="N/A")
    na_check = CheckResult(status=CheckStatus.PASS, notes="Pass 1 failed — daywork analysis not run", checklist_section="Section K - Provisional Daywork")
    checks = Checks(
        document_completeness=empty_check,
        prior_authorization=empty_check,
        scope_verification=empty_check,
        quantity_verification=empty_check,
        rates_verification=empty_check,
        duplicate_claim=empty_check,
        arithmetic=empty_check,
        extension_of_time=empty_check,
        third_party_costs=empty_check,
        red_flag_triggers=empty_check,
        provisional_daywork_check=na_check,
    )
    fs = FinancialSummary(
        claimed_total=0.0,
        disputed_amount=0.0,
        approvable_amount=0.0,
        conditional_amount=0.0,
        retention_applicable=0.0,
        net_payable=0.0,
    )
    empty_daywork = ProvisionalDayworkSummary(
        daywork_detected=False,
        risk_summary="Pass 1 failed — daywork analysis not run",
    )
    return SupplementReport(
        supplement_number=supplement_number,
        claimed_total=0.0,
        pass_one=pass_one,
        checks=checks,
        red_flags=[],
        line_items=[],
        financial_summary=fs,
        cumulative_register=[],
        overall_recommendation=Recommendation.REJECT,
        recommendation_reasoning="Document returned at Pass 1 — incomplete submission.",
        patterns_detected=[],
        query_letter="",
        section_j_triggers_found=[],
        cumulative_supplements_as_pct_of_contract=0.0,
        approaching_10_pct_threshold=False,
        provisional_daywork=empty_daywork,
    )


def _build_pass_one_red_flags(pass_one: PassOneResult) -> list[RedFlag]:
    """Convert failed Pass 1 checks into HIGH severity red flags for Gemini-bypassed reports."""
    flag_map = [
        (
            not pass_one.has_signature,
            "No contractor signature found on document",
            "Contract General Conditions — Authorised Signatures",
        ),
        (
            not pass_one.has_signature_date,
            "Signature date absent or not identifiable",
            "Contract General Conditions — Document Dating Requirements",
        ),
        (
            not pass_one.has_written_instruction_reference,
            "No written instruction reference (Change Order / Site Instruction / Drawing No.) found",
            "Contract Clause — Prior Written Instructions (Section B)",
        ),
        (
            not pass_one.has_sequential_reference,
            "No unique sequential supplement reference number present",
            "Contract Administration — Supplement Numbering Protocol",
        ),
        (
            not pass_one.has_project_contract_number,
            "Project name and/or contract number not stated on document face",
            "Contract General Conditions — Document Identification",
        ),
        (
            not pass_one.has_countersignature_block,
            "Countersignature block absent — GC/PM approval section missing",
            "Contract General Conditions — Countersignature Requirements",
        ),
    ]

    flags: list[RedFlag] = []
    for failed, flag_text, clause in flag_map:
        if failed:
            flags.append(RedFlag(
                flag=flag_text,
                clause_reference=clause,
                checklist_section="Section A — Document Completeness",
                severity=Severity.HIGH,
                confidence=Confidence.HIGH,
                recommended_action=(
                    "Return document to contractor and request correction before payment processing. "
                    "Do not approve any amounts until this formality deficiency is resolved."
                ),
                is_section_j_trigger=False,
            ))
    return flags


def _update_cumulative_register(state, new_items: list[CumulativeItem]) -> None:
    """Merge new cumulative items into app-level register."""
    register: dict = getattr(state, "cumulative_register", {})
    for item in new_items:
        key = item.boq_position
        if key in register:
            existing = register[key]
            existing["sum_supplement_quantities"] += item.sum_supplement_quantities
            total = existing["original_boq_quantity"] + existing["sum_supplement_quantities"]
            existing["total_quantity"] = total
            orig = existing["original_boq_quantity"]
            existing["percentage_increase"] = (
                ((total - orig) / orig * 100) if orig > 0 else 0.0
            )
            existing["exceeds_25_percent_threshold"] = (
                existing["percentage_increase"] > 25.0
            )
        else:
            register[key] = item.model_dump()
    state.cumulative_register = register


@router.post("/analyse-supplement", response_model=AnalysisResponse)
async def analyse_supplement_endpoint(
    request: Request,
    supplement_pdf: UploadFile = File(...),
    bypass_pass_one: bool = Form(False),
):
    state = request.app.state
    contract_text = getattr(state, "contract_text", None)
    boq_text = getattr(state, "boq_text", None)

    if not contract_text or not boq_text:
        raise HTTPException(
            status_code=400,
            detail="Contract and BOQ must be uploaded before analysing supplements",
        )

    supplement_bytes = await supplement_pdf.read()
    try:
        supplement_text, _ = extract_text(supplement_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Supplement PDF error: {e}")

    # Pass 1 — always runs first, no Gemini
    pass_one_result = run_pass_one(supplement_text)
    timestamp = datetime.now(timezone.utc).isoformat()

    supplement_count = getattr(state, "supplement_count", 0) + 1
    state.supplement_count = supplement_count
    supplement_number = f"SUPP-{supplement_count:03d}"

    # Return early only if Pass 1 failed AND bypass not requested
    if pass_one_result.status == PassOneStatus.FAIL and not bypass_pass_one:
        report = _make_empty_report(supplement_number, pass_one_result)
        result = AnalysisResponse(
            report=report,
            arithmetic_warnings=[],
            supplement_index=supplement_count - 1,
            analysis_timestamp=timestamp,
            pass_one_failed=True,
            current_status=SupplementStatus.RETURNED,
        )
        summary = SupplementSummary(
            supplement_index=supplement_count - 1,
            supplement_number=supplement_number,
            claimed_total=0.0,
            overall_recommendation=Recommendation.REJECT,
            current_status=SupplementStatus.RETURNED,
            analysis_timestamp=timestamp,
            pass_one_failed=True,
        )
        if not hasattr(state, "supplement_reports"):
            state.supplement_reports = []
        if not hasattr(state, "supplement_summaries"):
            state.supplement_summaries = []
        state.supplement_reports.append(result)
        state.supplement_summaries.append(summary)
        return result

    # Pass 2 — Gemini analysis
    # If bypass_pass_one, include the Pass 1 failure context in the Gemini prompt
    supplement_history = getattr(state, "supplement_history", [])
    contract_value = getattr(state, "contract_value", 0.0)

    pass_one_context: str | None = None
    if bypass_pass_one and pass_one_result.status == PassOneStatus.FAIL:
        missing = "\n".join(f"  - {m}" for m in pass_one_result.missing_items)
        pass_one_context = (
            f"NOTE: This supplement was submitted for analysis despite FAILING Pass 1 checks. "
            f"The following formality deficiencies were detected and must be reflected as "
            f"HIGH severity red flags in Section A of your report:\n{missing}"
        )

    try:
        raw_json = analyse_supplement(
            contract_text=contract_text,
            boq_text=boq_text,
            supplement_text=supplement_text,
            supplement_history=supplement_history,
            contract_value=contract_value,
            pass_one_context=pass_one_context,
        )
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=502, detail=f"Gemini analysis failed: {e}")

    try:
        validated_report = validate_report(raw_json)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Report validation failed: {e}")

    # Inject Pass 1 failure red flags when bypass was used
    extra_red_flags: list[RedFlag] = []
    if bypass_pass_one and pass_one_result.status == PassOneStatus.FAIL:
        extra_red_flags = _build_pass_one_red_flags(pass_one_result)

    merged_red_flags = extra_red_flags + list(validated_report.red_flags)

    validated_report = validated_report.model_copy(
        update={
            "supplement_number": supplement_number,
            "pass_one": pass_one_result,
            "red_flags": merged_red_flags,
        }
    )

    arithmetic_warnings = verify_arithmetic(validated_report)

    _update_cumulative_register(state, validated_report.cumulative_register)

    if not hasattr(state, "total_claimed"):
        state.total_claimed = 0.0
    state.total_claimed += validated_report.claimed_total

    history_entry = (
        f"Supplement {supplement_number}: claimed CHF {validated_report.claimed_total:,.2f}, "
        f"recommendation={validated_report.overall_recommendation.value}, "
        f"flags={len(validated_report.red_flags)}, "
        f"pass_one_bypassed={bypass_pass_one}"
    )
    if not hasattr(state, "supplement_history"):
        state.supplement_history = []
    state.supplement_history.append(history_entry)

    pass_one_failed = pass_one_result.status == PassOneStatus.FAIL

    result = AnalysisResponse(
        report=validated_report,
        arithmetic_warnings=arithmetic_warnings,
        supplement_index=supplement_count - 1,
        analysis_timestamp=timestamp,
        pass_one_failed=pass_one_failed,
        current_status=SupplementStatus.PASS_ONE_COMPLETE,
    )

    summary = SupplementSummary(
        supplement_index=supplement_count - 1,
        supplement_number=supplement_number,
        claimed_total=validated_report.claimed_total,
        overall_recommendation=validated_report.overall_recommendation,
        current_status=SupplementStatus.PASS_ONE_COMPLETE,
        analysis_timestamp=timestamp,
        pass_one_failed=pass_one_failed,
    )

    if not hasattr(state, "supplement_reports"):
        state.supplement_reports = []
    if not hasattr(state, "supplement_summaries"):
        state.supplement_summaries = []
    state.supplement_reports.append(result)
    state.supplement_summaries.append(summary)

    return result


@router.post("/supplements/{index}/decision")
async def save_decision(index: int, decision: PMDecision, request: Request):
    state = request.app.state
    summaries: list[SupplementSummary] = getattr(state, "supplement_summaries", [])
    reports: list[AnalysisResponse] = getattr(state, "supplement_reports", [])

    if index < 0 or index >= len(summaries):
        raise HTTPException(status_code=404, detail=f"Supplement index {index} not found")

    from backend.models.schemas import Verdict
    status_map = {
        Verdict.APPROVE: SupplementStatus.APPROVED,
        Verdict.REJECT: SupplementStatus.REJECTED,
        Verdict.HOLD: SupplementStatus.UNDER_QUERY,
    }

    new_status = status_map.get(decision.decision, SupplementStatus.UNDER_QUERY)
    summaries[index] = summaries[index].model_copy(
        update={"current_status": new_status, "pm_decision": decision}
    )
    reports[index] = reports[index].model_copy(update={"current_status": new_status})

    if decision.decision == Verdict.APPROVE:
        if not hasattr(state, "total_approved"):
            state.total_approved = 0.0
        state.total_approved += summaries[index].claimed_total

    return {"status": "ok", "supplement_index": index, "new_status": new_status.value}


@router.get("/supplements/history")
async def get_history(request: Request):
    state = request.app.state
    summaries = getattr(state, "supplement_summaries", [])
    return [s.model_dump() for s in summaries]


@router.get("/cumulative-register")
async def get_cumulative_register(request: Request):
    state = request.app.state
    register = getattr(state, "cumulative_register", {})
    return list(register.values())
