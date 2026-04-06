'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import api from '@/lib/api';

interface BookingDetail {
  id: string;
  mode: string;
  status: string;
  symptoms: string | null;
  totalFee: number;
  paymentStatus: string;
  scheduledAt: string;
  createdAt: string;
  patient?: { name: string; emergencyContact?: string };
  provider?: { name: string; specialization: string; user?: { phone: string } };
  serviceCategory?: { name: string };
  address?: { addressLine: string; city: string; state: string; pincode: string };
  statusHistory?: { status: string; changedAt: string }[];
  consultationSummary?: {
    symptoms: string | null;
    observations: string | null;
    diagnosis: string | null;
    medicinesAdvised: unknown;
    nextSteps: string | null;
    followUpRecommendation: string | null;
  } | null;
  diagnosticRequests?: { id: string; testType: string; status: string; scheduledAt: string | null }[];
  referrals?: { specialistType: string; notes: string | null; status: string }[];
  payment?: { amount: number; status: string; transactionId: string | null; paidAt: string | null };
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/bookings/${params.id}`)
      .then((res) => {
        setBooking(res.data);
      })
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-lg font-medium">Booking not found</p>
        <button onClick={() => router.push('/bookings')} className="mt-4 text-primary font-medium text-sm hover:underline">
          ← Back to Bookings
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => router.push('/bookings')} className="text-sm text-primary font-medium hover:underline mb-4 inline-block">
        ← Back to Bookings
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
          <p className="text-gray-500 text-sm font-mono mt-1">{booking.id}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Booking Info */}
        <Card title="Booking Information">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Mode</span>
              <span>{booking.mode === 'HOME_VISIT' ? '🏠 Home Visit' : '🏥 Clinic Visit'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Service</span>
              <span className="font-medium">{booking.serviceCategory?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Scheduled At</span>
              <span>{new Date(booking.scheduledAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fee</span>
              <span className="font-bold text-primary">₹{booking.totalFee}</span>
            </div>
            {booking.symptoms && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-gray-500 mb-1">Symptoms</p>
                <p className="text-gray-700">{booking.symptoms}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Patient & Provider */}
        <Card title="Patient & Provider">
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Patient</p>
              <p className="font-medium text-gray-900">{booking.patient?.name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Provider</p>
              <p className="font-medium text-gray-900">{booking.provider?.name || '—'}</p>
              <p className="text-gray-500 text-xs">{booking.provider?.specialization}</p>
            </div>
            {booking.address && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-gray-500 mb-1">Address</p>
                <p className="text-gray-700">
                  {booking.address.addressLine}, {booking.address.city}, {booking.address.state} {booking.address.pincode}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Payment */}
        <Card title="Payment">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold">₹{booking.payment?.amount ?? booking.totalFee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <StatusBadge status={booking.payment?.status || booking.paymentStatus} />
            </div>
            {booking.payment?.transactionId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-mono text-xs">{booking.payment.transactionId}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Status History */}
        <Card title="Status History">
          {booking.statusHistory && booking.statusHistory.length > 0 ? (
            <div className="space-y-3">
              {booking.statusHistory.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                  <div>
                    <StatusBadge status={h.status} />
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(h.changedAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No status history</p>
          )}
        </Card>

        {/* Consultation Summary */}
        {booking.consultationSummary && (
          <Card title="Consultation Summary" className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {booking.consultationSummary.symptoms && (
                <div>
                  <p className="text-gray-500 mb-1">Symptoms</p>
                  <p className="text-gray-800">{booking.consultationSummary.symptoms}</p>
                </div>
              )}
              {booking.consultationSummary.observations && (
                <div>
                  <p className="text-gray-500 mb-1">Observations</p>
                  <p className="text-gray-800">{booking.consultationSummary.observations}</p>
                </div>
              )}
              {booking.consultationSummary.diagnosis && (
                <div>
                  <p className="text-gray-500 mb-1">Diagnosis</p>
                  <p className="text-gray-800 font-medium">{booking.consultationSummary.diagnosis}</p>
                </div>
              )}
              {booking.consultationSummary.nextSteps && (
                <div>
                  <p className="text-gray-500 mb-1">Next Steps</p>
                  <p className="text-gray-800">{booking.consultationSummary.nextSteps}</p>
                </div>
              )}
              {booking.consultationSummary.followUpRecommendation && (
                <div className="md:col-span-2">
                  <p className="text-gray-500 mb-1">Follow-up Recommendation</p>
                  <p className="text-gray-800">{booking.consultationSummary.followUpRecommendation}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Diagnostics */}
        {booking.diagnosticRequests && booking.diagnosticRequests.length > 0 && (
          <Card title="Diagnostic Requests" className="lg:col-span-2">
            <div className="space-y-2">
              {booking.diagnosticRequests.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-sm">{d.testType}</p>
                    {d.scheduledAt && <p className="text-xs text-gray-500">Scheduled: {new Date(d.scheduledAt).toLocaleString()}</p>}
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
