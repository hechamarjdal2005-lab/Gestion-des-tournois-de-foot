import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

const TeamManagerDashboard = () => {
  const { user, logout } = useAuthStore();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // حالات إضافة لاعب
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
  // تحديث الحالة لتشمل الإيميل
  const [newPlayer, setNewPlayer] = useState({ name: '', position: 'Midfielder', email: '' });
  const [playerMessage, setPlayerMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const teamRes = await api.get('/me/team');
      setTeam(teamRes.data);
      const playersRes = await api.get('/me/players');
      setPlayers(playersRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/players', newPlayer);
      setPlayerMessage({ text: '✅ تم إضافة اللاعب وإرسال الدعوة لإيميله!', type: 'success' });
      setNewPlayer({ name: '', position: 'Midfielder', email: '' });
      setShowAddPlayerForm(false);
      fetchTeamData();
      setTimeout(() => setPlayerMessage({ text: '', type: '' }), 5000);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || '❌ فشل إضافة اللاعب';
      setPlayerMessage({ text: msg, type: 'error' });
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-xl">جاري التحميل...</div>;
  if (!team) return <div className="p-10 text-center text-red-500">لا يوجد فريق مرتبط.</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-md border-r-4 border-green-600">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">{team.name}</h2>
          <p className="text-gray-500 mt-1">{team.role_in_team} | {team.tournament_name}</p>
          {team.short_name && <p className="text-sm text-gray-400">الاختصار: {team.short_name}</p>}
        </div>
        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">خروج</button>
      </div>

      {/* قسم إضافة لاعب */}
      <div className="mb-8">
        {playerMessage.text && (
          <div className={`p-3 rounded mb-4 ${playerMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {playerMessage.text}
          </div>
        )}
        
        {!showAddPlayerForm ? (
          <button onClick={() => setShowAddPlayerForm(true)} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center gap-2">
            <span>➕ إضافة لاعب جديد للفريق</span>
          </button>
        ) : (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200 animate-fade-in">
            <h4 className="font-bold text-green-800 mb-4">بيانات اللاعب الجديد</h4>
            <form onSubmit={handleAddPlayer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-600 mb-1">اسم اللاعب الكامل *</label>
                <input type="text" required className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none" value={newPlayer.name} onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})} placeholder="مثال: محمد صلاح" />
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">البريد الإلكتروني للاعب *</label>
                <input type="email" required className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none" value={newPlayer.email} onChange={(e) => setNewPlayer({...newPlayer, email: e.target.value})} placeholder="player@example.com" />
                <p className="text-xs text-gray-500 mt-1">سيتم إرسال رابط تعيين كلمة المرور إلى هذا الإيميل.</p>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">المركز *</label>
                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none" value={newPlayer.position} onChange={(e) => setNewPlayer({...newPlayer, position: e.target.value})}>
                  <option value="Goalkeeper">حارس مرمى</option>
                  <option value="Defender">مدافع</option>
                  <option value="Midfielder">لاعب وسط</option>
                  <option value="Forward">مهاجم</option>
                </select>
              </div>

              <div className="md:col-span-2 flex gap-2 mt-2">
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold">حفظ وإرسال الدعوة</button>
                <button type="button" onClick={() => setShowAddPlayerForm(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">إلغاء</button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* قائمة اللاعبين */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4 text-gray-700">👥 أعضاء الفريق</h3>
          {players.length === 0 ? (
             <p className="text-gray-400 text-sm">لا يوجد لاعبين مسجلين.</p>
          ) : (
            <ul className="space-y-3">
              {players.map(p => (
                <li key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border hover:bg-gray-100">
                  <div>
                    <span className="font-medium block">{p.name}</span>
                    <span className="text-xs text-gray-500">{p.has_account ? '✅ لديه حساب' : '⏳ لم يقبل الدعوة بعد'}</span>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{p.position}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* معلومات الفريق */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4 text-gray-700">ℹ️ معلومات النادي</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">تاريخ التأسيس:</span>
              <span className="font-semibold">{team.founded_date || 'غير محدد'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">ألوان الفريق:</span>
              <span className="font-semibold">{team.colors || 'غير محددة'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">البطولة الحالية:</span>
              <span className="font-semibold text-green-600">{team.tournament_name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamManagerDashboard;