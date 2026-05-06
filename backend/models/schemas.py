from enum import Enum
from pydantic import BaseModel


class CheckStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    FLAG = "FLAG"


class Severity(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class Confidence(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class Verdict(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    HOLD = "HOLD"


class Recommendation(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    HOLD = "HOLD"
    PARTIAL = "PARTIAL"


class PassOneStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"


class SupplementStatus(str, Enum):
    RETURNED = "RETURNED"
    PASS_ONE_COMPLETE = "PASS_ONE_COMPLETE"
    UNDER_QUERY = "UNDER_QUERY"
    PASS_TWO_COMPLETE = "PASS_TWO_COMPLETE"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class PassOneResult(BaseModel):
    status: PassOneStatus
    has_signature: bool
    has_signature_date: bool
    has_written_instruction_reference: bool
    has_sequential_reference: bool
    has_project_contract_number: bool
    has_countersignature_block: bool
    missing_items: list[str]
    return_notice: str


class CheckResult(BaseModel):
    status: CheckStatus
    notes: str
    checklist_section: str


class DayworkCheck(BaseModel):
    check_name: str
    status: CheckStatus
    notes: str
    severity: Severity | None = None


class ProvisionalDayworkSummary(BaseModel):
    daywork_detected: bool
    contract_has_provisional_provision: bool | None = None
    provisional_allowance_amount: float | None = None
    provisional_allowance_currency: str | None = None
    daywork_claimed_this_supplement: float = 0.0
    daywork_claimed_all_supplements: float = 0.0
    percentage_of_allowance_consumed: float | None = None
    percentage_of_supplement_total: float = 0.0
    percentage_of_contract_value: float = 0.0
    individual_checks: list[DayworkCheck] = []
    checks_failed: int = 0
    overall_daywork_risk: Severity = Severity.LOW
    risk_summary: str = ""


class Checks(BaseModel):
    document_completeness: CheckResult
    prior_authorization: CheckResult
    scope_verification: CheckResult
    quantity_verification: CheckResult
    rates_verification: CheckResult
    duplicate_claim: CheckResult
    arithmetic: CheckResult
    extension_of_time: CheckResult
    third_party_costs: CheckResult
    red_flag_triggers: CheckResult
    provisional_daywork_check: CheckResult


class RedFlag(BaseModel):
    flag: str
    clause_reference: str
    checklist_section: str
    severity: Severity
    confidence: Confidence
    recommended_action: str
    is_section_j_trigger: bool


class LineItem(BaseModel):
    position: str
    description: str
    claimed_amount: float
    verdict: Verdict
    reason: str
    checklist_section_failed: str | None = None


class FinancialSummary(BaseModel):
    claimed_total: float
    disputed_amount: float
    approvable_amount: float
    conditional_amount: float
    retention_applicable: float
    net_payable: float


class CumulativeItem(BaseModel):
    boq_position: str
    description: str
    original_boq_quantity: float
    original_boq_unit: str
    sum_supplement_quantities: float
    total_quantity: float
    percentage_increase: float
    exceeds_25_percent_threshold: bool


class SupplementReport(BaseModel):
    supplement_number: str
    claimed_total: float
    pass_one: PassOneResult
    checks: Checks
    red_flags: list[RedFlag]
    line_items: list[LineItem]
    financial_summary: FinancialSummary
    cumulative_register: list[CumulativeItem]
    overall_recommendation: Recommendation
    recommendation_reasoning: str
    patterns_detected: list[str]
    query_letter: str
    section_j_triggers_found: list[str]
    cumulative_supplements_as_pct_of_contract: float
    approaching_10_pct_threshold: bool
    provisional_daywork: ProvisionalDayworkSummary


class ArithmeticWarning(BaseModel):
    position: str
    claimed_amount: float
    expected_amount: float
    difference: float


class AnalysisResponse(BaseModel):
    report: SupplementReport
    arithmetic_warnings: list[ArithmeticWarning]
    supplement_index: int
    analysis_timestamp: str
    pass_one_failed: bool
    current_status: SupplementStatus


class ContractDetails(BaseModel):
    project_name: str | None = None
    project_location: str | None = None
    contract_number: str | None = None
    contract_date: str | None = None
    client_name: str | None = None
    general_contractor: str | None = None
    subcontractor: str | None = None
    contract_value_net: float | None = None
    contract_value_gross: float | None = None
    vat_rate: float | None = None
    currency: str = "CHF"
    contract_start_date: str | None = None
    contract_end_date: str | None = None
    governing_law: str | None = None
    contract_standard: str | None = None
    retention_percentage: float | None = None
    defects_liability_period: str | None = None
    liquidated_damages_rate: str | None = None
    boq_sections: list[str] = []
    total_boq_items: int | None = None
    confidence: str = "LOW"


class UploadResponse(BaseModel):
    status: str
    contract_pages: int
    boq_pages: int
    contract_word_count: int
    boq_word_count: int
    contract_details: ContractDetails


class SessionStatus(BaseModel):
    contract_loaded: bool
    boq_loaded: bool
    supplements_analysed: int
    total_claimed: float
    total_approved: float
    cumulative_pct_of_contract: float
    ready: bool
    contract_details: ContractDetails | None = None


class PMDecision(BaseModel):
    supplement_index: int
    decision: Verdict
    notes: str
    pass_number: int
    timestamp: str


class SupplementSummary(BaseModel):
    supplement_index: int
    supplement_number: str
    claimed_total: float
    overall_recommendation: Recommendation
    current_status: SupplementStatus
    analysis_timestamp: str
    pass_one_failed: bool
    pm_decision: PMDecision | None = None
