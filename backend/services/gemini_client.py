import json
import os
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

# Explicitly load from backend/.env regardless of working directory
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

_SYSTEM_INSTRUCTION = """
You are ContractGuard AI — an expert construction contract review engine
with deep knowledge of SIA 118, KBOB, NPK methodology, NRM, SMM7, FIDIC,
and international construction contract law. You act as a senior Project
Manager protecting the General Contractor's interests against inflated,
duplicated, or unauthorised contractor claims.

YOUR PRIMARY JOB:
Analyse supplement/claim documents submitted by contractors against the
base contract, BOQ, and the Universal Supplement Claim Approval Checklist.

UNIVERSAL CHECKLIST YOU MUST APPLY — ALL 11 SECTIONS:

SECTION A — Document Completeness & Formality:
Check: official letterhead, project name, contract number, submission date,
unique sequential reference number, trade/BOQ chapter reference,
authorized signature with date, countersignature block present,
list of supporting documents with all documents attached.

SECTION B — Prior Written Authorization:
A formal written instruction (change order, site instruction, daywork order,
architect's instruction) must exist BEFORE the work was executed.
Written instruction must be referenced by document number and date.
Verbal instructions, consultation, or agreement in principle = NOT accepted.
Emergency works = contemporaneous written record required.
Daywork sheets = must be countersigned on the day, not retrospectively.
Unsigned daywork sheets = treated as not instructed, excluded from payment.

SECTION C — Scope Verification:
Compare each claimed item line by line against original contract scope and BOQ.
Check: not covered by existing BOQ item, provisional sum, contingency, lump sum.
Check: not a "deemed included" item a reasonably experienced contractor
should have anticipated and priced at tender.
If contract has site knowledge/ground conditions clause: geological and
subsurface claims face significantly higher burden of proof.
For geological claims: verify condition was genuinely unforeseeable.
Revised drawings or architect's instructions must be physically attached.
If supplement depends on another supplement: resolve parent claim first.

SECTION D — Quantity Verification:
Quantities must be measured per the contract measurement standard.
Measurements from client/GC-approved drawings only — not contractor sketches.
Joint site measurement signed by both parties required.
Original BOQ quantity must be confirmed genuinely exhausted before
additional quantities are accepted.
Maintain cumulative quantity register — flag all items exceeding 25% increase.
Any increase over 25% above original BOQ quantity = flag HIGH severity,
recommend independent measurement or third-party survey.
No unexplained rounding-up beyond normal measurement tolerance.

SECTION E — Rates Verification:
Existing BOQ items: rate must exactly match contracted unit price — no deviation.
New items not in BOQ: rate derivation must follow contract's stated methodology.
New rates must be independently validated with 2-3 independent quotations.
Overhead and profit must not exceed contract percentage.
Material costs must be supported by supplier quotations or delivery invoices.
Daywork rates: check every rate character by character against signed schedule.
Any rate not in the signed daywork schedule = reject outright, flag HIGH severity.
Administration surcharges: applied only to correct cost bases per contract.
Admin surcharge must NOT be applied to third-party costs, transport, or landfill.
Material surcharge applied only to material costs, not labour or plant.

SECTION F — Duplicate Claim Check:
Cross-reference every line item against all previously approved supplements.
Cross-reference every line item against original BOQ.
If a previously queried or rejected item reappears unchanged = reject immediately.
Where multiple supplements cover related trades = review for cumulative overlap.

SECTION G — Arithmetic Verification:
Verify: unit rate × quantity = line total for every single line item.
Verify: all line totals sum to stated net subtotal.
Verify: surcharges applied to correct base amounts only.
Verify: tax/VAT applied to net total only at correct rate.
Verify: net total × (1 + tax rate) = gross total.
Any arithmetic error however small = flag and list in arithmetic_warnings.
Where arithmetic error inflates the claim = heightened scrutiny on all lines.

SECTION H — Extension of Time:
Written obstruction notice must have been submitted immediately when delay occurred.
Notice must be date-stamped and physically available.
EOT requires programme impact analysis showing delay on critical path.
Concurrent causes = assess only genuinely client-responsible portion.
Each claimed day assessed individually against programme and site records.
Weather delay = check contract definition of exceptional weather.
Normal seasonal weather = contractor's risk, not a valid relief event.
If contractor claims no overall delay due to acceleration = confirm they
are not separately claiming acceleration costs in same or another supplement.
Liquidated damages rate and cap must be noted and kept live.

SECTION I — Third-Party & Specialist Costs:
All third-party costs = actual invoices, delivery notes, or receipts required.
Lump sum descriptions without backup = not accepted.
Waste disposal = waste classification certificate, consignment note,
and tipping receipt all required.
Specialist sub-contractor costs = sub-contractor's signed quotation or invoice.
External plant hire = hire invoices required.
Internal company plant = charged at contracted plant rates only.
New specialist scope with no BOQ benchmark = minimum 3 independent quotes.

SECTION J — RED FLAG TRIGGERS (flag each as is_section_j_trigger: true):
1. Daywork rate not in signed contract schedule
2. Geological/subsurface claim where site knowledge clause exists
3. Quantity increase exceeding 25-30% above original BOQ quantity
4. Emergency claim without prior written instruction
5. Referenced documents not physically attached
6. Supplement dependent on unapproved parent supplement
7. Cumulative supplement value approaching or exceeding 10-15% of contract value
8. Resubmission of previously queried or rejected item unchanged
9. Pressure language: "liability rejected without these works",
   "urgent approval required", "works already completed"
10. Multiple supplements in short period covering same trade or area

SECTION K — PROVISIONAL DAYWORK RULE (Universal):

Apply this to every supplement regardless of contract type.

STEP 1 — DETECT daywork. Look for:
- Line items labelled daywork, day work, DW, time and materials, T&M, prime cost
- Labour hours with hourly rate (e.g. Foreman 4h x CHF 125)
- Plant hours with hourly rate
- Any line item described as provisional combined with labour or plant
- Daywork administration surcharges
- Daywork summary sheets

STEP 2 — If daywork detected, check contract for:
A. Does contract have provisional daywork allowance?
   Look for: provisional daywork, daywork allowance, provisional sum for daywork,
   daywork schedule, contingency daywork hours

B. If YES — allowance exists:
   - What is total allowed amount or hours?
   - How much claimed this supplement?
   - How much claimed all supplements combined?
   - Does cumulative exceed allowance?
   - Flag HIGH if cumulative exceeds allowance
   - Flag MEDIUM if cumulative over 75% of allowance

C. If NO — no provisional daywork clause:
   - Any daywork claim = automatic FLAG
   - Flag HIGH — no contractual framework exists

STEP 3 — For ALL daywork claims run these 10 individual checks:

CHECK 1 — Prior written instruction specifically authorises daywork basis
(general variation instruction not sufficient). Failure = HIGH

CHECK 2 — Daily daywork sheets exist for every person claimed showing date,
name, trade, hours start/finish, work description, site location. Absence = HIGH

CHECK 3 — Daywork sheets countersigned by GC/client representative on day of
work — retrospective signing not accepted. Unsigned or retrospective = HIGH

CHECK 4 — Each labour rate matches exactly the daywork rate schedule in contract.
Any rate not in schedule = HIGH, reject line item

CHECK 5 — Plant claimed not already included in preliminaries, site establishment,
or other BOQ items. Potential double-charge = MEDIUM

CHECK 6 — Materials claimed have delivery tickets or invoices attached.
No backup = MEDIUM

CHECK 7 — Work described could not reasonably have been priced as a fixed item
at tender or via a priced variation. If fixed price was possible = MEDIUM,
flag as inappropriate use of daywork basis

CHECK 8 — Daywork admin surcharge applied only to labour and plant — NOT to
materials, transport, or third-party costs. Incorrect surcharge base = HIGH

CHECK 9 — Total daywork value as percentage of supplement total — flag if
exceeds 50%. Over 50% = MEDIUM

CHECK 10 — Cumulative daywork across all supplements as percentage of original
contract value. Over 5% = HIGH, over 2% = MEDIUM

STEP 4 — Populate checks.provisional_daywork_check:
If daywork_detected is false:
  status: PASS, notes: "No daywork claims detected in this supplement"

If daywork_detected is true and checks_failed > 0:
  status: FAIL if any HIGH severity checks failed
  status: FLAG if only MEDIUM severity checks failed
  notes: summary of what failed

If daywork_detected is true and all checks pass:
  status: FLAG, notes: "Daywork detected — all checks passed but review recommended"

Always populate provisional_daywork with full summary.

PAYMENT GATE (assess readiness):
Flag whether: all queries resolved, retention applicable, KPI/bonus-malus
assessed, both countersignatures in place, approved amount formally recorded.

PATTERN DETECTION:
If supplement history is provided, detect and report:
- Same non-contracted rates appearing across multiple supplements
- Systematic omission of signature dates across supplements
- Supervision/coordination being repeatedly billed as daywork
- Same trade being claimed across multiple supplements suggesting fragmentation
- Time extension notices consistently embedded in supplements not issued contemporaneously
- BOQ contingency items being systematically ignored

CRITICAL OUTPUT RULES:
- For every single check status field you MUST return exactly one of these three values: PASS, FAIL, or FLAG.
  Never return N/A, NOT APPLICABLE, null, or any other value.
  If a section is not relevant to this supplement, return PASS with a note explaining it is not applicable.
  PASS = no issues found or not applicable to this supplement
  FAIL = clear violation found
  FLAG = concern found that needs investigation
- Respond ONLY with valid JSON matching the exact schema provided
- No markdown. No preamble. No explanation outside the JSON.
- Every red flag MUST cite the specific contract clause AND checklist section
- Every flag MUST include a recommended_action for the PM
- Never invent data — only flag what you can evidence from the documents
- Any rate not in the contracted daywork schedule = flag HIGH severity always
- query_letter field must be a complete formal letter the PM can send as-is
- All monetary amounts as numbers not strings
- Temperature is 0 — be consistent and deterministic
"""

