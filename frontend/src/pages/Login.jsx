import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { jwtDecode } from 'jwt-decode';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. تحضير البيانات بصيغة Form Data كما يتطلبها OAuth2 في FastAPI
      const formData = new FormData();
      formData.append('username', email); // مهم جداً: الحقل يجب أن يسمى username
      formData.append('password', password);

      // 2. إرسال الطلب للـ Backend
      const response = await api.post('/auth/login', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data' 
        },
      });

      const { access_token } = response.data;
      
      // 3. فك تشفير التوكن لمعرفة الدور والمعلومات
      const decoded = jwtDecode(access_token);
      
      const userData = {
        email: decoded.sub,
        role: decoded.role,
        name: decoded.name || email
      };

      // 🔴🔴🔴 الخطوة الأهم التي تحل مشكلة 401 🔴🔴🔴
      // حفظ التوكن في LocalStorage ليتم استخدامه في الطلبات القادمة
      localStorage.setItem('token', access_token);
      // 🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴

      // 4. تحديث حالة المصادقة في التطبيق
      login(access_token, userData);

      // 5. التوجيه حسب الدور
      switch (decoded.role) {
        case 'super_admin':
          navigate('/admin/dashboard');
          break;
        case 'team_manager':
          navigate('/manager/dashboard');
          break;
        case 'coach':
          navigate('/coach/dashboard');
          break;
        case 'player':
          navigate('/player/dashboard');
          break;
        case 'referee':
          navigate('/referee/dashboard');
          break;
        default:
          navigate('/');
      }

    } catch (err) {
      console.error("Login Error:", err);
      if (err.response && err.response.status === 400) {
        setError(err.response.data.detail || "بيانات الدخول غير صحيحة");
      } else if (err.response && err.response.status === 401) {
        setError("غير مصرح بالدخول. تأكد من صحة البيانات.");
      } else {
        setError("حدث خطأ في الاتصال بالخادم. تأكد أن الـ Backend يعمل.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-blue-900">تسجيل الدخول</h2>
          <p className="text-gray-500 mt-2">نظام إدارة بطولات كرة القدم</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@club.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg text-white font-bold text-lg shadow-md transition duration-200 ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          <p>تم إنشاء الحساب عبر لوحة تحكم المسؤول</p>
          <p>تأكد من تعيين كلمة المرور عبر الرابط المرسل لإيميلك</p>
        </div>
      </div>
    </div>
  );
};

export default Login;