import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

/* ══════════════════════════════════════════════════════
   FORMATIONS
══════════════════════════════════════════════════════ */
const FORMATIONS = {
  "4-3-3":   [1, 4, 3, 3],
  "4-4-2":   [1, 4, 4, 2],
  "4-2-3-1": [1, 4, 2, 3, 1],
  "3-5-2":   [1, 3, 5, 2],
  "3-4-3":   [1, 3, 4, 3],
  "5-3-2":   [1, 5, 3, 2],
  "5-4-1":   [1, 5, 4, 1],
  "4-1-4-1": [1, 4, 1, 4, 1],
  "4-3-2-1": [1, 4, 3, 2, 1],
  "4-5-1":   [1, 4, 5, 1],
};

const LINE_LABELS = ['GK', 'DEF', 'MID', 'ATT'];

const POS_COLOR = {
  Goalkeeper: '#f59e0b',
  Defender:   '#3b82f6',
  Midfielder: '#10b981',
  Forward:    '#ef4444',
  Winger:     '#ef4444',
  Striker:    '#ef4444',
};
const posColor = (pos) => POS_COLOR[pos] || '#94a3b8';

const avatar = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=0f2d1a&color=fff&size=80&bold=true`;

/* ══════════════════════════════════════════════════════
   STAT BAR
══════════════════════════════════════════════════════ */
const StatBar = ({ label, value, max, color }) => (
  <div className="mb-2">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-400">{label}</span>
      <span className="font-black" style={{ color }}>{value}</span>
    </div>
    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }}
      />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════
   PLAYER STATS MODAL
══════════════════════════════════════════════════════ */
const PlayerStatsModal = ({ player, onClose }) => {
  if (!player) return null;
  const stats = player.stats || {};
  const accent = posColor(player.position);
  const img = player.photo ? `http://127.0.0.1:8000${player.photo}` : avatar(player.name);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: `0 0 40px ${accent}33` }}
      >
        {/* Header */}
        <div className="relative h-32 flex items-end pb-4 px-5"
          style={{ background: `linear-gradient(135deg, ${accent}33 0%, #111827 100%)` }}>
          <div className="absolute top-3 right-3">
            <button onClick={onClose} className="text-gray-400 hover:text-white text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition">✕</button>
          </div>
          <div className="flex items-end gap-4">
            <div className="relative">
              <img src={img} alt={player.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 shadow-xl"
                style={{ borderColor: accent }} />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white border-2 border-gray-900"
                style={{ background: accent }}>
                {player.jersey_number || '?'}
              </div>
            </div>
            <div className="pb-2">
              <div className="font-black text-white text-lg leading-tight">{player.name}</div>
              <div className="text-xs uppercase tracking-widest font-bold mt-0.5" style={{ color: accent }}>
                {player.position}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-5">
          {stats.goals !== undefined || stats.matches !== undefined ? (
            <>
              {/* Quick numbers */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Goals', value: stats.goals ?? 0, color: '#22c55e' },
                  { label: 'Assists', value: stats.assists ?? 0, color: '#3b82f6' },
                  { label: 'Matches', value: stats.matches ?? 0, color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Bars */}
              <StatBar label="Yellow Cards" value={stats.yellow_cards ?? 0} max={10} color="#facc15" />
              <StatBar label="Red Cards"    value={stats.red_cards ?? 0}    max={5}  color="#ef4444" />
              {stats.minutes_played !== undefined &&
                <StatBar label="Minutes Played" value={stats.minutes_played} max={900} color={accent} />}
            </>
          ) : (
            <div className="text-center text-gray-500 text-sm py-6">No statistics available</div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   PLAYER CARD (left panel)
══════════════════════════════════════════════════════ */
const PlayerCard = ({ player, onDragStart, isSelected, onStatClick }) => {
  const accent = posColor(player.position);
  return (
    <div
      draggable={!isSelected}
      onDragStart={() => !isSelected && onDragStart(player.id)}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 select-none border group ${
        isSelected
          ? 'opacity-30 cursor-not-allowed border-gray-700 bg-gray-800/40'
          : 'border-gray-700/50 bg-gray-800/60 hover:border-gray-500 hover:bg-gray-700/70 hover:scale-[1.02] hover:shadow-lg'
      }`}
      style={!isSelected ? { boxShadow: `0 0 0 1px ${accent}20` } : {}}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shrink-0 shadow"
        style={{ background: `${accent}22`, color: accent, border: `1.5px solid ${accent}55` }}>
        {player.jersey_number || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-gray-100 truncate leading-tight">{player.name}</div>
        <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: accent }}>
          {player.position || 'Player'}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="text-green-400 text-xs">✓</span>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onStatClick(player); }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-white hover:bg-gray-600 transition opacity-0 group-hover:opacity-100"
          title="View stats"
        >
          📊
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   PITCH PLAYER (on field)
══════════════════════════════════════════════════════ */
const PitchPlayer = ({ player, onRemove, onStatClick, teamColor }) => {
  const img = player?.photo ? `http://127.0.0.1:8000${player.photo}` : avatar(player?.name);
  return (
    <div className="flex flex-col items-center gap-0.5 group relative cursor-pointer" style={{ width: 52 }}
      onClick={() => onStatClick && onStatClick(player)}>
      <div className="relative">
        <div className="rounded-full overflow-hidden border-2 shadow-lg transition-transform duration-200 group-hover:scale-110"
          style={{ width: 66, height: 66, borderColor: teamColor, boxShadow: `0 0 8px ${teamColor}55` }}>
          <img src={img} alt={player?.name} className="w-full h-full object-cover" />
        </div>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-400 rounded-full text-white text-[8px] font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow z-10">
          ✕
        </button>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 min-w-[16px] h-4 px-1 rounded-full text-[8px] font-black flex items-center justify-center text-white shadow border border-black/30"
          style={{ background: teamColor }}>
          {player?.jersey_number || '?'}
        </div>
      </div>
      <div className="text-[9px] font-bold text-white leading-tight truncate px-0.5 text-center w-full mt-1.5"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
        {player?.name?.split(' ').slice(-1)[0]}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   EMPTY SLOT
══════════════════════════════════════════════════════ */
const EmptySlot = ({ onDrop, lineLabel }) => {
  const [hovering, setHovering] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setHovering(true); }}
      onDragLeave={() => setHovering(false)}
      onDrop={e => { e.preventDefault(); setHovering(false); onDrop(); }}
      className="flex flex-col items-center gap-0.5 transition-all duration-200"
      style={{ width: 52 }}
    >
      <div className="rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200"
        style={{
          width: 66, height: 66,
          borderColor: hovering ? '#22c55e' : 'rgba(255,255,255,0.2)',
          background: hovering ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.15)',
          boxShadow: hovering ? '0 0 18px rgba(34,197,94,0.4)' : 'none',
          transform: hovering ? 'scale(1.1)' : 'scale(1)',
        }}>
        <span style={{ color: hovering ? '#22c55e' : 'rgba(255,255,255,0.15)', fontSize: 16 }}>+</span>
      </div>
      <div className="text-[8px] text-white/20 font-medium uppercase tracking-wider">{lineLabel}</div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   TACTICAL PITCH
══════════════════════════════════════════════════════ */
const TacticalPitch = ({ formation, slots, players, onDrop, onRemove, onStatClick, teamColor }) => {
  const lines = FORMATIONS[formation] || [1, 4, 3, 3];
  let si = 0;
  const rows = lines.map(count => {
    const row = Array.from({ length: count }, (_, i) => si++);
    return row;
  });
  const displayRows = [...rows].reverse();

  return (
    <div className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #145a2e 0%, #1a7a3c 28%, #1e8a44 50%, #1a7a3c 72%, #145a2e 100%)',
        width: '100%',
        maxWidth: 900,
        height: 600,
        margin: '0 auto',
      }}>
      {/* SVG pitch lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.2 }}>
        {/* outer border */}
        <rect x="12" y="10" width="calc(100% - 24px)" height="calc(100% - 20px)" rx="3" fill="none" stroke="white" strokeWidth="1.5"/>
        {/* halfway line */}
        <line x1="12" y1="50%" x2="calc(100% - 12px)" y2="50%" stroke="white" strokeWidth="1.2"/>
        {/* center circle */}
        <circle cx="50%" cy="50%" r="55" fill="none" stroke="white" strokeWidth="1.2"/>
        <circle cx="50%" cy="50%" r="3" fill="white"/>
        {/* bottom penalty area */}
        <rect x="calc(50% - 105px)" y="calc(100% - 85px)" width="210" height="75" fill="none" stroke="white" strokeWidth="1.2"/>
        <rect x="calc(50% - 50px)" y="calc(100% - 45px)" width="100" height="35" fill="none" stroke="white" strokeWidth="1.2"/>
        {/* top penalty area */}
        <rect x="calc(50% - 105px)" y="10" width="210" height="75" fill="none" stroke="white" strokeWidth="1.2"/>
        <rect x="calc(50% - 50px)" y="10" width="100" height="35" fill="none" stroke="white" strokeWidth="1.2"/>
        {/* penalty spots */}
        <circle cx="50%" cy="calc(100% - 65px)" r="2" fill="white"/>
        <circle cx="50%" cy="65px" r="2" fill="white"/>
      </svg>

      {/* Formation label */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <span className="text-[11px] font-black text-white/40 tracking-widest uppercase bg-black/20 px-3 py-1 rounded-full">
          {formation}
        </span>
      </div>

      {/* Players grid */}
      <div className="relative z-10 flex flex-col justify-around h-full py-4 px-2 gap-0">
        {displayRows.map((row, ri) => {
          const lineIdx = displayRows.length - 1 - ri;
          const lineLabel = LINE_LABELS[Math.min(lineIdx, LINE_LABELS.length - 1)];
          return (
            <div key={ri} className="flex justify-around items-center">
              {row.map(slotIdx => {
                const pid = slots[slotIdx];
                const p = pid ? players.find(pl => pl.id === pid) : null;
                return p ? (
                  <PitchPlayer key={slotIdx} player={p} onRemove={() => onRemove(slotIdx)}
                    onStatClick={onStatClick} teamColor={teamColor} />
                ) : (
                  <EmptySlot key={slotIdx} onDrop={() => onDrop(slotIdx)} lineLabel={lineLabel} />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Counter */}
      <div className="absolute bottom-3 right-3 z-20">
        <span className={`text-xs font-black px-3 py-1 rounded-full border ${
          slots.filter(Boolean).length === 11
            ? 'text-green-300 border-green-500/40 bg-green-900/40'
            : 'text-yellow-300 border-yellow-500/40 bg-yellow-900/30'
        }`}>
          {slots.filter(Boolean).length} / 11
        </span>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   STATISTICS TAB
══════════════════════════════════════════════════════ */
const StatisticsTab = ({ players, team, onPlayerClick }) => {
  const topScorers   = [...players].sort((a,b) => (b.stats?.goals ?? 0) - (a.stats?.goals ?? 0)).slice(0, 5);
  const topAssists   = [...players].sort((a,b) => (b.stats?.assists ?? 0) - (a.stats?.assists ?? 0)).slice(0, 5);
  const mostBooked   = [...players].sort((a,b) => ((b.stats?.yellow_cards ?? 0) + (b.stats?.red_cards ?? 0)) - ((a.stats?.yellow_cards ?? 0) + (a.stats?.red_cards ?? 0))).slice(0, 5);

  const totalGoals   = players.reduce((s, p) => s + (p.stats?.goals ?? 0), 0);
  const totalAssists = players.reduce((s, p) => s + (p.stats?.assists ?? 0), 0);
  const totalYellow  = players.reduce((s, p) => s + (p.stats?.yellow_cards ?? 0), 0);
  const totalRed     = players.reduce((s, p) => s + (p.stats?.red_cards ?? 0), 0);

  const MiniPlayerRow = ({ player, value, color, label }) => (
    <div
      className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-700/60 border border-gray-700/50 transition cursor-pointer group"
      onClick={() => onPlayerClick(player)}
    >
      <img
        src={player.photo ? `http://127.0.0.1:8000${player.photo}` : avatar(player.name)}
        alt={player.name}
        className="w-9 h-9 rounded-full object-cover border border-gray-600 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-gray-100 truncate">{player.name}</div>
        <div className="text-[10px] uppercase" style={{ color: posColor(player.position) }}>{player.position}</div>
      </div>
      <div className="text-xl font-black shrink-0" style={{ color }}>
        {value}
        <span className="text-[9px] text-gray-500 ml-0.5">{label}</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
      {/* Team overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Goals',    value: totalGoals,   color: '#22c55e', icon: '⚽' },
          { label: 'Total Assists',  value: totalAssists, color: '#3b82f6', icon: '🎯' },
          { label: 'Yellow Cards',   value: totalYellow,  color: '#facc15', icon: '🟨' },
          { label: 'Red Cards',      value: totalRed,     color: '#ef4444', icon: '🟥' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Top scorers */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <span>⚽</span>
            <h3 className="text-sm font-black text-gray-300 uppercase tracking-wider">Top Scorers</h3>
          </div>
          <div className="p-3 space-y-2">
            {topScorers.length ? topScorers.map(p => (
              <MiniPlayerRow key={p.id} player={p} value={p.stats?.goals ?? 0} color="#22c55e" label="g" />
            )) : <p className="text-gray-600 text-sm text-center py-4">No data</p>}
          </div>
        </div>

        {/* Top assists */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <span>🎯</span>
            <h3 className="text-sm font-black text-gray-300 uppercase tracking-wider">Top Assists</h3>
          </div>
          <div className="p-3 space-y-2">
            {topAssists.length ? topAssists.map(p => (
              <MiniPlayerRow key={p.id} player={p} value={p.stats?.assists ?? 0} color="#3b82f6" label="a" />
            )) : <p className="text-gray-600 text-sm text-center py-4">No data</p>}
          </div>
        </div>

        {/* Most booked */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <span>🟨</span>
            <h3 className="text-sm font-black text-gray-300 uppercase tracking-wider">Most Booked</h3>
          </div>
          <div className="p-3 space-y-2">
            {mostBooked.length ? mostBooked.map(p => (
              <MiniPlayerRow key={p.id} player={p}
                value={(p.stats?.yellow_cards ?? 0) + (p.stats?.red_cards ?? 0)}
                color="#facc15" label="c" />
            )) : <p className="text-gray-600 text-sm text-center py-4">No data</p>}
          </div>
        </div>
      </div>

      {/* Full squad table */}
      <div className="mt-5 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-black text-gray-300 uppercase tracking-wider">Full Squad</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['#', 'Player', 'Position', 'Goals', 'Assists', 'Matches', '🟨', '🟥'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-gray-500 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 cursor-pointer transition"
                  onClick={() => onPlayerClick(p)}>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.jersey_number || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={p.photo ? `http://127.0.0.1:8000${p.photo}` : avatar(p.name)}
                        alt={p.name} className="w-7 h-7 rounded-full object-cover border border-gray-700" />
                      <span className="font-semibold text-gray-200">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                      style={{ background: `${posColor(p.position)}22`, color: posColor(p.position) }}>
                      {p.position || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-black text-green-400">{p.stats?.goals ?? 0}</td>
                  <td className="px-4 py-3 font-black text-blue-400">{p.stats?.assists ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400">{p.stats?.matches ?? 0}</td>
                  <td className="px-4 py-3 text-yellow-400 font-bold">{p.stats?.yellow_cards ?? 0}</td>
                  <td className="px-4 py-3 text-red-400 font-bold">{p.stats?.red_cards ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const CoachDashboard = () => {
  const { user, logout } = useAuthStore();

  const [team, setTeam]           = useState(null);
  const [players, setPlayers]     = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [availableMatches, setAvailableMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId]   = useState('');
  const [currentMatch, setCurrentMatch]         = useState(null);
  const [lineupSubmitted, setLineupSubmitted]   = useState(false);
  const [loading, setLoading]     = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState('formation'); // 'formation' | 'statistics'

  // Lineup
  const [formation, setFormation] = useState('4-3-3');
  const [slots, setSlots]         = useState(Array(11).fill(null));
  const [draggingId, setDraggingId] = useState(null);

  // Filters
  const [search, setSearch]       = useState('');
  const [posFilter, setPosFilter] = useState('all');

  // Modal
  const [statsPlayer, setStatsPlayer] = useState(null);

  const teamColor = '#22c55e';

  useEffect(() => { fetchInitialData(); }, []);

  useEffect(() => {
    if (selectedTournamentId) fetchTournamentMatches(selectedTournamentId);
    else { setAvailableMatches([]); setCurrentMatch(null); setSelectedMatchId(''); }
  }, [selectedTournamentId]);

  useEffect(() => {
    if (selectedMatchId) {
      setCurrentMatch(availableMatches.find(m => m.id === parseInt(selectedMatchId)) || null);
      setLineupSubmitted(false);
    } else setCurrentMatch(null);
  }, [selectedMatchId, availableMatches]);

  useEffect(() => { setSlots(Array(11).fill(null)); }, [formation]);

   const fetchInitialData = async () => {
    try {
      const teamRes = await api.get('/me/team');
      setTeam(teamRes.data);
      
      // ✅ التغيير هنا: نستخدم endpoint الجديد الذي يجلب الإحصائيات
      const playersRes = await api.get('/me/players-with-stats');
      setPlayers(playersRes.data);
      
      const tourRes = await api.get('/tournaments');
      setTournaments(tourRes.data.filter(t => t.teams_count > 0));
    } catch (e) { 
      console.error("Error fetching data:", e); 
    }
    finally { 
      setLoading(false); 
    }
  };

  const fetchTournamentMatches = async (tId) => {
    try {
      const res = await api.get(`/tournaments/${tId}`);
      setAvailableMatches((res.data.matches || []).filter(m => ['scheduled', 'lineup_submitted'].includes(m.status)));
    } catch (e) { console.error(e); }
  };

  const handleDrop = (slotIdx) => {
    if (!draggingId) return;
    const existingSlot = slots.indexOf(draggingId);
    const newSlots = [...slots];
    if (existingSlot !== -1) newSlots[existingSlot] = null;
    if (newSlots[slotIdx] !== null && existingSlot !== -1) newSlots[existingSlot] = newSlots[slotIdx];
    newSlots[slotIdx] = draggingId;
    setSlots(newSlots);
    setDraggingId(null);
  };

  const handleRemove = (slotIdx) => {
    const ns = [...slots]; ns[slotIdx] = null; setSlots(ns);
  };

    const submitLineup = async () => {
    if (slots.filter(Boolean).length < 11) { 
      alert('⚠️ يجب اختيار 11 لاعباً أولاً!'); 
      return; 
    }
    if (!currentMatch) { 
      alert('❌ اختر المباراة أولاً'); 
      return; 
    }
    
    try {
      const fd = new FormData();
      fd.append('formation', formation);
      
      // ✅ الإصلاح هنا: تحويل المصفوفة إلى نص JSON
      fd.append('player_ids', JSON.stringify(slots));
      
      console.log("Sending lineup:", { formation, slots }); // للتأكد مما يتم إرساله

      await api.post(`/matches/${currentMatch.id}/lineup`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setLineupSubmitted(true);
      alert('✅ تم إرسال التشكيلة بنجاح!');
    } catch (e) { 
      console.error("Lineup Error:", e);
      const msg = e.response?.data?.detail || 'فشل الإرسال';
      alert(`❌ ${msg}`); 
    }
  };

  const positions     = ['all', ...new Set(players.map(p => p.position).filter(Boolean))];
  const filteredPlayers = players.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase());
    const mp = posFilter === 'all' || p.position === posFilter;
    return ms && mp;
  });
  const selectedIds = slots.filter(Boolean);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    </div>
  );

  if (!team) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-red-400">No team found.</div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col" dir="ltr">

      {/* ── Header ── */}
      <header className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600/20 border border-green-600/40 flex items-center justify-center text-xl">⚽</div>
            <div>
              <h1 className="text-base font-black text-white leading-tight">{team.name}</h1>
              <p className="text-[11px] text-gray-500 uppercase tracking-widest">Coach Dashboard</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-800 rounded-xl p-1 border border-gray-700">
            {[
              { id: 'formation',  label: '🗺️ Formation',  },
              { id: 'statistics', label: '📊 Statistics', },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${
                  activeTab === tab.id
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          <button onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition px-3 py-1.5 rounded-lg hover:bg-red-900/20 border border-transparent hover:border-red-800/40">
            Logout →
          </button>
        </div>
      </header>

      {/* ── Match Selector (shared) ── */}
      <div className="max-w-screen-2xl mx-auto w-full px-6 pt-5">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-4 bg-green-500 rounded-full inline-block"></span>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Match</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">Tournament</label>
              <select value={selectedTournamentId} onChange={e => setSelectedTournamentId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none transition">
                <option value="">— Select tournament —</option>
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-semibold uppercase tracking-wider">Match</label>
              <select value={selectedMatchId} onChange={e => setSelectedMatchId(e.target.value)}
                disabled={!selectedTournamentId}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none transition disabled:opacity-40">
                <option value="">— Select match —</option>
                {availableMatches.map(m => <option key={m.id} value={m.id}>{m.home} vs {m.away}</option>)}
              </select>
            </div>
            {currentMatch && (
              <div className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-white">{currentMatch.home}</span>
                  <span className="text-gray-500 text-xs font-black">VS</span>
                  <span className="font-bold text-white">{currentMatch.away}</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-screen-2xl mx-auto w-full px-6 pb-6 flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>

        {/* FORMATION TAB */}
        {activeTab === 'formation' && (
          <div className="flex gap-5 min-h-0 flex-1">

            {/* Left: Players */}
            <div className="w-72 shrink-0 flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden min-h-0">
              <div className="p-4 border-b border-gray-800 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-gray-300 uppercase tracking-wider">Players</h3>
                  <span className="text-xs bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full text-gray-400">
                    {players.length - selectedIds.length} avail.
                  </span>
                </div>
                <input type="text" placeholder="Search player..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-green-500 focus:outline-none mb-2" />
                <div className="flex gap-1 flex-wrap">
                  {positions.map(pos => (
                    <button key={pos} onClick={() => setPosFilter(pos)}
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider transition ${
                        posFilter === pos ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                      }`}>
                      {pos === 'all' ? 'All' : pos}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
                {filteredPlayers.map(p => (
                  <PlayerCard key={p.id} player={p} onDragStart={setDraggingId}
                    isSelected={selectedIds.includes(p.id)} onStatClick={setStatsPlayer} />
                ))}
                {filteredPlayers.length === 0 &&
                  <div className="text-center text-gray-600 text-sm py-10">No players found</div>}
              </div>
            </div>

            {/* Right: Pitch */}
            <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
              {/* Formation selector + submit */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4 flex-wrap shrink-0">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-semibold">Formation</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(FORMATIONS).map(f => (
                      <button key={f} onClick={() => setFormation(f)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-black tracking-wider transition-all ${
                          formation === f
                            ? 'bg-green-600 text-white shadow-lg shadow-green-900/40'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
                        }`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ml-auto">
                  {currentMatch ? (
                    <button onClick={submitLineup}
                      disabled={lineupSubmitted || slots.filter(Boolean).length < 11}
                      className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${
                        lineupSubmitted ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : slots.filter(Boolean).length >= 11
                            ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg hover:scale-105'
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                      }`}>
                      {lineupSubmitted ? '✅ Lineup Sent' : '📤 Submit Lineup'}
                    </button>
                  ) : (
                    <div className="text-xs text-gray-600 italic">Select a match to submit</div>
                  )}
                </div>
              </div>

              {/* Pitch */}
              <TacticalPitch
                formation={formation} slots={slots} players={players}
                onDrop={handleDrop} onRemove={handleRemove}
                onStatClick={setStatsPlayer} teamColor={teamColor}
              />
            </div>
          </div>
        )}

        {/* STATISTICS TAB */}
        {activeTab === 'statistics' && (
          <StatisticsTab players={players} team={team} onPlayerClick={setStatsPlayer} />
        )}
      </div>

      {/* Player Stats Modal */}
      {statsPlayer && <PlayerStatsModal player={statsPlayer} onClose={() => setStatsPlayer(null)} />}
    </div>
  );
    // إعادة تحميل الإحصائيات عند العودة لهذه الصفحة
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      // يمكن إضافة منطق هنا إذا لزم الأمر
    });
    return () => unsubscribe();
  }, []);
  
  // خيار بسيط: إعادة التحميل عند ظهور componente
  useEffect(() => {
     fetchInitialData();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // إعادة التحميل عند التبديل للتبويب (اختياري)
};


export default CoachDashboard;