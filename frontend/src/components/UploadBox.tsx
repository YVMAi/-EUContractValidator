import { useRef, useState } from 'react'

interface Props {
  label: string
  description: string
  onFileSelect: (file: File) => void
  isUploaded?: boolean
  fileName?: string
  fileSize?: number
  disabled?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function UploadBox({
  label,
  description,
  onFileSelect,
  isUploaded = false,
  fileName,
  fileSize,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) return
    onFileSelect(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer select-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${dragging ? 'border-blue-500 bg-blue-50' : isUploaded ? 'border-green-500 bg-green-50' : 'border-[#e2e8f0] bg-[#f8fafc] hover:border-blue-400 hover:bg-blue-50'}
      `}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
      />
      <div className="flex flex-col items-center text-center gap-3">
        {isUploaded ? (
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
        )}
        <div>
          <p className="font-600 text-[#0f172a] text-sm font-semibold">{label}</p>
          {isUploaded && fileName ? (
            <div className="mt-1">
              <p className="text-green-700 text-xs font-medium">{fileName}</p>
              {fileSize !== undefined && (
                <p className="text-green-600 text-xs">{formatBytes(fileSize)}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-xs mt-1">{description}</p>
          )}
        </div>
        {!isUploaded && (
          <span className="text-xs text-blue-600 font-medium">
            Click or drag PDF here
          </span>
        )}
        {isUploaded && (
          <span className="text-xs text-green-600 font-medium">
            ✓ Uploaded — click to replace
          </span>
        )}
      </div>
    </div>
  )
}
