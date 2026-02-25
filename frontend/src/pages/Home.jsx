import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white font-sans overflow-hidden relative">
      
      {/* خلفية جمالية (دوائر ضبابية) */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-20 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="container mx-auto px-6 py-16 relative z-10">
        
        {/* القسم الرئيسي (Hero Section) */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <span className="inline-block py-1 px-3 rounded-full bg-blue-800/50 border border-blue-500 text-blue-300 text-sm font-semibold mb-4 backdrop-blur-sm">
            🚀 النسخة الاحترافية لإدارة البطولات الرياضية
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-green-400 to-blue-400 animate-gradient">
            نظام إدارة البطولات المتكامل
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 leading-relaxed">
            المنصة الذكية لإدارة الفرق، اللاعبين، الحكام، والمباريات بدقة متناهية. 
            <br className="hidden md:block" />
            من الدوري المحلي إلى كأس العالم، نحن نغطي كل التفاصيل.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/login" 
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-full shadow-lg hover:shadow-blue-500/50 transition transform hover:-translate-y-1 text-lg flex items-center justify-center gap-2"
            >
              🔐 تسجيل الدخول
            </Link>
            <Link 
              to="/admin/dashboard" 
              className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold rounded-full shadow-lg transition transform hover:-translate-y-1 text-lg flex items-center justify-center gap-2"
            >
              👁️ تجربة النظام (Demo)
            </Link>
          </div>
        </div>

        {/* قسم المميزات (Features Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          
          {/* بطاقة 1 */}
          <div className="group bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl hover:bg-white/10 hover:border-blue-500/50 transition duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition">
              🏆
            </div>
            <h3 className="text-2xl font-bold mb-3 text-blue-300">أنظمة بطولة مرنة</h3>
            <p className="text-gray-400 leading-relaxed">
              دعم كامل لنظام الدوري (Round-Robin)، خروج المغلوب (Knockout)، والنظم المدمجة مع توليد تلقائي للجداول والقرعات.
            </p>
          </div>

          {/* بطاقة 2 */}
          <div className="group bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl hover:bg-white/10 hover:border-green-500/50 transition duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition">
              📊
            </div>
            <h3 className="text-2xl font-bold mb-3 text-green-300">إحصائيات متقدمة</h3>
            <p className="text-gray-400 leading-relaxed">
              تتبع دقيق للأهداف، التمريرات الحاسمة، البطاقات، والخطط. جداول ترتيب ديناميكية تتحدث لحظياً مع كل نتيجة.
            </p>
          </div>

          {/* بطاقة 3 */}
          <div className="group bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl hover:bg-white/10 hover:border-purple-500/50 transition duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition">
              👥
            </div>
            <h3 className="text-2xl font-bold mb-3 text-purple-300">إدارة شاملة للأدوار</h3>
            <p className="text-gray-400 leading-relaxed">
              لوحات تحكم مخصصة للمسؤولين، المدربين، اللاعبين، والحكام. صلاحيات دقيقة وسهولة في الاستخدام للجميع.
            </p>
          </div>

           {/* بطاقة 4 */}
           <div className="group bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl hover:bg-white/10 hover:border-yellow-500/50 transition duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition">
              🎲
            </div>
            <h3 className="text-2xl font-bold mb-3 text-yellow-300">قرعة ذكية</h3>
            <p className="text-gray-400 leading-relaxed">
              نظام قرعة عشوائي عادل يولد المباريات ويوزع الفرق على المجموعات أو الأدوار بضغطة زر واحدة.
            </p>
          </div>

          {/* بطاقة 5 */}
          <div className="group bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl hover:bg-white/10 hover:border-red-500/50 transition duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-red-500/20 rounded-xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition">
              📱
            </div>
            <h3 className="text-2xl font-bold mb-3 text-red-300">متجاوب تماماً</h3>
            <p className="text-gray-400 leading-relaxed">
              يعمل بسلاسة على جميع الأجهزة: الحواسيب، الأجهزة اللوحية، والهواتف الذكية بتصميم عصري وجذاب.
            </p>
          </div>

          {/* بطاقة 6 */}
          <div className="group bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl hover:bg-white/10 hover:border-cyan-500/50 transition duration-300 transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition">
              🔒
            </div>
            <h3 className="text-2xl font-bold mb-3 text-cyan-300">أمان وحماية</h3>
            <p className="text-gray-400 leading-relaxed">
              نظام مصادقة قوي، إدارة صلاحيات دقيقة، وحماية للبيانات لضمان نزاهة المنافسة وسرية المعلومات.
            </p>
          </div>

        </div>

        {/* قسم إحصائي سريع (اختياري) */}
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-md rounded-3xl p-10 border border-white/10 text-center">
          <h2 className="text-3xl font-bold mb-8">جاهز لانطلاق بطولتك القادمة؟</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-black text-blue-400 mb-2">+∞</div>
              <div className="text-gray-400 text-sm">بطولة ممكنة</div>
            </div>
            <div>
              <div className="text-4xl font-black text-green-400 mb-2">24/7</div>
              <div className="text-gray-400 text-sm">متابعة مباشرة</div>
            </div>
            <div>
              <div className="text-4xl font-black text-purple-400 mb-2">100%</div>
              <div className="text-gray-400 text-sm">دقة في الإحصائيات</div>
            </div>
            <div>
              <div className="text-4xl font-black text-yellow-400 mb-2">سهل</div>
              <div className="text-gray-400 text-sm">الاستخدام</div>
            </div>
          </div>
          <div className="mt-10">
            <Link to="/login" className="inline-block px-10 py-4 bg-white text-blue-900 font-bold rounded-full hover:bg-gray-100 transition shadow-lg transform hover:scale-105">
              ابدأ الآن مجاناً
            </Link>
          </div>
        </div>

        {/* تذييل الصفحة */}
        <footer className="mt-20 text-center text-gray-500 text-sm border-t border-white/10 pt-8">
          <p>© {new Date().getFullYear()} نظام إدارة البطولات الرياضي. جميع الحقوق محفوظة.</p>
          <p className="mt-2">تم التطوير بكل ❤️ لكرة القدم.</p>
        </footer>

      </div>
      
      {/* ستايل بسيط للـ Animation إذا لم يكن موجوداً في tailwind.config */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Home;