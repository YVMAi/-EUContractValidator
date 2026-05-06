import { useState } from 'react'
import { uploadDocuments } from '../utils/apiClient'
import type { UploadResponse } from '../types/supplement'
import { formatCHF } from '../utils/arithmeticVerifier'
import UploadBox from './UploadBox'

interface Props {
  onReady: (res: UploadResponse) => void
}

export default function SetupScreen({ onReady }: Props) {
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [boqFile, setBoqFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState<UploadResponse | null>(null)

  const canStart = !!(contractFile && boqFile)

  async function handleStart() {
    if (!contractFile || !boqFile) return
    setLoading(true)
    setError(null)
    try {
      const res = await uploadDocuments(contractFile, boqFile)
      setUploaded(res)
      onReady(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const details = uploaded?.contract_details

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1e3a5f] rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#1e3a5f]">ContractGuard</h1>
          <p className="text-gray-500 mt-2 text-base">Construction Contract Supplement Review System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-8">
          <h2 className="text-lg font-semibold text-[#0f172a] mb-2">
            Set Up Your Project
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Upload your contract and BOQ — ContractGuard will automatically extract all key details.
          </p>

          {/* Upload boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <UploadBox
              label="Base Contract"
              description="Upload the signed base contract PDF"
              onFileSelect={setContractFile}
              isUploaded={!!contractFile}
              fileName={contractFile?.name}
              fileSize={contractFile?.size}
              disabled={loading}
            />
            <UploadBox
              label="BOQ Document"
              description="Upload the Bill of Quantities PDF"
              onFileSelect={setBoqFile}
              isUploaded={!!boqFile}
              fileName={boqFile?.name}
              fileSize={boqFile?.size}
              disabled={loading}
            />
          </div>

          {/* Loading state */}
          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-700 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              Processing documents and extracting contract details with AI...
            </div>
          )}

          {/* Success bar */}
          {uploaded && details && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800">Documents memorised successfully</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Contract: {uploaded.contract_pages} pages · {uploaded.contract_word_count.toLocaleString()} words
                    &nbsp;|&nbsp;
                    BOQ: {uploaded.boq_pages} pages · {uploaded.boq_word_count.toLocaleString()} words
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0
                  ${details.confidence === 'HIGH' ? 'bg-green-200 text-green-800'
                  : details.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-600'}`}>
                  {details.confidence} confidence
                </span>
              </div>

              {/* Extracted details grid */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-green-200">
                {details.project_name && (
                  <div>
                    <p className="text-xs text-green-600 font-medium">Project</p>
                    <p className="text-sm text-green-900 font-semibold truncate">{details.project_name}</p>
                  </div>
                )}
                {details.contract_number && (
                  <div>
                    <p className="text-xs text-green-600 font-medium">Contract No.</p>
                    <p className="text-sm text-green-900 font-semibold">{details.contract_number}</p>
                  </div>
                )}
                {details.contract_value_net != null && (
                  <div>
                    <p className="text-xs text-green-600 font-medium">Contract Value (Net)</p>
                    <p className="text-sm text-green-900 font-semibold">{formatCHF(details.contract_value_net)}</p>
                  </div>
                )}
                {details.contract_standard && (
                  <div>
                    <p className="text-xs text-green-600 font-medium">Standard</p>
                    <p className="text-sm text-green-900 font-semibold">{details.contract_standard}</p>
                  </div>
                )}
                {details.client_name && (
                  <div>
                    <p className="text-xs text-green-600 font-medium">Client</p>
                    <p className="text-sm text-green-900 truncate">{details.client_name}</p>
                  </div>
                )}
                {details.retention_percentage != null && (
                  <div>
                    <p className="text-xs text-green-600 font-medium">Retention</p>
                    <p className="text-sm text-green-900 font-semibold">{details.retention_percentage}%</p>
                  </div>
                )}
              </div>

              {details.contract_value_net == null && (
                <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                  Contract value not found in documents. Financial thresholds will not be calculated.
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline text-red-600">Dismiss</button>
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!canStart || loading}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all
              ${canStart && !loading
                ? 'bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-[0.99]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {loading ? 'Processing...' : 'Start Reviewing →'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Documents are processed in-memory and never stored to disk.
        </p>
      </div>
    </div>
  )
}
