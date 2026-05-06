import type { FinancialSummary as FS } from '../types/supplement'
import { formatCHF, formatPct } from '../utils/arithmeticVerifier'

interface Props {
  summary: FS
}

export default function FinancialSummaryView({ summary }: Props) {
  const total = summary.claimed_total || 1

  const cards = [
    { label: 'Total Claimed', amount: summary.claimed_total, color: 'bg-gray-50 border-gray-200', text: 'text-[#0f172a]' },
    { label: 'Disputed', amount: summary.disputed_amount, color: 'bg-red-50 border-red-200', text: 'text-red-700' },
    { label: 'Approvable', amount: summary.approvable_amount, color: 'bg-green-50 border-green-200', text: 'text-green-700' },
    { label: 'Conditional', amount: summary.conditional_amount, color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  ]

  const barSegments = [
    { pct: summary.approvable_amount / total * 100, color: 'bg-green-500' },
    { pct: summary.conditional_amount / total * 100, color: 'bg-amber-400' },
    { pct: summary.disputed_amount / total * 100, color: 'bg-red-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className={`border rounded-xl p-4 ${card.color}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{card.label}</p>
            <p className={`text-xl font-bold ${card.text}`}>{formatCHF(card.amount)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatPct(card.amount / total * 100)} of total</p>
          </div>
        ))}
      </div>

      {/* Stacked bar */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Breakdown</p>
        <div className="h-6 flex rounded-lg overflow-hidden bg-gray-100">
          {barSegments.map((seg, i) => (
            <div
              key={i}
              className={`${seg.color} transition-all`}
              style={{ width: `${Math.max(0, Math.min(100, seg.pct))}%` }}
              title={`${formatPct(seg.pct)}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2">
          {[
            { color: 'bg-green-500', label: 'Approvable' },
            { color: 'bg-amber-400', label: 'Conditional' },
            { color: 'bg-red-500', label: 'Disputed' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-3 h-3 rounded-sm ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Retention & net payable */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-sm text-gray-600">Retention Applicable</span>
          <span className="text-sm font-semibold text-[#0f172a]">{formatCHF(summary.retention_applicable)}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-sm font-semibold text-[#0f172a]">Net Payable (after retention)</span>
          <span className="text-lg font-bold text-[#1e3a5f]">{formatCHF(summary.net_payable)}</span>
        </div>
      </div>
    </div>
  )
}
