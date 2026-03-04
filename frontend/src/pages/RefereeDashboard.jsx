import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

/*
  DESIGN: لوحة الحكم
  ━━━━━━━━━━━━━━━━━━
  Aesthetic: Sports broadcast + dark editorial
  Palette: Deep navy #060d1a | Amber #f59e0b | Teal #14b8a6
  Font: Syne (display) + DM Sans (body)
  Vibe: Broadcast graphics, precision, authority
*/

const BASE = 'http://127.0.0.1:8000';

const STATUS_MAP = {
  finished:         { label: 'منتهية',  color: '#14b8a6', glow: 'rgba(20,184,166,0.15)',  dot: false },
  live:             { label: 'جارية',   color: '#ef4444', glow: 'rgba(239,68,68,0.15)',   dot: true  },
  lineup_submitted: { label: 'جاهزة',   color: '#3b82f6', glow: 'rgba(59,130,246,0.12)', dot: false },
  scheduled:        { label: 'مجدولة',  color: '#64748b', glow: 'rgba(100,116,139,0.08)', dot: false },
};

/* ─── Fonts injector ─── */
const FontLoader = () => {
  useEffect(() => {
    if (document.getElementById('referee-fonts')) return;
    const link = document.createElement('link');
    link.id = 'referee-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&display=swap';
    document.head.appendChild(link);
  }, []);
  return null;
};

/* ─── Status badge ─── */
const Badge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.scheduled;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ color: s.color, background: s.glow, border: `1px solid ${s.color}30` }}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot ? 'animate-pulse' : ''}`}
        style={{ background: s.color }} />
      {s.label}
    </span>
  );
};

/* ─── Match card ─── */
const MatchCard = ({ match, onOpen }) => {
  const s = STATUS_MAP[match.status] || STATUS_MAP.scheduled;
  const goals   = match.events?.filter(e => ['goal','own_goal'].includes(e.event_type)).length || 0;
  const yellows = match.events?.filter(e => e.event_type === 'yellow_card').length || 0;
  const reds    = match.events?.filter(e => e.event_type === 'red_card').length || 0;

  return (
    <div onClick={() => onOpen(match)}
      className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        background: 'linear-gradient(145deg,#0d1829 0%,#0a1422 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}>

      {/* top accent */}
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg,${s.color}cc,transparent 80%)` }} />

      {/* tournament row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[9px] font-bold uppercase tracking-[2px] text-slate-500 truncate max-w-[55%]">
          {match.tournament_name} · {match.round_number || '—'}
        </span>
        <Badge status={match.status} />
      </div>

      {/* teams + score */}
      <div className="px-4 pb-3 mt-1 grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        <p className="text-sm font-black text-white truncate text-right leading-snug"
          style={{ fontFamily: "'Syne',sans-serif" }}>{match.home}</p>

        <div className="text-center px-2">
          {match.status === 'finished' ? (
            <div>
              <p className="text-xl font-black text-white tabular-nums leading-none"
                style={{ fontFamily: "'Syne',sans-serif" }}>
                {match.score_home}<span className="text-slate-600 mx-1 font-light">–</span>{match.score_away}
              </p>
              {match.penalty_home != null && (
                <p className="text-[9px] mt-0.5 font-bold" style={{ color: '#f59e0b' }}>
                  pen. {match.penalty_home}–{match.penalty_away}
                </p>
              )}
            </div>
          ) : (
            <span className="text-base font-black text-slate-700">vs</span>
          )}
        </div>

        <p className="text-sm font-black text-white truncate text-left leading-snug"
          style={{ fontFamily: "'Syne',sans-serif" }}>{match.away}</p>
      </div>

      {/* bottom chips */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        {match.match_date && <span className="text-[9px] text-slate-600">📅 {match.match_date}</span>}
        <div className="flex gap-1 ml-auto">
          {goals > 0 && <span className="text-[9px] font-bold px-1.5 py-[2px] rounded" style={{ color:'#14b8a6', background:'rgba(20,184,166,0.1)' }}>⚽{goals}</span>}
          {yellows > 0 && <span className="text-[9px] font-bold px-1.5 py-[2px] rounded" style={{ color:'#fbbf24', background:'rgba(251,191,36,0.1)' }}>🟨{yellows}</span>}
          {reds > 0 && <span className="text-[9px] font-bold px-1.5 py-[2px] rounded" style={{ color:'#f87171', background:'rgba(248,113,113,0.1)' }}>🟥{reds}</span>}
          {match.referee_report && <span className="text-[9px] font-bold px-1.5 py-[2px] rounded" style={{ color:'#818cf8', background:'rgba(129,140,248,0.1)' }}>📄</span>}
        </div>
      </div>

      {/* hover overlay */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ boxShadow: `inset 0 0 0 1px ${s.color}25` }} />
    </div>
  );
};

