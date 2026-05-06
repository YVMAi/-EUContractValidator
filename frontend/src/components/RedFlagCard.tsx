import { useState } from 'react'
import type { RedFlag } from '../types/supplement'

interface Props {
  flag: RedFlag
}

function severityStyle(s: string) {
  switch (s) {
    case 'HIGH': return { border: 'border-l-red-600', badge: 'bg-red-100 text-red-800' }
    case 'MEDIUM': return { border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-800' }
    case 'LOW': return { border: 'border-l-yellow-400', badge: 'bg-yellow-100 text-yellow-800' }
    default: return { border: 'border-l-gray-300', badge: 'bg-gray-100 text-gray-700' }
  }
}

function confidenceDots(c: string) {
  const filled = c === 'HIGH' ? 3 : c === 'MEDIUM' ? 2 : 1
  return Array.from({ length: 3 }, (_, i) => (
    <span
      key={i}
      className={`inline-block w-2 h-2 rounded-full ${i < filled ? 'bg-gray-600' : 'bg-gray-200'}`}
    />
  ))
}

export default function RedFlagCard({ flag }: Props) {
  const [expanded, setExpanded] = useState(false)
  const style = severityStyle(flag.severity)

  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${style.border} rounded-xl p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {flag.is_section_j_trigger && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 mb-2">
              ⚡ Section J Trigger
            </span>
          )}
          <p className="text-sm font-bold text-[#0f172a] leading-snug">{flag.flag}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.badge}`}>
              {flag.severity}
            </span>
            <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
              {flag.clause_reference}
            </code>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
              {flag.checklist_section}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              Confidence: <span className="flex gap-0.5 ml-1">{confidenceDots(flag.confidence)}</span>
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
          aria-label="Toggle details"
        >
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-800 mb-1">Recommended Action</p>
          <p className="text-xs text-blue-700 leading-relaxed">{flag.recommended_action}</p>
        </div>
      )}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs text-blue-600 hover:underline"
        >
          Show recommended action ↓
        </button>
      )}
    </div>
  )
}
