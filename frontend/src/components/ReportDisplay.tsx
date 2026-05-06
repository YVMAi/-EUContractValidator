import { useState } from 'react'
import type { AnalysisResponse, PMDecision, RedFlag } from '../types/supplement'
import { formatCHF } from '../utils/arithmeticVerifier'
import ChecksGrid from './ChecksGrid'
import DayworkReviewPanel from './DayworkReviewPanel'
import FinancialSummaryView from './FinancialSummary'
import LineItemsTable from './LineItemsTable'
import PassOneGate from './PassOneGate'
import PaymentGate from './PaymentGate'
import RedFlagCard from './RedFlagCard'

interface Props {
  analysis: AnalysisResponse
  onRetry: () => void
  onDecisionSaved: (decision: PMDecision) => void
}

type Tab = 'analysis' | 'daywork' | 'line-items' | 'financial' | 'query-letter' | 'payment-gate'

function recommendationStyle(r: string) {
  switch (r) {
    case 'APPROVE': return 'bg-green-100 text-green-800'
    case 'REJECT': return 'bg-red-100 text-red-700'
    case 'HOLD': return 'bg-orange-100 text-orange-800'
    case 'PARTIAL': return 'bg-amber-100 text-amber-800'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function statusStyle(s: string) {
  switch (s) {
    case 'RETURNED': return 'bg-red-100 text-red-700'
    case 'PASS_ONE_COMPLETE': return 'bg-blue-100 text-blue-800'
    case 'UNDER_QUERY': return 'bg-orange-100 text-orange-800'
    case 'PASS_TWO_COMPLETE': return 'bg-purple-100 text-purple-800'
    case 'APPROVED': return 'bg-green-100 text-green-800'
    case 'REJECTED': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportDisplay({ analysis, onRetry, onDecisionSaved }: Props) {
  const [tab, setTab] = useState<Tab>('analysis')
  const { report, arithmetic_warnings, pass_one_failed, current_status } = analysis

  // Only block entirely when returned (no Gemini ran). Bypass results have a full report.
  if (pass_one_failed && current_status === 'RETURNED') {
    return (
      <div className="p-6">
        <PassOneGate passOne={report.pass_one} onRetry={onRetry} />
      </div>
    )
  }

  const bypassedPassOne = pass_one_failed && current_status !== 'RETURNED'
  const sectionJTriggers = report.section_j_triggers_found ?? []
  const dw = report.provisional_daywork

  // Build daywork tab badge
  function DayworkTabLabel() {
    if (!dw.daywork_detected) {
      return <span>Daywork Review</span>
    }
    if (dw.overall_daywork_risk === 'HIGH') {
      return (
        <span className="flex items-center gap-1.5">
          Daywork Review
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
            {dw.checks_failed} Failed
          </span>
        </span>
      )
    }
    if (dw.overall_daywork_risk === 'MEDIUM') {
      return (
        <span className="flex items-center gap-1.5">
          Daywork Review
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
            {dw.checks_failed} Flags
          </span>
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1.5">
        Daywork Review
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">✓</span>
      </span>
    )
  }

  // Inject Section K red flags from failed/flagged individual checks
  const sectionKRedFlags: RedFlag[] = dw.individual_checks
    .filter(c => c.status === 'FAIL' || c.status === 'FLAG')
    .map(c => ({
      flag: c.check_name,
      clause_reference: 'Universal Daywork Rule — Section K',
      checklist_section: 'Section K — Provisional Daywork',
      severity: c.severity ?? 'MEDIUM',
      confidence: 'HIGH',
      recommended_action: c.notes,
      is_section_j_trigger: false,
    }))

  const tabs: { id: Tab; node: React.ReactNode }[] = [
    { id: 'analysis', node: 'Analysis' },
    { id: 'daywork', node: <DayworkTabLabel /> },
    { id: 'line-items', node: `Line Items (${report.line_items.length})` },
    { id: 'financial', node: 'Financial' },
    { id: 'query-letter', node: 'Query Letter' },
    { id: 'payment-gate', node: 'Payment Gate' },
  ]

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e2e8f0] px-6 py-3 flex flex-wrap items-center gap-3">
        <h2 className="font-bold text-[#0f172a] text-base">{report.supplement_number}</h2>
        <span className="text-sm text-gray-500">{formatCHF(report.claimed_total)}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${recommendationStyle(report.overall_recommendation)}`}>
          AI: {report.overall_recommendation}
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle(current_status)}`}>
          {current_status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Banners */}
      <div className="px-6 pt-4 space-y-3">
        {bypassedPassOne && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 flex items-start gap-2">
            <span className="text-yellow-600 flex-shrink-0">⚠</span>
            <p className="text-sm text-yellow-800">
              <strong>This supplement was analysed despite failing Pass 1 checks.</strong>{' '}
              Formality issues are unresolved — see Section A red flags below.
            </p>
          </div>
        )}

        {arithmetic_warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-yellow-600">⚠</span>
            <p className="text-sm text-yellow-800">
              <strong>Arithmetic warnings detected</strong> — {arithmetic_warnings.length} discrepanc{arithmetic_warnings.length === 1 ? 'y' : 'ies'} found in financial figures.
            </p>
          </div>
        )}

        {report.approaching_10_pct_threshold && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-orange-500">⚠</span>
            <p className="text-sm text-orange-800">
              Cumulative supplements now <strong>{report.cumulative_supplements_as_pct_of_contract.toFixed(1)}%</strong> of contract value.
              Contract-level review recommended.
            </p>
          </div>
        )}

        {sectionJTriggers.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm font-bold text-red-800 mb-1">⚡ Section J Triggers Detected ({sectionJTriggers.length})</p>
            <ul className="list-disc list-inside space-y-0.5">
              {sectionJTriggers.map((t, i) => (
                <li key={i} className="text-xs text-red-700">{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex gap-1 border-b border-[#e2e8f0] overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${tab === t.id
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.node}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6 space-y-6">
        {tab === 'analysis' && (
          <>
            <ChecksGrid
              checks={report.checks}
              provisionalDaywork={dw}
              onViewDaywork={() => setTab('daywork')}
            />

            {/* Section J red flags */}
            {report.red_flags.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[#0f172a] mb-3">
                  Red Flags ({report.red_flags.length})
                </h3>
                <div className="space-y-3">
                  {report.red_flags.map((flag, i) => (
                    <RedFlagCard key={i} flag={flag} />
                  ))}
                </div>
              </div>
            )}

            {/* Section K — injected daywork red flags */}
            {sectionKRedFlags.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">Section K</span>
                  Provisional Daywork — Failed Checks ({sectionKRedFlags.length})
                </h3>
                <div className="space-y-3">
                  {sectionKRedFlags.map((flag, i) => (
                    <RedFlagCard key={`k-${i}`} flag={flag} />
                  ))}
                </div>
              </div>
            )}

            {report.patterns_detected.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-amber-800 mb-2">Patterns Detected</h3>
                <ul className="space-y-1">
                  {report.patterns_detected.map((p, i) => (
                    <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                      <span>•</span><span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.recommendation_reasoning && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-[#0f172a] mb-2">Recommendation Reasoning</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{report.recommendation_reasoning}</p>
              </div>
            )}
          </>
        )}

        {tab === 'daywork' && (
          <DayworkReviewPanel provisional_daywork={dw} />
        )}

        {tab === 'line-items' && (
          <LineItemsTable items={report.line_items} arithmeticWarnings={arithmetic_warnings} />
        )}

        {tab === 'financial' && (
          <FinancialSummaryView summary={report.financial_summary} />
        )}

        {tab === 'query-letter' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              Send this letter to the contractor before proceeding to Pass 3.
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 font-mono text-sm text-gray-700 whitespace-pre-wrap leading-relaxed min-h-[300px]">
              {report.query_letter || 'No query letter generated.'}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(report.query_letter)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Copy Letter
              </button>
              <button
                onClick={() => downloadText(report.query_letter, `query-letter-${report.supplement_number}.txt`)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Download as .txt
              </button>
            </div>
          </div>
        )}

        {tab === 'payment-gate' && (
          <PaymentGate analysis={analysis} onDecisionSaved={onDecisionSaved} />
        )}
      </div>
    </div>
  )
}
