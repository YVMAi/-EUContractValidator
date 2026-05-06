import type { ArithmeticWarning, FinancialSummary, LineItem } from '../types/supplement'

const TOLERANCE = 0.01

export function verifyArithmetic(
  lineItems: LineItem[],
  financialSummary: FinancialSummary,
): ArithmeticWarning[] {
  const warnings: ArithmeticWarning[] = []

  if (lineItems.length > 0) {
    const computed = lineItems.reduce((sum, item) => sum + item.claimed_amount, 0)
    if (Math.abs(computed - financialSummary.claimed_total) > TOLERANCE) {
      warnings.push({
        position: 'FINANCIAL_SUMMARY',
        claimed_amount: financialSummary.claimed_total,
        expected_amount: Math.round(computed * 100) / 100,
        difference: Math.round((financialSummary.claimed_total - computed) * 100) / 100,
      })
    }
  }

  const breakdown =
    financialSummary.disputed_amount +
    financialSummary.approvable_amount +
    financialSummary.conditional_amount
  if (Math.abs(breakdown - financialSummary.claimed_total) > TOLERANCE) {
    warnings.push({
      position: 'FINANCIAL_BREAKDOWN',
      claimed_amount: financialSummary.claimed_total,
      expected_amount: Math.round(breakdown * 100) / 100,
      difference: Math.round((financialSummary.claimed_total - breakdown) * 100) / 100,
    })
  }

  return warnings
}

export function formatCHF(amount: number): string {
  return `CHF ${amount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`
}
