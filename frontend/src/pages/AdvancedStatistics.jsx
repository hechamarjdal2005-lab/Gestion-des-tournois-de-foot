import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const AdvancedStatistics = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'scorers', 'assists', 'cards'

  useEffect(() => {
    fetchStats();
  }, [id]);

  const fetchStats = async () => {
    try {
      // نستخدم الـ endpoint الجديد الذي أنشأناه في الباك إند
      const res = await api.get(`/tournaments/${id}/advanced-statistics`);
      setStats(res.data);
    } catch (error) {
      console.error("Error fetching advanced stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">جاري تحليل البيانات...</div>;
  if (!stats || !stats.detailed_stats) return <div className="text-center text-red-500 mt-10 p-10">لا توجد بيانات إحصائية متوفرة لهذه البطولة بعد.</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-6">
      <div className="container mx-auto max-w-7xl">
        
        {/* الرأس */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              📊 الإحصائيات المتقدمة للاعبين
            </h1>
            <p className="text-gray-400 mt-1">تحليل شامل للأداء: الأهداف، الصناعات، والانضباط</p>
          </div>
          <button 
            onClick={() => navigate(`/tournament/${id}`)} 
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg border border-gray-700 transition flex items-center gap-2"
          >
            🔙 عودة للبطولة
          </button>
        </div>

        {/* تبويبات التنقل */}
        <div className="flex flex-wrap gap-2 mb-8 bg-gray-800 p-2 rounded-xl inline-flex">
          {[
            { id: 'all', label: 'الجميع', icon: '📋' },
            { id: 'scorers', label: 'الهدافون', icon: '⚽' },
            { id: 'assists', label: 'صناع اللعب', icon: '🎯' },
            { id: 'cards', label: 'الانضباط (بطاقات)', icon: '🟨' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg scale-105' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span className="ml-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* محتوى التبويبات */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* القسم الرئيسي: الجدول المفصل أو قائمة محددة */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* عرض القائمة بناءً على التبويب المختار */}
            <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
              <div className="p-6 border-b border-gray-700 bg-gray-800/50">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {activeTab === 'all' && '📋 قائمة جميع اللاعبين'}
                  {activeTab === 'scorers' && '🥅 قائمة الهدافين (Top Scorers)'}
                  {activeTab === 'assists' && '🎯 صناع اللعب (Top Assists)'}
                  {activeTab === 'cards' && '🟨 سجل الانضباط (البطاقات)'}
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-gray-900 text-gray-400 text-xs uppercase font-semibold">
                    <tr>
                      <th className="p-4">#</th>
                      <th className="p-4">اللاعب</th>
                      <th className="p-4">الفريق</th>
                      <th className="p-4 text-center">⚽ أهداف</th>
                      <th className="p-4 text-center">🎯 صناعة</th>
                      <th className="p-4 text-center">🟨 صفراء</th>
                      <th className="p-4 text-center">🟥 حمراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {(activeTab === 'all' ? stats.detailed_stats : stats[`top_${activeTab}`] || []).map((player, index) => (
                      <tr key={index} className="hover:bg-gray-700/50 transition-colors">
                        <td className="p-4 text-gray-500 font-mono">{index + 1}</td>
                        <td className="p-4">
                          <div className="font-bold text-white">{player.player}</div>
                          <div className="text-xs text-gray-500">قميص #{player.number || '-'}</div>
                        </td>
                        <td className="p-4 text-sm text-blue-400">{player.team}</td>
                        
                        <td className="p-4 text-center">
                          <span className={`inline-block w-8 py-1 rounded font-bold ${player.goals > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-600'}`}>
                            {player.goals}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block w-8 py-1 rounded font-bold ${player.assists > 0 ? 'bg-purple-500/20 text-purple-400' : 'text-gray-600'}`}>
                            {player.assists}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block w-6 h-6 leading-6 rounded-full text-xs font-bold ${player.yellow > 0 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-500'}`}>
                            {player.yellow}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block w-6 h-6 leading-6 rounded-sm text-xs font-bold ${player.red > 0 ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-500'}`}>
                            {player.red}
                          </span>
                        </td>
                      </tr>
                    ))}
                    
                    {(activeTab !== 'all' && (!stats[`top_${activeTab}`] || stats[`top_${activeTab}`].length === 0)) && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-gray-500">
                          لا توجد بيانات متاحة في هذا التصنيف حتى الآن.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* الشريط الجانبي: ملخصات سريعة */}
          <div className="space-y-6">
            
            {/* بطاقة أفضل هداف */}
            <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-xl p-6 shadow-lg text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 text-8xl transform translate-x-4 -translate-y-4">⚽</div>
              <h3 className="text-lg font-bold opacity-90 mb-2">الحذاء الذهبي</h3>
              {stats.top_scorers.length > 0 ? (
                <div>
                  <div className="text-3xl font-bold mb-1">{stats.top_scorers[0].player}</div>
                  <div className="text-yellow-200 text-sm">{stats.top_scorers[0].team}</div>
                  <div className="mt-4 text-4xl font-black">{stats.top_scorers[0].goals} هدف</div>
                </div>
              ) : (
                <p className="text-yellow-200 italic">لا توجد أهداف مسجلة بعد</p>
              )}
            </div>

            {/* بطاقة أفضل صانع */}
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 shadow-lg text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 text-8xl transform translate-x-4 -translate-y-4">🎯</div>
              <h3 className="text-lg font-bold opacity-90 mb-2">ملك التمريرات</h3>
              {stats.top_assists.length > 0 ? (
                <div>
                  <div className="text-3xl font-bold mb-1">{stats.top_assists[0].player}</div>
                  <div className="text-purple-200 text-sm">{stats.top_assists[0].team}</div>
                  <div className="mt-4 text-4xl font-black">{stats.top_assists[0].assists} صناعة</div>
                </div>
              ) : (
                <p className="text-purple-200 italic">لا توجد تمريرات حاسمة بعد</p>
              )}
            </div>

            {/* بطاقة الانضباط */}
            <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl p-6 shadow-lg text-white relative overflow-hidden border border-gray-600">
              <div className="absolute top-0 right-0 opacity-10 text-8xl transform translate-x-4 -translate-y-4">⚖️</div>
              <h3 className="text-lg font-bold opacity-90 mb-2">الأكثر انضباطاً</h3>
              {stats.most_disciplined.length > 0 ? (
                <div>
                  <div className="text-2xl font-bold mb-1">{stats.most_disciplined[0].player}</div>
                  <div className="text-gray-400 text-sm">{stats.most_disciplined[0].team}</div>
                  <div className="mt-3 flex gap-2 text-sm">
                    <span className="bg-yellow-500 text-black px-2 py-0.5 rounded font-bold">{stats.most_disciplined[0].yellow} 🟨</span>
                    <span className="bg-red-600 text-white px-2 py-0.5 rounded font-bold">{stats.most_disciplined[0].red} 🟥</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 italic">لا توجد بيانات كافية</p>
              )}
            </div>

            {/* ملاحظة تقنية */}
            <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-4 text-sm text-blue-200">
              <p className="font-bold mb-1">💡 ملاحظة:</p>
              <p>تظهر هذه الإحصائيات فقط للاعبين الذين تم تسجيل مشاركتهم في تشكيلة المباريات وتم تحديث إحصائياتهم يدوياً من قبل المسؤول أو الحكم عبر لوحة التحكم المباشرة.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedStatistics;