import * as SecureStore from 'expo-secure-store';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import legacy for fallback (SDK 57 moved to legacy)
import { readAsStringAsync as legacyReadAsString } from 'expo-file-system/legacy';

export async function compressAndEncode(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 2000 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (result.base64) {
      return result.base64;
    }
  } catch {
    // ignore manipulator error
  }
  // Fallback: read raw file as base64
  try {
    return await legacyReadAsString(uri, { encoding: 'base64' });
  } catch {
    return '';
  }
}

const API_BASE = 'https://funnelswift.net/api/v1';
const TOKEN_KEY = 'funnelswift_auth_token';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 30s timeout to prevent hung connections
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.status === 401) {
      await removeToken();
      throw new ApiError('Unauthorized', 401);
    }

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = await response.json();
        message = body.error || body.message || message;
      } catch {}
      throw new ApiError(message, response.status);
    }

    if (response.status === 204) return {} as T;

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Auth
export function login(email: string, password: string) {
  return request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string, name: string, tenantName: string) {
  return request<{ token: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, tenant_name: tenantName }),
  });
}

export function getMe() {
  return request<any>('/auth/me');
}

// Forgot / Reset Password
export function forgotPassword(email: string) {
  return request<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return request<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    // The API expects `new_password`; sending `password` failed deserialisation with 422,
    // so "reset password" could never succeed from the app.
    body: JSON.stringify({ token, new_password: password }),
  });
}

// Tags
export function getTags() {
  return request<any[]>('/tags');
}

export function createTag(data: Record<string, any>) {
  return request<any>('/tags', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteTag(id: string) {
  return request<any>(`/tags/${id}`, {
    method: 'DELETE',
  });
}

export function getTagGroups() {
  return request<any[]>('/tag-groups');
}

export function createTagGroup(data: Record<string, any>) {
  return request<any>('/tag-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteTagGroup(id: string) {
  return request<any>(`/tag-groups/${id}`, {
    method: 'DELETE',
  });
}

// Leads
export function getLeads(params?: {
  page?: number;
  per_page?: number;
  search?: string;
  stage?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.per_page) query.set('per_page', String(params.per_page));
  if (params?.search) query.set('search', params.search);
  if (params?.stage) query.set('stage', params.stage);
  const qs = query.toString();
  return request<any>(`/leads${qs ? '?' + qs : ''}`);
}

export function getLead(id: string) {
  return request<any>(`/leads/${id}`);
}

export function createLead(data: Record<string, any>) {
  return request<{ id: string; message: string }>('/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateLead(id: string, data: Record<string, any>) {
  return request<{ message: string }>(`/leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteLead(id: string) {
  return request<{ message: string }>(`/leads/${id}`, {
    method: 'DELETE',
  });
}

// OCR — parse business card image (base64)
export function ocrParseCard(imageBase64: string) {
  return request<any>('/ocr/parse-card', {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
}

// LinkedIn profile lookup
export function linkedinLookup(url: string) {
  return request<any>('/leads/linkedin-lookup', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// Dashboard
export function getDashboardStats() {
  return request<any>('/dashboard/stats');
}

// Profile & Settings
export function updateProfile(data: Record<string, any>) {
  return request<any>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<{ message: string }>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function getSettings() {
  // The API returns rows ([{ key, value }]); callers want { [key]: value }. Spreading the
  // array gave an object keyed by index, so saved preferences never showed up in the UI.
  return request<any[]>('/settings').then(rows =>
    Array.isArray(rows)
      ? rows.reduce<Record<string, any>>((acc, r) => {
          if (r && typeof r.key === 'string') acc[r.key] = r.value;
          return acc;
        }, {})
      : {},
  );
}

export function updateSettings(data: Record<string, any>) {
  // PUT /settings takes exactly one { key, value } pair, but callers pass { [key]: value }.
  // Sending the bare object made the API reject every save with 422, so notification
  // preferences silently never persisted (the UI even reverted them on error).
  const [key, value] = Object.entries(data)[0] ?? ['', null];
  return request<Record<string, any>>('/settings', {
    method: 'PUT',
    body: JSON.stringify({ key, value }),
  });
}

// Activity log for dashboard
export function getActivityLog() {
  return request<any[]>('/dashboard/activity');
}

// ── Web-to-Lead Widgets ──
export function getWebToLeadConfigs() {
  return request<any[]>('/web-to-lead/configs');
}

export function createWebToLeadConfig(data: Record<string, any>) {
  return request<{ id: string; message: string }>('/web-to-lead/configs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateWebToLeadConfig(id: string, data: Record<string, any>) {
  return request<any>('/web-to-lead/configs/' + id, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteWebToLeadConfig(id: string) {
  return request<any>('/web-to-lead/configs/' + id, {
    method: 'DELETE',
  });
}

export function getWebToLeadEmbed(id: string) {
  return request<any>('/web-to-lead/configs/' + id + '/embed');
}

// ── Kinetic Cards ──
export function getKineticCards() {
  return request<any[]>('/kinetic/cards');
}

export function getKineticCard(slug: string) {
  return request<any>('/kinetic/cards/' + slug);
}

// ── QR Codes ──
export function getKineticQrCodes() {
  return request<{ data: any[]; limit: number }>('/kinetic/qr');
}

// ── IncentiveSwift Config (API key for mobile app to call IS directly) ──
export function getIncentiveSwiftConfig() {
  return request<{
    connected: boolean;
    api_key: string | null;
    base_url: string | null;
    campaigns_url: string | null;
  }>('/incentiveswift/config');
}

// ── Campaigns (fetched directly from IncentiveSwift API) ──
export async function getCampaigns(): Promise<{ campaigns: any[] }> {
  const config = await getIncentiveSwiftConfig();
  if (!config.connected || !config.api_key || !config.campaigns_url) {
    return { campaigns: [] };
  }
  const response = await fetch(config.campaigns_url, {
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    return { campaigns: [] };
  }
  return response.json();
}

// ── Offline Queue ──
export async function getPendingLeads(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem('offline_leads_queue');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function addPendingLead(data: Record<string, any>): Promise<void> {
  const queue = await getPendingLeads();
  queue.push({ ...data, _queued_at: new Date().toISOString() });
  await AsyncStorage.setItem('offline_leads_queue', JSON.stringify(queue));
}

export async function removePendingLead(index: number): Promise<void> {
  const queue = await getPendingLeads();
  queue.splice(index, 1);
  await AsyncStorage.setItem('offline_leads_queue', JSON.stringify(queue));
}

export async function clearPendingLeads(): Promise<void> {
  await AsyncStorage.removeItem('offline_leads_queue');
}

export async function syncOfflineLeads(onProgress?: (synced: number, total: number) => void): Promise<{ synced: number; failed: number }> {
  const queue = await getPendingLeads();
  if (queue.length === 0) return { synced: 0, failed: 0 };
  
  let synced = 0;
  let failed = 0;
  
  for (let i = 0; i < queue.length; i++) {
    try {
      await createLead(queue[i]);
      synced++;
      onProgress?.(synced, queue.length);
    } catch {
      failed++;
    }
  }
  
  // Clear successfully synced leads
  if (failed === 0) {
    await clearPendingLeads();
  } else {
    // Keep failed ones in queue
    const remaining = queue.filter((_, i) => i < queue.length - failed);
    await AsyncStorage.setItem('offline_leads_queue', JSON.stringify(remaining));
  }
  
  return { synced, failed };
}
