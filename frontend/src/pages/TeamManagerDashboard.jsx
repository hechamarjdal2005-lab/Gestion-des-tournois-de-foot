import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

/*
  DESIGN: Premium Club Management Portal
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Layout:  Fixed sidebar (left) + scrollable main content
  Flow:    LTR — English
  Palette: #080a0f deep navy · #00e5a0 emerald · #111520 panel · #fff text
  Font:    Syne (display) + DM Sans (UI)
  Vibe:    Elite football club HQ — modern, athletic, sharp
*/

const BASE = 'http://127.0.0.1:8000';

const injectFonts = () => {
  if (document.getElementById('tm-fonts')) return;
  const l = document.createElement('link');
  l.id = 'tm-fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap';
  document.head.appendChild(l);
};

/* ══════════ ATOMS ══════════ */

const Toast = ({ msg }) => {
  if (!msg?.text) return null;
  const ok = msg.type === 'success';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 18px', borderRadius: 14, marginBottom: 20,
      background: ok ? 'rgba(0,229,160,0.07)' : 'rgba(255,90,90,0.07)',
      border: `1px solid ${ok ? 'rgba(0,229,160,0.25)' : 'rgba(255,90,90,0.25)'}`,
      color: ok ? '#00e5a0' : '#ff6b6b', fontSize: 13, fontFamily: "'DM Sans',sans-serif",
    }}>
      <span>{ok ? '✓' : '✗'}</span> {msg.text}
    </div>
  );
};

const Lbl = ({ children }) => (
  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: '#2e3748', marginBottom: 6, fontFamily: "'DM Sans',sans-serif", textTransform: 'uppercase' }}>{children}</p>
);

const Inp = (props) => (
  <input {...props} style={{
    background: '#0a0d14', border: '1px solid #1c2236', color: '#e2e8f0',
    borderRadius: 10, padding: '10px 13px', fontSize: 13, width: '100%',
    outline: 'none', fontFamily: "'DM Sans',sans-serif",
    transition: 'border-color 0.15s, box-shadow 0.15s', ...props.style,
  }}
  onFocus={e => { e.target.style.borderColor = '#00e5a0'; e.target.style.boxShadow = '0 0 0 3px rgba(0,229,160,0.08)'; }}
  onBlur={e => { e.target.style.borderColor = '#1c2236'; e.target.style.boxShadow = 'none'; }}
  />
);

const Sel = ({ children, ...props }) => (
  <select {...props} style={{
    background: '#0a0d14', border: '1px solid #1c2236', color: '#e2e8f0',
    borderRadius: 10, padding: '10px 13px', fontSize: 13, width: '100%',
    outline: 'none', fontFamily: "'DM Sans',sans-serif",
  }}>{children}</select>
);