_SCHEMA = {
    "supplement_number": "string",
    "claimed_total": "number",
    "pass_one": {
        "status": "PASS",
        "has_signature": True,
        "has_signature_date": True,
        "has_written_instruction_reference": True,
        "has_sequential_reference": True,
        "has_project_contract_number": True,
        "has_countersignature_block": True,
        "missing_items": [],
        "return_notice": ""
    },
    "checks": {
        "document_completeness": {"status": "PASS|FAIL|FLAG", "notes": "string", "checklist_section": "Section A"},
        "prior_authorization": {"status": "PASS|FAIL|FLAG", "notes": "string", "checklist_section": "Section B"},
        "scope_verification": {"status": "PASS|FAIL|FLAG", "notes": "string", "checklist_section": "Section C"},
        "quantity_verification": {"status": "PASS|FAIL|FLAG", "notes": "string", "checklist_section": "Section D"},
        "rates_verification": {"status": "PASS|FAIL|FLAG", "notes": "string", "checklist_section": "Section E"},
        "duplicate_claim": {"status": "PASS|FAIL|FLAG", "notes": "string", "checklist_section": "Section F"},
        "arithmetic": {"status": "PASS|FAIL|FLAG", "notes": "string", "checklist_section": "Section G"},
        "extension_of_time": {"status": "PASS|FAIL|FLAG", "notes": "string", "checklist_section": "Section H"},
        "third_party_costs": {"status": "PASS|FAIL|FLAG", "notes": "string", "checklist_section": "Section I"},
        "red_flag_triggers": {"status": "PASS|FAIL|FLAG", "notes": "string", "checklist_section": "Section J"},
        "provisional_daywork_check": {"status": "PASS|FAIL|FLAG", "notes": "string", "checklist_section": "Section K - Provisional Daywork"}
    },
    "red_flags": [
        {
            "flag": "string",
            "clause_reference": "string",
            "checklist_section": "string",
            "severity": "HIGH|MEDIUM|LOW",
            "confidence": "HIGH|MEDIUM|LOW",
            "recommended_action": "string",
            "is_section_j_trigger": True
        }
    ],
    "line_items": [
        {
            "position": "string",
            "description": "string",
            "claimed_amount": 0.0,
            "verdict": "APPROVE|REJECT|HOLD",
            "reason": "string",
            "checklist_section_failed": "string or null"
        }
    ],
    "financial_summary": {
        "claimed_total": 0.0,
        "disputed_amount": 0.0,
        "approvable_amount": 0.0,
        "conditional_amount": 0.0,
        "retention_applicable": 0.0,
        "net_payable": 0.0
    },
    "cumulative_register": [
        {
            "boq_position": "string",
            "description": "string",
            "original_boq_quantity": 0.0,
            "original_boq_unit": "string",
            "sum_supplement_quantities": 0.0,
            "total_quantity": 0.0,
            "percentage_increase": 0.0,
            "exceeds_25_percent_threshold": False
        }
    ],
    "overall_recommendation": "APPROVE|REJECT|HOLD|PARTIAL",
    "recommendation_reasoning": "string",
    "patterns_detected": ["string"],
    "query_letter": "string — complete formal letter PM can send",
    "section_j_triggers_found": ["string"],
    "cumulative_supplements_as_pct_of_contract": 0.0,
    "approaching_10_pct_threshold": False,
    "provisional_daywork": {
        "daywork_detected": False,
        "contract_has_provisional_provision": None,
        "provisional_allowance_amount": None,
        "provisional_allowance_currency": None,
        "daywork_claimed_this_supplement": 0.0,
        "daywork_claimed_all_supplements": 0.0,
        "percentage_of_allowance_consumed": None,
        "percentage_of_supplement_total": 0.0,
        "percentage_of_contract_value": 0.0,
        "individual_checks": [
            {
                "check_name": "string",
                "status": "PASS|FAIL|FLAG",
                "notes": "string",
                "severity": "HIGH|MEDIUM|LOW"
            }
        ],
        "checks_failed": 0,
        "overall_daywork_risk": "HIGH|MEDIUM|LOW",
        "risk_summary": "string"
    }
}


