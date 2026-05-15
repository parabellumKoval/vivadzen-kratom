<script setup lang="ts">
const route = useRoute()
const categorySlug = computed(() => String(route.params.category_slug || ''))
</script>

<template>
  <KratomCatalogPage :category-slug="categorySlug" />
</template>
