/**
 * `DomainPack` — the vertical-agnostic seam.
 *
 * A pack is a versioned bundle of declarations that tells the agent what
 * domain it's running in: which resources exist, what KPIs to track, what
 * skills are available, what onboarding questions to ask, and what to call
 * each thing in the UI ("campaign" → "outreach", "member" → "client").
 *
 * Packs are pure data — JSON/TS modules shipped in `src/packs/*`, loaded
 * from disk in dev, or fetched from a remote registry in prod. Adding a
 * vertical = authoring a pack. No core changes.
 *
 * Validation runs at load time so misconfigured packs fail loudly with
 * useful error messages instead of producing wrong UI state at runtime.
 */

import { v, type Validator } from '../validation/validator';

// ─── Resource definition ────────────────────────────────────────────────────

export interface ResourceFieldDef {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'date' | 'enum' | 'object' | 'any';
  /** Allowed values when `type === 'enum'`. */
  enum?: string[];
  required?: boolean;
  description?: string;
}

export interface ResourceDef {
  /** URL-safe identifier, also used as the row `type` in the data source. */
  id: string;
  /** Plural noun used in the UI ("Campaigns", "Listings", "Courses"). */
  label: string;
  /** Singular noun. */
  labelSingular: string;
  /** UI icon / emoji. */
  icon?: string;
  /** Field schema; used by the runtime to validate writes. */
  fields: ResourceFieldDef[];
  /** Resources that can't be created/updated through the UI. */
  readOnly?: boolean;
  /** When true, exposed as a singleton (e.g. tenant profile). */
  singleton?: boolean;
}

// ─── KPIs ───────────────────────────────────────────────────────────────────

export interface KpiDef {
  id: string;
  label: string;
  /** Free-form category — packs decide their own taxonomy. */
  category: string;
  unit?: string;
  /** Free-form formula description (interpreted by the analytics layer). */
  formula?: string;
  target?: string;
  icon?: string;
}

// ─── Skills ─────────────────────────────────────────────────────────────────

export interface SkillInputDef {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'boolean';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  helperText?: string;
}

export interface SkillRubricCriterionDef {
  id: string;
  description: string;
  weight: number;
}

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  category?: string;
  /** Handlebars-style `{{var}}` template, rendered against tenant + inputs. */
  promptTemplate: string;
  systemPrompt: string;
  inputs: SkillInputDef[];
  guardrails?: string[];
  successCriteria?: SkillRubricCriterionDef[];
  /** Optional matching visual brief. */
  visual?: { promptHint: string; width: number; height: number };
  /** Names of resource types the skill can read from to add live context. */
  contextResources?: string[];
}

// ─── Onboarding ─────────────────────────────────────────────────────────────

export interface IntakeQuestionDef {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'boolean';
  options?: string[];
  required?: boolean;
  helperText?: string;
}

// ─── Pack ───────────────────────────────────────────────────────────────────

export interface DomainPack {
  /** URL-safe id (e.g. "fcube-finance", "ecommerce", "saas"). */
  id: string;
  /** Semver version — tenants pin to a specific version to upgrade safely. */
  version: string;
  name: string;
  description: string;
  /** Label substitutions for generic core terms. */
  terminology: Record<string, string>;
  resources: ResourceDef[];
  kpis: KpiDef[];
  skills: SkillDef[];
  intakeQuestions: IntakeQuestionDef[];
  /**
   * Optional starter content. Seeded once per (tenant, resource) by the
   * `MemoryDataSource`; production adapters opt in with an explicit
   * `seedDomainPack()` call.
   */
  seedData?: Record<string, unknown[]>;
  /** Optional singleton seed values keyed by resource id. */
  seedSingletons?: Record<string, unknown>;
}

// ─── Validators ─────────────────────────────────────────────────────────────

const fieldType = v.oneOf(['string', 'number', 'boolean', 'string[]', 'date', 'enum', 'object', 'any'] as const);

const resourceFieldDef: Validator<ResourceFieldDef> = v.object({
  name: v.string(),
  type: fieldType,
  enum: v.optional(v.array(v.string())),
  required: v.optional(v.boolean()),
  description: v.optional(v.string()),
}) as Validator<ResourceFieldDef>;

const resourceDef: Validator<ResourceDef> = v.object({
  id: v.string(),
  label: v.string(),
  labelSingular: v.string(),
  icon: v.optional(v.string()),
  fields: v.array(resourceFieldDef),
  readOnly: v.optional(v.boolean()),
  singleton: v.optional(v.boolean()),
}) as Validator<ResourceDef>;

const kpiDef: Validator<KpiDef> = v.object({
  id: v.string(),
  label: v.string(),
  category: v.string(),
  unit: v.optional(v.string()),
  formula: v.optional(v.string()),
  target: v.optional(v.string()),
  icon: v.optional(v.string()),
}) as Validator<KpiDef>;

const inputType = v.oneOf(['text', 'textarea', 'select', 'multiselect', 'number', 'boolean'] as const);

const skillInputDef: Validator<SkillInputDef> = v.object({
  id: v.string(),
  label: v.string(),
  type: inputType,
  options: v.optional(v.array(v.string())),
  required: v.optional(v.boolean()),
  placeholder: v.optional(v.string()),
  helperText: v.optional(v.string()),
}) as Validator<SkillInputDef>;

const rubricDef: Validator<SkillRubricCriterionDef> = v.object({
  id: v.string(),
  description: v.string(),
  weight: v.number(),
}) as Validator<SkillRubricCriterionDef>;

const visualDef = v.object({
  promptHint: v.string(),
  width: v.number(),
  height: v.number(),
});

const skillDef: Validator<SkillDef> = v.object({
  id: v.string(),
  name: v.string(),
  description: v.string(),
  category: v.optional(v.string()),
  promptTemplate: v.string(),
  systemPrompt: v.string(),
  inputs: v.array(skillInputDef),
  guardrails: v.optional(v.array(v.string())),
  successCriteria: v.optional(v.array(rubricDef)),
  visual: v.optional(visualDef),
  contextResources: v.optional(v.array(v.string())),
}) as Validator<SkillDef>;

const intakeQuestionDef: Validator<IntakeQuestionDef> = v.object({
  id: v.string(),
  label: v.string(),
  type: inputType,
  options: v.optional(v.array(v.string())),
  required: v.optional(v.boolean()),
  helperText: v.optional(v.string()),
}) as Validator<IntakeQuestionDef>;

export const domainPackValidator: Validator<DomainPack> = v.object({
  id: v.string(),
  version: v.string(),
  name: v.string(),
  description: v.string(),
  terminology: v.record(v.string()),
  resources: v.array(resourceDef),
  kpis: v.array(kpiDef),
  skills: v.array(skillDef),
  intakeQuestions: v.array(intakeQuestionDef),
  seedData: v.optional(v.record(v.array(v.any()) as Validator<unknown[]>)),
  seedSingletons: v.optional(v.record(v.any())),
}) as Validator<DomainPack>;