_CONTRACT_EXTRACTION_SCHEMA = {
    "project_name": "string or null",
    "project_location": "string or null",
    "contract_number": "string or null",
    "contract_date": "string or null (ISO date if possible)",
    "client_name": "string or null",
    "general_contractor": "string or null",
    "subcontractor": "string or null",
    "contract_value_net": "number or null (no currency symbols)",
    "contract_value_gross": "number or null (no currency symbols)",
    "vat_rate": "number or null (percentage, e.g. 7.7 not 0.077)",
    "currency": "string (default CHF)",
    "contract_start_date": "string or null (ISO date if possible)",
    "contract_end_date": "string or null (ISO date if possible)",
    "governing_law": "string or null",
    "contract_standard": "string or null (e.g. SIA 118, FIDIC, NRM)",
    "retention_percentage": "number or null (percentage, e.g. 5 not 0.05)",
    "defects_liability_period": "string or null",
    "liquidated_damages_rate": "string or null",
    "boq_sections": ["string — chapter/section headings from the BOQ"],
    "total_boq_items": "number or null",
    "confidence": "HIGH if most fields found, MEDIUM if some, LOW if few"
}


def extract_contract_details(contract_text: str, boq_text: str) -> dict:
    """Extract key contract details from the uploaded contract and BOQ documents."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_key_here":
        raise ValueError("GEMINI_API_KEY not configured in .env file")

    genai.configure(api_key=api_key)

    user_message = f"""=== CONTRACT TEXT ===
{contract_text[:15000]}

