'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Brand } from '../../components/Brand';
import { api, formatDate } from '../../lib/api';

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [lead, setLead] = useState(null);
  const [name, setName] = useState('');
  const [wants, setWants] = useState('Not sure');
  const [language, setLanguage] = useState('English');
  const [consent, setConsent] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    Promise.all([api('/auth/me'), api('/projects')]).then(([me, data]) => {
      setUser(me.user); setProjects(data.projects || []); setProjectId(data.projects?.[0]?._id || '');
      return api('/leads');
    }).then((data) => {
      const existing = data.leads?.[0];
      if (existing) { setLead(existing); setName(existing.name); setWants(existing.wants); setLanguage(existing.language || 'English'); return api(`/leads/${existing._id}`); }
      return null;
    }).then((detail) => { if (detail) setMessages(detail.messages || []); })
      .catch(() => location.assign('/login')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, slots]);

  async function startEnquiry(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const data = await api('/leads', { method: 'POST', body: JSON.stringify({ name, projectId, source: 'Website', wants, language, consentGiven: consent }) });
      setLead(data.lead);
      if (data.duplicateReused) { const detail = await api(`/leads/${data.lead._id}`); setMessages(detail.messages || []); setNotice('We found your existing enquiry and continued it here.'); }
      else setMessages([]);
      setError('');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function sendMessage(event) {
    event.preventDefault(); if (!text.trim() || !lead || busy) return;
    const outgoing = text.trim(); setText(''); setError('');
    setMessages((current) => [...current, { _id: `local-${Date.now()}`, sender: 'buyer', body: outgoing, createdAt: new Date().toISOString() }]);
    setBusy(true);
    try {
      const data = await api(`/chat/${lead._id}/messages`, { method: 'POST', body: JSON.stringify({ message: outgoing }) });
      setMessages((current) => [...current, data.assistantMessage]); setSlots(data.availableSlots || []);
      const refreshed = await api(`/leads/${lead._id}`); setLead(refreshed.lead);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function optOut() {
    if (!lead || lead.optOut) return;
    setBusy(true); setError(''); setNotice('');
    try { const data = await api(`/leads/${lead._id}/opt-out`, { method: 'POST' }); setLead({ ...lead, optOut: true }); setNotice(data.message); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function handoff() {
    if (!lead) return;
    setBusy(true); setError(''); setNotice('');
    try { const data = await api(`/leads/${lead._id}/handoff`, { method: 'POST' }); setLead(data.lead); setNotice('Your enquiry is now with the sales team. They can review this conversation and follow up.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (loading) return <div className="loading-page">Preparing your conversation…</div>;
  return <div className="chat-page">
    <header className="chat-header"><Brand/><div className="chat-header-center"><span className="status-dot"/> VISITFLOW ASSISTANT <small>English · हिन्दी · ગુજરાતી</small></div><Link className="back-link" href="/">Exit <span>↗</span></Link></header>
    <main className="chat-wrap">
      <aside className="chat-context"><Link className="back-link" href="/">← Back to projects</Link><div className="eyebrow">A BETTER FIRST STEP</div><h1>Let's talk about<br/><em>your next home.</em></h1><p>Tell us what matters to you. Our assistant can share verified basics, understand what you are looking for and help arrange a visit.</p>
        <div className="context-detail"><span>01</span><div><strong>Answers from verified facts</strong><small>No made-up amenities or promises.</small></div></div><div className="context-detail"><span>02</span><div><strong>A real person when needed</strong><small>Ask for a sales executive at any time.</small></div></div><div className="context-detail"><span>03</span><div><strong>Book only a free slot</strong><small>Availability is checked again at booking.</small></div></div>
      </aside>
      <section className="chat-panel">
        <div className="chat-panel-top"><div><strong>Property concierge</strong><span>{lead ? `Enquiry ${lead.leadCode || ''} · ${lead.project?.name || 'Your project'}` : 'Start with a few details'}</span></div><span className="online-pill">● DEMO ONLINE</span></div>
        {!lead ? <form className="lead-start-form form-stack" onSubmit={startEnquiry}>
          <p className="form-intro">Let's start with the essentials. Your details stay in this demo workspace.</p>
          <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nidhi Shah" required minLength={2}/></label>
          <label>Project<select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>{projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></label>
          <div className="two-fields"><label>Looking for<select value={wants} onChange={(e) => setWants(e.target.value)}><option>Not sure</option><option>2 BHK</option><option>3 BHK</option></select></label><label>Language<select value={language} onChange={(e) => setLanguage(e.target.value)}><option>English</option><option>Hindi</option><option>Gujarati</option></select></label></div>
          <label className="consent-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required/><span>I agree to be contacted about this enquiry. I can opt out at any time.</span></label>
          <button className="button button-dark full" disabled={busy || !projects.length}>{busy ? 'Creating enquiry…' : 'Start conversation ↗'}</button>
          {!projects.length && <p className="empty-note">No published projects are available right now.</p>}
        </form> : <>
          <div className="chat-messages">
            <div className="assistant-intro"><div className="assistant-avatar">v</div><div><strong>Hello{lead.name ? `, ${lead.name.split(' ')[0]}` : ''}.</strong><p>I'm here to help with verified project information. What would you like to know?</p><div className="quick-prompts"><button type="button" onClick={() => setText('I am interested in a 2 BHK. Can you share the basics?')}>2 BHK information</button><button type="button" onClick={() => setText('I would like to arrange a site visit.')}>Book a site visit</button></div></div></div>
            {messages.map((m) => <div key={m._id} className={`message-row ${m.sender === 'buyer' ? 'buyer-message' : 'assistant-message'}`}><div className="message-bubble"><p>{m.body}</p><small>{m.sender === 'buyer' ? 'You' : 'VisitFlow'} · {formatDate(m.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</small></div></div>)}
            {busy && <div className="typing-state"><span/><span/><span/> Assistant is thinking</div>}
            {slots.length > 0 && <div className="slot-suggestions"><strong>Available visit times</strong><p>These slots are currently free. Availability is checked again when you confirm.</p>{slots.map((slot) => <Link key={slot.id} className="slot-suggestion" href={`/book?leadId=${lead._id}&projectId=${lead.project?._id || lead.project}&slotId=${slot.id}`}><span>{formatDate(slot.startAt, { dateStyle: 'medium', timeStyle: 'short' })}</span><b>Choose ↗</b></Link>)}</div>}
            {lead.status === 'Handoff Required' && <div className="handoff-note">A sales executive has been asked to review this conversation.</div>}
            <div ref={bottomRef}/>
          </div>
          {!lead.optOut ? <form className="chat-compose" onSubmit={sendMessage}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about the projects…" aria-label="Your message" maxLength={2000}/><button type="submit" disabled={busy || !text.trim()} aria-label="Send message">↗</button></form> : <div className="optout-state">You have opted out of follow-up contact. Booking remains available, but reminders and further contact will be skipped.</div>}
          <div className="chat-actions-row"><button type="button" className="text-button" onClick={handoff} disabled={busy || lead.optOut}>Talk to a person</button><Link className="text-button" href={`/book?leadId=${lead._id}&projectId=${lead.project?._id || lead.project}`}>View all visit slots</Link><button type="button" className="text-button" onClick={() => { setLead(null); setMessages([]); setSlots([]); setConsent(false); setError(''); setNotice(''); }}>New enquiry</button><button type="button" className="text-button" onClick={optOut} disabled={busy || lead.optOut}>{lead.optOut ? 'Opted out' : 'Stop contact'}</button></div>
        </>}
        {error && <div className="form-error chat-error">{error}</div>}{notice && <div className="form-success chat-error">{notice}</div>}
        <div className="chat-privacy">Demo experience · Messages are stored in this workspace · No WhatsApp message is sent</div>
      </section>
    </main>
    <footer className="chat-footer public-footer"><span>© 2026 VisitFlow · Demo experience</span><span>Prices, addresses and registration details require executive verification.</span></footer>
  </div>;
}
