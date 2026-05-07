/**
 * Public entry point for the framework-free agent runtime.
 *
 * Import everything from `@/core` (or `src/core/index`) — never reach into
 * subpaths from outside this directory. This barrel is the surface that
 * could be lifted into a standalone `@curex24/agent-core` npm package.
 */

// Tenant
export type { Tenant, TenantContext } from './tenant/types';
export { DEFAULT_TENANT, DEFAULT_TENANT_CONTEXT } from './tenant/types';

// DataSource
export type {
  DataSource,
  DataSourceStatus,
  Resource,
  ListOptions,
  ListResult,
} from './dataSource/types';
export {
  ReadOnlyDataSourceError,
  DataSourceNotConfiguredError,
} from './dataSource/types';
export { MemoryDataSource } from './dataSource/memoryDataSource';
export type { MemoryDataSourceOptions } from './dataSource/memoryDataSource';
export { createDataSource, resetDataSourceCache } from './dataSource/factory';
export type { DataSourceConfig, DataSourceKind } from './dataSource/factory';

// Domain pack
export type {
  DomainPack,
  ResourceDef,
  ResourceFieldDef,
  KpiDef,
  SkillDef,
  SkillInputDef,
  SkillRubricCriterionDef,
  IntakeQuestionDef,
} from './domainPack/types';
export { domainPackValidator } from './domainPack/types';
export {
  registerDomainPack,
  getDomainPack,
  listDomainPacks,
  clearDomainPackRegistry,
  loadDomainPackFromJson,
  loadDomainPackFromUrl,
} from './domainPack/loader';
export { renderTemplate } from './domainPack/template';
export type { TemplateContext } from './domainPack/template';

// AI provider
export type {
  AiProvider,
  ChatRequest,
  ChatResponse,
  ChatTurn,
  ChatStreamChunk,
  ChatUsage,
  EmbedRequest,
  EmbedResponse,
  ImageRequest,
  ImageResponse,
} from './aiProvider/types';
export { AiCapabilityNotSupportedError } from './aiProvider/types';
export { MockAiProvider } from './aiProvider/mockProvider';
export { createAiProvider, resetAiProviderCache } from './aiProvider/factory';
export type { AiProviderConfig, AiProviderKind } from './aiProvider/factory';

// Auth
export type { AuthAdapter, AuthRequest, AuthResult } from './auth/types';
export {
  AuthError,
  AnonymousAuthAdapter,
  HeaderTenantAuthAdapter,
  readHeader,
} from './auth/types';

// Transport-agnostic agent
export { handleRequest } from './agent/handleRequest';
export type { AgentRequest, AgentResponse, AgentDeps } from './agent/handleRequest';

// Validation utilities (so packs/configs can extend the schema)
export { v as validators, ValidationError } from './validation/validator';
export type { Validator } from './validation/validator';
