import json
from pydantic import ValidationError
from backend.models.schemas import SupplementReport

_VALID_STATUSES = {"PASS", "FAIL", "FLAG"}
_NA_VARIANTS = {"N/A", "NOT APPLICABLE", "NOT_APPLICABLE", "NA", "N/A", ""}

_DAYWORK_DEFAULT = {
    "daywork_detected": False,
    "daywork_claimed_this_supplement": 0.0,
    "daywork_claimed_all_supplements": 0.0,
    "percentage_of_supplement_total": 0.0,
    "percentage_of_contract_value": 0.0,
    "individual_checks": [],
    "checks_failed": 0,
    "overall_daywork_risk": "LOW",
    "risk_summary": "Daywork analysis not available",
}


def _coerce_status(section_value: dict) -> None:
    """Coerce a single check dict's status field in-place."""
    if not isinstance(section_value, dict) or "status" not in section_value:
        return
    raw = str(section_value["status"]).strip()
    upper = raw.upper().replace("-", "_")
    if upper in _VALID_STATUSES:
        section_value["status"] = upper
        return
    if upper in {v.upper() for v in _NA_VARIANTS} or not raw:
        section_value["status"] = "PASS"
        section_value["notes"] = (
            "Not applicable to this supplement. " +
            section_value.get("notes", "")
        ).strip()
    else:
        section_value["status"] = "FLAG"
        section_value["notes"] = (
            f"Review required (original value: {raw}). " +
            section_value.get("notes", "")
        ).strip()


def sanitise_check_statuses(data: dict) -> dict:
    """Coerce invalid check status values before Pydantic validation.
    Covers all fields in checks{} including provisional_daywork_check,
    and also sanitises individual_checks inside provisional_daywork.
    """
    # Sanitise all check result fields inside "checks"
    if "checks" in data:
        for section_value in data["checks"].values():
            _coerce_status(section_value)

    # Null-safety: inject default provisional_daywork if missing or null
    if not data.get("provisional_daywork"):
        data["provisional_daywork"] = dict(_DAYWORK_DEFAULT)
    else:
        dw = data["provisional_daywork"]
        # Sanitise each individual_check status
        for check in dw.get("individual_checks", []):
            if isinstance(check, dict):
                _coerce_status(check)
        # Sanitise overall_daywork_risk
        risk = str(dw.get("overall_daywork_risk", "LOW")).strip().upper()
        if risk not in {"HIGH", "MEDIUM", "LOW"}:
            dw["overall_daywork_risk"] = "LOW"
        else:
            dw["overall_daywork_risk"] = risk

    return data


def validate_report(raw_json: str) -> SupplementReport:
    """Parse, sanitise, and validate raw JSON string into SupplementReport."""
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON from Gemini: {e}") from e

    data = sanitise_check_statuses(data)

    try:
        return SupplementReport.model_validate(data)
    except ValidationError as e:
        field_errors = []
        for err in e.errors():
            loc = " -> ".join(str(x) for x in err["loc"])
            field_errors.append(f"  {loc}: {err['msg']}")
        raise ValueError(
            "Gemini response failed schema validation:\n" + "\n".join(field_errors)
        ) from e
