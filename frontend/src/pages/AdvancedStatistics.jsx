import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const OUTCOME_COLORS = ['#3b82f6', '#6b7280', '#ef4444'];

const avatar = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=0d1f14&color=fff&size=80&bold=true`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border px-4 py-3 text-sm shadow-2xl"
      style={{ background: '#0d1824', borderColor: 'rgba(255,255,255,0.1)' }}>
      <p className="font-black text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="rounded-2xl p-5 border flex flex-col gap-2 relative overflow-hidden"
    style={{ background: '#0d1824', borderColor: color + '25' }}>
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-6 translate-x-6 blur-2xl pointer-events-none"
      style={{ background: color + '18' }} />
    <div className="text-2xl">{icon}</div>
    <div className="text-[11px] uppercase tracking-widest font-bold text-gray-500">{label}</div>
    <div className="text-3xl font-black" style={{ color }}>{value}</div>
    {sub && <div className="text-[11px] text-gray-600 font-semibold truncate">{sub}</div>}
  </div>
);

const Panel = ({ children, className = '' }) => (
  <div className={`rounded-2xl border p-6 ${className}`}
    style={{ background: '#0d1824', borderColor: 'rgba(255,255,255,0.07)' }}>
    {children}
  </div>
);

const SectionHeader = ({ icon, title, color }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-1 h-6 rounded-full shrink-0" style={{ background: color }} />
    <span className="text-base font-black uppercase tracking-widest" style={{ color }}>{icon} {title}</span>
  </div>
);

const PlayerRow = ({ rank, player, team, statValue, statIcon, statColor, number, extra }) => {
  const img = player.photo ? `http://127.0.0.1:8000${player.photo}` : avatar(player.player || player);
  const name = player.player || player;
  const teamName = player.team || team || '';
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition group">
      <span className="text-[11px] font-black w-5 text-center shrink-0"
        style={{ color: rank <= 3 ? ['#f59e0b','#94a3b8','#b45309'][rank-1] : '#374151' }}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
      </span>
      <img src={img} alt={name}
        className="w-9 h-9 rounded-full object-cover border shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-white truncate">{name}</div>
        <div className="text-[10px] text-gray-500 font-semibold truncate">
          {teamName}{number ? ` · #${number}` : ''}
        </div>
      </div>
      {extra}
      <div className="shrink-0 flex items-center gap-1 font-black text-lg" style={{ color: statColor }}>
        {statValue} <span className="text-base">{statIcon}</span>
      </div>
    </div>
  );
};

