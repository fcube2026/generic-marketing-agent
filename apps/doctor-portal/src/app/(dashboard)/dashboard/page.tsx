'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { USE_SEED, getSeedDashboardStats } from '@/lib/seed-data';

interface RecentConsultation {
  id: string;
  patientName: string;
  patientUHID?: string | null;
  scheduledAt: string;
  status: string;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
}

interface DashboardStats {
  totalPatients: number;
  todayConsultations: number;
  upcomingConsultations: number;
  inProgressConsultations: number;
  completedConsultations: number;
  pendingLabReports: number;
  totalEarnings: number;
  recentConsultations: RecentConsultation[];
}

const REFRESH_INTERVAL_MS = 30_000;

const statCards = (stats: DashboardStats) => [
  {
    label: "Today's Consultations",
    value: stats.todayConsultations,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'text-primary bg-primary-lighter',
    href: '/consultations',
  },
  {
    label: 'Total Patients',
    value: stats.totalPatients,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'text-teal bg-teal-light',
    href: '/patients',
  },
  {
    label: 'In Progress',
    value: stats.inProgressConsultations,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-amber-700 bg-amber-50',
    href: '/consultations',
  },
  {
    label: 'Pending Lab Reports',
    value: stats.pendingLabReports,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    color: 'text-purple-700 bg-purple-50',
    href: '/patients',
  },
  {
    label: 'Completed',
    value: stats.completedConsultations,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-green-700 bg-green-50',
    href: '/consultations',
  },
  {
    label: 'Total Earnings',
    value: `₹${stats.totalEarnings.toLocaleString('en-IN')}`,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-navy bg-navy-light/10',
    href: '/earnings',
  },
];

const consultationStatusCls: Record<string, string> = {
  scheduled:   'badge-blue',
  in_progress: 'badge-amber',
  completed:   'badge-green',
  cancelled:   'badge-red',
};

const quickActions = [
  { href: '/patients', label: 'Patient Records', desc: 'Search & manage patients by UHID', icon: '👥', color: 'border-teal/30 hover:border-teal bg-teal-light/20' },
  { href: '/consultations', label: 'Consultations', desc: 'View and manage all consultations', icon: '📋', color: 'border-primary/30 hover:border-primary bg-primary-lighter/30' },
  { href: '/earnings', label: 'Earnings', desc: 'Track your revenue and payouts', icon: '💰', color: 'border-amber-300 hover:border-amber-500 bg-amber-50' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState('Doctor');
  const [profileNotFound, setProfileNotFound] = useState(false);

  const recentConsultations: RecentConsultation[] = stats?.recentConsultations ?? [];

  const fetchData = useCallback(() => {
    if (USE_SEED) {
      setStats(getSeedDashboardStats());
      setLoading(false);
      return;
    }
    Promise.all([
      api.get('/providers/me/dashboard'),
      api.get('/providers/me'),
    ])
      .then(([dashRes, profileRes]) => {
        setStats(dashRes.data);
        if (profileRes.data?.name) {
          setDoctorName(profileRes.data.name);
        }
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setProfileNotFound(true);
        } else if (err?.response?.status !== 401) {
          console.error('[Doctor Dashboard] Error:', err?.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (profileNotFound) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-2xl">⚠️</div>
          <h2 className="text-lg font-semibold text-navy">Doctor profile not set up</h2>
          <p className="text-sm text-gray-500">
            Your account is registered but no doctor profile has been created yet.
            Please contact the Curex24 admin team to complete your onboarding.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Good morning, {doctorName} 👋</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {USE_SEED && (
          <span className="badge badge-teal gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
            Live Data
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats && statCards(stats).map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="stat-card hover:shadow-card-hover transition-shadow group cursor-pointer"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-navy mt-2">{card.value}</p>
            <p className="text-xs text-gray-500 group-hover:text-primary transition">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Consultations */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Recent Consultations</h2>
            <Link href="/consultations" className="text-xs font-semibold text-primary hover:underline">
              View all →
            </Link>
          </div>

          {recentConsultations.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No consultations yet</p>
          ) : (
            <div className="divide-y divide-surface-border">
              {recentConsultations.map((c) => (
                <Link
                  key={c.id}
                  href={`/patients/${c.patientUHID}/consultations/${c.id}`}
                  className="flex items-start gap-3 py-3 hover:bg-surface-muted -mx-2 px-2 rounded-lg transition group"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary-lighter text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {(c.patientName || '').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-navy group-hover:text-primary transition">{c.patientName}</span>
                      <span className="uhid-chip text-[10px]">{c.patientUHID}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {c.chiefComplaint || c.diagnosis || 'Consultation'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`badge text-[10px] ${consultationStatusCls[c.status] ?? 'badge-gray'}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(c.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="section-title">Quick Actions</h2>
          {quickActions.map((qa) => (
            <Link
              key={qa.href}
              href={qa.href}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-150 group ${qa.color}`}
            >
              <span className="text-2xl">{qa.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy group-hover:text-primary transition">{qa.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{qa.desc}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-primary transition shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

