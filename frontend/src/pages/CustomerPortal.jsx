import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  CreditCard,
  FileDown,
  Pause,
  Play,
  RotateCcw,
  Check,
} from 'lucide-react';

export default function CustomerPortal() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Online Pay Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payMethod, setPayMethod] = useState('Credit Card');
  const [payNote, setPayNote] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const [subsRes, invsRes] = await Promise.all([
        api.get('/portal/my-subscriptions'),
        api.get('/portal/my-invoices'),
      ]);
      setSubscriptions(subsRes.data);
      setInvoices(invsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handlePauseSub = async (id) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/portal/subscription/${id}/pause`);
      setNotification({ success: true, message: `Subscription ${res.data.sub_number} paused.` });
      fetchPortalData();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Pause failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSub = async (id) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/portal/subscription/${id}/resume`);
      setNotification({ success: true, message: `Subscription ${res.data.sub_number} resumed!` });
      fetchPortalData();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Resume failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenewSub = async (id) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/portal/subscription/${id}/renew`);
      setNotification({ success: true, message: `Subscription ${res.data.sub_number} renewed until ${res.data.expiry_date}!` });
      fetchPortalData();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Renewal failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSub = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/portal/subscription/${id}/cancel`);
      setNotification({ success: true, message: `Subscription ${res.data.sub_number} cancelled.` });
      fetchPortalData();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Cancellation failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const openPayModal = (inv) => {
    setSelectedInvoice(inv);
    setPayMethod('Credit Card');
    setPayNote('');
    setPayModalOpen(true);
  };

  const handleOnlinePayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      const res = await api.post(`/portal/invoice/${selectedInvoice.id}/pay`, null, {
        params: {
          payment_method: payMethod,
          reference_note: payNote || `Customer online payment via ${payMethod}`,
        },
      });
      setNotification({
        success: true,
        message: `Payment successful! Settled ₹${res.data.amount?.toFixed(2)} for ${selectedInvoice.invoice_number}.`,
      });
      setPayModalOpen(false);
      fetchPortalData();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Payment failed.' });
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadPDF = async (invId, invoiceNumber) => {
    try {
      const res = await api.get(`/portal/invoice/${invId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setNotification({ success: false, message: 'Could not download PDF.' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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

      {/* Customer Header - Minimalist & Refined */}
      <div className="bg-white p-5 rounded-xl border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-0.5">
            Customer Self-Service Portal
          </span>
          <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">{user?.full_name}</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {user?.company_name ? `${user.company_name} • ` : ''}{user?.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-200/80 text-xs text-right">
            <span className="text-[10px] text-zinc-400 block font-medium">Active Plans</span>
            <span className="font-mono font-semibold text-zinc-950">
              {subscriptions.filter((s) => s.status === 'active').length} Active
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: MY SUBSCRIPTIONS */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 tracking-tight">Active Subscriptions</h2>
          <p className="text-xs text-zinc-500">
            Self-service renewal, pausing, and policy management without requiring support emails.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-400 text-xs bg-white rounded-xl border">Loading...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-xs bg-white rounded-xl border">
            No subscriptions found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-[11px] font-medium text-zinc-500 block">{sub.sub_number}</span>
                      <h3 className="font-semibold text-zinc-950 text-sm tracking-tight">{sub.plan?.name}</h3>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-2.5 text-xs bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase font-medium">Frequency</span>
                      <span className="font-medium capitalize text-zinc-800">{sub.plan?.billing_frequency}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase font-medium">Next Billing</span>
                      <span className="font-mono font-medium text-emerald-700">{sub.next_billing_date || '—'}</span>
                    </div>
                  </div>

                  {/* Sub Lines */}
                  <div className="space-y-1 mb-3">
                    <span className="text-[10px] uppercase font-semibold text-zinc-400">Included Lines</span>
                    {sub.lines?.map((line) => (
                      <div key={line.id} className="flex items-center justify-between text-xs py-0.5 border-b border-zinc-50">
                        <span className="text-zinc-700 font-medium">
                          {line.product?.name} {line.variant && <span className="text-zinc-500 text-[11px] font-mono">({line.variant.attribute_value})</span>}
                        </span>
                        <span className="font-mono text-zinc-500">{line.quantity}x • ₹{line.total_amount?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Self-service management action buttons per plan policy */}
                <div className="pt-2.5 border-t border-zinc-100 flex flex-wrap items-center gap-1.5">
                  {sub.status === 'active' && sub.allow_pause && (
                    <button
                      onClick={() => handlePauseSub(sub.id)}
                      disabled={actionLoading}
                      className="px-2.5 py-1 bg-white hover:bg-zinc-50 text-amber-800 border border-zinc-200 rounded-md text-xs font-medium flex items-center gap-1"
                    >
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  )}

                  {sub.status === 'paused' && (
                    <button
                      onClick={() => handleResumeSub(sub.id)}
                      disabled={actionLoading}
                      className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-white rounded-md text-xs font-medium flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      <span>Resume</span>
                    </button>
                  )}

                  {sub.allow_renewal && (
                    <button
                      onClick={() => handleRenewSub(sub.id)}
                      disabled={actionLoading}
                      className="px-2.5 py-1 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-md text-xs font-medium flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Renew (+1 Cycle)</span>
                    </button>
                  )}

                  {sub.status === 'active' && sub.allow_early_close && (
                    <button
                      onClick={() => handleCancelSub(sub.id)}
                      disabled={actionLoading}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-medium ml-auto"
                    >
                      Cancel Early
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: MY INVOICES & ONLINE PAYMENTS */}
      <div className="space-y-3 pt-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 tracking-tight">Billing History & Invoices</h2>
          <p className="text-xs text-zinc-500">
            Settle outstanding invoices online and download PDF tax receipts.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">No invoices generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Issue Date</th>
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
                      <td className="py-2.5 px-4 font-mono font-medium text-zinc-950">{inv.invoice_number}</td>
                      <td className="py-2.5 px-4 font-mono text-zinc-500">{inv.issue_date}</td>
                      <td className="py-2.5 px-4 font-mono text-zinc-600">{inv.due_date}</td>
                      <td className="py-2.5 px-4 font-mono font-medium text-zinc-950">₹{inv.total_amount?.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-mono font-medium">
                        {inv.amount_due > 0 ? (
                          <span className={inv.is_overdue ? 'text-rose-600' : 'text-zinc-900'}>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownloadPDF(inv.id, inv.invoice_number)}
                            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                            title="Download PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>

                          {inv.amount_due > 0 && inv.status !== 'cancelled' && (
                            <button
                              onClick={() => openPayModal(inv)}
                              className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-md text-xs shadow-2xs flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Pay Online</span>
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
      </div>

      {/* Online Pay Modal */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title={`Settle Invoice: ${selectedInvoice?.invoice_number}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleOnlinePayment} className="space-y-3.5 text-xs">
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-center space-y-1">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Balance Due</span>
            <div className="text-2xl font-semibold text-zinc-950 font-mono">
              ₹{selectedInvoice?.amount_due?.toFixed(2)}
            </div>
            <span className="text-[10px] text-zinc-400 block">Immediate instant balance settlement</span>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Select Payment Method</label>
            <div className="grid grid-cols-3 gap-1.5">
              {['Credit Card', 'Stripe', 'Bank Transfer'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium border transition-all text-center ${
                    payMethod === m
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {payMethod === 'Credit Card' && (
            <div className="space-y-2 p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
              <div>
                <label className="block text-[10px] font-medium text-zinc-500 uppercase mb-0.5">Card Number</label>
                <input
                  type="text"
                  readOnly
                  value="4242 •••• •••• 4242"
                  className="w-full px-2.5 py-1 bg-white border border-zinc-200 rounded-md text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 uppercase mb-0.5">Expiry</label>
                  <input
                    type="text"
                    readOnly
                    value="12/28"
                    className="w-full px-2.5 py-1 bg-white border border-zinc-200 rounded-md text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 uppercase mb-0.5">CVC</label>
                  <input
                    type="text"
                    readOnly
                    value="991"
                    className="w-full px-2.5 py-1 bg-white border border-zinc-200 rounded-md text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Payment Reference (Optional)</label>
            <input
              type="text"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="e.g. Monthly renewal"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setPayModalOpen(false)}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paying}
              className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs"
            >
              {paying ? 'Processing...' : `Authorize & Pay ₹${selectedInvoice?.amount_due?.toFixed(2)}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
