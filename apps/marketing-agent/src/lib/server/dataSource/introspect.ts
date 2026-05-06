/**
 * Schema introspection + auto-mapping for the SQL data source.
 *
 * The introspection step asks `information_schema` for every user table and
 * its columns. The auto-mapping step then scores each table against the UI
 * resources (Campaigns, Experiments, …) using:
 *
 *   1. Table-name similarity vs a hand-curated synonyms list.
 *   2. Column-name similarity vs the field names declared in `types.ts`.
 *
 * The result is a best-effort `{ table, columns }` mapping per resource that
 * the user can override from the Settings → Data Source UI. Anything we
 * cannot match remains `null` and the corresponding UI section renders an
 * empty state — we never throw or fall back to mock data silently.
 */

import type { ResourceKey } from './types';
import type { ResourceMapping } from './config';

export interface IntrospectedColumn {
  name: string;
  dataType: string;
  nullable: boolean;
}

export interface IntrospectedTable {
  schema: string;
  name: string;
  columns: IntrospectedColumn[];
}

export interface IntrospectedSchema {
  tables: IntrospectedTable[];
}

/**
 * Field expectations for each resource. Each field maps the UI field name
 * (left) to a list of acceptable column-name aliases (right). The first
 * element is the canonical name.
 */
const FIELD_ALIASES: Record<ResourceKey, Record<string, string[]>> = {
  campaigns: {
    id: ['id', 'campaign_id', 'uuid'],
    name: ['name', 'title', 'campaign_name'],
    objective: ['objective', 'goal', 'purpose'],
    channel: ['channel', 'medium', 'platform'],
    audience: ['audience', 'target_audience', 'segment'],
    budget: ['budget', 'spend', 'cost'],
    duration: ['duration', 'period', 'length'],
    kpi: ['kpi', 'metric', 'success_metric'],
    status: ['status', 'state'],
  },
  experiments: {
    id: ['id', 'experiment_id', 'uuid'],
    name: ['name', 'title'],
    hypothesis: ['hypothesis', 'theory'],
    channel: ['channel', 'platform'],
    control: ['control', 'control_variant'],
    variant: ['variant', 'treatment'],
    metric: ['metric', 'kpi'],
    startDate: ['start_date', 'startdate', 'started_at', 'begins_at'],
    endDate: ['end_date', 'enddate', 'ended_at', 'ends_at'],
    result: ['result', 'outcome'],
    winner: ['winner'],
    status: ['status', 'state'],
    lift: ['lift', 'uplift'],
  },
  contentItems: {
    id: ['id', 'content_id', 'uuid'],
    week: ['week', 'week_number'],
    day: ['day', 'weekday'],
    platform: ['platform', 'channel'],
    pillar: ['pillar', 'theme', 'category'],
    title: ['title', 'name', 'headline'],
    format: ['format', 'type'],
    status: ['status', 'state'],
  },
  seoPages: {
    id: ['id', 'page_id', 'uuid'],
    url: ['url', 'path', 'slug'],
    type: ['type', 'page_type'],
    title: ['title', 'name'],
    status: ['status', 'state'],
    targetKeyword: ['target_keyword', 'keyword', 'primary_keyword'],
  },
  keywordClusters: {
    id: ['id', 'cluster_id'],
    cluster: ['cluster', 'name', 'cluster_name'],
    type: ['type', 'intent'],
    priority: ['priority'],
  },
  lifecycleFlows: {
    id: ['id', 'flow_id'],
    name: ['name', 'title'],
    segment: ['segment', 'audience'],
    trigger: ['trigger', 'event'],
    status: ['status', 'state'],
  },
  planItems: {
    id: ['id', 'plan_id', 'task_id'],
    phase: ['phase', 'period'],
    category: ['category', 'pillar', 'workstream'],
    task: ['task', 'description', 'title'],
    owner: ['owner', 'assignee', 'team'],
    done: ['done', 'completed', 'is_done'],
  },
  profile: {
    primaryGrowthFocus: ['primary_growth_focus', 'growth_focus', 'focus'],
    biggestBottleneck: ['biggest_bottleneck', 'bottleneck'],
    monthlyBudget: ['monthly_budget', 'budget'],
    allocatedBudget: ['allocated_budget'],
    bestPerforming: ['best_performing', 'best_channel'],
    topPatientPersona: ['top_patient_persona', 'persona'],
    topReasonPatientChooses: ['top_reason_patient_chooses'],
    topReasonProviderJoins: ['top_reason_provider_joins'],
    founderLedBrand: ['founder_led_brand', 'is_founder_led'],
  },
};

/**
 * Synonyms for the table name behind each resource. Matching is
 * case-insensitive and ignores `_` and `-`.
 */
