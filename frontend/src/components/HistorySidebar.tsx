import { useEffect, useState } from 'react'
import type { AnalysisResponse, ContractDetails, SessionStatus, SupplementSummary } from '../types/supplement'
import { getHistory, resetSession } from '../utils/apiClient'
import { formatCHF, formatPct } from '../utils/arithmeticVerifier'

interface Props {
  session: SessionStatus
  contractDetails: ContractDetails | null
  onSelectSupplement: (analysis: AnalysisResponse | null) => void
  onShowRegister: () => void
  onUploadNew: () => void
  onChangeContract: () => void
  activeIndex: number | null
  refreshTrigger: number
  allAnalyses: AnalysisResponse[]
}

type SidebarTab = 'supplements' | 'register' | 'session'

function statusBadge(status: string) {
  const base = 'inline-block px-1.5 py-0.5 rounded text-xs font-semibold'
  switch (status) {
    case 'RETURNED': return `${base} bg-red-900 text-red-200`
    case 'PASS_ONE_COMPLETE': return `${base} bg-blue-900 text-blue-200`
    case 'UNDER_QUERY': return `${base} bg-orange-900 text-orange-200`
    case 'PASS_TWO_COMPLETE': return `${base} bg-purple-900 text-purple-200`
    case 'APPROVED': return `${base} bg-green-900 text-green-200`
    case 'REJECTED': return `${base} bg-red-900 text-red-200`
    default: return `${base} bg-gray-700 text-gray-300`
  }
}

function recoBadge(r: string) {
  const base = 'inline-block px-1.5 py-0.5 rounded text-xs font-semibold mt-1'
  switch (r) {
    case 'APPROVE': return `${base} bg-green-900 text-green-200`
    case 'REJECT': return `${base} bg-red-900 text-red-200`
    case 'HOLD': return `${base} bg-orange-900 text-orange-200`
    case 'PARTIAL': return `${base} bg-yellow-900 text-yellow-200`
    default: return `${base} bg-gray-700 text-gray-300`
  }
}

