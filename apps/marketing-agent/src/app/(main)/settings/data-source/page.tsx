'use client';

/**
 * Settings → Data Source.
 *
 * Lets a user paste a DB connection string, test it, persist it (encrypted
 * server-side), and override the auto-detected table/column mapping for
 * each UI resource.
 *
 * The DSN is **never** stored in the browser. We only show the redacted
 * summary returned by `/api/backend/datasource/status`.
 */

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

type ResourceKey =
  | 'campaigns'
  | 'experiments'
  | 'contentItems'
  | 'seoPages'
  | 'keywordClusters'
  | 'lifecycleFlows'
  | 'planItems'
  | 'profile';

interface IntrospectedColumn { name: string; dataType: string; nullable: boolean }
interface IntrospectedTable { schema: string; name: string; columns: IntrospectedColumn[] }
interface SchemaResponse {
  schema: { tables: IntrospectedTable[] };
  mappings: Partial<Record<ResourceKey, { table: string; columns: Record<string, string> }>>;
  resolvedMappings: Partial<Record<ResourceKey, { table: string; columns: Record<string, string> }>>;
}

interface StatusResponse {
  kind: 'mock' | 'sql' | 'rest';
  label: string;
  detail?: string;
  degraded?: boolean;
  error?: string;
  config: {
    configured: boolean;
    dialect?: string;
    label?: string;
    host?: string;
    database?: string;
    updatedAt?: string;
    mappedResources?: ResourceKey[];
  };
}

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  campaigns: 'Campaigns',
  experiments: 'Experiments',
  contentItems: 'Content Calendar',
  seoPages: 'SEO Pages',
  keywordClusters: 'Keyword Clusters',
  lifecycleFlows: 'Lifecycle Flows',
  planItems: 'Plan Items',
  profile: 'Business Profile',
};

const RESOURCE_FIELDS: Record<ResourceKey, string[]> = {
  campaigns: ['id', 'name', 'objective', 'channel', 'audience', 'budget', 'duration', 'kpi', 'status'],
  experiments: ['id', 'name', 'hypothesis', 'channel', 'control', 'variant', 'metric', 'startDate', 'endDate', 'result', 'winner', 'status', 'lift'],
  contentItems: ['id', 'week', 'day', 'platform', 'pillar', 'title', 'format', 'status'],
  seoPages: ['id', 'url', 'type', 'title', 'status', 'targetKeyword'],
  keywordClusters: ['id', 'cluster', 'type', 'priority'],
  lifecycleFlows: ['id', 'name', 'segment', 'trigger', 'status'],
  planItems: ['id', 'phase', 'category', 'task', 'owner', 'done'],
  profile: [
    'primaryGrowthFocus', 'biggestBottleneck', 'monthlyBudget', 'allocatedBudget',
    'bestPerforming', 'topPatientPersona', 'topReasonPatientChooses',
    'topReasonProviderJoins', 'founderLedBrand',
  ],
};

