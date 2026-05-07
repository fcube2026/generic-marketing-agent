/**
 * Domain pack loader + registry.
 *
 * Packs are registered by id; the active pack is selected per-tenant via
 * `tenant.domainPackId`. Packs may be:
 *   - bundled TS modules (default — see `src/packs/*`)
 *   - JSON loaded from disk (`loadDomainPackFromJson`)
 *   - fetched from a remote registry URL (`loadDomainPackFromUrl`)
 *
 * Every load goes through `domainPackValidator` so misconfigured packs fail
 * loudly with the path of the offending field.
 */

import type { DomainPack } from './types';
import { domainPackValidator } from './types';

const registry = new Map<string, DomainPack>();

export function registerDomainPack(pack: DomainPack): DomainPack {
  const validated = domainPackValidator(pack, `domainPack[${pack.id}]`);
  registry.set(validated.id, validated);
  return validated;
}

export function getDomainPack(id: string): DomainPack {
  const pack = registry.get(id);
  if (!pack) {
    throw new Error(
      `Domain pack "${id}" is not registered. Known packs: [${[...registry.keys()].join(', ') || '<none>'}]. ` +
        `Register one via registerDomainPack() in src/packs/<id>/index.ts and import it from src/agent.config.ts.`,
    );
  }
  return pack;
}

export function listDomainPacks(): DomainPack[] {
  return [...registry.values()];
}

export function clearDomainPackRegistry(): void {
  registry.clear();
}

/**
 * Parse + validate a JSON-shaped pack (e.g. fetched from a CMS or loaded
 * via `fs.readFile`). Throws `ValidationError` with a useful path on
 * malformed input.
 */
export function loadDomainPackFromJson(raw: string | object): DomainPack {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return registerDomainPack(parsed as DomainPack);
}

/** Fetch and validate a pack from a URL (e.g. a remote registry). */
export async function loadDomainPackFromUrl(url: string): Promise<DomainPack> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load domain pack from ${url}: ${res.status}`);
  return loadDomainPackFromJson(await res.text());
}
