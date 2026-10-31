import React from 'react';

const statusConfigs = {
  draft: {
    bg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    dot: 'bg-zinc-400',
  },
  quotation: {
    bg: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
  confirmed: {
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  active: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  paused: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  closed: {
    bg: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    dot: 'bg-zinc-400',
  },
  paid: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    bg: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    dot: 'bg-zinc-400',
  },
};

export default function StatusBadge({ status, isOverdue = false }) {
  const normStatus = (status || '').toLowerCase();
  
  if (isOverdue && normStatus !== 'paid' && normStatus !== 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border bg-rose-50 text-rose-700 border-rose-200 tracking-tight">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        Overdue
      </span>
    );
  }

  const config = statusConfigs[normStatus] || statusConfigs.draft;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.bg} tracking-tight`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className="capitalize">{normStatus}</span>
    </span>
  );
}
