import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const TournamentBracket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRound, setMaxRound] = useState(1);
  
  const [editingMatch, setEditingMatch] = useState(null);
  const [scoreForm, setScoreForm] = useState({ home: '', away: '' });
  const [referees, setReferees] = useState([]);
  const [matchReferee, setMatchReferee] = useState('');

  useEffect(() => {
    fetchReferees();
    fetchTournament();
  }, [id]);

  const fetchReferees = async () => {
    try {
      const res = await api.get('/referees');
      setReferees(res.data);
    } catch (error) { console.error(error); }
  };

  const fetchTournament = async () => {
    try {
      const res = await api.get(`/tournaments/${id}`);
      const data = res.data;
      setTournament(data);
      
      if (data.matches.length > 0) {
        const roundNumbers = data.matches
          .map(m => typeof m.round_number === 'string' ? parseInt(m.round_number.replace(/\D/g,'')) || 1 : m.round_number)
          .filter(n => !isNaN(n));
        
        if (roundNumbers.length > 0) {
          setMaxRound(Math.max(...roundNumbers));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateScore = async (matchId) => {
    if (!matchReferee) {
      alert("⚠️ يجب اختيار حكم أولاً!");
      return;
    }
    try {
      const formData = new FormData();
      formData.append('score_home', parseInt(scoreForm.home));
      formData.append('score_away', parseInt(scoreForm.away));
      formData.append('status', 'finished');
      formData.append('referee_id', matchReferee);
      
      await api.post(`/matches/update-details?match_id=${matchId}`, formData);
      alert("✅ تم حفظ النتيجة!");
      setEditingMatch(null);
      fetchTournament();
    } catch (error) {
      alert("❌ فشل الحفظ: " + (error.response?.data?.detail || ""));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">جاري التحميل...</div>;
  if (!tournament) return <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">البطولة غير موجودة</div>;

  const roundMatches = tournament.matches.filter(m => {
    const mRound = typeof m.round_number === 'string' ? parseInt(m.round_number.replace(/\D/g,'')) || 1 : m.round_number;
    return mRound === currentRound;
  });

  const isFinal = currentRound === maxRound;
  
  const champion = isFinal && roundMatches.length === 1 && roundMatches[0].status === 'finished' 
    ? (roundMatches[0].score_home > roundMatches[0].score_away ? roundMatches[0].home : roundMatches[0].away)
    : null;

  const getRoundName = (roundNum, total) => {
    if (total === 1) return "النهائي";
    if (roundNum === total) return "النهائي";
    if (roundNum === total - 1) return "نصف النهائي";
    if (roundNum === total - 2) return "ربع النهائي";
    return `الدور ${roundNum}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans overflow-x-auto pb-10">
      {/* الرأس */}
      <div className="relative bg-gradient-to-b from-blue-900 to-slate-900 p-8 text-center border-b border-blue-700 shadow-2xl min-w-[800px]">
        <button onClick={() => navigate(`/tournament/${id}`)} className="absolute top-4 left-4 text-gray-400 hover:text-white transition flex items-center gap-2 bg-slate-800 px-3 py-1 rounded">
          🔙 عودة
        </button>
        
        <h1 className="text-4xl font-bold mb-2 tracking-wider uppercase">{tournament.name}</h1>
        <p className="text-blue-300 mb-6">شجرة البطولة - خروج مغلوب</p>
        
        {tournament.trophy_image ? (
          <div className="mx-auto w-32 h-32 mb-4 relative group">
             <img src={tournament.trophy_image} alt="Trophy" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]" />
          </div>
        ) : (
          <div className="text-6xl mb-4 animate-bounce">🏆</div>
        )}

        {champion && (
          <div className="mt-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-8 py-3 rounded-full inline-block font-bold text-xl shadow-lg animate-pulse border-2 border-white">
            🏆 البطل: {champion} 🏆
          </div>
        )}
      </div>

      {/* شريط التنقل */}
      <div className="sticky top-0 z-20 bg-slate-800/95 backdrop-blur p-4 flex justify-center items-center gap-6 border-b border-slate-700 shadow-lg min-w-[800px]">
        <button 
          disabled={currentRound === 1}
          onClick={() => setCurrentRound(c => c - 1)}
          className="px-6 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold"
        >
          ◀ السابق
        </button>
        
        <span className="text-xl font-bold text-blue-400 bg-slate-900 px-8 py-2 rounded-xl border border-blue-900 shadow-inner min-w-[200px]">
          {getRoundName(currentRound, maxRound)}
        </span>

        <button 
          disabled={currentRound === maxRound}
          onClick={() => setCurrentRound(c => c + 1)}
          className="px-6 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold"
        >
          التالي ▶
        </button>
      </div>

      {/* المباريات */}
      <div className="p-8 min-w-[800px] flex flex-col items-center justify-center gap-6 mt-8">
        {roundMatches.length === 0 ? (
          <div className="text-gray-500 text-xl bg-slate-800 p-6 rounded-lg">لا توجد مباريات في هذا الدور بعد.</div>
        ) : (
          roundMatches.map((match) => (
            <div key={match.id} className="relative w-full max-w-2xl bg-slate-800 rounded-xl overflow-hidden shadow-xl border border-slate-700 hover:border-blue-500 transition-all duration-300 group">
              
              {!isFinal && (
                <div className="absolute -right-12 top-1/2 w-12 h-0.5 bg-gradient-to-r from-slate-600 to-transparent hidden lg:block"></div>
              )}

              <div className="flex flex-col divide-y divide-slate-700">
                {/* المضيف */}
                <div className="flex justify-between items-center p-5 bg-slate-800/50">
                  <span className="font-bold text-lg w-1/2 truncate text-left dir-ltr">{match.home}</span>
                  {editingMatch === match.id ? (
                    <input type="number" value={scoreForm.home} onChange={(e) => setScoreForm({...scoreForm, home: e.target.value})} className="w-14 text-center bg-slate-900 border-2 border-blue-500 rounded-lg text-white font-bold text-xl p-1" />
                  ) : (
                    <span className={`text-2xl font-bold ${match.status === 'finished' ? 'text-white' : 'text-gray-600'}`}>
                      {match.status === 'finished' ? match.score_home : '-'}
                    </span>
                  )}
                </div>

                {/* الضيف */}
                <div className="flex justify-between items-center p-5 bg-slate-800/50">
                  <span className="font-bold text-lg w-1/2 truncate text-left dir-ltr">{match.away}</span>
                  {editingMatch === match.id ? (
                    <input type="number" value={scoreForm.away} onChange={(e) => setScoreForm({...scoreForm, away: e.target.value})} className="w-14 text-center bg-slate-900 border-2 border-blue-500 rounded-lg text-white font-bold text-xl p-1" />
                  ) : (
                    <span className={`text-2xl font-bold ${match.status === 'finished' ? 'text-white' : 'text-gray-600'}`}>
                      {match.status === 'finished' ? match.score_away : '-'}
                    </span>
                  )}
                </div>
              </div>

              {/* طبقة التفاعل */}
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm p-4">
                {editingMatch === match.id ? (
                  <>
                    <div className="w-full max-w-xs mb-2">
                      <label className="text-xs text-gray-300 block mb-1">الحكم:</label>
                      <select 
                        className="w-full bg-slate-900 border border-gray-600 rounded p-2 text-sm text-white"
                        value={matchReferee}
                        onChange={(e) => setMatchReferee(e.target.value)}
                      >
                        <option value="">اختر حكماً</option>
                        {referees.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleUpdateScore(match.id)} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg">حفظ</button>
                      <button onClick={() => setEditingMatch(null)} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg">إلغاء</button>
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={() => { 
                      setEditingMatch(match.id); 
                      setScoreForm({home: match.score_home, away: match.score_away}); 
                      setMatchReferee(match.referee_id || '');
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold shadow-lg transform hover:scale-105 transition flex items-center gap-2"
                  >
                    {match.status === 'finished' ? '✏️ تعديل النتيجة' : '⚽ إدخال النتيجة'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TournamentBracket;