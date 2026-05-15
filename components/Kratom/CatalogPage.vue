<script setup lang="ts">
type CatalogCategorySeo = {
  h1?: string | null
  meta_title?: string | null
  meta_description?: string | null
}

type CatalogCategory = {
  id: number | string
  name: string
  slug: string
  extras?: Record<string, any> | null
  extras_trans?: Record<string, any> | null
}

type CatalogCategoryDetails = CatalogCategory & {
  short_text?: string | null
  content?: string | null
  seo?: CatalogCategorySeo | null
}

const props = defineProps<{
  categorySlug?: string | null
}>()

const normalizeSlug = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return normalized.length ? normalized : null
}

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const regionPath = useToLocalePath()
const runtimeConfig = useRuntimeConfig()
const regionStore = useRegion()
const categoryStore = useCategoryStore()
const { loadCatalogCategories } = useKratomCatalogCategories()

const requestedCategorySlug = computed(() => normalizeSlug(props.categorySlug))
const defaultCategorySlug = computed(() => {
  return (
    normalizeSlug(runtimeConfig.public.kratomStore?.catalogParentCategorySlug)
    || normalizeSlug(runtimeConfig.public.kratomStore?.categorySlug)
    || 'kratom'
  )
})
const page = computed(() => Math.max(Math.floor(Number(route.query.page) || 1), 1))

const {
  data: catalogNavigation,
  error: catalogNavigationError,
} = await useAsyncData(
  () => `kratom-catalog-navigation-${locale.value}-${regionStore.regionAlias.value || 'default'}`,
  () => loadCatalogCategories(),
  {
    server: true,
    default: () => ({ parent: null, categories: [] }),
  },
)

if (catalogNavigationError.value) {
  throw createError({
    statusCode: catalogNavigationError.value.statusCode || catalogNavigationError.value.status || 500,
    statusMessage: catalogNavigationError.value.statusMessage || catalogNavigationError.value.message || 'Catalog categories load failed',
    fatal: true,
  })
}

const categories = computed<CatalogCategory[]>(() => catalogNavigation.value?.categories || [])
const activeCategory = computed<CatalogCategory | null>(() => {
  if (!requestedCategorySlug.value) {
    return null
  }

  return categories.value.find((category) => normalizeSlug(category.slug) === requestedCategorySlug.value) || null
})

if (requestedCategorySlug.value && !activeCategory.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t('messages.no_catalog_results'),
    fatal: true,
  })
}

const currentCatalogSlug = computed(() => activeCategory.value?.slug || defaultCategorySlug.value)

const {
  data: activeCategoryPayload,
  error: activeCategoryPayloadError,
} = await useAsyncData(
  () => `kratom-catalog-category-${locale.value}-${regionStore.regionAlias.value || 'default'}-${requestedCategorySlug.value || 'root'}`,
  async () => {
    if (!requestedCategorySlug.value) {
      return null
    }

    const response = await categoryStore.showCached(requestedCategorySlug.value)
    if (response.error) {
      throw response.error
    }

    return response.data
  },
  {
    server: true,
    default: () => null,
  },
)

if (activeCategoryPayloadError.value) {
  throw createError({
    statusCode: activeCategoryPayloadError.value.statusCode || activeCategoryPayloadError.value.status || 500,
    statusMessage: activeCategoryPayloadError.value.statusMessage || activeCategoryPayloadError.value.message || 'Catalog category load failed',
    fatal: true,
  })
}

const activeCategoryDetails = computed<CatalogCategoryDetails | null>(() => {
  const payload = activeCategoryPayload.value
  const category =
    payload?.category
    || payload?.data?.category
    || payload?.data
    || null

  return category && typeof category === 'object' ? category as CatalogCategoryDetails : null
})

const displayCategory = computed<CatalogCategoryDetails | CatalogCategory | null>(() => {
  return activeCategoryDetails.value || activeCategory.value
})

const {
  data,
  pending,
  error,
} = await useAsyncData(
  () => `kratom-catalog-${locale.value}-${regionStore.regionAlias.value || 'default'}-${currentCatalogSlug.value}-${page.value}`,
  async () => {
    const response = await useProductStore().catalog({
      with_products: true,
      category_slug: currentCatalogSlug.value,
      per_page: 16,
      page: page.value,
      cache: true,
    })

    if (response.error.value) {
      throw response.error.value
    }

    return response.data.value
  },
  { server: true },
)

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || error.value.status || 500,
    statusMessage: error.value.statusMessage || error.value.message || 'Catalog load failed',
    fatal: true,
  })
}

const products = computed(() => data.value?.products?.data || [])
const meta = computed(() => data.value?.products?.meta || { current_page: 1, last_page: 1, total: 0 })

const switcherItems = computed(() => [
  {
    key: 'all',
    label: t('kratom.catalog.all_kratom'),
    to: regionPath('/catalog'),
    active: !activeCategory.value,
  },
  ...categories.value.map((category) => ({
    key: category.id ?? category.slug,
    label: category.name,
    to: regionPath(`/catalog/${category.slug}`),
    active: normalizeSlug(category.slug) === requestedCategorySlug.value,
  })),
])

const heroTitle = computed(() => {
  return activeCategoryDetails.value?.seo?.h1 || displayCategory.value?.name || t('title.catalog')
})

const heroText = computed(() => {
  return (
    activeCategoryDetails.value?.short_text
    || activeCategory.value?.extras_trans?.short_description
    || t('kratom.catalog.text')
  )
})

const seoContent = computed(() => activeCategoryDetails.value?.content || null)