/* ─── Report modal ─── */
const MatchModal = ({ match, referee, onClose, onReportUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [reportUrl, setReportUrl] = useState(match?.referee_report || null);
  const fileRef = useRef(null);

  if (!match) return null;

  const events = match.events || [];
  const goals   = events.filter(e => ['goal','own_goal'].includes(e.event_type));
  const yellows = events.filter(e => e.event_type === 'yellow_card');
  const reds    = events.filter(e => e.event_type === 'red_card');

  const EV_ICONS = { goal:'⚽', own_goal:'⚽', yellow_card:'🟨', red_card:'🟥', substitution:'🔄' };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { alert('⚠️ PDF فقط!'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('report', file);
      const res = await api.post(`/matches/${match.id}/upload-report`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReportUrl(res.data.report_url);
      onReportUploaded?.(match.id, res.data.report_url);
    } catch (err) { alert('❌ ' + (err.response?.data?.detail || 'فشل الرفع')); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(2,8,20,0.9)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}>
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          maxHeight: '92vh',
          background: 'linear-gradient(170deg,#0d1829 0%,#080f1c 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 -20px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        {/* header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-amber-500/60 uppercase tracking-[3px] font-bold mb-1">
              {match.tournament_name} · {match.round_number}
            </p>
            <h2 className="text-base font-black text-white leading-tight"
              style={{ fontFamily: "'Syne',sans-serif" }}>
              {match.home} <span className="text-slate-600 font-light mx-1 text-sm">vs</span> {match.away}
            </h2>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {match.status === 'finished' && (
                <span className="text-xl font-black tabular-nums" style={{ color:'#14b8a6', fontFamily:"'Syne',sans-serif" }}>
                  {match.score_home} – {match.score_away}
                </span>
              )}
              {match.penalty_home != null && (
                <span className="text-xs font-bold" style={{ color:'#f59e0b' }}>🎯 {match.penalty_home}–{match.penalty_away}</span>
              )}
              <Badge status={match.status} />
            </div>
          </div>
          <button onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition text-sm"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
            ✕
          </button>
        </div>

        {/* scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4"
          style={{ scrollbarWidth:'thin', scrollbarColor:'#1e293b transparent' }}>

          {/* stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: goals.length,   icon:'⚽', label:'أهداف',  c:'#14b8a6' },
              { v: yellows.length, icon:'🟨', label:'صفراء',  c:'#fbbf24' },
              { v: reds.length,    icon:'🟥', label:'حمراء',  c:'#f87171' },
              { v: events.length,  icon:'⚡', label:'أحداث',  c:'#818cf8' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl p-3 text-center"
                style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-base mb-0.5">{s.icon}</p>
                <p className="text-xl font-black leading-none" style={{ color: s.c, fontFamily:"'Syne',sans-serif" }}>{s.v}</p>
                <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* events timeline */}
          {events.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-slate-500 mb-2">أحداث المباراة</p>
              <div className="space-y-1 max-h-40 overflow-y-auto"
                style={{ scrollbarWidth:'thin', scrollbarColor:'#1e293b transparent' }}>
                {events.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs"
                    style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-slate-600 font-mono w-6 shrink-0 tabular-nums">{ev.minute}'</span>
                    <span className="shrink-0">{EV_ICONS[ev.event_type] || '•'}</span>
                    <span className="font-bold text-slate-200 flex-1 truncate">{ev.player_name}</span>
                    <span className="text-slate-600 truncate max-w-[80px]">{ev.team_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PDF section */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[2px] text-slate-500 mb-2">تقرير المباراة — PDF</p>
            <div className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)' }}>
              {reportUrl ? (
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background:'rgba(129,140,248,0.1)', border:'1px solid rgba(129,140,248,0.2)' }}>
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">تقرير مرفوع</p>
                    <p className="text-[10px] text-slate-600">PDF · مباراة #{match.id}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a href={`${BASE}${reportUrl}`} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition"
                      style={{ background:'rgba(129,140,248,0.12)', color:'#818cf8', border:'1px solid rgba(129,140,248,0.2)' }}>
                      عرض
                    </a>
                    <button onClick={() => fileRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition"
                      style={{ background:'rgba(255,255,255,0.04)', color:'#64748b', border:'1px solid rgba(255,255,255,0.06)' }}>
                      تحديث
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full p-6 flex flex-col items-center gap-2 group/up transition-all"
                  style={{ cursor: uploading ? 'wait' : 'pointer' }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover/up:scale-110"
                    style={{ background:'rgba(245,158,11,0.08)', border:'1px dashed rgba(245,158,11,0.25)' }}>
                    {uploading ? '⏳' : '📤'}
                  </div>
                  <p className="text-sm font-bold text-slate-300">{uploading ? 'جاري الرفع...' : 'رفع تقرير PDF'}</p>
                  <p className="text-[10px] text-slate-600">اضغط لاختيار ملف من جهازك</p>
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

/* ════════════════════════════════
   MAIN
════════════════════════════════ */
const RefereeDashboard = () => {
  const { user, logout } = useAuthStore();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try { const r = await api.get('/me/referee-matches'); setData(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleReportUploaded = (matchId, url) => {
    setData(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === matchId ? { ...m, referee_report: url } : m),
    }));
    setSelected(prev => prev?.id === matchId ? { ...prev, referee_report: url } : prev);
  };

  /* ── loading ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#060d1a', fontFamily:"'DM Sans',sans-serif" }}>
      <FontLoader />
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full" style={{ border:'2px solid rgba(245,158,11,0.1)' }} />
          <div className="absolute inset-0 rounded-full animate-spin" style={{ border:'2px solid transparent', borderTopColor:'#f59e0b', borderRightColor:'rgba(245,158,11,0.3)' }} />
        </div>
        <p className="text-slate-600 text-sm tracking-wide">جاري التحميل...</p>
      </div>
    </div>
  );

  const referee    = data?.referee;
  const allMatches = data?.matches || [];
  const finished   = allMatches.filter(m => m.status === 'finished').length;
  const scheduled  = allMatches.filter(m => m.status === 'scheduled').length;
  const reports    = allMatches.filter(m => m.referee_report).length;
  const totalGoals = allMatches.reduce((s,m) => s + (m.events?.filter(e=>['goal','own_goal'].includes(e.event_type)).length||0), 0);

  const filtered = allMatches.filter(m => {
    const fs = filter === 'all' || m.status === filter;
    const fq = !search || [m.home,m.away,m.tournament_name].some(x => x?.toLowerCase().includes(search.toLowerCase()));
    return fs && fq;
  });

  return (
    <div className="min-h-screen" dir="rtl"
      style={{ background:'#060d1a', fontFamily:"'DM Sans',sans-serif", color:'#e2e8f0' }}>
      <FontLoader />

      {/* bg radial glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background:'radial-gradient(ellipse 80% 40% at 50% -10%,rgba(245,158,11,0.05),transparent)',
      }} />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40"
        style={{ background:'rgba(6,13,26,0.88)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center gap-4">

          {/* avatar */}
          <div className="relative shrink-0">
            {referee?.photo
              ? <img src={`${BASE}${referee.photo}`} alt="" className="w-10 h-10 rounded-xl object-cover" style={{ border:'1.5px solid rgba(245,158,11,0.4)', boxShadow:'0 0 12px rgba(245,158,11,0.15)' }} />
              : <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.18)', fontSize:18 }}>⚖️</div>
            }
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background:'#14b8a6', border:'2px solid #060d1a' }} />
          </div>

          {/* name */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white leading-tight truncate" style={{ fontFamily:"'Syne',sans-serif" }}>
              {referee?.name || user?.email}
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-[2.5px]" style={{ color:'rgba(245,158,11,0.55)' }}>
              حكم المباريات
            </p>
          </div>

          {/* search */}
          <div className="relative hidden md:block">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
              className="w-44 py-1.5 px-3 rounded-xl text-xs outline-none transition"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'#cbd5e1' }}
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-600">🔍</span>
          </div>

          {/* logout */}
          <button onClick={logout}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl transition"
            style={{ color:'#64748b', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={e => { e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(248,113,113,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.color='#64748b'; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; }}>
            خروج →
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8 relative">

        {/* ── STATS STRIP ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label:'المباريات',  value: allMatches.length, icon:'📋', color:'#3b82f6' },
            { label:'منتهية',     value: finished,          icon:'✅', color:'#14b8a6' },
            { label:'أهداف',      value: totalGoals,        icon:'⚽', color:'#f59e0b' },
            { label:'تقارير',     value: reports,           icon:'📄', color:'#818cf8' },
          ].map((s,i) => (
            <div key={i} className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-2xl leading-none">{s.icon}</span>
              <div>
                <p className="text-2xl font-black leading-none" style={{ color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── FILTER + SEARCH (mobile) ── */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex rounded-xl p-1 gap-0.5" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
            {[
              { key:'all',       label:'الكل' },
              { key:'finished',  label:'منتهية' },
              { key:'scheduled', label:'مجدولة' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={filter === f.key
                  ? { background:'#f59e0b', color:'#0a0a0a' }
                  : { color:'#475569', background:'transparent' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* mobile search */}
          <div className="relative md:hidden flex-1">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
              className="w-full py-2 px-3 pr-7 rounded-xl text-xs outline-none"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'#cbd5e1' }} />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-600">🔍</span>
          </div>

          <p className="text-xs text-slate-600 mr-auto">{filtered.length} مباراة</p>
        </div>

        {/* ── GRID ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <div className="text-6xl opacity-[0.08]">⚖️</div>
            <p className="font-black text-slate-600 text-lg" style={{ fontFamily:"'Syne',sans-serif" }}>لا توجد مباريات</p>
            <p className="text-slate-700 text-sm">لم يتم تعيينك حكماً لأي مباراة بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(m => <MatchCard key={m.id} match={m} onOpen={setSelected} />)}
          </div>
        )}
      </div>

      {/* modal */}
      {selected && (
        <MatchModal match={selected} referee={referee}
          onClose={() => setSelected(null)}
          onReportUploaded={handleReportUploaded} />
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