import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referees, setReferees] = useState([]);
  const [activeTab, setActiveTab] = useState('matches');

  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [genConfig, setGenConfig] = useState({
    num_groups: 2,
    teams_qualify_per_group: 2,
  });

  const [editingMatchId, setEditingMatchId] = useState(null);
  const [matchForm, setMatchForm] = useState({ home: '', away: '', referee_id: '' });

  useEffect(() => {
    fetchTournament();
    fetchReferees();
  }, [id]);

  const fetchReferees = async () => {
    try {
      const res = await api.get('/referees');
      setReferees(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchTournament = async () => {
    try {
      const res = await api.get(`/tournaments/${id}`);
      setTournament(res.data);
      const type = res.data.type;
      if (type === 'league') setActiveTab('standings');
      else if (type === 'knockout') setActiveTab('matches');
      else if (type === 'mixed') setActiveTab('groups');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // كيبعث genConfig — knockout_stage_legs تجي من الـ state اللي جاي من dashboard
  const handleGenerateMatches = async () => {
    if (!window.confirm("تأكيد توليد المباريات؟")) return;
    try {
      await api.post(`/tournaments/${id}/generate-matches`, {
        num_groups: genConfig.num_groups,
        teams_qualify_per_group: genConfig.teams_qualify_per_group,
        // ✅ knockout_stage_legs: تجي من tournament.knockout_stage_legs لو موجودة، غير هذا من genConfig
        knockout_stage_legs: tournament?.knockout_stage_legs ?? genConfig.knockout_stage_legs,
        group_stage_legs: 1,
      });
      alert("✅ تم التوليد بنجاح!");
      setShowGenerateModal(false);
      fetchTournament();
    } catch (e) { alert("❌ فشل: " + (e.response?.data?.detail || "")); }
  };

  const handleSaveMatchData = async (matchId, isScoreUpdate) => {
    const currentMatch = tournament.matches.find(m => String(m.id) === String(matchId));

    const effectiveRefereeId = matchForm.referee_id
      ? parseInt(matchForm.referee_id)
      : currentMatch?.referee_id
        ? parseInt(currentMatch.referee_id)
        : null;

    if (!effectiveRefereeId) {
      alert("⚠️ يجب اختيار حكم للمباراة أولاً!");
      return;
    }

    try {
      const scoreHome = isScoreUpdate ? (parseInt(matchForm.home) || 0) : (currentMatch?.score_home ?? 0);
      const scoreAway = isScoreUpdate ? (parseInt(matchForm.away) || 0) : (currentMatch?.score_away ?? 0);

      // ✅ ركلات الترجيح — فقط في الإقصاء (مكيكونوش في دور المجموعات)
      const isGroupMatch = !!currentMatch?.group_name;
      const isDraw = scoreHome === scoreAway;
      const penaltyHome = !isGroupMatch && isDraw && matchForm.penalty_home !== '' ? parseInt(matchForm.penalty_home) : null;
      const penaltyAway = !isGroupMatch && isDraw && matchForm.penalty_away !== '' ? parseInt(matchForm.penalty_away) : null;

      const payload = {
        referee_id: effectiveRefereeId,
        score_home: scoreHome,
        score_away: scoreAway,
        status: isScoreUpdate ? 'finished' : (currentMatch?.status || 'scheduled'),
        ...(penaltyHome !== null ? { penalty_home: penaltyHome } : {}),
        ...(penaltyAway !== null ? { penalty_away: penaltyAway } : {}),
      };

      await api.post(
        `/matches/update-details?match_id=${matchId}`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );

      alert(isScoreUpdate ? "✅ تم حفظ النتيجة بنجاح!" : "✅ تم تعيين الحكم بنجاح!");
      setEditingMatchId(null);
      fetchTournament();
    } catch (e) {
      alert("❌ " + (e.response?.data?.detail || "فشل العملية"));
    }
  };

  const handleDeleteTournament = async () => {
    if (!window.confirm("⚠️ حذف البطولة؟")) return;
    try {
      await api.delete(`/tournaments/${id}`);
      navigate('/admin/dashboard');
    } catch (e) { alert("❌ فشل"); }
  };

  const handleAdvanceRound = async () => {
    if (!window.confirm("التقدم للدور التالي؟")) return;
    try {
      const res = await api.post(`/tournaments/${id}/advance-round`);
      alert("✅ " + (res.data?.message || "تم التقدم!"));
      fetchTournament();
    } catch (e) { alert("❌ " + (e.response?.data?.detail || "")); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-xl">
      جاري التحميل...
    </div>
  );
  if (!tournament) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      غير موجود
    </div>
  );

  const isKnockout = tournament.type === 'knockout';
  const isMixed = tournament.type === 'mixed';
  const isLeague = tournament.type === 'league';

  const groupMatches = tournament.matches.filter(m => m.group_name);
  const koMatches = tournament.matches.filter(m => !m.group_name);
  const groupsFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finished');
  const hasKoMatches = koMatches.length > 0;

  const sharedProps = {
    user, navigate, referees, editingMatchId, matchForm,
    setEditingMatchId, setMatchForm, onSave: handleSaveMatchData
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans pb-10">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-900 p-5 shadow-2xl border-b border-blue-800/50 sticky top-0 z-50">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition"
            >
              🔙 عودة
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{tournament.name}</h1>
              <p className="text-blue-300 text-xs mt-0.5">
                {isKnockout ? '⚡ خروج مغلوب' : isMixed ? '🌟 نظام مختلط' : '📊 دوري'} • {tournament.teams.length} فريق
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {user?.role === 'super_admin' && (
              <>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="bg-purple-600 hover:bg-purple-500 px-3 py-2 rounded-lg text-xs font-bold shadow transition"
                >
                  ⚙️ توليد
                </button>
                {(isMixed || isLeague) && (
                  <button
                    onClick={handleAdvanceRound}
                    className="bg-orange-600 hover:bg-orange-500 px-3 py-2 rounded-lg text-xs font-bold shadow transition"
                  >
                    ⏭️ التالي
                  </button>
                )}
                <button
                  onClick={() => navigate(`/tournament/${id}/statistics/advanced`)}
                  className="bg-teal-600 hover:bg-teal-500 px-3 py-2 rounded-lg text-xs font-bold shadow transition"
                >
                  📊 إحصائيات
                </button>
                <button
                  onClick={handleDeleteTournament}
                  className="bg-red-600 hover:bg-red-500 px-3 py-2 rounded-lg text-xs font-bold shadow transition"
                >
                  🗑️ حذف
                </button>
              </>
            )}
            <button onClick={logout} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition">
              خروج
            </button>
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex gap-1 mb-6 border-b border-slate-700/60 overflow-x-auto">
          {isLeague && (
            <TabBtn active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} color="green">
              🏆 الترتيب
            </TabBtn>
          )}
          {isMixed && (
            <TabBtn active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} color="green">
              📋 المجموعات
            </TabBtn>
          )}
          <TabBtn active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} color="blue">
            📅 {isMixed ? 'مباريات المجموعات' : 'المباريات'}
          </TabBtn>
          {(isKnockout || isMixed) && (
            <TabBtn active={activeTab === 'bracket'} onClick={() => setActiveTab('bracket')} color="yellow">
              🌳 شجرة البطولة
            </TabBtn>
          )}
          {isMixed && hasKoMatches && (
            <TabBtn active={activeTab === 'ko_matches'} onClick={() => setActiveTab('ko_matches')} color="orange">
              ⚡ الأدوار الإقصائية
            </TabBtn>
          )}
        </div>

        {activeTab === 'standings' && <StandingsTable tournament={tournament} isMixed={false} />}
        {activeTab === 'groups' && <StandingsTable tournament={tournament} isMixed={true} />}
        {activeTab === 'matches' && (
          <MatchesList
            matches={isMixed ? (groupMatches.length > 0 ? groupMatches : []) : tournament.matches}
            {...sharedProps}
            onGenerate={() => setShowGenerateModal(true)}
            isKnockout={isKnockout}
            onAdvance={handleAdvanceRound}
          />
        )}
        {activeTab === 'ko_matches' && (
          <MatchesList
            matches={koMatches}
            {...sharedProps}
            onGenerate={null}
            isKnockout={true}
            onAdvance={handleAdvanceRound}
          />
        )}
        {activeTab === 'bracket' && (
          <>
            {isMixed && !groupsFinished && (
              <MixedBracketPending groupMatches={groupMatches} onGoToGroups={() => setActiveTab('groups')} />
            )}
            {isMixed && groupsFinished && (
              <ChampionsLeagueBracket matches={koMatches} teams={tournament.teams} isMixed={true} />
            )}
            {isKnockout && (
              <ChampionsLeagueBracket matches={tournament.matches} teams={tournament.teams} isMixed={false} readOnly={true} />
            )}
          </>
        )}
      </div>

      {/* ✅ Generate Modal المحدث */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-600">

            {/* Header */}
            <div className="bg-slate-900 p-4 flex justify-between items-center border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">⚙️ توليد المباريات</h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-white w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">

              {/* إعدادات النظام المختلط فقط */}
              {isMixed && (
                <div className="bg-slate-700/40 rounded-xl p-4 space-y-3 border border-slate-600/50">
                  <p className="text-sm text-blue-300 font-bold">⚙️ إعدادات المجموعات</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">عدد المجموعات</label>
                      <input
                        type="number" min="2"
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none"
                        value={genConfig.num_groups}
                        onChange={e => setGenConfig({ ...genConfig, num_groups: parseInt(e.target.value) || 2 })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">متأهلون / مجموعة</label>
                      <input
                        type="number" min="1"
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none"
                        value={genConfig.teams_qualify_per_group}
                        onChange={e => setGenConfig({ ...genConfig, teams_qualify_per_group: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    إجمالي المتأهلين:{' '}
                    <span className="text-blue-400 font-bold">
                      {(genConfig.num_groups || 2) * (genConfig.teams_qualify_per_group || 1)} فريق
                    </span>
                  </p>
                </div>
              )}

              {/* رسالة توضيحية للـ knockout */}
              {isKnockout && (
                <div className="bg-slate-700/20 rounded-xl p-4 border border-slate-600/30 text-center">
                  <p className="text-gray-400 text-sm">
                    سيتم توليد المباريات حسب الإعدادات المختارة في لوحة التحكم
                  </p>
                </div>
              )}

              {/* أزرار التأكيد */}
              <div className="flex gap-3 justify-end pt-1">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="px-5 py-2 rounded-lg text-gray-300 font-bold hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleGenerateMatches}
                  className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold transition"
                >
                  ✅ توليد
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// TabBtn
// ==========================================
const TabBtn = ({ active, onClick, color, children }) => {
  const colors = {
    green: active ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300',
    blue: active ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300',
    yellow: active ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300',
    orange: active ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-gray-300',
  };
  return (
    <button onClick={onClick} className={`pb-3 px-4 font-bold whitespace-nowrap text-sm transition ${colors[color] || colors.blue}`}>
      {children}
    </button>
  );
};

// ==========================================
// MixedBracketPending
// ==========================================
const MixedBracketPending = ({ groupMatches, onGoToGroups }) => {
  const total = groupMatches.length;
  const finished = groupMatches.filter(m => m.status === 'finished').length;
  const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/40">
      <div className="text-8xl mb-6 opacity-20 grayscale select-none">🏆</div>
      <h2 className="text-2xl font-black text-gray-300 mb-2">شجرة البطولة في الانتظار</h2>
      <p className="text-gray-500 text-sm mb-8 text-center max-w-sm leading-relaxed">
        يجب إنهاء جميع مباريات دور المجموعات أولاً.<br />
        بعدها ستظهر الشجرة مع الفرق المتأهلة تلقائياً.
      </p>
      {total > 0 && (
        <div className="w-72 mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>تقدم دور المجموعات</span>
            <span className="text-blue-400 font-bold">{finished} / {total}</span>
          </div>
          <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-green-500 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">{pct}% مكتمل</p>
        </div>
      )}
      <button
        onClick={onGoToGroups}
        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold text-sm transition shadow-lg"
      >
        📋 الذهاب للمجموعات
      </button>
    </div>
  );
};

// ==========================================
// StandingsTable
// ==========================================
const StandingsTable = ({ tournament, isMixed }) => {
  const standings = useMemo(() => {
    const table = {};

    tournament.teams.forEach(team => {
      table[team.id] = {
        id: team.id, name: team.name, logo: team.logo,
        group: team.group_name || null,
        played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0, points: 0
      };
    });

    tournament.matches
      .filter(m => m.status === 'finished' && m.home_team_id && m.away_team_id)
      .filter(m => !isMixed || m.group_name)
      .forEach(m => {
        const home = table[m.home_team_id];
        const away = table[m.away_team_id];
        if (!home || !away) return;

        if (m.group_name) {
          if (!home.group) home.group = m.group_name;
          if (!away.group) away.group = m.group_name;
        }

        home.played++; away.played++;
        home.gf += m.score_home; home.ga += m.score_away;
        away.gf += m.score_away; away.ga += m.score_home;
        home.gd = home.gf - home.ga; away.gd = away.gf - away.ga;

        if (m.score_home > m.score_away) {
          home.won++; home.points += 3; away.lost++;
        } else if (m.score_home < m.score_away) {
          away.won++; away.points += 3; home.lost++;
        } else {
          home.drawn++; home.points++;
          away.drawn++; away.points++;
        }
      });

    if (isMixed) {
      Object.values(table).forEach(teamRow => {
        if (!teamRow.group) {
          const teamData = tournament.teams.find(t => t.id === teamRow.id);
          if (teamData?.group_name) teamRow.group = teamData.group_name;
        }
      });
    }

    const allTeams = Object.values(table);
    return isMixed
      ? allTeams.filter(t => t.group).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
      : allTeams.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);

  }, [tournament, isMixed]);

  if (isMixed) {
    const groups = [...new Set(standings.map(t => t.group).filter(Boolean))].sort();
    if (groups.length === 0) return (
      <div className="text-center text-gray-400 py-16 bg-slate-800 rounded-xl border border-slate-700">
        <p className="text-xl mb-1">⚠️ لم يتم توزيع الفرق على مجموعات بعد</p>
        <p className="text-sm">قم بتوليد المباريات أولاً.</p>
      </div>
    );
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map(gName => (
          <div key={gName} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-green-900/50 to-slate-900 px-5 py-3 border-b border-green-800/30 flex justify-between items-center">
              <h3 className="font-black text-green-400 flex items-center gap-2">
                <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black">
                  {gName.replace('Group ', '')}
                </span>
                مجموعة {gName.replace('Group ', '')}
              </h3>
              <span className="text-xs text-green-300/60">
                {standings.filter(t => t.group === gName).length} فرق
              </span>
            </div>
            <GroupTableBody teams={standings.filter(t => t.group === gName)} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
      <div className="bg-slate-900 px-5 py-3 border-b border-slate-700">
        <h3 className="font-bold text-green-400">🏆 جدول الترتيب العام</h3>
      </div>
      <GroupTableBody teams={standings} />
    </div>
  );
};

// ==========================================
// GroupTableBody
// ==========================================
const GroupTableBody = ({ teams }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-right text-sm">
      <thead className="bg-slate-900/40 text-[11px] uppercase text-gray-500 font-bold">
        <tr>
          {['#', 'الفريق', 'لعب', 'ف', 'ت', 'خ', 'له', 'عليه', '±', 'نقاط'].map((h, i) => (
            <th key={i} className={`p-3 ${i > 1 ? 'text-center' : ''} ${i === 9 ? 'text-yellow-500' : ''}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-700/30">
        {teams.map((team, idx) => (
          <tr key={team.id} className={`hover:bg-slate-700/20 transition ${idx < 2 ? 'border-r-2 border-green-500/60' : ''}`}>
            <td className="p-3 text-center font-bold text-gray-600 text-xs">{idx + 1}</td>
            <td className="p-3 font-bold text-white">
              <div className="flex items-center gap-2">
                {team.logo
                  ? <img src={`http://127.0.0.1:8000${team.logo}`} alt="" className="w-6 h-6 object-contain rounded" />
                  : <div className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center text-[9px] text-gray-300">{team.name?.[0]}</div>
                }
                <span className="truncate max-w-[120px]">{team.name}</span>
              </div>
            </td>
            <td className="p-3 text-center text-gray-300">{team.played}</td>
            <td className="p-3 text-center text-green-400">{team.won}</td>
            <td className="p-3 text-center text-gray-400">{team.drawn}</td>
            <td className="p-3 text-center text-red-400">{team.lost}</td>
            <td className="p-3 text-center text-gray-300">{team.gf}</td>
            <td className="p-3 text-center text-gray-300">{team.ga}</td>
            <td className={`p-3 text-center font-bold text-xs ${team.gd > 0 ? 'text-green-400' : team.gd < 0 ? 'text-red-400' : 'text-gray-500'}`}>
              {team.gd > 0 ? '+' : ''}{team.gd}
            </td>
            <td className="p-3 text-center font-black text-yellow-400 text-base">{team.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ==========================================
// MatchesList
// ==========================================
const MatchesList = ({ matches, user, navigate, referees, editingMatchId, matchForm,
  setEditingMatchId, setMatchForm, onSave, onGenerate, isKnockout, onAdvance }) => {

  if (matches.length === 0) {
    return (
      <div className="text-center text-gray-400 py-20 bg-slate-800/30 rounded-xl border border-slate-700/40">
        <div className="text-6xl mb-4 opacity-20">📅</div>
        <p className="text-xl mb-4">لا توجد مباريات بعد</p>
        {onGenerate && (
          <button
            onClick={onGenerate}
            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg"
          >
            ⚙️ توليد المباريات
          </button>
        )}
      </div>
    );
  }

  const rounds = {};
  matches.forEach(m => {
    const key = m.round_number ?? 'غير محدد';
    if (!rounds[key]) rounds[key] = [];
    rounds[key].push(m);
  });

  const sortedKeys = Object.keys(rounds).sort((a, b) => {
    const extractNum = (k) => {
      if (String(k).startsWith('KO_R')) return parseInt(String(k).replace('KO_R', '')) + 1000;
      return parseInt(String(k).replace(/\D/g, '')) || 0;
    };
    return extractNum(a) - extractNum(b);
  });

  const getRoundLabel = (key) => {
    const count = rounds[key]?.length || 0;
    if (String(key).startsWith('KO_R')) {
      // حساب عدد الأزواج الحقيقية (بدون placeholders)
      const realMatches = rounds[key].filter(m => m.home_team_id);
      const uniquePairs = new Set();
      realMatches.forEach(m => {
        const pairKey = [m.home_team_id, m.away_team_id].sort().join('-');
        uniquePairs.add(pairKey);
      });
      const pairCount = uniquePairs.size || Math.ceil(count / 2);
      if (pairCount === 1) return '🏆 النهائي';
      if (pairCount === 2) return 'نصف النهائي';
      if (pairCount === 4) return 'ربع النهائي';
      if (pairCount === 8) return 'دور الـ16';
      return `الدور الإقصائي ${key.replace('KO_R', '')}`;
    }
    return `الجولة ${key}`;
  };

  // ✅ تجميع مباريات الذهاب والإياب معاً في نفس الكارد
  const groupMatchesByPair = (matchList) => {
    const pairs = {};
    matchList.forEach(m => {
      if (!m.home_team_id || !m.away_team_id) {
        // placeholder — نعرضه منفرداً
        pairs[`placeholder_${m.id}`] = [m];
        return;
      }
      // مفتاح الزوج: الفريقان بغض النظر عن الأرضية
      const pairKey = [m.home_team_id, m.away_team_id].sort().join('-');
      if (!pairs[pairKey]) pairs[pairKey] = [];
      pairs[pairKey].push(m);
    });
    return Object.values(pairs);
  };

  return (
    <div className="space-y-6">
      {isKnockout && user?.role === 'super_admin' && (
        <div className="flex justify-end">
          <button
            onClick={onAdvance}
            className="bg-orange-600 hover:bg-orange-500 px-5 py-2.5 rounded-xl text-sm font-bold shadow transition"
          >
            ⏭️ التقدم للدور التالي
          </button>
        </div>
      )}
      {sortedKeys.map(rKey => {
        const isKoRound = String(rKey).startsWith('KO_R');
        const matchGroups = isKoRound
          ? groupMatchesByPair(rounds[rKey])
          : rounds[rKey].map(m => [m]);

        return (
          <div key={rKey} className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700/40 shadow">
            <div className="bg-slate-900/50 px-5 py-3 border-b border-slate-700/30 flex items-center justify-between">
              <h3 className="font-black text-blue-400 text-sm">{getRoundLabel(rKey)}</h3>
              <span className="text-xs text-gray-600">{rounds[rKey].length} مباراة</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {matchGroups.map((group, gi) =>
                group.length === 2 ? (
                  // ✅ كارد ذهاب وإياب
                  <TwoLegCard
                    key={`pair-${gi}`}
                    matches={group}
                    user={user}
                    navigate={navigate}
                    referees={referees}
                    editingMatchId={editingMatchId}
                    matchForm={matchForm}
                    setEditingMatchId={setEditingMatchId}
                    setMatchForm={setMatchForm}
                    onSave={onSave}
                  />
                ) : (
                  // كارد عادي
                  <MatchCard
                    key={group[0].id}
                    m={group[0]}
                    user={user}
                    navigate={navigate}
                    referees={referees}
                    editingMatchId={editingMatchId}
                    matchForm={matchForm}
                    setEditingMatchId={setEditingMatchId}
                    setMatchForm={setMatchForm}
                    onSave={onSave}
                  />
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ==========================================
// ✅ TwoLegCard — كارد ذهاب وإياب مع مجموع الأهداف
// ==========================================
const TwoLegCard = ({ matches, user, navigate, referees, editingMatchId, matchForm,
  setEditingMatchId, setMatchForm, onSave }) => {

  const leg1 = matches.find(m => m.leg_number === 1) || matches[0];
  const leg2 = matches.find(m => m.leg_number === 2) || matches[1];

  // حساب مجموع الأهداف
  const homeId = leg1.home_team_id;
  const awayId = leg1.away_team_id;

  let totalHome = 0, totalAway = 0;
  matches.forEach(m => {
    if (m.status === 'finished') {
      if (m.home_team_id === homeId) {
        totalHome += m.score_home;
        totalAway += m.score_away;
      } else {
        totalHome += m.score_away;
        totalAway += m.score_home;
      }
    }
  });

  const bothFinished = matches.every(m => m.status === 'finished');
  const homeName = leg1.home || 'انتظار';
  const awayName = leg1.away || 'انتظار';

  const homeWinsAggregate = bothFinished && totalHome > totalAway;
  const awayWinsAggregate = bothFinished && totalAway > totalHome;

  return (
    <div className="rounded-xl border border-blue-800/30 bg-slate-800/60 overflow-hidden shadow-lg">

      {/* Header المجموع */}
      <div className="bg-blue-950/40 px-3 py-2 border-b border-blue-800/20 flex items-center justify-between">
        <span className="text-[10px] text-blue-400 font-bold">🔄 ذهاب وإياب</span>
        {bothFinished && (
          <span className="text-[10px] font-black text-white bg-slate-700 px-2 py-0.5 rounded-full">
            المجموع:{' '}
            <span className={homeWinsAggregate ? 'text-green-400' : 'text-gray-300'}>{totalHome}</span>
            {' - '}
            <span className={awayWinsAggregate ? 'text-green-400' : 'text-gray-300'}>{totalAway}</span>
          </span>
        )}
      </div>

      {/* أسماء الفريقين + المتأهل */}
      <div className="px-3 py-2 flex items-center justify-between text-xs border-b border-slate-700/20">
        <span className={`font-black truncate flex-1 ${homeWinsAggregate ? 'text-green-400' : 'text-gray-300'}`}>
          {homeName} {homeWinsAggregate && '✅'}
        </span>
        <span className="text-gray-600 px-2">vs</span>
        <span className={`font-black truncate flex-1 text-right ${awayWinsAggregate ? 'text-green-400' : 'text-gray-300'}`}>
          {awayWinsAggregate && '✅'} {awayName}
        </span>
      </div>

      {/* المبارتان */}
      <div className="divide-y divide-slate-700/20">
        {[leg1, leg2].map((m, li) => (
          <SingleLegRow
            key={m.id}
            m={m}
            legLabel={li === 0 ? 'ذهاب' : 'إياب'}
            user={user}
            navigate={navigate}
            referees={referees}
            editingMatchId={editingMatchId}
            matchForm={matchForm}
            setEditingMatchId={setEditingMatchId}
            setMatchForm={setMatchForm}
            onSave={onSave}
          />
        ))}
      </div>
    </div>
  );
};

// ==========================================
// SingleLegRow — صف مباراة واحدة داخل TwoLegCard
// ==========================================
const SingleLegRow = ({ m, legLabel, user, navigate, referees, editingMatchId, matchForm,
  setEditingMatchId, setMatchForm, onSave }) => {

  const isEditingScore = editingMatchId === `score_${m.id}`;
  const isAssigningRef = editingMatchId === `ref_${m.id}`;
  const isFinished = m.status === 'finished';
  const isPending = !m.home_team_id || !m.away_team_id;
  const homeWon = isFinished && m.score_home > m.score_away;
  const awayWon = isFinished && m.score_away > m.score_home;
  const hasReferee = !!m.referee_id || !!m.referee_name;

  const openScoreEdit = () => {
    setMatchForm({ home: m.score_home ?? 0, away: m.score_away ?? 0, referee_id: m.referee_id ? String(m.referee_id) : '', penalty_home: m.penalty_home ?? '', penalty_away: m.penalty_away ?? '' });
    setEditingMatchId(`score_${m.id}`);
  };
  const openRefEdit = () => {
    setMatchForm({ home: m.score_home ?? 0, away: m.score_away ?? 0, referee_id: m.referee_id ? String(m.referee_id) : '', penalty_home: m.penalty_home ?? '', penalty_away: m.penalty_away ?? '' });
    setEditingMatchId(`ref_${m.id}`);
  };

  return (
    <div className={`px-3 py-2 ${isPending ? 'opacity-40' : ''}`}>
      {/* تسمية الذهاب/الإياب + حكم */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
          legLabel === 'ذهاب' ? 'bg-blue-900/40 text-blue-400' : 'bg-orange-900/40 text-orange-400'
        }`}>
          {legLabel}
        </span>
        <span className={`text-[9px] ${hasReferee ? 'text-purple-400' : 'text-slate-600'}`}>
          {hasReferee ? '⚖️ ' + (m.referee_name || 'تم') : 'بدون حكم'}
        </span>
      </div>

      {/* النتيجة */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-bold truncate flex-1 ${homeWon ? 'text-green-300' : 'text-gray-300'}`}>
          {m.home || 'انتظار'}
        </span>

        {isEditingScore ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <input type="number" min="0" value={matchForm.home}
                onChange={e => setMatchForm({ ...matchForm, home: e.target.value })}
                className="w-9 bg-slate-900 border border-blue-500 rounded text-center text-white text-xs focus:outline-none" />
              <span className="text-gray-600 text-xs">-</span>
              <input type="number" min="0" value={matchForm.away}
                onChange={e => setMatchForm({ ...matchForm, away: e.target.value })}
                className="w-9 bg-slate-900 border border-blue-500 rounded text-center text-white text-xs focus:outline-none" />
            </div>
            {parseInt(matchForm.home) === parseInt(matchForm.away) && matchForm.home !== '' && (
              <div className="flex items-center gap-1 border-t border-orange-800/40 pt-1">
                <input type="number" min="0" placeholder="🎯"
                  value={matchForm.penalty_home ?? ''}
                  onChange={e => setMatchForm({ ...matchForm, penalty_home: e.target.value })}
                  className="w-9 bg-slate-900 border border-orange-500 rounded text-center text-orange-300 text-xs focus:outline-none" />
                <span className="text-orange-600 text-[9px] font-bold">ركلات</span>
                <input type="number" min="0" placeholder="🎯"
                  value={matchForm.penalty_away ?? ''}
                  onChange={e => setMatchForm({ ...matchForm, penalty_away: e.target.value })}
                  className="w-9 bg-slate-900 border border-orange-500 rounded text-center text-orange-300 text-xs focus:outline-none" />
              </div>
            )}
          </div>
        ) : (
          <span className={`text-sm font-black px-2 ${isFinished ? 'text-white' : 'text-slate-600'}`}>
            {isFinished ? `${m.score_home} - ${m.score_away}${m.penalty_home != null ? ` (🎯${m.penalty_home}-${m.penalty_away})` : ''}` : '- : -'}
          </span>
        )}

        <span className={`text-xs font-bold truncate flex-1 text-right ${awayWon ? 'text-green-300' : 'text-gray-300'}`}>
          {m.away || 'انتظار'}
        </span>
      </div>

      {/* أكشنات super_admin */}
      {user?.role === 'super_admin' && !isPending && (
        <div className="mt-2 space-y-1.5">

          {/* وضع تعيين الحكم */}
          {isAssigningRef && (
            <div className="space-y-1 animate-fadeIn">
              <select value={matchForm.referee_id}
                onChange={e => setMatchForm({ ...matchForm, referee_id: e.target.value })}
                className="w-full bg-slate-900 border border-purple-500/40 rounded text-[10px] p-1.5 text-gray-200 focus:outline-none">
                <option value="">-- اختر الحكم --</option>
                {referees.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
              </select>
              <div className="flex gap-1">
                <button onClick={() => onSave(m.id, false)} disabled={!matchForm.referee_id}
                  className={`flex-1 text-[10px] py-1 rounded font-bold transition ${matchForm.referee_id ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                  ✅ تعيين
                </button>
                <button onClick={() => setEditingMatchId(null)}
                  className="flex-1 bg-slate-700 text-gray-300 text-[10px] py-1 rounded font-bold transition hover:bg-slate-600">
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* وضع إدخال النتيجة */}
          {isEditingScore && (
            <div className="space-y-1 animate-fadeIn">
              {!hasReferee && !matchForm.referee_id && (
                <select value={matchForm.referee_id}
                  onChange={e => setMatchForm({ ...matchForm, referee_id: e.target.value })}
                  className="w-full bg-slate-900 border border-orange-500/40 rounded text-[10px] p-1.5 text-gray-200 focus:outline-none">
                  <option value="">⚠️ اختر حكم (إلزامي)</option>
                  {referees.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
                </select>
              )}
              <div className="flex gap-1">
                <button onClick={() => onSave(m.id, true)} disabled={!hasReferee && !matchForm.referee_id}
                  className={`flex-1 text-[10px] py-1 rounded font-bold transition ${(hasReferee || matchForm.referee_id) ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-700 cursor-not-allowed text-gray-500'}`}>
                  💾 حفظ
                </button>
                <button onClick={() => setEditingMatchId(null)}
                  className="flex-1 bg-red-700/50 hover:bg-red-600 text-white text-[10px] py-1 rounded font-bold transition">
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* الأزرار الافتراضية */}
          {!isEditingScore && !isAssigningRef && (
            <div className="flex gap-1">
              <button onClick={openRefEdit}
                className={`flex-1 text-[9px] py-1 rounded font-bold border transition ${hasReferee
                  ? 'text-purple-400 border-purple-800/30 hover:bg-purple-900/20'
                  : 'text-yellow-400 border-yellow-700/40 hover:bg-yellow-900/20'}`}>
                {hasReferee ? '⚖️ تغيير' : '⚖️ حكم'}
              </button>
              <button onClick={openScoreEdit}
                className={`flex-1 text-[9px] py-1 rounded font-bold border transition ${isFinished
                  ? 'text-slate-500 border-slate-700/30 hover:bg-slate-700/20'
                  : 'text-blue-400 border-blue-800/30 hover:bg-blue-900/20'}`}>
                {isFinished ? '✏️ تعديل' : '⚽ إدخال'}
              </button>
              {user?.role === 'super_admin' && (
                <button onClick={() => navigate(`/match/${m.id}/live-control`)}
                  className="flex-1 text-[9px] py-1 rounded font-bold border text-emerald-400 border-emerald-800/30 hover:bg-emerald-900/20 transition">
                  🎮 مباشر
                </button>
              )}
            </div>
          )}

          {/* حالة المباراة */}
          <div className="text-center">
            {isFinished
              ? <span className="text-[8px] text-green-500/50 bg-green-950/20 px-2 py-0.5 rounded-full">✅ منتهية</span>
              : <span className="text-[8px] text-slate-600 bg-slate-800/30 px-2 py-0.5 rounded-full">🕒 لم تنته</span>
            }
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// RefereeReportView — عرض تقرير الحكم فقط
// ==========================================
const RefereeReportView = ({ existingReport }) => {
  if (!existingReport) return null;
  return (
    <div className="border-t border-slate-700/20 mt-2 pt-2 px-3 pb-2">
      <a
        href={`http://127.0.0.1:8000${existingReport}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 text-[10px] py-1.5 rounded-lg font-bold border border-blue-700/40 text-blue-400 bg-blue-900/10 hover:bg-blue-900/20 transition w-full"
      >
        📄 عرض تقرير الحكم
      </a>
    </div>
  );
};

// ==========================================
// MatchCard — الكارد العادي (مباراة واحدة)
// ==========================================
const MatchCard = ({ m, user, navigate, referees, editingMatchId, matchForm,
  setEditingMatchId, setMatchForm, onSave }) => {

  const uniqueId = m.id;
  const isEditingScore = editingMatchId === `score_${uniqueId}`;
  const isAssigningRef = editingMatchId === `ref_${uniqueId}`;
  const isFinished = m.status === 'finished';
  const isPending = !m.home_team_id || !m.away_team_id;
  const homeWon = isFinished && m.score_home > m.score_away;
  const awayWon = isFinished && m.score_away > m.score_home;
  const hasReferee = !!m.referee_id || !!m.referee_name;

  const openScoreEdit = () => {
    setMatchForm({ home: m.score_home ?? 0, away: m.score_away ?? 0, referee_id: m.referee_id ? String(m.referee_id) : '', penalty_home: m.penalty_home ?? '', penalty_away: m.penalty_away ?? '' });
    setEditingMatchId(`score_${uniqueId}`);
  };
  const openRefEdit = () => {
    setMatchForm({ home: m.score_home ?? 0, away: m.score_away ?? 0, referee_id: m.referee_id ? String(m.referee_id) : '', penalty_home: m.penalty_home ?? '', penalty_away: m.penalty_away ?? '' });
    setEditingMatchId(`ref_${uniqueId}`);
  };

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-200 flex flex-col
      ${isFinished
        ? 'border-green-900/20 bg-slate-800/30'
        : isPending
          ? 'border-slate-700/15 bg-slate-900/20 opacity-50'
          : 'border-slate-600/50 bg-slate-800/60 hover:border-blue-600/40 hover:shadow-lg'
      }`}>

      {/* Header */}
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-700/20 min-h-[30px]">
        <span className={`text-[10px] ${hasReferee ? 'text-purple-400' : 'text-slate-600 italic'}`}>
          {hasReferee ? '⚖️ ' + (m.referee_name || 'تم التعيين') : 'بدون حكم'}
        </span>
        {user?.role === 'super_admin' && !isPending && (
          <button
            onClick={() => navigate(`/match/${m.id}/live-control`)}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold transition bg-emerald-950/30 border border-emerald-800/30 px-2 py-0.5 rounded-full"
          >
            🎮 مباشر
          </button>
        )}
      </div>

      {/* Teams + Score */}
      <div className="px-4 py-3 flex-1">
        <div className={`flex items-center justify-between py-1.5 ${homeWon ? 'text-green-300' : 'text-gray-200'}`}>
          <span className="font-bold text-sm truncate flex-1">{m.home || 'انتظار'}</span>
          {isEditingScore
            ? <input type="number" min="0" value={matchForm.home}
                onChange={e => setMatchForm({ ...matchForm, home: e.target.value })}
                className="w-12 bg-slate-900 border border-blue-500 rounded-lg text-center font-black text-white text-sm focus:outline-none" />
            : <span className={`text-xl font-black w-8 text-center ${homeWon ? 'text-green-400' : isFinished ? 'text-white' : 'text-slate-600'}`}>
                {isFinished ? m.score_home : '-'}
              </span>
          }
        </div>
        <div className="border-t border-slate-700/20 my-1" />
        <div className={`flex items-center justify-between py-1.5 ${awayWon ? 'text-green-300' : 'text-gray-200'}`}>
          <span className="font-bold text-sm truncate flex-1">{m.away || 'انتظار'}</span>
          {isEditingScore
            ? <input type="number" min="0" value={matchForm.away}
                onChange={e => setMatchForm({ ...matchForm, away: e.target.value })}
                className="w-12 bg-slate-900 border border-blue-500 rounded-lg text-center font-black text-white text-sm focus:outline-none" />
            : <span className={`text-xl font-black w-8 text-center ${awayWon ? 'text-green-400' : isFinished ? 'text-white' : 'text-slate-600'}`}>
                {isFinished ? m.score_away : '-'}
              </span>
          }
        </div>

        {/* ✅ ركلات الترجيح — فقط في الإقصاء وليس في المجموعات */}
        {isEditingScore && !m.group_name && parseInt(matchForm.home) === parseInt(matchForm.away) && matchForm.home !== '' && (
          <div className="mt-2 border-t border-orange-800/30 pt-2">
            <p className="text-[10px] text-orange-400 font-bold text-center mb-1.5">🎯 ركلات الترجيح</p>
            <div className="flex items-center justify-between gap-2">
              <input type="number" min="0" placeholder="0"
                value={matchForm.penalty_home ?? ''}
                onChange={e => setMatchForm({ ...matchForm, penalty_home: e.target.value })}
                className="w-12 bg-slate-900 border border-orange-500 rounded-lg text-center font-black text-orange-300 text-sm focus:outline-none" />
              <span className="text-orange-600 text-xs font-bold">pen.</span>
              <input type="number" min="0" placeholder="0"
                value={matchForm.penalty_away ?? ''}
                onChange={e => setMatchForm({ ...matchForm, penalty_away: e.target.value })}
                className="w-12 bg-slate-900 border border-orange-500 rounded-lg text-center font-black text-orange-300 text-sm focus:outline-none" />
            </div>
          </div>
        )}

        {/* عرض ركلات الترجيح المحفوظة — فقط إقصاء */}
        {!isEditingScore && isFinished && m.penalty_home != null && !m.group_name && (
          <div className="mt-1 text-center border-t border-orange-800/20 pt-1">
            <span className="text-[10px] text-orange-400">
              🎯 ركلات: {m.penalty_home} - {m.penalty_away}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {user?.role === 'super_admin' && !isPending && (
        <div className="border-t border-slate-700/20 px-3 py-2 space-y-1.5">
          {isAssigningRef && (
            <div className="space-y-1.5 animate-fadeIn">
              <p className="text-[10px] text-purple-300 font-bold text-center">⚖️ تعيين الحكم</p>
              <select value={matchForm.referee_id}
                onChange={e => setMatchForm({ ...matchForm, referee_id: e.target.value })}
                className="w-full bg-slate-900 border border-purple-500/40 rounded-lg text-xs p-2 text-gray-200 focus:outline-none">
                <option value="">-- اختر الحكم --</option>
                {referees.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={() => onSave(m.id, false)} disabled={!matchForm.referee_id}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-black transition ${matchForm.referee_id ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                  ✅ تعيين
                </button>
                <button onClick={() => setEditingMatchId(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-gray-300 text-xs py-1.5 rounded-lg font-bold transition">
                  إلغاء
                </button>
              </div>
            </div>
          )}
          {isEditingScore && (
            <div className="space-y-1.5 animate-fadeIn">
              <p className="text-[10px] text-blue-300 font-bold text-center">⚽ تسجيل النتيجة</p>
              {!hasReferee && !matchForm.referee_id && (
                <select value={matchForm.referee_id}
                  onChange={e => setMatchForm({ ...matchForm, referee_id: e.target.value })}
                  className="w-full bg-slate-900 border border-orange-500/40 rounded-lg text-xs p-2 text-gray-200 focus:outline-none">
                  <option value="">⚠️ لا يوجد حكم — اختر (إلزامي)</option>
                  {referees.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
                </select>
              )}
              {(hasReferee || matchForm.referee_id) && (
                <p className="text-[9px] text-purple-400/60 text-center">⚖️ الحكم: {m.referee_name || 'تم الاختيار'}</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => onSave(m.id, true)} disabled={!hasReferee && !matchForm.referee_id}
                  className={`flex-1 text-white text-xs py-2 rounded-lg font-black transition ${(hasReferee || matchForm.referee_id) ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 cursor-not-allowed'}`}>
                  💾 حفظ النتيجة
                </button>
                <button onClick={() => setEditingMatchId(null)}
                  className="flex-1 bg-red-700/50 hover:bg-red-600 text-white text-xs py-2 rounded-lg font-bold transition">
                  إلغاء
                </button>
              </div>
            </div>
          )}
          {!isEditingScore && !isAssigningRef && (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <button onClick={openRefEdit}
                  className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold border transition ${hasReferee
                    ? 'text-purple-400 border-purple-800/30 hover:bg-purple-900/20'
                    : 'text-yellow-400 border-yellow-700/40 hover:bg-yellow-900/20'}`}>
                  {hasReferee ? '⚖️ تغيير' : '⚖️ تعيين حكم'}
                </button>
                <button onClick={openScoreEdit}
                  className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold border transition ${isFinished
                    ? 'text-slate-500 border-slate-700/30 hover:bg-slate-700/20'
                    : 'text-blue-400 border-blue-800/30 hover:bg-blue-900/20'}`}>
                  {isFinished ? '✏️ تعديل' : '⚽ إدخال'}
                </button>
              </div>
              <div className="text-center">
                {isFinished
                  ? <span className="text-[9px] text-green-500/50 bg-green-950/20 px-2 py-0.5 rounded-full">✅ منتهية</span>
                  : <span className="text-[9px] text-slate-600 bg-slate-800/30 px-2 py-0.5 rounded-full">🕒 لم تنته</span>
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* عرض تقرير الحكم لو موجود */}
      {isFinished && !isPending && m.referee_report && (
        <RefereeReportView existingReport={m.referee_report} />
      )}
    </div>
  );
};

// ==========================================
// ChampionsLeagueBracket
// ==========================================
const ChampionsLeagueBracket = ({ matches, teams, isMixed, readOnly }) => {
  const knockoutMatches = matches.filter(m => !m.group_name);
  const rounds = {};
  knockoutMatches.forEach(m => {
    const rKey = String(m.round_number);
    if (!rounds[rKey]) rounds[rKey] = [];
    rounds[rKey].push(m);
  });

  const roundKeys = Object.keys(rounds).sort((a, b) => {
    const extractNum = (k) => {
      if (k.startsWith('KO_R')) return parseInt(k.replace('KO_R', ''));
      return parseInt(k.replace(/\D/g, '')) || 0;
    };
    return extractNum(a) - extractNum(b);
  });

  if (roundKeys.length === 0) {
    return (
      <div className="text-center text-gray-500 py-20 bg-slate-800/30 rounded-xl border border-slate-700/40">
        <div className="text-6xl mb-4 opacity-20">🌳</div>
        <p className="text-xl">لا توجد أدوار إقصائية بعد</p>
      </div>
    );
  }

  const totalRounds = roundKeys.length;

  const getRoundTitle = (rKey) => {
    // نحسب عدد الأزواج الحقيقية
    const rMatches = rounds[rKey] || [];
    const realMatches = rMatches.filter(m => m.home_team_id);
    const uniquePairs = new Set();
    realMatches.forEach(m => {
      uniquePairs.add([m.home_team_id, m.away_team_id].sort().join('-'));
    });
    const pairCount = uniquePairs.size || Math.ceil(rMatches.length / 2);
    if (pairCount === 1) return '🏆 النهائي';
    if (pairCount === 2) return 'نصف النهائي';
    if (pairCount === 4) return 'ربع النهائي';
    if (pairCount === 8) return 'دور الـ16';
    return `الدور ${roundKeys.indexOf(rKey) + 1}`;
  };

  const lastRoundKey = roundKeys[totalRounds - 1];
  const hasFinalRound = getRoundTitle(lastRoundKey).includes('النهائي');
  const finalMatches = hasFinalRound
    ? (rounds[lastRoundKey] || []).filter(m => m.home_team_id || !m.home_team_id)
    : [];

  // للشجرة نعرض فقط المباراة الأولى من كل زوج (الذهاب) في الـ bracket
  const getRepresentativeMatch = (rKey) => {
    const rMatches = rounds[rKey] || [];
    const seen = new Set();
    return rMatches.filter(m => {
      if (!m.home_team_id && !m.away_team_id) {
        // placeholder
        return true;
      }
      const key = [m.home_team_id, m.away_team_id].sort().join('-');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const splitRounds = {};
  roundKeys.forEach(rKey => {
    const all = getRepresentativeMatch(rKey);
    const half = Math.ceil(all.length / 2);
    splitRounds[rKey] = { right: all.slice(0, half), left: all.slice(half) };
  });

  const preRounds = hasFinalRound ? roundKeys.slice(0, totalRounds - 1) : roundKeys;
  const rightRounds = preRounds;
  const leftRounds = [...preRounds].reverse();
  const getColHeight = (n) => n >= 8 ? 800 : n >= 4 ? 560 : n >= 2 ? 340 : 200;

  const TeamLogo = ({ name }) => {
    if (!name || name === 'انتظار') {
      return (
        <div className="w-8 h-8 rounded-full bg-slate-700/50 border border-slate-600/30 flex items-center justify-center">
          <span className="text-gray-600 text-[10px]">؟</span>
        </div>
      );
    }
    const teamData = teams?.find(t => t.name === name);
    if (teamData?.logo) {
      return <img src={`http://127.0.0.1:8000${teamData.logo}`} alt={name} className="w-8 h-8 object-contain rounded" />;
    }
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  };

  // في الـ bracket نعرض المجموع إذا كان ذهاب وإياب
  const getAggregateScore = (m) => {
    const rMatches = rounds[String(m.round_number)] || [];
    const pairMatches = rMatches.filter(rm =>
      (rm.home_team_id === m.home_team_id && rm.away_team_id === m.away_team_id) ||
      (rm.home_team_id === m.away_team_id && rm.away_team_id === m.home_team_id)
    );
    if (pairMatches.length <= 1) return null;
    let homeTotal = 0, awayTotal = 0;
    pairMatches.forEach(pm => {
      if (pm.home_team_id === m.home_team_id) {
        homeTotal += pm.score_home || 0;
        awayTotal += pm.score_away || 0;
      } else {
        homeTotal += pm.score_away || 0;
        awayTotal += pm.score_home || 0;
      }
    });
    const allFinished = pairMatches.every(pm => pm.status === 'finished');
    return allFinished ? { home: homeTotal, away: awayTotal } : null;
  };

  const BracketCard = ({ m, isFinal }) => {
    const agg = getAggregateScore(m);
    const displayScore = agg || (m.status === 'finished' ? { home: m.score_home, away: m.score_away } : null);
    const homeWon = displayScore && displayScore.home > displayScore.away;
    const awayWon = displayScore && displayScore.away > displayScore.home;
    const isFinished = !!displayScore;

    return (
      <div
        className={`rounded-xl overflow-hidden border transition hover:-translate-y-0.5 hover:shadow-xl
          ${isFinal ? 'border-yellow-500/40 shadow-yellow-500/10 shadow-lg' : 'border-slate-600/30 hover:border-blue-500/30'}`}
        style={{
          background: isFinal
            ? 'linear-gradient(160deg,#1e1a08,#2a1f05)'
            : 'linear-gradient(160deg,#171e2f,#111827)',
          minWidth: 180
        }}
      >
        <div className={`flex items-center gap-2 px-3 py-2.5 border-b border-slate-700/20 ${homeWon ? 'bg-green-950/30' : ''}`}>
          <TeamLogo name={m.home} />
          <span className={`text-xs font-bold flex-1 truncate ${homeWon ? 'text-green-300' : 'text-gray-300'}`}>
            {m.home || <span className="text-gray-600 italic">انتظار</span>}
          </span>
          {isFinished && (
            <span className={`text-sm font-black w-6 text-center rounded ${homeWon ? 'text-green-400' : 'text-gray-300'}`}>
              {displayScore.home}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-2 px-3 py-2.5 ${awayWon ? 'bg-green-950/30' : ''}`}>
          <TeamLogo name={m.away} />
          <span className={`text-xs font-bold flex-1 truncate ${awayWon ? 'text-green-300' : 'text-gray-300'}`}>
            {m.away || <span className="text-gray-600 italic">انتظار</span>}
          </span>
          {isFinished && (
            <span className={`text-sm font-black w-6 text-center rounded ${awayWon ? 'text-green-400' : 'text-gray-300'}`}>
              {displayScore.away}
            </span>
          )}
        </div>
        {!isFinished && (
          <div className="px-3 py-1 text-center">
            <span className="text-[9px] text-gray-600 bg-slate-800/40 px-2 py-0.5 rounded-full">
              {agg === null && m.status !== 'finished' ? 'لم تلعب بعد' : 'جارية'}
            </span>
          </div>
        )}
        {agg && (
          <div className="px-3 py-1 text-center border-t border-slate-700/20">
            <span className="text-[9px] text-blue-400/60">مجموع: {agg.home} - {agg.away}</span>
          </div>
        )}
      </div>
    );
  };

  const BracketConnector = ({ side, matchCount, colHeight }) => {
    if (matchCount < 2) return <div style={{ width: 24 }} />;
    const lines = [];
    const pairCount = Math.ceil(matchCount / 2);
    for (let i = 0; i < pairCount; i++) {
      const t = (i * 2 + 0.5) / matchCount * 100;
      const b = (i * 2 + 1.5) / matchCount * 100;
      const mid = (t + b) / 2;
      const xIn = 12, xOut = side === 'right' ? 0 : 24, xEnd = side === 'right' ? 24 : 0;
      lines.push(
        <g key={i}>
          <line x1={xOut} y1={`${t}%`} x2={xIn} y2={`${t}%`} stroke="rgba(59,130,246,0.25)" strokeWidth="1.5" />
          <line x1={xOut} y1={`${b}%`} x2={xIn} y2={`${b}%`} stroke="rgba(59,130,246,0.25)" strokeWidth="1.5" />
          <line x1={xIn} y1={`${t}%`} x2={xIn} y2={`${b}%`} stroke="rgba(59,130,246,0.25)" strokeWidth="1.5" />
          <line x1={xIn} y1={`${mid}%`} x2={xEnd} y2={`${mid}%`} stroke="rgba(59,130,246,0.35)" strokeWidth="1.5" />
          <circle cx={xIn} cy={`${mid}%`} r="2.5" fill="rgba(59,130,246,0.35)" />
        </g>
      );
    }
    return <svg width="24" style={{ minHeight: colHeight, alignSelf: 'stretch' }}>{lines}</svg>;
  };

  return (
    <div
      className="w-full overflow-x-auto pb-8 rounded-2xl border border-slate-700/20 shadow-2xl relative"
      style={{ background: 'linear-gradient(160deg,#06090f 0%,#0a1020 50%,#06090f 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(99,140,255,0.3) 1px, transparent 1px)', backgroundSize: '34px 34px' }}
      />
      <div className="relative z-10 p-6">
        <div className="text-center mb-8">
          <span className="inline-block bg-slate-800/50 border border-slate-700/40 px-5 py-1.5 rounded-full text-blue-300 text-xs font-black tracking-widest uppercase">
            🏆 شجرة البطولة
          </span>
          {readOnly && (
            <p className="text-gray-600 text-xs mt-2">
              لعرض النتائج فقط — أدخل النتائج من تاب <span className="text-blue-500">المباريات</span>
            </p>
          )}
        </div>

        <div className="flex flex-row items-center justify-center gap-0 min-w-max mx-auto">
          {rightRounds.map((rKey, i) => {
            const matchList = splitRounds[rKey]?.right || [];
            const colHeight = getColHeight(matchList.length);
            const isLast = i === rightRounds.length - 1;
            return (
              <div key={`r-${rKey}`} className="flex flex-row items-stretch">
                <div className="flex flex-col" style={{ width: 200 }}>
                  <div className="text-center mb-3">
                    <span className="inline-block bg-slate-800/60 border border-slate-700/30 text-blue-400/80 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg">
                      {getRoundTitle(rKey)}
                    </span>
                  </div>
                  <div className="flex flex-col justify-around flex-1" style={{ minHeight: colHeight }}>
                    {matchList.map(m => <div key={m.id} className="py-2 px-1"><BracketCard m={m} /></div>)}
                  </div>
                </div>
                {isLast && <BracketConnector side="right" matchCount={matchList.length} colHeight={colHeight} />}
              </div>
            );
          })}

          {/* النهائي */}
          <div className="flex flex-col items-center justify-center mx-4 relative z-20" style={{ minWidth: 220 }}>
            <div className="text-center mb-4">
              <span className="inline-block bg-gradient-to-r from-yellow-700/30 to-yellow-500/10 border border-yellow-600/30 text-yellow-300 text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-lg">
                🏆 النهائي
              </span>
            </div>
            <div className="relative mb-5">
              <div
                className="absolute inset-0 blur-3xl opacity-15 rounded-full"
                style={{ background: 'radial-gradient(#fbbf24,transparent)' }}
              />
              <div className="text-[70px] leading-none relative z-10 select-none" style={{ animation: 'floatCup 4s ease-in-out infinite' }}>
                🏆
              </div>
            </div>
            <div className="w-full space-y-3">
              {finalMatches.map(m => <BracketCard key={m.id} m={m} isFinal />)}
            </div>
            <div className="mt-5">
              <span className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black px-5 py-2 rounded-full text-xs font-black shadow-lg shadow-yellow-500/20">
                ⭐ بطل البطولة ⭐
              </span>
            </div>
          </div>

          {leftRounds.map((rKey, i) => {
            const matchList = splitRounds[rKey]?.left || [];
            const colHeight = getColHeight(matchList.length);
            const isFirst = i === 0;
            return (
              <div key={`l-${rKey}`} className="flex flex-row items-stretch">
                {isFirst && <BracketConnector side="left" matchCount={matchList.length} colHeight={colHeight} />}
                <div className="flex flex-col" style={{ width: 200 }}>
                  <div className="text-center mb-3">
                    <span className="inline-block bg-slate-800/60 border border-slate-700/30 text-blue-400/80 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg">
                      {getRoundTitle(rKey)}
                    </span>
                  </div>
                  <div className="flex flex-col justify-around flex-1" style={{ minHeight: colHeight }}>
                    {matchList.map(m => <div key={m.id} className="py-2 px-1"><BracketCard m={m} /></div>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes floatCup { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .animate-fadeIn { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default TournamentDetails;