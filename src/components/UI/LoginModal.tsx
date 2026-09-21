import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Lock,
  User,
  Crown,
  KeyRound,
  X,
  AlertCircle,
  CheckCircle2,
  Shirt,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { loginModalOpen, setLoginModalOpen, login } = useAuthStore();
  const [username, setUsername] = useState('aghyksa');
  const [password, setPassword] = useState('aduhlupa');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!loginModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim() || !password) {
      setErrorMsg('Username dan password wajib diisi!');
      return;
    }

    const res = login(username.trim(), password);
    if (!res.success) {
      setErrorMsg(res.message || 'Login gagal!');
    } else {
      setSuccessMsg('Login berhasil! Selamat datang kembali.');
      setTimeout(() => {
        setSuccessMsg(null);
        setLoginModalOpen(false);
      }, 700);
    }
  };

  const handleQuickSuperadmin = () => {
    setUsername('aghyksa');
    setPassword('aduhlupa');
    setErrorMsg(null);
    const res = login('aghyksa', 'aduhlupa');
    if (res.success) {
      setSuccessMsg('Masuk sebagai Superadmin (Aghyksa)...');
      setTimeout(() => {
        setSuccessMsg(null);
        setLoginModalOpen(false);
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#151821] border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide">Masuk OpenCLO</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                  Auth v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Garment CAD & Technical Fashion Engine</p>
            </div>
          </div>
          <button
            onClick={() => setLoginModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick Superadmin One-Click Bar */}
          <div
            onClick={handleQuickSuperadmin}
            className="p-3 rounded-xl bg-gradient-to-r from-purple-950/50 to-blue-950/50 border border-purple-500/40 hover:border-purple-400 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-purple-300">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-purple-200 group-hover:text-purple-100 flex items-center gap-1.5">
                  <span>Masuk Cepat Superadmin</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono">aghyksa : aduhlupa</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Username</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="aghyksa"
                className="w-full bg-[#1c202c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Password</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="aduhlupa"
                className="w-full bg-[#1c202c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>Masuk ke Workspace</span>
          </button>
        </form>

        {/* Footer credentials reminder */}
        <div className="px-6 py-3 bg-[#11131a] border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Superadmin: <code className="text-purple-300">aghyksa</code></span>
          <span>Password: <code className="text-purple-300">aduhlupa</code></span>
        </div>
      </div>
    </div>
  );
};
