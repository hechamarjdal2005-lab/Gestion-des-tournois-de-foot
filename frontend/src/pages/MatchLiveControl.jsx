import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

/* ═══════════════════════════════════════════════════
   توزيع اللاعبين حسب المركز
═══════════════════════════════════════════════════ */
const groupByLine = (players) => {
  const grouped = { GK: [], DEF: [], MID: [], FWD: [] };
  players.forEach((p) => {
    const pos = (p.position || '').toLowerCase();
    if (pos.includes('goal') || pos === 'gk') grouped.GK.push(p);
    else if (pos.includes('defend') || pos.includes('back') || pos === 'cb' || pos === 'lb' || pos === 'rb') grouped.DEF.push(p);
    else if (pos.includes('mid') || pos === 'cm' || pos === 'dm' || pos === 'am') grouped.MID.push(p);
    else grouped.FWD.push(p);
  });
  return ['GK', 'DEF', 'MID', 'FWD'].filter((k) => grouped[k].length > 0).map((k) => grouped[k]);
};

/* ═══════════════════════════════════════════════════
   بطاقة اللاعب السداسية
═══════════════════════════════════════════════════ */
const HexPlayerCard = ({ player, teamId, onDrop, tool, side }) => {
  const accent = side === 'blue' ? '#3b82f6' : '#ef4444';
  
  // ✅ إصلاح رابط الصورة (إزالة المسافات الزائدة)
  const imgSrc = player.photo
    ? `http://127.0.0.1:8000${player.photo}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=0f2419&color=fff&size=128`;

  return (
    <div
      className="flex flex-col items-center gap-1 group cursor-pointer select-none"
      style={{ minWidth: 70 }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); if (tool) onDrop(player, teamId); }}
      onClick={() => { if (tool) onDrop(player, teamId); }}
    >
      <div className="relative transition-transform duration-300 group-hover:scale-110" style={{ width: 60, height: 68 }}>
        <svg viewBox="0 0 60 68" className="absolute inset-0 w-full h-full drop-shadow-lg">
          <defs>
            <clipPath id={`hx-${player.id}`}>
              <polygon points="30,1 59,17 59,51 30,67 1,51 1,17" />
            </clipPath>
            <linearGradient id={`ov-${player.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.15" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <polygon points="30,1 59,17 59,51 30,67 1,51 1,17" fill="#0d1f14" stroke={accent} strokeWidth="2" />
          <image href={imgSrc} x="0" y="0" width="60" height="68" clipPath={`url(#hx-${player.id})`} preserveAspectRatio="xMidYMid slice" />
          <polygon points="30,1 59,17 59,51 30,67 1,51 1,17" fill={`url(#ov-${player.id})`} />
          {tool && (
            <polygon points="30,1 59,17 59,51 30,67 1,51 1,17" fill="none" stroke="#22c55e" strokeWidth="2.5" className="animate-pulse" />
          )}
        </svg>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-gray-900 shadow-lg z-10"
          style={{ background: accent, color: '#fff' }}>
          {player.number || '?'}
        </div>
        {tool && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
            <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xl animate-bounce -translate-y-2 block">
              {tool.label}
            </span>
          </div>
        )}
      </div>
      <div className="text-center max-w-[80px]">
        <div className="text-[10px] font-bold text-white leading-tight truncate drop-shadow-md" style={{ textShadow: '0 1px 4px #000' }}>
          {player.name}
        </div>
        <div className="text-[8px] uppercase tracking-wider font-semibold" style={{ color: accent }}>
          {player.position}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   نصف الملعب
═══════════════════════════════════════════════════ */
const PitchHalf = ({ lineup, teamName, teamId, onDrop, tool, side, flip = false }) => {
  const rows = groupByLine(lineup);
  const orderedRows = flip ? [...rows].reverse() : rows;

  return (
    <div className={`relative flex-1 flex flex-col overflow-hidden`}
      style={{
        background: 'linear-gradient(180deg, #166534 0%, #14532d 50%, #166534 100%)',
        borderRight: side === 'blue' ? '2px solid rgba(255,255,255,0.15)' : 'none',
      }}>
      <PitchLines flip={flip} />
      <div className={`absolute ${flip ? 'bottom-3' : 'top-3'} left-0 right-0 flex justify-center z-20 pointer-events-none`}>
        <span className="text-xs font-black px-4 py-1 rounded-full backdrop-blur-sm border shadow-xl"
          style={{ color: side === 'blue' ? '#93c5fd' : '#fca5a5', borderColor: side === 'blue' ? 'rgba(59,130,246,0.4)' : 'rgba(239,68,68,0.4)', background: 'rgba(0,0,0,0.55)' }}>
          {teamName}
        </span>
      </div>
      <div className={`relative z-10 flex flex-col ${flip ? 'justify-end' : 'justify-start'} gap-0 h-full py-10 px-1`}>
        {orderedRows.map((row, ri) => (
          <div key={ri} className="flex-1 flex items-center justify-around px-2">
            {row.map((player) => (
              <HexPlayerCard key={player.id} player={player} teamId={teamId} onDrop={onDrop} tool={tool} side={side} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const PitchLines = ({ flip }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.18 }}>
    <div className="absolute inset-2 border border-white rounded" />
    {!flip ? (
      <>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-24 border border-white border-b-0" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-12 border border-white border-b-0" />
        <div className="absolute bottom-12 left-1/2 w-10 h-10 -translate-x-1/2 -translate-y-1/2 border border-white rounded-full" />
      </>
    ) : (
      <>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/5 h-24 border border-white border-t-0" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-12 border border-white border-t-0" />
        <div className="absolute top-12 left-1/2 w-10 h-10 -translate-x-1/2 translate-y-1/2 border border-white rounded-full" />
      </>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════
   الكومبوننت الرئيسي
═══════════════════════════════════════════════════ */
const MatchLiveControl = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'referee')) navigate('/unauthorized');
  }, [user, navigate]);

  if (!user || (user.role !== 'super_admin' && user.role !== 'referee')) return null;

  const [matchData, setMatchData] = useState(null);
  const [homeLineup, setHomeLineup] = useState([]);
  const [awayLineup, setAwayLineup] = useState([]);
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [events, setEvents] = useState([]);
  const [minute, setMinute] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tools = [
    { type: 'goal', icon: '⚽', label: 'هدف', color: 'bg-white text-black border-black' },
    { type: 'own_goal', icon: '🔴', label: 'هدف عكسي', color: 'bg-red-600 text-white border-red-800' },
    { type: 'yellow_card', icon: '🟨', label: 'صفراء', color: 'bg-yellow-400 text-black border-yellow-600' },
    { type: 'red_card', icon: '🟥', label: 'حمراء', color: 'bg-red-600 text-white border-red-800' },
  ];
  const [selectedTool, setSelectedTool] = useState(null);

  useEffect(() => {
    fetchMatchData();
    const timer = setInterval(() => setMinute((m) => m + 1), 60000);
    return () => clearInterval(timer);
  }, [id]);

  const fetchMatchData = async () => {
    try {
      const res = await api.get(`/matches/${id}/lineups`);
      if (res.data?.match) {
        setMatchData(res.data.match);
        setScore({ home: res.data.match.score_home || 0, away: res.data.match.score_away || 0 });
        const sort = (arr) => [...arr].sort((a, b) => {
          if (a.position === 'Goalkeeper') return -1;
          if (b.position === 'Goalkeeper') return 1;
          return a.number - b.number;
        });
        setHomeLineup(sort(res.data.home_lineup || []));
        setAwayLineup(sort(res.data.away_lineup || []));
        setEvents(res.data.events || []);
      }
    } catch (err) {
      setError(`فشل التحميل: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDropOnPlayer = async (player, teamId) => {
    if (!selectedTool) { alert('⚠️ اختر أداة أولاً!'); return; }
    if (!window.confirm(`تسجيل ${selectedTool.label} لـ ${player.name}?`)) return;

    try {
      const formData = new FormData();
      formData.append('team_id', Number(teamId)); // تحويل لصريح
      formData.append('player_id', Number(player.id)); // تحويل لصريح
      formData.append('event_type', String(selectedTool.type));
      
      // ✅ التأكد من أن الدقيقة رقم صحيح دائماً
      const currentMinute = parseInt(minute) || 0;
      formData.append('minute', currentMinute);

      console.log("Sending event:", { teamId, playerId: player.id, type: selectedTool.type, minute: currentMinute });

      await api.post(`/matches/${id}/record-event`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      let { home: nh, away: na } = score;
      if (selectedTool.type === 'goal') { if (teamId === matchData.home_team_id) nh++; else na++; }
      else if (selectedTool.type === 'own_goal') { if (teamId === matchData.home_team_id) na++; else nh++; }
      setScore({ home: nh, away: na });

      setEvents([{ id: Date.now(), minute: currentMinute, type: selectedTool.type, player: player.name, team_id: teamId, icon: selectedTool.icon, number: player.number }, ...events]);
      alert('✅ تم التسجيل!');
      setSelectedTool(null);
    } catch (err) {
      console.error("Event Error:", err);
      const msg = err.response?.data?.detail || "حدث خطأ غير معروف";
      alert(`❌ فشل: ${msg}`);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white text-lg">
      <span className="animate-pulse">⚽ جاري تحضير الملعب...</span>
    </div>
  );
  if (error || !matchData) return (
    <div className="p-10 text-center text-red-400 bg-gray-900 h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-5xl">⚠️</div>
      <p className="text-lg">{error}</p>
      <button onClick={() => navigate(-1)} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-bold transition">عودة</button>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden" dir="rtl">
      {/* شريط الأدوات */}
      <div className="w-20 bg-gray-800 flex flex-col items-center py-5 gap-4 border-l border-gray-700 z-30 shadow-2xl shrink-0">
        <h3 className="text-[9px] font-bold text-gray-400 uppercase text-center leading-tight">أدوات<br />التحكيم</h3>
        {tools.map((tool) => (
          <button key={tool.type} draggable onDragStart={() => setSelectedTool(tool)} onClick={() => setSelectedTool(selectedTool?.type === tool.type ? null : tool)}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl cursor-pointer shadow-lg border-2 transition-all duration-200 hover:scale-110 focus:outline-none ${selectedTool?.type === tool.type ? 'ring-4 ring-green-400 scale-110 bg-gray-700' : 'border-gray-600 opacity-80 hover:opacity-100'} ${tool.color}`} title={tool.label}>
            {tool.icon}
          </button>
        ))}
        <div className="mt-auto text-center bg-gray-900 p-2 rounded-lg border border-gray-700 w-16">
          <div className="text-[9px] text-gray-500 mb-0.5">الدقيقة</div>
          <div className="text-xl font-mono font-black text-green-400">{minute}'</div>
        </div>
      </div>

      {/* الملعب */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 bg-gray-900/95 backdrop-blur border-b border-gray-700 px-4 py-3 flex items-center justify-between shadow-2xl z-30">
          <div className="flex-1 text-center"><h2 className="font-black text-blue-400 text-sm md:text-base truncate">{matchData.home}</h2></div>
          <div className="flex items-center gap-2 bg-black px-6 py-2 rounded-xl border border-gray-600 mx-4 shadow-inner">
            <span className="text-2xl md:text-3xl font-mono font-black text-white">{score.home}</span>
            <span className="text-gray-500 text-xl font-light">–</span>
            <span className="text-2xl md:text-3xl font-mono font-black text-white">{score.away}</span>
          </div>
          <div className="flex-1 text-center"><h2 className="font-black text-red-400 text-sm md:text-base truncate">{matchData.away}</h2></div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <PitchHalf lineup={homeLineup} teamName={matchData.home} teamId={matchData.home_team_id} onDrop={handleDropOnPlayer} tool={selectedTool} side="blue" flip={false} />
          <PitchHalf lineup={awayLineup} teamName={matchData.away} teamId={matchData.away_team_id} onDrop={handleDropOnPlayer} tool={selectedTool} side="red" flip={true} />
        </div>
      </div>

      {/* الأحداث */}
      <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col shadow-2xl z-20 hidden lg:flex shrink-0">
        <div className="p-3 bg-gray-800 border-b border-gray-700 font-bold text-sm flex justify-between items-center">
          <span>📝 أحداث المباراة</span>
          <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">{events.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
          {events.length === 0 ? (
            <div className="text-center text-gray-500 mt-12 text-sm">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-xs leading-relaxed">اختر أداة ثم اضغط على اللاعب</p>
            </div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className={`flex items-center gap-2 p-2.5 rounded-lg border-r-4 shadow transition-all text-sm ${ev.team_id === matchData.home_team_id ? 'bg-blue-900/20 border-blue-500' : 'bg-red-900/20 border-red-500'}`}>
                <span className="font-mono font-bold text-yellow-400 text-xs bg-gray-800 rounded px-1 shrink-0">{ev.minute}'</span>
                <span className="text-xl">{ev.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate text-gray-200">#{ev.number} {ev.player}</div>
                  <div className="text-[9px] text-gray-400 uppercase tracking-wide">{ev.type.replace('_', ' ')}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-gray-700 bg-gray-800">
        <button
  onClick={async () => {
    if (!window.confirm('هل أنت متأكد من إنهاء المباراة وحفظ النتيجة النهائية؟')) return;
    
    try {
      // إرسال النتيجة النهائية والحالة
      const formData = new FormData();
      formData.append('score_home', score.home);
      formData.append('score_away', score.away);
      formData.append('status', 'finished');

      await api.post(`/matches/update-details?match_id=${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(`✅ انتهت المباراة! النتيجة النهائية: ${score.home} - ${score.away}`);
      navigate('/admin/dashboard');
    } catch (err) {
      console.error("Finish Error:", err);
      alert(`❌ فشل حفظ النتيجة: ${err.response?.data?.detail || err.message}`);
    }
  }}
  className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-2 rounded-lg transition text-sm"
>
  🏁 إنهاء المباراة
</button>
        </div>
      </div>
    </div>
  );
};

export default MatchLiveControl;