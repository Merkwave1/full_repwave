/** Normalize API responses to a plain array (handles paginated + wrapped shapes). */
export function unwrapList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.products)) return response.products;
  if (Array.isArray(response?.purchase_orders)) return response.purchase_orders;
  return [];
}

/** Preferred packaging ids from a product record (.NET or legacy PHP shape). */
export function getProductPreferredPackagingIds(product) {
  if (!product) return [];
  if (Array.isArray(product.preferred_packaging_ids)) {
    return product.preferred_packaging_ids.map(Number);
  }
  if (Array.isArray(product.preferred_packaging)) {
    return product.preferred_packaging.map((p) =>
      Number(p.packaging_types_id ?? p.packaging_type_id ?? p),
    );
  }
  return [];
}
