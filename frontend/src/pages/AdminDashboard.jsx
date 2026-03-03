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
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [showRefereeForm, setShowRefereeForm] = useState(false);
  
  // بيانات الفريق
  const [teamData, setTeamData] = useState({ name: '', short_name: '', founded_date: '', colors: '' });
  const [managerData, setManagerData] = useState({ name: '', email: '' });
  const [coachData, setCoachData] = useState({ name: '', email: '' });
  const [teamLogo, setTeamLogo] = useState(null);

  // بيانات البطولة الأساسية
  const [tData, setTData] = useState({ name: '', type: 'league', start_date: '', end_date: '' });
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  
  // ✅ خيارات متقدمة منفصلة لكل مرحلة
  const [tournamentOptions, setTournamentOptions] = useState({
    group_stage_legs: 1,       // للمجموعات/الدوري
    knockout_stage_legs: 1,    // للإقصاء
    num_groups: 4,             // عدد المجموعات
    teams_qualify_per_group: 2 // المتأهلون
  });

  const [refereeData, setRefereeData] = useState({ name: '', email: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [refMessage, setRefMessage] = useState({ text: '', type: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, tmRes, refRes] = await Promise.all([
        api.get('/tournaments'),
        api.get('/teams'),
        api.get('/referees').catch(() => ({ data: [] }))
      ]);
      setTournaments(tRes.data);
      setTeams(tmRes.data);
      setReferees(refRes.data);
    } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
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

      const res = await api.post('/teams', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage({ text: `✅ ${res.data.message}`, type: 'success' });
      setShowTeamForm(false); resetForms(); fetchData();
    } catch (error) {
      setMessage({ text: `❌ ${error.response?.data?.detail || 'فشل'}`, type: 'error' });
    } finally { setLoading(false); setTimeout(() => setMessage({ text: '', type: '' }), 5000); }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        ...tData, 
        team_ids: selectedTeamIds,
        options: tournamentOptions 
      };
      
      const res = await api.post('/tournaments', payload);
      setMessage({ text: '✅ تم إنشاء البطولة!', type: 'success' });
      setShowTournamentForm(false); resetForms(); fetchData();
      setTimeout(() => navigate(`/tournament/${res.data.id}`), 1500);
    } catch (error) {
      setMessage({ text: `❌ ${error.response?.data?.detail || 'فشل'}`, type: 'error' });
    } finally { setLoading(false); setTimeout(() => setMessage({ text: '', type: '' }), 5000); }
  };

  const handleCreateReferee = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/referees', refereeData);
      setRefMessage({ text: '✅ تم إضافة الحكم!', type: 'success' });
      setShowRefereeForm(false); setRefereeData({ name: '', email: '' });
      fetchData();
      setTimeout(() => setRefMessage({ text: '', type: '' }), 5000);
    } catch (error) {
      setRefMessage({ text: `❌ ${error.response?.data?.detail || 'فشل'}`, type: 'error' });
    } finally { setLoading(false); }
  };

  const handleDeleteReferee = async (id, name) => {
    if(!window.confirm(`⚠️ حذف الحكم "${name}"؟`)) return;
    try {
      await api.delete(`/referees/${id}`);
      setRefMessage({ text: '✅ تم الحذف.', type: 'success' });
      fetchData();
      setTimeout(() => setRefMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setRefMessage({ text: `❌ فشل: ${error.response?.data?.detail}`, type: 'error' });
    }
  };

  const handleDeleteTeam = async (id, name) => {
    if(!window.confirm(`⚠️ حذف فريق "${name}"؟`)) return;
    try {
      await api.delete(`/teams/${id}`);
      alert("✅ تم الحذف.");
      fetchData();
    } catch (error) { alert(`❌ فشل: ${error.response?.data?.detail}`); }
  };

  const resetForms = () => {
    setTeamData({ name: '', short_name: '', founded_date: '', colors: '' });
    setManagerData({ name: '', email: '' }); setCoachData({ name: '', email: '' });
    setTeamLogo(null); 
    setTData({ name: '', type: 'league', start_date: '', end_date: '' });
    setTournamentOptions({ group_stage_legs: 1, knockout_stage_legs: 1, num_groups: 4, teams_qualify_per_group: 2 });
    setSelectedTeamIds([]); setRefereeData({ name: '', email: '' });
  };

  const toggleTeamSelection = (id) => {
    setSelectedTeamIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
  };

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-md">
        <div><h2 className="text-3xl font-bold text-gray-800">لوحة المسؤول العام</h2><p className="text-gray-500 mt-1">مرحباً، {user?.email}</p></div>
        <button onClick={logout} className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600">خروج</button>
      </div>

      {message.text && <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</div>}
      {refMessage.text && <div className={`p-4 mb-6 rounded ${refMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{refMessage.text}</div>}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-300 overflow-x-auto">
        {[{ id: 'teams', label: '🛡️ الفرق' }, { id: 'tournaments', label: '🏆 البطولات' }, { id: 'referees', label: '⚖️ الحكام' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-3 px-6 text-lg font-semibold capitalize whitespace-nowrap ${activeTab === tab.id ? 'border-b-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md min-h-[400px]">
        
        {/* --- تبويب الفرق --- */}
        {activeTab === 'teams' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-700">قائمة الفرق</h3>
              <button onClick={() => setShowTeamForm(!showTeamForm)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">{showTeamForm ? 'إخفاء' : '+ إضافة فريق'}</button>
            </div>
            {showTeamForm && (
              <form onSubmit={handleCreateTeam} className="bg-blue-50 p-6 rounded-lg mb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="اسم الفريق" required className="border p-2 rounded w-full" value={teamData.name} onChange={e => setTeamData({...teamData, name: e.target.value})} />
                  <input placeholder="الاختصار" className="border p-2 rounded w-full" value={teamData.short_name} onChange={e => setTeamData({...teamData, short_name: e.target.value})} />
                  <input type="date" className="border p-2 rounded w-full" value={teamData.founded_date} onChange={e => setTeamData({...teamData, founded_date: e.target.value})} />
                  <input placeholder="الألوان" className="border p-2 rounded w-full" value={teamData.colors} onChange={e => setTeamData({...teamData, colors: e.target.value})} />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">شعار الفريق</label><input type="file" accept="image/*" onChange={(e) => setTeamLogo(e.target.files[0])} className="block w-full text-sm text-gray-500"/></div>
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
                      <td className="p-3">{t.logo ? <img src={`http://127.0.0.1:8000${t.logo}`} alt={t.name} className="h-10 w-10 object-cover rounded-full border" onError={(e) => e.target.src="https://via.placeholder.com/40"} /> : '-'}</td>
                      <td className="p-3 font-bold">{t.name}</td>
                      <td className="p-3">{t.short_name}</td>
                      <td className="p-3">{t.colors}</td>
                      <td className="p-3"><button onClick={() => handleDeleteTeam(t.id, t.name)} className="text-red-600 hover:text-red-800 font-bold text-sm bg-red-50 px-3 py-1 rounded">🗑️ حذف</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- تبويب البطولات (المنطق الذكي) --- */}
        {activeTab === 'tournaments' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-700">البطولات</h3>
              <button onClick={() => setShowTournamentForm(!showTournamentForm)} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">{showTournamentForm ? 'إخفاء' : '+ إضافة بطولة'}</button>
            </div>
            
            {showTournamentForm && (
              <form onSubmit={handleCreateTournament} className="bg-green-50 p-6 rounded-lg mb-6 space-y-4">
                {/* الاسم والتواريخ */}
                <input placeholder="اسم البطولة" required className="border p-2 rounded w-full" value={tData.name} onChange={e => setTData({...tData, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" required className="border p-2 rounded" value={tData.start_date} onChange={e => setTData({...tData, start_date: e.target.value})} />
                  <input type="date" required className="border p-2 rounded" value={tData.end_date} onChange={e => setTData({...tData, end_date: e.target.value})} />
                </div>

                {/* اختيار نوع البطولة */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">نوع البطولة</label>
                  <select className="border-2 border-gray-300 p-2 rounded w-full bg-white focus:border-green-500 outline-none" 
                    value={tData.type} onChange={e => setTData({...tData, type: e.target.value})}>
                    <option value="league">دوري (League)</option>
                    <option value="knockout">خروج مغلوب (Knockout)</option>
                    <option value="mixed">مختلط (Groups + Knockout) 🌟</option>
                  </select>
                </div>

                {/* ✅ المنطق الشرطي للخيارات */}
                
                {/* 1. حالة الدوري */}
                {tData.type === 'league' && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 animate-fade-in">
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">⚙️ إعدادات الدوري</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نظام المباريات</label>
                      <select className="w-full border p-2 rounded bg-white" 
                        value={tournamentOptions.group_stage_legs} 
                        onChange={e => setTournamentOptions({...tournamentOptions, group_stage_legs: parseInt(e.target.value)})}>
                        <option value="1">ذهاب فقط (مباراة واحدة)</option>
                        <option value="2">ذهاب وإياب</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 2. حالة خروج المغلوب */}
                {tData.type === 'knockout' && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 animate-fade-in">
                    <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">⚔️ إعدادات خروج المغلوب</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نظام المباريات</label>
                      <select className="w-full border p-2 rounded bg-white" 
                        value={tournamentOptions.knockout_stage_legs} 
                        onChange={e => setTournamentOptions({...tournamentOptions, knockout_stage_legs: parseInt(e.target.value)})}>
                        <option value="1">مباراة واحدة (حاسمة)</option>
                        <option value="2">ذهاب وإياب</option>
                      </select>
                    </div>
                    <p className="text-xs text-red-600 mt-2">⚠️ ملاحظة: يجب أن يكون عدد الفرق قوة لـ 2 (2, 4, 8, 16...).</p>
                  </div>
                )}

                {/* 3. حالة النظام المختلط (الأكثر تعقيداً) */}
                {tData.type === 'mixed' && (
                  <div className="space-y-4 animate-fade-in">
                    {/* أزرار المجموعات */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">📋 المرحلة 1: المجموعات</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">نظام مباريات المجموعات</label>
                          <select className="w-full border p-2 rounded bg-white text-sm" 
                            value={tournamentOptions.group_stage_legs} 
                            onChange={e => setTournamentOptions({...tournamentOptions, group_stage_legs: parseInt(e.target.value)})}>
                            <option value="1">مباراة واحدة</option>
                            <option value="2">ذهاب وإياب</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">عدد المجموعات</label>
                          <select className="w-full border p-2 rounded bg-white text-sm" 
                            value={tournamentOptions.num_groups} 
                            onChange={e => setTournamentOptions({...tournamentOptions, num_groups: parseInt(e.target.value)})}>
                            <option value="2">مجموعتين (A, B)</option>
                            <option value="4">4 مجموعات (A, B, C, D)</option>
                            <option value="8">8 مجموعات</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-3">
                         <label className="block text-xs font-bold text-gray-600 mb-1">عدد المتأهلين من كل مجموعة</label>
                         <select className="w-full border p-2 rounded bg-white text-sm" 
                           value={tournamentOptions.teams_qualify_per_group} 
                           onChange={e => setTournamentOptions({...tournamentOptions, teams_qualify_per_group: parseInt(e.target.value)})}>
                           <option value="1">الأول فقط</option>
                           <option value="2">الأول والثاني</option>
                           <option value="3">الأوائل الثلاثة (للبطولات الكبيرة)</option>
                         </select>
                      </div>
                    </div>

                    {/* أزرار الخروج المغلوب */}
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">🏆 المرحلة 2: خروج المغلوب</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نظام مباريات الأدوار الإقصائية</label>
                        <select className="w-full border p-2 rounded bg-white" 
                          value={tournamentOptions.knockout_stage_legs} 
                          onChange={e => setTournamentOptions({...tournamentOptions, knockout_stage_legs: parseInt(e.target.value)})}>
                          <option value="1">مباراة واحدة (حاسمة)</option>
                          <option value="2">ذهاب وإياب</option>
                        </select>
                      </div>
                      <p className="text-xs text-red-600 mt-2">تطبق هذه الإعدادات على ربع النهائي، نصف النهائي والنهائي.</p>
                    </div>
                  </div>
                )}

                {/* اختيار الفرق */}
                <div className="max-h-40 overflow-y-auto border p-2 rounded bg-white">
                  <p className="text-xs text-gray-500 mb-2 sticky top-0 bg-white font-bold">اختر الفرق المشاركة:</p>
                  {teams.map(t => (
                    <label key={t.id} className="flex items-center gap-2 p-1 hover:bg-gray-100 cursor-pointer">
                      <input type="checkbox" onChange={() => toggleTeamSelection(t.id)} className="rounded text-green-600" checked={selectedTeamIds.includes(t.id)} /> 
                      <span className="text-sm">{t.name}</span>
                    </label>
                  ))}
                </div>
                
                <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-3 rounded w-full font-bold hover:bg-green-700 shadow-md">
                  {loading ? 'جاري الإنشاء...' : 'إنشاء البطولة'}
                </button>
              </form>
            )}

            {/* جدول البطولات */}
            <table className="w-full text-right">
              <thead className="bg-gray-100"><tr><th className="p-3">#</th><th className="p-3">البطولة</th><th className="p-3">النوع</th><th className="p-3">الفرق</th></tr></thead>
              <tbody>
                {tournaments.map((t, i) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/tournament/${t.id}`)}>
                    <td className="p-3">{i+1}</td>
                    <td className="p-3 font-bold text-blue-600">{t.name}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'mixed' ? 'bg-purple-100 text-purple-700' : t.type === 'knockout' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{t.type === 'mixed' ? 'مختلط 🌟' : t.type === 'knockout' ? 'خروج مغلوب' : 'دوري'}</span></td>
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
              <h3 className="text-xl font-bold text-gray-700">قائمة الحكام</h3>
              <button onClick={() => setShowRefereeForm(!showRefereeForm)} className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">{showRefereeForm ? 'إخفاء' : '+ إضافة حكم'}</button>
            </div>
            {showRefereeForm && (
              <form onSubmit={handleCreateReferee} className="bg-purple-50 p-6 rounded-lg mb-6 space-y-4 max-w-lg">
                <input placeholder="اسم الحكم" required className="border p-2 rounded w-full" value={refereeData.name} onChange={e => setRefereeData({...refereeData, name: e.target.value})} />
                <input type="email" placeholder="الإيميل" required className="border p-2 rounded w-full" value={refereeData.email} onChange={e => setRefereeData({...refereeData, email: e.target.value})} />
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded w-full">إرسال دعوة</button>
              </form>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-100"><tr><th className="p-3">#</th><th className="p-3">الاسم</th><th className="p-3">الإيميل</th><th className="p-3">إجراءات</th></tr></thead>
                <tbody>
                  {referees.length === 0 ? <tr><td colSpan="4" className="p-4 text-center text-gray-500">لا يوجد حكام</td></tr> : referees.map((ref, i) => (
                    <tr key={ref.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{i+1}</td>
                      <td className="p-3 font-bold">{ref.name}</td>
                      <td className="p-3 text-gray-600">{ref.email}</td>
                      <td className="p-3"><button onClick={() => handleDeleteReferee(ref.id, ref.name)} className="text-red-600 hover:text-red-800 font-bold text-sm bg-red-50 px-3 py-1 rounded">🗑️ حذف</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;