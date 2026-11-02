'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SalesShell } from '../../components/Brand';
import { api } from '../../lib/api';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/analytics').then(setData).catch((e) => { if (e.status === 401) location.assign('/login'); else setError(e.message); }); }, []);
  const metrics = data?.metrics;
  return <SalesShell active="Analytics"><div className="sales-topbar"><div><div className="eyebrow">PERFORMANCE / SOURCE MIX</div><h1>See what brings people in.</h1><p>Source-level enquiry and visit outcomes from the seeded demo records.</p></div><Link className="button button-dark" href="/sales">Back to overview ↗</Link></div>
    {error && <div className="form-error">{error}</div>}{!data && !error ? <div className="loading-line">Calculating performance…</div> : metrics && <><section className="stats-grid"><div className="stat-card"><span>LEADS</span><strong>{metrics.totalLeads}</strong><small>All recorded enquiries</small></div><div className="stat-card"><span>RECORDED VISITS</span><strong>{metrics.totalVisits}</strong><small>All visit outcomes</small></div><div className="stat-card"><span>CONFIRMED VISITS</span><strong>{metrics.confirmedVisits}</strong><small>Upcoming / confirmed</small></div><div className="stat-card"><span>SHOW-UP RATE</span><strong>{metrics.showUpRate == null ? '—' : `${metrics.showUpRate}%`}</strong><small>{metrics.completedOutcomes} completed outcomes</small></div><div className="stat-card"><span>PENDING HANDOFFS</span><strong>{metrics.pendingHandoffs}</strong><small>Needs a human response</small></div></section>
      <section className="sales-panel"><div className="panel-heading"><div><div className="eyebrow">SOURCE PERFORMANCE</div><h2>Lead to visit by channel</h2></div><span className="panel-period">Seeded sample</span></div><div className="source-list">{data.sources.map((s) => <div className="analytics-source" key={s.source}><div className="source-name"><i className="source-dot"/><strong>{s.source}</strong></div><div className="analytics-numbers"><span><b>{s.leads}</b> leads</span><span><b>{s.visits}</b> visits</span><span><b>{s.showUps}</b> showed</span><span><b>{s.leads ? Math.round(s.visits / s.leads * 100) : 0}%</b> visit rate</span></div><div className="source-bar-wrap"><i className="source-bar" style={{ width: `${s.leads ? Math.max(3, s.visits / s.leads * 100) : 0}%` }}/></div></div>)}</div><div className="admin-warning" style={{ marginTop: 24 }}>{data.note}</div></section>
      <section className="sales-panel" style={{ marginTop: 16 }}><div className="eyebrow">METRIC DEFINITIONS</div><h2>Keep the numbers honest.</h2><p className="side-description">Visit rate uses recorded visits divided by all leads. Show-up rate uses completed outcomes (VISITED divided by VISITED plus NO_SHOW); pending and cancelled visits are excluded. First-response time is measured from the lead creation timestamp to the first stored assistant or human response. Cost per visit is intentionally blank because source-wise media spend was not supplied.</p></section>
    </>}
  </SalesShell>;
}