const Btn = ({ children, c = 'emerald', full, sm, ...props }) => {
  const map = {
    emerald: { bg: 'linear-gradient(135deg,#00e5a0,#00b87a)', color: '#080a0f', shadow: '0 4px 20px rgba(0,229,160,0.2)' },
    red:     { bg: 'rgba(255,107,107,0.08)', color: '#ff6b6b', shadow: 'none', border: '1px solid rgba(255,107,107,0.2)' },
    ghost:   { bg: 'rgba(255,255,255,0.04)', color: '#4a5568', shadow: 'none', border: '1px solid #1c2236' },
    slate:   { bg: '#1a2035', color: '#94a3b8', shadow: 'none', border: '1px solid #232b3e' },
  }[c];
  return (
    <button {...props} style={{
      background: map.bg, color: map.color, boxShadow: map.shadow,
      border: map.border || 'none', borderRadius: 10,
      padding: sm ? '6px 13px' : full ? '11px 18px' : '9px 16px',
      fontSize: sm ? 11 : 13, fontWeight: 600, cursor: 'pointer',
      width: full ? '100%' : undefined,
      transition: 'transform 0.1s, opacity 0.15s',
      fontFamily: "'DM Sans',sans-serif",
      opacity: props.disabled ? 0.35 : 1,
    }}
    onMouseEnter={e => { if (!props.disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
      {children}
    </button>
  );
};

const positionStyle = (pos) => ({
  Goalkeeper: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  Defender:   { bg: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: 'rgba(56,189,248,0.25)' },
  Midfielder: { bg: 'rgba(0,229,160,0.1)',  color: '#00e5a0', border: 'rgba(0,229,160,0.25)' },
  Forward:    { bg: 'rgba(251,113,133,0.1)', color: '#fb7185', border: 'rgba(251,113,133,0.25)' },
}[pos] || { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' });

const posLabel = (pos) => ({ Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Forward: 'FWD' }[pos] || pos);

/* ══════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════ */
const Sidebar = ({ tab, setTab, playerCount, team, logout }) => {
  const NAV = [
    { id: 'squad',   icon: '👥', label: 'Squad',    count: playerCount },
    { id: 'add',     icon: '➕', label: 'Add Player' },
  ];

  const needed = Math.max(0, 22 - playerCount);
  const pct = Math.min(100, Math.round((playerCount / 22) * 100));

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 240,
      background: '#0a0d14', borderRight: '1px solid #141826',
      display: 'flex', flexDirection: 'column', zIndex: 40, direction: 'ltr',
    }}>
      {/* Brand */}
      <div style={{ padding: '26px 22px 18px', borderBottom: '1px solid #141826' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {team?.logo
            ? <img src={`${BASE}${team.logo}`} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(0,229,160,0.2)' }} />
            : <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#00e5a0,#00916a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚽</div>
          }
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Syne',sans-serif", lineHeight: 1.1 }}>{team?.name || 'My Club'}</p>
            <p style={{ fontSize: 9, color: '#00e5a0', letterSpacing: '2px', fontFamily: "'DM Sans',sans-serif", opacity: 0.7, marginTop: 2 }}>MANAGER</p>
          </div>
        </div>
      </div>

      {/* Squad progress */}
      <div style={{ padding: '14px 22px', borderBottom: '1px solid #141826' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: '#2e3748', fontFamily: "'DM Sans',sans-serif", letterSpacing: '1.5px', fontWeight: 600 }}>SQUAD SIZE</span>
          <span style={{ fontSize: 11, color: playerCount >= 22 ? '#00e5a0' : '#fb7185', fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{playerCount}/22</span>
        </div>
        <div style={{ height: 4, background: '#141826', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: playerCount >= 22 ? 'linear-gradient(90deg,#00e5a0,#00b87a)' : 'linear-gradient(90deg,#fb7185,#f43f5e)', borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
        {needed > 0 && <p style={{ fontSize: 10, color: '#fb7185', marginTop: 5, fontFamily: "'DM Sans',sans-serif" }}>{needed} more players needed</p>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
        <p style={{ fontSize: 9, fontWeight: 600, color: '#1e2636', letterSpacing: '2.5px', padding: '0 12px', marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>NAVIGATION</p>
        {NAV.map(n => {
          const active = tab === n.id;
          return (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 9, width: '100%', textAlign: 'left', cursor: 'pointer',
              background: active ? 'rgba(0,229,160,0.08)' : 'transparent',
              border: active ? '1px solid rgba(0,229,160,0.18)' : '1px solid transparent',
              marginBottom: 2, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{n.icon}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#00e5a0' : '#4a5568', fontFamily: "'DM Sans',sans-serif" }}>{n.label}</span>
              {n.count !== undefined && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                  background: active ? 'rgba(0,229,160,0.15)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#00e5a0' : '#2e3748', fontFamily: "'DM Sans',sans-serif" }}>
                  {n.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '14px 10px', borderTop: '1px solid #141826' }}>
        <div style={{ background: '#080a0f', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
          <p style={{ fontSize: 10, color: '#00e5a0', fontWeight: 600, letterSpacing: '1px', fontFamily: "'DM Sans',sans-serif" }}>TEAM MANAGER</p>
          <p style={{ fontSize: 11, color: '#2e3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>{team?.colors || 'Club Colors'}</p>
        </div>
        <button onClick={logout} style={{
          width: '100%', padding: '8px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600,
          background: 'transparent', border: '1px solid #1c2236', color: '#2e3748',
          fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.06)'; e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = 'rgba(255,107,107,0.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#2e3748'; e.currentTarget.style.borderColor = '#1c2236'; }}>
          Sign out →
        </button>
      </div>
    </aside>
  );
};

/* ══════════════════════════════════════════
   ADD PLAYER FORM
══════════════════════════════════════════ */
const AddPlayerPanel = ({ onSuccess, onCancel }) => {
  const [data, setData] = useState({ name: '', position: 'Forward', jersey_number: '', email: '' });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!data.name || !data.jersey_number) { setErr('Name and jersey number are required.'); return; }
    setLoading(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('name', data.name);
      fd.append('position', data.position);
      fd.append('jersey_number', parseInt(data.jersey_number));
      if (data.email) fd.append('email', data.email);
      if (photo) fd.append('photo', photo);
      await api.post('/players', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSuccess();
    } catch (e) {
      setErr(e.response?.data?.detail || 'Failed to add player.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background: '#111520', border: '1px solid #1c2236', borderRadius: 18, padding: 28, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <p style={{ fontSize: 10, color: '#2e3748', letterSpacing: '2px', fontFamily: "'DM Sans',sans-serif", marginBottom: 3 }}>NEW REGISTRATION</p>
          <h3 style={{ fontSize: 20, color: '#fff', fontFamily: "'Syne',sans-serif" }}>Add Player</h3>
        </div>
        <Btn c="ghost" sm onClick={onCancel}>✕ Cancel</Btn>
      </div>

      {err && <div style={{ background: 'rgba(255,107,107,0.07)', border: '1px solid rgba(255,107,107,0.2)', color: '#ff6b6b', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16, fontFamily: "'DM Sans',sans-serif" }}>{err}</div>}

      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Lbl>Full Name *</Lbl>
            <Inp placeholder="Mohamed Salah" required value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
          </div>
          <div>
            <Lbl>Jersey Number *</Lbl>
            <Inp type="number" min="1" max="99" placeholder="10" required value={data.jersey_number} onChange={e => setData({ ...data, jersey_number: e.target.value })} />
          </div>
          <div>
            <Lbl>Position *</Lbl>
            <Sel value={data.position} onChange={e => setData({ ...data, position: e.target.value })}>
              <option value="Goalkeeper">Goalkeeper</option>
              <option value="Defender">Defender</option>
              <option value="Midfielder">Midfielder</option>
              <option value="Forward">Forward</option>
            </Sel>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Lbl>Email (optional)</Lbl>
            <Inp type="email" placeholder="player@club.com" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Lbl>Player Photo</Lbl>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])}
                style={{ flex: 1, fontSize: 12, color: '#4a5568', background: '#0a0d14', border: '1px solid #1c2236', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }} />
              {photo && <img src={URL.createObjectURL(photo)} style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover', border: '1px solid rgba(0,229,160,0.25)' }} />}
            </div>
          </div>
        </div>
        <Btn type="submit" c="emerald" full disabled={loading}>
          {loading ? '⏳  Registering...' : '✓  Register Player'}
        </Btn>
      </form>
    </div>
  );
};

/* ══════════════════════════════════════════
   SQUAD TABLE
══════════════════════════════════════════ */
const SquadTable = ({ players, onAddClick }) => {
  const [filter, setFilter] = useState('All');
  const POSITIONS = ['All', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
  const filtered = filter === 'All' ? players : players.filter(p => p.position === filter);

  const TH = ({ children, right }) => (
    <th style={{ padding: '10px 14px', textAlign: right ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: '#1e2636', letterSpacing: '2px', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>
      {children?.toUpperCase()}
    </th>
  );

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {POSITIONS.map(p => (
          <button key={p} onClick={() => setFilter(p)} style={{
            padding: '6px 14px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s',
            background: filter === p ? 'rgba(0,229,160,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${filter === p ? 'rgba(0,229,160,0.3)' : '#1c2236'}`,
            color: filter === p ? '#00e5a0' : '#2e3748',
          }}>{p}</button>
        ))}
        <button onClick={onAddClick} style={{
          marginLeft: 'auto', padding: '6px 16px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          background: 'linear-gradient(135deg,#00e5a0,#00b87a)', color: '#080a0f',
          border: 'none', fontFamily: "'DM Sans',sans-serif",
        }}>+ Add Player</button>
      </div>

      <div style={{ background: '#111520', border: '1px solid #1c2236', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1c2236' }}>
              <TH>#</TH><TH>Player</TH><TH>Position</TH><TH>Jersey</TH><TH>Status</TH>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: '#1e2636', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
                {players.length === 0 ? 'No players registered yet.' : `No ${filter} players found.`}
              </td></tr>
            ) : filtered.map((p, i) => {
              const ps = positionStyle(p.position);
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #0e1118', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '13px 14px', color: '#1e2636', fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{String(i + 1).padStart(2, '0')}</td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.photo
                        ? <img src={`${BASE}${p.photo}`} style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover', border: '1px solid #1c2236' }} />
                        : <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#00e5a0', fontFamily: "'Syne',sans-serif" }}>
                            {p.name.charAt(0)}
                          </div>
                      }
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: "'DM Sans',sans-serif" }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: ps.bg, color: ps.color, border: `1px solid ${ps.border}`, fontFamily: "'DM Sans',sans-serif", letterSpacing: '0.5px' }}>
                      {posLabel(p.position)}
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Syne',sans-serif", background: '#0a0d14', border: '1px solid #1c2236', borderRadius: 8, padding: '3px 10px' }}>
                      {p.jersey_number || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#00e5a0', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: '#00e5a0', display: 'inline-block' }} />Active
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const TeamManagerDashboard = () => {
  const { user, logout } = useAuthStore();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('squad');
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => { injectFonts(); fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [teamRes, playersRes] = await Promise.all([api.get('/me/team'), api.get('/me/players')]);
      setTeam(teamRes.data);
      setPlayers(playersRes.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handlePlayerAdded = () => {
    setMsg({ text: 'Player registered successfully!', type: 'success' });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
    setTab('squad');
    fetchData();
  };

  if (loading) return (
    <div style={{ background: '#080a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e5a0', fontFamily: "'Syne',sans-serif", fontSize: 18 }}>
      Loading squad...
    </div>
  );

  if (!team) return (
    <div style={{ background: '#080a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b', fontFamily: "'DM Sans',sans-serif" }}>
      No team associated with this account.
    </div>
  );

  const playerCount = players.length;
  const needed = Math.max(0, 22 - playerCount);

  // Position counts
  const posCounts = players.reduce((acc, p) => { acc[p.position] = (acc[p.position] || 0) + 1; return acc; }, {});

  return (
    <div style={{ background: '#080a0f', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif", color: '#e2e8f0', direction: 'ltr' }}>
      {/* bg glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 60% 0%, rgba(0,229,160,0.04), transparent)' }} />

      <Sidebar tab={tab} setTab={setTab} playerCount={playerCount} team={team} logout={logout} />

      <main style={{ marginLeft: 240, padding: '40px 48px', maxWidth: 900, minHeight: '100vh' }}>
        <Toast msg={msg} />

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: '#2e3748', letterSpacing: '2px', fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>TEAM MANAGEMENT</p>
          <h1 style={{ fontSize: 30, color: '#fff', fontFamily: "'Syne',sans-serif", lineHeight: 1.1, marginBottom: 6 }}>{team.name}</h1>
          <p style={{ fontSize: 13, color: '#2e3748' }}>{team.colors} · {team.role_in_team}</p>
        </div>

        {/* Squad alert banner */}
        {needed > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderRadius: 14, marginBottom: 24, background: 'rgba(251,113,133,0.06)', border: '1px solid rgba(251,113,133,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fb7185', fontFamily: "'DM Sans',sans-serif" }}>Squad incomplete — {needed} more players needed</p>
                <p style={{ fontSize: 11, color: '#2e3748', fontFamily: "'DM Sans',sans-serif", marginTop: 2 }}>Minimum 22 players required to participate.</p>
              </div>
            </div>
            <Btn c="red" sm onClick={() => setTab('add')}>+ Add Now</Btn>
          </div>
        )}

        {needed === 0 && (
          <div style={{ padding: '12px 18px', borderRadius: 14, marginBottom: 24, background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#00e5a0', fontSize: 14 }}>✓</span>
            <p style={{ fontSize: 13, color: '#00e5a0', fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>Squad complete — {playerCount} players registered.</p>
          </div>
        )}

        {/* Stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Total Players', value: playerCount, color: '#00e5a0' },
            { label: 'Goalkeepers',   value: posCounts.Goalkeeper  || 0, color: '#fbbf24' },
            { label: 'Defenders',     value: posCounts.Defender    || 0, color: '#38bdf8' },
            { label: 'Midfielders',   value: posCounts.Midfielder  || 0, color: '#00e5a0' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#111520', border: '1px solid #1c2236', borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${s.color},transparent)` }} />
              <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: "'Syne',sans-serif", lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: '#2e3748', fontFamily: "'DM Sans',sans-serif", letterSpacing: '1px' }}>{s.label.toUpperCase()}</p>
            </div>
          ))}
        </div>

        {/* Main content */}
        {tab === 'add' && (
          <AddPlayerPanel onSuccess={handlePlayerAdded} onCancel={() => setTab('squad')} />
        )}

        {tab === 'squad' && (
          <SquadTable players={players} onAddClick={() => setTab('add')} />
        )}
      </main>

      <style>{`
        * { box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.3); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1c2236; border-radius: 99px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default TeamManagerDashboard;