export default function DataSourcePage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [dsn, setDsn] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [mappings, setMappings] = useState<Partial<Record<ResourceKey, { table: string; columns: Record<string, string> }>>>({});

  const refreshStatus = async () => {
    try {
      const { data } = await api.get<StatusResponse>('/datasource/status');
      setStatus(data);
    } catch (e: unknown) {
      setMessage({ kind: 'err', text: `Failed to load status: ${(e as Error).message}` });
    }
  };

  const refreshSchema = async () => {
    try {
      const { data } = await api.get<SchemaResponse>('/datasource/schema');
      setSchema(data);
      setMappings(data.resolvedMappings || {});
    } catch {
      setSchema(null);
    }
  };

  useEffect(() => {
    refreshStatus();
    refreshSchema();
  }, []);

  const tables = useMemo<IntrospectedTable[]>(() => schema?.schema.tables ?? [], [schema]);

  const onTest = async () => {
    if (!dsn.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const { data } = await api.post('/datasource/test', { dsn });
      setMessage({
        kind: data.ok ? 'ok' : 'err',
        text: data.ok
          ? `Connected in ${data.latencyMs}ms.`
          : `Connection failed: ${data.error}`,
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message: string };
      setMessage({ kind: 'err', text: err.response?.data?.error || err.message });
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!dsn.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.put('/datasource/config', {
        dsn,
        dialect: 'postgres',
        label: label || undefined,
      });
      setMessage({ kind: 'ok', text: 'Connection saved.' });
      setDsn('');
      await refreshStatus();
      await refreshSchema();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message: string };
      setMessage({ kind: 'err', text: err.response?.data?.error || err.message });
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await api.delete('/datasource/config');
      setMessage({ kind: 'ok', text: 'Data source disconnected — using mock data.' });
      setSchema(null);
      setMappings({});
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  const onSaveMappings = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await api.put('/datasource/mappings', { mappings });
      setMessage({ kind: 'ok', text: 'Mappings updated.' });
      await refreshSchema();
      await refreshStatus();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message: string };
      setMessage({ kind: 'err', text: err.response?.data?.error || err.message });
    } finally {
      setBusy(false);
    }
  };

  const updateMapping = (
    resource: ResourceKey,
    next: { table: string; columns: Record<string, string> } | null,
  ) => {
    setMappings((prev) => {
      const copy = { ...prev };
      if (!next) delete copy[resource];
      else copy[resource] = next;
      return copy;
    });
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Status */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Active data source</h3>
        <p className="text-sm text-gray-500 mb-4">
          The marketing-agent is currently reading from this source. Writes
          (creating campaigns, etc.) always go to the in-memory mock store —
          we do not modify your database.
        </p>
        {status ? (
          <div className="flex items-start gap-3">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full mt-2 ${
                status.degraded ? 'bg-red-500' : status.kind === 'sql' ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{status.label}</p>
              {status.detail && <p className="text-sm text-gray-500">{status.detail}</p>}
              {status.degraded && status.error && (
                <p className="text-sm text-red-600 mt-1">Error: {status.error}</p>
              )}
              {status.config.configured && (
                <p className="text-xs text-gray-400 mt-2">
                  Saved {status.config.updatedAt && new Date(status.config.updatedAt).toLocaleString()}
                  {status.config.mappedResources && status.config.mappedResources.length > 0 && (
                    <> · {status.config.mappedResources.length} resource override(s)</>
                  )}
                </p>
              )}
            </div>
            {status.config.configured && (
              <button
                onClick={onDisconnect}
                disabled={busy}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Disconnect
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Loading…</p>
        )}
      </section>

      {/* Connect */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Connect a database</h3>
        <p className="text-sm text-gray-500 mb-4">
          Paste a Postgres connection string. Once saved, the dashboard,
          campaigns, experiments, and other sections will render data from
          your DB. Tables are matched to UI resources by name; you can
          customise the mapping below after connecting.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Connection string
        </label>
        <input
          type="password"
          autoComplete="off"
          placeholder="postgres://user:password@host:5432/dbname"
          value={dsn}
          onChange={(e) => setDsn(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Label (optional)
        </label>
        <input
          type="text"
          placeholder="Production analytics DB"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="flex gap-3">
          <button
            onClick={onTest}
            disabled={busy || !dsn.trim()}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Test connection
          </button>
          <button
            onClick={onSave}
            disabled={busy || !dsn.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            Save & use
          </button>
        </div>

        {message && (
          <p
            className={`mt-3 text-sm ${
              message.kind === 'ok' ? 'text-green-700' : 'text-red-600'
            }`}
          >
            {message.text}
          </p>
        )}
      </section>

      {/* Mappings */}
      {schema && tables.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Resource mapping</h3>
              <p className="text-sm text-gray-500">
                We auto-detected the following table/column mapping from your
                schema. Override any row to change which table feeds a given
                UI section.
              </p>
            </div>
            <button
              onClick={onSaveMappings}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              Save mappings
            </button>
          </div>

          <div className="space-y-6">
            {(Object.keys(RESOURCE_LABELS) as ResourceKey[]).map((resource) => {
              const m = mappings[resource];
              const tableObj = m
                ? tables.find(
                    (t) =>
                      `${t.schema === 'public' ? '' : `${t.schema}.`}${t.name}` === m.table ||
                      t.name === m.table,
                  )
                : null;
              return (
                <div key={resource} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{RESOURCE_LABELS[resource]}</h4>
                    <select
                      value={m?.table ?? ''}
                      onChange={(e) => {
                        const table = e.target.value;
                        if (!table) return updateMapping(resource, null);
                        updateMapping(resource, { table, columns: m?.columns ?? {} });
                      }}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1"
                    >
                      <option value="">— Not mapped —</option>
                      {tables.map((t) => {
                        const qual = t.schema === 'public' ? t.name : `${t.schema}.${t.name}`;
                        return <option key={qual} value={qual}>{qual}</option>;
                      })}
                    </select>
                  </div>
                  {m && tableObj && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {RESOURCE_FIELDS[resource].map((field) => (
                        <div key={field} className="flex items-center gap-2 text-sm">
                          <span className="w-40 text-gray-600 font-mono">{field}</span>
                          <select
                            value={m.columns[field] ?? ''}
                            onChange={(e) => {
                              const col = e.target.value;
                              const cols = { ...m.columns };
                              if (col) cols[field] = col;
                              else delete cols[field];
                              updateMapping(resource, { table: m.table, columns: cols });
                            }}
                            className="flex-1 border border-gray-300 rounded-md px-2 py-1"
                          >
                            <option value="">—</option>
                            {tableObj.columns.map((c) => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
