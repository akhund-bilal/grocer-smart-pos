/**
 * Currency formatting utilities for PKR (Pakistani Rupees)
 */

export const CURRENCY_SYMBOL = "₨"
export const CURRENCY_CODE = "PKR"

/**
 * Format a number as PKR currency
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  options: {
    showSymbol?: boolean
    decimals?: number
  } = {}
): string {
  const { showSymbol = true, decimals = 2 } = options

  // Format the number with Pakistani locale (en-PK) for proper comma separation
  const formatted = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)

  return showSymbol ? `${CURRENCY_SYMBOL}${formatted}` : formatted
}

/**
 * Parse a currency string to number
 * @param currencyString - The currency string to parse
 * @returns Parsed number
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbol and any non-numeric characters except decimal point
  const cleanString = currencyString
    .replace(CURRENCY_SYMBOL, '')
    .replace(/[^\d.-]/g, '')
  
  return parseFloat(cleanString) || 0
}

/**
 * Format currency for display in cards/lists (shorter format)
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 100000) {
    return `${CURRENCY_SYMBOL}${(amount / 100000).toFixed(1)}L`
  } else if (amount >= 1000) {
    return `${CURRENCY_SYMBOL}${(amount / 1000).toFixed(1)}K`
  }
  return formatCurrency(amount)
}

/**
 * Get currency input props for form inputs
 */
export function getCurrencyInputProps() {
  return {
    type: "number",
    min: "0",
    step: "0.01",
    placeholder: "0.00"
  }
}