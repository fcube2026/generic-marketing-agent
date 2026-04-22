'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
type SubscriptionCategory =
  | 'INFRASTRUCTURE'
  | 'AI'
  | 'COMMUNICATION'
  | 'VERIFICATION'
  | 'DEV_TOOLS'
  | 'PHARMACY'
  | 'OTHER';
type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONE_TIME';

interface UsageLog {
  id: string;
  periodStart: string;
  periodEnd: string;
  plannedAmount: number;
  actualAmount: number;
  usageConsumed: number | null;
  usageLimit: number | null;
  usageUnit: string | null;
  createdAt: string;
}

interface SubscriptionItem {
  id: string;
  name: string;
  provider: string;
  category: SubscriptionCategory;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currency: string;
  plannedAmount: number;
  actualAmount: number;
  usageLimit: number | null;
  usageConsumed: number | null;
  usageUnit: string | null;
  seatsPlanned: number | null;
  seatsUsed: number | null;
  planStartDate: string | null;
  planEndDate: string | null;
  renewalDate: string | null;
  reminderDays: number;
  alertEmail: string | null;
  notes: string | null;
  usageLogs: UsageLog[];
}

interface Summary {
  totalSubscriptions: number;
  totalPlanned: number;
  totalActual: number;
  variance: number;
  upcomingRenewals: number;
}

const emptyForm = {
  name: '',
  provider: '',
  category: 'OTHER' as SubscriptionCategory,
  status: 'ACTIVE' as SubscriptionStatus,
  billingCycle: 'MONTHLY' as BillingCycle,
  currency: 'INR',
  plannedAmount: '0',
  actualAmount: '0',
  usageLimit: '',
  usageConsumed: '',
  usageUnit: '',
  seatsPlanned: '',
  seatsUsed: '',
  planStartDate: '',
  planEndDate: '',
  renewalDate: '',
  reminderDays: '7',
  alertEmail: '',
  notes: '',
};

const emptyUsageForm = {
  periodStart: '',
  periodEnd: '',
  plannedAmount: '',
  actualAmount: '',
  usageLimit: '',
  usageConsumed: '',
  usageUnit: '',
  seatsPlanned: '',
  seatsUsed: '',
  notes: '',
};

