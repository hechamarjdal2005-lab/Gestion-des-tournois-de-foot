import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

const TeamManagerDashboard = () => {
  const { user, logout } = useAuthStore();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', position: 'Forward', jersey_number: '', email: '' });
  const [playerPhoto, setPlayerPhoto] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => { fetchTeamData(); }, []);

  const fetchTeamData = async () => {
    try {
      const teamRes = await api.get('/me/team');
      setTeam(teamRes.data);
      const playersRes = await api.get('/me/players');
      setPlayers(playersRes.data);
    } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    
    if (!newPlayer.name || !newPlayer.position || !newPlayer.jersey_number) {
      setMessage({ text: '❌ يرجى ملء الاسم، المركز، ورقم القميص', type: 'error' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newPlayer.name);
      formData.append('position', newPlayer.position);
      formData.append('jersey_number', parseInt(newPlayer.jersey_number));
      
      if (newPlayer.email) formData.append('email', newPlayer.email);
      if (playerPhoto) formData.append('photo', playerPhoto);

      await api.post('/players', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage({ text: '✅ تم إضافة اللاعب بنجاح!', type: 'success' });
      setNewPlayer({ name: '', position: 'Forward', jersey_number: '', email: '' });
      setPlayerPhoto(null);
      setShowAddPlayerForm(false);
      fetchTeamData();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      
    } catch (error) {
      console.error("Add Player Error:", error);
      const errorMsg = error.response?.data?.detail || "فشل إضافة اللاعب";
      setMessage({ text: `❌ ${errorMsg}`, type: 'error' });
      if (error.response?.status === 422) {
        console.log("Validation Errors:", error.response.data);
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-xl">جاري التحميل...</div>;
  if (!team) return <div className="p-10 text-center text-red-500">لا يوجد فريق مرتبط.</div>;

  const playerCount = players.length;
  const isWarning = playerCount < 22;

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-lg shadow-md border-r-4 border-green-600">
        <div className="flex items-center gap-4">
          {team.logo && <img src={`http://127.0.0.1:8000${team.logo}`} alt="Logo" className="h-16 w-16 object-cover rounded-full border-2 border-green-500" />}
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{team.name}</h2>
            <p className="text-gray-500">{team.role_in_team} | {team.colors}</p>
          </div>
        </div>
        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">خروج</button>
      </div>

      {isWarning && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded shadow animate-pulse">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-lg">⚠️ تنبيه هام</p>
              <p>عدد اللاعبين الحالي هو <span className="font-bold text-red-600">{playerCount}</span>. يجب إضافة <span className="font-bold">{22 - playerCount}</span> لاعبين على الأقل.</p>
            </div>
            <button onClick={() => setShowAddPlayerForm(true)} className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 font-bold">+ إضافة لاعب الآن</button>
          </div>
        </div>
      )}
      {!isWarning && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 mb-6 rounded shadow">
          <p className="font-bold">✅ الفريق مكتمل العدد ({playerCount} لاعب).</p>
        </div>
      )}

      {message.text && (
        <div className={`p-3 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>
      )}

      <div className="mb-8">
        {!showAddPlayerForm ? (
          <button onClick={() => setShowAddPlayerForm(true)} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 shadow flex items-center gap-2 font-bold">
            ➕ إضافة لاعب جديد
          </button>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-lg border border-green-200 animate-fade-in">
            <h3 className="text-xl font-bold text-green-800 mb-4 border-b pb-2">بيانات اللاعب الجديد</h3>
            <form onSubmit={handleAddPlayer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم اللاعب الكامل *</label>
                <input type="text" required className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none" value={newPlayer.name} onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})} placeholder="مثال: محمد صلاح" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم القميص *</label>
                <input type="number" required min="1" max="99" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none" value={newPlayer.jersey_number} onChange={(e) => setNewPlayer({...newPlayer, jersey_number: e.target.value})} placeholder="10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المركز *</label>
                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none" value={newPlayer.position} onChange={(e) => setNewPlayer({...newPlayer, position: e.target.value})}>
                  <option value="Goalkeeper">حارس مرمى</option>
                  <option value="Defender">مدافع</option>
                  <option value="Midfielder">لاعب وسط</option>
                  <option value="Forward">مهاجم</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">صورة اللاعب (من الجهاز)</label>
                <input type="file" accept="image/*" onChange={(e) => setPlayerPhoto(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني (اختياري)</label>
                <input type="email" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none" value={newPlayer.email} onChange={(e) => setNewPlayer({...newPlayer, email: e.target.value})} placeholder="player@example.com" />
              </div>
              <div className="md:col-span-2 flex gap-3 mt-4">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">حفظ اللاعب</button>
                <button type="button" onClick={() => setShowAddPlayerForm(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-bold hover:bg-gray-400">إلغاء</button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold mb-4 text-gray-800 flex justify-between items-center">
          <span>👥 قائمة اللاعبين ({playerCount})</span>
          {isWarning && <span className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full animate-pulse">ناقص {22 - playerCount}</span>}
        </h3>
        {players.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-gray-50 rounded">لا يوجد لاعبين مسجلين بعد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-gray-100 text-gray-700 text-sm uppercase">
                <tr>
                  <th className="p-3">#</th><th className="p-3">الصورة</th><th className="p-3">الاسم</th><th className="p-3">القميص</th><th className="p-3">المركز</th><th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-3 text-gray-500">{i + 1}</td>
                    <td className="p-3">
                      {p.photo ? (
                        <img src={`http://127.0.0.1:8000${p.photo}`} alt={p.name} className="h-10 w-10 object-cover rounded-full border border-gray-300" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">{p.name.charAt(0)}</div>
                      )}
                    </td>
                    <td className="p-3 font-bold text-gray-800">{p.name}</td>
                    <td className="p-3"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono font-bold">{p.jersey_number || '-'}</span></td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        p.position === 'Goalkeeper' ? 'bg-yellow-100 text-yellow-800' :
                        p.position === 'Defender' ? 'bg-blue-100 text-blue-800' :
                        p.position === 'Midfielder' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {p.position === 'Goalkeeper' ? 'حارس' : p.position === 'Defender' ? 'مدافع' : p.position === 'Midfielder' ? 'وسط' : 'مهاجم'}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-green-600 font-bold">✓ نشط</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagerDashboard;