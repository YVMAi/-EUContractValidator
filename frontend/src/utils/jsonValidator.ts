import type { AnalysisResponse } from '../types/supplement'

export function validateAnalysisResponse(data: unknown): AnalysisResponse {
  if (!data || typeof data !== 'object') throw new Error('Invalid response: not an object')
  const d = data as Record<string, unknown>
  if (!d.report) throw new Error('Missing report field')
  if (typeof d.pass_one_failed !== 'boolean') throw new Error('Missing pass_one_failed field')
  if (!d.current_status) throw new Error('Missing current_status field')
  return data as AnalysisResponse
}
