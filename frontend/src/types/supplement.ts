export type CheckStatus = 'PASS' | 'FAIL' | 'FLAG'
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW'
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type Verdict = 'APPROVE' | 'REJECT' | 'HOLD'
export type Recommendation = 'APPROVE' | 'REJECT' | 'HOLD' | 'PARTIAL'
export type PassOneStatus = 'PASS' | 'FAIL'

export type SupplementStatus =
  | 'RETURNED'
  | 'PASS_ONE_COMPLETE'
  | 'UNDER_QUERY'
  | 'PASS_TWO_COMPLETE'
  | 'APPROVED'
  | 'REJECTED'

export interface PassOneResult {
  status: PassOneStatus
  has_signature: boolean
  has_signature_date: boolean
  has_written_instruction_reference: boolean
  has_sequential_reference: boolean
  has_project_contract_number: boolean
  has_countersignature_block: boolean
  missing_items: string[]
  return_notice: string
}

export interface CheckResult {
  status: CheckStatus
  notes: string
  checklist_section: string
}

export interface DayworkCheck {
  check_name: string
  status: 'PASS' | 'FAIL' | 'FLAG'
  notes: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | null
}

export interface ProvisionalDayworkSummary {
  daywork_detected: boolean
  contract_has_provisional_provision: boolean | null
  provisional_allowance_amount: number | null
  provisional_allowance_currency: string | null
  daywork_claimed_this_supplement: number
  daywork_claimed_all_supplements: number
  percentage_of_allowance_consumed: number | null
  percentage_of_supplement_total: number
  percentage_of_contract_value: number
  individual_checks: DayworkCheck[]
  checks_failed: number
  overall_daywork_risk: 'HIGH' | 'MEDIUM' | 'LOW'
  risk_summary: string
}

export interface Checks {
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
}

export interface RedFlag {
  flag: string
  clause_reference: string
  checklist_section: string
  severity: Severity
  confidence: Confidence
  recommended_action: string
  is_section_j_trigger: boolean
}

export interface LineItem {
  position: string
  description: string
  claimed_amount: number
  verdict: Verdict
  reason: string
  checklist_section_failed: string | null
}

export interface FinancialSummary {
  claimed_total: number
  disputed_amount: number
  approvable_amount: number
  conditional_amount: number
  retention_applicable: number
  net_payable: number
}

export interface CumulativeItem {
  boq_position: string
  description: string
  original_boq_quantity: number
  original_boq_unit: string
  sum_supplement_quantities: number
  total_quantity: number
  percentage_increase: number
  exceeds_25_percent_threshold: boolean
}

export interface SupplementReport {
  supplement_number: string
  claimed_total: number
  pass_one: PassOneResult
  checks: Checks
  red_flags: RedFlag[]
  line_items: LineItem[]
  financial_summary: FinancialSummary
  cumulative_register: CumulativeItem[]
  overall_recommendation: Recommendation
  recommendation_reasoning: string
  patterns_detected: string[]
  query_letter: string
  section_j_triggers_found: string[]
  cumulative_supplements_as_pct_of_contract: number
  approaching_10_pct_threshold: boolean
  provisional_daywork: ProvisionalDayworkSummary
}

export interface ArithmeticWarning {
  position: string
  claimed_amount: number
  expected_amount: number
  difference: number
}

export interface AnalysisResponse {
  report: SupplementReport
  arithmetic_warnings: ArithmeticWarning[]
  supplement_index: number
  analysis_timestamp: string
  pass_one_failed: boolean
  current_status: SupplementStatus
}

export interface ContractDetails {
  project_name: string | null
  project_location: string | null
  contract_number: string | null
  contract_date: string | null
  client_name: string | null
  general_contractor: string | null
  subcontractor: string | null
  contract_value_net: number | null
  contract_value_gross: number | null
  vat_rate: number | null
  currency: string
  contract_start_date: string | null
  contract_end_date: string | null
  governing_law: string | null
  contract_standard: string | null
  retention_percentage: number | null
  defects_liability_period: string | null
  liquidated_damages_rate: string | null
  boq_sections: string[]
  total_boq_items: number | null
  confidence: string
}

export interface UploadResponse {
  status: string
  contract_pages: number
  boq_pages: number
  contract_word_count: number
  boq_word_count: number
  contract_details: ContractDetails
}

export interface SessionStatus {
  contract_loaded: boolean
  boq_loaded: boolean
  supplements_analysed: number
  total_claimed: number
  total_approved: number
  cumulative_pct_of_contract: number
  ready: boolean
  contract_details?: ContractDetails | null
}

export interface PMDecision {
  supplement_index: number
  decision: Verdict
  notes: string
  pass_number: number
  timestamp: string
}

export interface SupplementSummary {
  supplement_index: number
  supplement_number: string
  claimed_total: number
  overall_recommendation: Recommendation
  current_status: SupplementStatus
  analysis_timestamp: string
  pass_one_failed: boolean
  pm_decision: PMDecision | null
}
