import sampleImages from '../data/images.json';

const apiBase = (import.meta.env.VITE_ARCHIVE_API_URL ?? '/api').replace(/\/$/, '');

export const hasArchiveApi = Boolean(apiBase);

export class ArchiveWriteUnavailableError extends Error {
  constructor() {
    super('This archive is running in read-only mode. Configure VITE_ARCHIVE_API_URL with a writable API to save changes.');
    this.name = 'ArchiveWriteUnavailableError';
  }
}

async function request(path, options) {
  const response = await fetch(`${apiBase}${path}`, { credentials: 'same-origin', ...options });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.error || `Archive API returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

function requireApi() {
  if (!apiBase) throw new ArchiveWriteUnavailableError();
}

function toFormData(record, imageFile) {
  const formData = new FormData();
  formData.append('record', JSON.stringify(record));
  if (imageFile) formData.append('image', imageFile, imageFile.name);
  return formData;
}

export async function getImages() {
  if (!apiBase) return sampleImages;
  return request('/images', { headers: { Accept: 'application/json' } });
}

export async function getImageById(id) {
  const images = await getImages();
  return images.find((record) => record.id === id) ?? null;
}

export async function createImage(record, imageFile) {
  requireApi();
  return request('/images', { method: 'POST', body: toFormData(record, imageFile) });
}

export async function updateImage(id, record, imageFile) {
  requireApi();
  return request(`/images/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: toFormData(record, imageFile),
  });
}

export async function deleteImage(id) {
  requireApi();
  return request(`/images/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getAdminSession() {
  if (!apiBase) return { configured: false, authenticated: false };
  return request('/auth/status');
}

export async function loginAdmin(password) {
  requireApi();
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

export async function logoutAdmin() {
  if (!apiBase) return { authenticated: false };
  return request('/auth/logout', { method: 'POST' });
}