const TABLE_ALIASES: Record<ResourceKey, string[]> = {
  campaigns: ['campaigns', 'marketing_campaigns', 'campaign'],
  experiments: ['experiments', 'ab_tests', 'experiment', 'tests'],
  contentItems: ['content_items', 'content_calendar', 'content', 'posts', 'social_posts'],
  seoPages: ['seo_pages', 'pages', 'landing_pages', 'seo_landing_pages'],
  keywordClusters: ['keyword_clusters', 'keywords', 'seo_clusters'],
  lifecycleFlows: ['lifecycle_flows', 'flows', 'crm_flows', 'lifecycle'],
  planItems: ['plan_items', 'roadmap', 'plan', 'roadmap_items', 'tasks'],
  profile: ['business_profile', 'profile', 'company_profile'],
};

const norm = (s: string) => s.toLowerCase().replace(/[_\-\s]+/g, '');

function tableScore(tableName: string, aliases: string[]): number {
  const t = norm(tableName);
  let best = 0;
  for (const alias of aliases) {
    const a = norm(alias);
    if (t === a) return 100;
    if (t.includes(a) || a.includes(t)) best = Math.max(best, 70);
  }
  return best;
}

function findColumn(columns: IntrospectedColumn[], aliases: string[]): string | null {
  for (const alias of aliases) {
    const a = norm(alias);
    const hit = columns.find((c) => norm(c.name) === a);
    if (hit) return hit.name;
  }
  // Loose contains-match as a fallback.
  for (const alias of aliases) {
    const a = norm(alias);
    const hit = columns.find((c) => norm(c.name).includes(a) || a.includes(norm(c.name)));
    if (hit) return hit.name;
  }
  return null;
}

/**
 * Suggest a `{ table, columns }` mapping for each resource based on the
 * introspected schema. Returns `null` for any resource where no acceptable
 * table could be found.
 *
 * The algorithm is deliberately conservative: a table is only chosen if it
 * scores ≥ 70 *and* the resource's `id` column can be located.
 */
export function suggestMappings(
  schema: IntrospectedSchema,
): Partial<Record<ResourceKey, ResourceMapping>> {
  const result: Partial<Record<ResourceKey, ResourceMapping>> = {};

  for (const resource of Object.keys(TABLE_ALIASES) as ResourceKey[]) {
    const aliases = TABLE_ALIASES[resource];
    const fields = FIELD_ALIASES[resource];

    let bestTable: IntrospectedTable | null = null;
    let bestScore = 0;
    let bestColumns: Record<string, string> = {};

    for (const table of schema.tables) {
      const tScore = tableScore(table.name, aliases);
      if (tScore === 0) continue;
      // Need to be able to locate at least the id (or for the singleton
      // profile, *some* mappable column).
      const cols: Record<string, string> = {};
      for (const [field, fieldAliases] of Object.entries(fields)) {
        const match = findColumn(table.columns, fieldAliases);
        if (match) cols[field] = match;
      }
      const requiresId = resource !== 'profile';
      if (requiresId && !cols.id) continue;
      if (Object.keys(cols).length === 0) continue;
      const score = tScore + Object.keys(cols).length * 5;
      if (score > bestScore) {
        bestScore = score;
        bestTable = table;
        bestColumns = cols;
      }
    }

    if (bestTable) {
      const qualified =
        bestTable.schema && bestTable.schema !== 'public'
          ? `${bestTable.schema}.${bestTable.name}`
          : bestTable.name;
      result[resource] = { table: qualified, columns: bestColumns };
    }
  }

  return result;
}

/**
 * Validate that a user-supplied `{ table, columns }` mapping refers to
 * tables/columns that actually exist in the introspected schema. This is
 * the *only* place identifiers from user input are compared against an
 * allow-list before being interpolated into SQL.
 */
export function validateMapping(
  resource: ResourceKey,
  mapping: ResourceMapping,
  schema: IntrospectedSchema,
): { ok: true } | { ok: false; error: string } {
  const expected = FIELD_ALIASES[resource];
  if (!expected) return { ok: false, error: `Unknown resource: ${resource}` };

  const [s, t] = mapping.table.includes('.')
    ? mapping.table.split('.', 2)
    : ['public', mapping.table];

  const table = schema.tables.find((tbl) => tbl.schema === s && tbl.name === t);
  if (!table) {
    return { ok: false, error: `Table ${mapping.table} not found in schema` };
  }
  for (const [field, column] of Object.entries(mapping.columns)) {
    if (!(field in expected)) {
      return { ok: false, error: `Unknown field ${field} for resource ${resource}` };
    }
    if (!table.columns.some((c) => c.name === column)) {
      return { ok: false, error: `Column ${column} not in table ${mapping.table}` };
    }
  }
  return { ok: true };
}

/**
 * Identifier sanitiser. Only lowercase letters, digits and underscores are
 * allowed, optionally namespaced with a single dot. This is a defence in
 * depth on top of `validateMapping` — call it on every identifier before
 * interpolating into SQL.
 */
export function safeIdentifier(id: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(id)) {
    throw new Error(`Unsafe identifier: ${id}`);
  }
  return id
    .split('.')
    .map((part) => `"${part.replace(/"/g, '""')}"`)
    .join('.');
}

export { FIELD_ALIASES, TABLE_ALIASES };