const breadcrumbs = computed(() => {
  const items = [
    { name: t('title.home'), item: '/' },
    { name: t('title.catalog'), item: '/catalog' },
  ]

  if (activeCategory.value) {
    items.push({
      name: displayCategory.value?.name || activeCategory.value.name,
      item: `/catalog/${activeCategory.value.slug}`,
    })
  }

  return items
})

const pageSuffix = computed(() => {
  return page.value > 1 ? ` - ${t('label.page', { page: page.value })}` : ''
})

const appendPageSuffix = (value: string | null | undefined) => {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return undefined
  }

  return `${normalized}${pageSuffix.value}`
}

const goToPage = async (nextPage: number) => {
  const query = { ...route.query } as Record<string, any>
  if (nextPage <= 1) {
    delete query.page
  } else {
    query.page = String(nextPage)
  }

  await router.push({ query })
}

useSeo().setPageSeo('catalog', {
  params: () => ({
    pageSuffix: pageSuffix.value,
  }),
  title: () => {
    if (activeCategoryDetails.value?.seo?.meta_title) {
      return appendPageSuffix(activeCategoryDetails.value.seo.meta_title)
    }

    if (!activeCategory.value) {
      return undefined
    }

    return `${heroTitle.value}${pageSuffix.value} | VivaDzen`
  },
  description: () => {
    return activeCategoryDetails.value?.seo?.meta_description || (activeCategory.value ? heroText.value : undefined)
  },
  fallbackTitle: () => heroTitle.value,
  fallbackDescription: () => heroText.value,
})
</script>

<template>
  <div class="page-base kratom-catalog-page">
    <div class="container kratom-page-shell">
      <the-breadcrumbs :crumbs="breadcrumbs" />

      <nav v-if="switcherItems.length" class="kratom-page-switcher" :aria-label="t('title.catalog')">
        <NuxtLink
          v-for="item in switcherItems"
          :key="item.key"
          :to="item.to"
          class="kratom-page-switcher__item"
          :class="{ 'is-active': item.active }"
          :aria-current="item.active ? 'page' : undefined"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <section class="kratom-page-hero">
        <p class="kratom-page-hero__eyebrow">{{ t('kratom.catalog.eyebrow') }}</p>
        <h1 class="kratom-page-hero__title">{{ heroTitle }}</h1>
        <p class="kratom-page-hero__text">{{ heroText }}</p>
        <div class="kratom-page-hero__meta">
          <span>{{ meta.total }} {{ t('title.products') }}</span>
          <span>{{ t('kratom.catalog.fulfilment') }}</span>
          <span>{{ t('kratom.catalog.age_verification') }}</span>
        </div>
      </section>

      <div v-if="pending" class="kratom-catalog-grid kratom-catalog-grid--skeleton">
        <div v-for="i in 8" :key="i" class="kratom-catalog-skeleton"></div>
      </div>

      <div v-else-if="products.length" class="kratom-catalog-grid">
        <KratomProductCard v-for="product in products" :key="product.id" :product="product" />
      </div>

      <div v-else class="kratom-empty-state">
        {{ t('messages.no_catalog_results') }}
      </div>

      <div v-if="meta.last_page > 1" class="kratom-catalog-pagination">
        <simple-pagination :current="meta.current_page" :total="meta.last_page" @update:current="goToPage" />
      </div>

      <div v-if="seoContent" class="rich-text kratom-catalog-content" v-html="seoContent"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.kratom-page-shell {
  padding-top: 24px;
}

.kratom-page-switcher {
  margin-bottom: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.kratom-page-switcher__item {
  padding: 12px 18px;
  border-radius: 999px;
  border: 1px solid rgba(74, 91, 68, 0.16);
  background: rgba(255, 255, 255, 0.7);
  color: $color-2;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.92);
    border-color: rgba(74, 91, 68, 0.32);
    outline: none;
  }

  &.is-active {
    background: $color-green;
    border-color: $color-green;
    color: $color-0;
  }
}

.kratom-page-hero {
  margin-bottom: 40px;
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.kratom-page-hero__eyebrow {
  margin-bottom: 16px;
  font-size: 13px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #f28d1a;
  font-weight: 800;
}

.kratom-page-hero__title {
  margin-bottom: 18px;
  font-size: clamp(48px, 6vw, 72px);
  line-height: 1.05;
  color: $color-0;
}

.kratom-page-hero__text {
  max-width: 680px;
  color: $color-3;
  line-height: 1.7;
  font-size: 18px;
}

.kratom-page-hero__meta {
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;

  span {
    padding: 10px 18px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(12px);
    border: 1px solid $color-green;
    color: $color-2;
    font-weight: 500;
  }
}

.kratom-catalog-grid {
  display: grid;
  gap: 20px;

  @include tablet {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include desktop {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @include xld {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.kratom-catalog-grid--skeleton {
  .kratom-catalog-skeleton {
    height: 430px;
    border-radius: 28px;
    background: linear-gradient(120deg, rgba(225, 215, 202, 0.8), rgba(247, 240, 232, 1), rgba(225, 215, 202, 0.8));
    background-size: 200% 100%;
    animation: pulse 1.5s linear infinite;
  }
}

.kratom-catalog-pagination {
  margin-top: 32px;
  display: flex;
  justify-content: center;
}

.kratom-catalog-content {
  margin-top: 40px;
  margin-bottom: 24px;
}

.kratom-empty-state {
  padding: 40px;
  border-radius: 28px;
  text-align: center;
  background: rgba(255, 255, 255, 0.72);
}

@keyframes pulse {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
