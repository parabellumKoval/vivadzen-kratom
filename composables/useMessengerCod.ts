import { useCartStore } from '~/store/cart'
import {
  buildDisplayPrice,
  normalizeCodCashTiers,
  resolveCurrencyCode,
  type ShippingDisplayPrice,
} from '~/utils/shipping-pricing'

const DEFAULT_MESSENGER_COD_TIERS = [
  { max_amount: 1000, fee: 30 },
  { max_amount: 999999, fee: 60 },
]

export const useMessengerCod = () => {
  const { get } = useSettings()
  const { currency } = useRegion()
  const cartStore = useCartStore()

  const enabled = computed(() => !!get('shipping.messenger.cod.enabled', true))

  const fallbackCurrency = computed(() => resolveCurrencyCode(currency.value, 'CZK'))

  const orderAmount = computed(() => cartStore.totalProducts || 0)

  const tiers = computed(() => {
    return normalizeCodCashTiers(get('shipping.messenger.cod.cash_tiers', DEFAULT_MESSENGER_COD_TIERS)).map((tier) => ({
      maxAmount: tier.maxAmount,
      fee: buildDisplayPrice(tier.fee, get('shipping.messenger.currency'), fallbackCurrency.value),
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

    return buildDisplayPrice(flat, get('shipping.messenger.currency'), fallbackCurrency.value)
  })

  return { enabled, tiers, fee, currencyCode: fallbackCurrency }
}
