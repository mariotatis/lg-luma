import { appIdentity, validAppId } from './catalog';
import type { Inventory, TVInput } from './types';

// The last TV inventory, shown immediately on a cold start while the live one loads.
export const INVENTORY_CACHE_KEY = 'luma.inventory.v1';

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : '';
const kinds: TVInput['kind'][] = ['console', 'streamer', 'computer', 'audio', 'device', 'hdmi'];

export function parseInventoryCache(raw: string | null): Inventory | null {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!record(value) || !Array.isArray(value.apps) || !Array.isArray(value.inputs)) return null;
    const apps = value.apps.slice(0, 1000).flatMap((app: unknown) =>
      // Rebuilding identities keeps brand artwork and categories current.
      record(app) && validAppId(app.id) && text(app.title)
        ? [appIdentity(app.id, text(app.title))]
        : [],
    );
    const inputs = value.inputs.slice(0, 128).flatMap((input: unknown): TVInput[] =>
      record(input) &&
      validAppId(input.id) &&
      text(input.title) &&
      text(input.port) &&
      kinds.includes(input.kind as TVInput['kind'])
        ? [
            {
              id: input.id,
              title: text(input.title),
              port: text(input.port),
              kind: input.kind as TVInput['kind'],
              connected: typeof input.connected === 'boolean' ? input.connected : null,
            },
          ]
        : [],
    );
    return apps.length ? { apps, inputs, warnings: [] } : null;
  } catch {
    return null;
  }
}

export function readInventoryCache(): Inventory | null {
  try {
    return parseInventoryCache(localStorage.getItem(INVENTORY_CACHE_KEY));
  } catch {
    return null;
  }
}

export function saveInventoryCache({ apps, inputs }: Inventory): void {
  try {
    localStorage.setItem(INVENTORY_CACHE_KEY, JSON.stringify({ apps, inputs }));
  } catch {
    /* The live inventory still works when storage is full. */
  }
}
