"use client";

import React, { useState } from 'react';
import { X, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import API_BASE from '../lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthModalProps {
  dark?: boolean;
  onSuccess: (user: User, token: string) => void;
  onClose: () => void;
}

export default function AuthModal({ dark = true, onSuccess, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bg = '#ffffff';
  const border = '#e4e4e7';
  const textSub = '#6b7280';
  const inputBg = '#f9fafb';
  const textMain = '#09090b';
  const overlayBg = 'rgba(0,0,0,0.6)';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', background: inputBg, border: `1px solid ${border}`,
    borderRadius: 10, color: textMain, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: textSub, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' };

  const submit = async () => {
    setError('');
    if (!email || !password) { setError('Please fill in all required fields.'); return; }
    if (tab === 'register' && !username) { setError('Username is required.'); return; }
    if (tab === 'register' && password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/login' : '/register';
      const body = tab === 'login'
        ? { email, password }
        : { username, email, password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Something went wrong');
      localStorage.setItem('ca_token', data.token);
      localStorage.setItem('ca_user', JSON.stringify(data.user));
      onSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: overlayBg, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 20, width: '100%', maxWidth: 420, padding: 0, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', background: '#fafafa', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#0a0a0a' }}>RoastMyResume.ai</span>
            </div>
            <p style={{ fontWeight: 800, fontSize: 20, margin: 0, color: '#09090b' }}>
              {tab === 'login' ? 'Welcome back' : 'Create account'}
            </p>
            <p style={{ fontSize: 13, color: textSub, margin: '4px 0 0' }}>
              {tab === 'login' ? 'Sign in to access your AI career tools' : 'Join and start landing your dream job'}
            </p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', color: textSub, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${border}` }}>
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              style={{ flex: 1, padding: '12px 0', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent',
                color: tab === t ? '#09090b' : textSub,
                borderBottom: tab === t ? '2px solid #0a0a0a' : '2px solid transparent',
              }}
            >
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'register' && (
            <div>
              <label style={labelStyle}>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your name" style={inputStyle} />
            </div>
          )}

          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === 'register' ? 'Min 6 characters' : 'Your password'}
                style={{ ...inputStyle, paddingRight: 42 }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
              <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: textSub, display: 'flex' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#b91c1c', fontSize: 13 }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            style={{ width: '100%', padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#f4f4f5' : '#0a0a0a',
              color: loading ? '#a1a1aa' : '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 2px 12px rgba(0,0,0,0.18)',
              marginTop: 4,
            }}
          >
            {loading
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> {tab === 'login' ? 'Signing in...' : 'Creating account...'}</>
              : tab === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>

          {tab === 'login' && (
            <p style={{ textAlign: 'center', fontSize: 12, color: textSub, margin: 0 }}>
              Admin? Use <code style={{ background: '#f4f4f5', padding: '1px 6px', borderRadius: 4 }}>admin@careeragent.ai</code> / <code style={{ background: '#f4f4f5', padding: '1px 6px', borderRadius: 4 }}>Admin@123</code>
            </p>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
