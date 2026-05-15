export interface ShippingDisplayPrice {
  amount: number
  currency: string
}

const round2 = (value: number) => Math.round(value * 100) / 100

const toFiniteNumber = (value: unknown): number | null => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}

export const normalizeStructuredArray = (value: unknown): Array<Record<string, any>> => {
  if (!value) return []

  if (Array.isArray(value)) {
    return value as Array<Record<string, any>>
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed as Array<Record<string, any>>
      }
    } catch {
      return []
    }
  }

  return []
}

export const resolveCurrencyCode = (value: unknown, fallback?: unknown): string | null => {
  const candidate = typeof value === 'string' && value.trim()
    ? value
    : typeof fallback === 'string' && fallback.trim()
      ? fallback
      : null

  return candidate ? candidate.trim().toUpperCase() : null
}

export const roundDownShippingAmount = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return value >= 0
    ? Math.floor(value + 1e-9)
    : Math.ceil(value - 1e-9)
}

export const buildDisplayPrice = (amount: unknown, currency: unknown, fallbackCurrency?: unknown): ShippingDisplayPrice | null => {
  const normalizedAmount = toFiniteNumber(amount)
  const normalizedCurrency = resolveCurrencyCode(currency, fallbackCurrency)

  if (normalizedAmount === null || !normalizedCurrency) {
    return null
  }

  return {
    amount: roundDownShippingAmount(normalizedAmount),
    currency: normalizedCurrency
  }
}

export const pickMinRatePrice = (ratesValue: unknown): number | null => {
  const prices = normalizeStructuredArray(ratesValue)
    .map((rate) => toFiniteNumber(rate?.price))
    .filter((price): price is number => price !== null)

  if (!prices.length) {
    return null
  }

  return Math.min(...prices)
}

export const applyVatToAmount = (baseAmount: unknown, vatRateValue: unknown, vatIncludedValue: unknown): number | null => {
  const base = toFiniteNumber(baseAmount)

  if (base === null) {
    return null
  }

  const vatRate = toFiniteNumber(vatRateValue) ?? 0
  const vatIncluded = Boolean(vatIncludedValue)

  if (vatRate <= 0) {
    return round2(base)
  }

  return vatIncluded
    ? round2(base)
    : round2(base * (1 + vatRate / 100))
}

export const applyFuelSurcharge = (baseAmount: unknown, fuelPercentValue: unknown): number | null => {
  const base = toFiniteNumber(baseAmount)

  if (base === null) {
    return null
  }

  const fuelPercent = toFiniteNumber(fuelPercentValue) ?? 0

  if (fuelPercent <= 0) {
    return round2(base)
  }

  return round2(base * (1 + fuelPercent / 100))
}

export const resolveRateDisplayPrice = (options: {
  rates: unknown
  currency: unknown
  fallbackCurrency?: unknown
  vatRate?: unknown
  vatIncluded?: unknown
  fuelPercent?: unknown
}): ShippingDisplayPrice | null => {
  const minRate = pickMinRatePrice(options.rates)

  if (minRate === null) {
    return null
  }

  const withFuel = applyFuelSurcharge(minRate, options.fuelPercent) ?? minRate
  const gross = applyVatToAmount(withFuel, options.vatRate, options.vatIncluded) ?? withFuel

  return buildDisplayPrice(gross, options.currency, options.fallbackCurrency)
}

export const resolveFixedFeeDisplayPrice = (options: {
  amount: unknown
  currency: unknown
  fallbackCurrency?: unknown
  vatRate?: unknown
  vatIncluded?: unknown
}): ShippingDisplayPrice | null => {
  const gross = applyVatToAmount(options.amount, options.vatRate, options.vatIncluded)

  if (gross === null) {
    return null
  }

  return buildDisplayPrice(gross, options.currency, options.fallbackCurrency)
}

const currencySymbols: Record<string, string> = {
  CZK: 'Kč',
  EUR: '€',
  UAH: '₴',
  USD: '$',
}

export const formatCurrencyAmount = (price: ShippingDisplayPrice | null): string | null => {
  if (!price) {
    return null
  }

  const suffix = currencySymbols[price.currency] || price.currency
  return `${price.amount} ${suffix}`
}

export const formatPercentValue = (value: unknown): string | null => {
  const normalized = toFiniteNumber(value)

  if (normalized === null || normalized <= 0) {
    return null
  }

  return Number.isInteger(normalized)
    ? String(normalized)
    : String(normalized).replace(/\.?0+$/, '')
}
