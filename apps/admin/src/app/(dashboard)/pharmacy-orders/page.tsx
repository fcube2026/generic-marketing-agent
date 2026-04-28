'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Card, { StatCard } from '@/components/ui/Card';
import api from '@/lib/api';

type OrderStatus = string;

interface OrderItem {
  id: string;
  medicineCode: string | null;
  medicineName: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
}

interface PharmacyOrder {
  id: string;
  orderNumber: string;
  patientProfileId: string;
  patientName?: string | null;
  patientPhone?: string | null;
  patientEmail?: string | null;
  status: OrderStatus;
  paymentStatus: string;
  prescriptionImageUrl: string | null;
  prescriptionUrl: string | null;
  uploadedPrescriptionId: string | null;
  partnerId?: string;
  partnerName: string | null;
  totalAmount: number | null;
  notes: string | null;
  createdAt: string;
  deliveryAddress: string | null;
  items: OrderItem[];
}

interface PendingResponse {
  data: PharmacyOrder[];
  total: number;
  page: number;
  limit: number;
}

interface Partner {
  id: string;
  code: string;
  name: string;
  displayName?: string | null;
  isActive: boolean;
}

interface ApprovalItemDraft {
  medicineCode: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
}

interface MedicineSearchResult {
  id: string;
  name: string;
  price: number;
  manufacturer?: string | null;
}

const statusVariant: Record<string, 'warning' | 'success' | 'error' | 'info'> = {
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  REUPLOAD_REQUIRED: 'warning',
  PLACED: 'info',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  DELIVERED: 'success',
};

type StatusFilter = 'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'REUPLOAD_REQUIRED';

const REUPLOAD_NOTE_PREFIX = '[REUPLOAD_REQUIRED]';

const displayStatus = (order: PharmacyOrder): string => {
  if (order.status === 'REJECTED' && order.notes?.startsWith(REUPLOAD_NOTE_PREFIX)) {
    return 'REUPLOAD_REQUIRED';
  }
  return order.status;
};

