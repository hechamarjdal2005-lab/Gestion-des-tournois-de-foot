import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ text: 'كلمات المرور غير متطابقة', type: 'error' });
      return;
    }
    if (!token) {
      setMessage({ text: 'الرابط غير صالح', type: 'error' });
      return;
    }

    try {
      await api.post('/auth/reset-password', null, {
        params: { token, new_password: password }
      });
      setMessage({ text: '✅ تم تعيين كلمة المرور بنجاح! جاري التحويل...', type: 'success' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setMessage({ text: '❌ فشل التحديث. ربما انتهت صلاحية الرابط.', type: 'error' });
    }
  };

  if (!token) return <div className="p-10 text-center text-red-500 text-xl">الرابط غير صالح أو مفقود.</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-900">تعيين كلمة المرور الجديدة</h2>
        {message.text && (
          <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">كلمة المرور الجديدة</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">تأكيد كلمة المرور</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-2 border rounded" required />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">حفظ ودخول</button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;