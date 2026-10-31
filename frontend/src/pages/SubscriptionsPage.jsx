import React, { useState, useEffect } from 'react';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  Plus, Search, Check, DollarSign, Trash2
} from 'lucide-react';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  // Selected subscription for detail modal
  const [selectedSub, setSelectedSub] = useState(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creationMethod, setCreationMethod] = useState('template'); // 'template' or 'scratch'

  // Lookups
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxRules, setTaxRules] = useState([]);
  const [discounts, setDiscounts] = useState([]);

  // Form states for template creation
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateCustomerId, setTemplateCustomerId] = useState('');
  const [templatePaymentTerms, setTemplatePaymentTerms] = useState('Immediate');

  // Form states for scratch creation
  const [scratchCustomerId, setScratchCustomerId] = useState('');
  const [scratchPlanId, setScratchPlanId] = useState('');
  const [scratchStartDate, setScratchStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [scratchExpiryDate, setScratchExpiryDate] = useState('');
  const [scratchPaymentTerms, setScratchPaymentTerms] = useState('Net 15');
  const [scratchDiscountId, setScratchDiscountId] = useState('');
  const [scratchNotes, setScratchNotes] = useState('');
  const [scratchLines, setScratchLines] = useState([
    { product_id: '', variant_id: '', quantity: 1, unit_price: 0, tax_id: '' }
  ]);

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (search) params.search = search;
      const res = await api.get('/subscriptions', { params });
      setSubscriptions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [tRes, cRes, pRes, prRes, txRes, dRes] = await Promise.all([
        api.get('/quotes/templates'),
        api.get('/users/customers'),
        api.get('/plans'),
        api.get('/products'),
        api.get('/taxes'),
        api.get('/discounts'),
      ]);
      setTemplates(tRes.data);
      setCustomers(cRes.data);
      setPlans(pRes.data);
      setProducts(prRes.data);
      setTaxRules(txRes.data);
      setDiscounts(dRes.data);

      if (tRes.data.length > 0) setSelectedTemplateId(tRes.data[0].id);
      if (cRes.data.length > 0) {
        setTemplateCustomerId(cRes.data[0].id);
        setScratchCustomerId(cRes.data[0].id);
      }
      if (pRes.data.length > 0) setScratchPlanId(pRes.data[0].id);
    } catch (err) {
      console.error('Error loading lookups:', err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    loadLookups();
  }, [filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSubscriptions();
  };

  const handleCreateFromTemplate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post(`/subscriptions/from-template/${selectedTemplateId}`, null, {
        params: {
          customer_id: templateCustomerId,
          payment_terms: templatePaymentTerms,
        },
      });
      setNotification({ success: true, message: `Quotation ${res.data.sub_number} successfully prepared!` });
      setCreateModalOpen(false);
      fetchSubscriptions();
      setSelectedSub(res.data);
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Failed to create quotation.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddScratchLine = () => {
    setScratchLines([...scratchLines, { product_id: '', variant_id: '', quantity: 1, unit_price: 0, tax_id: '' }]);
  };

  const handleRemoveScratchLine = (index) => {
    setScratchLines(scratchLines.filter((_, i) => i !== index));
  };

  const handleScratchProductChange = (index, prodId) => {
    const prod = products.find((p) => p.id === parseInt(prodId));
    const newLines = [...scratchLines];
    newLines[index].product_id = prodId;
    newLines[index].variant_id = '';
    newLines[index].unit_price = prod ? prod.sales_price : 0;
    setScratchLines(newLines);
  };

  const handleScratchVariantChange = (index, varId) => {
    const newLines = [...scratchLines];
    newLines[index].variant_id = varId;
    const prod = products.find((p) => p.id === parseInt(newLines[index].product_id));
    if (prod) {
      const variant = prod.variants?.find((v) => v.id === parseInt(varId));
      newLines[index].unit_price = prod.sales_price + (variant ? variant.price_extra : 0);
    }
    setScratchLines(newLines);
  };

  const handleCreateFromScratch = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        customer_id: parseInt(scratchCustomerId),
        plan_id: parseInt(scratchPlanId),
        start_date: scratchStartDate,
        expiry_date: scratchExpiryDate || null,
        payment_terms: scratchPaymentTerms,
        applied_discount_id: scratchDiscountId ? parseInt(scratchDiscountId) : null,
        notes: scratchNotes || null,
        lines: scratchLines.map((l) => ({
          product_id: parseInt(l.product_id),
          variant_id: l.variant_id ? parseInt(l.variant_id) : null,
          quantity: parseInt(l.quantity),
          unit_price: parseFloat(l.unit_price),
          tax_id: l.tax_id ? parseInt(l.tax_id) : null,
        })),
      };

      const res = await api.post('/subscriptions', payload, {
        params: { initial_status: 'draft' },
      });
      setNotification({ success: true, message: `Subscription ${res.data.sub_number} created in Draft state!` });
      setCreateModalOpen(false);
      fetchSubscriptions();
      setSelectedSub(res.data);
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Failed to create subscription.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusTransition = async (subId, newStatus) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/subscriptions/${subId}/status/${newStatus}`);
      setSelectedSub(res.data);
      setNotification({ success: true, message: `Subscription ${res.data.sub_number} moved to '${newStatus}'!` });
      fetchSubscriptions();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Status transition failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenewSub = async (subId) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/subscriptions/${subId}/renew`);
      setSelectedSub(res.data);
      setNotification({ success: true, message: `Subscription ${res.data.sub_number} renewed successfully!` });
      fetchSubscriptions();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Renewal failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoiceNow = async (subId) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/billing/generate-invoice/${subId}`, null, {
        params: { auto_confirm: true },
      });
      setNotification({ success: true, message: `Invoice ${res.data.invoice_number} generated!` });
      fetchSubscriptions();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Could not generate invoice.' });
    } finally {
      setActionLoading(false);
    }
  };

  const statusTabs = ['all', 'active', 'draft', 'quotation', 'confirmed', 'paused', 'closed'];

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

      {/* Header & New Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/80">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">Subscriptions & Quotations</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Turn proposals into recurring subscriptions with lifecycle controls and templates.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs text-xs transition-all w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Quote / Subscription</span>
        </button>
      </div>

      {/* Tabs & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                filterStatus === tab
                  ? 'bg-zinc-950 text-white shadow-2xs'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search sub #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
          />
        </form>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-400 text-xs">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-xs font-medium">
            No subscriptions matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Sub Number</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Plan & Frequency</th>
                  <th className="py-2.5 px-4">Start / Expiry</th>
                  <th className="py-2.5 px-4">Next Billing</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-zinc-950">
                      {sub.sub_number}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-zinc-900">{sub.customer?.full_name}</div>
                      <div className="text-[11px] text-zinc-400">{sub.customer?.company_name || sub.customer?.email}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-zinc-900">{sub.plan?.name}</div>
                      <span className="text-[10px] text-zinc-500 font-mono capitalize">
                        {sub.plan?.billing_frequency}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-600">
                      <div>{sub.start_date}</div>
                      <div className="text-zinc-400">{sub.expiry_date || 'None'}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px]">
                      {sub.next_billing_date ? (
                        <span className="font-medium text-emerald-700">{sub.next_billing_date}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedSub(sub)}
                        className="px-2.5 py-1 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-md text-xs font-medium transition-all"
                      >
                        Manage &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription Detail / Lifecycle Modal */}
      {selectedSub && (
        <Modal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          title={`Subscription ${selectedSub.sub_number}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            {/* Minimalist Lifecycle Stepper */}
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200/80">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-2">
                Lifecycle Progression
              </span>
              <div className="flex items-center justify-between text-xs">
                {['draft', 'quotation', 'confirmed', 'active', 'closed'].map((step, idx) => {
                  const isActiveState = selectedSub.status === step;
                  return (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ${
                          isActiveState
                            ? 'bg-zinc-950 text-white font-semibold'
                            : 'bg-white border border-zinc-200 text-zinc-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <span className={`text-[10px] font-medium capitalize mt-1 ${
                          isActiveState ? 'text-zinc-950 font-semibold' : 'text-zinc-400'
                        }`}>
                          {step}
                        </span>
                      </div>
                      {idx < 4 && <div className="flex-1 h-px bg-zinc-200 mx-2" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Overview Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-zinc-50/60 p-3 rounded-lg border border-zinc-100 text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">Customer</span>
                <span className="font-medium text-zinc-900">{selectedSub.customer?.full_name}</span>
                <span className="block text-[11px] text-zinc-400">{selectedSub.customer?.company_name}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">Plan</span>
                <span className="font-medium text-zinc-900">{selectedSub.plan?.name}</span>
                <span className="block text-[11px] capitalize text-zinc-500">{selectedSub.plan?.billing_frequency}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">Terms</span>
                <span className="font-medium text-zinc-900">{selectedSub.payment_terms}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">State</span>
                <StatusBadge status={selectedSub.status} />
              </div>
            </div>

            {/* Lifecycle Action Buttons */}
            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80 space-y-2">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
                Permitted Actions
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {selectedSub.status === 'draft' && (
                  <button
                    onClick={() => handleStatusTransition(selectedSub.id, 'quotation')}
                    disabled={actionLoading}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-md"
                  >
                    Send as Quotation
                  </button>
                )}

                {selectedSub.status === 'quotation' && (
                  <button
                    onClick={() => handleStatusTransition(selectedSub.id, 'confirmed')}
                    disabled={actionLoading}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-md"
                  >
                    Confirm Offer
                  </button>
                )}

                {selectedSub.status === 'confirmed' && (
                  <button
                    onClick={() => handleStatusTransition(selectedSub.id, 'active')}
                    disabled={actionLoading}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-md"
                  >
                    Activate Subscription
                  </button>
                )}

                {selectedSub.status === 'active' && selectedSub.allow_pause && (
                  <button
                    onClick={() => handleStatusTransition(selectedSub.id, 'paused')}
                    disabled={actionLoading}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md"
                  >
                    Pause Subscription
                  </button>
                )}

                {selectedSub.status === 'paused' && (
                  <button
                    onClick={() => handleStatusTransition(selectedSub.id, 'active')}
                    disabled={actionLoading}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-md"
                  >
                    Resume Active
                  </button>
                )}

                {selectedSub.allow_renewal && (
                  <button
                    onClick={() => handleRenewSub(selectedSub.id)}
                    disabled={actionLoading}
                    className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 font-medium rounded-md"
                  >
                    Renew (+1 Cycle)
                  </button>
                )}

                {selectedSub.status === 'active' && selectedSub.allow_early_close && (
                  <button
                    onClick={() => handleStatusTransition(selectedSub.id, 'closed')}
                    disabled={actionLoading}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium rounded-md"
                  >
                    Close Early
                  </button>
                )}

                {selectedSub.status === 'active' && (
                  <button
                    onClick={() => handleGenerateInvoiceNow(selectedSub.id)}
                    disabled={actionLoading}
                    className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-md ml-auto"
                  >
                    Generate Invoice
                  </button>
                )}
              </div>
            </div>

            {/* Line items */}
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1.5">
                Included Products & Services
              </span>
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-semibold text-zinc-400 uppercase">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Tax</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {selectedSub.lines?.map((line) => (
                      <tr key={line.id}>
                        <td className="py-2 px-3 font-medium text-zinc-900">
                          {line.product?.name}
                          {line.variant && (
                            <span className="ml-1.5 text-[11px] text-zinc-500 font-mono">
                              ({line.variant.attribute_value})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{line.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{line.unit_price?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{line.tax_amount?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-zinc-950">₹{line.total_amount?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Subscription or Quotation"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {/* Segment control */}
          <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setCreationMethod('template')}
              className={`py-1.5 rounded-md transition-all ${
                creationMethod === 'template' ? 'bg-white text-zinc-950 shadow-2xs font-semibold' : 'text-zinc-500 hover:text-zinc-950'
              }`}
            >
              From Quotation Template
            </button>
            <button
              type="button"
              onClick={() => setCreationMethod('scratch')}
              className={`py-1.5 rounded-md transition-all ${
                creationMethod === 'scratch' ? 'bg-white text-zinc-950 shadow-2xs font-semibold' : 'text-zinc-500 hover:text-zinc-950'
              }`}
            >
              Build from Scratch
            </button>
          </div>

          {/* TEMPLATE METHOD */}
          {creationMethod === 'template' && (
            <form onSubmit={handleCreateFromTemplate} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Quotation Template</label>
                <select
                  required
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Valid {t.validity_days} days &bull; {t.plan?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Customer</label>
                <select
                  required
                  value={templateCustomerId}
                  onChange={(e) => setTemplateCustomerId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.company_name || c.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Payment Terms</label>
                <select
                  value={templatePaymentTerms}
                  onChange={(e) => setTemplatePaymentTerms(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
                >
                  <option value="Immediate">Immediate / Due upon receipt</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg font-medium shadow-2xs"
                >
                  {actionLoading ? 'Preparing...' : 'Create Quotation'}
                </button>
              </div>
            </form>
          )}

          {/* SCRATCH METHOD */}
          {creationMethod === 'scratch' && (
            <form onSubmit={handleCreateFromScratch} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Customer</label>
                  <select
                    required
                    value={scratchCustomerId}
                    onChange={(e) => setScratchCustomerId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Plan</label>
                  <select
                    required
                    value={scratchPlanId}
                    onChange={(e) => setScratchPlanId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.billing_frequency})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={scratchStartDate}
                    onChange={(e) => setScratchStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Payment Terms</label>
                  <select
                    value={scratchPaymentTerms}
                    onChange={(e) => setScratchPaymentTerms(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                  >
                    <option value="Immediate">Immediate</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Line items */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-700">Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddScratchLine}
                    className="text-xs font-medium text-zinc-900 hover:underline"
                  >
                    + Add Line
                  </button>
                </div>

                {scratchLines.map((line, idx) => {
                  const selectedProd = products.find((p) => p.id === parseInt(line.product_id));
                  return (
                    <div key={idx} className="p-2 bg-zinc-50 rounded-lg border border-zinc-200/80 flex items-center gap-2">
                      <div className="flex-1">
                        <select
                          required
                          value={line.product_id}
                          onChange={(e) => handleScratchProductChange(idx, e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-zinc-200 rounded-md text-xs"
                        >
                          <option value="">Select Product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (₹{p.sales_price})</option>
                          ))}
                        </select>
                      </div>

                      {selectedProd && selectedProd.variants?.length > 0 && (
                        <div className="min-w-[120px]">
                          <select
                            value={line.variant_id}
                            onChange={(e) => handleScratchVariantChange(idx, e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-zinc-200 rounded-md text-xs"
                          >
                            <option value="">Standard (+₹0)</option>
                            {selectedProd.variants.map((v) => (
                              <option key={v.id} value={v.id}>{v.attribute_value} (+₹{v.price_extra})</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="w-14">
                        <input
                          type="number"
                          min="1"
                          required
                          value={line.quantity}
                          onChange={(e) => {
                            const newLines = [...scratchLines];
                            newLines[idx].quantity = e.target.value;
                            setScratchLines(newLines);
                          }}
                          placeholder="Qty"
                          className="w-full px-2 py-1 bg-white border border-zinc-200 rounded-md text-xs text-center font-mono"
                        />
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={line.unit_price}
                          onChange={(e) => {
                            const newLines = [...scratchLines];
                            newLines[idx].unit_price = e.target.value;
                            setScratchLines(newLines);
                          }}
                          className="w-full px-2 py-1 bg-white border border-zinc-200 rounded-md text-xs font-mono text-right"
                        />
                      </div>

                      {scratchLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveScratchLine(idx)}
                          className="p-1 text-zinc-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg font-medium shadow-2xs"
                >
                  {actionLoading ? 'Creating...' : 'Create Subscription'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
