import api from '../lib/axios';

// ── Templates ────────────────────────────────────────────────────────────────

/** Return all templates across all years (includes item_count). */
export async function getAllTemplates() {
  const response = await api.get('/templates');
  return response.data; // { templates: [...] }
}

/** Return templates filtered by year (includes item_count). */
export async function getTemplates(year) {
  const response = await api.get('/templates', { params: { year } });
  return response.data; // { templates: [...] }
}

/** Return a single template by ID. */
export async function getTemplate(id) {
  const response = await api.get(`/templates/${id}`);
  return response.data; // { template: {...} }
}

/**
 * Create a new template.
 * @param {{ governanceAreaId: string, year: number, title: string, notes?: string, status?: string }} data
 */
export async function createTemplate(data) {
  const response = await api.post('/templates', data);
  return response.data; // { template: {...} }
}

/**
 * Update an existing template.
 * @param {string} id
 * @param {{ governanceAreaId?: string, year?: number, title?: string, notes?: string, status?: string }} data
 */
export async function updateTemplate(id, data) {
  const response = await api.patch(`/templates/${id}`, data);
  return response.data; // { template: {...} }
}

/** Delete a template (cascades to all its checklist items). */
export async function deleteTemplate(id) {
  await api.delete(`/templates/${id}`);
}

/**
 * Copy a template (duplicates template + checklist items) into a new DRAFT template.
 * @param {string} sourceTemplateId
 * @param {{ governanceAreaId?: string, year: number, title?: string, notes?: (string|null) }} data
 */
export async function copyTemplate(sourceTemplateId, data) {
  const response = await api.post(`/templates/${sourceTemplateId}/copy`, data);
  return response.data; // { template: {...} }
}

// ── Checklist Items ──────────────────────────────────────────────────────────

/**
 * Return checklist items for a template.
 * @param {string} templateId
 * @param {boolean} includeInactive  Pass true to include inactive items.
 */
export async function getTemplateItems(templateId, includeInactive = false) {
  const response = await api.get(`/templates/${templateId}/items`, {
    params: { includeInactive },
  });
  return response.data; // { items: [...] }
}

/**
 * Create a new checklist item inside a template.
 * @param {string} templateId
 * @param {object} data
 */
export async function createChecklistItem(templateId, data) {
  const response = await api.post(`/templates/${templateId}/items`, data);
  return response.data; // { item: {...} }
}

/**
 * Update an existing checklist item.
 * @param {string} templateId
 * @param {string} itemId
 * @param {object} data
 */
export async function updateChecklistItem(templateId, itemId, data) {
  const response = await api.patch(`/templates/${templateId}/items/${itemId}`, data);
  return response.data; // { item: {...} }
}

/** Delete a checklist item (cascades to child items). */
export async function deleteChecklistItem(templateId, itemId) {
  await api.delete(`/templates/${templateId}/items/${itemId}`);
}

/**
 * Import all checklist items from one template into another.
 * @param {string} targetTemplateId
 * @param {{ sourceTemplateId: string }} data
 */
export async function importTemplateItems(targetTemplateId, data) {
  const response = await api.post(`/templates/${targetTemplateId}/items/import`, data);
  return response.data; // { items: [...] }
}
