type KratomCatalogCategory = {
  id: number | string
  name: string
  slug: string
  children?: KratomCatalogCategory[]
  extras?: Record<string, any> | null
  extras_trans?: Record<string, any> | null
}

type KratomCatalogCategoryGroup = {
  parent: KratomCatalogCategory | null
  categories: KratomCatalogCategory[]
}

const normalizeCatalogSlug = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return normalized.length ? normalized : null
}

const normalizeCatalogId = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const isCatalogCategory = (value: unknown): value is KratomCatalogCategory => {
  return Boolean(
    value
    && typeof value === 'object'
    && 'slug' in value
    && typeof (value as KratomCatalogCategory).slug === 'string'
  )
}

const toCategoryArray = (value: unknown) => {
  return Array.isArray(value) ? value.filter(isCatalogCategory) : []
}

const toCategoryRecord = (value: unknown) => {
  if (!isCatalogCategory(value)) {
    return null
  }

  return value
}

const findCategoryInTree = (
  categories: KratomCatalogCategory[],
  predicate: (category: KratomCatalogCategory) => boolean,
): KratomCatalogCategory | null => {
  for (const category of categories) {
    if (predicate(category)) {
      return category
    }

    const match = findCategoryInTree(toCategoryArray(category.children), predicate)
    if (match) {
      return match
    }
  }

  return null
}

export const useKratomCatalogCategories = () => {
  const runtimeConfig = useRuntimeConfig()
  const { locale } = useI18n()
  const regionStore = useRegion()
  const cache = useState<Record<string, KratomCatalogCategoryGroup>>(
    'kratom-catalog-category-groups',
    () => ({}),
  )
  const storefrontCode = String(runtimeConfig.public.storefrontCode || 'kratom').trim()
  const listRoutePath = String(runtimeConfig.public?.categoryModule?.listRoutePath || '/api/_categories/list')
  const categoryRouteTemplate = String(
    runtimeConfig.public?.categoryModule?.categoryRoutePath || '/api/_categories/:slug',
  )

  const defaultParentSlug = computed(() => normalizeCatalogSlug(runtimeConfig.public.kratomStore?.categorySlug))
  const configuredParentSlug = computed(() =>
    normalizeCatalogSlug(runtimeConfig.public.kratomStore?.catalogParentCategorySlug),
  )
  const configuredParentId = computed(() =>
    normalizeCatalogId(runtimeConfig.public.kratomStore?.catalogParentCategoryId),
  )

  const buildHeaders = () => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Storefront': storefrontCode,
    }
    const localeValue = String(locale.value || '').trim()
    const regionValue = String(regionStore.regionAlias.value || '').trim()

    if (localeValue) {
      headers['Accept-Language'] = localeValue
    }

    if (regionValue) {
      headers['X-Region'] = regionValue
    }

    return headers
  }

  const resolveCategoryRoute = (slug: string) => {
    if (categoryRouteTemplate.includes(':slug')) {
      return categoryRouteTemplate.replace(':slug', encodeURIComponent(slug))
    }

    return `${categoryRouteTemplate.replace(/\/+$/, '')}/${encodeURIComponent(slug)}`
  }

  const isNotFoundError = (error: unknown) => {
    if (!error || typeof error !== 'object') {
      return false
    }

    const status =
      (error as { statusCode?: number; status?: number; response?: { status?: number } }).statusCode
      || (error as { statusCode?: number; status?: number; response?: { status?: number } }).status
      || (error as { response?: { status?: number } }).response?.status

    return status === 404
  }

  const getRootCategoryTree = async () => {
    const response = await $fetch<any>(listRoutePath, {
      headers: buildHeaders(),
    })
    return toCategoryArray(response?.data ?? response)
  }

  const getFullCategoryTree = async () => {
    const response = await $fetch<any>(listRoutePath, {
      headers: buildHeaders(),
      query: { is_root: false },
    })
    return toCategoryArray(response?.data ?? response)
  }

  const getCategoryBySlug = async (slug: string) => {
    try {
      const response = await $fetch<any>(resolveCategoryRoute(slug), {
        headers: buildHeaders(),
      })

      return toCategoryRecord(response?.category ?? response?.data?.data ?? response?.data ?? response)
    } catch (error) {
      if (isNotFoundError(error)) {
        return null
      }

      throw error
    }
  }

  const loadCatalogCategories = async () => {
    const localeKey = String(locale.value || 'default').toLowerCase()
    const regionKey = String(regionStore.regionAlias.value || 'default').toLowerCase()
    const slugKey = configuredParentSlug.value || defaultParentSlug.value || 'none'
    const idKey = configuredParentId.value ?? 'none'
    const cacheKey = `${localeKey}:${regionKey}:${slugKey}:${idKey}`

    if (cache.value[cacheKey]) {
      return cache.value[cacheKey]
    }

    const parentSlug = configuredParentSlug.value || defaultParentSlug.value
    let parentCategory: KratomCatalogCategory | null = null

    if (parentSlug) {
      parentCategory = await getCategoryBySlug(parentSlug)
    }

    if (!parentCategory && configuredParentId.value !== null) {
      const tree = await getFullCategoryTree()
      parentCategory = findCategoryInTree(
        tree,
        (category) => normalizeCatalogId(category.id) === configuredParentId.value,
      )
    }

    if (!parentCategory && parentSlug) {
      const tree = await getFullCategoryTree()
      parentCategory = findCategoryInTree(
        tree,
        (category) => normalizeCatalogSlug(category.slug) === parentSlug,
      )
    }

    if (!parentCategory) {
      const tree = await getRootCategoryTree()
      const fallbackSlug = parentSlug

      if (fallbackSlug) {
        parentCategory = findCategoryInTree(
          tree,
          (category) => normalizeCatalogSlug(category.slug) === fallbackSlug,
        )
      }
    }

    const payload = {
      parent: parentCategory,
      categories: toCategoryArray(parentCategory?.children).filter((category) => normalizeCatalogSlug(category.slug)),
    }

    cache.value[cacheKey] = payload
    return payload
  }

  return {
    loadCatalogCategories,
  }
}
