import { useState } from 'react';
import { ArrowRight, Shirt, ShieldCheck, Layers, Box } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export function AuthScreen() {
  const { authenticate, busy, error, status, initialize } = useWorkspaceStore();
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('register');
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [code, setCode] = useState('');
  return <main className="min-h-dvh bg-[#f4f2eb] text-stone-900 flex flex-col">
    <header className="px-6 md:px-12 py-6 flex gap-3 items-center"><Shirt className="text-teal-800" /><strong className="text-xl">OpenCLO</strong><span className="text-sm text-stone-500">Fashion starts here.</span></header>
    <div className="flex-1 max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center px-6 pb-12">
      <section className="pt-8"><p className="uppercase text-xs tracking-[.2em] text-teal-800 font-semibold mb-4">Your ideas. Your collection.</p>
        <h1 className="text-5xl md:text-6xl font-serif leading-[1.06] tracking-tight max-w-lg">Make the clothes<br />you imagine.</h1>
        <p className="text-stone-600 text-lg mt-6 max-w-md leading-relaxed">Start with a garment template. Make it yours with colors, artwork and sizing. See your design take shape in 3D.</p>
        <div className="mt-8 grid grid-cols-3 gap-4 max-w-md border-t border-stone-300 pt-6 text-sm">
          {[{ icon: Layers, label: 'Ready to edit templates' }, { icon: Box, label: 'Connected 2D & 3D' }, { icon: ShieldCheck, label: 'Your private workspace' }].map(({ icon: Icon, label }) => <div key={label}><Icon className="text-teal-800 mb-2" size={22} /><p>{label}</p></div>)}
        </div>
      </section>
      <section className="bg-white border border-stone-200 rounded-2xl p-6 md:p-9 shadow-sm max-w-lg w-full lg:justify-self-end" aria-labelledby="auth-heading">
        <h2 id="auth-heading" className="text-2xl font-semibold">{mode === 'register' ? 'Create your workspace' : mode === 'recover' ? 'Recover your account' : 'Welcome back'}</h2>
        <p className="text-sm text-stone-500 mt-2 mb-6">{mode === 'recover' ? 'Use the recovery code you saved when creating your account.' : 'Your designs stay private and follow you across devices.'}</p>
        {status === 'unavailable' && <div role="alert" className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">The account server is unavailable. <button className="underline" onClick={initialize}>Retry connection</button></div>}
        <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (await authenticate(mode, { name, email, password, recoveryCode: code })) setPassword(''); }}>
          {mode === 'register' && <label className="block text-sm font-medium">Your name<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="account-input" placeholder="What should we call you?" /></label>}
          <label className="block text-sm font-medium">Email<input required type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="account-input" placeholder="you@example.com" /></label>
          {mode === 'recover' && <label className="block text-sm font-medium">Recovery code<input required value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" className="account-input" /></label>}
          <label className="block text-sm font-medium">{mode === 'recover' ? 'New password' : 'Password'}<input required type="password" minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="account-input" aria-describedby="password-tip" /></label>
          <p id="password-tip" className="text-xs text-stone-500">At least 12 characters. A memorable phrase works well.</p>
          {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</p>}
          <button disabled={busy || status === 'unavailable'} className="w-full bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-lg px-4 py-3 font-medium flex justify-center items-center gap-2">{busy ? 'Opening your workspace…' : mode === 'register' ? 'Create account' : mode === 'recover' ? 'Reset password' : 'Sign in'}<ArrowRight size={17} /></button>
        </form>
        <div className="text-sm mt-5 text-center text-stone-600"><button className="text-teal-800 font-medium underline underline-offset-4" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setPassword(''); useWorkspaceStore.setState({ error: null }); }}>{mode === 'register' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button></div>
        {mode === 'login' && <button className="block mx-auto text-xs text-stone-500 underline mt-4" onClick={() => { setMode('recover'); useWorkspaceStore.setState({ error: null }); }}>Forgot your password?</button>}
      </section>
    </div>
  </main>;
}
