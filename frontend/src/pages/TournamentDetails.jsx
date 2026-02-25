import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // حالة العرض للدوري
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRound, setMaxRound] = useState(1);
  
  const [trophyUrl, setTrophyUrl] = useState('');
  const [showTrophyForm, setShowTrophyForm] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [scoreForm, setScoreForm] = useState({ home: '', away: '' });

  useEffect(() => {
    fetchTournament();
    if (tournament?.type === 'league') fetchStandings();
  }, [id, currentRound]); // إعادة التحميل عند تغيير الجولة

  const fetchTournament = async () => {
    try {
      const res = await api.get(`/tournaments/${id}`);
      const data = res.data;
      setTournament(data);
      if (data.trophy_image) setTrophyUrl(data.trophy_image);
      
      if (data.type === 'league' && data.matches.length > 0) {
        const rounds = Math.max(...data.matches.map(m => m.round_number));
        setMaxRound(rounds);
        // العثور على أول جولة غير مكتملة تلقائياً
        const firstIncomplete = findFirstIncompleteRound(data.matches);
        if (firstIncomplete) setCurrentRound(firstIncomplete);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchStandings = async () => {
    try {
      const res = await api.get(`/tournaments/${id}/standings`);
      setStandings(res.data);
    } catch (error) { console.error(error); }
  };

  const findFirstIncompleteRound = (matches) => {
    const rounds = {};
    matches.forEach(m => {
      if (!rounds[m.round_number]) rounds[m.round_number] = [];
      rounds[m.round_number].push(m);
    });
    for (let r = 1; r <= Object.keys(rounds).length; r++) {
      if (rounds[r] && rounds[r].some(m => m.status !== 'finished')) return r;
    }
    return Object.keys(rounds).length; // العودة للأخيرة إذا كلها انتهت
  };

  const handleGenerateMatches = async () => {
    if (!window.confirm("إجراء القرعة؟")) return;
    try {
      await api.post(`/tournaments/${id}/generate-matches`);
      alert("✅ تم التوليد!"); fetchTournament(); fetchStandings();
    } catch (e) { alert("❌ " + (e.response?.data?.detail || "")); }
  };

  const handleNextAction = async () => {
    try {
      const res = await api.post(`/tournaments/${id}/next-round`);
      alert(res.data.message);
      if (tournament.type === 'league') {
        const nextR = currentRound + 1;
        if (nextR <= maxRound) setCurrentRound(nextR);
        fetchTournament(); fetchStandings();
      } else {
        fetchTournament(); // للخروج المغلوب
      }
    } catch (e) { alert("⚠️ " + (e.response?.data?.detail || "")); }
  };

  const handleUpdateMatch = async (matchId) => {
    try {
      await api.post(`/matches/update-details?match_id=${matchId}`, {
        score_home: parseInt(scoreForm.home) || 0,
        score_away: parseInt(scoreForm.away) || 0,
        status: 'finished'
      });
      alert("✅ تم الحفظ!"); setEditingMatchId(null); fetchTournament(); fetchStandings();
    } catch (e) { alert("❌ فشل"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">جاري التحميل...</div>;
  if (!tournament) return <div className="text-center text-red-500 mt-10">البطولة غير موجودة</div>;

  const isLeague = tournament.type === 'league';
  const currentRoundMatches = tournament.matches.filter(m => m.round_number === currentRound);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans pb-10">
      
      {/* الرأس */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-900 p-6 shadow-xl border-b border-blue-800 sticky top-0 z-50">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/dashboard')} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded text-sm font-bold">🔙 عودة</button>
            <div>
              <h1 className="text-2xl font-bold uppercase">{tournament.name}</h1>
              <p className="text-blue-300 text-sm">{isLeague ? 'دوري' : 'خروج مغلوب'} • الجولة {currentRound} من {maxRound}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {user?.role === 'super_admin' && (
              <>
                <button onClick={handleGenerateMatches} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded text-sm font-bold">🎲 قرعة</button>
                <button onClick={handleNextAction} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm font-bold">
                  {isLeague ? 'التالي ⏭️' : 'نقل الفائزين ⏭️'}
                </button>
                <button onClick={() => navigate(`/tournament/${id}/statistics/advanced`)} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-sm font-bold">📊 إحصائيات</button>
              </>
            )}
            <button onClick={logout} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm">خروج</button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* القسم الأيمن: جدول الترتيب (دائم الظهور في الدوري) */}
        <div className="lg:col-span-1 space-y-6">
          {isLeague ? (
            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden sticky top-24">
              <div className="bg-slate-900 p-4 border-b border-slate-700">
                <h2 className="font-bold text-yellow-500 flex items-center gap-2">🏆 جدول الترتيب</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-700 text-xs uppercase text-gray-300">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">الفريق</th>
                      <th className="p-2 text-center">لعب</th>
                      <th className="p-2 text-center">نقاط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {standings.map((team, idx) => (
                      <tr key={team.id} className={`hover:bg-slate-700 ${idx < 4 ? 'text-green-400' : idx >= standings.length - 3 ? 'text-red-400' : ''}`}>
                        <td className="p-2 font-mono">{idx + 1}</td>
                        <td className="p-2 font-bold truncate max-w-[120px]">{team.name}</td>
                        <td className="p-2 text-center text-gray-400">{team.played}</td>
                        <td className="p-2 text-center font-bold text-white bg-slate-800 rounded">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-2 text-xs text-gray-500 bg-slate-900 flex justify-between">
                <span className="text-green-500">● تأهل</span>
                <span className="text-red-500">● هبوط</span>
              </div>
            </div>
          ) : (
            // بطاقة الكأس للخروج المغلوب
            <div className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700 sticky top-24">
              <div className="text-6xl mb-4 animate-pulse">🏆</div>
              <h3 className="font-bold text-xl">نظام خروج المغلوب</h3>
              <p className="text-gray-400 text-sm mt-2">الفائز ينتقل، والخاسر يخرج!</p>
            </div>
          )}
        </div>

        {/* القسم الأيسر: المباريات */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* شريط التنقل بين الجولات (للدوري فقط) */}
          {isLeague && (
            <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
              <button 
                disabled={currentRound === 1}
                onClick={() => setCurrentRound(c => c - 1)}
                className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ◀ السابق
              </button>
              <span className="font-bold text-lg text-blue-400">الجولة {currentRound} / {maxRound}</span>
              <button 
                disabled={currentRound === maxRound}
                onClick={() => setCurrentRound(c => c + 1)}
                className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي ▶
              </button>
            </div>
          )}

          {/* قائمة المباريات */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-300 border-r-4 border-blue-500 pr-3">
              {isLeague ? `مباريات الجولة ${currentRound}` : `الدور ${currentRound}`}
            </h3>
            
            {currentRoundMatches.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-slate-800 rounded-lg">لا توجد مباريات في هذه الجولة.</div>
            ) : (
              currentRoundMatches.map(m => (
                <div key={m.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-blue-500 transition">
                  <div className="flex-1 w-full flex justify-between items-center bg-slate-900 p-3 rounded">
                    <span className="font-bold w-1/3 truncate text-right">{m.home}</span>
                    
                    {editingMatchId === m.id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" className="w-12 bg-slate-800 border border-blue-500 rounded text-center p-1" value={scoreForm.home} onChange={e => setScoreForm({...scoreForm, home: e.target.value})} />
                        <span className="font-bold">-</span>
                        <input type="number" className="w-12 bg-slate-800 border border-blue-500 rounded text-center p-1" value={scoreForm.away} onChange={e => setScoreForm({...scoreForm, away: e.target.value})} />
                      </div>
                    ) : (
                      <div className="w-1/3 text-center font-mono font-bold text-xl bg-slate-800 px-3 py-1 rounded">
                        {m.status === 'finished' ? `${m.score_home} - ${m.score_away}` : <span className="text-gray-600 text-sm">VS</span>}
                      </div>
                    )}
                    
                    <span className="font-bold w-1/3 truncate text-left">{m.away}</span>
                  </div>

                  <div className="w-full sm:w-auto">
                    {editingMatchId === m.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateMatch(m.id)} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm font-bold">حفظ</button>
                        <button onClick={() => setEditingMatchId(null)} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-sm">إلغاء</button>
                      </div>
                    ) : (
                      m.status !== 'finished' && m.home !== 'انتظار' && user?.role === 'super_admin' && (
                        <button onClick={() => { setEditingMatchId(m.id); setScoreForm({home:'', away:''}); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold">
                          إدخال النتيجة
                        </button>
                      )
                    )}
                    {m.status === 'finished' && <span className="block text-center text-green-500 text-xs font-bold mt-1">انتهت</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentDetails;