import { useAuthStore } from '../store/authStore';

const PlayerDashboard = () => {
  const { user, logout } = useAuthStore();

  // إحصائيات وهمية للتجربة
  const stats = {
    matches: 12,
    goals: 5,
    assists: 3,
    yellowCards: 2,
    redCards: 0,
    rating: 7.8
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">ملف اللاعب</h2>
          <p className="text-gray-600 mt-1">مرحباً بك، <span className="font-bold text-blue-600">{user?.email}</span></p>
        </div>
        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
          تسجيل خروج
        </button>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="المباريات" value={stats.matches} color="bg-blue-500" />
        <StatCard title="الأهداف" value={stats.goals} color="bg-green-500" />
        <StatCard title="التمريرات" value={stats.assists} color="bg-purple-500" />
        <StatCard title="صفراء" value={stats.yellowCards} color="bg-yellow-500" />
        <StatCard title="حمراء" value={stats.redCards} color="bg-red-500" />
        <StatCard title="التقييم" value={stats.rating} color="bg-indigo-500" />
      </div>

      {/* جدول المباريات القادمة */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">📅 المباريات القادمة</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3">التاريخ</th>
                <th className="p-3">المنافس</th>
                <th className="p-3">الملعب</th>
                <th className="p-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3">2026-03-01</td>
                <td className="p-3 font-bold">فريق النسور</td>
                <td className="p-3">الملعب الكبير</td>
                <td className="p-3"><span className="text-green-600 font-bold">مبرمجة</span></td>
              </tr>
              <tr className="border-b">
                <td className="p-3">2026-03-08</td>
                <td className="p-3 font-bold">فريق الصقور</td>
                <td className="p-3">ملعب المدينة</td>
                <td className="p-3"><span className="text-green-600 font-bold">مبرمجة</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// مكون صغير للبطاقة
const StatCard = ({ title, value, color }) => (
  <div className={`${color} text-white p-4 rounded-lg shadow text-center transform hover:scale-105 transition`}>
    <div className="text-3xl font-bold">{value}</div>
    <div className="text-sm opacity-90">{title}</div>
  </div>
);

export default PlayerDashboard;