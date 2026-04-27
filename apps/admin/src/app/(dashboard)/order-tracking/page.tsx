'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Card, { StatCard } from '@/components/ui/Card';
import api from '@/lib/api';

type FlowFilter = 'MEDICINE' | 'PRESCRIPTION';

type TrackingStatus =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'DISPATCHED'
  | 'PRESCRIPTION_REVIEW'
  | 'CONFIRMED'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED'
  | string;

interface TrackingEvent {
  status: TrackingStatus;
  timestamp: string;
  source: string | null;
  actorId: string | null;
  actorRole: string | null;
  actorLabel: string | null;
}

interface TrackingOrderItem {
  id: string;
  medicineCode: string | null;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface TrackingOrder {
  id: string;
  orderNumber: string;
  patientName: string | null;
  patientPhone: string | null;
  patientEmail: string | null;
  flow: FlowFilter;
  status: TrackingStatus;
  paymentStatus: 'UNPAID' | 'PAID';
  partnerName: string | null;
  totalAmount: number | null;
  subtotal: number | null;
  deliveryFee: number | null;
  deliveryAddress: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  prescriptionUrl: string | null;
  prescriptionImageUrl: string | null;
  uploadedPrescriptionId: string | null;
  items: TrackingOrderItem[];
  timeline: TrackingEvent[];
  timestamps: {
    createdAt: string;
    approvedAt: string | null;
    rejectedAt: string | null;
    paidAt: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
  };
  prescriptionReview: {
    status: string | null;
    notes: string | null;
    reviewedBy: string | null;
    reviewedByRole: string | null;
    reviewedAt: string | null;
  } | null;
}

interface TrackingResponse {
  data: TrackingOrder[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  PENDING: 'warning',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  PAID: 'success',
  DISPATCHED: 'info',
  PRESCRIPTION_REVIEW: 'warning',
  CONFIRMED: 'info',
  PACKED: 'info',
  SHIPPED: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  CANCELLED: 'error',
  RETURNED: 'error',
  REFUNDED: 'error',
};

const STATUS_OPTIONS = [
  'ALL',
  'PENDING',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'PAID',
  'DISPATCHED',
  'PRESCRIPTION_REVIEW',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
] as const;

const PAYMENT_OPTIONS = ['ALL', 'UNPAID', 'PAID'] as const;

function formatCurrency(value: number | null): string {
  if (typeof value !== 'number') return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function OrderTrackingPage() {
  const [flow, setFlow] = useState<FlowFilter>('MEDICINE');
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [paymentStatus, setPaymentStatus] = useState<(typeof PAYMENT_OPTIONS)[number]>('ALL');
  const [patientQuery, setPatientQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<TrackingOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [combinedTotal, setCombinedTotal] = useState(0);
  const [selected, setSelected] = useState<TrackingOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        flow,
        page: 1,
        limit: 25,
      };

      if (status !== 'ALL') params.status = status;
      if (paymentStatus !== 'ALL') params.paymentStatus = paymentStatus;
      if (patientQuery.trim()) params.patientQuery = patientQuery.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const response = await api.get<TrackingResponse>('/admin/orders/tracking', {
        params,
      });

      const rows = Array.isArray(response.data.data) ? response.data.data : [];
      setOrders(rows);
      setTotal(response.data.total || 0);

      if (rows.length === 0) {
        setSelected(null);
      } else if (!selected || !rows.some((row) => row.id === selected.id)) {
        setSelected(rows[0]);
      }
    } catch {
      setOrders([]);
      setSelected(null);
      setError('Failed to load order tracking data.');
    } finally {
      setLoading(false);
    }
  }, [flow, status, paymentStatus, patientQuery, fromDate, toDate, selected]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  // Fetch combined total across both Medicine and Prescription flows so the
  // "Total Orders" stat reflects the sum regardless of which flow tab is active.
  // Other filters (status, payment, patient, dates) are still respected.
  useEffect(() => {
    let cancelled = false;

    const buildParams = (flowValue: FlowFilter): Record<string, string | number> => {
      const params: Record<string, string | number> = {
        flow: flowValue,
        page: 1,
        limit: 1,
      };
      if (status !== 'ALL') params.status = status;
      if (paymentStatus !== 'ALL') params.paymentStatus = paymentStatus;
      if (patientQuery.trim()) params.patientQuery = patientQuery.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      return params;
    };

    const fetchCombinedTotal = async () => {
      try {
        const [medicineRes, prescriptionRes] = await Promise.all([
          api.get<TrackingResponse>('/admin/orders/tracking', { params: buildParams('MEDICINE') }),
          api.get<TrackingResponse>('/admin/orders/tracking', { params: buildParams('PRESCRIPTION') }),
        ]);
        if (cancelled) return;
        const medicineTotal = medicineRes.data.total || 0;
        const prescriptionTotal = prescriptionRes.data.total || 0;
        setCombinedTotal(medicineTotal + prescriptionTotal);
      } catch {
        if (!cancelled) setCombinedTotal(0);
      }
    };

    void fetchCombinedTotal();

    return () => {
      cancelled = true;
    };
  }, [status, paymentStatus, patientQuery, fromDate, toDate]);

  const flowCounts = useMemo(() => {
    const medicineCount = orders.filter((order) => order.flow === 'MEDICINE').length;
    const prescriptionCount = orders.filter((order) => order.flow === 'PRESCRIPTION').length;
    return { medicineCount, prescriptionCount };
  }, [orders]);

