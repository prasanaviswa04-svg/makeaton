import React, { useState, useEffect } from 'react';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  Zap,
  Printer,
  Send,
  Check,
  FileDown,
  AlertTriangle,
  CreditCard,
  Eye,
} from 'lucide-react';

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Billing Day Runner state
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [runningBilling, setRunningBilling] = useState(false);
  const [billingResult, setBillingResult] = useState(null);

  // Action status / Notifications
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [paymentNote, setPaymentNote] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (overdueOnly) params.overdue_only = true;
      const res = await api.get('/billing/invoices', { params });
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, overdueOnly]);

  const handleRunBillingDay = async () => {
    setRunningBilling(true);
    setBillingResult(null);
    try {
      const res = await api.post('/billing/run-billing-day', null, {
        params: {
          target_date: runDate,
          auto_confirm: autoConfirm,
        },
      });
      setBillingResult(res.data);
      setNotification({
        success: true,
        message: `Billing Day complete: Generated ${res.data.invoices_generated} invoices totaling ₹${res.data.total_billed_amount?.toFixed(2)}. (${res.data.skipped_already_billed} already billed for period).`
      });
      fetchInvoices();
    } catch (err) {
      setNotification({
        success: false,
        message: err.response?.data?.detail || 'Billing Day run failed.'
      });
    } finally {
      setRunningBilling(false);
    }
  };

  const handleConfirmInvoice = async (id) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/billing/invoices/${id}/confirm`);
      setNotification({ success: true, message: `Invoice ${res.data.invoice_number} confirmed!` });
      fetchInvoices();
      if (selectedInvoice?.id === id) setSelectedInvoice(res.data);
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Confirmation failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this invoice?')) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/billing/invoices/${id}/cancel`);
      setNotification({ success: true, message: `Invoice ${res.data.invoice_number} cancelled.` });
      fetchInvoices();
      if (selectedInvoice?.id === id) setSelectedInvoice(res.data);
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Cancellation failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendInvoice = async (id) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/billing/invoices/${id}/send`);
      setNotification({ success: true, message: res.data.message });
      fetchInvoices();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Sending failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = async (id, invoiceNumber) => {
    try {
      const res = await api.get(`/billing/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setNotification({ success: false, message: 'Could not generate PDF.' });
    }
  };

  const openPaymentModal = (inv) => {
    setPaymentInvoice(inv);
    setPaymentAmount(inv.amount_due.toFixed(2));
    setPaymentMethod('Credit Card');
    setPaymentNote(`Payment for ${inv.invoice_number}`);
    setPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/payments', {
        invoice_id: paymentInvoice.id,
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        reference_note: paymentNote,
      });
      setNotification({
        success: true,
        message: `Payment of ₹${res.data.amount?.toFixed(2)} recorded! Invoice settled.`
      });
      setPaymentModalOpen(false);
      fetchInvoices();
      if (selectedInvoice?.id === paymentInvoice.id) {
        const updated = await api.get(`/billing/invoices/${paymentInvoice.id}`);
        setSelectedInvoice(updated.data);
      }
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Payment recording failed.' });
    } finally {
      setActionLoading(false);
    }
  };

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
      <div className="pb-2 border-b border-zinc-200/80">
        <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">Recurring Billing & Invoices</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Automated billing runs, zero duplicate period checks, and tax invoice generation.
        </p>
      </div>

      {/* BILLING DAY ENGINE CARD - Minimalist Framer Styling */}
      <div className="bg-zinc-950 text-white p-5 rounded-xl border border-zinc-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold tracking-tight text-zinc-100">Billing Day Automated Engine</h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-xl">
              Processes due subscriptions, generates itemized invoices with configured tax rules, and prevents duplicate billing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 bg-zinc-900/90 p-2 rounded-lg border border-zinc-800 text-xs">
            <div>
              <input
                type="date"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
                className="h-8 px-2.5 bg-zinc-800 text-white rounded-md text-xs font-mono focus:outline-none border border-zinc-700"
              />
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 px-1">
              <input
                type="checkbox"
                checked={autoConfirm}
                onChange={(e) => setAutoConfirm(e.target.checked)}
                className="rounded accent-emerald-500 w-3.5 h-3.5"
              />
              <span className="text-[11px]">Auto-Confirm</span>
            </label>

            <button
              onClick={handleRunBillingDay}
              disabled={runningBilling}
              className="h-8 px-3.5 bg-white hover:bg-zinc-100 text-zinc-950 font-medium rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Zap className={`w-3.5 h-3.5 ${runningBilling ? 'animate-spin' : ''}`} />
              <span>{runningBilling ? 'Executing...' : 'Run Billing Batch'}</span>
            </button>
          </div>
        </div>

        {/* Live Result Metrics */}
        {billingResult && (
          <div className="mt-3.5 pt-3.5 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-medium block">Evaluated</span>
              <span className="text-base font-semibold font-mono text-zinc-200">{billingResult.subscriptions_evaluated}</span>
            </div>
            <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-emerald-400 uppercase font-medium block">Invoices Generated</span>
              <span className="text-base font-semibold font-mono text-emerald-400">{billingResult.invoices_generated}</span>
            </div>
            <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-medium block">Skipped (Zero Duplicate)</span>
              <span className="text-base font-semibold font-mono text-zinc-400">{billingResult.skipped_already_billed}</span>
            </div>
            <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-medium block">Total Billed</span>
              <span className="text-base font-semibold font-mono text-zinc-200">₹{billingResult.total_billed_amount?.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {['all', 'draft', 'confirmed', 'paid', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setStatusFilter(tab); setOverdueOnly(false); }}
              className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                statusFilter === tab && !overdueOnly
                  ? 'bg-zinc-950 text-white shadow-2xs'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/80'
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={() => { setOverdueOnly(!overdueOnly); setStatusFilter('all'); }}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              overdueOnly
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Overdue Only</span>
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-400 text-xs">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-xs font-medium">
            No invoices matching the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Billing Period</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Total</th>
                  <th className="py-2.5 px-4">Balance Due</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-zinc-950">
                      {inv.invoice_number}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-zinc-900">{inv.customer?.full_name}</div>
                      <div className="text-[11px] text-zinc-400">{inv.customer?.company_name || inv.customer?.email}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-500">
                      {inv.billing_period_start} &rarr; {inv.billing_period_end}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px]">
                      <span className={inv.is_overdue ? 'text-rose-600 font-semibold' : 'text-zinc-600'}>
                        {inv.due_date}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-zinc-950">
                      ₹{inv.total_amount?.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium">
                      {inv.amount_due > 0 ? (
                        <span className={inv.is_overdue ? 'text-rose-600' : 'text-amber-700'}>
                          ₹{inv.amount_due?.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-normal">₹0.00</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={inv.status} isOverdue={inv.is_overdue} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(inv.id, inv.invoice_number)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                          title="Download PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>

                        {inv.status === 'draft' && (
                          <button
                            onClick={() => handleConfirmInvoice(inv.id)}
                            disabled={actionLoading}
                            className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded text-[11px]"
                          >
                            Confirm
                          </button>
                        )}

                        {inv.status !== 'cancelled' && (
                          <button
                            onClick={() => handleSendInvoice(inv.id)}
                            disabled={actionLoading}
                            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                            title="Dispatch Email"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => openPaymentModal(inv)}
                            className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded text-[11px]"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail View Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Invoice ${selectedInvoice.invoice_number}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-400">Billed To</span>
                <div className="text-sm font-semibold text-zinc-950">{selectedInvoice.customer?.full_name}</div>
                <div className="text-xs text-zinc-400">{selectedInvoice.customer?.company_name || selectedInvoice.customer?.email}</div>
              </div>
              <div className="text-right">
                <StatusBadge status={selectedInvoice.status} isOverdue={selectedInvoice.is_overdue} />
                <div className="text-xs text-zinc-400 mt-1 font-mono">Due: {selectedInvoice.due_date}</div>
              </div>
            </div>

            {/* Line items table */}
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1.5">
                Itemized Details
              </span>
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-semibold text-zinc-400 uppercase">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Tax</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {selectedInvoice.lines?.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2 px-3 font-medium text-zinc-900">{l.description}</td>
                        <td className="py-2 px-3 text-center font-mono">{l.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{l.unit_price?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono">{l.tax_rate}%</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-zinc-950">₹{l.total_amount?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end">
              <div className="w-56 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{selectedInvoice.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Tax:</span>
                  <span className="font-mono">+₹{selectedInvoice.tax_amount?.toFixed(2)}</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{selectedInvoice.discount_amount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-zinc-950 pt-1 border-t border-zinc-200">
                  <span>Total Amount:</span>
                  <span className="font-mono">₹{selectedInvoice.total_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Amount Paid:</span>
                  <span className="font-mono">₹{selectedInvoice.amount_paid?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-zinc-950 pt-1 border-t border-zinc-200">
                  <span>Balance Due:</span>
                  <span className="font-mono text-zinc-950">₹{selectedInvoice.amount_due?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100">
              <button
                onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number)}
                className="px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-medium rounded-lg text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF Invoice</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedInvoice.status === 'draft' && (
                  <button
                    onClick={() => handleConfirmInvoice(selectedInvoice.id)}
                    className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg text-xs"
                  >
                    Confirm
                  </button>
                )}
                {selectedInvoice.status !== 'cancelled' && selectedInvoice.status !== 'paid' && (
                  <button
                    onClick={() => handleCancelInvoice(selectedInvoice.id)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                )}
                {selectedInvoice.amount_due > 0 && (
                  <button
                    onClick={() => {
                      setSelectedInvoice(null);
                      openPaymentModal(selectedInvoice);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg text-xs flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment for ${paymentInvoice?.invoice_number}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-3.5 text-xs">
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 flex items-center justify-between">
            <span className="font-medium text-zinc-600">Balance Due:</span>
            <span className="font-mono text-sm font-semibold text-zinc-950">
              ₹{paymentInvoice?.amount_due?.toFixed(2)}
            </span>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              max={paymentInvoice?.amount_due}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
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
              <option value="Bank Transfer">Bank Transfer / Wire</option>
              <option value="Stripe">Stripe</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Reference Note (Optional)</label>
            <input
              type="text"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="e.g. Wire Reference #9921"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg shadow-2xs"
            >
              {actionLoading ? 'Saving...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
