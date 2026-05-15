type ProductAvailabilityLike = {
  inStock?: number | string | null
} | null | undefined

export const isProductAvailable = (product: ProductAvailabilityLike) => {
  if (!product || typeof product !== 'object') {
    return false
  }

  const inStock = product.inStock

  if (inStock === undefined || inStock === null || inStock === '') {
    return true
  }

  const normalized = Number(inStock)

  return Number.isFinite(normalized) ? normalized > 0 : true
}
