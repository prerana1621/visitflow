'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SalesShell } from '../../components/Brand';
import { api, formatDate } from '../../lib/api';

export default function AdminPage() {
  const [projects, setProjects] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({ description: '', priceRangeText: '', registrationNumber: '', verifiedAddress: '' });
  const [slotForm, setSlotForm] = useState({ projectId: '', date: '', start: '11:00', end: '11:45', capacity: 1, locationLabel: 'Project sales office (location confirmed by executive)' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [p, s] = await Promise.all([api('/admin/fact-sheets'), api('/admin/slots')]);
    setProjects(p.projects || []); setSlots(s.slots || []);
    const project = p.projects?.find((x) => x._id === selectedId) || p.projects?.[0];
    if (project) { setSelectedId(project._id); setForm({ description: project.description || '', priceRangeText: project.priceRangeText || '', registrationNumber: project.registrationNumber || '', verifiedAddress: project.verifiedAddress || '' }); setSlotForm((prev) => ({ ...prev, projectId: prev.projectId || project._id })); }
  }
  useEffect(() => { load().catch((e) => { if (e.status === 401 || e.status === 403) location.assign('/login'); else setError(e.message); }).finally(() => setLoading(false)); }, []);

  function changeProject(id) {
    setSelectedId(id); const project = projects.find((x) => x._id === id);
    if (project) setForm({ description: project.description || '', priceRangeText: project.priceRangeText || '', registrationNumber: project.registrationNumber || '', verifiedAddress: project.verifiedAddress || '' });
  }
  async function saveFactSheet(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await api(`/admin/fact-sheets/${selectedId}`, { method: 'PATCH', body: JSON.stringify(form) }); await load(); setNotice('Approved fact sheet updated. The assistant will use these saved facts on its next reply.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function toggleSlot(slot) {
    setBusy(true); setError(''); setNotice('');
    try { await api(`/admin/slots/${slot._id}`, { method: 'PATCH', body: JSON.stringify({ active: !slot.active }) }); await load(); setNotice(slot.active ? 'Slot deactivated.' : 'Slot reactivated.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function createSlot(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const startAt = new Date(`${slotForm.date}T${slotForm.start}:00+05:30`).toISOString();
      const endAt = new Date(`${slotForm.date}T${slotForm.end}:00+05:30`).toISOString();
      await api('/admin/slots', { method: 'POST', body: JSON.stringify({ projectId: slotForm.projectId, startAt, endAt, capacity: Number(slotForm.capacity), locationLabel: slotForm.locationLabel }) });
      await load(); setNotice('New visit slot created.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return <SalesShell active="Project settings"><div className="sales-topbar"><div><div className="eyebrow">ADMINISTRATION</div><h1>Keep the facts current.</h1><p>Manage approved project information and the real slots buyers can reserve.</p></div><Link className="button button-dark" href="/sales">Sales workspace ↗</Link></div>
    {loading ? <div className="loading-line">Loading project settings…</div> : <><div className="admin-grid"><section className="sales-panel"><div className="eyebrow">APPROVED INFORMATION</div><h2>Project fact sheet</h2><form className="form-stack" onSubmit={saveFactSheet}><label className="admin-label">Select project<select value={selectedId} onChange={(e) => changeProject(e.target.value)}>{projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></label><label className="admin-label">Verified description<textarea rows="4" maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label><label className="admin-label">Approved portfolio price wording<input value={form.priceRangeText} maxLength={180} onChange={(e) => setForm({ ...form, priceRangeText: e.target.value })}/></label><label className="admin-label">RERA registration number<input value={form.registrationNumber} maxLength={80} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} placeholder="Enter only after verification"/></label><label className="admin-label">Verified site address<input value={form.verifiedAddress} maxLength={240} onChange={(e) => setForm({ ...form, verifiedAddress: e.target.value })} placeholder="Enter only after verification"/></label><div className="admin-warning">Do not publish promotional facts until the registration number and address are verified by the sales head. The AI can only use information saved here.</div><button className="button button-dark full" disabled={busy || !selectedId}>Save approved facts</button></form></section>
      <section className="sales-panel"><div className="eyebrow">BOOKING INVENTORY</div><h2>Create a site-visit slot</h2><form className="form-stack" onSubmit={createSlot}><label className="admin-label">Project<select value={slotForm.projectId} onChange={(e) => setSlotForm({ ...slotForm, projectId: e.target.value })}>{projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></label><label className="admin-label">Date<input type="date" min={new Date().toISOString().slice(0, 10)} value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} required/></label><div className="two-fields"><label className="admin-label">Starts<input type="time" value={slotForm.start} onChange={(e) => setSlotForm({ ...slotForm, start: e.target.value })} required/></label><label className="admin-label">Ends<input type="time" value={slotForm.end} onChange={(e) => setSlotForm({ ...slotForm, end: e.target.value })} required/></label></div><label className="admin-label">Capacity<input type="number" min="1" max="20" value={slotForm.capacity} onChange={(e) => setSlotForm({ ...slotForm, capacity: e.target.value })} required/></label><label className="admin-label">Location note<input value={slotForm.locationLabel} maxLength={160} onChange={(e) => setSlotForm({ ...slotForm, locationLabel: e.target.value })}/></label><div className="admin-warning">Capacity is enforced on the server during reservation. The exact map pin is not shown until the sales team verifies the address.</div><button className="button button-dark full" disabled={busy || !slotForm.projectId}>Create available slot ↗</button></form></section></div>
      <section className="sales-panel admin-slots"><div className="panel-heading"><div><div className="eyebrow">SCHEDULE</div><h2>Recent visit slots</h2></div><span className="count-pill">{slots.length} records</span></div><div className="table-scroll"><table className="lead-table"><thead><tr><th>PROJECT</th><th>DATE & TIME</th><th>CAPACITY</th><th>STATUS</th><th/></tr></thead><tbody>{slots.slice(0, 18).map((slot) => <tr key={slot._id}><td>{slot.project?.name || '—'}</td><td>{formatDate(slot.startAt)}</td><td>{slot.bookedCount}/{slot.capacity}</td><td><span className="status-pill">{!slot.active ? 'Inactive' : slot.bookedCount >= slot.capacity ? 'Full' : 'Available'}</span></td><td>{slot.bookedCount === 0 && <button className="text-button" type="button" onClick={() => toggleSlot(slot)} disabled={busy}>{slot.active ? 'Deactivate' : 'Reactivate'}</button>}</td></tr>)}</tbody></table>{!slots.length && <div className="empty-state"><strong>No slots created</strong><p>Create the first bookable visit time above.</p></div>}</div></section>
    </>}{notice && <div className="form-success" style={{ marginTop: 15 }}>{notice}</div>}{error && <div className="form-error" style={{ marginTop: 15 }}>{error}</div>}
  </SalesShell>;
}
