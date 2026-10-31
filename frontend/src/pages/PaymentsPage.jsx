import React, { useState, useEffect } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import { CreditCard, Plus, Search, Check } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');

  // Record modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, invRes] = await Promise.all([
        api.get('/payments'),
        api.get('/billing/invoices'),
      ]);
      setPayments(payRes.data);
      const unpaid = invRes.data.filter((i) => i.amount_due > 0 && i.status !== 'cancelled');
      setUnpaidInvoices(unpaid);
      if (unpaid.length > 0) {
        setSelectedInvoiceId(unpaid[0].id);
        setAmount(unpaid[0].amount_due.toFixed(2));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInvoiceSelectChange = (invId) => {
    setSelectedInvoiceId(invId);
    const inv = unpaidInvoices.find((i) => i.id === parseInt(invId));
    if (inv) {
      setAmount(inv.amount_due.toFixed(2));
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/payments', {
        invoice_id: parseInt(selectedInvoiceId),
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_note: note || null,
      });
      setNotification({
        success: true,
        message: `Payment ${res.data.payment_number} (₹${res.data.amount?.toFixed(2)}) recorded successfully!`,
      });
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setNotification({
        success: false,
        message: err.response?.data?.detail || 'Failed to record payment.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchSearch =
      search === '' ||
      p.payment_number.toLowerCase().includes(search.toLowerCase()) ||
      p.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.reference_note?.toLowerCase().includes(search.toLowerCase());
    const matchMethod = filterMethod === '' || p.payment_method === filterMethod;
    return matchSearch && matchMethod;
  });

  const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-3 rounded-lg border flex items-center justify-between text-xs animate-in fade-in ${
          notification.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="font-semibold underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/80">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">Payments & Receipts</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Log and audit incoming payments across multiple channels against invoices.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs text-xs transition-all w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Total Receipts Logged
          </span>
          <div className="text-2xl font-semibold tracking-tight text-zinc-950 font-mono">
            {payments.length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Total Settled Cash
          </span>
          <div className="text-2xl font-semibold tracking-tight text-emerald-700 font-mono">
            ₹{totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Pending Invoices
          </span>
          <div className="text-2xl font-semibold tracking-tight text-amber-700 font-mono">
            {unpaidInvoices.length}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search receipt #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
          />
        </div>

        <div>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
          >
            <option value="">All Payment Methods</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Stripe">Stripe</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
            <option value="Cash">Cash</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-400 text-xs">Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-xs font-medium">
            No payments found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Receipt #</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Invoice</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Reference Note</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-zinc-950">
                      {p.payment_number}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-zinc-900">
                      {p.customer?.full_name}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-zinc-500">
                      #{p.invoice_id}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-500">
                      {p.payment_date}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-400 text-[11px] max-w-xs truncate">
                      {p.reference_note || '—'}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-right text-emerald-700">
                      ₹{p.amount?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Incoming Payment"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 mb-1">Target Invoice</label>
            {unpaidInvoices.length === 0 ? (
              <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-zinc-600">
                All existing invoices are settled.
              </div>
            ) : (
              <select
                required
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceSelectChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
              >
                {unpaidInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} - {inv.customer?.full_name} (₹{inv.amount_due.toFixed(2)} due)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Method</label>
            <select
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            >
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Stripe">Stripe</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Payment Date</label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Wire confirmation #4892"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || unpaidInvoices.length === 0}
              className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs"
            >
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
