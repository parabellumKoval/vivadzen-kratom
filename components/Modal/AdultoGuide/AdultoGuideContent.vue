<script setup lang="ts">
const { t, tm, te } = useI18n()

type GuideVersion = 'short' | 'full'
type GuidePlacement = 'modal' | 'page'

const props = withDefaults(defineProps<{
  placement?: GuidePlacement
  defaultVersion?: GuideVersion
  showTabs?: boolean
}>(), {
  placement: 'page',
  defaultVersion: 'short',
  showTabs: true,
})

const activeVersion = ref<GuideVersion>(props.defaultVersion)

watch(() => props.defaultVersion, (version) => {
  activeVersion.value = version
})

const guidePrefix = computed(() => activeVersion.value === 'short' ? 'short.' : '')

const getList = (key: string) => {
  const value = tm(key)

  return Array.isArray(value)
    ? value.map((_, index) => t(`${key}.${index}`))
    : []
}

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, '')

const tabs = computed(() => {
  return [
    { value: 'short' as const, label: t('tabs.short') },
    { value: 'full' as const, label: t('tabs.full') },
  ]
})

const sectionImagesByNumber: Record<string, Array<{ src: string, width: number, height: number }>> = {
  '1': [
    { src: '/images/adulto/1.jpg', width: 1280, height: 745 },
  ],
  '2': [
    { src: '/images/adulto/2.jpg', width: 1166, height: 1264 },
  ],
  '3': [
    { src: '/images/adulto/3.jpg', width: 1280, height: 727 },
    { src: '/images/adulto/4.jpg', width: 1280, height: 1231 },
  ],
  '4': [
    { src: '/images/adulto/5.jpg', width: 588, height: 881 },
    { src: '/images/adulto/6.jpg', width: 515, height: 1000 },
  ],
}

const intro = computed(() => {
  return {
    paragraphs: getList(`${guidePrefix.value}intro.paragraphs`),
    alert: t(`${guidePrefix.value}intro.alert`),
  }
})

const sections = computed(() => {
  const value = tm(`${guidePrefix.value}sections`)

  if (!Array.isArray(value)) {
    return []
  }

  return value.map((_, index) => {
    const baseKey = `${guidePrefix.value}sections.${index}`
    const sectionNumber = t(`${baseKey}.number`)

    return {
      number: sectionNumber,
      title: t(`${baseKey}.title`),
      lead: te(`${baseKey}.lead`) ? t(`${baseKey}.lead`) : '',
      steps: getList(`${baseKey}.steps`),
      note: te(`${baseKey}.note`) ? t(`${baseKey}.note`) : '',
      tips: getList(`${baseKey}.tips`),
      images: sectionImagesByNumber[sectionNumber] || [],
    }
  })
})

const important = computed(() => {
  const baseKey = `${guidePrefix.value}important`

  return {
    title: t(`${baseKey}.title`),
    paragraphs: getList(`${baseKey}.paragraphs`),
    steps: getList(`${baseKey}.steps`),
    footer: te(`${baseKey}.footer`) ? t(`${baseKey}.footer`) : '',
  }
})

const alternative = computed(() => {
  const baseKey = `${guidePrefix.value}alternative`

  return {
    title: t(`${baseKey}.title`),
    text: t(`${baseKey}.text`),
    bullets: getList(`${baseKey}.bullets`),
  }
})
</script>

<style src="./adulto-guide.scss" lang="scss" scoped></style>
<i18n src="./lang.yaml" lang="yaml"></i18n>

<template>
  <div class="adulto-guide" :class="[`adulto-guide--${placement}`, `adulto-guide--${activeVersion}`]">
    <div v-if="showTabs" class="adulto-guide__tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="adulto-guide__tab"
        :class="{ 'is-active': activeVersion === tab.value }"
        role="tab"
        :aria-selected="activeVersion === tab.value"
        @click="activeVersion = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <header class="adulto-guide__intro">
      <p v-for="(paragraph, index) in intro.paragraphs || []" :key="`intro-${index}`" v-html="paragraph"></p>
      <div class="adulto-guide__alert" v-html="intro.alert"></div>
    </header>

    <section
      v-for="section in sections"
      :key="section.number"
      class="adulto-guide__section"
    >
      <div class="adulto-guide__section-head">
        <span>{{ section.number }}</span>
        <h2 v-html="section.title"></h2>
      </div>
      <p v-if="section.lead" class="adulto-guide__lead" v-html="section.lead"></p>
      <ol class="adulto-guide__steps">
        <li v-for="(step, index) in section.steps || []" :key="`${section.number}-${index}`" v-html="step"></li>
      </ol>
      <div
        v-if="section.images.length"
        class="adulto-guide__images"
        :class="{ 'adulto-guide__images--stacked': section.number === '3' }"
      >
        <nuxt-img
          v-for="(image, index) in section.images"
          :key="image.src"
          :src="image.src"
          :alt="`${stripHtml(section.title)} ${index + 1}`"
          :title="stripHtml(section.title)"
          :width="image.width"
          :height="image.height"
          sizes="mobile:88vw tablet:360px desktop:800px"
          format="webp"
          quality="85"
          class="adulto-guide__image"
        />
      </div>
      <p v-if="section.note" class="adulto-guide__note" v-html="section.note"></p>
      <div v-if="section.tips?.length" class="adulto-guide__tip-list">
        <p v-for="(tip, index) in section.tips" :key="`${section.number}-tip-${index}`" v-html="tip"></p>
      </div>
    </section>

    <section class="adulto-guide__section adulto-guide__section--accent adulto-guide__summary">
      <h2 v-html="important.title"></h2>
      <div class="adulto-guide__summary-body">
        <p
          v-for="(paragraph, index) in important.paragraphs || []"
          :key="`important-${index}`"
          class="adulto-guide__text"
          v-html="paragraph"
        ></p>
        <ol class="adulto-guide__steps adulto-guide__steps--compact">
          <li v-for="(step, index) in important.steps || []" :key="`important-step-${index}`" v-html="step"></li>
        </ol>
        <p v-if="important.footer" class="adulto-guide__text" v-html="important.footer"></p>
      </div>
    </section>

    <section class="adulto-guide__section adulto-guide__summary">
      <h2 v-html="alternative.title"></h2>
      <div class="adulto-guide__summary-body">
        <p v-if="alternative.text" class="adulto-guide__text" v-html="alternative.text"></p>
        <ul class="adulto-guide__bullets">
          <li v-for="(bullet, index) in alternative.bullets || []" :key="`alternative-${index}`" v-html="bullet"></li>
        </ul>
      </div>
    </section>
  </div>
</template>
