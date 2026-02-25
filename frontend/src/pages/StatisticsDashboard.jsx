import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const StatisticsDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [id]);

  const fetchStats = async () => {
    try {
      const res = await api.get(`/tournaments/${id}/statistics`);
      setStats(res.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">جاري تحميل الإحصائيات...</div>;
  if (!stats) return <div className="text-center text-red-500 mt-10">فشل تحميل البيانات</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">📊 لوحة إحصائيات البطولة</h1>
          <button onClick={() => navigate(`/tournament/${id}`)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition">
            🔙 عودة للبطولة
          </button>
        </div>

        {/* البطاقات العلوية */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg shadow border-l-4 border-blue-500">
            <h3 className="text-gray-400 text-sm">إجمالي المباريات</h3>
            <p className="text-2xl font-bold">{stats.total_matches}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg shadow border-l-4 border-green-500">
            <h3 className="text-gray-400 text-sm">أفضل هداف</h3>
            <p className="text-xl font-bold truncate">{stats.top_scorers[0]?.player || '-'}</p>
            <p className="text-xs text-green-400">{stats.top_scorers[0]?.goals} هدف</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg shadow border-l-4 border-purple-500">
            <h3 className="text-gray-400 text-sm">الأكثر صناعة</h3>
            <p className="text-xl font-bold truncate">{stats.top_assists[0]?.player || '-'}</p>
            <p className="text-xs text-purple-400">{stats.top_assists[0]?.assists} تمريرة</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg shadow border-l-4 border-yellow-500">
            <h3 className="text-gray-400 text-sm">متوسط الأهداف</h3>
            <p className="text-2xl font-bold">
              {stats.total_matches > 0 ? ((stats.match_outcomes.reduce((acc, cur) => acc + cur.value, 0) * 2) / stats.total_matches).toFixed(2) : 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* رسم بياني لترتيب الفرق */}
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 text-blue-300">🏆 ترتيب الفرق (النقاط)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.standings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }} />
                <Legend />
                <Bar name="النقاط" dataKey="points" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* رسم بياني لنتائج المباريات */}
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 text-green-300">⚽ نتائج المباريات</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.match_outcomes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.match_outcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* قائمة أفضل الهدافين */}
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 text-yellow-300">🥅 قائمة الهدافين</h2>
            <ul className="space-y-3">
              {stats.top_scorers.length > 0 ? stats.top_scorers.map((s, i) => (
                <li key={i} className="flex justify-between items-center bg-gray-700 p-3 rounded hover:bg-gray-600 transition">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-yellow-400 w-6">#{i+1}</span>
                    <div>
                      <p className="font-bold">{s.player}</p>
                      <p className="text-xs text-gray-400">{s.team}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-white">{s.goals} ⚽</span>
                </li>
              )) : <p className="text-gray-500 text-center py-4">لا توجد أهداف مسجلة بعد.</p>}
            </ul>
          </div>

          {/* قائمة صانعي الأهداف */}
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 text-purple-300">🎯 صانعي الأهداف (Assists)</h2>
            <ul className="space-y-3">
              {stats.top_assists.length > 0 ? stats.top_assists.map((s, i) => (
                <li key={i} className="flex justify-between items-center bg-gray-700 p-3 rounded hover:bg-gray-600 transition">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-purple-400 w-6">#{i+1}</span>
                    <div>
                      <p className="font-bold">{s.player}</p>
                      <p className="text-xs text-gray-400">{s.team}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-white">{s.assists} 🎯</span>
                </li>
              )) : <p className="text-gray-500 text-center py-4">لا توجد تمريرات حاسمة مسجلة بعد.</p>}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;