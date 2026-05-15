<script setup lang="ts">
import AdultoGuideContent from '~/components/Modal/AdultoGuide/AdultoGuideContent.vue'

const { t } = useI18n()

const breadcrumbs = computed(() => [
  { name: t('title.home'), item: '/' },
  { name: t('title.age_verification'), item: '/age-verification' },
])

useSeo().setPageSeo('age_verification', {
  fallbackTitle: () => t('title.age_verification'),
})
</script>

<template>
  <div class="page-base adulto-guide-page">
    <div class="container kratom-page-container adulto-guide-page__shell">
      <the-breadcrumbs :crumbs="breadcrumbs" />
      <header class="adulto-guide-page__header">
        <p class="adulto-guide-page__eyebrow">{{ t('kratom.product.adulto_eyebrow') }}</p>
        <h1 class="title-common">{{ t('title.age_verification') }}</h1>
        <p>{{ t('kratom.product.adulto_text') }}</p>
      </header>
      <div class="adulto-guide-page__content">
        <AdultoGuideContent placement="page" default-version="full" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.adulto-guide-page__shell {
  padding-top: 24px;
  padding-bottom: 56px;
}

.adulto-guide-page__header {
  max-width: 820px;
  margin-bottom: 24px;

  p {
    max-width: 720px;
    margin: 0;
    color: rgba(31, 43, 29, 0.68);
    font-size: 17px;
    line-height: 1.75;
  }
}

.adulto-guide-page__eyebrow {
  margin-bottom: 10px !important;
  color: #8a5a2b !important;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px !important;
  font-weight: 800;
}

.adulto-guide-page__content {
  max-width: 900px;

  :deep(.adulto-guide) {
    width: 100%;
  }
}
</style>
