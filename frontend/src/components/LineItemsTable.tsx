import { useState } from 'react'
import type { ArithmeticWarning, LineItem, Verdict } from '../types/supplement'
import { formatCHF } from '../utils/arithmeticVerifier'

interface Props {
  items: LineItem[]
  arithmeticWarnings?: ArithmeticWarning[]
}

type Filter = 'ALL' | Verdict

function verdictStyle(v: Verdict) {
  switch (v) {
    case 'APPROVE': return 'bg-green-100 text-green-800'
    case 'REJECT': return 'bg-red-100 text-red-700'
    case 'HOLD': return 'bg-orange-100 text-orange-800'
  }
}

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Approve', value: 'APPROVE' },
  { label: 'Reject', value: 'REJECT' },
  { label: 'Hold', value: 'HOLD' },
]

export default function LineItemsTable({ items, arithmeticWarnings = [] }: Props) {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const warnedPositions = new Set(arithmeticWarnings.map(w => w.position))

  const filtered = items
    .filter(i => filter === 'ALL' || i.verdict === filter)
    .sort((a, b) => {
      const cmp = a.position.localeCompare(b.position)
      return sortDir === 'asc' ? cmp : -cmp
    })

  const total = filtered.reduce((s, i) => s + i.claimed_amount, 0)

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${filter === f.value
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">
              ({f.value === 'ALL' ? items.length : items.filter(i => i.verdict === f.value).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#e2e8f0]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-[#e2e8f0]">
              <th
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none"
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              >
                Pos {sortDir === 'asc' ? '↑' : '↓'}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Claimed</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Verdict</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Section Failed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {filtered.map((item, i) => {
              const hasWarning = warnedPositions.has(item.position)
              return (
                <tr key={i} className={`${hasWarning ? 'bg-yellow-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                    {item.position}
                    {hasWarning && (
                      <span className="ml-1.5 text-yellow-600" title="Arithmetic warning">⚠</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#0f172a]">{item.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#0f172a] whitespace-nowrap">
                    {formatCHF(item.claimed_amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${verdictStyle(item.verdict)}`}>
                      {item.verdict}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.reason}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.checklist_section_failed ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-[#e2e8f0]">
              <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-600">
                Total ({filtered.length} items)
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#0f172a]">
                {formatCHF(total)}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-gray-400 text-sm">No items match this filter</div>
        )}
      </div>
    </div>
  )
}
