import { useState } from 'react'
import type { AnalysisResponse } from '../types/supplement'
import { analyseSupplement } from '../utils/apiClient'
import PassOneGate from './PassOneGate'
import UploadBox from './UploadBox'

interface Props {
  onAnalysed: (result: AnalysisResponse) => void
  onPassOneFailed: (result: AnalysisResponse) => void
}

type Stage = 'idle' | 'pass1' | 'gemini' | 'validating' | 'done' | 'error'

const STAGE_LABELS: Record<Stage, string> = {
  idle: '',
  pass1: 'Running Pass 1 checks...',
  gemini: 'Sending to Gemini AI for analysis...',
  validating: 'Validating and building report...',
  done: 'Analysis complete',
  error: 'Analysis failed',
}

export default function ReviewScreen({ onAnalysed, onPassOneFailed }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  // Stored when Pass 1 fails — we keep the file so bypass is possible
  const [passOneFailedResult, setPassOneFailedResult] = useState<AnalysisResponse | null>(null)

  function handleRetry() {
    setFile(null)
    setStage('idle')
    setError(null)
    setPassOneFailedResult(null)
  }

  async function runAnalysis(targetFile: File, bypass: boolean) {
    setError(null)
    setPassOneFailedResult(null)
    setStage('pass1')

    const stageTimer1 = bypass
      ? setTimeout(() => setStage('gemini'), 400)
      : setTimeout(() => setStage('gemini'), 800)
    const stageTimer2 = setTimeout(() => setStage('validating'), 3000)

    try {
      let result: AnalysisResponse
      try {
        result = await analyseSupplement(targetFile, bypass)
      } finally {
        clearTimeout(stageTimer1)
        clearTimeout(stageTimer2)
      }

      // Pass 1 failed and no bypass — show gate inline, keep file for bypass
      if (result.pass_one_failed && result.current_status === 'RETURNED') {
        setStage('idle')
        setPassOneFailedResult(result)
        onPassOneFailed(result) // record in sidebar without switching view
        return
      }

      setStage('done')
      onAnalysed(result)
    } catch (e: unknown) {
      setStage('error')
      setError(e instanceof Error ? e.message : 'Analysis failed')
    }
  }

  async function handleAnalyse() {
    if (!file) return
    await runAnalysis(file, false)
  }

  async function handleProceedAnyway() {
    if (!file) return
    await runAnalysis(file, true)
  }

  const isLoading = ['pass1', 'gemini', 'validating'].includes(stage)

  // Pass 1 gate — shown inline while file is still available for bypass
  if (passOneFailedResult && !isLoading) {
    return (
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <PassOneGate
            passOne={passOneFailedResult.report.pass_one}
            onRetry={handleRetry}
            onProceedAnyway={handleProceedAnyway}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a] mb-1">Review Supplement</h2>
          <p className="text-sm text-gray-500">
            Upload a contractor supplement / claim document for automated three-pass review.
          </p>
        </div>

        <UploadBox
          label="Supplement Document"
          description="Upload the contractor supplement / claim PDF"
          onFileSelect={setFile}
          isUploaded={!!file && !isLoading}
          fileName={file?.name}
          fileSize={file?.size}
          disabled={isLoading}
        />

        {/* Loading stages */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            {(['pass1', 'gemini', 'validating'] as Stage[]).map((s) => {
              const isActive = stage === s
              const isDone = ['pass1', 'gemini', 'validating'].indexOf(stage) >
                ['pass1', 'gemini', 'validating'].indexOf(s)
              return (
                <div key={s} className={`flex items-center gap-3 text-sm
                  ${isActive ? 'text-blue-700 font-medium' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                  {isDone ? (
                    <span className="w-5 h-5 flex items-center justify-center bg-green-100 rounded-full text-green-600 text-xs">✓</span>
                  ) : isActive ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  ) : (
                    <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full text-gray-400 text-xs">○</span>
                  )}
                  {STAGE_LABELS[s]}
                </div>
              )
            })}
          </div>
        )}

        {/* Error */}
        {stage === 'error' && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={handleRetry} className="text-sm font-medium text-red-600 hover:underline">
              Retry
            </button>
          </div>
        )}

        <button
          onClick={handleAnalyse}
          disabled={!file || isLoading}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all
            ${file && !isLoading
              ? 'bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-[0.99]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          {isLoading ? STAGE_LABELS[stage] : 'Analyse Supplement'}
        </button>
      </div>
    </div>
  )
}
