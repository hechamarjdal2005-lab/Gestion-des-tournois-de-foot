import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

const CoachDashboard = () => {
  const { user, logout } = useAuthStore();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="flex items-center justify-center min-h-screen text-xl">جاري التحميل...</div>;
  if (!team) return <div className="p-10 text-center text-red-500">لا يوجد فريق مرتبط.</div>;

  return (
    <div className="container mx-auto p-6">
      {/* الرأس */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-md border-r-4 border-blue-600">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">{team.name}</h2>
          <p className="text-gray-500 mt-1">{team.role_in_team} | {team.tournament_name}</p>
          {team.colors && <p className="text-sm text-gray-400">الألوان: {team.colors}</p>}
        </div>
        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">خروج</button>
      </div>

      {/* رسالة توضيحية */}
      <div className="bg-blue-50 border-r-4 border-blue-500 p-4 mb-6 rounded shadow-sm">
        <p className="text-blue-800 font-medium">
          👋 مرحباً أيها المدرب. يمكنك الاطلاع على قائمة اللاعبين.
          <br/>
          <span className="text-sm text-blue-600">ℹ️ لإضافة لاعبين جدد، يرجى التواصل مع مسؤول الفريق.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* القائمة (للقراءة فقط) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-700">📋 قائمة اللاعبين</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">{players.length} لاعب</span>
          </div>
          
          {players.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-gray-50 rounded">
              <p>لا يوجد لاعبين مسجلين بعد.</p>
              <p className="text-sm mt-2">يرجى إبلاغ مسؤول الفريق.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 text-sm font-medium text-gray-500">#</th>
                    <th className="p-3 text-sm font-medium text-gray-500">الاسم</th>
                    <th className="p-3 text-sm font-medium text-gray-500">المركز</th>
                    <th className="p-3 text-sm font-medium text-gray-500">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => (
                    <tr key={player.id} className="border-b hover:bg-gray-50 transition">
                      <td className="p-3 text-gray-700">{index + 1}</td>
                      <td className="p-3 font-semibold text-gray-800">{player.name}</td>
                      <td className="p-3">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          {player.position === 'Goalkeeper' ? 'حارس' : 
                           player.position === 'Defender' ? 'مدافع' :
                           player.position === 'Midfielder' ? 'وسط' : 'مهاجم'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-green-600 font-bold">✓ جاهز</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* البطاقات الجانبية */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-lg shadow-lg">
            <h4 className="text-lg font-bold mb-2">ملخص الفريق</h4>
            <div className="flex justify-between items-end">
              <div><p className="text-blue-100 text-sm">عدد اللاعبين</p><p className="text-3xl font-bold">{players.length}</p></div>
              <div className="text-blue-200 text-4xl">⚽</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h4 className="font-bold text-gray-700 mb-3">أدوات المدرب</h4>
            <div className="space-y-2">
              <button className="w-full text-right bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded transition text-sm">📝 وضع التشكيلة</button>
              <button className="w-full text-right bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded transition text-sm">📊 إحصائيات الأداء</button>
              <button className="w-full text-right bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded transition text-sm">📅 جدول المباريات</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachDashboard;