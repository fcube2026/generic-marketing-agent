'use client';

import { useEffect, useMemo, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Card, { StatCard } from '@/components/ui/Card';
import api from '@/lib/api';

type PartnerStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

interface InventoryItem {
  id: string;
  medicineName: string;
  price: number;
  stock: number;
}

interface PharmacyPartner {
  id: string;
  name: string;
  licenseNumber: string;
  address: string;
  contact: string;
  operatingHours: string | null;
  status: PartnerStatus;
  licenseVerified: boolean;
  createdAt: string;
  inventory: InventoryItem[];
}

const statusVariant: Record<PartnerStatus, 'warning' | 'success' | 'error' | 'info'> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  REJECTED: 'error',
  SUSPENDED: 'info',
};

export default function PharmacyPartnersPage() {
  const [partners, setPartners] = useState<PharmacyPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const response = await api.get<PharmacyPartner[]>('/admin/pharmacy/partners');
      setPartners(response.data);
    } catch {
      setPartners([]);
      setFeedback({ type: 'error', message: 'Failed to load pharmacy partners.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const stats = useMemo(() => {
    const total = partners.length;
    const pending = partners.filter((p) => p.status === 'PENDING').length;
    const active = partners.filter((p) => p.status === 'ACTIVE').length;
    return { total, pending, active };
  }, [partners]);

  const handleApprove = async (id: string) => {
    setActionLoading(id + ':approve');
    try {
      await api.post(`/admin/pharmacy/partners/${id}/approve`);
      setPartners((current) =>
        current.map((p) => (p.id === id ? { ...p, status: 'ACTIVE' } : p)),
      );
      setFeedback({ type: 'success', message: 'Pharmacy approved successfully.' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to approve pharmacy.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id + ':reject');
    try {
      await api.post(`/admin/pharmacy/partners/${id}/reject`);
      setPartners((current) =>
        current.map((p) => (p.id === id ? { ...p, status: 'REJECTED' } : p)),
      );
      setFeedback({ type: 'success', message: 'Pharmacy rejected.' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to reject pharmacy.' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Partners</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage local pharmacy onboarding applications.
          </p>
        </div>
        <button
          onClick={fetchPartners}
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

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Applications" value={stats.total} icon="🏪" />
        <StatCard label="Pending Review" value={stats.pending} icon="⏳" highlight />
        <StatCard label="Active Pharmacies" value={stats.active} icon="✅" />
      </div>

      <Card
        title="Onboarding Applications"
        subtitle="Review and approve or reject local pharmacy registrations"
      >
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : partners.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <p className="text-lg font-medium">No applications yet</p>
            <p className="mt-1 text-sm">Pharmacy registrations will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="rounded-xl border border-gray-200 px-4 py-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{partner.name}</p>
                      <Badge variant={statusVariant[partner.status]}>
                        {partner.status}
                      </Badge>
                      {partner.licenseVerified && (
                        <Badge variant="success">License Verified</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      License: {partner.licenseNumber}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Address: {partner.address}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Contact: {partner.contact}
                    </p>
                    {partner.operatingHours && (
                      <p className="mt-0.5 text-sm text-gray-500">
                        Hours: {partner.operatingHours}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">
                      Registered {new Date(partner.createdAt).toLocaleDateString()}
                      {' · '}
                      {partner.inventory.length} inventory item(s)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {partner.inventory.length > 0 && (
                      <button
                        onClick={() =>
                          setExpanded(expanded === partner.id ? null : partner.id)
                        }
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                      >
                        {expanded === partner.id ? 'Hide Inventory' : 'View Inventory'}
                      </button>
                    )}
                    {partner.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(partner.id)}
                          disabled={actionLoading !== null}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
                        >
                          {actionLoading === partner.id + ':approve'
                            ? 'Approving...'
                            : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(partner.id)}
                          disabled={actionLoading !== null}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          {actionLoading === partner.id + ':reject'
                            ? 'Rejecting...'
                            : 'Reject'}
                        </button>
                      </>
                    )}
                    {partner.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleReject(partner.id)}
                        disabled={actionLoading !== null}
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-200 disabled:opacity-60"
                      >
                        {actionLoading === partner.id + ':reject'
                          ? 'Rejecting...'
                          : 'Reject'}
                      </button>
                    )}
                    {partner.status === 'REJECTED' && (
                      <button
                        onClick={() => handleApprove(partner.id)}
                        disabled={actionLoading !== null}
                        className="rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 transition hover:bg-green-200 disabled:opacity-60"
                      >
                        {actionLoading === partner.id + ':approve'
                          ? 'Approving...'
                          : 'Re-Approve'}
                      </button>
                    )}
                  </div>
                </div>

                {expanded === partner.id && partner.inventory.length > 0 && (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100 bg-gray-50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          <th className="px-4 py-2">Medicine</th>
                          <th className="px-4 py-2">Price (₹)</th>
                          <th className="px-4 py-2">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partner.inventory.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="px-4 py-2 text-gray-800">{item.medicineName}</td>
                            <td className="px-4 py-2 text-gray-700">₹{item.price.toFixed(2)}</td>
                            <td className="px-4 py-2">
                              <Badge variant={item.stock > 0 ? 'success' : 'error'}>
                                {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
