import { useEffect, useMemo, useState } from 'react';
import { auth, api } from '@appdeploy/client';
import {
  ArrowUpRight, Code2, Compass, Github, Globe2, Plus, Search, Sparkles,
  X, LogOut, Save, ExternalLink, Trophy, Layers3, Filter
} from 'lucide-react';

type Project = { title: string; description: string; url: string; stack: string };
type Profile = {
  id?: string; userId?: string; displayName: string; handle: string;
  tagline: string; about: string; location?: string; skills: string[];
  github: string; website: string; achievements: string[]; projects: Project[];
  updatedAt?: string;
};
const blank: Profile = {
  displayName: '', handle: '', tagline: '', about: '', location: '',
  skills: [], github: '', website: '', achievements: [], projects: []
};
const demoProfiles: Profile[] = [
  {
    displayName: 'Aarav Sharma', handle: 'aarav-builds',
    tagline: 'Turning curiosity into code.',
    about: 'I enjoy building little web tools, learning new languages, and sharing what I discover along the way.',
    skills: ['JavaScript', 'HTML', 'CSS', 'Git'], github: 'https://github.com/',
    website: '', achievements: ['Built my first web app', 'Learning in public'],
    projects: [{ title: 'Study Buddy', description: 'A simple planner concept for organizing school projects and study goals.', url: 'https://github.com/', stack: 'HTML · CSS · JavaScript' }]
  },
  {
    displayName: 'Mira Creates', handle: 'mira-creates',
    tagline: 'Design-minded developer in progress.',
    about: 'Exploring the space where thoughtful design meets useful software. Always working on the next experiment.',
    skills: ['TypeScript', 'React', 'UI Design'], github: 'https://github.com/',
    website: '', achievements: ['First open-source contribution'],
    projects: [{ title: 'Color Playground', description: 'An interactive concept for exploring color combinations and saving palettes.', url: 'https://github.com/', stack: 'React · TypeScript' }]
  },
  {
    displayName: 'Dev Patel', handle: 'dev-explores',
    tagline: 'Build. Break. Learn. Repeat.',
    about: 'I like solving problems, experimenting with code, and making technology easier to understand for other learners.',
    skills: ['Java', 'C++', 'Problem solving'], github: 'https://github.com/',
    website: '', achievements: ['Completed a coding challenge series'],
    projects: [{ title: 'Logic Lab', description: 'A collection of beginner-friendly programming experiments and notes.', url: 'https://github.com/', stack: 'Java · C++' }]
  }
];
const safeUrl = (value?: string) => {
  if (!value) return '';
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch { return ''; }
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [mine, setMine] = useState<Profile>(blank);
  const [view, setView] = useState<'discover' | 'editor'>('discover');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('All');
  const [skillsText, setSkillsText] = useState('');
  const [achievementsText, setAchievementsText] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);

  async function loadProfiles() {
    try {
      const res = await api.get('/api/profiles');
      setProfiles(res.data.profiles || []);
    } catch {
      setError('Could not load community profiles. Please refresh to try again.');
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const restored = await auth.getUser();
        setUser(restored);
        await loadProfiles();
        if (restored) {
          try {
            const res = await api.get('/api/me');
            const p = res.data.profile;
            if (p) {
              setMine({ ...blank, ...p });
              setSkillsText((p.skills || []).join(', '));
              setAchievementsText((p.achievements || []).join('\n'));
              setProjects(p.projects || []);
            }
          } catch { /* First-time user has no saved profile yet. */ }
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const allSkills = useMemo(
    () => ['All', ...Array.from(new Set(profiles.flatMap(p => p.skills || []))).sort()],
    [profiles]
  );
  const filtered = profiles.filter(p =>
    [p.displayName, p.handle, p.tagline, p.about, ...(p.skills || []), ...(p.projects || []).map(x => x.title)]
      .join(' ').toLowerCase().includes(query.toLowerCase()) &&
    (skillFilter === 'All' || (p.skills || []).some(s => s.toLowerCase() === skillFilter.toLowerCase()))
  );

  async function signIn() {
    setError('');
    try { await auth.signInWithRedirect(); }
    catch { setError('Sign-in could not start. Check your browser settings and try again.'); }
  }

  async function openEditor() {
    if (!user) { await signIn(); return; }
    setError(''); setSelected(null); setView('editor');
    try {
      const res = await api.get('/api/me');
      const p = res.data.profile;
      if (p) {
        setMine({ ...blank, ...p });
        setSkillsText((p.skills || []).join(', '));
        setAchievementsText((p.achievements || []).join('\n'));
        setProjects(p.projects || []);
      } else {
        setMine({ ...blank, displayName: user.name || '', handle: (user.name || 'creator').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });
        setSkillsText(''); setAchievementsText(''); setProjects([]);
      }
    } catch {
      setMine({ ...blank, displayName: user.name || '', handle: (user.name || 'creator').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setError(''); setNotice('');
    if (!mine.displayName.trim() || !mine.handle.trim()) {
      setError('Please add a display name and a public handle.'); return;
    }
    setSaving(true);
    try {
      const profile = {
        ...mine,
        skills: skillsText.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20),
        achievements: achievementsText.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 12),
        projects: projects.filter(p => p.title.trim()).slice(0, 12)
      };
      const res = await api.put('/api/me', profile);
      setMine(res.data.profile);
      setNotice('Your public portfolio is saved.');
      await loadProfiles(); setView('discover'); setSelected(null);
    } catch {
      setError('Could not save your portfolio. Please check your connection and try again.');
    } finally { setSaving(false); }
  }

  async function logout() {
    await auth.signOut(); setUser(null); setMine(blank); setView('discover');
    setSelected(null); setNotice('You are signed out. Your public portfolio remains visible.');
  }
  function updateProject(i: number, field: keyof Project, value: string) {
    setProjects(prev => prev.map((p, index) => index === i ? { ...p, [field]: value } : p));
  }

  const visibleProfiles = profiles.length ? filtered : demoProfiles.filter(p =>
    [p.displayName, p.handle, p.tagline, ...(p.skills || [])].join(' ').toLowerCase().includes(query.toLowerCase()) &&
    (skillFilter === 'All' || p.skills.includes(skillFilter))
  );

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" onClick={() => { setView('discover'); setSelected(null); }}>
        <span className="brand-mark"><Code2 size={20} /></span><span>makerspace<span className="brand-dot">.</span></span>
      </a>
      <nav>
        <button className={view === 'discover' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('discover'); setSelected(null); }}><Compass size={15} /> Discover</button>
        <button className="nav-link" onClick={openEditor}><Plus size={15} /> Create portfolio</button>
      </nav>
      <div className="top-actions">
        {user ? <><span className="user-pill"><span className="avatar-small">{(user.name || 'C').slice(0, 1).toUpperCase()}</span>{user.name || 'Creator'}</span><button className="icon-button" title="Sign out" onClick={logout}><LogOut size={16} /></button></> :
          <button className="sign-in" onClick={signIn}>Sign in <ArrowUpRight size={15} /></button>}
      </div>
    </header>

    <main id="top">
      {view === 'editor' ? <section className="editor-page">
        <button className="back-link" onClick={() => setView('discover')}>← Back to discover</button>
        <div className="page-intro"><span className="eyebrow"><Sparkles size={14} /> YOUR SPACE ON THE INTERNET</span><h1>Make your work<br /><em>easy to discover.</em></h1><p>Build a public profile that tells people who you are, what you’re learning, and what you’ve made.</p></div>
        <form className="editor-form" onSubmit={saveProfile}>
          <div className="form-heading"><div><h2>Your portfolio</h2><p>Only add information you’re comfortable sharing publicly.</p></div><span className="public-label"><Globe2 size={14} /> Public profile</span></div>
          <div className="form-grid">
            <label>Display name *<input value={mine.displayName} maxLength={70} onChange={e => setMine({ ...mine, displayName: e.target.value })} required /></label>
            <label>Public handle *<input value={mine.handle} maxLength={40} onChange={e => setMine({ ...mine, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} required /><small>Letters, numbers and hyphens only.</small></label>
            <label className="wide">Short tagline<input value={mine.tagline} maxLength={140} onChange={e => setMine({ ...mine, tagline: e.target.value })} placeholder="Curious builder. Future problem solver." /></label>
            <label className="wide">About you<textarea value={mine.about} maxLength={1200} rows={4} onChange={e => setMine({ ...mine, about: e.target.value })} placeholder="What are you interested in? What do you enjoy building?" /></label>
            <label>Skills <span className="label-muted">(comma-separated)</span><input value={skillsText} maxLength={400} onChange={e => setSkillsText(e.target.value)} placeholder="JavaScript, CSS, Python" /></label>
            <label>GitHub profile<input value={mine.github} maxLength={300} onChange={e => setMine({ ...mine, github: e.target.value })} placeholder="https://github.com/username" /></label>
            <label>Website / demo<input value={mine.website} maxLength={300} onChange={e => setMine({ ...mine, website: e.target.value })} placeholder="https://your-site.example" /></label>
            <label>Achievements <span className="label-muted">(one per line)</span><textarea value={achievementsText} maxLength={1200} rows={3} onChange={e => setAchievementsText(e.target.value)} placeholder={'First hackathon\nBuilt my first app'} /></label>
          </div>
          <div className="project-editor-head"><div><h3><Layers3 size={17} /> Projects</h3><p>Add projects you’ve actually built. Share a repo or live demo.</p></div><button type="button" className="small-outline" onClick={() => setProjects([...projects, { title: '', description: '', url: '', stack: '' }])} disabled={projects.length >= 12}><Plus size={14} /> Add project</button></div>
          {projects.map((p, i) => <div className="project-edit-card" key={i}>
            <div className="project-edit-top"><strong>Project {i + 1}</strong><button type="button" className="icon-button" aria-label="Remove project" onClick={() => setProjects(projects.filter((_, j) => j !== i))}><X size={15} /></button></div>
            <div className="form-grid">
              <label>Project title<input value={p.title} maxLength={100} onChange={e => updateProject(i, 'title', e.target.value)} /></label>
              <label>Repository or demo URL<input value={p.url} maxLength={300} onChange={e => updateProject(i, 'url', e.target.value)} placeholder="https://..." /></label>
              <label className="wide">Description<textarea value={p.description} maxLength={500} rows={2} onChange={e => updateProject(i, 'description', e.target.value)} /></label>
              <label className="wide">Tech used<input value={p.stack} maxLength={180} onChange={e => updateProject(i, 'stack', e.target.value)} placeholder="React · TypeScript · CSS" /></label>
            </div>
          </div>)}
          {error && <p className="alert">{error}</p>}
          <div className="form-footer"><span>Your profile can be viewed by anyone on the internet.</span><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : <><Save size={16} /> Save public portfolio</>}</button></div>
        </form>
      </section> : selected ? <section className="profile-detail">
        <button className="back-link" onClick={() => setSelected(null)}>← Back to community</button>
        <div className="profile-cover"><div className="profile-avatar">{(selected.displayName || 'C').slice(0, 1).toUpperCase()}</div><div><span className="public-label"><Globe2 size={13} /> PUBLIC CREATOR</span><h1>{selected.displayName}</h1><p className="handle">@{selected.handle}</p><p className="tagline">{selected.tagline}</p></div></div>
        <div className="detail-columns"><div className="detail-main">
          <section className="detail-panel"><h2>About</h2><p>{selected.about || 'This creator is still writing their story.'}</p></section>
          <section className="detail-panel"><h2><Layers3 size={17} /> Projects</h2>{(selected.projects || []).length ? <div className="detail-projects">{selected.projects.map((p, i) => <article className="detail-project" key={i}><span className="project-icon"><Code2 size={18} /></span><div><h3>{p.title}</h3><p>{p.description}</p>{p.stack && <span className="tech-line">{p.stack}</span>}{safeUrl(p.url) && <a href={safeUrl(p.url)} target="_blank" rel="noreferrer">View project <ExternalLink size={13} /></a>}</div></article>)}</div> : <p>No projects added yet.</p>}</section>
        </div><aside className="detail-side">
          <section className="detail-panel"><h3>Skills & tools</h3><div className="skill-tags">{(selected.skills || []).map(s => <span key={s}>{s}</span>)}</div></section>
          <section className="detail-panel"><h3><Trophy size={16} /> Highlights</h3>{(selected.achievements || []).length ? <ul className="achievement-list">{selected.achievements.map((a, i) => <li key={i}>{a}</li>)}</ul> : <p>No achievements listed yet.</p>}</section>
          <div className="profile-links">{safeUrl(selected.github) && <a href={safeUrl(selected.github)} target="_blank" rel="noreferrer"><Github size={16} /> GitHub <ExternalLink size={13} /></a>}{safeUrl(selected.website) && <a href={safeUrl(selected.website)} target="_blank" rel="noreferrer"><Globe2 size={16} /> Website <ExternalLink size={13} /></a>}</div>
        </aside></div>
      </section> : <>
        <section className="hero"><div className="hero-text"><div className="eyebrow"><span className="eyebrow-dot" /> A COMMUNITY FOR CURIOUS MINDS</div><h1>Every creator has<br />a story. <em>Show yours.</em></h1><p className="hero-desc">A home for people who make things with code. Share your story, showcase your projects, and discover what other creators are building.</p><div className="hero-buttons"><button className="primary-button" onClick={openEditor}>Create your portfolio <ArrowUpRight size={17} /></button><button className="secondary-button" onClick={() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })}>Explore creators <Compass size={16} /></button></div><div className="hero-trust"><span><Globe2 size={15} /> Public profiles</span><span><Code2 size={15} /> Real projects</span><span><Sparkles size={15} /> All skill levels</span></div></div>
          <div className="hero-visual"><div className="hero-glow" /><div className="profile-preview preview-back"><div className="preview-head"><span className="preview-avatar green">M</span><div><b>Mira Creates</b><small>Designer & developer</small></div><span className="preview-dot" /></div><div className="preview-lines"><i /><i /><i /></div><div className="preview-tags"><span>React</span><span>Design</span><span>TypeScript</span></div></div><div className="profile-preview preview-front"><div className="preview-head"><span className="preview-avatar purple">A</span><div><b>Aarav Sharma</b><small>Curious builder</small></div><ArrowUpRight size={15} className="preview-arrow" /></div><div className="preview-code"><span>const</span> maker = {'{'}<br />&nbsp; curiosity: <b>true</b>,<br />&nbsp; projects: <b>3</b><br />{'}'};</div><div className="preview-project"><span className="project-glyph"><Code2 size={16} /></span><div><b>Study Buddy</b><small>HTML · CSS · JavaScript</small></div><ArrowUpRight size={13} /></div></div><div className="floating-badge"><Sparkles size={14} /> MADE BY CURIOUS MINDS</div></div>
        </section>
        <section className="community-stats"><div><strong>{profiles.length || '—'}</strong><span>CREATOR PROFILES</span></div><div><strong>∞</strong><span>IDEAS TO BUILD</span></div><div><strong>100%</strong><span>ROOM TO LEARN</span></div><button onClick={openEditor}>Join the community <ArrowUpRight size={15} /></button></section>
        <section className="discover-section" id="discover"><div className="section-heading"><div><span className="eyebrow">THE COMMUNITY</span><h2>Meet the makers.</h2><p>Explore ideas, skills, and projects from creators at every stage.</p></div><button className="outline-button" onClick={openEditor}><Plus size={15} /> Create your profile</button></div>
          <div className="search-row"><div className="search-box"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search creators, skills, projects..." /></div><label className="filter-wrap"><Filter size={15} /> Skill<select value={skillFilter} onChange={e => setSkillFilter(e.target.value)}>{allSkills.map(s => <option key={s}>{s}</option>)}</select></label></div>
          {loading ? <div className="empty-state"><span className="loader" /><p>Loading creators…</p></div> : visibleProfiles.length ? <div className="creator-grid">{visibleProfiles.map((p, i) => <article className="creator-card" key={p.handle}><div className={`card-top art-${i % 4}`}><span className="card-avatar">{p.displayName.slice(0, 1).toUpperCase()}</span><span className="card-arrow"><ArrowUpRight size={16} /></span><span className="card-shape">✳</span></div><div className="creator-content"><div className="creator-kicker"><span className="online-dot" /> PUBLIC CREATOR</div><h3>{p.displayName}</h3><span className="creator-handle">@{p.handle}</span><p className="creator-tagline">{p.tagline || p.about || 'A creator sharing their work.'}</p><div className="skill-tags">{(p.skills || []).slice(0, 4).map(s => <span key={s}>{s}</span>)}</div><div className="card-bottom"><span><Layers3 size={13} /> {(p.projects || []).length} projects</span><button onClick={() => { setSelected(p); setView('discover'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>View profile <ArrowUpRight size={13} /></button></div></div></article>)}</div> : <div className="empty-state"><Code2 size={26} /><h3>No creators found</h3><p>Try another search or skill filter.</p><button className="secondary-button" onClick={() => { setQuery(''); setSkillFilter('All'); }}>Clear filters</button></div>}
        </section>
        <section className="join-banner"><div className="join-icon"><Sparkles size={22} /></div><div><span className="eyebrow">YOUR NEXT CHAPTER</span><h2>Make something. Share something.</h2><p>Your portfolio is a snapshot of what you’re learning and building.</p></div><button className="primary-button" onClick={openEditor}>Build your portfolio <ArrowUpRight size={16} /></button></section>
      </>}
    </main>
    <footer className="footer"><a className="brand" href="#top"><span className="brand-mark"><Code2 size={17} /></span><span>makerspace<span className="brand-dot">.</span></span></a><p>Built for the curious, the makers, and the always-learning.</p><span>© MakerSpace</span></footer>
    {(error || notice) && <div className={`toast ${error ? 'toast-error' : ''}`} role="status">{error || notice}<button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss">×</button></div>}
  </div>;
}
