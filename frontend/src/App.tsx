import { useEffect, useState } from 'react'
import type { AnalysisResponse, ContractDetails, PMDecision, SessionStatus, UploadResponse } from './types/supplement'
import { checkSession } from './utils/apiClient'
import CumulativeRegister from './components/CumulativeRegister'
import HistorySidebar from './components/HistorySidebar'
import ReportDisplay from './components/ReportDisplay'
import ReviewScreen from './components/ReviewScreen'
import SetupScreen from './components/SetupScreen'

type AppState = 'SETUP' | 'READY' | 'LOADING' | 'ERROR'
type MainView = 'review' | 'report' | 'register'

const EMPTY_SESSION: SessionStatus = {
  contract_loaded: false,
  boq_loaded: false,
  supplements_analysed: 0,
  total_claimed: 0,
  total_approved: 0,
  cumulative_pct_of_contract: 0,
  ready: false,
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('LOADING')
  const [session, setSession] = useState<SessionStatus>(EMPTY_SESSION)
  const [contractDetails, setContractDetails] = useState<ContractDetails | null>(null)
  const [mainView, setMainView] = useState<MainView>('review')
  const [allAnalyses, setAllAnalyses] = useState<AnalysisResponse[]>([])
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResponse | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [initError, setInitError] = useState<string | null>(null)

  const contractValue = contractDetails?.contract_value_net ?? 0

  useEffect(() => {
    checkSession()
      .then(s => {
        setSession(s)
        if (s.contract_details) setContractDetails(s.contract_details)
        setAppState(s.ready ? 'READY' : 'SETUP')
      })
      .catch(e => {
        setInitError(e instanceof Error ? e.message : 'Backend connection failed')
        setAppState('ERROR')
      })
  }, [])

  function handleSetupReady(res: UploadResponse) {
    setContractDetails(res.contract_details)
    setSession(prev => ({
      ...prev,
      contract_loaded: true,
      boq_loaded: true,
      ready: true,
    }))
    setAppState('READY')
  }

  function handleChangeContract() {
    setContractDetails(null)
    setAllAnalyses([])
    setActiveAnalysis(null)
    setActiveIndex(null)
    setMainView('review')
    setSession(EMPTY_SESSION)
    setRefreshTrigger(0)
    setAppState('SETUP')
  }

  function handleAnalysed(result: AnalysisResponse) {
    const newAnalyses = [...allAnalyses, result]
    setAllAnalyses(newAnalyses)
    setActiveAnalysis(result)
    setActiveIndex(result.supplement_index)
    setMainView('report')
    setRefreshTrigger(t => t + 1)

    setSession(prev => ({
      ...prev,
      supplements_analysed: prev.supplements_analysed + 1,
      total_claimed: prev.total_claimed + result.report.claimed_total,
      cumulative_pct_of_contract: contractValue > 0
        ? ((prev.total_claimed + result.report.claimed_total) / contractValue * 100)
        : 0,
    }))
  }

  function handlePassOneFailed(result: AnalysisResponse) {
    setAllAnalyses(prev => [...prev, result])
    setRefreshTrigger(t => t + 1)
    setSession(prev => ({
      ...prev,
      supplements_analysed: prev.supplements_analysed + 1,
    }))
  }

  function handleSelectSupplement(analysis: AnalysisResponse | null) {
    if (!analysis) return
    setActiveAnalysis(analysis)
    setActiveIndex(analysis.supplement_index)
    setMainView('report')
  }

  function handleDecisionSaved(_decision: PMDecision) {
    setRefreshTrigger(t => t + 1)
    setSession(prev => ({
      ...prev,
      total_approved: prev.total_approved + (activeAnalysis?.report.financial_summary.net_payable ?? 0),
    }))
  }

  function handleUploadNew() {
    setActiveAnalysis(null)
    setActiveIndex(null)
    setMainView('review')
  }

  if (appState === 'LOADING') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Connecting to ContractGuard...</p>
        </div>
      </div>
    )
  }

  if (appState === 'ERROR') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#0f172a] mb-2">Connection Failed</h2>
          <p className="text-sm text-gray-500 mb-4">{initError}</p>
          <p className="text-xs text-gray-400 mb-6">Make sure the backend is running on port 8001.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#162d4a]"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (appState === 'SETUP') {
    return <SetupScreen onReady={handleSetupReady} />
  }

  // READY state — main layout
  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans">
      <HistorySidebar
        session={session}
        contractDetails={contractDetails}
        onSelectSupplement={handleSelectSupplement}
        onShowRegister={() => setMainView('register')}
        onUploadNew={handleUploadNew}
        onChangeContract={handleChangeContract}
        activeIndex={activeIndex}
        refreshTrigger={refreshTrigger}
        allAnalyses={allAnalyses}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {mainView === 'review' && (
          <ReviewScreen
            onAnalysed={handleAnalysed}
            onPassOneFailed={handlePassOneFailed}
          />
        )}

        {mainView === 'report' && activeAnalysis && (
          <div className="flex-1 overflow-y-auto">
            <ReportDisplay
              analysis={activeAnalysis}
              onRetry={handleUploadNew}
              onDecisionSaved={handleDecisionSaved}
            />
          </div>
        )}

        {mainView === 'register' && (
          <div className="flex-1 overflow-y-auto">
            <CumulativeRegister
              supplementCount={session.supplements_analysed}
              totalClaimed={session.total_claimed}
              contractValue={contractValue}
            />
          </div>
        )}
      </div>
    </div>
  )
}
