'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Brand } from '../../components/Brand';
import { api, formatDate } from '../../lib/api';

export default function BookingPage() {
  const [leadId, setLeadId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('');
  const [lead, setLead] = useState(null);
  const [project, setProject] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(preferredSlot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [visit, setVisit] = useState(null);

  async function load() {
    const [leadData, projectData, slotData] = await Promise.all([
      api(`/leads/${leadId}`), api(`/projects/${projectId}`), api(`/slots?projectId=${projectId}&days=14`),
    ]);
    setLead(leadData.lead); setProject(projectData.project); setSlots(slotData.slots || []);
    if (preferredSlot && !selected) setSelected(preferredSlot);
  }
  useEffect(() => { const params = new URLSearchParams(window.location.search); setLeadId(params.get('leadId') || ''); setProjectId(params.get('projectId') || ''); setPreferredSlot(params.get('slotId') || ''); }, []);
  useEffect(() => { if (!leadId || !projectId) return; load().catch((e) => { if (e.status === 401) location.assign('/login'); else setError(e.message); }); }, [leadId, projectId]);

  const grouped = useMemo(() => slots.reduce((groups, slot) => { const key = new Date(slot.startAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }); (groups[key] ||= []).push(slot); return groups; }, {}), [slots]);

  async function confirm() {
    if (!selected) return;
    setBusy(true); setError('');
    try { const data = await api('/bookings', { method: 'POST', body: JSON.stringify({ leadId, slotId: selected }) }); setVisit(data.visit); await load(); }
    catch (e) { setError(e.message); if (e.status === 409) load().catch(() => {}); }
    finally { setBusy(false); }
  }

  return <div className="booking-page"><header className="chat-header"><Brand/><Link className="back-link" href="/chat">← Back to conversation</Link></header>
    <main className="booking-main"><div className="eyebrow">A TIME THAT WORKS FOR YOU</div><h1>Make it a <em>real visit.</em></h1><p className="booking-subtitle">Choose an available time to meet the sales team. The slot is reserved only after the server confirms it.</p>
      {visit ? <section className="confirmation-card"><div className="confirmation-icon">✓</div><div className="eyebrow">VISIT CONFIRMED</div><h2>We look forward to meeting you.</h2><p>{project?.name || 'Selected project'}</p><strong>{formatDate(visit.slot?.startAt, { dateStyle: 'full', timeStyle: 'short' })}</strong><span className="confirmation-code">Confirmation {visit.confirmationCode}</span><p className="small-muted">A reminder is scheduled 24 hours and 2 hours before your visit. Delivery is simulated in this demo.</p><Link href="/chat" className="button button-dark">Return to conversation ↗</Link></section> : <section className="booking-card">
        <div className="booking-card-header"><div><div className="eyebrow">YOUR SELECTION</div><h2>{project?.name || 'Loading project…'}</h2><p className="booking-duration">{lead?.name ? `For ${lead.name}` : 'Buyer enquiry'}</p></div><span className="count-pill">{slots.length} free slots</span></div>
        <div className="booking-location"><span>⌖</span><div><strong>Visit location</strong><p>Exact address and pin will be confirmed by your assigned sales executive. No unverified location is shown here.</p></div></div>
        {Object.keys(grouped).length ? <div className="slot-groups">{Object.entries(grouped).map(([date, daySlots]) => <div className="slot-day" key={date}><div className="slot-date">{date}</div><div className="slot-grid">{daySlots.map((slot) => <button type="button" key={slot._id} className={`slot-option ${selected === slot._id ? 'selected' : ''}`} onClick={() => setSelected(slot._id)}><strong>{new Date(slot.startAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</strong><small>{Math.round((new Date(slot.endAt) - new Date(slot.startAt)) / 60000)} min · {slot.bookedCount}/{slot.capacity} reserved</small></button>)}</div></div>)}</div> : <div className="empty-state"><div className="empty-icon">◷</div><strong>No free slots right now</strong><p>There are no bookable times in the next 14 days. Ask a sales executive to arrange another time.</p><Link href="/chat" className="text-link">Return to assistant ↗</Link></div>}
        <button className="button button-dark full" type="button" onClick={confirm} disabled={!selected || busy}>{busy ? 'Checking availability…' : 'Confirm site visit ↗'}</button>
        <p className="booking-footnote">A selected time is not reserved until confirmation succeeds. If another buyer takes it first, choose another free slot.</p>
      </section>}
      {error && <div className="form-error">{error}</div>}
    </main>
  </div>;
}
