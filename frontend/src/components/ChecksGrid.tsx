import type { Checks, ProvisionalDayworkSummary } from '../types/supplement'
import { formatCHF } from '../utils/arithmeticVerifier'

interface Props {
  checks: Checks
  provisionalDaywork: ProvisionalDayworkSummary
  onViewDaywork?: () => void
}

const STANDARD_CHECKS: { key: keyof Omit<Checks, 'provisional_daywork_check'>; label: string; section: string }[] = [
  { key: 'document_completeness', label: 'Document Completeness', section: 'Section A' },
  { key: 'prior_authorization', label: 'Prior Authorization', section: 'Section B' },
  { key: 'scope_verification', label: 'Scope Verification', section: 'Section C' },
  { key: 'quantity_verification', label: 'Quantity Verification', section: 'Section D' },
  { key: 'rates_verification', label: 'Rates Verification', section: 'Section E' },
  { key: 'duplicate_claim', label: 'Duplicate Claim Check', section: 'Section F' },
  { key: 'arithmetic', label: 'Arithmetic Verification', section: 'Section G' },
  { key: 'extension_of_time', label: 'Extension of Time', section: 'Section H' },
  { key: 'third_party_costs', label: 'Third-Party Costs', section: 'Section I' },
  { key: 'red_flag_triggers', label: 'Red Flag Triggers', section: 'Section J' },
]

function statusStyle(status: string) {
  switch (status) {
    case 'PASS': return { badge: 'bg-green-100 text-green-800', icon: '✓', border: 'border-green-200' }
    case 'FAIL': return { badge: 'bg-red-100 text-red-700', icon: '✗', border: 'border-red-200' }
    case 'FLAG': return { badge: 'bg-amber-100 text-amber-800', icon: '⚠', border: 'border-amber-200' }
    default: return { badge: 'bg-gray-100 text-gray-600', icon: '?', border: 'border-gray-200' }
  }
}

function DayworkCard({ checks, provisionalDaywork, onViewDaywork }: Props) {
  const result = checks.provisional_daywork_check
  const { daywork_detected, overall_daywork_risk, checks_failed, daywork_claimed_this_supplement } = provisionalDaywork

  // Determine visual variant
  const isHighRisk = daywork_detected && overall_daywork_risk === 'HIGH'
  const isMediumRisk = daywork_detected && overall_daywork_risk === 'MEDIUM'
  const style = statusStyle(result.status)

  let cardClass = 'bg-white border rounded-xl p-4 '
  let leftBorder = ''
  if (isHighRisk) {
    leftBorder = 'border-l-4 border-l-red-500'
    cardClass = 'bg-white border border-red-200 rounded-xl p-4 '
  } else if (isMediumRisk) {
    leftBorder = 'border-l-4 border-l-amber-400'
    cardClass = 'bg-white border border-amber-200 rounded-xl p-4 '
  } else {
    cardClass += style.border
  }

  return (
    <div className={`${cardClass} ${leftBorder}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">SECTION K</span>
          <p className="text-sm font-semibold text-[#0f172a] mt-0.5">Provisional Daywork Check</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isHighRisk && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
              ⚡ HIGH RISK
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${style.badge}`}>
            <span>{style.icon}</span>
            {result.status}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">{result.notes}</p>

      {daywork_detected && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              <span>
                Daywork this supplement:{' '}
                <span className="font-semibold text-gray-700">{formatCHF(daywork_claimed_this_supplement)}</span>
              </span>
              <span className={`font-semibold ${checks_failed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                Checks failed: {checks_failed}
              </span>
            </div>
            {onViewDaywork && (
              <button
                onClick={onViewDaywork}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
              >
                View full daywork analysis ↓
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChecksGrid({ checks, provisionalDaywork, onViewDaywork }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {STANDARD_CHECKS.map(({ key, label, section }) => {
        const result = checks[key as keyof Checks]
        const style = statusStyle(result.status)
        return (
          <div
            key={key}
            className={`bg-white border rounded-xl p-4 ${style.border}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{section}</span>
                <p className="text-sm font-semibold text-[#0f172a] mt-0.5">{label}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${style.badge}`}>
                <span>{style.icon}</span>
                {result.status}
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{result.notes}</p>
          </div>
        )
      })}

      {/* Section K — Provisional Daywork — spans full width if odd count makes it align alone */}
      <DayworkCard
        checks={checks}
        provisionalDaywork={provisionalDaywork}
        onViewDaywork={onViewDaywork}
      />
    </div>
  )
}
