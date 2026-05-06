import type { PassOneResult } from '../types/supplement'

interface Props {
  passOne: PassOneResult
  onRetry: () => void
  onProceedAnyway?: () => void
}

const checks: { key: keyof PassOneResult; label: string }[] = [
  { key: 'has_signature', label: 'Contractor signature present' },
  { key: 'has_signature_date', label: 'Signature date present' },
  { key: 'has_written_instruction_reference', label: 'Written instruction reference (Change Order / SI / Drawing No.)' },
  { key: 'has_sequential_reference', label: 'Unique sequential supplement reference number' },
  { key: 'has_project_contract_number', label: 'Project name and contract number stated' },
  { key: 'has_countersignature_block', label: 'Countersignature block present' },
]

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function PassOneGate({ passOne, onRetry, onProceedAnyway }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
        <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div>
          <h2 className="text-white font-bold text-lg">Supplement Returned — Pass 1 Failed</h2>
          <p className="text-red-100 text-sm">Document does not meet minimum formality requirements</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Checklist */}
        <div>
          <h3 className="text-sm font-semibold text-[#0f172a] mb-3">Pass 1 Checks</h3>
          <div className="space-y-2">
            {checks.map(({ key, label }) => {
              const passed = passOne[key] as boolean
              return (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-lg text-sm
                  ${passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <span className="text-base">{passed ? '✓' : '✗'}</span>
                  <span>{label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Missing items */}
        {passOne.missing_items.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-700 mb-2">Missing Items</h3>
            <ul className="space-y-1">
              {passOne.missing_items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Return notice */}
        <div>
          <h3 className="text-sm font-semibold text-[#0f172a] mb-2">Return Notice</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-xs text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {passOne.return_notice}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Primary row: Download + Upload Corrected */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => downloadText(passOne.return_notice, 'return-notice.txt')}
              className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Return Notice
            </button>

            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors ml-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Corrected Supplement
            </button>
          </div>

          {/* Secondary: Proceed anyway (only when callback provided — i.e. file is still in state) */}
          {onProceedAnyway && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-gray-400 leading-snug">
                  ⚠ Proceeding without resolving formality issues. All Pass 1 failures will appear as red flags in the full report.
                </p>
                <button
                  onClick={onProceedAnyway}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium hover:bg-gray-200 hover:text-gray-700 transition-colors"
                >
                  Proceed to Full Analysis Anyway
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
