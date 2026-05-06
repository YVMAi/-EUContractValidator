import { useState } from 'react'
import type { AnalysisResponse, PMDecision, Verdict } from '../types/supplement'
import { saveDecision } from '../utils/apiClient'
import { formatCHF } from '../utils/arithmeticVerifier'

interface Props {
  analysis: AnalysisResponse
  onDecisionSaved: (decision: PMDecision) => void
}

const SECTION_K_ITEMS = [
  'All Pass 2 commercial queries formally resolved in writing',
  'Revised drawings / instructions physically attached and filed',
  'Joint site measurement signed by both parties',
  'Retention percentage applied',
  'KPI / Bonus-Malus provisions assessed',
  "Contractor's signed daywork sheets all countersigned",
  'GC countersignature physically in place on supplement document',
  'Approved amount formally recorded in contract sum register',
  'Supplement incorporated into contract by written amendment',
]

export default function PaymentGate({ analysis, onDecisionSaved }: Props) {
  const [checked, setChecked] = useState<boolean[]>(SECTION_K_ITEMS.map(() => false))
  const [decision, setDecision] = useState<Verdict | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<PMDecision | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revising, setRevising] = useState(false)

  const allChecked = checked.every(Boolean)
  const canSave = allChecked && decision !== null && notes.trim().length > 0
  const retention = analysis.report.financial_summary.retention_applicable

  function toggle(i: number) {
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  async function handleSave() {
    if (!decision || !canSave) return
    setSaving(true)
    setError(null)
    const dec: PMDecision = {
      supplement_index: analysis.supplement_index,
      decision,
      notes,
      pass_number: 3,
      timestamp: new Date().toISOString(),
    }
    try {
      await saveDecision(analysis.supplement_index, dec)
      setSaved(dec)
      onDecisionSaved(dec)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save decision')
    } finally {
      setSaving(false)
    }
  }

  if (saved && !revising) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-green-800 font-bold text-lg">PM Decision Saved</h3>
          </div>
          <p className="text-green-700 text-sm">
            Decision: <strong>{saved.decision}</strong> · {new Date(saved.timestamp).toLocaleString()}
          </p>
          {saved.notes && <p className="text-green-600 text-sm mt-1 italic">"{saved.notes}"</p>}
        </div>
        <button
          onClick={() => setRevising(true)}
          className="text-sm text-blue-600 hover:underline"
        >
          Revise Decision
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-[#0f172a] mb-1">Pass 3 — Payment Gate</h3>
        <p className="text-sm text-gray-500">All items must be confirmed before payment can be released.</p>
      </div>

      {/* Section K Checklist */}
      <div className="space-y-2">
        {SECTION_K_ITEMS.map((item, i) => {
          const isRetention = item.includes('Retention')
          return (
            <label
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors
                ${checked[i] ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}
            >
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
                className="mt-0.5 w-4 h-4 accent-green-600 flex-shrink-0"
              />
              <span className="text-sm text-[#0f172a]">
                {item}
                {isRetention && retention > 0 && (
                  <span className="ml-2 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    {formatCHF(retention)}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>

      {/* Decision buttons */}
      <div>
        <p className="text-sm font-semibold text-[#0f172a] mb-3">PM Decision</p>
        <div className="flex gap-3 flex-wrap">
          {([
            { v: 'APPROVE' as Verdict, label: '✓ Approve', active: 'bg-green-600 text-white', inactive: 'bg-green-50 text-green-700 border border-green-200' },
            { v: 'REJECT' as Verdict, label: '✗ Reject', active: 'bg-red-600 text-white', inactive: 'bg-red-50 text-red-700 border border-red-200' },
            { v: 'HOLD' as Verdict, label: '⏸ Hold', active: 'bg-orange-500 text-white', inactive: 'bg-orange-50 text-orange-700 border border-orange-200' },
          ] as const).map(btn => (
            <button
              key={btn.v}
              onClick={() => setDecision(btn.v)}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all
                ${decision === btn.v ? btn.active : btn.inactive}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-[#0f172a] mb-2">
          PM Notes <span className="text-red-500">*</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Record your decision rationale, conditions, or instructions..."
          rows={4}
          className="w-full border border-[#e2e8f0] rounded-lg p-3 text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all
          ${canSave && !saving
            ? 'bg-[#1e3a5f] text-white hover:bg-[#162d4a]'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
      >
        {saving ? 'Saving...' : 'Save Decision & Release Payment'}
      </button>

      {!allChecked && (
        <p className="text-xs text-gray-400 text-center">
          Complete all {SECTION_K_ITEMS.length} checklist items to enable payment release.
        </p>
      )}
    </div>
  )
}
