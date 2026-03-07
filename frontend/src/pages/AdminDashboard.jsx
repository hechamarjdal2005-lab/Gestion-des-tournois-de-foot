import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const BASE = 'http://127.0.0.1:8000';

const injectFonts = () => {
  if (document.getElementById('adm-fonts')) return;
  const l = document.createElement('link');
  l.id = 'adm-fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(l);
};

const Toaster = ({ msg }) => {
  if (!msg?.text) return null;
  const ok = msg.type === 'success';
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium mb-6"
      style={{ background: ok ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${ok ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`, color: ok ? '#4ade80' : '#f87171' }}>
      <span className="text-base shrink-0">{ok ? '✓' : '✗'}</span>
      {msg.text}
    </div>
  );
};

const Lbl = ({ children }) => (
  <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-1.5" style={{ color: '#3a4050', fontFamily: "'Geist',sans-serif" }}>{children}</p>
);
const Inp = (props) => (
  <input {...props}
    style={{ background: '#0e1117', border: '1px solid #1e2433', color: '#e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 13, width: '100%', outline: 'none', fontFamily: "'Geist',sans-serif", transition: 'border-color 0.15s, box-shadow 0.15s', ...props.style }}
    onFocus={e => { e.target.style.borderColor = '#f0b429'; e.target.style.boxShadow = '0 0 0 3px rgba(240,180,41,0.1)'; }}
    onBlur={e => { e.target.style.borderColor = '#1e2433'; e.target.style.boxShadow = 'none'; }}
  />
);
const Sel = ({ children, ...props }) => (
  <select {...props} style={{ background: '#0e1117', border: '1px solid #1e2433', color: '#e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 13, width: '100%', outline: 'none', fontFamily: "'Geist',sans-serif" }}>
    {children}
  </select>
);
const Btn = ({ children, c = 'gold', full, sm, ...props }) => {
  const map = {
    gold:    { bg: 'linear-gradient(135deg,#f0b429 0%,#d4921a 100%)', color: '#0b0d11', shadow: '0 4px 20px rgba(240,180,41,0.25)' },
    emerald: { bg: 'linear-gradient(135deg,#34d399 0%,#059669 100%)', color: '#0b0d11', shadow: '0 4px 20px rgba(52,211,153,0.25)' },
    sky:     { bg: 'linear-gradient(135deg,#38bdf8 0%,#0284c7 100%)', color: '#0b0d11', shadow: '0 4px 20px rgba(56,189,248,0.25)' },
    violet:  { bg: 'linear-gradient(135deg,#a78bfa 0%,#7c3aed 100%)', color: '#fff',    shadow: '0 4px 20px rgba(167,139,250,0.25)' },
    rose:    { bg: 'rgba(248,113,113,0.08)', color: '#f87171', shadow: 'none', border: '1px solid rgba(248,113,113,0.2)' },
    ghost:   { bg: 'rgba(255,255,255,0.04)', color: '#64748b', shadow: 'none', border: '1px solid #1e2433' },
    amber:   { bg: 'rgba(251,191,36,0.08)', color: '#fbbf24', shadow: 'none', border: '1px solid rgba(251,191,36,0.2)' },
  }[c];
  return (
    <button {...props} style={{
      background: map.bg, color: map.color, boxShadow: map.shadow,
      border: map.border || 'none', borderRadius: 12,
      padding: sm ? '6px 14px' : full ? '12px 20px' : '9px 18px',
      fontSize: sm ? 12 : 13, fontWeight: 600, cursor: 'pointer',
      width: full ? '100%' : undefined, transition: 'opacity 0.15s, transform 0.1s',
      fontFamily: "'Geist',sans-serif", letterSpacing: '0.2px',
      opacity: props.disabled ? 0.35 : 1,
    }}
    onMouseEnter={e => { if (!props.disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
      {children}
    </button>
  );
};
const Card = ({ title, subtitle, children }) => (
  <div style={{ background: '#161a22', border: '1px solid #1e2433', borderRadius: 20, overflow: 'hidden', marginBottom: 20 }}>
    {(title || subtitle) && (
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e2433', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {title && <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: "'Geist',sans-serif" }}>{title}</p>}
          {subtitle && <p style={{ fontSize: 11, color: '#3a4050', marginTop: 2, fontFamily: "'Geist',sans-serif" }}>{subtitle}</p>}
        </div>
      </div>
    )}
    <div style={{ padding: 24 }}>{children}</div>
  </div>
);
const FmtBtn = ({ icon, title, desc, active, onClick }) => (
  <button type="button" onClick={onClick} style={{
    background: active ? 'rgba(240,180,41,0.08)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${active ? 'rgba(240,180,41,0.45)' : '#1e2433'}`,
    borderRadius: 14, padding: '14px 16px', textAlign: 'left', width: '100%', cursor: 'pointer',
    transition: 'all 0.15s', boxShadow: active ? '0 0 24px rgba(240,180,41,0.07)' : 'none',
  }}>
    <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#f0b429' : '#e2e8f0', marginBottom: 3, fontFamily: "'Geist',sans-serif" }}>{title}</div>
    <div style={{ fontSize: 11, color: '#3a4050', fontFamily: "'Geist',sans-serif" }}>{desc}</div>
  </button>
);

/* ── MODAL WRAPPER ── */
const Modal = ({ title, subtitle, onClose, children, width = 520 }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <div style={{ background: '#161a22', border: '1px solid #1e2433', borderRadius: 24, width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#1e2433 transparent' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e2433', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#161a22', zIndex: 10 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Geist',sans-serif" }}>{title}</p>
          {subtitle && <p style={{ fontSize: 11, color: '#3a4050', marginTop: 3, fontFamily: "'Geist',sans-serif" }}>{subtitle}</p>}
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2433', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: '#64748b', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>
);

/* ── FILE INPUT ── */
const FileInput = ({ label, accept = 'image/*', value, onChange, preview }) => (
  <div>
    <Lbl>{label}</Lbl>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <input type="file" accept={accept} onChange={onChange}
        style={{ flex: 1, fontSize: 12, color: '#64748b', background: '#0e1117', border: '1px solid #1e2433', borderRadius: 12, padding: '9px 12px', cursor: 'pointer' }} />
      {preview && <img src={preview} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(240,180,41,0.3)', flexShrink: 0 }} />}
    </div>
  </div>
);

/* ══════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════ */
const Sidebar = ({ tab, setTab, counts, user, logout }) => {
  const NAV = [
    { id: 'overview',    icon: '◈',  label: 'Overview' },
    { id: 'teams',       icon: '🛡',  label: 'Teams',       count: counts.teams },
    { id: 'tournaments', icon: '🏆',  label: 'Tournaments', count: counts.tournaments },
    { id: 'referees',    icon: '⚖',  label: 'Referees',    count: counts.referees },
  ];
  return (
    <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 240, background: '#0e1117', borderRight: '1px solid #1a1f2e', display: 'flex', flexDirection: 'column', zIndex: 40, direction: 'ltr' }}>
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #1a1f2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#f0b429,#c97d10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⚡</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '0.5px', fontFamily: "'Geist',sans-serif", lineHeight: 1 }}>TOURNEY</p>
            <p style={{ fontSize: 9, color: '#f0b429', letterSpacing: '2px', fontFamily: "'Geist',sans-serif", opacity: 0.7 }}>ADMIN</p>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: '#2a3040', letterSpacing: '2.5px', padding: '0 12px', marginBottom: 8, fontFamily: "'Geist',sans-serif" }}>NAVIGATION</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(n => {
            const active = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, width: '100%', textAlign: 'left', cursor: 'pointer', background: active ? 'rgba(240,180,41,0.1)' : 'transparent', border: active ? '1px solid rgba(240,180,41,0.2)' : '1px solid transparent', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#f0b429' : '#64748b', fontFamily: "'Geist',sans-serif" }}>{n.label}</span>
                {n.count !== undefined && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: active ? 'rgba(240,180,41,0.2)' : 'rgba(255,255,255,0.05)', color: active ? '#f0b429' : '#3a4050', fontFamily: "'Geist',sans-serif" }}>{n.count}</span>}
              </button>
            );
          })}
        </div>
      </nav>
      <div style={{ padding: '16px 12px', borderTop: '1px solid #1a1f2e' }}>
        <div style={{ background: '#0b0d11', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,rgba(240,180,41,0.2),rgba(240,180,41,0.05))', border: '1px solid rgba(240,180,41,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, color: '#f0b429', fontWeight: 600, letterSpacing: '1px', fontFamily: "'Geist',sans-serif" }}>SUPER ADMIN</p>
              <p style={{ fontSize: 11, color: '#3a4050', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Geist',sans-serif" }}>{user?.email}</p>
            </div>
          </div>
        </div>
        <button onClick={logout} style={{ width: '100%', padding: '9px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: 'transparent', border: '1px solid #1e2433', color: '#3a4050', fontFamily: "'Geist',sans-serif", transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.06)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3a4050'; e.currentTarget.style.borderColor = '#1e2433'; }}>
          Sign out →
        </button>
      </div>
    </aside>
  );
};

/* ══════════════════════════════════════════
   OVERVIEW
══════════════════════════════════════════ */
const Overview = ({ teams, tournaments, referees, setTab }) => {
  const stats = [
    { label: 'Total Teams',       value: teams.length,       icon: '🛡', color: '#38bdf8', tab: 'teams' },
    { label: 'Tournaments',       value: tournaments.length, icon: '🏆', color: '#f0b429', tab: 'tournaments' },
    { label: 'Active Referees',   value: referees.length,    icon: '⚖', color: '#34d399', tab: 'referees' },
    { label: 'Matches Generated', value: tournaments.reduce((s, t) => s + (t.matches_count || 0), 0), icon: '⚽', color: '#f87171', tab: null },
  ];
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, color: '#fff', fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', lineHeight: 1.1, marginBottom: 6 }}>Good evening, Admin.</h1>
        <p style={{ fontSize: 13, color: '#3a4050', fontFamily: "'Geist',sans-serif" }}>Here's what's happening across your tournaments today.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} onClick={() => s.tab && setTab(s.tab)}
            style={{ background: '#161a22', border: '1px solid #1e2433', borderRadius: 18, padding: '22px 24px', cursor: s.tab ? 'pointer' : 'default', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { if (s.tab) { e.currentTarget.style.borderColor = s.color + '40'; e.currentTarget.style.background = '#1a1f2a'; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2433'; e.currentTarget.style.background = '#161a22'; }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${s.color},transparent)` }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              {s.tab && <span style={{ fontSize: 10, color: s.color, fontFamily: "'Geist',sans-serif", fontWeight: 600 }}>VIEW →</span>}
            </div>
            <p style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1, fontFamily: "'Geist',sans-serif", marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#3a4050', fontFamily: "'Geist',sans-serif" }}>{s.label}</p>
          </div>
        ))}
      </div>
      {tournaments.length > 0 && (
        <Card title="Recent Tournaments" subtitle="Latest activity">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tournaments.slice(0, 5).map(t => {
              const colors = { league: '#38bdf8', knockout: '#f87171', mixed: '#a78bfa' };
              const c = colors[t.type] || '#64748b';
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#0e1117', borderRadius: 12, border: '1px solid #1a1f2e' }}>
                  <div style={{ width: 6, height: 6, borderRadius: 99, background: c, flexShrink: 0 }} />
                  <p style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#e2e8f0', fontFamily: "'Geist',sans-serif" }}>{t.name}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: c + '15', color: c, fontFamily: "'Geist',sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.type}</span>
                  <span style={{ fontSize: 11, color: '#3a4050', fontFamily: "'Geist',sans-serif" }}>{t.teams_count} teams</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [tab, setTab]             = useState('overview');
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams]         = useState([]);
  const [referees, setReferees]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState({ text: '', type: '' });
  const [refMsg, setRefMsg]       = useState({ text: '', type: '' });

  // create forms
  const [showTeam,  setShowTeam]  = useState(false);
  const [showTourn, setShowTourn] = useState(false);
  const [showRef,   setShowRef]   = useState(false);

  // edit modals
  const [editTeam,  setEditTeam]  = useState(null); // team object
  const [editTourn, setEditTourn] = useState(null); // tournament object
  const [editRef,   setEditRef]   = useState(null); // referee object

  // team create
  const [teamData,    setTeamData]    = useState({ name: '', short_name: '', founded_date: '', colors: '' });
  const [managerData, setManagerData] = useState({ name: '', email: '' });
  const [coachData,   setCoachData]   = useState({ name: '', email: '' });
  const [teamLogo,    setTeamLogo]    = useState(null);
  const [coachPhoto,  setCoachPhoto]  = useState(null);

  // team edit
  const [editTeamData, setEditTeamData] = useState({ name: '', short_name: '', founded_date: '', colors: '' });
  const [editTeamLogo, setEditTeamLogo] = useState(null);

  // tournament create
  const [tData,    setTData]    = useState({ name: '', type: 'league', start_date: '', end_date: '' });
  const [selTeams, setSelTeams] = useState([]);
  const [tOpts,    setTOpts]    = useState({ group_stage_legs: 1, knockout_stage_legs: 1, num_groups: 4, teams_qualify_per_group: 2 });
  const [tTrophy,  setTTrophy]  = useState(null);

  // tournament edit
  const [editTData,   setEditTData]   = useState({ name: '', start_date: '', end_date: '' });
  const [editTTrophy, setEditTTrophy] = useState(null);

  // referee create
  const [refData, setRefData] = useState({ name: '', email: '', photo: null });

  // referee edit
  const [editRefData,  setEditRefData]  = useState({ name: '', email: '' });
  const [editRefPhoto, setEditRefPhoto] = useState(null);

  useEffect(() => { injectFonts(); fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [t, tm, r] = await Promise.all([api.get('/tournaments'), api.get('/teams'), api.get('/referees').catch(() => ({ data: [] }))]);
      setTournaments(t.data); setTeams(tm.data); setReferees(r.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const flash = (set, text, type = 'success', ms = 5000) => { set({ text, type }); setTimeout(() => set({ text: '', type: '' }), ms); };

  const resetCreate = () => {
    setTeamData({ name:'', short_name:'', founded_date:'', colors:'' });
    setManagerData({ name:'', email:'' }); setCoachData({ name:'', email:'' });
    setTeamLogo(null); setCoachPhoto(null);
    setTData({ name:'', type:'league', start_date:'', end_date:'' });
    setTOpts({ group_stage_legs:1, knockout_stage_legs:1, num_groups:4, teams_qualify_per_group:2 });
    setSelTeams([]); setTTrophy(null);
    setRefData({ name:'', email:'', photo:null });
  };

  /* ── CREATE TEAM ── */
  const createTeam = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries({ ...teamData, manager_name: managerData.name, manager_email: managerData.email, coach_name: coachData.name, coach_email: coachData.email }).forEach(([k, v]) => fd.append(k, v || ''));
      if (teamLogo)   fd.append('logo', teamLogo);
      if (coachPhoto) fd.append('coach_photo', coachPhoto);
      const res = await api.post('/teams', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      flash(setMsg, res.data.message);
      setShowTeam(false); resetCreate(); fetchData();
    } catch (err) { flash(setMsg, err.response?.data?.detail || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  /* ── EDIT TEAM ── */
  const openEditTeam = (t) => {
    setEditTeam(t);
    setEditTeamData({ name: t.name, short_name: t.short_name || '', founded_date: t.founded_date || '', colors: t.colors || '' });
    setEditTeamLogo(null);
  };
  const saveEditTeam = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(editTeamData).forEach(([k, v]) => fd.append(k, v || ''));
      if (editTeamLogo) fd.append('logo', editTeamLogo);
      await api.put(`/teams/${editTeam.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      flash(setMsg, 'Team updated successfully!');
      setEditTeam(null); fetchData();
    } catch (err) { flash(setMsg, err.response?.data?.detail || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  /* ── CREATE TOURNAMENT ── */
  const createTournament = async (e) => {
    e.preventDefault();
    if (selTeams.length < 2) { flash(setMsg, 'Select at least 2 teams', 'error', 4000); return; }
    setLoading(true);
    try {
      const res = await api.post('/tournaments', { name: tData.name, type: tData.type, start_date: tData.start_date, end_date: tData.end_date, team_ids: selTeams });
      await api.post(`/tournaments/${res.data.id}/generate-matches`, tOpts);
      // upload trophy if provided
      if (tTrophy) {
        const fd = new FormData(); fd.append('trophy_image', tTrophy);
        await api.patch(`/tournaments/${res.data.id}/trophy`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
      }
      flash(setMsg, 'Tournament created & fixtures generated!');
      setShowTourn(false); resetCreate(); fetchData();
      setTimeout(() => navigate(`/tournament/${res.data.id}`), 1400);
    } catch (err) { flash(setMsg, err.response?.data?.detail || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  /* ── EDIT TOURNAMENT ── */
  const openEditTourn = (t) => {
    setEditTourn(t);
    setEditTData({ name: t.name, start_date: t.start_date || '', end_date: t.end_date || '' });
    setEditTTrophy(null);
  };
  const saveEditTourn = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.put(`/tournaments/${editTourn.id}`, editTData);
      if (editTTrophy) {
        const fd = new FormData(); fd.append('trophy_image', editTTrophy);
        await api.patch(`/tournaments/${editTourn.id}/trophy`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
      }
      flash(setMsg, 'Tournament updated!');
      setEditTourn(null); fetchData();
    } catch (err) { flash(setMsg, err.response?.data?.detail || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  /* ── CREATE REFEREE ── */
  const createReferee = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', refData.name); fd.append('email', refData.email);
      if (refData.photo) fd.append('photo', refData.photo);
      await api.post('/referees', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      flash(setRefMsg, 'Referee added & invitation sent!');
      setShowRef(false); setRefData({ name:'', email:'', photo:null }); fetchData();
    } catch (err) {
      const d = err.response?.data?.detail || 'Failed';
      flash(setRefMsg, d, 'error');
      if (d.includes('Email')) alert('Account created but email failed.');
    } finally { setLoading(false); }
  };

  /* ── EDIT REFEREE ── */
  const openEditRef = (r) => {
    setEditRef(r);
    setEditRefData({ name: r.name, email: r.email });
    setEditRefPhoto(null);
  };
  const saveEditRef = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', editRefData.name); fd.append('email', editRefData.email);
      if (editRefPhoto) fd.append('photo', editRefPhoto);
      await api.put(`/referees/${editRef.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      flash(setRefMsg, 'Referee updated!');
      setEditRef(null); fetchData();
    } catch (err) { flash(setRefMsg, err.response?.data?.detail || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  const deleteTeam    = async (id, name) => { if (!confirm(`Delete team "${name}"?`)) return; try { await api.delete(`/teams/${id}`); fetchData(); } catch (err) { alert(err.response?.data?.detail); } };
  const deleteReferee = async (id, name) => { if (!confirm(`Delete referee "${name}"?`)) return; try { await api.delete(`/referees/${id}`); flash(setRefMsg, 'Deleted.'); fetchData(); } catch (err) { flash(setRefMsg, err.response?.data?.detail, 'error'); } };
  const toggleTeam    = (id) => setSelTeams(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const summary = (() => {
    const n = selTeams.length; if (n < 2) return null;
    if (tData.type === 'league') { const m = tOpts.group_stage_legs === 2 ? n*(n-1) : (n*(n-1))/2; return `${n} teams · ${tOpts.group_stage_legs === 2 ? 'Home & Away' : 'Single leg'} · ${Math.round(m)} matches`; }
    if (tData.type === 'knockout') return `${n} teams · ${Math.log2(n)} rounds`;
    if (tData.type === 'mixed') return `${n} teams · ${tOpts.num_groups} groups · ${tOpts.teams_qualify_per_group} qualify/group`;
    return null;
  })();

  const PageTitle = ({ icon, title, action }) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <p style={{ fontSize: 11, color: '#3a4050', fontFamily: "'Geist',sans-serif", marginBottom: 4, letterSpacing: '1px' }}>{icon} {title.toUpperCase()}</p>
        <h2 style={{ fontSize: 28, color: '#fff', fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', lineHeight: 1 }}>{title}</h2>
      </div>
      {action}
    </div>
  );
  const TRow = ({ cells }) => (
    <tr style={{ borderBottom: '1px solid #1a1f2e', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {cells.map((cell, i) => <td key={i} style={{ padding: '13px 16px', verticalAlign: 'middle' }}>{cell}</td>)}
    </tr>
  );
  const THead = ({ cols }) => (
    <thead>
      <tr style={{ borderBottom: '1px solid #1e2433' }}>
        {cols.map(c => <th key={c} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#2a3040', letterSpacing: '2px', fontFamily: "'Geist',sans-serif" }}>{c.toUpperCase()}</th>)}
      </tr>
    </thead>
  );

  return (
    <div style={{ background: '#0b0d11', minHeight: '100vh', fontFamily: "'Geist',sans-serif", color: '#e2e8f0', direction: 'ltr' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 40% at 30% 0%, rgba(240,180,41,0.04), transparent)' }} />
      <Sidebar tab={tab} setTab={setTab} counts={{ teams: teams.length, tournaments: tournaments.length, referees: referees.length }} user={user} logout={logout} />

      <main style={{ marginLeft: 240, padding: '40px 48px', maxWidth: 900, minHeight: '100vh' }}>
        <Toaster msg={msg} />

        {/* ══ OVERVIEW ══ */}
        {tab === 'overview' && <Overview teams={teams} tournaments={tournaments} referees={referees} setTab={setTab} />}

        {/* ══ TEAMS ══ */}
        {tab === 'teams' && (
          <div>
            <PageTitle icon="🛡" title="Teams" action={<Btn c="gold" onClick={() => setShowTeam(!showTeam)}>{showTeam ? '✕  Close' : '+  New Team'}</Btn>} />

            {showTeam && (
              <Card title="Register New Team" subtitle="Invitations will be sent automatically">
                <form onSubmit={createTeam}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div><Lbl>Team Name *</Lbl><Inp placeholder="FC Barcelona" required value={teamData.name} onChange={e=>setTeamData({...teamData,name:e.target.value})} /></div>
                    <div><Lbl>Short Name</Lbl><Inp placeholder="FCB" value={teamData.short_name} onChange={e=>setTeamData({...teamData,short_name:e.target.value})} /></div>
                    <div><Lbl>Founded Date</Lbl><Inp type="date" value={teamData.founded_date} onChange={e=>setTeamData({...teamData,founded_date:e.target.value})} /></div>
                    <div><Lbl>Kit Colors</Lbl><Inp placeholder="Red & Blue" value={teamData.colors} onChange={e=>setTeamData({...teamData,colors:e.target.value})} /></div>
                  </div>
                  <div style={{ marginBottom: 20 }}><FileInput label="Team Crest" value={teamLogo} onChange={e=>setTeamLogo(e.target.files[0])} preview={teamLogo && URL.createObjectURL(teamLogo)} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingTop: 20, borderTop: '1px solid #1a1f2e' }}>
                    {[{ label: 'Manager', color: '#38bdf8', data: managerData, set: setManagerData, showPhoto: false },
                      { label: 'Head Coach', color: '#34d399', data: coachData, set: setCoachData, showPhoto: true }].map((section, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <div style={{ width: 3, height: 14, borderRadius: 99, background: section.color }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: section.color, letterSpacing: '1.5px' }}>{section.label.toUpperCase()}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div><Lbl>Full Name *</Lbl><Inp placeholder="Full name" required value={section.data.name} onChange={e=>section.set({...section.data,name:e.target.value})} /></div>
                          <div><Lbl>Email *</Lbl><Inp type="email" placeholder="email@club.com" required value={section.data.email} onChange={e=>section.set({...section.data,email:e.target.value})} /></div>
                          {section.showPhoto && <FileInput label="Photo (optional)" value={coachPhoto} onChange={e=>setCoachPhoto(e.target.files[0])} preview={coachPhoto && URL.createObjectURL(coachPhoto)} />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 20 }}><Btn type="submit" c="gold" full disabled={loading}>{loading ? '⏳  Processing...' : '✓  Create Team & Send Invitations'}</Btn></div>
                </form>
              </Card>
            )}

            <div style={{ background: '#161a22', border: '1px solid #1e2433', borderRadius: 20, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['#', 'Crest', 'Team', 'Code', 'Colors', '']} />
                <tbody>
                  {teams.length === 0
                    ? <tr><td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#2a3040', fontSize: 13 }}>No teams registered yet</td></tr>
                    : teams.map((t, i) => (
                      <TRow key={t.id} cells={[
                        <span style={{ color: '#2a3040', fontSize: 11, fontWeight: 700 }}>{String(i+1).padStart(2,'0')}</span>,
                        t.logo
                          ? <img src={`${BASE}${t.logo}`} style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', border: '1px solid #1e2433' }} onError={e=>e.target.style.display='none'} />
                          : <div style={{ width: 36, height: 36, borderRadius: 9, background: '#0e1117', border: '1px solid #1e2433', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡</div>,
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{t.name}</span>,
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(56,189,248,0.08)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.15)' }}>{t.short_name || '—'}</span>,
                        <span style={{ fontSize: 12, color: '#3a4050' }}>{t.colors || '—'}</span>,
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn c="amber" sm onClick={() => openEditTeam(t)}>Edit</Btn>
                          <Btn c="rose"  sm onClick={() => deleteTeam(t.id, t.name)}>Delete</Btn>
                        </div>,
                      ]} />
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TOURNAMENTS ══ */}
        {tab === 'tournaments' && (
          <div>
            <PageTitle icon="🏆" title="Tournaments" action={<Btn c="emerald" onClick={() => setShowTourn(!showTourn)}>{showTourn ? '✕  Close' : '+  New Tournament'}</Btn>} />

            {showTourn && (
              <Card title="Create Tournament" subtitle="Configure format and generate fixtures">
                <form onSubmit={createTournament}>
                  <div style={{ marginBottom: 14 }}><Lbl>Tournament Name *</Lbl><Inp placeholder="Champions League 2025" required value={tData.name} onChange={e=>setTData({...tData,name:e.target.value})} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div><Lbl>Start Date *</Lbl><Inp type="date" required value={tData.start_date} onChange={e=>setTData({...tData,start_date:e.target.value})} /></div>
                    <div><Lbl>End Date *</Lbl><Inp type="date" required value={tData.end_date} onChange={e=>setTData({...tData,end_date:e.target.value})} /></div>
                  </div>
                  <div style={{ marginBottom: 20 }}><FileInput label="Trophy / Cup Image (optional)" value={tTrophy} onChange={e=>setTTrophy(e.target.files[0])} preview={tTrophy && URL.createObjectURL(tTrophy)} /></div>

                  <Lbl>Format</Lbl>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                    <FmtBtn icon="📊" title="League"   desc="Round robin — all vs all"   active={tData.type==='league'}   onClick={()=>setTData({...tData,type:'league'})} />
                    <FmtBtn icon="⚡" title="Knockout" desc="Elimination bracket"         active={tData.type==='knockout'} onClick={()=>setTData({...tData,type:'knockout'})} />
                    <FmtBtn icon="🌟" title="Mixed"    desc="Groups + knockout"           active={tData.type==='mixed'}    onClick={()=>setTData({...tData,type:'mixed'})} />
                  </div>

                  {tData.type === 'league' && (
                    <div style={{ background: 'rgba(240,180,41,0.04)', border: '1px solid rgba(240,180,41,0.12)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                      <Lbl>League Format</Lbl>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[{v:1,l:'Single Leg',d:'One match per pair'},{v:2,l:'Home & Away',d:'Two matches per pair'}].map(o=>(
                          <button key={o.v} type="button" onClick={()=>setTOpts({...tOpts,group_stage_legs:o.v})}
                            style={{ background:tOpts.group_stage_legs===o.v?'rgba(240,180,41,0.1)':'rgba(255,255,255,0.02)', border:`1px solid ${tOpts.group_stage_legs===o.v?'rgba(240,180,41,0.4)':'#1e2433'}`, borderRadius:12, padding:'12px 14px', textAlign:'left', cursor:'pointer', transition:'all 0.15s' }}>
                            <p style={{ fontSize:13, fontWeight:600, color:tOpts.group_stage_legs===o.v?'#f0b429':'#e2e8f0', marginBottom:2, fontFamily:"'Geist',sans-serif" }}>{o.l}</p>
                            <p style={{ fontSize:11, color:'#3a4050', fontFamily:"'Geist',sans-serif" }}>{o.d}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {tData.type === 'knockout' && (
                    <div style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                      <Lbl>Knockout Format</Lbl>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[{v:1,l:'Single Match',d:'Winner advances directly'},{v:2,l:'Two Legs',d:'Aggregate — final is 1 match'}].map(o=>(
                          <button key={o.v} type="button" onClick={()=>setTOpts({...tOpts,knockout_stage_legs:o.v})}
                            style={{ background:tOpts.knockout_stage_legs===o.v?'rgba(248,113,113,0.1)':'rgba(255,255,255,0.02)', border:`1px solid ${tOpts.knockout_stage_legs===o.v?'rgba(248,113,113,0.35)':'#1e2433'}`, borderRadius:12, padding:'12px 14px', textAlign:'left', cursor:'pointer', transition:'all 0.15s' }}>
                            <p style={{ fontSize:13, fontWeight:600, color:tOpts.knockout_stage_legs===o.v?'#f87171':'#e2e8f0', marginBottom:2, fontFamily:"'Geist',sans-serif" }}>{o.l}</p>
                            <p style={{ fontSize:11, color:'#3a4050', fontFamily:"'Geist',sans-serif" }}>{o.d}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {tData.type === 'mixed' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                      <div style={{ background:'rgba(240,180,41,0.04)', border:'1px solid rgba(240,180,41,0.1)', borderRadius:14, padding:16 }}>
                        <Lbl>Group Stage</Lbl>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                          <div><Lbl>Format</Lbl><Sel value={tOpts.group_stage_legs} onChange={e=>setTOpts({...tOpts,group_stage_legs:parseInt(e.target.value)})}><option value="1">Single leg</option><option value="2">Home & Away</option></Sel></div>
                          <div><Lbl>Groups</Lbl><Sel value={tOpts.num_groups} onChange={e=>setTOpts({...tOpts,num_groups:parseInt(e.target.value)})}><option value="2">2</option><option value="4">4</option><option value="8">8</option></Sel></div>
                          <div><Lbl>Qualify/group</Lbl><Sel value={tOpts.teams_qualify_per_group} onChange={e=>setTOpts({...tOpts,teams_qualify_per_group:parseInt(e.target.value)})}><option value="1">Top 1</option><option value="2">Top 2</option><option value="3">Top 3</option></Sel></div>
                        </div>
                      </div>
                      <div style={{ background:'rgba(248,113,113,0.04)', border:'1px solid rgba(248,113,113,0.1)', borderRadius:14, padding:16 }}>
                        <Lbl>Knockout Stage</Lbl>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                          {[{v:1,l:'Single Match',d:'Direct elimination'},{v:2,l:'Two Legs',d:'Aggregate scoring'}].map(o=>(
                            <button key={o.v} type="button" onClick={()=>setTOpts({...tOpts,knockout_stage_legs:o.v})}
                              style={{ background:tOpts.knockout_stage_legs===o.v?'rgba(248,113,113,0.1)':'rgba(255,255,255,0.02)', border:`1px solid ${tOpts.knockout_stage_legs===o.v?'rgba(248,113,113,0.35)':'#1e2433'}`, borderRadius:12, padding:'12px 14px', textAlign:'left', cursor:'pointer', transition:'all 0.15s' }}>
                              <p style={{ fontSize:13, fontWeight:600, color:tOpts.knockout_stage_legs===o.v?'#f87171':'#e2e8f0', fontFamily:"'Geist',sans-serif" }}>{o.l}</p>
                              <p style={{ fontSize:11, color:'#3a4050', fontFamily:"'Geist',sans-serif" }}>{o.d}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <Lbl>Select Teams <span style={{color:'#f0b429'}}>({selTeams.length} selected)</span></Lbl>
                    <div style={{ border:'1px solid #1e2433', borderRadius:14, overflow:'hidden', maxHeight:180, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'#1e2433 transparent' }}>
                      {teams.map(t => (
                        <label key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #1a1f2e', transition:'background 0.1s' }}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(240,180,41,0.03)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <input type="checkbox" checked={selTeams.includes(t.id)} onChange={()=>toggleTeam(t.id)} style={{ accentColor:'#f0b429' }} />
                          {t.logo && <img src={`${BASE}${t.logo}`} style={{ width:22, height:22, borderRadius:6, objectFit:'cover' }} />}
                          <span style={{ fontSize:13, color:'#cbd5e1', fontFamily:"'Geist',sans-serif" }}>{t.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {summary && <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', color:'#34d399', fontSize:13, fontWeight:500, marginBottom:16, fontFamily:"'Geist',sans-serif" }}>📋 {summary}</div>}
                  <Btn type="submit" c="emerald" full disabled={loading || selTeams.length < 2}>{loading ? '⏳  Generating...' : '✓  Create Tournament & Generate Fixtures'}</Btn>
                </form>
              </Card>
            )}

            <div style={{ background:'#161a22', border:'1px solid #1e2433', borderRadius:20, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <THead cols={['#','Trophy','Tournament','Format','Teams','']} />
                <tbody>
                  {tournaments.length === 0
                    ? <tr><td colSpan="6" style={{ padding:'48px', textAlign:'center', color:'#2a3040', fontSize:13 }}>No tournaments yet</td></tr>
                    : tournaments.map((t, i) => {
                      const fMap = { league:{l:'League',c:'#38bdf8'}, knockout:{l:'Knockout',c:'#f87171'}, mixed:{l:'Mixed',c:'#a78bfa'} };
                      const f = fMap[t.type] || fMap.league;
                      return (
                        <TRow key={t.id} cells={[
                          <span style={{ color:'#2a3040', fontSize:11, fontWeight:700 }}>{String(i+1).padStart(2,'0')}</span>,
                          t.trophy_image
                            ? <img src={`${BASE}${t.trophy_image}`} style={{ width:36, height:36, objectFit:'contain', borderRadius:8 }} />
                            : <div style={{ width:36, height:36, borderRadius:8, background:'rgba(240,180,41,0.06)', border:'1px solid rgba(240,180,41,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏆</div>,
                          <span style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', cursor:'pointer' }} onClick={()=>navigate(`/tournament/${t.id}`)}
                            onMouseEnter={e=>e.target.style.color='#f0b429'} onMouseLeave={e=>e.target.style.color='#e2e8f0'}>{t.name}</span>,
                          <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:99, background:f.c+'15', color:f.c, border:`1px solid ${f.c}30`, letterSpacing:'0.5px' }}>{f.l}</span>,
                          <span style={{ fontSize:13, color:'#3a4050' }}>{t.teams_count}</span>,
                          <div style={{ display:'flex', gap:6 }}>
                            <Btn c="amber" sm onClick={()=>openEditTourn(t)}>Edit</Btn>
                            <Btn c="ghost" sm onClick={()=>navigate(`/tournament/${t.id}`)}>Open →</Btn>
                          </div>,
                        ]} />
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ REFEREES ══ */}
        {tab === 'referees' && (
          <div>
            <PageTitle icon="⚖" title="Referees" action={<Btn c="sky" onClick={() => setShowRef(!showRef)}>{showRef ? '✕  Close' : '+  Add Referee'}</Btn>} />
            <Toaster msg={refMsg} />

            {showRef && (
              <Card title="Add Referee" subtitle="An invitation email will be sent automatically">
                <form onSubmit={createReferee} style={{ maxWidth: 420 }}>
                  <div style={{ marginBottom: 14 }}><Lbl>Full Name *</Lbl><Inp placeholder="Ahmed Al-Karimi" required value={refData.name} onChange={e=>setRefData({...refData,name:e.target.value})} /></div>
                  <div style={{ marginBottom: 14 }}><Lbl>Email Address *</Lbl><Inp type="email" placeholder="referee@sports.com" required value={refData.email} onChange={e=>setRefData({...refData,email:e.target.value})} /></div>
                  <div style={{ marginBottom: 20 }}><FileInput label="Photo (optional)" value={refData.photo} onChange={e=>setRefData({...refData,photo:e.target.files[0]})} preview={refData.photo && URL.createObjectURL(refData.photo)} /></div>
                  <Btn type="submit" c="sky" full disabled={loading}>{loading ? '⏳  Sending...' : '✉  Send Invitation'}</Btn>
                </form>
              </Card>
            )}

            <div style={{ background:'#161a22', border:'1px solid #1e2433', borderRadius:20, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <THead cols={['#','Photo','Name','Email','']} />
                <tbody>
                  {referees.length === 0
                    ? <tr><td colSpan="5" style={{ padding:'48px', textAlign:'center', color:'#2a3040', fontSize:13 }}>No referees registered yet</td></tr>
                    : referees.map((r, i) => (
                      <TRow key={r.id} cells={[
                        <span style={{ color:'#2a3040', fontSize:11, fontWeight:700 }}>{String(i+1).padStart(2,'0')}</span>,
                        r.photo
                          ? <img src={`${BASE}${r.photo}`} style={{ width:36, height:36, borderRadius:9, objectFit:'cover', border:'1px solid rgba(56,189,248,0.25)' }} />
                          : <div style={{ width:36, height:36, borderRadius:9, background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚖</div>,
                        <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{r.name}</span>,
                        <span style={{ fontSize:12, color:'#3a4050' }}>{r.email}</span>,
                        <div style={{ display:'flex', gap:6 }}>
                          <Btn c="amber" sm onClick={()=>openEditRef(r)}>Edit</Btn>
                          <Btn c="rose"  sm onClick={()=>deleteReferee(r.id, r.name)}>Delete</Btn>
                        </div>,
                      ]} />
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ══ EDIT TEAM MODAL ══ */}
      {editTeam && (
        <Modal title={`Edit Team — ${editTeam.name}`} subtitle="Update team information" onClose={() => setEditTeam(null)}>
          <form onSubmit={saveEditTeam}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div><Lbl>Team Name *</Lbl><Inp required value={editTeamData.name} onChange={e=>setEditTeamData({...editTeamData,name:e.target.value})} /></div>
              <div><Lbl>Short Name</Lbl><Inp value={editTeamData.short_name} onChange={e=>setEditTeamData({...editTeamData,short_name:e.target.value})} /></div>
              <div><Lbl>Founded Date</Lbl><Inp type="date" value={editTeamData.founded_date} onChange={e=>setEditTeamData({...editTeamData,founded_date:e.target.value})} /></div>
              <div><Lbl>Kit Colors</Lbl><Inp value={editTeamData.colors} onChange={e=>setEditTeamData({...editTeamData,colors:e.target.value})} /></div>
            </div>
            <div style={{ marginBottom:20 }}>
              <Lbl>Current Crest</Lbl>
              {editTeam.logo && <img src={`${BASE}${editTeam.logo}`} style={{ width:48, height:48, borderRadius:12, objectFit:'cover', border:'1px solid #1e2433', marginBottom:10, display:'block' }} />}
              <FileInput label="New Crest (optional)" value={editTeamLogo} onChange={e=>setEditTeamLogo(e.target.files[0])} preview={editTeamLogo && URL.createObjectURL(editTeamLogo)} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <Btn type="button" c="ghost" full onClick={() => setEditTeam(null)}>Cancel</Btn>
              <Btn type="submit" c="gold" full disabled={loading}>{loading ? '⏳ Saving...' : '✓ Save Changes'}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ EDIT TOURNAMENT MODAL ══ */}
      {editTourn && (
        <Modal title={`Edit Tournament — ${editTourn.name}`} subtitle="Update tournament details" onClose={() => setEditTourn(null)}>
          <form onSubmit={saveEditTourn}>
            <div style={{ marginBottom:14 }}><Lbl>Tournament Name *</Lbl><Inp required value={editTData.name} onChange={e=>setEditTData({...editTData,name:e.target.value})} /></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div><Lbl>Start Date</Lbl><Inp type="date" value={editTData.start_date} onChange={e=>setEditTData({...editTData,start_date:e.target.value})} /></div>
              <div><Lbl>End Date</Lbl><Inp type="date" value={editTData.end_date} onChange={e=>setEditTData({...editTData,end_date:e.target.value})} /></div>
            </div>
            <div style={{ marginBottom:20 }}>
              <Lbl>Current Trophy</Lbl>
              {editTourn.trophy_image && <img src={`${BASE}${editTourn.trophy_image}`} style={{ width:56, height:56, objectFit:'contain', borderRadius:10, border:'1px solid rgba(240,180,41,0.2)', marginBottom:10, display:'block' }} />}
              <FileInput label="New Trophy Image (optional)" value={editTTrophy} onChange={e=>setEditTTrophy(e.target.files[0])} preview={editTTrophy && URL.createObjectURL(editTTrophy)} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <Btn type="button" c="ghost" full onClick={() => setEditTourn(null)}>Cancel</Btn>
              <Btn type="submit" c="emerald" full disabled={loading}>{loading ? '⏳ Saving...' : '✓ Save Changes'}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ EDIT REFEREE MODAL ══ */}
      {editRef && (
        <Modal title={`Edit Referee — ${editRef.name}`} subtitle="Update referee information" onClose={() => setEditRef(null)} width={420}>
          <form onSubmit={saveEditRef}>
            <div style={{ marginBottom:14 }}><Lbl>Full Name *</Lbl><Inp required value={editRefData.name} onChange={e=>setEditRefData({...editRefData,name:e.target.value})} /></div>
            <div style={{ marginBottom:14 }}><Lbl>Email *</Lbl><Inp type="email" required value={editRefData.email} onChange={e=>setEditRefData({...editRefData,email:e.target.value})} /></div>
            <div style={{ marginBottom:20 }}>
              {editRef.photo && <><Lbl>Current Photo</Lbl><img src={`${BASE}${editRef.photo}`} style={{ width:48, height:48, borderRadius:12, objectFit:'cover', border:'1px solid rgba(56,189,248,0.25)', marginBottom:10, display:'block' }} /></>}
              <FileInput label="New Photo (optional)" value={editRefPhoto} onChange={e=>setEditRefPhoto(e.target.files[0])} preview={editRefPhoto && URL.createObjectURL(editRefPhoto)} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <Btn type="button" c="ghost" full onClick={() => setEditRef(null)}>Cancel</Btn>
              <Btn type="submit" c="sky" full disabled={loading}>{loading ? '⏳ Saving...' : '✓ Save Changes'}</Btn>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        * { box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.35); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #1e2433; border-radius: 99px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;