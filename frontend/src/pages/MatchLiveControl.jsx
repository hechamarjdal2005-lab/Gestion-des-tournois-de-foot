import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const groupByLine = (players) => {
  const g = { GK: [], DEF: [], MID: [], FWD: [] };
  players.forEach(p => {
    const pos = (p.position || '').toLowerCase();
    if (pos.includes('goal') || pos === 'gk') g.GK.push(p);
    else if (pos.includes('defend') || pos.includes('back') || ['cb','lb','rb','rwb','lwb'].includes(pos)) g.DEF.push(p);
    else if (pos.includes('mid') || ['cm','dm','am','cdm','cam'].includes(pos)) g.MID.push(p);
    else g.FWD.push(p);
  });
  return ['GK','DEF','MID','FWD'].filter(k => g[k].length > 0).map(k => g[k]);
};

const countGoals = (events, homeId, awayId) => {
  let h = 0, a = 0;
  events.forEach(e => {
    if (e.type === 'goal') { if (e.team_id === homeId) h++; else if (e.team_id === awayId) a++; }
    else if (e.type === 'own_goal') { if (e.team_id === homeId) a++; else if (e.team_id === awayId) h++; }
  });
  return { h, a };
};

const countAssists = (events) => events.filter(e => e.type === 'assist').length;
const getYellowCount = (events, playerId) =>
  events.filter(e => e.player_id === playerId && e.type === 'yellow_card').length;

const EVENT_META = {
  goal:        { icon: '⚽', label: 'Goal',       color: '#22c55e' },
  assist:      { icon: '🎯', label: 'Assist',      color: '#3b82f6' },
  own_goal:    { icon: '💀', label: 'Own Goal',    color: '#f97316' },
  yellow_card: { icon: '🟨', label: 'Yellow Card', color: '#facc15' },
  red_card:    { icon: '🟥', label: 'Red Card',    color: '#ef4444' },
};

/* ── Minute Modal ── */
const MinuteModal = ({ tool, player, matchMinute, onConfirm, onCancel }) => {
  const [min, setMin] = useState(matchMinute);
  const meta = EVENT_META[tool?.type] || {};
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}>
      <div className="rounded-2xl overflow-hidden shadow-2xl w-full max-w-xs border"
        style={{ background: '#0d1824', borderColor: (meta.color||'#fff') + '35' }}>
        <div className="px-6 py-4 flex items-center gap-3 border-b" style={{ borderColor: (meta.color||'#fff') + '20' }}>
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <div className="text-white font-black text-base" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{meta.label}</div>
            <div className="text-xs mt-0.5 font-bold" style={{ color: meta.color }}>#{player?.number} {player?.name}</div>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Match Minute</p>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setMin(m => Math.max(1, m-1))}
              className="w-10 h-10 rounded-xl font-black text-xl text-white flex items-center justify-center hover:opacity-80 transition"
              style={{ background: (meta.color||'#fff') + '28' }}>−</button>
            <input type="number" min={1} max={120} value={min}
              onChange={e => setMin(Math.max(1, parseInt(e.target.value)||1))}
              className="flex-1 text-center text-4xl font-black bg-transparent border-b-2 focus:outline-none py-1"
              style={{ color: meta.color, borderColor: (meta.color||'#fff') + '50', fontFamily: 'monospace' }} />
            <button onClick={() => setMin(m => Math.min(120, m+1))}
              className="w-10 h-10 rounded-xl font-black text-xl text-white flex items-center justify-center hover:opacity-80 transition"
              style={{ background: (meta.color||'#fff') + '28' }}>+</button>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-400 border border-gray-700 hover:bg-gray-800 transition">Cancel</button>
            <button onClick={() => onConfirm(min)}
              className="flex-1 py-2.5 rounded-xl text-sm font-black text-black transition hover:opacity-90"
              style={{ background: meta.color }}>Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Player Token ── */
