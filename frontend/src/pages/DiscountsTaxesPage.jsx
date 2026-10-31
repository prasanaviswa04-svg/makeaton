import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Check } from 'lucide-react';

export default function DiscountsTaxesPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('discounts'); // 'discounts' or 'taxes'
  const [discounts, setDiscounts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Discount Modal State
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [value, setValue] = useState('');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('0');
  const [minQuantity, setMinQuantity] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [targetType, setTargetType] = useState('whole_subscription');
  const [productId, setProductId] = useState('');

  // Tax Modal State
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [taxDesc, setTaxDesc] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, tRes, pRes] = await Promise.all([
        api.get('/discounts'),
        api.get('/taxes'),
        api.get('/products'),
      ]);
      setDiscounts(dRes.data);
      setTaxes(tRes.data);
      setProducts(pRes.data);
      if (pRes.data.length > 0) setProductId(pRes.data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        code: code.toUpperCase().trim(),
        name,
        discount_type: discountType,
        value: parseFloat(value),
        min_purchase_amount: parseFloat(minPurchaseAmount || '0'),
        min_quantity: parseInt(minQuantity || '0'),
        start_date: startDate || null,
        end_date: endDate || null,
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        target_type: targetType,
        product_id: targetType === 'specific_products' ? parseInt(productId) : null,
        is_active: true,
      };
      const res = await api.post('/discounts', payload);
      setNotification({ success: true, message: `Discount rule '${res.data.code}' created!` });
      setDiscountModalOpen(false);
      setCode('');
      setName('');
      setValue('');
      fetchData();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Failed to create discount.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTax = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: taxName,
        rate_percent: parseFloat(taxRate),
        is_default: isDefault,
        is_active: true,
        description: taxDesc || null,
      };
      const res = await api.post('/taxes', payload);
      setNotification({ success: true, message: `Tax rule '${res.data.name}' created!` });
      setTaxModalOpen(false);
      setTaxName('');
      setTaxRate('');
      fetchData();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Failed to create tax rule.' });
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
          <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">Discounts & Tax Rules</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Admin discount conditions, usage caps, and automated billing tax calculation rules.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {activeTab === 'discounts' ? (
              <button
                onClick={() => setDiscountModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs text-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Discount Rule</span>
              </button>
            ) : (
              <button
                onClick={() => setTaxModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs text-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Tax Rule</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg w-fit text-xs font-medium">
        <button
          onClick={() => setActiveTab('discounts')}
          className={`px-3 py-1 rounded-md transition-all ${
            activeTab === 'discounts' ? 'bg-white text-zinc-950 shadow-2xs font-semibold' : 'text-zinc-500 hover:text-zinc-950'
          }`}
        >
          Discount Rules
        </button>
        <button
          onClick={() => setActiveTab('taxes')}
          className={`px-3 py-1 rounded-md transition-all ${
            activeTab === 'taxes' ? 'bg-white text-zinc-950 shadow-2xs font-semibold' : 'text-zinc-500 hover:text-zinc-950'
          }`}
        >
          Tax Rules
        </button>
      </div>

      {/* TAB 1: DISCOUNTS */}
      {activeTab === 'discounts' && (
        <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Rule Name</th>
                  <th className="py-2.5 px-4">Value</th>
                  <th className="py-2.5 px-4">Scope</th>
                  <th className="py-2.5 px-4">Conditions</th>
                  <th className="py-2.5 px-4">Usage Tracker</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                {discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-zinc-950">
                      {d.code}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-zinc-900">
                      {d.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-emerald-700">
                      {d.discount_type === 'percentage' ? `${d.value}% Off` : `₹${d.value.toFixed(2)} Flat`}
                    </td>
                    <td className="py-2.5 px-4 capitalize">
                      <span className="text-[11px] text-zinc-600">
                        {d.target_type === 'whole_subscription' ? 'Whole Subscription' : 'Specific Product'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-zinc-500 text-[11px]">
                      {d.min_quantity > 0 && <div>Min Qty: {d.min_quantity}</div>}
                      {d.min_purchase_amount > 0 && <div>Min Spend: ₹{d.min_purchase_amount}</div>}
                      {d.min_quantity === 0 && d.min_purchase_amount === 0 && <span className="text-zinc-400">No minimum</span>}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px]">
                      <span className="font-semibold text-zinc-900">{d.used_count}</span>
                      <span className="text-zinc-400"> / {d.usage_limit || 'Unlimited'} uses</span>
                    </td>
                    <td className="py-2.5 px-4">
                      {d.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
                          Exhausted
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TAXES */}
      {activeTab === 'taxes' && (
        <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Tax Name</th>
                  <th className="py-2.5 px-4">Tax Rate (%)</th>
                  <th className="py-2.5 px-4">Default Rule</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                {taxes.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-zinc-900">
                      {t.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-zinc-950">
                      {t.rate_percent}%
                    </td>
                    <td className="py-2.5 px-4">
                      {t.is_default ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-900 text-white">
                          Default System Tax
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">Secondary</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-500 text-[11px]">
                      {t.description || '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Discount Modal */}
      <Modal
        isOpen={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        title="Create Discount Rule"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateDiscount} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. VOLUME15"
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono uppercase focus:outline-none focus:border-zinc-950"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Cash (₹)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Rule Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Volume Buyer Discount"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Discount Value</label>
            <input
              type="number"
              step="0.01"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={discountType === 'percentage' ? '15.0' : '100.00'}
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Min Quantity</label>
              <input
                type="number"
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Min Spend (₹)</label>
              <input
                type="number"
                step="0.01"
                value={minPurchaseAmount}
                onChange={(e) => setMinPurchaseAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Usage Limit</label>
              <input
                type="number"
                min="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="Blank for unlimited"
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Target Scope</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
              >
                <option value="whole_subscription">Whole Subscription</option>
                <option value="specific_products">Specific Product</option>
              </select>
            </div>
          </div>

          {targetType === 'specific_products' && (
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setDiscountModalOpen(false)}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg font-medium shadow-2xs"
            >
              {submitting ? 'Creating...' : 'Save Rule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Tax Modal */}
      <Modal
        isOpen={taxModalOpen}
        onClose={() => setTaxModalOpen(false)}
        title="Create Tax Rule"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateTax} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 mb-1">Tax Name</label>
            <input
              type="text"
              required
              value={taxName}
              onChange={(e) => setTaxName(e.target.value)}
              placeholder="e.g. Standard GST 18%"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Rate (%)</label>
            <input
              type="number"
              step="0.01"
              required
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="18.0"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono focus:outline-none focus:border-zinc-950"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-zinc-700 pt-1">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded accent-zinc-900"
            />
            <span>Set as Default System Tax</span>
          </label>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={taxDesc}
              onChange={(e) => setTaxDesc(e.target.value)}
              placeholder="Tax jurisdiction details..."
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setTaxModalOpen(false)}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg font-medium shadow-2xs"
            >
              {submitting ? 'Creating...' : 'Save Tax Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
