import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';

export default function AdminLogin({ configured, error, onLogin, saving }) {
  const [password, setPassword] = useState('');

  function submit(event) {
    event.preventDefault();
    onLogin(password);
  }

  return (
    <section className="mx-auto mt-12 w-full max-w-md rounded-md border border-line bg-white p-5 shadow-[0_12px_36px_rgba(22,45,34,0.06)] sm:p-7" aria-labelledby="admin-login-title">
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-green/10 text-green"><ShieldCheck size={20} /></span>
      <div className="eyebrow mb-2"><span className="eyebrow-mark" /> RESTRICTED WORKSPACE</div>
      <h2 id="admin-login-title" className="text-[21px] font-extrabold">Admin sign in</h2>
      <p className="mt-2 text-[11px] leading-5 text-muted">Management actions are protected by the archive server.</p>
      {!configured ? (
        <div role="alert" className="mt-5 rounded-md border border-amber-line bg-amber-wash p-3 text-[11px] leading-5 text-amber-ink">
          Admin sign-in is disabled. Set <code className="font-mono">ADMIN_PASSWORD</code> to a unique value of at least 16 characters and restart the API.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="form-field"><span>Admin password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={16} autoFocus /></label>
          {error && <p role="alert" className="text-[11px] leading-5 text-red-700">{error}</p>}
          <button type="submit" disabled={saving} className="button-primary flex min-h-10 w-full items-center justify-center gap-2 text-[11px] font-bold disabled:opacity-60">
            <KeyRound size={15} /> {saving ? 'Verifying...' : 'Sign in'}
          </button>
        </form>
      )}
    </section>
  );
}