  return (
    <div className="space-y-6" data-testid="order-tracking-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Tracking &amp; History</h1>
          <p className="mt-1 text-sm text-gray-500">
            Unified admin visibility for medicine orders and prescription-based orders.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Orders" value={combinedTotal} icon="📦" />
        <StatCard label="Medicine Orders (Current View)" value={flowCounts.medicineCount} icon="💊" />
        <StatCard label="Prescription Orders (Current View)" value={flowCounts.prescriptionCount} icon="🧾" />
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['MEDICINE', 'PRESCRIPTION'] as FlowFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFlow(value)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  flow === value
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {value === 'MEDICINE' ? 'Medicine Orders' : 'Prescription Orders'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <input
              value={patientQuery}
              onChange={(event) => setPatientQuery(event.target.value)}
              placeholder="Search by order/patient/phone/email"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm xl:col-span-2"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as (typeof STATUS_OPTIONS)[number])}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll('_', ' ')}
                </option>
              ))}
            </select>

            <select
              value={paymentStatus}
              onChange={(event) =>
                setPaymentStatus(event.target.value as (typeof PAYMENT_OPTIONS)[number])
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchOrders()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus('ALL');
                setPaymentStatus('ALL');
                setPatientQuery('');
                setFromDate('');
                setToDate('');
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card title="Orders" subtitle={`${flow === 'MEDICINE' ? 'Medicine' : 'Prescription'} flow list`} className="xl:col-span-3">
          {loading ? (
            <p className="text-sm text-gray-500">Loading orders...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-500">No orders found for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-2 pr-3 font-medium">Order</th>
                    <th className="pb-2 pr-3 font-medium">Patient</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 pr-3 font-medium">Payment</th>
                    <th className="pb-2 pr-3 font-medium">Total</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelected(order)}
                      className={`cursor-pointer border-b border-gray-100 align-top transition hover:bg-gray-50 ${
                        selected?.id === order.id ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">{order.items.length} item(s)</p>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-medium text-gray-800">{order.patientName || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{order.patientPhone || order.patientEmail || 'N/A'}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant={STATUS_VARIANT[order.status] || 'default'}>
                          {order.status.replaceAll('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant={order.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                          {order.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 text-gray-700">{formatCurrency(order.totalAmount)}</td>
                      <td className="py-3 text-gray-600">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Order Details" subtitle="Lifecycle and audit timeline" className="xl:col-span-2">
          {!selected ? (
            <p className="text-sm text-gray-500">Select an order to view full history.</p>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">{selected.orderNumber}</p>
                <p className="text-xs text-gray-500">
                  {selected.patientName || 'Unknown Patient'} | {selected.patientPhone || selected.patientEmail || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">Partner: {selected.partnerName || 'Not assigned'}</p>
                <p className="text-xs text-gray-500">Address: {selected.deliveryAddress || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <p>Created: {formatDate(selected.timestamps.createdAt)}</p>
                <p>Approved: {formatDate(selected.timestamps.approvedAt)}</p>
                <p>Rejected: {formatDate(selected.timestamps.rejectedAt)}</p>
                <p>Paid: {formatDate(selected.timestamps.paidAt)}</p>
                <p>Dispatched: {formatDate(selected.timestamps.dispatchedAt)}</p>
                <p>Delivered: {formatDate(selected.timestamps.deliveredAt)}</p>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pricing</p>
                <p className="mt-1 text-sm text-gray-700">Subtotal: {formatCurrency(selected.subtotal)}</p>
                <p className="text-sm text-gray-700">Delivery: {formatCurrency(selected.deliveryFee)}</p>
                <p className="text-sm font-semibold text-gray-900">Total: {formatCurrency(selected.totalAmount)}</p>
              </div>

              {selected.flow === 'PRESCRIPTION' && selected.prescriptionReview && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
                  <p className="font-semibold">Prescription Review</p>
                  <p>Status: {selected.prescriptionReview.status || 'N/A'}</p>
                  <p>Reviewed by: {selected.prescriptionReview.reviewedBy || 'N/A'}</p>
                  <p>Role: {selected.prescriptionReview.reviewedByRole || 'N/A'}</p>
                  <p>Reviewed at: {formatDate(selected.prescriptionReview.reviewedAt)}</p>
                  <p>Notes: {selected.prescriptionReview.notes || 'N/A'}</p>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Ordered Medicines</p>
                {selected.items.length === 0 ? (
                  <p className="text-xs text-gray-500">No medicine items added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-gray-200 p-2 text-xs text-gray-700">
                        <p className="font-medium text-gray-900">{item.medicineName}</p>
                        <p>
                          Qty: {item.quantity} | Unit: {formatCurrency(item.unitPrice)} | Total: {formatCurrency(item.totalPrice)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Timeline</p>
                {selected.timeline.length === 0 ? (
                  <p className="text-xs text-gray-500">No lifecycle events found.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.timeline.map((event, index) => (
                      <div key={`${event.status}-${event.timestamp}-${index}`} className="rounded-lg border border-gray-200 p-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={STATUS_VARIANT[event.status] || 'default'}>
                            {event.status.replaceAll('_', ' ')}
                          </Badge>
                          <span className="text-gray-500">{formatDate(event.timestamp)}</span>
                        </div>
                        <p className="mt-1 text-gray-600">
                          Actor: {event.actorLabel || event.actorId || 'System'}
                          {event.actorRole ? ` (${event.actorRole})` : ''}
                        </p>
                        <p className="text-gray-500">Source: {event.source || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
