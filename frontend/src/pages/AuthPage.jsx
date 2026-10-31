import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Check, X, ArrowRight, KeyRound, Mail, Lock, User, Building, Shield, Briefcase, Store } from 'lucide-react';

export default function AuthPage() {
  const { login, signup, switchDemoRole } = useAuth();
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot', 'reset'
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup form state
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Forgot / Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Live password validation checks
  const checkPasswordStrength = (pwd) => {
    return {
      hasLength: pwd.length > 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    };
  };

  const pwdChecks = checkPasswordStrength(mode === 'signup' ? password : newPassword);
  const isPwdValid = pwdChecks.hasLength && pwdChecks.hasUpper && pwdChecks.hasLower && pwdChecks.hasSpecial;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!isPwdValid) {
      setError('Password does not meet all security requirements.');
      return;
    }
    setLoading(true);
    try {
      await signup({
        email,
        password,
        full_name: fullName,
        company_name: companyName || null,
        phone: phone || null,
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Email might already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: resetEmail });
      setResetMessage(res.data);
      if (res.data.reset_token) {
        setResetToken(res.data.reset_token);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error processing request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!isPwdValid) {
      setError('New password does not meet security requirements.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token: resetToken,
        new_password: newPassword,
      });
      setSuccess(res.data.message);
      setMode('login');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired reset token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Framer-grade Sleek Split Card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-zinc-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        
        {/* Left Hero Side (Minimalist TypeUI Aesthetics) */}
        <div className="lg:col-span-5 bg-zinc-950 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10">
            {/* Minimal Brand Mark */}
            <div className="flex items-center gap-2.5 mb-10">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-zinc-950 font-bold text-sm tracking-tight shadow-sm">
                B
              </div>
              <span className="font-semibold text-white tracking-tight text-base">Brightloop</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight leading-snug text-zinc-100">
                Unified subscription and recurring billing engine.
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Automate quote-to-cash workflows, multi-frequency plans, tax rules, and revenue reporting with sub-second performance.
              </p>
            </div>
          </div>

          {/* Minimal Key Indicators */}
          <div className="relative z-10 pt-8 border-t border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Recurring Billing</span>
              <span className="font-mono text-zinc-200 font-medium">Daily &bull; Weekly &bull; Monthly &bull; Yearly</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Query Performance</span>
              <span className="font-mono text-emerald-400 font-medium">&lt; 20ms SLA</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Idempotency</span>
              <span className="font-mono text-zinc-200 font-medium">Zero-Duplicate Engine</span>
            </div>
          </div>
        </div>

        {/* Right Form Side */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          
          {/* One-Click Demo Personas Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Instant Demo Sign-In
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 rounded-lg text-xs mb-6">
              <button
                type="button"
                onClick={() => switchDemoRole('admin')}
                className="py-1 px-2 rounded-md bg-white text-zinc-800 font-medium border border-zinc-200/60 shadow-2xs hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Shield className="w-3 h-3 text-zinc-500" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => switchDemoRole('staff')}
                className="py-1 px-2 rounded-md bg-white text-zinc-800 font-medium border border-zinc-200/60 shadow-2xs hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Briefcase className="w-3 h-3 text-zinc-500" />
                <span>Staff Rep</span>
              </button>
              <button
                type="button"
                onClick={() => switchDemoRole('customer')}
                className="py-1 px-2 rounded-md bg-white text-zinc-800 font-medium border border-zinc-200/60 shadow-2xs hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Store className="w-3 h-3 text-zinc-500" />
                <span>Customer</span>
              </button>
            </div>

            {/* Notifications */}
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2 animate-in fade-in">
                <X className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 animate-in fade-in">
                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            {/* Sign In / Register Tabs */}
            {(mode === 'login' || mode === 'signup') && (
              <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg w-fit text-xs font-medium mb-6">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className={`px-3 py-1 rounded-md transition-all ${
                    mode === 'login'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className={`px-3 py-1 rounded-md transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all placeholder:text-zinc-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-700">Password</label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); }}
                      className="text-xs text-zinc-500 hover:text-zinc-900 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all placeholder:text-zinc-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 mt-2"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* SIGNUP FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Marcus Vance"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Company (Optional)</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Corner Store LLC"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marcus@cornerstore.com"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create strong password"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  />

                  {/* Clean Minimalist Password Criteria Checklist */}
                  <div className="mt-2 p-2.5 bg-zinc-50 rounded-lg border border-zinc-200/80">
                    <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1.5">
                      Password Policy
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className={`flex items-center gap-1.5 ${pwdChecks.hasLength ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                        {pwdChecks.hasLength ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                        <span>&gt; 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdChecks.hasUpper ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                        {pwdChecks.hasUpper ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                        <span>Uppercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdChecks.hasLower ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                        {pwdChecks.hasLower ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                        <span>Lowercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdChecks.hasSpecial ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                        {pwdChecks.hasSpecial ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                        <span>Special character</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isPwdValid}
                  className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white font-medium rounded-lg text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 mt-2"
                >
                  {loading ? 'Creating Account...' : 'Register Account'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'forgot' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Reset your password</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Enter your registered email and we'll generate a secure reset link.
                  </p>
                </div>

                <form onSubmit={handleForgotSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg text-xs transition-all"
                  >
                    {loading ? 'Generating...' : 'Send Reset Link'}
                  </button>
                </form>

                {resetMessage && (
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-2">
                    <p className="text-zinc-700 font-medium">{resetMessage.message}</p>
                    {resetMessage.reset_token && (
                      <button
                        type="button"
                        onClick={() => {
                          setResetToken(resetMessage.reset_token);
                          setMode('reset');
                        }}
                        className="w-full py-1 px-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md font-medium text-xs text-center block"
                      >
                        Proceed to Reset Password &rarr;
                      </button>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); }}
                    className="text-xs text-zinc-500 hover:text-zinc-900"
                  >
                    &larr; Return to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* RESET PASSWORD CONFIRM FORM */}
            {mode === 'reset' && (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Set new password</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Please choose a password meeting the security criteria.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Reset Token</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-zinc-100 font-mono border border-zinc-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  />

                  {/* Password Checklist */}
                  <div className="mt-2 p-2.5 bg-zinc-50 rounded-lg border border-zinc-200/80">
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className={`flex items-center gap-1.5 ${pwdChecks.hasLength ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                        {pwdChecks.hasLength ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                        <span>&gt; 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdChecks.hasUpper ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                        {pwdChecks.hasUpper ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                        <span>Uppercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdChecks.hasLower ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                        {pwdChecks.hasLower ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                        <span>Lowercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdChecks.hasSpecial ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                        {pwdChecks.hasSpecial ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-zinc-300" />}
                        <span>Special character</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isPwdValid}
                  className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white font-medium rounded-lg text-xs transition-all"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); }}
                    className="text-xs text-zinc-500 hover:text-zinc-900"
                  >
                    &larr; Return to Sign In
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Minimalist Footer */}
          <div className="pt-6 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Secure Access Gateway</span>
            <span>Brightloop Software OS</span>
          </div>

        </div>

      </div>
    </div>
  );
}
