import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-lg shadow-xl text-center max-w-md w-full">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-3xl font-bold text-red-600 mb-2">غير مصرح لك!</h1>
        <p className="text-gray-600 mb-6">
          عذراً، ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة.
        </p>
        <Link 
          to="/" 
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition font-bold"
        >
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;