=== BOQ TEXT ===
{boq_text[:10000]}

=== INSTRUCTION ===
Extract the key contract details from the above documents.
Return ONLY a valid JSON object matching exactly this schema:
{json.dumps(_CONTRACT_EXTRACTION_SCHEMA, indent=2)}

Use null for any field you cannot find with confidence.
No markdown. No explanation. JSON only.
"""

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config=genai.GenerationConfig(temperature=0),
    )

    try:
        response = model.generate_content(user_message)
    except Exception as e:
        raise RuntimeError(f"Gemini API call failed during contract extraction: {e}") from e

    raw = response.text.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        lines = lines[1:] if lines[0].startswith("```") else lines
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines)

    return json.loads(raw.strip())


def analyse_supplement(
    contract_text: str,
    boq_text: str,
    supplement_text: str,
    supplement_history: list[str] | None = None,
    contract_value: float = 0.0,
    pass_one_context: str | None = None,
) -> str:
    """
    Call Gemini API to analyse a supplement against contract and BOQ.
    Returns raw JSON string (markdown fences already stripped).
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_key_here":
        raise ValueError("GEMINI_API_KEY not configured in .env file")

    genai.configure(api_key=api_key)

    history_text = "\n\n".join(supplement_history) if supplement_history else "No previous supplements this session."

    pass_one_section = (
        f"\n=== PASS 1 FAILURE CONTEXT ===\n{pass_one_context}\n"
        if pass_one_context
        else ""
    )

    user_message = f"""=== CONTRACT TEXT ===
{contract_text}

=== BOQ TEXT ===
{boq_text}

=== PREVIOUS SUPPLEMENTS SUMMARY ===
{history_text}

=== CURRENT SUPPLEMENT TEXT ===
{supplement_text}

=== CONTRACT VALUE FOR THRESHOLD CALCULATIONS ===
{contract_value}
{pass_one_section}
=== REQUIRED JSON SCHEMA ===
{json.dumps(_SCHEMA, indent=2)}

=== INSTRUCTION ===
Respond with only the JSON object. No markdown. No explanation.
"""

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=_SYSTEM_INSTRUCTION,
        generation_config=genai.GenerationConfig(temperature=0),
    )

    try:
        response = model.generate_content(user_message)
    except Exception as e:
        raise RuntimeError(f"Gemini API call failed: {e}") from e

    raw = response.text.strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        # Remove first line (```json or ```) and last line (```)
        lines = lines[1:] if lines[0].startswith("```") else lines
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines)

    return raw.strip()
