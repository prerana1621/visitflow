'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SalesShell } from '../../../../components/Brand';
import { api, formatDate, formatMoney } from '../../../../lib/api';

export default function LeadDetailPage() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [status, setStatus] = useState('New');
  const [assignedTo, setAssignedTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [detail, team] = await Promise.all([api(`/leads/${id}`), api('/leads/executives')]);
    setLead(detail.lead); setMessages(detail.messages || []); setStatus(detail.lead.status); setAssignedTo(detail.lead.assignedTo?._id || ''); setExecutives(team.executives || []);
  }
  useEffect(() => { if (id) load().catch((e) => { if (e.status === 401) location.assign('/login'); else setError(e.message); }).finally(() => setLoading(false)); }, [id]);

  async function saveChanges() {
    setBusy(true); setError(''); setNotice('');
    try { await api(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status, assignedTo: assignedTo || null }) }); await load(); setNotice('Lead details saved.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function handoff() {
    setBusy(true); setError(''); setNotice('');
    try { const data = await api(`/leads/${id}/handoff`, { method: 'POST' }); setLead(data.lead); setNotice('Handoff is ready. The summary is saved for the assigned executive.'); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return <SalesShell active="Lead inbox"><div className="detail-topbar"><div><Link className="back-link" href="/sales">← Back to inbox</Link><div className="eyebrow">BUYER ENQUIRY</div><h1>{lead?.name || (loading ? 'Loading lead…' : 'Lead details')}</h1><p>{lead?.leadCode} · Created {lead ? formatDate(lead.createdAt, { dateStyle: 'medium' }) : ''}</p></div>{lead && <span className={`status-pill status-${lead.status.toLowerCase().replaceAll(' ', '-')}`}>{lead.status}</span>}</div>
    {loading ? <div className="loading-line">Loading conversation…</div> : error && !lead ? <div className="error-panel">{error}</div> : lead && <div className="detail-grid"><div className="detail-main-col">
      <section className="sales-panel"><div className="panel-heading"><div><div className="eyebrow">BUYER PROFILE</div><h2>What we know</h2></div><span className="count-pill">{lead.language}</span></div><div className="buyer-facts"><div><small>Mobile</small><strong>{lead.phone}</strong></div><div><small>Project</small><strong>{lead.project?.name}</strong></div><div><small>Configuration</small><strong>{lead.wants}</strong></div><div><small>Budget</small><strong>{lead.budgetMin || lead.budgetMax ? `${formatMoney(lead.budgetMin)} – ${formatMoney(lead.budgetMax)}` : 'Not confirmed'}</strong></div><div><small>Buying timeline</small><strong>{lead.timeline || 'Not confirmed'}</strong></div><div><small>Lead source</small><strong>{lead.source}</strong></div></div></section>
      <section className="sales-panel"><div className="panel-heading"><div><div className="eyebrow">CONVERSATION</div><h2>Chat history</h2></div><span className="count-pill">{messages.length} messages</span></div><div className="conversation-history">{messages.length ? messages.map((message) => <div className={`history-item ${message.sender}`} key={message._id}><div className="history-meta"><strong>{message.sender === 'buyer' ? 'Buyer' : message.sender === 'assistant' ? 'VisitFlow assistant' : 'Sales executive'}</strong><time>{formatDate(message.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</time></div><p>{message.body}</p></div>) : <div className="empty-state"><strong>No messages yet</strong><p>The buyer has not started a conversation.</p></div>}</div></section>
    </div><aside className="detail-side-col">
      <section className="sales-panel"><div className="eyebrow">AI-ASSISTED CONTEXT</div><h2>Conversation summary</h2><div className="ai-summary"><span>REVIEW BEFORE ACTING</span><p>{lead.aiSummary || `Interested in ${lead.wants} at ${lead.project?.name}. Budget and timeline are not confirmed yet. Review the original messages before responding.`}</p></div><p className="side-description">The summary is a convenience for the sales team, not a source of truth. The original messages remain available.</p><button className="button button-dark full" onClick={handoff} disabled={busy}>Refresh summary & hand off ↗</button></section>
      <section className="sales-panel"><div className="eyebrow">FOLLOW-UP OWNERSHIP</div><h2>Manage this lead</h2><label className="admin-label">Status<select value={status} onChange={(e) => setStatus(e.target.value)}>{['New', 'In conversation', 'Handoff Required', 'Visit booked', 'Visited', 'Closed'].map((x) => <option key={x}>{x}</option>)}</select></label><label className="admin-label">Assigned executive<select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}><option value="">Unassigned</option>{executives.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</select></label><div className="detail-meta"><span>Consent recorded</span><strong>{lead.consentGiven ? formatDate(lead.consentAt, { dateStyle: 'medium' }) : 'No'}</strong><span>Contact preference</span><strong>{lead.optOut ? 'Opted out' : 'May contact'}</strong></div><button className="button button-dark full" onClick={saveChanges} disabled={busy}>Save lead changes</button></section>
      {notice && <div className="form-success">{notice}</div>}{error && <div className="form-error">{error}</div>}
    </aside></div>}</SalesShell>;
}
