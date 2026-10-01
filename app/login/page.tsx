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

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError('Email atau password belum sesuai.');
        return;
      }

      const { user } = await response.json();
      window.localStorage.setItem('pos-authenticated', 'true');
      window.localStorage.setItem('pos-user', JSON.stringify(user));
      router.push('/');
    } catch {
      setError('Tidak dapat terhubung ke server. Coba lagi sesaat lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="POS login">
        <div className="login-panel">
          <div className="login-panel-inner">
            <div className="login-brand">
              <span className="login-mark" aria-hidden="true">P</span>
              <div>
                <strong>POS</strong>
                <span>Point of Sale</span>
              </div>
            </div>

            <div className="login-copy">
              <span>Ruang kerja staf</span>
              <h1>Selamat datang kembali.</h1>
              <p>Masuk dengan akun staf Anda untuk mengelola layanan hari ini.</p>
            </div>

            <form className="login-form" onSubmit={(event) => {
              event.preventDefault();
              void handleLogin();
            }}>
              <label className="login-field">
                <span>Email</span>
                <div>
                  <Mail aria-hidden="true" />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nama@restoran.com" required disabled={submitting} />
                </div>
              </label>

              <label className="login-field">
                <span>Password</span>
                <div>
                  <LockKeyhole aria-hidden="true" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Masukkan password" required disabled={submitting} />
                  <button type="button" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShowPassword(!showPassword)} disabled={submitting}>
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
              </label>

              <div className="login-options">
                <label><input type="checkbox" defaultChecked /> Ingat perangkat ini</label>
              </div>

              {error && <p className="login-error">{error}</p>}

              <button className="login-submit" type="submit" disabled={submitting}>
                {submitting ? 'Memverifikasi...' : 'Masuk ke POS'}
              </button>
            </form>

            <p className="login-support"><ShieldCheck aria-hidden="true" /> Akses Anda dilindungi dan dicatat dengan aman.</p>
          </div>
        </div>

        <aside className="login-preview" aria-label="POS status preview">
          <div className="login-preview-head">
            <span className="login-preview-mark" aria-hidden="true">P</span>
            <strong>POS</strong>
          </div>

          <div className="login-preview-copy">
            <span>Sistem operasional modern</span>
            <h2>Lebih fokus pada layanan.</h2>
            <p>Satu workspace yang sederhana untuk mengelola pesanan, meja, dan pembayaran.</p>
          </div>

          <p className="login-preview-footer"><span /> Dibuat untuk layanan yang mengalir.</p>
        </aside>
      </section>
    </main>
  );
}
