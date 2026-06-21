import { api } from '../utils/axiosInstance.js';
export const getAllProductAttributes = () => api.get('/product-attributes');
export const getAllProductAttributesWithValues = async () => {
  const attrs = await api.get('/product-attributes');
  const list = Array.isArray(attrs) ? attrs : [];
  const withValues = await Promise.all(
    list.map(async (a) => {
      try {
        const vals = await api.get(`/product-attributes/${a.attribute_id}/values`);
        const mapped = (Array.isArray(vals) ? vals : []).map((v) => ({
          ...v,
          attribute_value_value: v.attribute_value_value ?? v.value_text ?? '',
        }));
        return { ...a, values: mapped };
      } catch {
        return { ...a, values: [] };
      }
    })
  );
  return withValues;
};
export const createProductAttribute = (data) => api.post('/product-attributes', data);
export const updateProductAttribute = (id, data) => api.put(`/product-attributes/${id}`, data);
export const deleteProductAttribute = (id) => api.delete(`/product-attributes/${id}`);
export const getAttributeValues = (attributeId) => api.get(`/product-attributes/${attributeId}/values`);
export const createAttributeValue = (data) => api.post('/attribute-values', data);
export const deleteAttributeValue = (id) => api.delete(`/attribute-values/${id}`);

// PHP-compatible aliases
export const addProductAttributeWithValues = async (name, values) => {
  const attr = await api.post('/product-attributes', { attribute_name: name, attribute_description: null });
  const attrId = attr?.attribute_id ?? attr?.data?.attribute_id;
  if (attrId && Array.isArray(values) && values.length > 0) {
    await Promise.all(
      values.map((v) => api.post('/attribute-values', { attribute_value_attribute_id: attrId, attribute_value_value: v }))
    );
  }
  return attr;
};
export const updateProductAttributeWithValues = async (id, name, newValues, originalValues) => {
  await api.put(`/product-attributes/${id}`, { attribute_name: name, attribute_description: null });
  if (Array.isArray(newValues)) {
    // Add values that don't have an attribute_value_id (newly added in the form)
    const toAdd = newValues.filter((v) => !v.attribute_value_id);
    if (toAdd.length > 0) {
      await Promise.all(
        toAdd.map((v) =>
          api.post('/attribute-values', {
            attribute_value_attribute_id: id,
            attribute_value_value: v.value,
          })
        )
      );
    }
    // Delete values that were in the original list but removed from the form
    if (Array.isArray(originalValues) && originalValues.length > 0) {
      const keptIds = new Set(
        newValues.filter((v) => v.attribute_value_id).map((v) => v.attribute_value_id)
      );
      const toDelete = originalValues
        .map((v) => v.attribute_value_id)
        .filter((vid) => vid && !keptIds.has(vid));
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map((vid) => api.delete(`/attribute-values/${vid}`)));
      }
    }
  }
};
