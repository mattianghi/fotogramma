import { useEffect, useRef } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { Icon } from './components/Icon';
import { Toaster } from './components/ui';
import { useStore } from './lib/store';
import { activeKey } from './lib/tmdb';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Search from './pages/Search';
import MoviePage from './pages/Movie';
import TvPage from './pages/Tv';
import SeasonPage from './pages/Season';
import PersonPage from './pages/Person';
import Diary from './pages/Diary';
import Friends from './pages/Friends';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import RecLanding from './pages/RecLanding';
import Library from './pages/Library';

const tabs = [
  { to: '/', icon: 'home', label: 'Scopri', end: true },
  { to: '/search', icon: 'search', label: 'Cerca' },
  { to: '/diary', icon: 'diary', label: 'Diario' },
  { to: '/friends', icon: 'friends', label: 'Amici' },
  { to: '/me', icon: 'user', label: 'Profilo' },
];

export default function App() {
  const hasKey = useStore((s) => !!s.apiKey) || !!activeKey();
  const named = useStore((s) => !!s.profile.name);
  const unread = useStore((s) => s.inbox.filter((r) => !r.seen).length);
  const loc = useLocation();

  // nuove pagine partono dall'alto; con "indietro" si torna dove si era
  const navType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  useEffect(() => {
    const save = () => positions.current.set(loc.key, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [loc.key]);
  useEffect(() => {
    if (navType === 'PUSH') { window.scrollTo({ top: 0 }); return; }
    if (navType !== 'POP') return;
    const y = positions.current.get(loc.key) ?? 0;
    let tries = 0, timer = 0;
    // il contenuto arriva in modo asincrono: riprova finché la pagina è abbastanza lunga
    const tick = () => { window.scrollTo(0, y); if (Math.abs(window.scrollY - y) > 2 && tries++ < 40) timer = window.setTimeout(tick, 50); };
    tick();
    return () => clearTimeout(timer);
  }, [loc.key, navType]);

  // un link di consiglio si apre anche prima dell'onboarding
  if (loc.pathname.startsWith('/r/') && !(hasKey && named)) return <><Routes><Route path="/r/:code" element={<RecLanding />} /></Routes><Toaster /></>;
  if (!hasKey || !named) return <><Onboarding /><Toaster /></>;

  return (
    <div className="shell">
      <div className="grain" aria-hidden="true" />
      <nav className="nav" aria-label="Navigazione principale">
        <div className="brand"><img src="./icon.svg" alt="" width={30} height={30} /><span>Fotogramma</span></div>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}>
            <span className="nav-icon"><Icon name={t.icon} size={23} />{t.to === '/friends' && unread > 0 && <i className="dot">{unread}</i>}</span>
            <span className="nav-label">{t.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/movie/:id" element={<MoviePage />} />
          <Route path="/tv/:id" element={<TvPage />} />
          <Route path="/tv/:id/season/:n" element={<SeasonPage />} />
          <Route path="/person/:id" element={<PersonPage />} />
          <Route path="/diary" element={<Diary />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/me" element={<Profile />} />
          <Route path="/me/:list" element={<Library />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/r/:code" element={<RecLanding />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
}
