import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

const BASE = 'http://127.0.0.1:8000';

const STATUS = {
  finished:         { label: 'Finished',  color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)' },
  live:             { label: 'Live',       color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.4)', pulse: true },
  lineup_submitted: { label: 'Ready',      color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)' },
  scheduled:        { label: 'Upcoming',   color: '#94a3b8', bg: 'rgba(148,163,184,0.06)',border: 'rgba(148,163,184,0.2)' },
};

const EV = {
  goal:         { icon: '⚽', color: '#34d399' },
  own_goal:     { icon: '⚽', color: '#f87171' },
  yellow_card:  { icon: '🟨', color: '#fbbf24' },
  red_card:     { icon: '🟥', color: '#f87171' },
  substitution: { icon: '🔄', color: '#a78bfa' },
};

/* ── fonts ── */
const injectFonts = () => {
  if (document.getElementById('ref2-fonts')) return;
  const l = document.createElement('link');
  l.id = 'ref2-fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Barlow:wght@400;500;600;700&display=swap';
  document.head.appendChild(l);
};

/* ── status pill ── */
const Pill = ({ status }) => {
  const s = STATUS[status] || STATUS.scheduled;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.pulse ? 'animate-pulse' : ''}`} style={{ background: s.color }} />
      {s.label}
    </span>
  );
};

/* ── stat box ── */
const Stat = ({ value, label, color }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-3xl font-black leading-none tabular-nums"
      style={{ fontFamily: "'Barlow Condensed',sans-serif", color }}>{value}</span>
    <span className="text-[9px] font-bold uppercase tracking-[2px] text-slate-500">{label}</span>
  </div>
);

/* ══════════════════════════════════════════
   MATCH CARD
══════════════════════════════════════════ */
const MatchCard = ({ match, onOpen }) => {
  const s     = STATUS[match.status] || STATUS.scheduled;
  const done  = match.status === 'finished';
  const goals = match.events?.filter(e => ['goal','own_goal'].includes(e.event_type)).length || 0;

  return (
    <div onClick={() => onOpen(match)}
      className="group relative rounded-2xl cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
      style={{ background: '#0c1221', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>

      {/* colored left bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl" style={{ background: s.color }} />

      <div className="pl-5 pr-4 pt-3.5 pb-3">
        {/* top row */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-slate-600 truncate max-w-[55%]">
            {match.tournament_name} · {match.round_number || '—'}
          </span>
          <Pill status={match.status} />
        </div>

        {/* teams */}
        <div className="grid items-center gap-2 mb-2.5" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
          <p className="text-sm font-bold text-slate-200 truncate text-right leading-snug"
            style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15 }}>{match.home}</p>

          <div className="text-center px-2 shrink-0">
            {done ? (
              <div className="leading-none">
                <p className="text-2xl font-black text-white tabular-nums"
                  style={{ fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>
                  {match.score_home}<span className="text-slate-600 mx-0.5">–</span>{match.score_away}
                </p>
                {match.penalty_home != null && (
                  <p className="text-[9px] font-bold" style={{ color: '#e8c848' }}>
                    pen {match.penalty_home}–{match.penalty_away}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-base font-black text-slate-700"
                style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>VS</span>
            )}
          </div>

          <p className="text-sm font-bold text-slate-200 truncate text-left leading-snug"
            style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15 }}>{match.away}</p>
        </div>

        {/* chips row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {match.match_date && <span className="text-[9px] text-slate-700">{match.match_date}</span>}
          <div className="flex gap-1 ml-auto items-center">
            {goals > 0 && <span className="text-[9px] font-bold px-1.5 py-[2px] rounded" style={{ color:'#34d399', background:'rgba(52,211,153,0.09)' }}>⚽ {goals}</span>}
            {match.referee_report && <span className="text-[9px] font-bold px-1.5 py-[2px] rounded" style={{ color:'#a78bfa', background:'rgba(167,139,250,0.09)' }}>📄 Report</span>}
          </div>
        </div>
      </div>

      {/* hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ boxShadow: `inset 0 0 0 1px ${s.color}22` }} />
    </div>
  );
};

/* ══════════════════════════════════════════
   MODAL
══════════════════════════════════════════ */
const MatchModal = ({ match, onClose, onReportUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [reportUrl, setReportUrl] = useState(match?.referee_report || null);
  const fileRef = useRef(null);
  if (!match) return null;

  const events  = match.events || [];
  const goals   = events.filter(e => ['goal','own_goal'].includes(e.event_type));
  const yellows = events.filter(e => e.event_type === 'yellow_card');
  const reds    = events.filter(e => e.event_type === 'red_card');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { alert('PDF files only!'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('report', file);
      const res = await api.post(`/matches/${match.id}/upload-report`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReportUrl(res.data.report_url);
      onReportUploaded?.(match.id, res.data.report_url);
    } catch (err) { alert('Upload failed: ' + (err.response?.data?.detail || '')); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(2,6,18,0.93)', backdropFilter: 'blur(18px)' }}
      onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh', background: '#0c1221', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 -24px 80px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}>

        {/* mobile handle */}
        <div className="flex justify-center pt-3 shrink-0 sm:hidden">
          <div className="w-9 h-1 rounded-full bg-white/10" />
        </div>

        {/* header */}
        <div className="px-5 pt-4 pb-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start gap-3 justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[2.5px] mb-1" style={{ color: '#e8c848', opacity: 0.65 }}>
                {match.tournament_name} · {match.round_number}
              </p>
              <h2 className="text-lg font-black text-white leading-tight"
                style={{ fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 0.5 }}>
                {match.home} <span className="text-slate-600 font-normal">vs</span> {match.away}
              </h2>
              <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                {match.status === 'finished' && (
                  <span className="text-2xl font-black tabular-nums leading-none"
                    style={{ fontFamily: "'Barlow Condensed',sans-serif", color: '#34d399', letterSpacing: 1 }}>
                    {match.score_home} – {match.score_away}
                  </span>
                )}
                {match.penalty_home != null && (
                  <span className="text-xs font-bold" style={{ color: '#e8c848' }}>
                    ({match.penalty_home}–{match.penalty_away} pen)
                  </span>
                )}
                <Pill status={match.status} />
              </div>
            </div>
            <button onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              ✕
            </button>
          </div>
        </div>

        {/* body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>

          {/* stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: goals.length,   icon: '⚽', label: 'Goals',   c: '#34d399' },
              { v: yellows.length, icon: '🟨', label: 'Yellow',  c: '#fbbf24' },
              { v: reds.length,    icon: '🟥', label: 'Red',     c: '#f87171' },
              { v: events.length,  icon: '⚡', label: 'Events',  c: '#a78bfa' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl py-3 flex flex-col items-center gap-0.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-base">{s.icon}</span>
                <span className="text-xl font-black leading-none" style={{ fontFamily:"'Barlow Condensed',sans-serif", color: s.c }}>{s.v}</span>
                <span className="text-[9px] text-slate-600 uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>

          {/* events */}
          {events.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[2.5px] text-slate-600 mb-2">Match Events</p>
              <div className="space-y-1 max-h-44 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>
                {events.map((ev, i) => {
                  const e = EV[ev.event_type] || { icon: '•', color: '#94a3b8' };
                  return (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span className="text-slate-600 font-mono w-6 tabular-nums shrink-0">{ev.minute}'</span>
                      <span className="shrink-0 text-sm">{e.icon}</span>
                      <span className="flex-1 font-semibold text-slate-300 truncate">{ev.player_name}</span>
                      <span className="text-slate-600 truncate max-w-[80px]">{ev.team_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* report upload */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[2.5px] text-slate-600 mb-2">Match Report</p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              {reportUrl ? (
                <div className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">Report Uploaded</p>
                    <p className="text-[10px] text-slate-600">Match #{match.id}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <a href={`${BASE}${reportUrl}`} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                      style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                      View
                    </a>
                    <button onClick={() => fileRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}>
                      Update
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full p-5 flex flex-col items-center gap-2 transition-all group/up"
                  style={{ cursor: uploading ? 'wait' : 'pointer' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-transform group-hover/up:scale-110"
                    style={{ background: 'rgba(232,200,72,0.06)', border: '1.5px dashed rgba(232,200,72,0.2)' }}>
                    {uploading ? '⏳' : '📤'}
                  </div>
                  <p className="text-sm font-semibold text-slate-400">{uploading ? 'Uploading...' : 'Upload PDF Report'}</p>
                  <p className="text-[10px] text-slate-600">Click to select a PDF file</p>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
const RefereeDashboard = () => {
  const { user, logout } = useAuthStore();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');

  useEffect(() => { injectFonts(); fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try { const r = await api.get('/me/referee-matches'); setData(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleReportUploaded = (matchId, url) => {
    setData(prev => ({ ...prev, matches: prev.matches.map(m => m.id === matchId ? { ...m, referee_report: url } : m) }));
    setSelected(prev => prev?.id === matchId ? { ...prev, referee_report: url } : prev);
  };

  /* loading */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#070d1a', fontFamily: "'Barlow',sans-serif" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full animate-spin"
            style={{ border: '2px solid transparent', borderTopColor: '#e8c848', borderRightColor: 'rgba(232,200,72,0.2)' }} />
          <div className="absolute inset-[5px] rounded-full flex items-center justify-center text-lg"
            style={{ background: 'rgba(232,200,72,0.05)' }}>⚖️</div>
        </div>
        <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );

  const referee    = data?.referee;
  const allMatches = data?.matches || [];
  const finished   = allMatches.filter(m => m.status === 'finished').length;
  const reports    = allMatches.filter(m => m.referee_report).length;
  const totalGoals = allMatches.reduce((s, m) => s + (m.events?.filter(e => ['goal','own_goal'].includes(e.event_type)).length || 0), 0);
  const totalYellow = allMatches.reduce((s, m) => s + (m.events?.filter(e => e.event_type === 'yellow_card').length || 0), 0);

  const filtered = allMatches.filter(m => {
    const fs = filter === 'all' || m.status === filter;
    const fq = !search || [m.home, m.away, m.tournament_name].some(x => x?.toLowerCase().includes(search.toLowerCase()));
    return fs && fq;
  });

  return (
    <div className="min-h-screen" dir="ltr" style={{ background: '#070d1a', fontFamily: "'Barlow',sans-serif", color: '#e2e8f0' }}>

      {/* subtle grain bg */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.4]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.05\'/%3E%3C/svg%3E")', backgroundSize: '150px' }} />

      {/* top glow */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 30% at 50% -5%, rgba(232,200,72,0.05), transparent)' }} />

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-40"
        style={{ background: 'rgba(7,13,26,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
            style={{ background: 'linear-gradient(135deg,#e8c848,#c9a227)', color: '#000' }}>⚖</div>
          <span className="text-xs font-bold uppercase tracking-[3px] text-slate-600 hidden sm:block">Referee Panel</span>
          <div className="flex-1" />
          <div className="relative hidden md:block">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-44 py-1.5 px-3 text-xs rounded-xl outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#cbd5e1' }} />
          </div>
          <button onClick={logout}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl transition"
            style={{ color: '#64748b', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}>
            Logout →
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-8 relative">

        {/* ══ HERO IDENTITY CARD ══ */}
        <div className="relative rounded-3xl overflow-hidden mb-8 p-6 md:p-8"
          style={{
            background: 'linear-gradient(135deg, #0d1525 0%, #111827 60%, #0a101e 100%)',
            border: '1px solid rgba(232,200,72,0.12)',
            boxShadow: '0 0 80px rgba(232,200,72,0.04), 0 16px 48px rgba(0,0,0,0.5)',
          }}>

          {/* gold top line */}
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent 0%, #e8c848 50%, transparent 100%)' }} />

          {/* watermark */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none select-none hidden lg:block"
            style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 100, fontWeight: 900, color: 'rgba(232,200,72,0.03)', lineHeight: 1, letterSpacing: 4 }}>
            REFEREE
          </div>

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">

            {/* ── PHOTO ── */}
            <div className="relative shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden"
                style={{
                  border: '2px solid rgba(232,200,72,0.35)',
                  boxShadow: '0 0 0 4px rgba(232,200,72,0.06), 0 8px 32px rgba(0,0,0,0.5)',
                }}>
                {referee?.photo
                  ? <img src={`${BASE}${referee.photo}`} alt={referee?.name || 'Referee'}
                      className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,#1a2540,#0d1525)' }}>
                      <span style={{ fontSize: 44 }}>⚖️</span>
                    </div>
                }
              </div>
              {/* gold badge */}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg"
                style={{ background: 'linear-gradient(135deg,#e8c848,#c9a227)', color: '#0a0a0a', border: '2px solid #070d1a', boxShadow: '0 2px 12px rgba(232,200,72,0.4)' }}>
                ⚖
              </div>
            </div>

            {/* ── INFO ── */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <p className="text-[9px] font-bold uppercase tracking-[4px] mb-1.5" style={{ color: 'rgba(232,200,72,0.55)' }}>
                Official Referee
              </p>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-none mb-1 truncate"
                style={{ fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 0.5 }}>
                {referee?.name || user?.email}
              </h1>
              <p className="text-sm text-slate-600 mb-5 truncate">{referee?.email}</p>

              {/* stats */}
              <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
                <Stat value={allMatches.length} label="Matches"  color="#60a5fa" />
                <Stat value={finished}          label="Finished" color="#34d399" />
                <Stat value={totalGoals}        label="Goals"    color="#e8c848" />
                <Stat value={totalYellow}       label="Yellow"   color="#fbbf24" />
                <Stat value={reports}           label="Reports"  color="#a78bfa" />
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex rounded-xl p-1 gap-0.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { key: 'all',       label: 'All' },
              { key: 'finished',  label: 'Finished' },
              { key: 'scheduled', label: 'Upcoming' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={filter === f.key ? { background: '#e8c848', color: '#0a0a0a' } : { color: '#475569' }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative md:hidden flex-1">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full py-2 px-3 text-xs rounded-xl outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#cbd5e1' }} />
          </div>
          <span className="text-xs text-slate-700 font-medium ml-auto">
            {filtered.length} matches
          </span>
        </div>

        {/* ── GRID ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="font-black text-slate-700 select-none"
              style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 64, lineHeight: 1, letterSpacing: 2 }}>
              NO MATCHES
            </p>
            <p className="text-slate-600 text-sm">No matches assigned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filtered.map(m => <MatchCard key={m.id} match={m} onOpen={setSelected} />)}
          </div>
        )}
      </div>

      {selected && (
        <MatchModal match={selected} onClose={() => setSelected(null)} onReportUploaded={handleReportUploaded} />
      )}

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:99px}
        ::-webkit-scrollbar-track{background:transparent}
      `}</style>
    </div>
  );
};

export default RefereeDashboard;