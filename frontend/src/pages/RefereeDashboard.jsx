import { useAuthStore } from '../store/authStore';

const RefereeDashboard = () => {
  const { logout } = useAuthStore();
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">لوحة تحكم الحكم</h2>
        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded">خروج</button>
      </div>
      <div className="bg-white p-8 rounded shadow text-center">
        <p className="text-xl text-gray-600">مرحباً أيها الحكم. قائمة مبارياتك ستظهر هنا.</p>
      </div>
    </div>
  );
};

export default RefereeDashboard;