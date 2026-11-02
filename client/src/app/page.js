'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { AppHeader } from '../components/Brand';

export default function HomePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api('/projects').then((data) => setProjects(data.projects || [])).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  return <div className="public-page"><AppHeader /><main>
    <section className="hero-section">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> A more considered way home</div>
        <h1>Find a place<br/>that feels <em>right.</em></h1>
        <p>Explore thoughtfully planned homes in Ahmedabad. Ask what matters, get clear answers, and book a visit when you are ready.</p>
        <div className="hero-actions"><Link className="button button-dark" href="/chat">Talk to our assistant <span>↗</span></Link><Link className="text-link" href="#projects">Explore projects <span>↓</span></Link></div>
        <div className="hero-proof"><div className="proof-avatars"><i>H</i><i>N</i><i>K</i></div><span>Guidance from first question to first visit</span></div>
      </div>
      <div className="hero-art" aria-label="Abstract architectural composition"><div className="art-sun"/><div className="art-building back"/><div className="art-building front"><span/><span/><span/><span/></div><div className="art-caption"><span>AHMEDABAD</span><strong>Space to grow into.</strong></div><div className="art-index">01 / 02</div></div>
    </section>
    <section className="trust-strip"><div><strong>02</strong><span>Live residential projects</span></div><div><strong>420</strong><span>Apartments across the portfolio</span></div><div><strong>2 & 3</strong><span>BHK configurations</span></div><div><strong>24/7</strong><span>First response, any hour</span></div></section>
    <section className="projects-section" id="projects"><div className="section-heading"><div><div className="eyebrow">THE COLLECTION</div><h2>Room for what’s next.</h2></div><p>Two live projects. A clear view of what is known, and a real person whenever you need one.</p></div>
      {loading ? <div className="loading-line">Loading current projects…</div> : error ? <div className="error-panel">{error} <button className="text-button" onClick={() => location.reload()}>Try again</button></div> : <div className="project-grid">{projects.map((project, index) => <article className="project-card" key={project._id}><div className={`project-visual visual-${index + 1}`}><div className="visual-sky"/><div className="visual-tower tower-a"/><div className="visual-tower tower-b"/><div className="visual-tower tower-c"/><span className="visual-count">0{index + 1}</span><span className="visual-tag">LIVE PROJECT</span></div><div className="project-info"><div><span className="project-city">{project.city || 'Ahmedabad'} · Residential</span><h3>{project.name}</h3><p>{(project.configurations || ['2 BHK', '3 BHK']).join('  ·  ')}</p></div><Link href="/chat" className="round-arrow" aria-label={`Ask about ${project.name}`}>↗</Link></div></article>)}</div>}
    </section>
    <section className="conversation-cta"><div><div className="eyebrow">START WITH A QUESTION</div><h2>Good decisions begin<br/>with good conversations.</h2></div><Link className="button button-light" href="/chat">Ask the assistant <span>↗</span></Link></section>
  </main><footer className="public-footer"><span>© 2026 VisitFlow · Demo experience</span><span>Property details are subject to verification by the sales team.</span></footer></div>;
}
