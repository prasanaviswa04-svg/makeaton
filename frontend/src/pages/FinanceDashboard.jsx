import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  TrendingUp,
  DollarSign,
  AlertCircle,
  Send,
  Zap,
  Filter,
  RefreshCw,
  Check,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function FinanceDashboard({ onNavigateToBilling }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');

  // Lookup lists for filters
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);

  // Chasing action feedback
  const [chasingId, setChasingId] = useState(null);
  const [chaseFeedback, setChaseFeedback] = useState(null);

  // Benchmark status
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (customerId) params.customer_id = customerId;
      if (planId) params.plan_id = planId;

      const res = await api.get('/finance/dashboard', { params });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load finance dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/users/customers').then((r) => setCustomers(r.data)).catch(() => {});
    api.get('/plans').then((r) => setPlans(r.data)).catch(() => {});
    fetchDashboard();
  }, []);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchDashboard();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCustomerId('');
    setPlanId('');
    setTimeout(() => {
      api.get('/finance/dashboard').then((r) => setData(r.data));
    }, 50);
  };

  const handleChaseInvoice = async (invoiceId) => {
    setChasingId(invoiceId);
    setChaseFeedback(null);
    try {
      const res = await api.post(`/finance/chase/${invoiceId}`);
      setChaseFeedback({ success: true, message: res.data.message });
      setTimeout(fetchDashboard, 1000);
    } catch (err) {
      setChaseFeedback({ success: false, message: err.response?.data?.detail || 'Chasing failed.' });
    } finally {
      setChasingId(null);
    }
  };

  const runBenchmark = async () => {
    setBenchmarking(true);
    try {
      const res = await api.get('/finance/benchmark');
      setBenchmarkResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setBenchmarking(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-zinc-500">Loading metrics...</p>
        </div>
      </div>
    );
  }

  const s = data?.summary || {};
  const buckets = data?.aging_buckets || {};
  const trends = data?.monthly_trends || [];
  const topOverdue = data?.top_overdue || [];
  const perf = data?.performance || {};

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      
      {/* Page Title & SLA Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/80">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">Finance Overview</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time recurring revenue, receivables collection & overdue tracking.
          </p>
        </div>

        {/* Minimalist Performance SLA Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-zinc-200/80 text-xs shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-zinc-500">Query SLA:</span>
            <span className="font-mono font-medium text-zinc-900">{perf.execution_ms}ms</span>
            <span className="text-[10px] text-zinc-400 font-mono">(&lt;2,000ms target)</span>
          </div>
          <button
            onClick={runBenchmark}
            disabled={benchmarking}
            className="p-1.5 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-lg text-zinc-600 transition-colors"
            title="Benchmark query performance against SLA"
          >
            <Zap className={`w-3.5 h-3.5 ${benchmarking ? 'text-amber-500 animate-spin' : 'text-zinc-500'}`} />
          </button>
        </div>
      </div>

      {/* Benchmark Banner if run */}
      {benchmarkResult && (
        <div className="p-3 bg-zinc-900 text-white rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="font-medium text-zinc-200">
                SLA Benchmark Result: {benchmarkResult.performance_benchmark.query_time_ms}ms
              </span>
              <span className="text-zinc-400 ml-2">
                Across {benchmarkResult.database_scale.total_subscriptions} subscriptions & {benchmarkResult.database_scale.total_invoices} invoices ({benchmarkResult.performance_benchmark.speed_multiplier})
              </span>
            </div>
          </div>
          <button
            onClick={() => setBenchmarkResult(null)}
            className="text-[11px] text-zinc-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Toolbar - Clean & Minimal */}
      <form onSubmit={handleApplyFilter} className="bg-white p-2.5 rounded-xl border border-zinc-200/80 shadow-2xs flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-500 font-medium pl-1 pr-2 border-r border-zinc-200">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <span>Filter:</span>
        </div>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-8 px-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
        />
        <span className="text-zinc-400 font-mono">&rarr;</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-8 px-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
        />

        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="h-8 px-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
        >
          <option value="">All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>

        <select
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="h-8 px-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
        >
          <option value="">All Plans</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="submit"
            className="h-8 px-3 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg text-xs transition-colors"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="h-8 px-2.5 bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-200 rounded-lg text-xs transition-colors"
            title="Reset Filters"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* KPI Cards Grid - Perfectly Balanced 4-Column Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Active Subscriptions */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Active Subscriptions
          </div>
          <div className="text-2xl font-semibold tracking-tight text-zinc-950 font-mono mt-1">
            {s.active_subscriptions}
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1.5">
            <span>{s.total_subscriptions} total</span>
            <span>&bull;</span>
            <span className="text-zinc-500">{s.paused_subscriptions} paused</span>
            <span>&bull;</span>
            <span>{s.closed_subscriptions} closed</span>
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Monthly Recurring (MRR)
          </div>
          <div className="text-2xl font-semibold tracking-tight text-zinc-950 font-mono mt-1">
            ₹{s.mrr?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>ARR: ₹{s.arr?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Cash Collected */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Total Cash Collected
          </div>
          <div className="text-2xl font-semibold tracking-tight text-zinc-950 font-mono mt-1">
            ₹{s.total_revenue_collected?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-500 mt-2">
            Outstanding: <span className="font-mono text-zinc-800 font-medium">₹{s.total_outstanding_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Overdue Delinquency */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">
            Overdue Invoices
          </div>
          <div className="text-2xl font-semibold tracking-tight text-rose-600 font-mono mt-1">
            ₹{s.overdue_invoices_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-rose-600/80 font-medium mt-2">
            {s.overdue_invoices_count} invoices delinquent
          </div>
        </div>
      </div>

      {/* Visual Analytics & Aging Breakdown - 12 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Trend Area Chart (8 Columns) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950 tracking-tight">Recurring Revenue Trends</h3>
              <p className="text-[11px] text-zinc-400">Monthly invoiced volume vs cash collected</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="month" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="invoiced_amount" name="Invoiced Volume" stroke="#18181b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorInvoiced)" />
                <Area type="monotone" dataKey="revenue_collected" name="Cash Collected" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorPaid)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delinquency Aging Buckets (4 Columns) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950 tracking-tight">Aging Analysis</h3>
            <p className="text-[11px] text-zinc-400 mb-3.5">Delinquent balances by age category</p>

            <div className="space-y-2">
              <div className="p-2.5 bg-zinc-50/70 rounded-lg border border-zinc-200/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-zinc-700">0 - 30 Days</div>
                  <div className="text-[10px] text-zinc-400">{buckets['0_30_days']?.count || 0} invoice(s)</div>
                </div>
                <div className="text-xs font-mono font-semibold text-zinc-900">
                  ₹{buckets['0_30_days']?.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-2.5 bg-zinc-50/70 rounded-lg border border-zinc-200/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-zinc-700">31 - 60 Days</div>
                  <div className="text-[10px] text-zinc-400">{buckets['31_60_days']?.count || 0} invoice(s)</div>
                </div>
                <div className="text-xs font-mono font-semibold text-zinc-900">
                  ₹{buckets['31_60_days']?.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-2.5 bg-zinc-50/70 rounded-lg border border-zinc-200/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-amber-700">61 - 90 Days</div>
                  <div className="text-[10px] text-amber-600/80">{buckets['61_90_days']?.count || 0} invoice(s)</div>
                </div>
                <div className="text-xs font-mono font-semibold text-amber-800">
                  ₹{buckets['61_90_days']?.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-2.5 bg-rose-50/50 rounded-lg border border-rose-200/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-rose-700">90+ Days</div>
                  <div className="text-[10px] text-rose-500">{buckets['90_plus_days']?.count || 0} invoice(s)</div>
                </div>
                <div className="text-xs font-mono font-semibold text-rose-700">
                  ₹{buckets['90_plus_days']?.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 mt-3 text-center">
            <button
              onClick={onNavigateToBilling}
              className="text-xs font-medium text-zinc-900 hover:underline"
            >
              Open Recurring Billing Center &rarr;
            </button>
          </div>
        </div>

      </div>

      {/* Overdue Chasing Action Queue Table */}
      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950 tracking-tight">Overdue Chasing Queue</h3>
            <p className="text-[11px] text-zinc-400">Directly dispatch payment notices to recover delinquent balances</p>
          </div>
          {chaseFeedback && (
            <div className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 ${chaseFeedback.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              <Check className="w-3 h-3" />
              <span>{chaseFeedback.message}</span>
            </div>
          )}
        </div>

        {topOverdue.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-xs font-medium">
            No overdue invoices currently requiring action.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Delinquency</th>
                  <th className="py-2.5 px-4">Balance Owed</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                {topOverdue.map((inv) => (
                  <tr key={inv.invoice_id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-zinc-900">{inv.invoice_number}</td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-zinc-900">{inv.customer_name}</div>
                      <div className="text-[11px] text-zinc-400">{inv.customer_email}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-zinc-600">{inv.due_date}</td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        {inv.days_overdue}d overdue
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-rose-600">
                      ₹{inv.amount_due?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleChaseInvoice(inv.invoice_id)}
                        disabled={chasingId === inv.invoice_id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-white rounded-md text-xs font-medium transition-all shadow-2xs"
                      >
                        <Send className="w-3 h-3" />
                        <span>{chasingId === inv.invoice_id ? 'Sending...' : 'Chase'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
