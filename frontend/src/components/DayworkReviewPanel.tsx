import type { ProvisionalDayworkSummary } from '../types/supplement'
import { formatCHF } from '../utils/arithmeticVerifier'

interface Props {
  provisional_daywork: ProvisionalDayworkSummary
}

function statusBadge(status: string) {
  switch (status) {
    case 'PASS': return 'bg-green-100 text-green-800'
    case 'FAIL': return 'bg-red-100 text-red-700'
    case 'FLAG': return 'bg-amber-100 text-amber-800'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function severityBadge(severity: string | null) {
  switch (severity) {
    case 'HIGH': return 'bg-red-100 text-red-700'
    case 'MEDIUM': return 'bg-amber-100 text-amber-800'
    case 'LOW': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-500'
  }
}

function pctColor(value: number, low: number, high: number) {
  if (value >= high) return 'text-red-600'
  if (value >= low) return 'text-amber-600'
  return 'text-green-600'
}

export default function DayworkReviewPanel({ provisional_daywork: dw }: Props) {
  // Section 1 — No daywork
  if (!dw.daywork_detected) {
    return (
      <div className="p-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-green-500 text-lg">✓</span>
          <p className="text-sm font-semibold text-green-800">
            No daywork claims detected in this supplement
          </p>
        </div>
      </div>
    )
  }

  const riskBanner = {
    HIGH: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', title: '⚡ High Risk Daywork Claims Detected' },
    MEDIUM: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', title: '⚠ Daywork Claims Require Review' },
    LOW: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', title: '✓ Daywork Claims Appear Acceptable' },
  }[dw.overall_daywork_risk]

  const passedCount = dw.individual_checks.filter(c => c.status === 'PASS').length
  const totalChecks = dw.individual_checks.length

  // Allowance maths
  const remaining =
    dw.provisional_allowance_amount != null
      ? dw.provisional_allowance_amount - dw.daywork_claimed_all_supplements
      : null

  const pctConsumed = dw.percentage_of_allowance_consumed ?? 0
  const progressColor =
    pctConsumed >= 100 ? 'bg-red-500' : pctConsumed >= 75 ? 'bg-amber-400' : 'bg-green-500'
  const progressWidth = Math.min(pctConsumed, 100)

  return (
    <div className="space-y-5">
      {/* Section 1 — Risk banner */}
      <div className={`border rounded-xl p-4 ${riskBanner.bg}`}>
        <p className={`text-sm font-bold ${riskBanner.text}`}>{riskBanner.title}</p>
        {dw.risk_summary && (
          <p className={`text-xs mt-1 leading-relaxed ${riskBanner.text} opacity-80`}>{dw.risk_summary}</p>
        )}
      </div>

      {/* Section 2 — Provisional Allowance Status */}
      {dw.contract_has_provisional_provision === true && dw.provisional_allowance_amount != null && (
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-[#0f172a]">Provisional Allowance Status</h3>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Allowance: <span className="font-semibold text-gray-700">{formatCHF(dw.provisional_allowance_amount)}</span></span>
            <span className={`font-bold ${pctConsumed >= 100 ? 'text-red-600' : pctConsumed >= 75 ? 'text-amber-600' : 'text-green-600'}`}>
              {pctConsumed.toFixed(1)}% consumed
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${progressColor}`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Claimed this supplement</span>
              <span className="font-semibold">{formatCHF(dw.daywork_claimed_this_supplement)}</span>
            </div>
            <div className="flex justify-between">
              <span>Claimed all supplements</span>
              <span className="font-semibold">{formatCHF(dw.daywork_claimed_all_supplements)}</span>
            </div>
            <div className="flex justify-between">
              <span>Remaining allowance</span>
              <span className={`font-semibold ${remaining != null && remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {remaining != null ? formatCHF(remaining) : '—'}
              </span>
            </div>
          </div>
          {pctConsumed >= 100 && remaining != null && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <span className="text-red-500 flex-shrink-0">⚠</span>
              <p className="text-xs font-semibold text-red-700">
                Allowance EXCEEDED by {formatCHF(Math.abs(remaining))}
              </p>
            </div>
          )}
        </div>
      )}

      {dw.contract_has_provisional_provision === false && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-red-800 mb-1">No Provisional Daywork Provision Found</h3>
          <p className="text-xs text-red-700 leading-relaxed">
            This contract does not include a provisional daywork allowance. All daywork claims lack
            an explicit contractual framework and require specific prior written authorisation for
            each instance.
          </p>
        </div>
      )}

      {dw.contract_has_provisional_provision === null && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-amber-800 mb-1">Provisional Provision — Unconfirmed</h3>
          <p className="text-xs text-amber-700 leading-relaxed">
            Could not confirm whether this contract includes a provisional daywork provision.
            Verify manually before approving any daywork.
          </p>
        </div>
      )}

      {/* Section 3 — Individual Checks Table */}
      {dw.individual_checks.length > 0 && (
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0f172a]">
              {passedCount} of {totalChecks} checks passed
            </h3>
            {dw.checks_failed > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                {dw.checks_failed} failed
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
                  <th className="text-left px-4 py-2 font-semibold">Check</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">Severity</th>
                  <th className="text-left px-3 py-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {dw.individual_checks.map((check, i) => (
                  <tr
                    key={i}
                    className={`border-t border-gray-100
                      ${check.status === 'FAIL' ? 'bg-red-50 border-l-2 border-l-red-400' : ''}
                      ${check.status === 'FLAG' ? 'bg-amber-50' : ''}
                      ${check.status === 'PASS' ? 'bg-white' : ''}
                    `}
                  >
                    <td className="px-4 py-2.5 font-medium text-[#0f172a] max-w-[180px]">
                      {check.check_name}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(check.status)}`}>
                        {check.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {check.severity && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${severityBadge(check.severity)}`}>
                          {check.severity}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 leading-relaxed max-w-[300px]">
                      {check.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4 — Proportion indicators */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-2">Daywork as % of this supplement</p>
          <p className={`text-3xl font-bold ${pctColor(dw.percentage_of_supplement_total, 25, 50)}`}>
            {dw.percentage_of_supplement_total.toFixed(1)}%
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {dw.percentage_of_supplement_total >= 50
              ? '⚠ Over 50% threshold'
              : dw.percentage_of_supplement_total >= 25
              ? '⚠ Over 25% — approaching threshold'
              : '✓ Within normal range'}
          </p>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-2">Cumulative daywork as % of contract value</p>
          <p className={`text-3xl font-bold ${pctColor(dw.percentage_of_contract_value, 2, 5)}`}>
            {dw.percentage_of_contract_value.toFixed(2)}%
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {dw.percentage_of_contract_value >= 5
              ? '⚠ Over 5% — HIGH threshold breached'
              : dw.percentage_of_contract_value >= 2
              ? '⚠ Over 2% — MEDIUM threshold'
              : '✓ Within normal range'}
          </p>
        </div>
      </div>
    </div>
  )
}
