import re
from backend.models.schemas import PassOneResult, PassOneStatus

# Date: DD/MM/YYYY, MM-DD-YY, Month DD YYYY, YYYY-MM-DD
DATE_PATTERN = re.compile(
    r"\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}"
    r"|\d{4}[\/\-]\d{2}[\/\-]\d{2}"
    r"|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}"
    r"|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})\b",
    re.IGNORECASE,
)

SIGNATURE_PATTERN = re.compile(
    r"(?:signed\s+by|signature\s*:|authorized\s+by|authorised\s+by"
    r"|contractors?\s+(?:signature|representative)"
    r"|for\s+and\s+on\s+behalf\s+of"
    r"|executed\s+by|submitted\s+by|prepared\s+by)",
    re.IGNORECASE,
)

INSTRUCTION_PATTERN = re.compile(
    r"(?:(?:site\s+)?instruction\s+(?:no\.?|number|ref\.?|#)\s*[\w\-\/]+"
    r"|change\s+order\s+(?:no\.?|#)\s*[\w\-\/]+"
    r"|variation\s+order\s+(?:no\.?|#)\s*[\w\-\/]+"
    r"|daywork\s+order\s+(?:no\.?|#)\s*[\w\-\/]+"
    r"|architects?\s+instruction\s+(?:no\.?|#)?\s*[\w\-\/]+"
    r"|drawing\s+(?:no\.?|number|#)\s*[\w\-\/]+"
    r"|(?:drg|dwg)\.?\s*(?:no\.?|#)?\s*[\w\-\/]+"
    r"|revision\s+[A-Z0-9]+"
    r"|co\s*[-#]\s*\d+"
    r"|si\s*[-#]\s*\d+"
    r"|vo\s*[-#]\s*\d+)",
    re.IGNORECASE,
)

SEQUENTIAL_REF_PATTERN = re.compile(
    r"(?:supplement\s+(?:no\.?|#|number)\s*[\w\-\/]+"
    r"|claim\s+(?:no\.?|#|number)\s*[\w\-\/]+"
    r"|reference\s+(?:no\.?|#)?\s*[\w\-\/]+"
    r"|application\s+(?:no\.?|#)\s*[\w\-\/]+"
    r"|invoice\s+(?:no\.?|#)\s*[\w\-\/]+"
    r"|payment\s+application\s+(?:no\.?|#)\s*[\w\-\/]+"
    r"|submission\s+(?:no\.?|#)\s*[\w\-\/]+)",
    re.IGNORECASE,
)

CONTRACT_REF_PATTERN = re.compile(
    r"(?:contract\s+(?:no\.?|number|#|ref)\s*[\w\-\/]+"
    r"|project\s+(?:no\.?|number|name|#)\s*[\w\-\/]+"
    r"|project\s*:\s*\S+"
    r"|contract\s*:\s*\S+)",
    re.IGNORECASE,
)

COUNTERSIGNATURE_PATTERN = re.compile(
    r"(?:countersign(?:ed|ature)?"
    r"|approved\s+by"
    r"|gc\s+(?:signature|representative|approval)"
    r"|general\s+contractor\s+(?:signature|approval)"
    r"|clients?\s+(?:representative|approval|signature)"
    r"|employers?\s+(?:representative|signature)"
    r"|project\s+manager\s+(?:signature|approval)"
    r"|pm\s+(?:signature|sign-off|approval))",
    re.IGNORECASE,
)


def run_pass_one(supplement_text: str) -> PassOneResult:
    """Run Pass 1 checks on supplement text. No Gemini call."""
    text = supplement_text

    has_signature = bool(SIGNATURE_PATTERN.search(text))
    has_signature_date = bool(DATE_PATTERN.search(text)) and has_signature
    has_written_instruction_reference = bool(INSTRUCTION_PATTERN.search(text))
    has_sequential_reference = bool(SEQUENTIAL_REF_PATTERN.search(text))
    has_project_contract_number = bool(CONTRACT_REF_PATTERN.search(text))
    has_countersignature_block = bool(COUNTERSIGNATURE_PATTERN.search(text))

    missing_items = []
    if not has_signature:
        missing_items.append("Contractor signature is absent or not identifiable")
    if not has_signature_date:
        missing_items.append("Signature date is absent or not identifiable")
    if not has_written_instruction_reference:
        missing_items.append(
            "No written instruction reference (Change Order No., Site Instruction No., "
            "Drawing No., Revision, etc.) found"
        )
    if not has_sequential_reference:
        missing_items.append(
            "No unique sequential supplement/claim reference number found"
        )
    if not has_project_contract_number:
        missing_items.append("Project name and/or contract number not stated")
    if not has_countersignature_block:
        missing_items.append(
            "No countersignature block present (GC/PM approval section absent)"
        )

    overall_status = PassOneStatus.PASS if not missing_items else PassOneStatus.FAIL
    return_notice = _build_return_notice(missing_items) if missing_items else ""

    return PassOneResult(
        status=overall_status,
        has_signature=has_signature,
        has_signature_date=has_signature_date,
        has_written_instruction_reference=has_written_instruction_reference,
        has_sequential_reference=has_sequential_reference,
        has_project_contract_number=has_project_contract_number,
        has_countersignature_block=has_countersignature_block,
        missing_items=missing_items,
        return_notice=return_notice,
    )


def _build_return_notice(missing_items: list[str]) -> str:
    from datetime import date
    today = date.today().strftime("%d %B %Y")
    items_text = "\n".join(f"  {i+1}. {item}" for i, item in enumerate(missing_items))

    return (
        f"RETURN NOTICE -- SUPPLEMENT DOCUMENT INCOMPLETE\n"
        f"Date: {today}\n\n"
        f"To: Contractor Representative\n"
        f"From: Project Manager / General Contractor\n\n"
        f"Subject: Return of Supplement Document -- Incomplete Submission\n\n"
        f"Your supplement/claim document has been reviewed against the Pass 1 Document\n"
        f"Completeness & Formality requirements of the Base Contract and the Universal\n"
        f"Supplement Claim Approval Checklist (Section A & B).\n\n"
        f"The document CANNOT be accepted for commercial review as it fails the following\n"
        f"mandatory requirements:\n\n"
        f"{items_text}\n\n"
        f"CONTRACTUAL BASIS FOR RETURN:\n"
        f"Under the terms of the Base Contract, any supplement or variation claim must:\n"
        f"- Bear the contractor's authorised signature with date (Contract General Conditions)\n"
        f"- Reference the written instruction authorising the work (Clause -- Written Instructions)\n"
        f"- Carry a unique sequential reference number for tracking purposes\n"
        f"- State the project name and contract number on the face of the document\n"
        f"- Include a countersignature block for GC/PM approval\n\n"
        f"REQUIRED ACTION:\n"
        f"Please address all items listed above and resubmit. The clock for our response\n"
        f"period commences only upon receipt of a compliant document.\n\n"
        f"Documents submitted without the above will be returned without commercial review.\n\n"
        f"This return is WITHOUT PREJUDICE to any rights or obligations under the contract.\n\n"
        f"____________________________\n"
        f"Project Manager / GC Representative\n"
        f"Date: {today}\n"
    )
