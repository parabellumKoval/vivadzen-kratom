import {
  buildDisplayPrice,
  formatCurrencyAmount,
  normalizeStructuredArray,
  resolveFixedFeeDisplayPrice,
  resolveRateDisplayPrice,
  roundDownShippingAmount,
} from './shipping-pricing'

describe('shipping-pricing utils', () => {
  it('parses structured arrays from JSON strings', () => {
    expect(normalizeStructuredArray('[{\"price\":145}]')).toEqual([{ price: 145 }])
  })

  it('adds VAT and rounds down Messenger delivery prices to whole integers', () => {
    expect(resolveRateDisplayPrice({
      rates: [{ price: 145 }],
      currency: 'CZK',
      vatRate: 21,
      vatIncluded: false,
    })).toEqual({
      amount: 175,
      currency: 'CZK',
    })
  })

  it('adds VAT and rounds down fixed COD fees to whole integers', () => {
    expect(resolveFixedFeeDisplayPrice({
      amount: 30,
      currency: 'CZK',
      vatRate: 21,
      vatIncluded: false,
    })).toEqual({
      amount: 36,
      currency: 'CZK',
    })
  })

  it('formats currency labels for mixed meta output', () => {
    expect(formatCurrencyAmount(buildDisplayPrice(15, 'CZK'))).toBe('15 Kč')
  })

  it('rounds positive shipping amounts down', () => {
    expect(roundDownShippingAmount(175.99)).toBe(175)
  })
})
