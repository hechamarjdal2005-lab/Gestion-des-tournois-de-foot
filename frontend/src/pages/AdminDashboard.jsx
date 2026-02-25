import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('teams');
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [showRefereeForm, setShowRefereeForm] = useState(false);
  
  // بيانات الفريق (مع الصورة)
  const [teamData, setTeamData] = useState({ name: '', short_name: '', founded_date: '', colors: '' });
  const [managerData, setManagerData] = useState({ name: '', email: '' });
  const [coachData, setCoachData] = useState({ name: '', email: '' });
  const [teamLogo, setTeamLogo] = useState(null);

  const [tData, setTData] = useState({ name: '', type: 'league', start_date: '', end_date: '' });
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [refereeData, setRefereeData] = useState({ name: '', email: '' });

  const [message, setMessage] = useState({ text: '', type: '' });
  const [refMessage, setRefMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, tmRes] = await Promise.all([api.get('/tournaments'), api.get('/teams')]);
      setTournaments(tRes.data);
      setTeams(tmRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', teamData.name);
      formData.append('short_name', teamData.short_name || '');
      formData.append('founded_date', teamData.founded_date || '');
      formData.append('colors', teamData.colors || '');
      formData.append('manager_name', managerData.name);
      formData.append('manager_email', managerData.email);
      formData.append('coach_name', coachData.name);
      formData.append('coach_email', coachData.email);
      if (teamLogo) formData.append('logo', teamLogo);

      await api.post('/teams', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      setMessage({ text: '✅ تم إنشاء الفريق بنجاح!', type: 'success' });
      setShowTeamForm(false);
      resetForms();
      fetchData();
    } catch (error) {
      setMessage({ text: `❌ ${error.response?.data?.detail || 'فشل الإنشاء'}`, type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/tournaments', { ...tData, team_ids: selectedTeamIds });
      setMessage({ text: '✅ تم إنشاء البطولة بنجاح!', type: 'success' });
      setShowTournamentForm(false);
      resetForms();
      fetchData();
      setTimeout(() => navigate(`/tournament/${res.data.id}`), 1500);
    } catch (error) {
      setMessage({ text: `❌ ${error.response?.data?.detail || 'فشل الإنشاء'}`, type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    }
  };

  const handleCreateReferee = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/referees', refereeData);
      setRefMessage({ text: '✅ تم إضافة الحكم بنجاح!', type: 'success' });
      setShowRefereeForm(false);
      setRefereeData({ name: '', email: '' });
      setTimeout(() => setRefMessage({ text: '', type: '' }), 5000);
    } catch (error) {
      setRefMessage({ text: `❌ ${error.response?.data?.detail || 'فشل الإضافة'}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (id, name) => {
    if(!window.confirm(`⚠️ تحذير خطير: هل أنت متأكد من حذف فريق "${name}"؟\nسيتم حذف:\n- الفريق نهائياً\n- حساب المسؤول والمدرب\n- جميع اللاعبين وإحصائياتهم\n\nهذا الإجراء لا يمكن التراجع عنه!`)) return;
    
    try {
      await api.delete(`/teams/${id}`);
      alert("✅ تم حذف الفريق وجميع البيانات المرتبطة به بنجاح.");
      fetchData();
    } catch (error) {
      alert(`❌ فشل الحذف: ${error.response?.data?.detail || error.message}`);
    }
  };

  const resetForms = () => {
    setTeamData({ name: '', short_name: '', founded_date: '', colors: '' });
    setManagerData({ name: '', email: '' });
    setCoachData({ name: '', email: '' });
    setTeamLogo(null);
    setTData({ name: '', type: 'league', start_date: '', end_date: '' });
    setSelectedTeamIds([]);
    setRefereeData({ name: '', email: '' });
  };

  const toggleTeamSelection = (id) => {
    setSelectedTeamIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
  };

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-md">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">لوحة تحكم المسؤول العام</h2>
          <p className="text-gray-500 mt-1">مرحباً بك، {user?.email}</p>
        </div>
        <button onClick={logout} className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition shadow">تسجيل خروج</button>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded-lg shadow-md border-r-4 ${message.type === 'success' ? 'bg-green-100 text-green-800 border-green-500' : 'bg-red-100 text-red-800 border-red-500'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-4 mb-6 border-b border-gray-300 overflow-x-auto">
        {['teams', 'tournaments', 'referees'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-6 text-lg font-semibold capitalize ${activeTab === tab ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
            {tab === 'teams' ? '🛡️ الفرق' : tab === 'tournaments' ? '🏆 البطولات' : '⚖️ الحكام'}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md min-h-[400px]">
        
        {/* --- تبويب الفرق --- */}
        {activeTab === 'teams' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-700">قائمة الفرق</h3>
              <button onClick={() => setShowTeamForm(!showTeamForm)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                {showTeamForm ? 'إخفاء' : '+ إضافة فريق'}
              </button>
            </div>
            
            {showTeamForm && (
              <form onSubmit={handleCreateTeam} className="bg-blue-50 p-6 rounded-lg mb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="اسم الفريق" required className="border p-2 rounded w-full" value={teamData.name} onChange={e => setTeamData({...teamData, name: e.target.value})} />
                  <input placeholder="الاختصار" className="border p-2 rounded w-full" value={teamData.short_name} onChange={e => setTeamData({...teamData, short_name: e.target.value})} />
                  <input type="date" className="border p-2 rounded w-full" value={teamData.founded_date} onChange={e => setTeamData({...teamData, founded_date: e.target.value})} />
                  <input placeholder="الألوان" className="border p-2 rounded w-full" value={teamData.colors} onChange={e => setTeamData({...teamData, colors: e.target.value})} />
                </div>
                
                {/* رفع شعار الفريق */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">شعار الفريق</label>
                  <input type="file" accept="image/*" onChange={(e) => setTeamLogo(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <input placeholder="اسم المسؤول" required className="border p-2 rounded" value={managerData.name} onChange={e => setManagerData({...managerData, name: e.target.value})} />
                  <input type="email" placeholder="إيميل المسؤول" required className="border p-2 rounded" value={managerData.email} onChange={e => setManagerData({...managerData, email: e.target.value})} />
                  <input placeholder="اسم المدرب" required className="border p-2 rounded" value={coachData.name} onChange={e => setCoachData({...coachData, name: e.target.value})} />
                  <input type="email" placeholder="إيميل المدرب" required className="border p-2 rounded" value={coachData.email} onChange={e => setCoachData({...coachData, email: e.target.value})} />
                </div>
                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700">إنشاء الفريق</button>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-100"><tr><th className="p-3">#</th><th className="p-3">الشعار</th><th className="p-3">الفريق</th><th className="p-3">الاختصار</th><th className="p-3">الألوان</th><th className="p-3">إجراءات</th></tr></thead>
                <tbody>
                  {teams.map((t, i) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{i+1}</td>
                      <td className="p-3">
                        {t.logo ? <img src={`http://127.0.0.1:8000/${t.logo}`} alt="logo" className="h-10 w-10 object-cover rounded-full" /> : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="p-3 font-bold">{t.name}</td>
                      <td className="p-3">{t.short_name}</td>
                      <td className="p-3">{t.colors}</td>
                      <td className="p-3">
                        <button onClick={() => handleDeleteTeam(t.id, t.name)} className="text-red-600 hover:text-red-800 font-bold text-sm bg-red-50 px-3 py-1 rounded flex items-center gap-1">
                          🗑️ حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- تبويب البطولات --- */}
        {activeTab === 'tournaments' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-700">البطولات</h3>
              <button onClick={() => setShowTournamentForm(!showTournamentForm)} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                {showTournamentForm ? 'إخفاء' : '+ إضافة بطولة'}
              </button>
            </div>
            
            {showTournamentForm && (
              <form onSubmit={handleCreateTournament} className="bg-green-50 p-6 rounded-lg mb-6 space-y-4">
                <input placeholder="اسم البطولة" required className="border p-2 rounded w-full" value={tData.name} onChange={e => setTData({...tData, name: e.target.value})} />
                <select className="border p-2 rounded w-full" value={tData.type} onChange={e => setTData({...tData, type: e.target.value})}>
                  <option value="knockout">خروج مغلوب</option>
                  <option value="league">دوري</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" required className="border p-2 rounded" value={tData.start_date} onChange={e => setTData({...tData, start_date: e.target.value})} />
                  <input type="date" required className="border p-2 rounded" value={tData.end_date} onChange={e => setTData({...tData, end_date: e.target.value})} />
                </div>
                <div className="max-h-40 overflow-y-auto border p-2 rounded bg-white">
                  {teams.map(t => (
                    <label key={t.id} className="flex items-center gap-2 p-1 hover:bg-gray-100">
                      <input type="checkbox" onChange={() => toggleTeamSelection(t.id)} className="rounded" /> {t.name}
                    </label>
                  ))}
                </div>
                <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded w-full">إنشاء والانتقال</button>
              </form>
            )}

            <table className="w-full text-right">
              <thead className="bg-gray-100"><tr><th className="p-3">#</th><th className="p-3">البطولة</th><th className="p-3">النوع</th><th className="p-3">الفرق</th></tr></thead>
              <tbody>
                {tournaments.map((t, i) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/tournament/${t.id}`)}>
                    <td className="p-3">{i+1}</td>
                    <td className="p-3 font-bold text-blue-600">{t.name}</td>
                    <td className="p-3">{t.type === 'knockout' ? 'خروج مغلوب' : 'دوري'}</td>
                    <td className="p-3">{t.teams_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- تبويب الحكام --- */}
        {activeTab === 'referees' && (
          <div>
             <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-700">الحكام</h3>
              <button onClick={() => setShowRefereeForm(!showRefereeForm)} className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
                {showRefereeForm ? 'إخفاء' : '+ إضافة حكم'}
              </button>
            </div>
            {refMessage.text && <div className="p-3 mb-4 bg-green-100 text-green-700 rounded">{refMessage.text}</div>}
            {showRefereeForm && (
              <form onSubmit={handleCreateReferee} className="bg-purple-50 p-6 rounded-lg mb-6 space-y-4">
                <input placeholder="اسم الحكم" required className="border p-2 rounded w-full" value={refereeData.name} onChange={e => setRefereeData({...refereeData, name: e.target.value})} />
                <input type="email" placeholder="الإيميل" required className="border p-2 rounded w-full" value={refereeData.email} onChange={e => setRefereeData({...refereeData, email: e.target.value})} />
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded w-full">إرسال دعوة</button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;