'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SalesShell } from '../../components/Brand';
import { api, formatDate } from '../../lib/api';

export default function SalesPage() {
  const [metrics, setMetrics] = useState(null);
  const [sources, setSources] = useState([]);
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/analytics'), api('/leads')]).then(([a, l]) => { setMetrics(a.metrics); setSources(a.sources || []); setLeads(l.leads || []); }).catch((e) => { if (e.status === 401) location.assign('/login'); else setError(e.message); }).finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => leads.filter((lead) => (filter === 'All' || lead.status === filter) && `${lead.name} ${lead.leadCode} ${lead.project?.name} ${lead.source}`.toLowerCase().includes(query.toLowerCase())), [leads, filter, query]);

  return <SalesShell active="Overview"><div className="sales-topbar"><div><div className="eyebrow">AHMEDABAD · SALES WORKSPACE</div><h1>Good morning, team.</h1><p>A clear view of enquiries, visits and what needs attention today.</p></div><Link className="button button-dark" href="/admin">Manage slots ↗</Link></div>
    {loading ? <div className="loading-line">Loading sales workspace…</div> : error ? <div className="error-panel">{error}</div> : <>
      <section className="stats-grid">
        <div className="stat-card"><span>TOTAL LEADS</span><strong>{metrics?.totalLeads ?? 0}</strong><small>Across all sources</small></div>
        <div className="stat-card stat-accent"><span>VISIT RATE</span><strong>{metrics?.visitRate ?? 0}%</strong><small>Leads with a booked visit</small></div>
        <div className="stat-card"><span>SHOW-UP RATE</span><strong>{metrics?.showUpRate == null ? '—' : `${metrics.showUpRate}%`}</strong><small>Visited / all recorded visits</small></div>
        <div className="stat-card"><span>AVG. FIRST RESPONSE</span><strong>{metrics?.avgResponseMinutes == null ? '—' : `${metrics.avgResponseMinutes}m`}</strong><small>From enquiry creation</small></div>
      </section>
      <div className="sales-content-grid"><section className="sales-panel"><div className="panel-heading"><div><div className="eyebrow">LEAD ACQUISITION</div><h2>Where enquiries come from</h2></div><span className="panel-period">All time · Demo data</span></div>
        <div className="source-list">{sources.length ? sources.map((source) => <div className="source-row" key={source.source}><div className="source-name"><i className="source-dot"/><strong>{source.source}</strong></div><div className="source-bar-wrap"><i className="source-bar" style={{ width: `${Math.max(4, (source.leads / Math.max(...sources.map((s) => s.leads), 1)) * 100)}%` }}/></div><b className="source-value">{source.leads}</b><small>{source.visits} visits</small></div>) : <div className="empty-state"><strong>No source data yet</strong></div>}</div>
        <div className="panel-footnote">Cost per visit is not calculated until source-wise advertising spend is configured.</div></section>
        <section className="sales-panel pulse-panel"><div className="eyebrow">NEEDS ATTENTION</div><h2>{metrics?.pendingHandoffs ?? 0} conversations<br/>ready for a person.</h2><p className="side-description">These buyers asked for help or the assistant could not safely verify an answer.</p><div className="pulse-stat"><strong>{metrics?.reminderLogs ?? 0}</strong><span>Reminder delivery records</span></div><Link className="text-link" href="#leads">Review lead inbox ↓</Link></section></div>
      <section className="sales-panel leads-panel" id="leads"><div className="panel-heading"><div><div className="eyebrow">YOUR PIPELINE</div><h2>Lead inbox</h2></div><span className="count-pill">{filtered.length} records</span></div>
        <div className="lead-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, lead ID or project…" aria-label="Search leads"/><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status"><option>All</option>{['New', 'In conversation', 'Handoff Required', 'Visit booked', 'Visited', 'Closed'].map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="table-scroll"><table className="lead-table"><thead><tr><th>BUYER</th><th>PROJECT / INTEREST</th><th>SOURCE</th><th>STATUS</th><th>LAST ACTIVE</th><th/></tr></thead><tbody>{filtered.map((lead) => <tr key={lead._id}><td><strong>{lead.name}</strong><small>{lead.leadCode}</small></td><td>{lead.project?.name || '—'}<small>{lead.wants}</small></td><td>{lead.source}</td><td><span className={`status-pill status-${lead.status.toLowerCase().replaceAll(' ', '-')}`}>{lead.status}</span></td><td>{formatDate(lead.lastActivityAt, { dateStyle: 'medium' })}</td><td><Link className="row-arrow" href={`/sales/leads/${lead._id}`} aria-label={`Open ${lead.name}`}>↗</Link></td></tr>)}{!filtered.length && <tr><td colSpan="6"><div className="empty-state"><strong>No matching leads</strong><p>Try a different search or status filter.</p></div></td></tr>}</tbody></table></div>
      </section>
    </>}
  </SalesShell>;
}
