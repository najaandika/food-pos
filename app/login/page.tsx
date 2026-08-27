'use client';

import { Eye, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@blocbarat.local');
  const [password, setPassword] = useState('blocbarat');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    window.localStorage.setItem('bloc-pos-authenticated', 'true');
    window.localStorage.setItem('bloc-pos-user', JSON.stringify(user));
    router.push('/');
  };

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="Bloc POS login">
        <div className="login-panel">
          <div className="login-panel-inner">
            <div className="login-brand">
              <span className="login-mark" aria-hidden="true"><i /><i /><i /></span>
              <div>
                <strong>Bloc POS</strong>
                <span>Cafe Bloc Barat Krui</span>
              </div>
            </div>

            <div className="login-copy">
              <span>Staff Access</span>
              <h1>Welcome back.</h1>
              <p>Sign in with your staff role to continue managing Bloc POS.</p>
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
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
                  <button type="button" aria-label="Show password"><Eye aria-hidden="true" /></button>
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

        <aside className="login-preview" aria-label="Cafe status preview">
          <div className="login-preview-head">
            <span><ShieldCheck aria-hidden="true" /> Secure POS</span>
            <strong>Evening Shift</strong>
          </div>

          <div className="login-preview-copy">
            <span>Live Workspace</span>
            <h2>Ready for the evening rush.</h2>
            <p>QR orders, cashier queue, and table service stay in one calm workspace.</p>
          </div>

          <div className="login-preview-panel">
            <div className="login-preview-metrics">
              <p><span>QR Orders</span><strong>142</strong></p>
              <p><span>Active Tickets</span><strong>24</strong></p>
              <p><span>Waiting Payment</span><strong>8</strong></p>
            </div>
            <div className="login-ticket">
              <div>
                <span>Current Queue</span>
                <strong>Table A4</strong>
                <small>Ready to pay - Order #925</small>
              </div>
              <b>$87.34</b>
            </div>
            <div className="login-flow">
              <p><span />QR received</p>
              <p><span />Kitchen ready</p>
              <p><span />Cashier closing</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
