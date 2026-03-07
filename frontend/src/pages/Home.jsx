import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const BASE = 'http://127.0.0.1:8000';

/* ══════════════════════════════════════════
   ANIMATED COUNTER
══════════════════════════════════════════ */
const Counter = ({ target, duration = 1800, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(ease * target));
          if (progress < 1) requestAnimationFrame(tick);
          else setCount(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

/* ══════════════════════════════════════════
   3D FLOATING CARD
══════════════════════════════════════════ */
const FloatCard = ({ children, delay = 0, style = {} }) => {
  return (
    <div style={{
      animation: `float3d ${3 + delay * 0.5}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      ...style
    }}>
      {children}
    </div>
  );
};

/* ══════════════════════════════════════════
   PARTICLE BACKGROUND
══════════════════════════════════════════ */
const Particles = () => {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 8,
    opacity: Math.random() * 0.3 + 0.05,
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          width: p.size,
          height: p.size,
          borderRadius: '50%',
          background: `rgba(240,180,41,${p.opacity})`,
          left: `${p.x}%`,
          top: `${p.y}%`,
          animation: `particleDrift ${p.duration}s ease-in-out infinite`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════
   TEAM LOGO
══════════════════════════════════════════ */
const TeamLogo = ({ logo, name, size = 36 }) => {
  if (logo) return (
    <img src={`${BASE}${logo}`} alt={name}
      style={{ width: size, height: size, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: 'linear-gradient(135deg,#1e2a3a,#0f1827)',
      border: '1px solid rgba(240,180,41,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: size * 0.38, color: '#f0b429',
    }}>
      {(name || '?')[0]}
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN HOME
══════════════════════════════════════════ */
const Home = () => {
  const [stats, setStats] = useState({ teams: 0, tournaments: 0, referees: 0, matches: 0 });
  const [tournaments, setTournaments] = useState([]);
  const [topScorers, setTopScorers] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [teamsRes, tourRes, refRes] = await Promise.allSettled([
          api.get('/teams'),
          api.get('/tournaments'),
          api.get('/referees'),
        ]);

        const teamsData = teamsRes.status === 'fulfilled' ? teamsRes.value.data : [];
        const tourData = tourRes.status === 'fulfilled' ? tourRes.value.data : [];
        const refData = refRes.status === 'fulfilled' ? refRes.value.data : [];

        setTeams(teamsData.slice(0, 12));
        setTournaments(tourData.slice(0, 6));

        // Count all matches across tournaments
        let allMatches = [];
        let scorerMap = {};

        for (const t of tourData.slice(0, 4)) {
          try {
            const tRes = await api.get(`/tournaments/${t.id}`);
            const tData = tRes.data;
            allMatches = [...allMatches, ...(tData.matches || [])];

            // aggregate player stats
            if (tData.matches) {
              for (const m of tData.matches) {
                if (m.events) {
                  for (const ev of m.events) {
                    if (ev.event_type === 'goal' && ev.player_name) {
                      if (!scorerMap[ev.player_id]) {
                        scorerMap[ev.player_id] = { name: ev.player_name, goals: 0, team: ev.team_name || '' };
                      }
                      scorerMap[ev.player_id].goals++;
                    }
                  }
                }
              }
            }
          } catch {}
        }

        const upcoming = allMatches
          .filter(m => m.status === 'scheduled' && m.home_team_id && m.away_team_id)
          .slice(0, 5);
        setUpcomingMatches(upcoming);

        const scorers = Object.values(scorerMap)
          .sort((a, b) => b.goals - a.goals)
          .slice(0, 5);
        setTopScorers(scorers);

        setStats({
          teams: teamsData.length,
          tournaments: tourData.length,
          referees: refData.length,
          matches: allMatches.length,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    [dir="ltr"], [dir="ltr"] * { direction: ltr !important; text-align: left; }
    [dir="ltr"] .text-center { text-align: center !important; }
    [dir="ltr"] .text-right { text-align: right !important; }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #040810; }
    ::-webkit-scrollbar-thumb { background: rgba(240,180,41,0.3); border-radius: 4px; }

    @keyframes float3d {
      0%, 100% { transform: translateY(0px) rotateX(0deg); }
      33% { transform: translateY(-10px) rotateX(2deg); }
      66% { transform: translateY(-5px) rotateX(-1deg); }
    }
    @keyframes particleDrift {
      0%, 100% { transform: translate(0,0) scale(1); opacity: 0.1; }
      50% { transform: translate(20px, -30px) scale(1.5); opacity: 0.4; }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(240,180,41,0.1); }
      50% { box-shadow: 0 0 40px rgba(240,180,41,0.25); }
    }
    @keyframes scanline {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100vh); }
    }
    @keyframes rotateSlow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .stat-card {
      animation: glow 3s ease-in-out infinite;
    }
    .hero-title {
      background: linear-gradient(90deg, #f0b429, #fff, #f0b429, #fff, #f0b429);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 4s linear infinite;
    }
    .card-hover {
      transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    }
    .card-hover:hover {
      transform: translateY(-4px) scale(1.01);
      border-color: rgba(240,180,41,0.4) !important;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(240,180,41,0.08);
    }
    .animate-in {
      animation: fadeInUp 0.6s ease forwards;
    }
  `;

  const TournamentTypeTag = ({ type }) => {
    const cfg = {
      knockout: { label: 'Knockout', color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
      league:   { label: 'League',   color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
      mixed:    { label: 'Mixed',    color: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
    }[type] || { label: type, color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' };
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '2px 8px', borderRadius: 99, border: `1px solid ${cfg.color}30`,
        color: cfg.color, background: cfg.bg, fontFamily: "'Space Mono', monospace",
      }}>{cfg.label}</span>
    );
  };

  return (
    <div dir="ltr" style={{ minHeight: '100vh', background: '#040810', color: '#e2e8f0', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden', position: 'relative', direction: 'ltr', textAlign: 'left' }}>
      <style>{CSS}</style>
      <Particles />

      {/* ── scanline effect ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden', opacity: 0.03,
      }}>
        <div style={{
          position: 'absolute', width: '100%', height: 2,
          background: 'linear-gradient(transparent,rgba(240,180,41,0.8),transparent)',
          animation: 'scanline 8s linear infinite',
        }} />
      </div>

      {/* ── grid bg ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(240,180,41,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(240,180,41,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* ════════════════════════════════════
          NAV
      ════════════════════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(4,8,16,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(240,180,41,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 60,
      }}>
        {/* logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, border: '1.5px solid rgba(240,180,41,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(240,180,41,0.08)', fontSize: 16,
          }}>⚽</div>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.12em', color: '#f0b429' }}>
            TOURNEY
          </span>
        </div>

        {/* nav right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/login" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 20px', borderRadius: 8,
            background: 'linear-gradient(135deg,#d97706,#f0b429)',
            color: '#040810', fontWeight: 700, fontSize: 13, textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(240,180,41,0.3)',
            transition: 'opacity 0.2s', letterSpacing: '0.03em',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <span>🔐</span> Sign In
          </Link>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ════════════════════════════════════
            HERO
        ════════════════════════════════════ */}
        <section style={{ padding: '80px 32px 60px', maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>

          {/* eyebrow */}
          <div style={{ animation: 'fadeInUp 0.5s ease forwards', marginBottom: 20 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 16px', borderRadius: 99,
              border: '1px solid rgba(240,180,41,0.25)',
              background: 'rgba(240,180,41,0.06)',
              fontSize: 11, fontWeight: 600, color: '#f0b429',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              fontFamily: "'Space Mono', monospace",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0b429', animation: 'glow 2s infinite' }} />
              Live Tournament Management
            </span>
          </div>

          {/* title */}
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(56px, 10vw, 120px)',
            lineHeight: 0.9, letterSpacing: '0.02em',
            marginBottom: 24, animation: 'fadeInUp 0.6s 0.1s ease both',
          }}>
            <span className="hero-title">THE PITCH</span>
            <br />
            <span style={{ color: 'rgba(255,255,255,0.08)', WebkitTextStroke: '1px rgba(240,180,41,0.2)', fontSize: '0.7em' }}>
              CONTROL CENTER
            </span>
          </h1>

          <p style={{
            maxWidth: 520, margin: '0 auto 40px',
            fontSize: 16, lineHeight: 1.7, color: 'rgba(226,232,240,0.6)',
            animation: 'fadeInUp 0.6s 0.2s ease both',
          }}>
            Real-time tournament management — standings, scorers, fixtures, and brackets all in one place.
          </p>

          {/* CTA */}
          <div style={{ animation: 'fadeInUp 0.6s 0.3s ease both' }}>
            <Link to="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '14px 36px', borderRadius: 12, textDecoration: 'none',
              background: 'linear-gradient(135deg,#d97706,#f0b429,#d97706)',
              backgroundSize: '200% auto', animation: 'shimmer 3s linear infinite',
              color: '#040810', fontWeight: 800, fontSize: 15, letterSpacing: '0.04em',
              boxShadow: '0 8px 40px rgba(240,180,41,0.35)',
            }}>
              Enter the System →
            </Link>
          </div>
        </section>

        {/* ════════════════════════════════════
            LIVE STATS ROW
        ════════════════════════════════════ */}
        <section style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Teams',       value: stats.teams,       icon: '🛡', color: '#38bdf8' },
              { label: 'Tournaments', value: stats.tournaments, icon: '🏆', color: '#f0b429' },
              { label: 'Matches',     value: stats.matches,     icon: '⚽', color: '#22c55e' },
              { label: 'Referees',    value: stats.referees,    icon: '⚖',  color: '#a78bfa' },
            ].map((s, i) => (
              <div key={s.label} className="stat-card card-hover" style={{
                padding: '28px 24px',
                background: 'linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16, position: 'relative', overflow: 'hidden',
                animationDelay: `${i * 0.5}s`,
                animation: `fadeInUp 0.5s ${i * 0.08}s ease both, glow ${3 + i * 0.5}s ${i}s ease-in-out infinite`,
              }}>
                {/* accent corner */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
                  background: `linear-gradient(to bottom,${s.color},transparent)`,
                  borderRadius: '4px 0 0 4px',
                }} />
                <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 48, lineHeight: 1, color: s.color,
                  marginBottom: 4,
                }}>
                  <Counter target={s.value} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════
            ACTIVE TOURNAMENTS
        ════════════════════════════════════ */}
        {tournaments.length > 0 && (
          <section style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 32px' }}>
            <SectionHeader title="Active Tournaments" icon="🏆" count={tournaments.length} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {tournaments.map((t, i) => (
                <FloatCard key={t.id} delay={i * 0.4}>
                  <div className="card-hover" style={{
                    padding: '20px 22px',
                    background: 'linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 16, cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ marginBottom: 6 }}><TournamentTypeTag type={t.type} /></div>
                        <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: '0.05em', color: '#fff', lineHeight: 1.1 }}>
                          {t.name}
                        </h3>
                      </div>
                      {t.trophy_image && (
                        <img src={`${BASE}${t.trophy_image}`} alt="trophy"
                          style={{ width: 44, height: 44, objectFit: 'contain', marginLeft: 12, filter: 'drop-shadow(0 4px 12px rgba(240,180,41,0.3))', animation: 'float3d 4s ease-in-out infinite' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {t.start_date && (
                        <span style={{ fontSize: 10, color: 'rgba(226,232,240,0.4)', fontFamily: "'Space Mono', monospace" }}>
                          📅 {t.start_date}
                        </span>
                      )}
                      {t.is_active && (
                        <span style={{ fontSize: 10, color: '#22c55e', fontFamily: "'Space Mono', monospace", display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 5, height: 5, background: '#22c55e', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>
                </FloatCard>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════
            TWO COLUMN: TOP SCORERS + UPCOMING
        ════════════════════════════════════ */}
        <section style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* TOP SCORERS */}
          <div>
            <SectionHeader title="Top Scorers" icon="⚽" />
            <div style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              {topScorers.length === 0 ? (
                <EmptyState icon="⚽" text="No goal data yet" />
              ) : (
                topScorers.map((scorer, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px',
                    borderBottom: i < topScorers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    animation: `fadeInUp 0.4s ${i * 0.06}s ease both`,
                  }}>
                    {/* rank */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Bebas Neue', sans-serif", fontSize: 16,
                      background: i === 0 ? 'rgba(240,180,41,0.15)' : i === 1 ? 'rgba(156,163,175,0.1)' : i === 2 ? 'rgba(180,83,9,0.1)' : 'rgba(255,255,255,0.04)',
                      color: i === 0 ? '#f0b429' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#374151',
                    }}>{i + 1}</div>

                    {/* name + team */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', truncate: true }}>{scorer.name}</div>
                      {scorer.team && <div style={{ fontSize: 10, color: 'rgba(226,232,240,0.4)', marginTop: 1 }}>{scorer.team}</div>}
                    </div>

                    {/* goals badge */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 99,
                      background: i === 0 ? 'rgba(240,180,41,0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${i === 0 ? 'rgba(240,180,41,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                      <span style={{ fontSize: 14, fontFamily: "'Bebas Neue', sans-serif", color: i === 0 ? '#f0b429' : '#e2e8f0' }}>{scorer.goals}</span>
                      <span style={{ fontSize: 9, color: 'rgba(226,232,240,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>goals</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* UPCOMING MATCHES */}
          <div>
            <SectionHeader title="Upcoming Matches" icon="📅" />
            <div style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              {upcomingMatches.length === 0 ? (
                <EmptyState icon="📅" text="No upcoming matches" />
              ) : (
                upcomingMatches.map((m, i) => (
                  <div key={m.id} style={{
                    padding: '14px 20px',
                    borderBottom: i < upcomingMatches.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    animation: `fadeInUp 0.4s ${i * 0.06}s ease both`,
                  }}>
                    {/* round label */}
                    {m.round_number && (
                      <div style={{ fontSize: 9, color: 'rgba(226,232,240,0.3)', marginBottom: 6, fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Round {m.round_number}
                      </div>
                    )}
                    {/* teams */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* home */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <TeamLogo name={m.home} size={28} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home || 'TBD'}</span>
                      </div>
                      {/* vs */}
                      <div style={{
                        flexShrink: 0, padding: '4px 10px', borderRadius: 6,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                        fontSize: 10, fontFamily: "'Space Mono', monospace", color: 'rgba(226,232,240,0.4)', fontWeight: 700,
                      }}>VS</div>
                      {/* away */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexDirection: 'row-reverse' }}>
                        <TeamLogo name={m.away} size={28} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{m.away || 'TBD'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════
            TEAMS MOSAIC
        ════════════════════════════════════ */}
        {teams.length > 0 && (
          <section style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 32px' }}>
            <SectionHeader title="Competing Teams" icon="🛡" count={teams.length} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {teams.map((team, i) => (
                <div key={team.id} className="card-hover" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', borderRadius: 12,
                  background: 'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',
                  border: '1px solid rgba(255,255,255,0.07)',
                  animation: `fadeInUp 0.4s ${i * 0.04}s ease both`,
                }}>
                  <TeamLogo logo={team.logo} name={team.name} size={30} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{team.name}</div>
                    {team.colors && (
                      <div style={{ fontSize: 9, color: 'rgba(226,232,240,0.35)', marginTop: 1 }}>{team.colors}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════
            FOOTER CTA
        ════════════════════════════════════ */}
        <section style={{ maxWidth: 1200, margin: '0 auto 0', padding: '0 32px 80px' }}>
          <div style={{
            borderRadius: 24, overflow: 'hidden', position: 'relative',
            background: 'linear-gradient(135deg,rgba(240,180,41,0.06),rgba(240,180,41,0.02))',
            border: '1px solid rgba(240,180,41,0.15)',
            padding: '60px 40px', textAlign: 'center',
          }}>
            {/* decorative ring */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 500, height: 500,
              border: '1px solid rgba(240,180,41,0.05)',
              borderRadius: '50%',
              transform: 'translate(-50%,-50%)',
              animation: 'rotateSlow 40s linear infinite',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 300, height: 300,
              border: '1px solid rgba(240,180,41,0.08)',
              borderRadius: '50%',
              transform: 'translate(-50%,-50%)',
              animation: 'rotateSlow 25s linear infinite reverse',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: '#f0b429', marginBottom: 16,
              }}>Ready to manage?</p>
              <h2 style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(36px, 6vw, 72px)', letterSpacing: '0.05em',
                color: '#fff', marginBottom: 32, lineHeight: 1,
              }}>Sign in to your<br /><span style={{ color: '#f0b429' }}>control center</span></h2>
              <Link to="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 40px', borderRadius: 12, textDecoration: 'none',
                background: 'linear-gradient(135deg,#d97706,#f0b429)',
                color: '#040810', fontWeight: 800, fontSize: 15,
                boxShadow: '0 8px 40px rgba(240,180,41,0.3)',
                letterSpacing: '0.04em',
              }}>
                🔐 Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '24px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'rgba(226,232,240,0.2)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em' }}>
            © {new Date().getFullYear()} TOURNEY — FOOTBALL TOURNAMENT MANAGEMENT
          </p>
        </footer>
      </div>
    </div>
  );
};

/* ─── Section Header helper ─── */
const SectionHeader = ({ title, icon, count }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
    <span style={{ fontSize: 18 }}>{icon}</span>
    <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: '0.08em', color: '#fff' }}>{title}</h2>
    {count !== undefined && (
      <span style={{
        fontSize: 10, fontFamily: "'Space Mono', monospace", padding: '2px 8px',
        borderRadius: 99, border: '1px solid rgba(240,180,41,0.2)',
        color: '#f0b429', background: 'rgba(240,180,41,0.06)',
      }}>{count}</span>
    )}
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 8 }} />
  </div>
);

/* ─── Empty state ─── */
const EmptyState = ({ icon, text }) => (
  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
    <div style={{ fontSize: 32, opacity: 0.15, marginBottom: 8 }}>{icon}</div>
    <p style={{ fontSize: 12, color: 'rgba(226,232,240,0.3)', fontFamily: "'Space Mono', monospace" }}>{text}</p>
  </div>
);

export default Home;