'use client';

import { useCallback, useEffect, useState } from 'react';
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

const statusVariant: Record<string, 'warning' | 'success' | 'error' | 'info'> = {
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  PLACED: 'info',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  DELIVERED: 'success',
};

export default function PharmacyOrdersPage() {
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PharmacyOrder | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState('');
  const [items, setItems] = useState<ApprovalItemDraft[]>([
    { medicineCode: '', medicineName: '', quantity: 1, unitPrice: 0 },
  ]);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PendingResponse>('/admin/orders/prescriptions', {
        params: { page: 1, limit: 50 },
      });
      setOrders(response.data.data);
    } catch {
      setOrders([]);
      setFeedback({ type: 'error', message: 'Failed to load pending pharmacy orders.' });
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
    fetchOrders();
    fetchPartners();
  }, [fetchOrders, fetchPartners]);

  useEffect(() => {
    if (!feedback) return undefined;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const openOrder = (order: PharmacyOrder) => {
    setSelected(order);
    setPartnerId(partners[0]?.id ?? '');
    setItems([{ medicineCode: '', medicineName: '', quantity: 1, unitPrice: 0 }]);
    setNotes('');
    setRejectReason('');
  };

  const closeModal = () => {
    setSelected(null);
    setItems([{ medicineCode: '', medicineName: '', quantity: 1, unitPrice: 0 }]);
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
      await fetchOrders();
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
      await fetchOrders();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message ?? 'Failed to reject order.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const previewUrl = selected?.prescriptionUrl || selected?.prescriptionImageUrl;

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
          onClick={fetchOrders}
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
        <StatCard label="Pending Orders" value={orders.length} icon="📦" highlight />
        <StatCard label="Active Partners" value={partners.length} icon="🏪" />
      </div>

      <Card title="Pending Prescription Orders" subtitle="Each order awaits pharmacist review">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <p className="text-lg font-medium">No pending orders</p>
            <p className="mt-1 text-sm">All prescription orders have been processed.</p>
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
                    <Badge variant={statusVariant[order.status] ?? 'info'}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                    {order.notes && (
                      <span className="text-xs text-gray-500">📝 {order.notes}</span>
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

                {previewUrl ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Prescription Image
                    </p>
                    <div className="mt-2 max-h-[55vh] overflow-auto rounded-xl border border-gray-200 bg-gray-50">
                      <img
                        src={previewUrl}
                        alt="Prescription"
                        className="w-full"
                      />
                    </div>
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
                  <p className="mt-4 text-sm text-gray-500">No prescription image attached.</p>
                )}

                {selected.deliveryAddress && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Delivery Address
                    </p>
                    <p className="mt-1 text-sm text-gray-700">{selected.deliveryAddress}</p>
                  </div>
                )}
              </div>

              <div className="space-y-5 p-6">
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
                  <div className="mt-2 space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2">
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
                          onChange={(e) =>
                            updateItem(idx, { medicineName: e.target.value })
                          }
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
                  <button
                    onClick={submitReject}
                    disabled={submitting || !rejectReason.trim()}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {submitting ? 'Working…' : 'Reject'}
                  </button>
                  <button
                    onClick={submitApprove}
                    disabled={submitting}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {submitting ? 'Working…' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
