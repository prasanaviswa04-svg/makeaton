import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Check, X } from 'lucide-react';

export default function PlansPage() {
  const { isAdmin } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Create Plan Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('monthly');
  const [basePrice, setBasePrice] = useState('');
  const [minQuantity, setMinQuantity] = useState('1');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');

  // Policy toggles
  const [autoCloseOnEnd, setAutoCloseOnEnd] = useState(true);
  const [allowEarlyClose, setAllowEarlyClose] = useState(true);
  const [allowPause, setAllowPause] = useState(true);
  const [allowRenewal, setAllowRenewal] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/plans');
      setPlans(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/plans', {
        name,
        description: description || null,
        billing_frequency: billingFrequency,
        base_price: parseFloat(basePrice),
        min_quantity: parseInt(minQuantity),
        available_from: availableFrom || null,
        available_until: availableUntil || null,
        auto_close_on_end: autoCloseOnEnd,
        allow_early_close: allowEarlyClose,
        allow_pause: allowPause,
        allow_renewal: allowRenewal,
        is_active: true,
      });
      setNotification({ success: true, message: `Plan '${res.data.name}' launched!` });
      setModalOpen(false);
      setName('');
      setDescription('');
      setBasePrice('');
      fetchPlans();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Failed to create plan.' });
    } finally {
      setSubmitting(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/80">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">Subscription Plans & Policies</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure recurrence schedules and plan-by-plan lifecycle governance.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs text-xs transition-all w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Plan</span>
          </button>
        )}
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="p-8 text-center text-zinc-400 text-xs">Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-zinc-950 text-sm tracking-tight">{plan.name}</h3>
                  <span className="text-[10px] uppercase font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {plan.billing_frequency}
                  </span>
                </div>

                <div className="text-xl font-semibold text-zinc-950 font-mono mb-2">
                  ₹{plan.base_price?.toFixed(2)}
                  <span className="text-[11px] font-normal text-zinc-400 ml-1">/ {plan.billing_frequency}</span>
                </div>

                {plan.description && (
                  <p className="text-xs text-zinc-500 mb-3 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                    {plan.description}
                  </p>
                )}

                {/* Plan Policies Checklist */}
                <div className="space-y-1.5 pt-3 border-t border-zinc-100 text-xs">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                    Lifecycle Governance
                  </span>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {plan.auto_close_on_end ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <X className="w-3 h-3 text-zinc-300" />
                      )}
                      <span className={plan.auto_close_on_end ? 'text-zinc-800 font-medium' : 'text-zinc-400'}>
                        Auto-close on end
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {plan.allow_early_close ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <X className="w-3 h-3 text-zinc-300" />
                      )}
                      <span className={plan.allow_early_close ? 'text-zinc-800 font-medium' : 'text-zinc-400'}>
                        Early close
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {plan.allow_pause ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <X className="w-3 h-3 text-zinc-300" />
                      )}
                      <span className={plan.allow_pause ? 'text-zinc-800 font-medium' : 'text-zinc-400'}>
                        Allow pause
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {plan.allow_renewal ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <X className="w-3 h-3 text-zinc-300" />
                      )}
                      <span className={plan.allow_renewal ? 'text-zinc-800 font-medium' : 'text-zinc-400'}>
                        Allow renewal
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 text-[10px] text-zinc-400 flex items-center justify-between border-t border-zinc-100">
                <span>Min Qty: {plan.min_quantity} unit(s)</span>
                <span className="text-emerald-700 font-medium">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Subscription Plan"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 mb-1">Plan Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Growth Monthly"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Billing Frequency</label>
              <select
                value={billingFrequency}
                onChange={(e) => setBillingFrequency(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">Base Price (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="1200.00"
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono focus:outline-none focus:border-zinc-950"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Minimum Quantity</label>
            <input
              type="number"
              min="1"
              required
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Plan description and features..."
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
            />
          </div>

          {/* Lifecycle Policies Checkboxes */}
          <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1.5">
            <span className="font-medium text-zinc-800 block text-xs">
              Lifecycle Policies
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700">
                <input
                  type="checkbox"
                  checked={autoCloseOnEnd}
                  onChange={(e) => setAutoCloseOnEnd(e.target.checked)}
                  className="rounded accent-zinc-900"
                />
                <span>Auto-close on end</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700">
                <input
                  type="checkbox"
                  checked={allowEarlyClose}
                  onChange={(e) => setAllowEarlyClose(e.target.checked)}
                  className="rounded accent-zinc-900"
                />
                <span>Allow early close</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700">
                <input
                  type="checkbox"
                  checked={allowPause}
                  onChange={(e) => setAllowPause(e.target.checked)}
                  className="rounded accent-zinc-900"
                />
                <span>Allow pause</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700">
                <input
                  type="checkbox"
                  checked={allowRenewal}
                  onChange={(e) => setAllowRenewal(e.target.checked)}
                  className="rounded accent-zinc-900"
                />
                <span>Allow renewal</span>
              </label>
            </div>
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
              disabled={submitting}
              className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg font-medium shadow-2xs"
            >
              {submitting ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
