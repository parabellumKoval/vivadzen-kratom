
import {
  buildDisplayPrice,
  normalizeStructuredArray,
  resolveCurrencyCode,
  resolveRateDisplayPrice,
} from '~/utils/shipping-pricing'

export const useDelivery = () => {
  const {t} = useI18n()
  const {get} = useSettings()
  const {region, currency} = useRegion()

  const vendors = ref([
    {
      id: 1,
      logo: '/images/logo/np.png',
      title: 'Novaposhta',
      countries: ['ua']
    },{
      id: 2,
      logo: '/images/logo/zasilkovna.png',
      title: 'Zasilkovna',
      countries: ['cz','es','de']
    },{
      id: 3,
      logo: '/images/logo/ceska.png',
      title: 'Ceska posta',
      countries: ['cz','es','de']
    },{
      id: 4,
      logo: '/images/logo/ppl.png',
      title: 'PPL',
      countries: ['cz','es','de']
    },{
      id: 5,
      logo: '/images/logo/dhl.png',
      title: 'DHL',
      countries: ['cz','es','de']
    },{
      id: 6,
      logo: '/images/logo/dpd.png',
      title: 'Dpd',
      countries: ['cz','es','de']
    },{
      id: 7,
      logo: '/images/logo/company.png',
      title: 'Messenger.cz',
      countries: ['cz']
    }
  ])

  const providerTariffsLabel = computed(() => t('delivery.provider_tariffs'))
  const fromShopLabel = computed(() => t('delivery.from_shop'))
  const fallbackCurrency = computed(() => resolveCurrencyCode(currency.value, 'USD'))
  const normalizeEta = (value: unknown) => {
    if (typeof value !== 'string') return null

    const trimmed = value.trim()
    return trimmed || null
  }

  const resolveEta = (methodKey: string) => {
    switch (methodKey) {
      case 'packeta_warehouse':
        return normalizeEta(get('shipping.zasilkovna.pickup_eta'))
      case 'packeta_address':
        return normalizeEta(get('shipping.zasilkovna.home_eta'))
      case 'novaposhta_warehouse':
        return normalizeEta(get('shipping.novaposhta.branch_eta'))
      case 'novaposhta_address':
        return normalizeEta(get('shipping.novaposhta.courier_eta'))
      case 'messenger_address':
        return normalizeEta(get('shipping.messenger.address_eta'))
      case 'messenger_express':
        return normalizeEta(get('shipping.messenger.express_eta'))
      default:
        return null
    }
  }

  const packetaPickupPrice = computed(() => {
    return resolveRateDisplayPrice({
      rates: get('shipping.zasilkovna.pickup_rates'),
      currency: get('shipping.zasilkovna.currency'),
      fallbackCurrency: fallbackCurrency.value,
      vatRate: get('shipping.zasilkovna.vat_rate'),
      vatIncluded: get('shipping.zasilkovna.vat_included'),
    })
  })

  const packetaHomePrice = computed(() => {
    return resolveRateDisplayPrice({
      rates: get('shipping.zasilkovna.home_rates'),
      currency: get('shipping.zasilkovna.currency'),
      fallbackCurrency: fallbackCurrency.value,
      vatRate: get('shipping.zasilkovna.vat_rate'),
      vatIncluded: get('shipping.zasilkovna.vat_included'),
    })
  })

  const novaposhtaWarehousePrice = computed(() => {
    const branchRates = normalizeStructuredArray(get('shipping.novaposhta.branch_rates'))
    const lockerRates = normalizeStructuredArray(get('shipping.novaposhta.locker_rates'))

    return resolveRateDisplayPrice({
      rates: [...branchRates, ...lockerRates],
      currency: get('shipping.novaposhta.currency'),
      fallbackCurrency: fallbackCurrency.value,
      vatRate: get('shipping.novaposhta.vat_rate'),
      vatIncluded: get('shipping.novaposhta.vat_included'),
    })
  })

  const novaposhtaCourierPrice = computed(() => {
    return resolveRateDisplayPrice({
      rates: get('shipping.novaposhta.courier_rates'),
      currency: get('shipping.novaposhta.currency'),
      fallbackCurrency: fallbackCurrency.value,
      vatRate: get('shipping.novaposhta.vat_rate'),
      vatIncluded: get('shipping.novaposhta.vat_included'),
    })
  })

  const messengerAddressPrice = computed(() => {
    return resolveRateDisplayPrice({
      rates: get('shipping.messenger.address_rates'),
      currency: get('shipping.messenger.currency'),
      fallbackCurrency: fallbackCurrency.value,
      vatRate: get('shipping.messenger.vat_rate'),
      vatIncluded: get('shipping.messenger.vat_included'),
      fuelPercent: get('shipping.messenger.fuel_surcharge_percent'),
    })
  })

  const messengerExpressEnabled = computed(() => Boolean(get('shipping.messenger.express.enabled', false)))

  const messengerExpressSurcharge = computed(() => {
    const value = Number(get('shipping.messenger.express.surcharge', 200))
    return Number.isFinite(value) ? value : 200
  })

  // Express = тот же тариф messenger + плоская надбавка (без нового провайдера).
  const messengerExpressPrice = computed(() => {
    const base = messengerAddressPrice.value
    if (!base) return null
    return buildDisplayPrice(base.amount + messengerExpressSurcharge.value, base.currency, fallbackCurrency.value)
  })

  const defaultPrice = (methodKey = 'pickup') => {
    switch (methodKey) {
      case 'pickup':
      case 'packeta_warehouse':
        return packetaPickupPrice.value
      case 'home':
      case 'packeta_address':
        return packetaHomePrice.value
      case 'novaposhta_warehouse':
        return novaposhtaWarehousePrice.value
      case 'novaposhta_address':
        return novaposhtaCourierPrice.value
      case 'messenger_address':
        return messengerAddressPrice.value
      case 'messenger_express':
        return messengerExpressPrice.value
      default:
        return null
    }
  }

  const methods = computed(() => {
    const packetaPickup = packetaPickupPrice.value
    const packetaHome = packetaHomePrice.value
    const novaposhtaWarehouse = novaposhtaWarehousePrice.value
    const novaposhtaCourier = novaposhtaCourierPrice.value
    const messengerAddress = messengerAddressPrice.value
    const messengerExpress = messengerExpressPrice.value

    return [
      {
        key: 'packeta_warehouse',
        title: t('delivery.packeta_warehouse'),
        label: t('delivery.z_warehouse'),
        icon: 'iconoir:delivery-truck',
        image: '/images/logo/zasilkovna.png',
        logo: '/images/logo/z-mini.png',
        price: packetaPickup || providerTariffsLabel.value,
        isPriceObject: !!packetaPickup,
        eta: resolveEta('packeta_warehouse'),
      }, 
      {
        key: 'packeta_address',
        title: t('delivery.packeta_address'),
        label: t('delivery.z_address'),
        icon: 'iconoir:delivery',
        image: '/images/logo/zasilkovna.png',
        logo: '/images/logo/z-mini.png',
        price: packetaHome || providerTariffsLabel.value,
        isPriceObject: !!packetaHome,
        eta: resolveEta('packeta_address'),
      }, 
      {
        key: 'novaposhta_warehouse',
        title: t('delivery.novaposhta_warehouse'),
        label: t('delivery.np_warehouse'),
        icon: 'iconoir:delivery-truck',
        image: '/images/logo/np.png',
        logo: '/images/logo/np-mini.png',
        price: novaposhtaWarehouse || providerTariffsLabel.value,
        isPriceObject: !!novaposhtaWarehouse,
        eta: resolveEta('novaposhta_warehouse'),
      }, 
      {
        key: 'novaposhta_address',
        title: t('delivery.novaposhta_address'),
        label: t('delivery.np_warehouse'),
        icon: 'iconoir:delivery',
        image: '/images/logo/np.png',
        logo: '/images/logo/np-mini.png',
        price: novaposhtaCourier || providerTariffsLabel.value,
        isPriceObject: !!novaposhtaCourier,
        eta: resolveEta('novaposhta_address'),
      }, 
      {
        key: 'default_pickup',
        title: t('delivery.default_pickup'),
        label: t('delivery.pickup'),
        icon: 'iconoir:shop-four-tiles',
        image: '/images/company.png',
        logo: '/images/logo/company-mini.png',
        price: fromShopLabel.value,
        isPriceObject: false,
        meta: fromShopLabel.value,
        isMetaPriceObject: false
      }, 
      {
        key: 'messenger_address',
        title: t('delivery.messenger_address'),
        label: t('delivery.messenger_address'),
        icon: 'iconoir:delivery',
        image: '/images/logo/messenger.svg',
        logo: '/images/logo/messenger.svg',
        price: messengerAddress || providerTariffsLabel.value,
        isPriceObject: !!messengerAddress,
        meta: messengerAddress || providerTariffsLabel.value,
        isMetaPriceObject: !!messengerAddress,
        eta: resolveEta('messenger_address'),
      },
      {
        key: 'messenger_express',
        title: t('delivery.messenger_express'),
        label: t('delivery.messenger_express'),
        icon: 'iconoir:fast-arrow-right',
        image: '/images/logo/messenger-express.png',
        logo: '/images/logo/messenger-express.png',
        price: messengerExpress || providerTariffsLabel.value,
        isPriceObject: !!messengerExpress,
        meta: messengerExpress || providerTariffsLabel.value,
        isMetaPriceObject: !!messengerExpress,
        eta: resolveEta('messenger_express'),
      },
      {
        key: 'default_address',
        title: t('delivery.default_address'),
        label: t('delivery.address'),
        icon: 'iconoir:shop-four-tiles',
        image: '/images/company.png',
        logo: '/images/logo/company-mini.png',
        price: providerTariffsLabel.value,
        isPriceObject: false,
        meta: providerTariffsLabel.value,
        isMetaPriceObject: false
      }
    ].map((method) => ({
      ...method,
      meta: method.meta ?? method.price,
      isMetaPriceObject: method.isMetaPriceObject ?? method.isPriceObject
    }))
  })

  const deliveryMethods = computed(() => {
    const methodKeys = get('shipping.methods') || []
    const list = methods.value.filter(method => methodKeys.includes(method.key))

    // Express не отдельный метод в shipping.methods — показывается рядом с
    // messenger_address, когда включён тоггл в настройках Messenger.cz.
    if (messengerExpressEnabled.value) {
      const messengerIndex = list.findIndex(method => method.key === 'messenger_address')
      const express = methods.value.find(method => method.key === 'messenger_express')
      if (messengerIndex !== -1 && express && !list.some(method => method.key === 'messenger_express')) {
        list.splice(messengerIndex + 1, 0, express)
      }
    }

    return list
  })


  const deliveryVendors = computed(() => {
    return vendors.value.filter(vendor => vendor.countries.includes(region.value))
  })

  return {
    vendors: deliveryVendors,
    methods: deliveryMethods,
    defaultPrice
  }
}