export default function PharmacyOrdersPage() {
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selected, setSelected] = useState<PharmacyOrder | null>(null);
  const [liveImageUrl, setLiveImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageMode, setImageMode] = useState<'image' | 'document'>('image');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState('');
  const [items, setItems] = useState<ApprovalItemDraft[]>([
    { medicineCode: '', medicineName: '', quantity: 1, unitPrice: 0 },
  ]);
  const [medicineSuggestions, setMedicineSuggestions] = useState<Record<number, MedicineSearchResult[]>>({});
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const searchDebounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchOrders = useCallback(async (filter: StatusFilter = 'ALL') => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: 1, limit: 100 };
      if (filter !== 'ALL') params.status = filter;
      const response = await api.get<PendingResponse>('/admin/orders/prescriptions/all', { params });
      setOrders(response.data.data);
    } catch {
      setOrders([]);
      setFeedback({ type: 'error', message: 'Failed to load pharmacy orders.' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPartners = useCallback(async () => {
    try {
      const response = await api.get<Partner[]>('/pharmacy/partners');
      const list = Array.isArray(response.data) ? response.data : [];
      setPartners(list.filter((p) => p.isActive !== false));
    } catch {
      setPartners([]);
    }
  }, []);

  useEffect(() => {
    fetchOrders(statusFilter);
    fetchPartners();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrders, fetchPartners]);

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    fetchOrders(filter);
  };

  useEffect(() => {
    if (!feedback) return undefined;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  useEffect(() => {
    return () => {
      Object.values(searchDebounceRef.current).forEach((timerId) => clearTimeout(timerId));
    };
  }, []);

  const openOrder = async (order: PharmacyOrder) => {
    setSelected(order);
    setLiveImageUrl(null);
    setPartnerId(partners[0]?.id ?? '');
    setItems([{ medicineCode: '', medicineName: '', quantity: 1, unitPrice: 0 }]);
    setMedicineSuggestions({});
    setSearchingIndex(null);
    setNotes('');
    setRejectReason('');
    setImageMode('image');
    // Fetch a fresh signed URL immediately
    setLoadingImage(true);
    try {
      const res = await api.get<{ url: string }>(`/admin/orders/prescriptions/${order.id}/image`);
      setLiveImageUrl(res.data.url || null);
    } catch {
      setLiveImageUrl(null);
    } finally {
      setLoadingImage(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setLiveImageUrl(null);
    setImageMode('image');
    setItems([{ medicineCode: '', medicineName: '', quantity: 1, unitPrice: 0 }]);
    setMedicineSuggestions({});
    setSearchingIndex(null);
    setNotes('');
    setRejectReason('');
  };

  const addItemRow = () =>
    setItems((current) => [
      ...current,
      { medicineCode: '', medicineName: '', quantity: 1, unitPrice: 0 },
    ]);

  const removeItemRow = (index: number) =>
    setItems((current) => current.filter((_, i) => i !== index));

  const updateItem = (index: number, patch: Partial<ApprovalItemDraft>) =>
    setItems((current) =>
      current.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );

  const selectedPartnerCode = partners.find((p) => p.id === partnerId)?.code;

  const searchMedicinesForRow = async (index: number, query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setMedicineSuggestions((current) => ({ ...current, [index]: [] }));
      setSearchingIndex((current) => (current === index ? null : current));
      return;
    }

    setSearchingIndex(index);
    try {
      const params: Record<string, string> = { query: trimmed };
      if (selectedPartnerCode) {
        params.partner = selectedPartnerCode;
      }
      const response = await api.get<MedicineSearchResult[]>('/pharmacy/medicines/search', { params });
      const list = Array.isArray(response.data) ? response.data : [];
      setMedicineSuggestions((current) => ({ ...current, [index]: list.slice(0, 8) }));
    } catch {
      setMedicineSuggestions((current) => ({ ...current, [index]: [] }));
    } finally {
      setSearchingIndex((current) => (current === index ? null : current));
    }
  };

  const scheduleMedicineSearch = (index: number, query: string) => {
    if (searchDebounceRef.current[index]) {
      clearTimeout(searchDebounceRef.current[index]);
    }
    searchDebounceRef.current[index] = setTimeout(() => {
      void searchMedicinesForRow(index, query);
    }, 350);
  };

  const applySuggestion = (index: number, medicine: MedicineSearchResult) => {
    updateItem(index, {
      medicineCode: medicine.id,
      medicineName: medicine.name,
      unitPrice: typeof medicine.price === 'number' ? medicine.price : 0,
    });
    setMedicineSuggestions((current) => ({ ...current, [index]: [] }));
  };

  const submitApprove = async () => {
    if (!selected) return;
    if (!partnerId) {
      setFeedback({ type: 'error', message: 'Please select a pharmacy partner.' });
      return;
    }
    const cleanItems = items.filter((it) => it.medicineName.trim().length > 0);
    if (cleanItems.length === 0) {
      setFeedback({ type: 'error', message: 'Add at least one medicine line item.' });
      return;
    }
    if (cleanItems.some((it) => Number(it.unitPrice) <= 0)) {
      setFeedback({
        type: 'error',
        message: 'Each medicine must have unit price > 0. Select from suggestions or enter price manually.',
      });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/admin/orders/prescriptions/${selected.id}/approve`, {
        partnerId,
        items: cleanItems.map((it) => ({
          medicineCode: it.medicineCode || it.medicineName,
          medicineName: it.medicineName,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
        })),
        notes: notes || undefined,
      });
      setFeedback({ type: 'success', message: 'Order approved.' });
      closeModal();
      await fetchOrders(statusFilter);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message:
          err?.response?.data?.message ?? 'Failed to approve order.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a rejection reason.' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/admin/orders/prescriptions/${selected.id}/reject`, {
        reason: rejectReason.trim(),
      });
      setFeedback({ type: 'success', message: 'Order rejected.' });
      closeModal();
      await fetchOrders(statusFilter);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message ?? 'Failed to reject order.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReupload = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      setFeedback({ type: 'error', message: 'Please enter reupload reason.' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/admin/orders/prescriptions/${selected.id}/reupload`, {
        reason: rejectReason.trim(),
      });
      setFeedback({ type: 'success', message: 'Marked as reupload required.' });
      closeModal();
      await fetchOrders(statusFilter);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message ?? 'Failed to mark reupload required.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const previewUrl = liveImageUrl || selected?.prescriptionUrl || selected?.prescriptionImageUrl;
  const isPending = selected?.status === 'PENDING_APPROVAL';
  const pendingCount = orders.filter((o) => o.status === 'PENDING_APPROVAL').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Order Approvals</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review prescription-only pharmacy orders, set medicines &amp; pricing, then approve or reject.
          </p>
        </div>
        <button
          onClick={() => fetchOrders(statusFilter)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Pending Orders" value={pendingCount} icon="📦" highlight />
        <StatCard label="Active Partners" value={partners.length} icon="🏪" />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REUPLOAD_REQUIRED'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              statusFilter === f
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'ALL' ? 'All' : f.replace(/_/g, ' ')}
            {f === 'PENDING_APPROVAL' && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card
        title={statusFilter === 'ALL' ? 'All Prescription Orders' : `${statusFilter.replace(/_/g, ' ')} Orders`}
        subtitle={`${orders.length} order${orders.length !== 1 ? 's' : ''}`}
      >
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <p className="text-lg font-medium">No orders</p>
            <p className="mt-1 text-sm">No prescription orders found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">#{order.orderNumber}</p>
                    <Badge variant={statusVariant[displayStatus(order)] ?? 'info'}>
                      {displayStatus(order).replace(/_/g, ' ')}
                    </Badge>
                    {order.notes && (
                      <span className="text-xs text-gray-500">📝 {order.notes.replace(REUPLOAD_NOTE_PREFIX, '').trim()}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Created {new Date(order.createdAt).toLocaleString()}
                    {order.deliveryAddress && ` · ${order.deliveryAddress}`}
                  </p>
                </div>
                <button
                  onClick={() => openOrder(order)}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white shadow-xl">
            <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
              <div className="border-b border-gray-100 p-6 lg:border-b-0 lg:border-r">
                <h2 className="text-xl font-bold text-gray-900">Order #{selected.orderNumber}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Created {new Date(selected.createdAt).toLocaleString()}
                </p>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Prescription Image
                  </p>
                  {loadingImage ? (
                    <div className="mt-2 flex h-24 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                    </div>
                  ) : previewUrl ? (
                    <div className="mt-2">
                      {imageMode === 'image' ? (
                        <div className="max-h-[55vh] overflow-auto rounded-xl border border-gray-200 bg-gray-50">
                          <img
                            src={previewUrl}
                            alt="Prescription"
                            className="w-full"
                            onError={() => setImageMode('document')}
                          />
                        </div>
                      ) : (
                        <div className="h-[55vh] overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                          <iframe
                            src={previewUrl}
                            title="Prescription Document"
                            className="h-full w-full"
                          />
                        </div>
                      )}
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                      >
                        Open in new tab ↗
                      </a>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No prescription image attached.</p>
                  )}
                </div>

                {selected.deliveryAddress && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Delivery Address
                    </p>
                    <p className="mt-1 text-sm text-gray-700">{selected.deliveryAddress}</p>
                  </div>
                )}

                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Patient Details
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    Name: {selected.patientName || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-700">
                    Phone: {selected.patientPhone || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-700">
                    Email: {selected.patientEmail || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-6">
                {!isPending && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm font-medium text-gray-600">
                      This order has already been{' '}
                      <span className={selected?.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}>
                        {selected?.status?.toLowerCase()}
                      </span>
                      . View-only mode.
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Pharmacy Partner
                  </label>
                  <select
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select partner…</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.displayName || p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Medicine Items
                    </label>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      + Add row
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Type at least 2 letters in medicine name to search from provider catalog and auto-fill price.
                  </p>
                  <div className="mt-2 space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="grid grid-cols-12 gap-2">
                          <input
                            placeholder="Code"
                            value={item.medicineCode}
                            onChange={(e) =>
                              updateItem(idx, { medicineCode: e.target.value })
                            }
                            className="col-span-3 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          />
                          <input
                            placeholder="Medicine name"
                            value={item.medicineName}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateItem(idx, { medicineName: value });
                              scheduleMedicineSearch(idx, value);
                            }}
                            className="col-span-4 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          />
                          <input
                            type="number"
                            min={1}
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(idx, { quantity: Number(e.target.value) })
                            }
                            className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          />
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="Unit ₹"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(idx, { unitPrice: Number(e.target.value) })
                            }
                            className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="col-span-1 text-sm text-red-500 hover:text-red-700"
                            aria-label="Remove row"
                          >
                            ✕
                          </button>
                        </div>

                        {searchingIndex === idx && (
                          <p className="text-xs text-gray-400">Searching medicines...</p>
                        )}

                        {(medicineSuggestions[idx] ?? []).length > 0 && (
                          <div className="max-h-40 overflow-auto rounded-md border border-gray-200 bg-white">
                            {(medicineSuggestions[idx] ?? []).map((medicine) => (
                              <button
                                key={medicine.id}
                                type="button"
                                onClick={() => applySuggestion(idx, medicine)}
                                className="flex w-full items-center justify-between border-b border-gray-100 px-3 py-2 text-left hover:bg-gray-50"
                              >
                                <span className="truncate pr-3 text-sm text-gray-700">
                                  {medicine.name}
                                  {medicine.manufacturer ? ` · ${medicine.manufacturer}` : ''}
                                </span>
                                <span className="text-xs font-semibold text-primary">₹{medicine.price}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Approval Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="border-t pt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Reject Reason
                  </label>
                  <textarea
                    rows={2}
                    placeholder="If rejecting, explain why"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    onClick={closeModal}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Close
                  </button>
                  {isPending && (
                    <>
                      <button
                        onClick={submitReject}
                        disabled={submitting || !rejectReason.trim()}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {submitting ? 'Working…' : 'Reject'}
                      </button>
                      <button
                        onClick={submitReupload}
                        disabled={submitting || !rejectReason.trim()}
                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {submitting ? 'Working…' : 'Reupload'}
                      </button>
                      <button
                        onClick={submitApprove}
                        disabled={submitting}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {submitting ? 'Working…' : 'Approve'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