const PlayerToken = ({ player, teamId, onDrop, tool, side, events }) => {
  const accent = side === 'blue' ? '#60a5fa' : '#f87171';
  const yellows = getYellowCount(events, player.id);
  const hasRed  = events.some(e => e.player_id === player.id && e.type === 'red_card');
  const imgSrc  = player.photo
    ? `http://127.0.0.1:8000${player.photo}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=112211&color=fff&size=120&bold=true`;

  return (
    <div className="flex flex-col items-center gap-1 group select-none"
      style={{ width: 70, cursor: tool ? 'pointer' : 'default' }}
      onClick={() => tool && onDrop(player, teamId)}>
      <div className="relative">
        <div className="rounded-full overflow-hidden border-2 transition-all duration-200 group-hover:scale-110"
          style={{
            width: 54, height: 54,
            borderColor: hasRed ? '#ef4444' : yellows >= 1 ? '#facc15' : accent,
            boxShadow: tool ? `0 0 16px ${accent}70` : `0 2px 8px rgba(0,0,0,0.5)`,
          }}>
          <img src={imgSrc} alt={player.name} className="w-full h-full object-cover" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border border-gray-900 shadow"
          style={{ background: accent, color: '#000' }}>{player.number || '?'}</div>
        {yellows > 0 && !hasRed && (
          <div className="absolute -top-1 -left-1 flex gap-0.5">
            {Array.from({length: yellows}).map((_,i) => (
              <div key={i} className="w-2 h-3 rounded-sm" style={{ background: '#facc15' }} />
            ))}
          </div>
        )}
        {hasRed && <div className="absolute -top-1 -left-1 w-2 h-3 rounded-sm" style={{ background: '#ef4444' }} />}
        {tool && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <span className="text-lg">{EVENT_META[tool.type]?.icon}</span>
          </div>
        )}
      </div>
      <div className="text-[9px] font-bold text-white text-center truncate w-full leading-tight"
        style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
        {player.name?.split(' ').slice(-1)[0]}
      </div>
    </div>
  );
};

