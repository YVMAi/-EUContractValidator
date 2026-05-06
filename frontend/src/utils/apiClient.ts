import axios from 'axios'
import type {
  AnalysisResponse,
  CumulativeItem,
  PMDecision,
  SessionStatus,
  SupplementSummary,
  UploadResponse,
} from '../types/supplement'


const api = axios.create({ baseURL: '/api' })

export async function checkSession(): Promise<SessionStatus> {
  try {
    const res = await api.get<SessionStatus>('/session-status')
    return res.data
  } catch (e: unknown) {
    throw new Error(`Failed to check session: ${_msg(e)}`)
  }
}

export async function uploadDocuments(contract: File, boq: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('contract_pdf', contract)
  form.append('boq_pdf', boq)
  try {
    const res = await api.post<UploadResponse>('/upload-documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  } catch (e: unknown) {
    throw new Error(`Document upload failed: ${_msg(e)}`)
  }
}

export async function resetSession(): Promise<void> {
  try {
    await api.delete('/reset-session')
  } catch (e: unknown) {
    throw new Error(`Session reset failed: ${_msg(e)}`)
  }
}

export async function analyseSupplement(
  supplement: File,
  bypassPassOne = false,
): Promise<AnalysisResponse> {
  const form = new FormData()
  form.append('supplement_pdf', supplement)
  if (bypassPassOne) form.append('bypass_pass_one', 'true')
  try {
    const res = await api.post<AnalysisResponse>('/analyse-supplement', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  } catch (e: unknown) {
    throw new Error(`Supplement analysis failed: ${_msg(e)}`)
  }
}

export async function saveDecision(index: number, decision: PMDecision): Promise<void> {
  try {
    await api.post(`/supplements/${index}/decision`, decision)
  } catch (e: unknown) {
    throw new Error(`Failed to save decision: ${_msg(e)}`)
  }
}

export async function getHistory(): Promise<SupplementSummary[]> {
  try {
    const res = await api.get<SupplementSummary[]>('/supplements/history')
    return res.data
  } catch (e: unknown) {
    throw new Error(`Failed to load history: ${_msg(e)}`)
  }
}

export async function getCumulativeRegister(): Promise<CumulativeItem[]> {
  try {
    const res = await api.get<CumulativeItem[]>('/cumulative-register')
    return res.data
  } catch (e: unknown) {
    throw new Error(`Failed to load cumulative register: ${_msg(e)}`)
  }
}

function _msg(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const detail = e.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d: {msg: string}) => d.msg).join('; ')
    return e.message
  }
  if (e instanceof Error) return e.message
  return String(e)
}