export default function HistorySidebar({
  session,
  contractDetails,
  onSelectSupplement,
  onShowRegister,
  onUploadNew,
  onChangeContract,
  activeIndex,
  refreshTrigger,
  allAnalyses,
}: Props) {
  const [tab, setTab] = useState<SidebarTab>('supplements')
  const [history, setHistory] = useState<SupplementSummary[]>([])
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    getHistory().then(setHistory).catch(() => {})
  }, [refreshTrigger])

  const approaching10 = session.cumulative_pct_of_contract >= 8
  const contractValue = contractDetails?.contract_value_net ?? 0

  async function handleConfirmReset() {
    setResetting(true)
    try {
      await resetSession()
    } catch {}
    setResetting(false)
    setShowResetModal(false)
    onChangeContract()
  }

  return (
    <div className="w-72 flex-shrink-0 bg-[#1e3a5f] text-white flex flex-col h-full relative">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#2a4f7c]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-bold text-base">ContractGuard</span>
        </div>

        {session.contract_loaded && contractDetails ? (
          <div className="space-y-1.5">
            {/* Project name */}
            {contractDetails.project_name && (
              <p className="text-xs font-semibold text-white leading-tight truncate" title={contractDetails.project_name}>
                {contractDetails.project_name}
              </p>
            )}

            {/* Contract number + standard */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {contractDetails.contract_number && (
                <span className="text-xs text-blue-300">{contractDetails.contract_number}</span>
              )}
              {contractDetails.contract_standard && (
                <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-white/15 text-blue-100">
                  {contractDetails.contract_standard}
                </span>
              )}
            </div>

            {/* Net value */}
            {contractDetails.contract_value_net != null && (
              <p className="text-sm font-bold text-green-300">{formatCHF(contractDetails.contract_value_net)}</p>
            )}

            {/* Duration */}
            {(contractDetails.contract_start_date || contractDetails.contract_end_date) && (
              <p className="text-xs text-blue-300">
                {contractDetails.contract_start_date ?? '?'} → {contractDetails.contract_end_date ?? '?'}
              </p>
            )}

            {/* Retention + status */}
            <div className="flex items-center gap-2 flex-wrap">
              {contractDetails.retention_percentage != null && (
                <span className="text-xs text-blue-300">Retention: {contractDetails.retention_percentage}%</span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                <span className="text-xs text-green-300 font-medium">Loaded</span>
              </span>
            </div>
          </div>
        ) : session.contract_loaded ? (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            <span className="text-xs text-green-300 font-medium">Contract Loaded</span>
          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2a4f7c]">
        {([
          { id: 'supplements', label: 'Supplements' },
          { id: 'register', label: 'Register' },
          { id: 'session', label: 'Session' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id)
              if (t.id === 'register') onShowRegister()
            }}
            className={`flex-1 py-2 text-xs font-semibold transition-colors
              ${tab === t.id ? 'bg-[#2a4f7c] text-white' : 'text-blue-300 hover:text-white hover:bg-[#253e5c]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'supplements' && (
          <div className="py-2">
            {history.length === 0 && (
              <p className="text-xs text-blue-300 text-center py-8 px-4">
                No supplements reviewed yet.
              </p>
            )}
            {history.map((s) => {
              const isActive = activeIndex === s.supplement_index
              const ts = new Date(s.analysis_timestamp)
              const analysis = allAnalyses[s.supplement_index]
              return (
                <button
                  key={s.supplement_index}
                  onClick={() => onSelectSupplement(analysis ?? null)}
                  className={`w-full text-left px-4 py-3 border-b border-[#2a4f7c] transition-colors
                    ${isActive ? 'bg-[#2a4f7c]' : 'hover:bg-[#253e5c]'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-white">{s.supplement_number}</span>
                    <span className="text-xs text-blue-300">{ts.toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">{formatCHF(s.claimed_total)}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className={statusBadge(s.current_status)}>
                      {s.current_status.replace(/_/g, ' ')}
                    </span>
                    {!s.pass_one_failed && (
                      <span className={recoBadge(s.overall_recommendation)}>
                        AI: {s.overall_recommendation}
                      </span>
                    )}
                    {s.pm_decision && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-white/10 text-white">
                        PM: {s.pm_decision.decision}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {tab === 'session' && (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-blue-300 mb-1">Total Claimed</p>
                <p className="text-lg font-bold text-white">{formatCHF(session.total_claimed)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-blue-300 mb-1">Total Approved</p>
                <p className="text-lg font-bold text-green-300">{formatCHF(session.total_approved)}</p>
              </div>
              {contractValue > 0 && (
                <div className={`rounded-lg p-3 ${approaching10 ? 'bg-orange-900/50' : 'bg-white/5'}`}>
                  <p className="text-xs text-blue-300 mb-1">% of Contract Value</p>
                  <p className={`text-lg font-bold ${approaching10 ? 'text-orange-300' : 'text-white'}`}>
                    {formatPct(session.cumulative_pct_of_contract)}
                  </p>
                  {approaching10 && (
                    <p className="text-xs text-orange-300 mt-1">⚠ Approaching 10% threshold</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-4 border-t border-[#2a4f7c] space-y-2">
        <button
          onClick={onUploadNew}
          className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload New Supplement
        </button>
        <button
          onClick={() => setShowResetModal(true)}
          className="w-full py-2 text-blue-400 hover:text-white text-xs font-medium transition-colors"
        >
          Change Contract
        </button>
      </div>

      {/* Reset confirmation modal */}
      {showResetModal && (
        <div className="absolute inset-0 bg-[#0f172a]/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e3a5f] border border-[#2a4f7c] rounded-xl p-5 w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">Change Contract?</h3>
            <p className="text-xs text-blue-300 mb-5 leading-relaxed">
              This will clear all current session data including supplement history, analyses, and financial totals. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={resetting}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-1.5"
              >
                {resetting ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </>
                ) : 'Yes, Reset Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