/* ── Pitch Half ── */
const PitchHalf = ({ lineup, teamName, teamId, onDrop, tool, side, flip, events }) => {
  const rows = groupByLine(lineup);
  const ordered = flip ? [...rows].reverse() : rows;
  return (
    <div className="relative flex-1 flex flex-col overflow-hidden"
      style={{
        background: flip
          ? 'linear-gradient(180deg,#195e30 0%,#1d7038 100%)'
          : 'linear-gradient(180deg,#1d7038 0%,#195e30 100%)',
        borderRight: side === 'blue' ? '1px solid rgba(255,255,255,0.07)' : 'none',
      }}>
      {/* pitch lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{opacity:0.12}}>
        <rect x="8" y="6" width="calc(100% - 16px)" height="calc(100% - 12px)" rx="2" fill="none" stroke="white" strokeWidth="1.2"/>
        {!flip
          ? <><rect x="calc(50% - 80px)" y="calc(100% - 72px)" width="160" height="66" fill="none" stroke="white" strokeWidth="1"/>
               <rect x="calc(50% - 36px)" y="calc(100% - 36px)" width="72" height="30" fill="none" stroke="white" strokeWidth="1"/>
               <circle cx="50%" cy="calc(100% - 90px)" r="4" fill="white"/></>
          : <><rect x="calc(50% - 80px)" y="6" width="160" height="66" fill="none" stroke="white" strokeWidth="1"/>
               <rect x="calc(50% - 36px)" y="6" width="72" height="30" fill="none" stroke="white" strokeWidth="1"/>
               <circle cx="50%" cy="90" r="4" fill="white"/></>
        }
      </svg>
      <div className={`absolute ${flip?'bottom-2':'top-2'} left-0 right-0 flex justify-center z-10 pointer-events-none`}>
        <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-sm"
          style={{
            color: side==='blue'?'#93c5fd':'#fca5a5',
            borderColor: side==='blue'?'rgba(96,165,250,0.3)':'rgba(248,113,113,0.3)',
            background: 'rgba(0,0,0,0.65)',
          }}>{teamName}</span>
      </div>
      <div className={`relative z-10 flex flex-col ${flip?'justify-end':'justify-start'} h-full py-8 px-2`}>
        {ordered.map((row,ri) => (
          <div key={ri} className="flex-1 flex items-center justify-around px-3">
            {row.map(player => (
              <PlayerToken key={player.id} player={player} teamId={teamId}
                onDrop={onDrop} tool={tool} side={side} events={events} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Event Row ── */
const EventRow = ({ ev, onDelete }) => {
  const meta = EVENT_META[ev.type] || { icon:'•', label:ev.type, color:'#6b7280' };
  return (
    <div className="group flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all"
      style={{ borderLeft: `3px solid ${meta.color}35` }}>
      <span className="text-[10px] font-mono font-black shrink-0" style={{ color:meta.color, minWidth:26 }}>{ev.minute}'</span>
      <span className="text-sm shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-white truncate">#{ev.number} {ev.player}</div>
        <div className="text-[9px] uppercase tracking-wider font-bold" style={{ color:meta.color }}>{meta.label}</div>
      </div>
      <button onClick={() => onDelete(ev.id)}
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all hover:bg-red-900/40 text-gray-600 hover:text-red-400">
        ✕
      </button>
    </div>
  );
};

/* ── Tool Button ── */
const ToolBtn = ({ tool, active, disabled, onClick }) => {
  const meta = EVENT_META[tool.type] || {};
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex flex-col items-center gap-1 w-full transition-all duration-150 relative group"
      title={disabled ? tool.disabledReason : meta.label}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg border transition-all duration-150"
        style={{
          background: active ? meta.color+'28' : 'rgba(255,255,255,0.04)',
          borderColor: active ? meta.color : 'rgba(255,255,255,0.08)',
          boxShadow: active ? `0 0 14px ${meta.color}45` : 'none',
          transform: active ? 'scale(1.1)' : 'scale(1)',
          opacity: disabled ? 0.3 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}>
        {meta.icon}
      </div>
      <span className="text-[8px] font-bold uppercase tracking-wider leading-tight text-center"
        style={{ color: active ? meta.color : '#374151' }}>
        {meta.label?.split(' ')[0]}
      </span>
      {active && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping" style={{ background:meta.color }} />}
    </button>
  );
};

/* ══ MAIN ══ */
const MatchLiveControl = () => {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const { id }    = useParams();

  useEffect(() => {
    if (!user || !['super_admin','referee'].includes(user.role)) navigate('/unauthorized');
  }, [user]);
  if (!user || !['super_admin','referee'].includes(user.role)) return null;

  const [matchData, setMatchData]     = useState(null);
  const [homeLineup, setHomeLineup]   = useState([]);
  const [awayLineup, setAwayLineup]   = useState([]);
  const [score, setScore]             = useState({ home:0, away:0 });
  const [events, setEvents]           = useState([]);
  const [matchMinute, setMatchMinute] = useState(1);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    fetchMatchData();
    const t = setInterval(() => setMatchMinute(m => m+1), 60000);
    return () => clearInterval(t);
  }, [id]);

  const fetchMatchData = async () => {
    try {
      const res = await api.get(`/matches/${id}/lineups`);
      if (res.data?.match) {
        setMatchData(res.data.match);
        setScore({ home: res.data.match.score_home||0, away: res.data.match.score_away||0 });
        const sort = arr => [...arr].sort((a,b)=>{
          if(a.position==='Goalkeeper') return -1;
          if(b.position==='Goalkeeper') return 1;
          return (a.number||0)-(b.number||0);
        });
        setHomeLineup(sort(res.data.home_lineup||[]));
        setAwayLineup(sort(res.data.away_lineup||[]));
        setEvents((res.data.events||[]).map(e=>({
          id:e.id, minute:e.minute, type:e.type,
          player:e.player, player_id:e.player_id,
          team_id:e.team_id, number:e.number??'?',
        })));
      }
    } catch(err) {
      setError(`Load failed: ${err.response?.data?.detail||err.message}`);
    } finally { setLoading(false); }
  };

  const goalsFromEvents = matchData
    ? countGoals(events, matchData.home_team_id, matchData.away_team_id)
    : { h:0, a:0 };
  const totalGoals   = goalsFromEvents.h + goalsFromEvents.a;
  const totalAssists = countAssists(events);

  const tools = [
    { type:'goal',        label:'Goal' },
    { type:'assist',      label:'Assist', disabled: totalAssists >= totalGoals,
      disabledReason:`Assists (${totalAssists}) can't exceed goals (${totalGoals})` },
    { type:'own_goal',    label:'Own Goal' },
    { type:'yellow_card', label:'Yellow Card' },
    { type:'red_card',    label:'Red Card' },
  ];

  const handlePlayerClick = useCallback((player, teamId) => {
    if (!selectedTool) return;
    if (selectedTool.type === 'goal' || selectedTool.type === 'own_goal') {
      const isHome = teamId === matchData.home_team_id;
      let cur, max;
      if (selectedTool.type === 'goal') { cur = isHome ? goalsFromEvents.h : goalsFromEvents.a; max = isHome ? score.home : score.away; }
      else { cur = isHome ? goalsFromEvents.a : goalsFromEvents.h; max = isHome ? score.away : score.home; }
      if (cur >= max) { alert(`⚠️ Goal limit reached (${max}). Update the score from Tournament page first.`); return; }
    }
    if (selectedTool.type === 'assist' && totalAssists >= totalGoals) {
      alert(`⚠️ Assists (${totalAssists}) can't exceed goals (${totalGoals})!`); return;
    }
    if (selectedTool.type === 'yellow_card' && getYellowCount(events, player.id) >= 2) {
      alert(`⚠️ ${player.name} already has 2 yellow cards. Use Red Card.`); return;
    }
    setPendingAction({ player, teamId });
  }, [selectedTool, matchData, goalsFromEvents, score, events, totalAssists, totalGoals]);

  const handleConfirm = async (minute) => {
    const { player, teamId } = pendingAction;
    let eventType = selectedTool.type;
    if (eventType === 'yellow_card' && getYellowCount(events, player.id) === 1) {
      eventType = 'red_card';
      alert(`🟥 2nd Yellow → Automatic RED CARD for ${player.name}!`);
    }
    setPendingAction(null);
    try {
      const fd = new FormData();
      fd.append('team_id', Number(teamId));
      fd.append('player_id', Number(player.id));
      fd.append('event_type', eventType);
      fd.append('minute', minute);
      await api.post(`/matches/${id}/record-event`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      setEvents(prev => [{
        id:`local_${Date.now()}`, minute, type:eventType,
        player:player.name, player_id:player.id, team_id:teamId, number:player.number,
      }, ...prev].sort((a,b)=>b.minute-a.minute));
      setSelectedTool(null);
    } catch(err) { alert(`❌ ${err.response?.data?.detail||'Failed to record event'}`); }
  };

  const handleDeleteEvent = async (evId) => {
    if (!window.confirm('Delete this event?')) return;

    // local-only event (id starts with 'local_') — just remove from state
    if (typeof evId === 'string' && evId.startsWith('local_')) {
      setEvents(prev => prev.filter(e => e.id !== evId));
      return;
    }

    // server event — delete from DB first, then update state
    try {
      await api.delete(`/events/${evId}`);
      setEvents(prev => prev.filter(e => e.id !== evId));
    } catch (err) {
      alert(`❌ Failed to delete: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleFinish = async () => {
    if (!window.confirm('End the match and save the final score?')) return;
    try {
      await api.post(
        `/matches/update-details?match_id=${id}`,
        { score_home: score.home, score_away: score.away, status: 'finished' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      navigate('/admin/dashboard');
    } catch(err) { alert(`❌ ${err.response?.data?.detail || err.message}`); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background:'#050c14' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/>
        <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading pitch…</span>
      </div>
    </div>
  );
  if (error||!matchData) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-red-400" style={{ background:'#050c14' }}>
      <div className="text-5xl">⚠️</div><p className="text-sm">{error||'Match not found'}</p>
      <button onClick={()=>navigate(-1)} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition">← Back</button>
    </div>
  );

  return (
    <div dir="ltr" className="flex h-screen overflow-hidden" style={{ background:'#050c14' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700;800&display=swap');
        * { font-family: 'Barlow Condensed', system-ui, sans-serif; }
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px}
      `}</style>

      {/* LEFT TOOLBAR */}
      <div className="w-[72px] flex flex-col items-center py-5 gap-5 border-r shrink-0"
        style={{ background:'#06111e', borderColor:'rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base mb-1 shrink-0"
          style={{ background:'linear-gradient(135deg,#1d4ed8,#0ea5e9)' }}>⚽</div>
        <div className="w-full px-2.5 space-y-3">
          {tools.map(t => (
            <ToolBtn key={t.type} tool={t}
              active={selectedTool?.type===t.type}
              disabled={t.disabled}
              onClick={()=>!t.disabled&&setSelectedTool(selectedTool?.type===t.type?null:t)} />
          ))}
        </div>
        <div className="mt-auto w-full px-2">
          <div className="rounded-xl py-2 text-center border" style={{ background:'#0a1628', borderColor:'rgba(255,255,255,0.07)' }}>
            <div className="text-[8px] uppercase tracking-widest text-gray-600 font-bold">Min</div>
            <div className="text-xl font-black text-green-400" style={{ fontFamily:'monospace' }}>{matchMinute}'</div>
          </div>
        </div>
      </div>

      {/* PITCH */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* score */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b"
          style={{ background:'#040b14', borderColor:'rgba(255,255,255,0.06)' }}>
          <div className="flex-1 text-right">
            <div className="text-sm font-black text-blue-400 truncate">{matchData.home}</div>
          </div>
          <div className="flex flex-col items-center mx-6 gap-0.5">
            <div className="flex items-center gap-2 px-5 py-1.5 rounded-xl border"
              style={{ background:'#0a1628', borderColor:'rgba(255,255,255,0.09)' }}>
              <span className="text-2xl font-black text-white" style={{ fontFamily:'monospace' }}>{score.home}</span>
              <span className="text-gray-600 text-xl font-thin">—</span>
              <span className="text-2xl font-black text-white" style={{ fontFamily:'monospace' }}>{score.away}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span style={{ color: goalsFromEvents.h>=score.home&&score.home>0?'#22c55e':'#374151' }}>⚽{goalsFromEvents.h}/{score.home}</span>
              <span style={{ color: goalsFromEvents.a>=score.away&&score.away>0?'#22c55e':'#374151' }}>{goalsFromEvents.a}/{score.away}⚽</span>
            </div>
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-black text-red-400 truncate">{matchData.away}</div>
          </div>
        </div>

        {/* active tool hint */}
        {selectedTool && (
          <div className="shrink-0 text-center py-1.5 text-[11px] font-black uppercase tracking-widest animate-pulse"
            style={{ background:(EVENT_META[selectedTool.type]?.color||'#fff')+'14', color:EVENT_META[selectedTool.type]?.color }}>
            {EVENT_META[selectedTool.type]?.icon} {EVENT_META[selectedTool.type]?.label} — tap a player
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <PitchHalf lineup={homeLineup} teamName={matchData.home} teamId={matchData.home_team_id}
            onDrop={handlePlayerClick} tool={selectedTool} side="blue" flip={false} events={events} />
          <PitchHalf lineup={awayLineup} teamName={matchData.away} teamId={matchData.away_team_id}
            onDrop={handlePlayerClick} tool={selectedTool} side="red" flip={true} events={events} />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-60 flex flex-col shrink-0 border-l overflow-hidden"
        style={{ background:'#06111e', borderColor:'rgba(255,255,255,0.06)' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0"
          style={{ borderColor:'rgba(255,255,255,0.06)' }}>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Events</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background:'rgba(255,255,255,0.06)', color:'#4b5563' }}>{events.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {events.length===0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="text-3xl mb-2 opacity-15">📋</div>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">No events yet</p>
              <p className="text-[9px] text-gray-700 mt-1">Select tool → click player</p>
            </div>
          ) : events.map(ev => (
            <EventRow key={ev.id} ev={ev} onDelete={handleDeleteEvent} />
          ))}
        </div>

        <div className="p-3 border-t space-y-2 shrink-0" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
          <button onClick={handleFinish}
            className="w-full py-2.5 rounded-xl text-sm font-black uppercase tracking-wider text-white hover:opacity-90 active:scale-95 transition-all"
            style={{ background:'linear-gradient(135deg,#15803d,#166534)' }}>
            🏁 End Match
          </button>
          <button onClick={()=>navigate(-1)}
            className="w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-600 border border-gray-800 hover:text-gray-400 hover:border-gray-700 transition-all">
            ← Back
          </button>
        </div>
      </div>

      {/* MINUTE MODAL */}
      {pendingAction && (
        <MinuteModal tool={selectedTool} player={pendingAction.player}
          matchMinute={matchMinute} onConfirm={handleConfirm} onCancel={()=>setPendingAction(null)} />
      )}
    </div>
  );
};

export default MatchLiveControl;