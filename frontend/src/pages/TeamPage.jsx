import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Shield, Briefcase, Store, Check, X, Search, Building } from 'lucide-react';

export default function TeamPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' or 'staff'
  const [staffList, setStaffList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add staff modal state
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [submittingStaff, setSubmittingStaff] = useState(false);

  // Add customer modal state
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custCompany, setCustCompany] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [submittingCust, setSubmittingCust] = useState(false);

  const checkPasswordStrength = (pwd) => {
    return {
      hasLength: pwd.length > 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    };
  };

  const staffPwdChecks = checkPasswordStrength(staffPassword);
  const isStaffPwdValid = staffPwdChecks.hasLength && staffPwdChecks.hasUpper && staffPwdChecks.hasLower && staffPwdChecks.hasSpecial;

  const custPwdChecks = checkPasswordStrength(custPassword);
  const isCustPwdValid = custPwdChecks.hasLength && custPwdChecks.hasUpper && custPwdChecks.hasLower && custPwdChecks.hasSpecial;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, custRes] = await Promise.all([
        api.get('/users/staff'),
        api.get('/users/customers'),
      ]);
      setStaffList(staffRes.data);
      setCustomerList(custRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!isStaffPwdValid) return;
    setSubmittingStaff(true);
    try {
      const res = await api.post('/users/staff', {
        full_name: staffName,
        email: staffEmail,
        password: staffPassword,
        phone: staffPhone || null,
      });
      setNotification({ success: true, message: `Staff member '${res.data.full_name}' created successfully!` });
      setStaffModalOpen(false);
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setStaffPhone('');
      fetchData();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Failed to add staff member.' });
    } finally {
      setSubmittingStaff(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!isCustPwdValid) return;
    setSubmittingCust(true);
    try {
      const res = await api.post('/users/customers', {
        full_name: custName,
        company_name: custCompany || null,
        email: custEmail,
        password: custPassword,
        phone: custPhone || null,
      });
      setNotification({ success: true, message: `Customer '${res.data.full_name}' account created successfully!` });
      setCustomerModalOpen(false);
      setCustName('');
      setCustCompany('');
      setCustEmail('');
      setCustPhone('');
      setCustPassword('');
      fetchData();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Failed to add customer.' });
    } finally {
      setSubmittingCust(false);
    }
  };

  const filteredCustomers = customerList.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

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
          <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">Users & Directory</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage customer subscriber accounts and internal team permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'customers' ? (
            <button
              onClick={() => setCustomerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs text-xs transition-all w-fit"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
            </button>
          ) : (
            isAdmin && (
              <button
                onClick={() => setStaffModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs text-xs transition-all w-fit"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Staff Member</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg w-fit text-xs font-medium">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'customers'
                ? 'bg-white text-zinc-950 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Customers ({customerList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'staff'
                ? 'bg-white text-zinc-950 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Staff Members ({staffList.length})</span>
          </button>
        </div>

        {activeTab === 'customers' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200/80 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>
        )}
      </div>

      {/* TAB 1: CUSTOMERS TABLE */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-zinc-400 text-xs">Loading customer directory...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              No customers found. Click &ldquo;Add Customer&rdquo; above to create a customer account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Customer Name</th>
                    <th className="py-2.5 px-4">Company</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-zinc-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center font-semibold text-zinc-800 text-[11px]">
                          {c.full_name?.charAt(0) || 'C'}
                        </div>
                        <span>{c.full_name}</span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-zinc-600">
                        {c.company_name ? (
                          <span className="flex items-center gap-1.5 text-zinc-700">
                            <Building className="w-3 h-3 text-zinc-400" />
                            {c.company_name}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-zinc-600">
                        {c.email}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-500 font-mono text-[11px]">
                        {c.phone || '—'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-400">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STAFF MEMBERS TABLE */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-zinc-400 text-xs">Loading staff...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Member</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                  {staffList.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-zinc-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center font-semibold text-zinc-800 text-[11px]">
                          {m.full_name?.charAt(0) || 'S'}
                        </div>
                        <span>{m.full_name}</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-zinc-600">
                        {m.email}
                      </td>
                      <td className="py-2.5 px-4">
                        {m.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-900 text-white">
                            <Shield className="w-3 h-3" /> Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                            <Briefcase className="w-3 h-3 text-zinc-500" /> Staff Rep
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-400 font-mono text-[11px]">
                        {m.phone || '—'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-400">
                        {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title="Add New Customer Account"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder="e.g. David Miller"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Company Name (Optional)</label>
            <input
              type="text"
              value={custCompany}
              onChange={(e) => setCustCompany(e.target.value)}
              placeholder="e.g. Miller Retail Corp"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={custEmail}
                onChange={(e) => setCustEmail(e.target.value)}
                placeholder="david@miller.com"
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Phone (Optional)</label>
              <input
                type="text"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                placeholder="+1 555-0199"
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Account Password</label>
            <input
              type="password"
              required
              value={custPassword}
              onChange={(e) => setCustPassword(e.target.value)}
              placeholder="Create strong password"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />

            {/* Password Policy Checklist */}
            <div className="mt-2 p-2 bg-zinc-50 rounded-lg border border-zinc-200">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                Password Security Requirements
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className={`flex items-center gap-1.5 ${custPwdChecks.hasLength ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {custPwdChecks.hasLength ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>&gt; 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${custPwdChecks.hasUpper ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {custPwdChecks.hasUpper ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>Uppercase letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${custPwdChecks.hasLower ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {custPwdChecks.hasLower ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>Lowercase letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${custPwdChecks.hasSpecial ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {custPwdChecks.hasSpecial ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>Special character</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setCustomerModalOpen(false)}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingCust || !isCustPwdValid}
              className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg font-medium shadow-2xs"
            >
              {submittingCust ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Staff Modal */}
      <Modal
        isOpen={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        title="Invite Internal Staff Member (Admin Only)"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Company Email</label>
            <input
              type="email"
              required
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="sarah@brightloop.com"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Phone (Optional)</label>
            <input
              type="text"
              value={staffPhone}
              onChange={(e) => setStaffPhone(e.target.value)}
              placeholder="+1 555-0100"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Initial Password</label>
            <input
              type="password"
              required
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              placeholder="Create secure password"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />

            {/* Password Policy Checklist */}
            <div className="mt-2 p-2 bg-zinc-50 rounded-lg border border-zinc-200">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                Password Security
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className={`flex items-center gap-1.5 ${staffPwdChecks.hasLength ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {staffPwdChecks.hasLength ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>&gt; 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${staffPwdChecks.hasUpper ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {staffPwdChecks.hasUpper ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>Uppercase</span>
                </div>
                <div className={`flex items-center gap-1.5 ${staffPwdChecks.hasLower ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {staffPwdChecks.hasLower ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>Lowercase</span>
                </div>
                <div className={`flex items-center gap-1.5 ${staffPwdChecks.hasSpecial ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {staffPwdChecks.hasSpecial ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>Special char</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setStaffModalOpen(false)}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingStaff || !isStaffPwdValid}
              className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg font-medium shadow-2xs"
            >
              {submittingStaff ? 'Adding...' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