function formatCurrency(value: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function toInputDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export default function SubscriptionsPage() {
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [usageTargetId, setUsageTargetId] = useState<string | null>(null);
  const [usageForm, setUsageForm] = useState(emptyUsageForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, listRes] = await Promise.all([
        api.get('/admin/subscriptions/summary'),
        api.get('/admin/subscriptions', {
          params: statusFilter === 'ALL' ? undefined : { status: statusFilter },
        }),
      ]);
      setSummary(summaryRes.data);
      setItems(listRes.data);
    } catch (error) {
      console.error('Failed to fetch subscriptions', error);
      setSummary(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const upcoming = useMemo(
    () =>
      items
        .filter((item) => item.renewalDate || item.planEndDate)
        .sort((a, b) => {
          const aTs = new Date(a.renewalDate || a.planEndDate || '').getTime();
          const bTs = new Date(b.renewalDate || b.planEndDate || '').getTime();
          return aTs - bTs;
        })
        .slice(0, 5),
    [items],
  );

  const resetCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (item: SubscriptionItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      provider: item.provider,
      category: item.category,
      status: item.status,
      billingCycle: item.billingCycle,
      currency: item.currency,
      plannedAmount: String(item.plannedAmount ?? 0),
      actualAmount: String(item.actualAmount ?? 0),
      usageLimit: item.usageLimit?.toString() || '',
      usageConsumed: item.usageConsumed?.toString() || '',
      usageUnit: item.usageUnit || '',
      seatsPlanned: item.seatsPlanned?.toString() || '',
      seatsUsed: item.seatsUsed?.toString() || '',
      planStartDate: toInputDate(item.planStartDate),
      planEndDate: toInputDate(item.planEndDate),
      renewalDate: toInputDate(item.renewalDate),
      reminderDays: String(item.reminderDays),
      alertEmail: item.alertEmail || '',
      notes: item.notes || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const parseOptionalNumber = (value: string) =>
    value.trim() === '' ? undefined : Number(value);

  const buildPayload = () => ({
    name: form.name,
    provider: form.provider,
    category: form.category,
    status: form.status,
    billingCycle: form.billingCycle,
    currency: form.currency,
    plannedAmount: Number(form.plannedAmount || 0),
    actualAmount: Number(form.actualAmount || 0),
    usageLimit: parseOptionalNumber(form.usageLimit),
    usageConsumed: parseOptionalNumber(form.usageConsumed),
    usageUnit: form.usageUnit || undefined,
    seatsPlanned: parseOptionalNumber(form.seatsPlanned),
    seatsUsed: parseOptionalNumber(form.seatsUsed),
    planStartDate: form.planStartDate || undefined,
    planEndDate: form.planEndDate || undefined,
    renewalDate: form.renewalDate || undefined,
    reminderDays: Number(form.reminderDays || 7),
    alertEmail: form.alertEmail || undefined,
    notes: form.notes || undefined,
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        await api.put(`/admin/subscriptions/${editingId}`, payload);
      } else {
        await api.post('/admin/subscriptions', payload);
      }
      closeForm();
      await fetchData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    const ok = confirm('Delete this subscription record?');
    if (!ok) return;

    try {
      await api.delete(`/admin/subscriptions/${id}`);
      await fetchData();
    } catch {
      alert('Delete failed');
    }
  };

  const openUsageModal = (id: string) => {
    setUsageTargetId(id);
    setUsageForm(emptyUsageForm);
  };

  const closeUsageModal = () => {
    setUsageTargetId(null);
    setUsageForm(emptyUsageForm);
  };

  const submitUsage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!usageTargetId) return;

    try {
      await api.post(`/admin/subscriptions/${usageTargetId}/usage-logs`, {
        periodStart: usageForm.periodStart,
        periodEnd: usageForm.periodEnd,
        plannedAmount: parseOptionalNumber(usageForm.plannedAmount),
        actualAmount: parseOptionalNumber(usageForm.actualAmount),
        usageLimit: parseOptionalNumber(usageForm.usageLimit),
        usageConsumed: parseOptionalNumber(usageForm.usageConsumed),
        usageUnit: usageForm.usageUnit || undefined,
        seatsPlanned: parseOptionalNumber(usageForm.seatsPlanned),
        seatsUsed: parseOptionalNumber(usageForm.seatsUsed),
        notes: usageForm.notes || undefined,
      });
      closeUsageModal();
      await fetchData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to add usage log');
    }
  };

  const getStatusClass = (status: SubscriptionStatus) => {
    if (status === 'ACTIVE') return 'bg-green-100 text-green-700';
    if (status === 'TRIAL') return 'bg-blue-100 text-blue-700';
    if (status === 'PAUSED') return 'bg-yellow-100 text-yellow-700';
    if (status === 'EXPIRED') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading subscriptions...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions & API Cost Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track planned vs actual spend, usage, renewal dates, and reminder alerts.
          </p>
        </div>
        <button
          onClick={resetCreateForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add Subscription
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500">Planned Monthly</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatCurrency(summary?.totalPlanned || 0)}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500">Actual Monthly</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatCurrency(summary?.totalActual || 0)}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500">Variance</p>
          <p
            className={`text-xl font-semibold ${(summary?.variance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}
          >
            {formatCurrency(summary?.variance || 0)}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500">Renewals (Next 7 Days)</p>
          <p className="text-xl font-semibold text-gray-900">{summary?.upcomingRenewals || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border rounded-xl overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900">All Subscriptions</h2>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="px-3 py-2 text-sm border rounded-lg"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="PAUSED">Paused</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {items.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No subscriptions tracked yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Service</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Planned</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Actual</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Renewal</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.provider}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatCurrency(item.plannedAmount, item.currency)}</td>
                      <td className="px-4 py-3">{formatCurrency(item.actualAmount, item.currency)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {(item.renewalDate || item.planEndDate)
                          ? new Date(item.renewalDate || item.planEndDate || '').toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEditForm(item)}
                            className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openUsageModal(item.id)}
                            className="px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          >
                            Add Usage
                          </button>
                          <button
                            onClick={() => onDelete(item.id)}
                            className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Upcoming Renewals</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming renewals.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((item) => {
                const date = item.renewalDate || item.planEndDate;
                return (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.provider}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Due: {date ? new Date(date).toLocaleDateString('en-IN') : '—'}
                    </div>
                    <div className="text-xs text-gray-600">
                      Reminder Window: {item.reminderDays} day(s)
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl">
              <form onSubmit={onSubmit}>
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingId ? 'Edit Subscription' : 'Add Subscription'}
                  </h2>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Service name (e.g. Vercel Pro)"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    required
                    value={form.provider}
                    onChange={(event) => setForm((prev) => ({ ...prev, provider: event.target.value }))}
                    placeholder="Provider (e.g. Vercel)"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />

                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, category: event.target.value as SubscriptionCategory }))
                    }
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="INFRASTRUCTURE">Infrastructure</option>
                    <option value="AI">AI</option>
                    <option value="COMMUNICATION">Communication</option>
                    <option value="VERIFICATION">Verification</option>
                    <option value="DEV_TOOLS">Dev Tools</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="OTHER">Other</option>
                  </select>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, status: event.target.value as SubscriptionStatus }))
                    }
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="TRIAL">Trial</option>
                    <option value="PAUSED">Paused</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="EXPIRED">Expired</option>
                  </select>

                  <select
                    value={form.billingCycle}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, billingCycle: event.target.value as BillingCycle }))
                    }
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="ONE_TIME">One Time</option>
                  </select>

                  <input
                    value={form.currency}
                    onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                    placeholder="Currency (INR, USD...)"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />

                  <input
                    type="number"
                    min="0"
                    value={form.plannedAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, plannedAmount: event.target.value }))}
                    placeholder="Planned amount"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    value={form.actualAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, actualAmount: event.target.value }))}
                    placeholder="Actual amount"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />

                  <input
                    type="number"
                    min="0"
                    value={form.usageLimit}
                    onChange={(event) => setForm((prev) => ({ ...prev, usageLimit: event.target.value }))}
                    placeholder="Usage limit"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    value={form.usageConsumed}
                    onChange={(event) => setForm((prev) => ({ ...prev, usageConsumed: event.target.value }))}
                    placeholder="Usage consumed"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />

                  <input
                    value={form.usageUnit}
                    onChange={(event) => setForm((prev) => ({ ...prev, usageUnit: event.target.value }))}
                    placeholder="Usage unit (tokens, calls, reqs)"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={form.reminderDays}
                    onChange={(event) => setForm((prev) => ({ ...prev, reminderDays: event.target.value }))}
                    placeholder="Reminder days"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />

                  <input
                    type="date"
                    value={form.planStartDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, planStartDate: event.target.value }))}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={form.planEndDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, planEndDate: event.target.value }))}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />

                  <input
                    type="date"
                    value={form.renewalDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, renewalDate: event.target.value }))}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="email"
                    value={form.alertEmail}
                    onChange={(event) => setForm((prev) => ({ ...prev, alertEmail: event.target.value }))}
                    placeholder="Alert email (Zoho inbox)"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />

                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Notes"
                    className="md:col-span-2 px-3 py-2 border rounded-lg text-sm min-h-24"
                  />
                </div>

                <div className="px-6 py-4 border-t flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {usageTargetId && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white rounded-xl shadow-xl">
              <form onSubmit={submitUsage}>
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Add Usage Snapshot</h2>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    required
                    type="date"
                    value={usageForm.periodStart}
                    onChange={(event) =>
                      setUsageForm((prev) => ({ ...prev, periodStart: event.target.value }))
                    }
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    required
                    type="date"
                    value={usageForm.periodEnd}
                    onChange={(event) =>
                      setUsageForm((prev) => ({ ...prev, periodEnd: event.target.value }))
                    }
                    className="px-3 py-2 border rounded-lg text-sm"
                  />

                  <input
                    type="number"
                    min="0"
                    value={usageForm.plannedAmount}
                    onChange={(event) =>
                      setUsageForm((prev) => ({ ...prev, plannedAmount: event.target.value }))
                    }
                    placeholder="Planned amount"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    value={usageForm.actualAmount}
                    onChange={(event) =>
                      setUsageForm((prev) => ({ ...prev, actualAmount: event.target.value }))
                    }
                    placeholder="Actual amount"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />

                  <input
                    type="number"
                    min="0"
                    value={usageForm.usageLimit}
                    onChange={(event) =>
                      setUsageForm((prev) => ({ ...prev, usageLimit: event.target.value }))
                    }
                    placeholder="Usage limit"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    value={usageForm.usageConsumed}
                    onChange={(event) =>
                      setUsageForm((prev) => ({ ...prev, usageConsumed: event.target.value }))
                    }
                    placeholder="Usage consumed"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />

                  <input
                    value={usageForm.usageUnit}
                    onChange={(event) =>
                      setUsageForm((prev) => ({ ...prev, usageUnit: event.target.value }))
                    }
                    placeholder="Usage unit"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />

                  <textarea
                    value={usageForm.notes}
                    onChange={(event) => setUsageForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Notes"
                    className="md:col-span-2 px-3 py-2 border rounded-lg text-sm min-h-20"
                  />
                </div>

                <div className="px-6 py-4 border-t flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeUsageModal}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                  >
                    Save Usage
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