const TABS = [
  { id: 'all',     label: 'All Players', icon: '📋' },
  { id: 'scorers', label: 'Scorers',     icon: '⚽' },
  { id: 'assists', label: 'Assists',     icon: '🎯' },
  { id: 'cards',   label: 'Discipline',  icon: '🟨' },
];

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
const AdvancedStatistics = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => { fetchStats(); }, [id]);

  const fetchStats = async () => {
    try {
      const res = await api.get(`/tournaments/${id}/advanced-statistics`);
      setStats(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#060e18' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-xs font-black uppercase tracking-widest">Analyzing data…</span>
      </div>
    </div>
  );

  if (!stats || !stats.detailed_stats) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: '#060e18' }}>
      <div className="text-5xl opacity-20">📊</div>
      <p className="text-gray-600 font-black uppercase tracking-wider text-sm">No statistics available yet</p>
      <button onClick={() => navigate(`/tournament/${id}`)}
        className="px-5 py-2 rounded-xl text-sm font-black text-white border border-gray-700 hover:border-gray-500 transition">
        ← Back to Tournament
      </button>
    </div>
  );

  const topScorer = stats.top_scorers?.[0];
  const topAssist = stats.top_assists?.[0];
  const topCard   = stats.most_disciplined?.[0];

  // build table data based on tab
  const tableData =
    activeTab === 'all'     ? (stats.detailed_stats || []) :
    activeTab === 'scorers' ? (stats.top_scorers || []) :
    activeTab === 'assists' ? (stats.top_assists || []) :
    (stats.most_disciplined || []);

  return (
    <div dir="ltr" className="min-h-screen text-white" style={{ background: '#060e18', fontFamily: "'Barlow Condensed', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700;800&display=swap');*{font-family:'Barlow Condensed',system-ui,sans-serif}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px}`}</style>

      {/* ── HEADER ── */}
      <div className="border-b sticky top-0 z-40 backdrop-blur-md"
        style={{ background: 'rgba(6,14,24,0.93)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/tournament/${id}`)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 transition text-sm font-black">←</button>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Advanced Statistics</div>
              <div className="text-xl font-black text-white leading-tight">Player Analysis</div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
            style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.3)', color: '#60a5fa' }}>
            Goals · Assists · Discipline
          </span>
        </div>

        {/* TABS */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="pb-3 px-4 text-sm font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-2"
              style={{
                color: activeTab === tab.id ? '#60a5fa' : '#374151',
                borderColor: activeTab === tab.id ? '#3b82f6' : 'transparent',
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon="⚽" label="Golden Boot"
            value={topScorer?.goals ?? 0} color="#f59e0b"
            sub={topScorer?.player || 'No goals yet'} />
          <StatCard icon="🎯" label="Top Assist"
            value={topAssist?.assists ?? 0} color="#8b5cf6"
            sub={topAssist?.player || 'No assists yet'} />
          <StatCard icon="🟨" label="Most Carded"
            value={topCard ? `${topCard.yellow}Y ${topCard.red}R` : '—'} color="#ef4444"
            sub={topCard?.player || 'Clean so far'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: main table ── */}
          <div className="lg:col-span-2">
            <Panel>
              <SectionHeader
                icon={TABS.find(t=>t.id===activeTab)?.icon}
                title={TABS.find(t=>t.id===activeTab)?.label}
                color="#60a5fa" />

              {tableData.length === 0 ? (
                <div className="text-center text-gray-600 py-16 font-bold text-sm">No data available yet</div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                        {['#','Player','Team','⚽','🎯','🟨','🟥'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider font-black text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((p, i) => (
                        <tr key={i} className="border-b hover:bg-white/4 transition"
                          style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          <td className="px-3 py-3 text-gray-600 font-mono text-xs font-bold">{i+1}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <img src={p.photo ? `http://127.0.0.1:8000${p.photo}` : avatar(p.player)}
                                alt={p.player}
                                className="w-7 h-7 rounded-full object-cover border shrink-0"
                                style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                              <div>
                                <div className="font-black text-white text-sm leading-tight">{p.player}</div>
                                <div className="text-[9px] text-gray-600">#{p.number || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-blue-400 font-bold text-xs truncate max-w-[90px]">{p.team}</td>
                          <td className="px-3 py-3 text-center">
                            {p.goals > 0
                              ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-sm"
                                  style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15' }}>{p.goals}</span>
                              : <span className="text-gray-700 font-bold">0</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {p.assists > 0
                              ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-sm"
                                  style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>{p.assists}</span>
                              : <span className="text-gray-700 font-bold">0</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {(p.yellow || p.yellow_cards || 0) > 0
                              ? <span className="inline-flex items-center justify-center w-6 h-7 rounded-sm font-black text-xs"
                                  style={{ background: '#facc15', color: '#000' }}>{p.yellow || p.yellow_cards}</span>
                              : <span className="text-gray-700 font-bold">0</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {(p.red || p.red_cards || 0) > 0
                              ? <span className="inline-flex items-center justify-center w-6 h-7 rounded-sm font-black text-xs"
                                  style={{ background: '#ef4444', color: '#fff' }}>{p.red || p.red_cards}</span>
                              : <span className="text-gray-700 font-bold">0</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          {/* ── RIGHT: sidebar ── */}
          <div className="space-y-5">

            {/* Top Scorer card */}
            <div className="rounded-2xl p-5 border relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#78350f,#92400e)', borderColor: 'rgba(245,158,11,0.3)' }}>
              <div className="absolute top-0 right-0 text-8xl opacity-10 -translate-y-3 translate-x-3 pointer-events-none">⚽</div>
              <div className="text-[10px] uppercase tracking-widest font-black text-yellow-300 mb-2">Golden Boot</div>
              {topScorer ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <img src={topScorer.photo ? `http://127.0.0.1:8000${topScorer.photo}` : avatar(topScorer.player)}
                      alt={topScorer.player} className="w-10 h-10 rounded-full object-cover border-2 border-yellow-400" />
                    <div>
                      <div className="font-black text-white text-base leading-tight">{topScorer.player}</div>
                      <div className="text-yellow-300 text-[11px] font-bold">{topScorer.team}</div>
                    </div>
                  </div>
                  <div className="text-4xl font-black text-white">{topScorer.goals} <span className="text-xl text-yellow-300">goals</span></div>
                </>
              ) : <p className="text-yellow-200 text-sm font-bold italic">No goals yet</p>}
            </div>

            {/* Top Assist card */}
            <div className="rounded-2xl p-5 border relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#4c1d95,#5b21b6)', borderColor: 'rgba(139,92,246,0.3)' }}>
              <div className="absolute top-0 right-0 text-8xl opacity-10 -translate-y-3 translate-x-3 pointer-events-none">🎯</div>
              <div className="text-[10px] uppercase tracking-widest font-black text-purple-300 mb-2">Playmaker</div>
              {topAssist ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <img src={topAssist.photo ? `http://127.0.0.1:8000${topAssist.photo}` : avatar(topAssist.player)}
                      alt={topAssist.player} className="w-10 h-10 rounded-full object-cover border-2 border-purple-400" />
                    <div>
                      <div className="font-black text-white text-base leading-tight">{topAssist.player}</div>
                      <div className="text-purple-300 text-[11px] font-bold">{topAssist.team}</div>
                    </div>
                  </div>
                  <div className="text-4xl font-black text-white">{topAssist.assists} <span className="text-xl text-purple-300">assists</span></div>
                </>
              ) : <p className="text-purple-200 text-sm font-bold italic">No assists yet</p>}
            </div>

            {/* Most disciplined */}
            <div className="rounded-2xl p-5 border relative overflow-hidden"
              style={{ background: '#0d1824', borderColor: 'rgba(239,68,68,0.25)' }}>
              <div className="absolute top-0 right-0 text-8xl opacity-5 -translate-y-3 translate-x-3 pointer-events-none">⚖️</div>
              <div className="text-[10px] uppercase tracking-widest font-black text-red-400 mb-2">Most Carded</div>
              {topCard ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <img src={topCard.photo ? `http://127.0.0.1:8000${topCard.photo}` : avatar(topCard.player)}
                      alt={topCard.player} className="w-10 h-10 rounded-full object-cover border-2 border-red-500" />
                    <div>
                      <div className="font-black text-white text-base leading-tight">{topCard.player}</div>
                      <div className="text-gray-500 text-[11px] font-bold">{topCard.team}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-lg font-black text-sm"
                      style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15' }}>
                      🟨 {topCard.yellow || topCard.yellow_cards || 0}
                    </span>
                    <span className="px-3 py-1 rounded-lg font-black text-sm"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                      🟥 {topCard.red || topCard.red_cards || 0}
                    </span>
                  </div>
                </>
              ) : <p className="text-gray-600 text-sm font-bold italic">No cards recorded</p>}
            </div>

            {/* Scorers mini-chart */}
            {stats.top_scorers?.length > 0 && (
              <Panel>
                <SectionHeader icon="📊" title="Top 5 Scorers" color="#22c55e" />
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={stats.top_scorers.slice(0,5)} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="player" stroke="#374151" tick={{ fontSize: 9, fill: '#6b7280' }}
                      tickFormatter={v => v.split(' ').slice(-1)[0]} />
                    <YAxis stroke="#374151" tick={{ fontSize: 9, fill: '#6b7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="goals" name="Goals" fill="#22c55e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedStatistics;