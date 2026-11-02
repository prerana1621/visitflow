import Link from 'next/link';

export function Brand({ light = false }) {
  return <Link href="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="VisitFlow home">
    <span className="brand-mark">v</span><span>visit<span className="brand-accent">flow</span></span>
  </Link>;
}

export function AppHeader({ role = 'buyer' }) {
  return <header className="app-header"><Brand /><nav className="header-links">
    {role === 'sales' ? <><Link href="/sales">Overview</Link><Link href="/admin">Manage</Link></> : <><Link href="/">Explore</Link><Link href="/chat">Ask us</Link></>}
    <Link className="header-account" href="/login">Sign in <span aria-hidden="true">↗</span></Link>
  </nav></header>;
}

export function SalesShell({ active, children }) {
  const items = [
    { href: '/sales', label: 'Overview', icon: '◫' },
    { href: '/sales#leads', label: 'Lead inbox', icon: '☷' },
    { href: '/analytics', label: 'Analytics', icon: '◷' },
    { href: '/admin', label: 'Project settings', icon: '⚙' },
  ];
  return <div className="sales-layout"><aside className="sales-sidebar"><Brand /><div className="sidebar-label">WORKSPACE</div><nav>{items.map((item) => <Link key={item.href} href={item.href} className={`side-link ${active === item.label ? 'active' : ''}`}><span>{item.icon}</span>{item.label}</Link>)}</nav><div className="sidebar-spacer"/><div className="profile-card"><div className="avatar">SK</div><div><strong>Sales team</strong><small>Ahmedabad · Demo</small></div></div></aside><main className="sales-main">{children}</main></div>;
}
