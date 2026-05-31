import { useCartStore } from '~/store/cart'
import {
  normalizeCodCashTiers,
  resolveCurrencyCode,
  resolveFixedFeeDisplayPrice,
  type ShippingDisplayPrice,
} from '~/utils/shipping-pricing'

export const useMessengerCod = () => {
  const { get } = useSettings()
  const { currency } = useRegion()
  const cartStore = useCartStore()

  const enabled = computed(() => !!get('shipping.messenger.cod.enabled', true))

  const fallbackCurrency = computed(() => resolveCurrencyCode(currency.value, 'CZK'))

  const vatOptions = computed(() => ({
    currency: get('shipping.messenger.currency'),
    fallbackCurrency: fallbackCurrency.value,
    vatRate: get('shipping.messenger.vat_rate'),
    vatIncluded: get('shipping.messenger.vat_included'),
  }))

  const orderAmount = computed(() => cartStore.totalProducts || 0)

  const tiers = computed(() => {
    return normalizeCodCashTiers(get('shipping.messenger.cod.cash_tiers')).map((tier) => ({
      maxAmount: tier.maxAmount,
      fee: resolveFixedFeeDisplayPrice({ amount: tier.fee, ...vatOptions.value }),
    }))
  })

  const fee = computed<ShippingDisplayPrice | null>(() => {
    if (!enabled.value) return null

    const list = tiers.value
    if (list.length) {
      const match = list.find((tier) => orderAmount.value <= tier.maxAmount)
      return (match ?? list[list.length - 1]).fee
    }

    const flat = Number(get('shipping.messenger.cod.cash_fee'))
    if (!Number.isFinite(flat)) return null

    return resolveFixedFeeDisplayPrice({ amount: flat, ...vatOptions.value })
  })

  return { enabled, tiers, fee, currencyCode: fallbackCurrency }
}
