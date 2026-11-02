'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Brand } from '../../components/Brand';
import { api } from '../../lib/api';

export default function LoginPage() {
  const [mode, setMode] = useState('buyer');
  const [phone, setPhone] = useState('0000000001');
  const [code, setCode] = useState('246810');
  const [email, setEmail] = useState('sales@visitflow.demo');
  const [password, setPassword] = useState('Demo@123!');
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestOtp() {
    setBusy(true); setError(''); setMessage('');
    try {
      const data = await api('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) });
      setRequested(true);
      setMessage(data.demoCode ? `Demo OTP: ${data.demoCode}. No SMS was sent.` : data.message);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function verifyOtp(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, code }) }); location.assign('/chat'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function executiveLogin(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const { user } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      location.assign(user.isAdmin ? '/admin' : '/sales');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return <main className="login-page">
    <div className="login-brand"><Brand /><Link className="text-link" href="/">Back to website ↗</Link></div>
    <section className="login-card">
      <div className="eyebrow">WELCOME TO VISITFLOW</div>
      <h1>Good to have<br/><em>you here.</em></h1>
      <p className="login-intro">Sign in to continue your property conversation or manage buyer enquiries.</p>
      <div className="login-tabs"><button type="button" className={mode === 'buyer' ? 'selected' : ''} onClick={() => { setMode('buyer'); setError(''); setMessage(''); }}>I'm exploring</button><button type="button" className={mode === 'sales' ? 'selected' : ''} onClick={() => { setMode('sales'); setError(''); setMessage(''); }}>Sales team</button></div>
      {mode === 'buyer' ? <form className="form-stack" onSubmit={verifyOtp}>
        <label>Mobile number<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" required/></label>
        {requested && <label>One-time password<input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit OTP" required/></label>}
        {!requested ? <button className="button button-dark full" type="button" onClick={requestOtp} disabled={busy}>{busy ? 'Please wait…' : 'Request demo OTP ↗'}</button> : <><button className="button button-dark full" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify and continue ↗'}</button><button className="text-button" type="button" onClick={() => setRequested(false)}>Change mobile number</button></>}
      </form> : <form className="form-stack" onSubmit={executiveLogin}>
        <label>Work email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" required/></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required/></label>
        <button className="button button-dark full" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to workspace ↗'}</button>
      </form>}
      {message && <div className="form-success">{message}</div>}{error && <div className="form-error">{error}</div>}
    </section>
    <p className="login-foot">Synthetic demo environment · No real messages are sent</p>
  </main>;
}
