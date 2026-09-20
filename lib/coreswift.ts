/**
 * CoreSwift integration client for FunnelSwift Mobile.
 *
 * ARCHITECTURE (fleet standard 2026-09-20 — /opt/swift/docs/integration-center-standard-2026-09-20.md):
 * the mobile app has NO backend of its own. Every call here goes to the FunnelSwift backend
 * (https://funnelswift.net/api/v1), which owns the canonical CoreSwift spoke endpoints:
 *
 *   GET  /integrations/coreswift/status   -> {"connected": bool, "base_url": "..."}
 *   GET  /integrations/coreswift/lists    -> proxy of the hub's list picker
 *   POST /integrations/coreswift/push     -> manual fallback for the automatic capture push
 *
 * BYOK RULE: the tenant's `csk_…` key is pasted by the signed-in user, sent straight to the
 * FunnelSwift backend (POST /provider-keys) and NEVER persisted on the device. This module must
 * never write a provider key to SecureStore, AsyncStorage or any other on-device store — see
 * BYOK_NEVER_PERSISTED below. Connection state is always read back from the backend, never
 * cached locally, so uninstalling/reinstalling cannot show a stale "connected".
 */
import { request } from './http';

/** Upsell link required by the standard (CoreSwift card cross-sell CTA). */
export const CORESWIFT_UPSELL_URL = 'https://coreswiftcrm.com/pricing';

/**
 * Contract reminder for future maintainers: provider keys transit only.
 * Nothing in this file may call SecureStore/AsyncStorage with a provider secret.
 */
export const BYOK_NEVER_PERSISTED = true;

export type ProviderCatalogueEntry = {
  key: string;
  name: string;
  description: string;
  requires_base_url: boolean;
  requires_metadata: boolean;
  icon: string | null;
  /** Backend marks the fleet-native connectors (coreswift, incentiveswift). */
  native: boolean;
};

export type ProviderKeyRow = {
  provider: string;
  /** Masked on read-back by the backend (prefix…last4). The raw key never leaves the write path. */
  api_key_masked: string;
  base_url: string | null;
  is_active: boolean;
  created_at?: string;
};

export type CoreSwiftStatus = {
  provider: string;
  name: string;
  description: string;
  /** inbound = capture app -> CoreSwift (the hub owns the leads). */
  direction: string;
  connected: boolean;
  base_url: string;
  key_preview: string | null;
};

export type CoreSwiftList = {
  id?: string;
  name?: string;
  [k: string]: any;
};

export type TestResult = {
  provider: string;
  valid: boolean;
  detail: string;
  base_url?: string;
};

export type PushResult = {
  provider: string;
  status: 'pushed' | 'skipped' | string;
  message: string;
};

/** The live catalogue (available_providers) — never a hardcoded array in the UI. */
export function getAvailableProviders() {
  return request<ProviderCatalogueEntry[]>('/available-providers');
}

/** Tenant BYOK rows, keys masked by the backend. */
export function getProviderKeys() {
  return request<ProviderKeyRow[]>('/provider-keys');
}

/** Connection state straight from the backend — never from local storage. */
export function getCoreSwiftStatus() {
  return request<CoreSwiftStatus>('/integrations/coreswift/status');
}

/** Hub list picker proxied through the FunnelSwift backend. */
export function getCoreSwiftLists() {
  return request<{ provider: string; base_url: string; lists: any }>(
    '/integrations/coreswift/lists',
  );
}

/**
 * Connect a provider with a BYOK key. `api_key` is sent in the request body and nowhere else.
 * Omit it to only update the stored base_url (the backend keeps the existing secret).
 */
export function connectProvider(
  provider: string,
  apiKey: string | undefined,
  baseUrl?: string,
) {
  const body: Record<string, string> = { provider };
  if (apiKey && apiKey.trim()) body.api_key = apiKey.trim();
  if (baseUrl && baseUrl.trim()) body.base_url = baseUrl.trim();
  return request<{ message: string; provider: string; api_key_masked: string }>(
    '/provider-keys',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

/** Disconnect = delete the tenant's stored credential for that provider. */
export function disconnectProvider(provider: string) {
  return request<{ message: string; provider: string }>(
    `/provider-keys/${encodeURIComponent(provider)}`,
    { method: 'DELETE' },
  );
}

/** Live provider probe. For coreswift this is a REAL hub call, not a "a key is stored" claim. */
export function testProvider(provider: string) {
  return request<TestResult>(
    `/provider-keys/${encodeURIComponent(provider)}/test`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

/** Manual fallback for the automatic capture push (the capture flow pushes server-side). */
export function pushLeadToCoreSwift(lead: Record<string, any>) {
  return request<PushResult>('/integrations/coreswift/push', {
    method: 'POST',
    body: JSON.stringify(lead),
  });
}

// ── Convenience wrappers for CoreSwift ──
export const connectCoreSwift = (apiKey: string | undefined, baseUrl?: string) =>
  connectProvider('coreswift', apiKey, baseUrl);

export const disconnectCoreSwift = () => disconnectProvider('coreswift');

export const testCoreSwift = () => testProvider('coreswift');

/** Normalise the proxied lists response: the hub returns {"lists": [...]}. */
export function extractLists(payload: any): CoreSwiftList[] {
  const raw = payload?.lists ?? payload;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.lists)) return raw.lists;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}
