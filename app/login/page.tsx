'use client';

import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAuthUser } from '../admin/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@pos.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const authenticated = window.localStorage.getItem('pos-authenticated') === 'true';
    const storedUser = window.localStorage.getItem('pos-user');
    if (!authenticated || !storedUser) return;

    try {
      const user = JSON.parse(storedUser);
      if (isAuthUser(user)) router.replace('/');
    } catch {
      window.localStorage.removeItem('pos-authenticated');
      window.localStorage.removeItem('pos-user');
    }
  }, [router]);

  const handleLogin = async () => {
    setSubmitting(true);
    setError('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError('Email atau password belum sesuai.');
      return;
    }

    const { user } = await response.json();
    window.localStorage.setItem('pos-authenticated', 'true');
    window.localStorage.setItem('pos-user', JSON.stringify(user));
    router.push('/');
  };

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="POS login">
        <div className="login-panel">
          <div className="login-panel-inner">
            <div className="login-brand">
              <span className="login-mark" aria-hidden="true"><i /></span>
              <div>
                <strong>POS System</strong>
                <span>Global Point of Sale</span>
              </div>
            </div>

            <div className="login-copy">
              <span>Staff Access</span>
              <h1>Welcome back.</h1>
              <p>Sign in with your staff role to continue managing the POS workspace.</p>
            </div>

            <form className="login-form" onSubmit={(event) => {
              event.preventDefault();
              void handleLogin();
            }}>
              <label className="login-field">
                <span>Email</span>
                <div>
                  <Mail aria-hidden="true" />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
                </div>
              </label>

              <label className="login-field">
                <span>Password</span>
                <div>
                  <LockKeyhole aria-hidden="true" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
              </label>

              <div className="login-options">
                <label><input type="checkbox" defaultChecked /> Keep me signed in</label>
              </div>

              {error && <p className="login-error">{error}</p>}

              <button className="login-submit" type="submit">
                {submitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        <aside className="login-preview" aria-label="POS status preview">
          <div className="login-preview-head">
            <span><ShieldCheck aria-hidden="true" /> Secure POS</span>
            <strong>Operations workspace</strong>
          </div>

          <div className="login-preview-copy">
            <span>One calm workspace</span>
            <h2>Make every service moment count.</h2>
            <p>Keep orders, tables, and payments moving with a clear view of your operation.</p>
          </div>

          <div className="login-preview-art" aria-hidden="true">
            <span className="login-preview-orbit login-preview-orbit-one" />
            <span className="login-preview-orbit login-preview-orbit-two" />
            <span className="login-preview-orbit login-preview-orbit-three" />
            <div className="login-preview-art-label">
              <strong>Built for flow</strong>
              <span>From first order to final payment.</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
