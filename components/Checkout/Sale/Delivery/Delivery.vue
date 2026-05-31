<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useDeliveryStore } from '~/store/delivery'
import { useCartStore } from '~/store/cart'
import { roundDownShippingAmount } from '~/utils/shipping-pricing'

const { t } = useI18n()
const { currency, region } = useRegion()
const { get } = useSettings()

const cartStore = useCartStore()
const deliveryStore = useDeliveryStore()

const { order } = storeToRefs(cartStore)
const { deliveryPrice } = storeToRefs(deliveryStore)
const isDeliveryCostEnabled = computed(() => !!get('shipping.add_to_order_enabled', false))

const deliveryPayload = computed(() => {
  if (!isDeliveryCostEnabled.value) {
    return null
  }

  const methodKey = order.value?.delivery?.method
  const destinationCountry = region.value
  const isMessengerCod = (methodKey === 'messenger_address' || methodKey === 'messenger_express') && order.value?.payment?.method === 'messenger_cod'

  if (!methodKey || !destinationCountry) {
    return null
  }

  return {
    methodKey,
    destinationCountry,
    weightG: 1000,
    codAmount: isMessengerCod ? (cartStore.totalProducts || 0) : 0,
    codEnabled: isMessengerCod ? 1 : 0,
    meta: {
      subtotal: cartStore.totalProducts || 0,
      promocode_discount: cartStore.promocodeSale || 0,
      bonus_discount: 0,
      personal_discount: 0,
    }
  }
})

const lastPayloadKey = ref<string | null>(null)

const basePrice = computed(() => {
  if (!isDeliveryCostEnabled.value) return null

  const quote = deliveryPrice.value
  if (!quote) return null

  if (typeof quote === 'number') {
    const baseCurrency = currency.value
    if (!baseCurrency) return null

    return {
      amount: quote,
      currency: baseCurrency,
    }
  }

  const price = (quote as any)?.price ?? quote
  if (!price || typeof price !== 'object') return null

  const amount = Number((price as any).amount)
  const baseCurrency = (price as any).currency || currency.value

  if (!Number.isFinite(amount) || !baseCurrency) {
    return null
  }

  return {
    amount,
    currency: baseCurrency,
  }
})

// Доплата за наложенный платёж приходит отдельно в breakdown.cod_gross —
// показываем её отдельной строкой, а не внутри стоимости доставки.
const codFee = computed(() => {
  if (!isDeliveryCostEnabled.value) return null

  const quote = deliveryPrice.value as any

  // При бесплатной доставке сервер обнуляет всю стоимость (включая COD).
  if (quote?.breakdown?.free_shipping) return null

  const codGross = Number(quote?.breakdown?.cod_gross)

  if (!Number.isFinite(codGross) || codGross <= 0) return null

  const baseCurrency = quote?.currency || currency.value
  if (!baseCurrency) return null

  return {
    amount: roundDownShippingAmount(codGross),
    currency: baseCurrency,
  }
})

// Стоимость доставки без доплаты за наложенный платёж.
const deliveryOnlyPrice = computed(() => {
  if (!basePrice.value) return null

  const cod = codFee.value?.amount || 0

  return {
    amount: Math.max(0, basePrice.value.amount - cod),
    currency: basePrice.value.currency,
  }
})

if (process.client) {
  watch(
    deliveryPayload,
    async (payload) => {
      if (!payload) {
        lastPayloadKey.value = null
        // deliveryStore.resetQuote()
        cartStore.setDeliveryPricing()
        return
      }

      const payloadKey = JSON.stringify(payload)
      if (lastPayloadKey.value === payloadKey && deliveryPrice.value) {
        return
      }

      lastPayloadKey.value = payloadKey

      try {
        await deliveryStore.quote(payload)
      } catch (err) {
        console.error('Failed to fetch delivery price', err)
        lastPayloadKey.value = null
        cartStore.setDeliveryPricing()
      }
    },
    { immediate: true }
  )

  watch(
    [deliveryOnlyPrice, codFee, deliveryPrice],
    ([price, cod, quote]) => {
      cartStore.setDeliveryPricing({
        price: price ? { amount: price.amount, currency: price.currency } : null,
        cod: cod ? { amount: cod.amount, currency: cod.currency } : null,
        quote,
      })
    },
    { immediate: true }
  )
}
</script>

<style src='./delivery.scss' lang='scss' scoped></style>

<template>
  <ClientOnly>
    <div v-if="isDeliveryCostEnabled" class="sale-item">
      <div class="sale-label">{{ t('messages.delivery_price') }}</div>
      <div class="sale-value">
        <simple-price
          v-if="deliveryOnlyPrice"
          :value="deliveryOnlyPrice.amount"
          :currency-code="deliveryOnlyPrice.currency"
          class="price"
        ></simple-price>
        <span v-else>—</span>
      </div>
    </div>
    <div v-if="isDeliveryCostEnabled && codFee" class="sale-item">
      <div class="sale-label">{{ t('messages.cod_fee') }}</div>
      <div class="sale-value">
        <simple-price
          :value="codFee.amount"
          :currency-code="codFee.currency"
          class="price"
        ></simple-price>
      </div>
    </div>
  </ClientOnly>
</template>
