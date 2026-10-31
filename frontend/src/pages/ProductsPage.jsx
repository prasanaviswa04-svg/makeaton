import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Tag, Trash2, Check, Layers } from 'lucide-react';

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Add Product Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [productType, setProductType] = useState('Software');
  const [salesPrice, setSalesPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [notes, setNotes] = useState('');

  // Add Variant Modal
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantProductId, setVariantProductId] = useState(null);
  const [variantAttr, setVariantAttr] = useState('Brand');
  const [variantVal, setVariantVal] = useState('Odoo');
  const [variantPriceExtra, setVariantPriceExtra] = useState('560');

  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/products', {
        name,
        product_type: productType,
        sales_price: parseFloat(salesPrice),
        cost_price: parseFloat(costPrice || '0'),
        notes: notes || null,
        is_active: true,
      });
      setNotification({ success: true, message: `Product '${res.data.name}' added!` });
      setProductModalOpen(false);
      setName('');
      setSalesPrice('');
      setCostPrice('');
      setNotes('');
      fetchProducts();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Failed to create product.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post(`/products/${variantProductId}/variants`, {
        attribute_name: variantAttr,
        attribute_value: variantVal,
        price_extra: parseFloat(variantPriceExtra),
        is_active: true,
      });
      setNotification({
        success: true,
        message: `Variant '${res.data.attribute_value}' (+₹${res.data.price_extra}) added!`,
      });
      setVariantModalOpen(false);
      fetchProducts();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Failed to add variant.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!window.confirm('Delete this variant?')) return;
    try {
      await api.delete(`/products/variants/${variantId}`);
      setNotification({ success: true, message: 'Variant removed.' });
      fetchProducts();
    } catch (err) {
      setNotification({ success: false, message: 'Failed to delete variant.' });
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
          <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">Products & Variants</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage software, services, add-ons, and pricing tier variants.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setProductModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs text-xs transition-all w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch Product</span>
          </button>
        )}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="p-8 text-center text-zinc-400 text-xs">Loading products...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold text-zinc-950 text-sm tracking-tight">{p.name}</h3>
                    <span className="inline-block mt-0.5 text-[10px] uppercase font-semibold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                      {p.product_type}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block font-medium uppercase">Base Price</span>
                    <span className="text-lg font-semibold text-zinc-950 font-mono">₹{p.sales_price?.toFixed(2)}</span>
                  </div>
                </div>

                {p.notes && (
                  <p className="text-xs text-zinc-500 mt-2 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                    {p.notes}
                  </p>
                )}

                {/* Variants List */}
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-zinc-400" />
                      <span>Available Variants</span>
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setVariantProductId(p.id);
                          setVariantModalOpen(true);
                        }}
                        className="text-[11px] font-medium text-zinc-900 hover:underline"
                      >
                        + Add Variant
                      </button>
                    )}
                  </div>

                  {p.variants?.length === 0 ? (
                    <div className="text-[11px] text-zinc-400 italic">No variants configured. Standard price applies.</div>
                  ) : (
                    <div className="space-y-1">
                      {p.variants.map((v) => (
                        <div key={v.id} className="flex items-center justify-between p-1.5 bg-zinc-50/80 rounded-md text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400 text-[11px]">{v.attribute_name}:</span>
                            <span className="font-medium text-zinc-900">{v.attribute_value}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-zinc-900">
                              +₹{v.price_extra?.toFixed(2)}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteVariant(v.id)}
                                className="text-zinc-400 hover:text-rose-600 p-0.5"
                                title="Remove Variant"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 text-[10px] text-zinc-400 flex items-center justify-between border-t border-zinc-100">
                <span>Cost: ₹{p.cost_price?.toFixed(2)}</span>
                <span className="text-emerald-700 font-medium">Active in Catalog</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title="Launch Product into Catalog"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brightloop Cloud ERP"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Type</label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            >
              <option value="Software">Software</option>
              <option value="Service">Service</option>
              <option value="Add-on">Add-on</option>
              <option value="Consumable">Consumable</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Sales Price (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                placeholder="1200.00"
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono focus:outline-none focus:border-zinc-950"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Cost Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="300.00"
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono focus:outline-none focus:border-zinc-950"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Specifications or terms..."
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs"
            >
              {submitting ? 'Creating...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Variant Modal */}
      <Modal
        isOpen={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        title="Add Pricing Variant (e.g. Odoo brand +₹560)"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddVariant} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 mb-1">Attribute Name</label>
            <input
              type="text"
              required
              value={variantAttr}
              onChange={(e) => setVariantAttr(e.target.value)}
              placeholder="e.g. Brand, Tier, Seats"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Option Value</label>
            <input
              type="text"
              required
              value={variantVal}
              onChange={(e) => setVariantVal(e.target.value)}
              placeholder="e.g. Odoo Brand"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Price Extra (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              value={variantPriceExtra}
              onChange={(e) => setVariantPriceExtra(e.target.value)}
              placeholder="560.00"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setVariantModalOpen(false)}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs"
            >
              {submitting ? 'Saving...' : 'Save Variant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
