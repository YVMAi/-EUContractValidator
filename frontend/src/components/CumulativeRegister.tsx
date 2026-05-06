import { useEffect, useState } from 'react'
import { getCumulativeRegister } from '../utils/apiClient'
import type { CumulativeItem } from '../types/supplement'
import { formatCHF, formatPct } from '../utils/arithmeticVerifier'

interface Props {
  supplementCount: number
  totalClaimed: number
  contractValue: number
}

export default function CumulativeRegister({ supplementCount, totalClaimed, contractValue }: Props) {
  const [items, setItems] = useState<CumulativeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pctOfContract = contractValue > 0 ? (totalClaimed / contractValue * 100) : 0
  const approaching10 = pctOfContract >= 8

  useEffect(() => {
    setLoading(true)
    getCumulativeRegister()
      .then(setItems)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load register'))
      .finally(() => setLoading(false))
  }, [supplementCount])

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div>
        <h2 className="text-lg font-bold text-[#0f172a] mb-4">Cumulative Quantity Register</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Supplements</p>
            <p className="text-2xl font-bold text-[#0f172a]">{supplementCount}</p>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Claimed</p>
            <p className="text-xl font-bold text-[#0f172a]">{formatCHF(totalClaimed)}</p>
          </div>
          <div className={`border rounded-xl p-4 ${approaching10 ? 'bg-orange-50 border-orange-200' : 'bg-white border-[#e2e8f0]'}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">% of Contract</p>
            <p className={`text-2xl font-bold ${approaching10 ? 'text-orange-600' : 'text-[#0f172a]'}`}>
              {formatPct(pctOfContract)}
            </p>
          </div>
        </div>

        {approaching10 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-orange-500 text-lg">⚠</span>
            <p className="text-sm text-orange-800 font-medium">
              Cumulative supplements now {formatPct(pctOfContract)} of contract value.
              Contract-level review recommended.
            </p>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      ) : items.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
          No items in cumulative register yet. Analyse a supplement to populate.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e2e8f0]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#e2e8f0]">
                {['BOQ Pos', 'Description', 'Original Qty', 'Unit', 'Supplements Total', 'Grand Total', '% Increase', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {items.map((item, i) => (
                <tr key={i} className={item.exceeds_25_percent_threshold ? 'bg-red-50' : 'bg-white hover:bg-gray-50'}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.boq_position}</td>
                  <td className="px-4 py-3 text-[#0f172a]">{item.description}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{item.original_boq_quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{item.original_boq_unit}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{item.sum_supplement_quantities.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0f172a]">{item.total_quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${item.exceeds_25_percent_threshold ? 'text-red-700' : 'text-gray-700'}`}>
                      {formatPct(item.percentage_increase)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.exceeds_25_percent_threshold ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                        ⚠ Indep. measurement required
                      </span>
                    ) : (
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Within threshold</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
