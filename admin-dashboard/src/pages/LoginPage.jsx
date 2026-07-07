import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { login as apiLogin } from '../api/admin';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@repwave.io');
  const [password, setPassword] = useState('RepWaveAdmin123!');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      login(data);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-400 px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(196,168,240,0.25),transparent_45%)]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur">
            R
          </div>
          <h1 className="text-2xl font-bold">RepWave Admin</h1>
          <p className="mt-1 text-sm text-white/75">Super-admin access only</p>
        </div>

        <form onSubmit={handleSubmit} className="rw-glass rounded-3xl p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-2 text-brand-700">
            <ShieldCheckIcon className="h-5 w-5 text-brand-500" />
            <span className="text-sm font-semibold">Secure login</span>
          </div>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-brand-700">Email</span>
            <input
              type="email"
              className="rw-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>

          <label className="mb-6 block">
            <span className="mb-1.5 block text-sm font-medium text-brand-700">Password</span>
            <input
              type="password"
              className="rw-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" disabled={loading} className="rw-btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="mt-4 text-center text-xs text-brand-500">
            Tenant ERP users cannot access this console.
          </p>
        </form>
      </div>
    </div>
  );
}
