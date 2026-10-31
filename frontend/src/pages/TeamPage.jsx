import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { Plus, Shield, Briefcase, Check, X } from 'lucide-react';

export default function TeamPage() {
  const { isAdmin } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Add staff modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkPasswordStrength = (pwd) => {
    return {
      hasLength: pwd.length > 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    };
  };

  const pwdChecks = checkPasswordStrength(password);
  const isPwdValid = pwdChecks.hasLength && pwdChecks.hasUpper && pwdChecks.hasLower && pwdChecks.hasSpecial;

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/staff');
      setStaffList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!isPwdValid) return;
    setSubmitting(true);
    try {
      const res = await api.post('/users/staff', {
        full_name: fullName,
        email,
        password,
        phone: phone || null,
      });
      setNotification({ success: true, message: `Staff member '${res.data.full_name}' invited successfully!` });
      setModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      fetchStaff();
    } catch (err) {
      setNotification({ success: false, message: err.response?.data?.detail || 'Failed to add staff member.' });
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
          <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">Internal Staff & Access</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Admin governance of internal staff accounts and operational roles.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs text-xs transition-all w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Staff Member</span>
          </button>
        )}
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-400 text-xs">Loading team...</div>
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
                        {m.full_name.charAt(0)}
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
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Invite Internal Staff Member (Admin Only)"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Company Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@brightloop.com"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Phone (Optional)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555-0100"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 mb-1">Initial Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create secure password"
              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
            />

            {/* Password Policy Checklist */}
            <div className="mt-2 p-2 bg-zinc-50 rounded-lg border border-zinc-200">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                Password Security
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className={`flex items-center gap-1.5 ${pwdChecks.hasLength ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {pwdChecks.hasLength ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>&gt; 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${pwdChecks.hasUpper ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {pwdChecks.hasUpper ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>Uppercase</span>
                </div>
                <div className={`flex items-center gap-1.5 ${pwdChecks.hasLower ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {pwdChecks.hasLower ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>Lowercase</span>
                </div>
                <div className={`flex items-center gap-1.5 ${pwdChecks.hasSpecial ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                  {pwdChecks.hasSpecial ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                  <span>Special char</span>
                </div>
              </div>
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
              disabled={submitting || !isPwdValid}
              className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg font-medium shadow-2xs"
            >
              {submitting ? 'Adding...' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
