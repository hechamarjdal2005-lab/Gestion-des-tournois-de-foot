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
  const [coachPhoto, setCoachPhoto] = useState(null); // ✅ صورة المدرب

  // بيانات البطولة
  const [tData, setTData] = useState({ name: '', type: 'league', start_date: '', end_date: '' });
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [tournamentOptions, setTournamentOptions] = useState({
    group_stage_legs: 1, knockout_stage_legs: 1, num_groups: 4, teams_qualify_per_group: 2,
  });

  const [refereeData, setRefereeData] = useState({ name: '', email: '', photo: null }); // ✅ صورة الحكم
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
      if (coachPhoto) formData.append('coach_photo', coachPhoto); // ✅
      const res = await api.post('/teams', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage({ text: `✅ ${res.data.message}`, type: 'success' });
      setShowTeamForm(false); resetForms(); fetchData();
    } catch (error) {
      setMessage({ text: `❌ ${error.response?.data?.detail || 'فشل'}`, type: 'error' });
    } finally { setLoading(false); setTimeout(() => setMessage({ text: '', type: '' }), 5000); }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    if (selectedTeamIds.length < 2) {
      setMessage({ text: '❌ اختر فريقين على الأقل', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/tournaments', {
        name: tData.name, type: tData.type,
        start_date: tData.start_date, end_date: tData.end_date,
        team_ids: selectedTeamIds,
      });
      await api.post(`/tournaments/${res.data.id}/generate-matches`, {
        group_stage_legs: tournamentOptions.group_stage_legs,
        knockout_stage_legs: tournamentOptions.knockout_stage_legs,
        num_groups: tournamentOptions.num_groups,
        teams_qualify_per_group: tournamentOptions.teams_qualify_per_group,
      });
      setMessage({ text: '✅ تم إنشاء البطولة وتوليد المباريات!', type: 'success' });
      setShowTournamentForm(false); resetForms(); fetchData();
      setTimeout(() => navigate(`/tournament/${res.data.id}`), 1500);
    } catch (error) {
      setMessage({ text: `❌ ${error.response?.data?.detail || 'فشل'}`, type: 'error' });
    } finally { setLoading(false); setTimeout(() => setMessage({ text: '', type: '' }), 6000); }
  };

  // ✅ handleCreateReferee مع صورة
 const handleCreateReferee = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    // ✅ إنشاء FormData لإرسال البيانات بشكل صحيح (يشمل الصورة إن وجدت)
    const formData = new FormData();
    formData.append('name', refereeData.name);
    formData.append('email', refereeData.email);
    
    // إذا كان هناك حقل صورة في الفورم أضفه هنا، وإلا تجاهله
    if (refereeData.photo) {
      formData.append('photo', refereeData.photo);
    }

    // ✅ إرسال الطلب مع تحديد نوع المحتوى تلقائياً لـ FormData
    await api.post('/referees', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    setRefMessage({ text: '✅ تم إضافة الحكم وإرسال الدعوة بنجاح!', type: 'success' });
    setShowRefereeForm(false); 
    setRefereeData({ name: '', email: '', photo: null }); // تصفير البيانات
    fetchData(); // تحديث القائمة
    
    setTimeout(() => setRefMessage({ text: '', type: '' }), 5000);
  } catch (error) {
    console.error("Referee Error:", error);
    const msg = error.response?.data?.detail || "فشل الإضافة";
    setRefMessage({ text: `❌ ${msg}`, type: 'error' });
    
    // 🔍 رسالة إضافية للتشخيص
    if (msg.includes("Email failed")) {
       alert("⚠️ تم إنشاء الحساب ولكن فشل إرسال الإيميل! تحقق من إعدادات السيرفر.");
    }
  } finally { 
    setLoading(false); 
  }
};

  const handleDeleteReferee = async (id, name) => {
    if (!window.confirm(`⚠️ حذف الحكم "${name}"؟`)) return;
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
    if (!window.confirm(`⚠️ حذف فريق "${name}"؟`)) return;
    try {
      await api.delete(`/teams/${id}`);
      alert("✅ تم الحذف."); fetchData();
    } catch (error) { alert(`❌ فشل: ${error.response?.data?.detail}`); }
  };

  const resetForms = () => {
    setTeamData({ name: '', short_name: '', founded_date: '', colors: '' });
    setManagerData({ name: '', email: '' }); setCoachData({ name: '', email: '' });
    setTeamLogo(null); setCoachPhoto(null);
    setTData({ name: '', type: 'league', start_date: '', end_date: '' });
    setTournamentOptions({ group_stage_legs: 1, knockout_stage_legs: 1, num_groups: 4, teams_qualify_per_group: 2 });
    setSelectedTeamIds([]); setRefereeData({ name: '', email: '', photo: null });
  };

  const toggleTeamSelection = (id) =>
    setSelectedTeamIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const getGenerationSummary = () => {
    const n = selectedTeamIds.length;
    if (n < 2) return null;
    const { type } = tData;
    const { group_stage_legs, knockout_stage_legs, num_groups, teams_qualify_per_group } = tournamentOptions;
    if (type === 'league') {
      const m = group_stage_legs === 2 ? n*(n-1) : (n*(n-1))/2;
      return `${n} فرق — ${group_stage_legs===2?'ذهاب وإياب':'ذهاب فقط'} — ${Math.round(m)} مباراة`;
    }
    if (type === 'knockout') return `${n} فرق — ${Math.log2(n)} أدوار — ${knockout_stage_legs===2?'ذهاب وإياب':'مباراة واحدة'}`;
    if (type === 'mixed') return `${n} فرق — ${num_groups} مجموعات — ${teams_qualify_per_group} متأهلين/مجموعة — الإقصاء: ${knockout_stage_legs===2?'ذهاب وإياب':'مباراة واحدة'}`;
    return null;
  };

  const summary = getGenerationSummary();

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-md">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">لوحة المسؤول العام</h2>
          <p className="text-gray-500 mt-1">مرحباً، {user?.email}</p>
        </div>
        <button onClick={logout} className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600">خروج</button>
      </div>

      {message.text && <div className={`p-4 mb-6 rounded-lg font-bold ${message.type==='success'?'bg-green-100 text-green-800 border border-green-300':'bg-red-100 text-red-800 border border-red-300'}`}>{message.text}</div>}
      {refMessage.text && <div className={`p-4 mb-6 rounded-lg font-bold ${refMessage.type==='success'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{refMessage.text}</div>}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-300 overflow-x-auto">
        {[{id:'teams',label:'🛡️ الفرق'},{id:'tournaments',label:'🏆 البطولات'},{id:'referees',label:'⚖️ الحكام'}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-6 text-lg font-semibold whitespace-nowrap transition-all ${activeTab===tab.id?'border-b-4 border-blue-600 text-blue-600':'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md min-h-[400px]">

        {/* ══════════════ تبويب الفرق ══════════════ */}
        {activeTab === 'teams' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-700">قائمة الفرق</h3>
              <button onClick={() => setShowTeamForm(!showTeamForm)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                {showTeamForm ? 'إخفاء' : '+ إضافة فريق'}
              </button>
            </div>
            {showTeamForm && (
              <form onSubmit={handleCreateTeam} className="bg-blue-50 p-6 rounded-lg mb-6 space-y-4 border border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="اسم الفريق" required className="border p-2 rounded w-full" value={teamData.name} onChange={e => setTeamData({...teamData, name: e.target.value})} />
                  <input placeholder="الاختصار" className="border p-2 rounded w-full" value={teamData.short_name} onChange={e => setTeamData({...teamData, short_name: e.target.value})} />
                  <input type="date" className="border p-2 rounded w-full" value={teamData.founded_date} onChange={e => setTeamData({...teamData, founded_date: e.target.value})} />
                  <input placeholder="الألوان" className="border p-2 rounded w-full" value={teamData.colors} onChange={e => setTeamData({...teamData, colors: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🖼️ شعار الفريق</label>
                  <input type="file" accept="image/*" onChange={e => setTeamLogo(e.target.files[0])} className="block w-full text-sm text-gray-500 border rounded p-1.5 bg-white" />
                </div>
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-bold text-gray-600">👤 بيانات المسؤول</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="اسم المسؤول" required className="border p-2 rounded" value={managerData.name} onChange={e => setManagerData({...managerData, name: e.target.value})} />
                    <input type="email" placeholder="إيميل المسؤول" required className="border p-2 rounded" value={managerData.email} onChange={e => setManagerData({...managerData, email: e.target.value})} />
                  </div>
                </div>
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-bold text-gray-600">🎽 بيانات المدرب</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="اسم المدرب" required className="border p-2 rounded" value={coachData.name} onChange={e => setCoachData({...coachData, name: e.target.value})} />
                    <input type="email" placeholder="إيميل المدرب" required className="border p-2 rounded" value={coachData.email} onChange={e => setCoachData({...coachData, email: e.target.value})} />
                  </div>
                  {/* ✅ صورة المدرب */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📸 صورة المدرب <span className="text-gray-400 font-normal">(اختياري)</span></label>
                    <div className="flex items-center gap-3">
                      <input type="file" accept="image/*" onChange={e => setCoachPhoto(e.target.files[0])} className="flex-1 text-sm text-gray-500 border rounded p-1.5 bg-white" />
                      {coachPhoto && (
                        <img src={URL.createObjectURL(coachPhoto)} alt="preview" className="h-10 w-10 rounded-full object-cover border-2 border-blue-300" />
                      )}
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 font-bold">
                  {loading ? 'جاري الإنشاء...' : 'إنشاء الفريق'}
                </button>
              </form>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-100">
                  <tr><th className="p-3">#</th><th className="p-3">الشعار</th><th className="p-3">الفريق</th><th className="p-3">الاختصار</th><th className="p-3">الألوان</th><th className="p-3">إجراءات</th></tr>
                </thead>
                <tbody>
                  {teams.map((t, i) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{i+1}</td>
                      <td className="p-3">{t.logo ? <img src={`http://127.0.0.1:8000${t.logo}`} alt={t.name} className="h-10 w-10 object-cover rounded-full border" onError={e=>e.target.src="https://via.placeholder.com/40"} /> : <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">🛡️</div>}</td>
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

        {/* ══════════════ تبويب البطولات ══════════════ */}
        {activeTab === 'tournaments' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-700">البطولات</h3>
              <button onClick={() => setShowTournamentForm(!showTournamentForm)} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                {showTournamentForm ? 'إخفاء' : '+ إضافة بطولة'}
              </button>
            </div>
            {showTournamentForm && (
              <form onSubmit={handleCreateTournament} className="bg-green-50 p-6 rounded-lg mb-6 space-y-4 border border-green-200">
                <input placeholder="اسم البطولة" required className="border p-2 rounded w-full focus:border-green-500 outline-none" value={tData.name} onChange={e => setTData({...tData, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">تاريخ البداية</label><input type="date" required className="border p-2 rounded w-full" value={tData.start_date} onChange={e => setTData({...tData, start_date: e.target.value})} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">تاريخ النهاية</label><input type="date" required className="border p-2 rounded w-full" value={tData.end_date} onChange={e => setTData({...tData, end_date: e.target.value})} /></div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">نوع البطولة</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{value:'league',label:'دوري',icon:'📊',desc:'كل فريق يلعب مع الباقين'},{value:'knockout',label:'خروج مغلوب',icon:'⚡',desc:'الخاسر يخرج مباشرة'},{value:'mixed',label:'مختلط',icon:'🌟',desc:'مجموعات + إقصاء'}].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setTData({...tData, type: opt.value})}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${tData.type===opt.value?'border-green-500 bg-green-100 text-green-800':'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                        <div className="text-2xl mb-1">{opt.icon}</div>
                        <div className="font-bold text-sm">{opt.label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {tData.type === 'league' && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-blue-800 mb-3">📊 إعدادات الدوري</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[{value:1,label:'ذهاب فقط',icon:'➡️',desc:'مباراة واحدة'},{value:2,label:'ذهاب وإياب',icon:'🔄',desc:'مبارتان'}].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setTournamentOptions({...tournamentOptions, group_stage_legs: opt.value})}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${tournamentOptions.group_stage_legs===opt.value?'border-blue-500 bg-blue-100 text-blue-800':'border-gray-200 bg-white text-gray-600'}`}>
                          <div className="text-xl mb-1">{opt.icon}</div><div className="font-bold text-sm">{opt.label}</div><div className="text-xs text-gray-400">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {tData.type === 'knockout' && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-bold text-red-800 mb-3">⚡ إعدادات خروج المغلوب</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[{value:1,label:'مباراة واحدة',icon:'⚡',desc:'الفائز مباشرة'},{value:2,label:'ذهاب وإياب',icon:'🔄',desc:'النهائي مباراة واحدة'}].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setTournamentOptions({...tournamentOptions, knockout_stage_legs: opt.value})}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${tournamentOptions.knockout_stage_legs===opt.value?'border-red-500 bg-red-100 text-red-800':'border-gray-200 bg-white text-gray-600'}`}>
                          <div className="text-xl mb-1">{opt.icon}</div><div className="font-bold text-sm">{opt.label}</div><div className="text-xs text-gray-400">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-red-500 mt-2">⚠️ عدد الفرق يجب أن يكون قوة لـ 2</p>
                  </div>
                )}
                {tData.type === 'mixed' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-bold text-blue-800 mb-3">📋 المرحلة 1: المجموعات</h4>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">نظام المجموعات</label>
                          <select className="w-full border p-2 rounded bg-white text-sm" value={tournamentOptions.group_stage_legs} onChange={e => setTournamentOptions({...tournamentOptions, group_stage_legs: parseInt(e.target.value)})}>
                            <option value="1">مباراة واحدة</option><option value="2">ذهاب وإياب</option>
                          </select></div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">عدد المجموعات</label>
                          <select className="w-full border p-2 rounded bg-white text-sm" value={tournamentOptions.num_groups} onChange={e => setTournamentOptions({...tournamentOptions, num_groups: parseInt(e.target.value)})}>
                            <option value="2">مجموعتين</option><option value="4">4 مجموعات</option><option value="8">8 مجموعات</option>
                          </select></div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">متأهلون / مجموعة</label>
                          <select className="w-full border p-2 rounded bg-white text-sm" value={tournamentOptions.teams_qualify_per_group} onChange={e => setTournamentOptions({...tournamentOptions, teams_qualify_per_group: parseInt(e.target.value)})}>
                            <option value="1">الأول فقط</option><option value="2">الأول والثاني</option><option value="3">الأوائل الثلاثة</option>
                          </select></div>
                      </div>
                      <p className="text-xs text-blue-600">إجمالي المتأهلين: <strong>{tournamentOptions.num_groups * tournamentOptions.teams_qualify_per_group} فريق</strong></p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-bold text-red-800 mb-3">🏆 المرحلة 2: الأدوار الإقصائية</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[{value:1,label:'مباراة واحدة',icon:'⚡',desc:'الفائز مباشرة'},{value:2,label:'ذهاب وإياب',icon:'🔄',desc:'النهائي واحدة'}].map(opt => (
                          <button key={opt.value} type="button" onClick={() => setTournamentOptions({...tournamentOptions, knockout_stage_legs: opt.value})}
                            className={`p-3 rounded-lg border-2 text-center transition-all ${tournamentOptions.knockout_stage_legs===opt.value?'border-red-500 bg-red-100 text-red-800':'border-gray-200 bg-white text-gray-600'}`}>
                            <div className="text-xl mb-1">{opt.icon}</div><div className="font-bold text-sm">{opt.label}</div><div className="text-xs text-gray-400">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">الفرق المشاركة <span className="text-green-600 font-normal">({selectedTeamIds.length} مختارين)</span></label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg bg-white divide-y">
                    {teams.map(t => (
                      <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" onChange={() => toggleTeamSelection(t.id)} checked={selectedTeamIds.includes(t.id)} className="rounded text-green-600" />
                        <span className="text-sm">{t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {summary && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 font-medium">📋 سيتم توليد: <strong>{summary}</strong></div>}
                <button type="submit" disabled={loading || selectedTeamIds.length < 2}
                  className={`w-full py-3 rounded-lg font-bold text-white text-lg shadow-md transition-all ${loading || selectedTeamIds.length < 2 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                  {loading ? '⏳ جاري الإنشاء...' : '✅ إنشاء البطولة وتوليد المباريات'}
                </button>
              </form>
            )}
            <table className="w-full text-right">
              <thead className="bg-gray-100"><tr><th className="p-3">#</th><th className="p-3">البطولة</th><th className="p-3">النوع</th><th className="p-3">الفرق</th></tr></thead>
              <tbody>
                {tournaments.map((t, i) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/tournament/${t.id}`)}>
                    <td className="p-3">{i+1}</td>
                    <td className="p-3 font-bold text-blue-600 hover:underline">{t.name}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${t.type==='mixed'?'bg-purple-100 text-purple-700':t.type==='knockout'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>{t.type==='mixed'?'🌟 مختلط':t.type==='knockout'?'⚡ خروج مغلوب':'📊 دوري'}</span></td>
                    <td className="p-3">{t.teams_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ══════════════ تبويب الحكام ══════════════ */}
        {activeTab === 'referees' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-700">قائمة الحكام</h3>
              <button onClick={() => setShowRefereeForm(!showRefereeForm)} className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
                {showRefereeForm ? 'إخفاء' : '+ إضافة حكم'}
              </button>
            </div>
            {showRefereeForm && (
              <form onSubmit={handleCreateReferee} className="bg-purple-50 p-6 rounded-lg mb-6 space-y-4 max-w-lg border border-purple-200">
                <input placeholder="اسم الحكم" required className="border p-2 rounded w-full" value={refereeData.name} onChange={e => setRefereeData({...refereeData, name: e.target.value})} />
                <input type="email" placeholder="الإيميل" required className="border p-2 rounded w-full" value={refereeData.email} onChange={e => setRefereeData({...refereeData, email: e.target.value})} />
                {/* ✅ صورة الحكم */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📸 صورة الحكم <span className="text-gray-400 font-normal">(اختياري)</span></label>
                  <div className="flex items-center gap-3">
                    <input type="file" accept="image/*" onChange={e => setRefereeData({...refereeData, photo: e.target.files[0]})} className="flex-1 text-sm text-gray-500 border rounded p-1.5 bg-white" />
                    {refereeData.photo && (
                      <img src={URL.createObjectURL(refereeData.photo)} alt="preview" className="h-10 w-10 rounded-full object-cover border-2 border-purple-300" />
                    )}
                  </div>
                </div>
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded w-full font-bold hover:bg-purple-700">إرسال دعوة</button>
              </form>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-100">
                  <tr><th className="p-3">#</th><th className="p-3">الصورة</th><th className="p-3">الاسم</th><th className="p-3">الإيميل</th><th className="p-3">إجراءات</th></tr>
                </thead>
                <tbody>
                  {referees.length === 0
                    ? <tr><td colSpan="5" className="p-4 text-center text-gray-500">لا يوجد حكام</td></tr>
                    : referees.map((ref, i) => (
                      <tr key={ref.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{i+1}</td>
                        <td className="p-3">
                          {ref.photo
                            ? <img src={`http://127.0.0.1:8000${ref.photo}`} alt={ref.name} className="h-10 w-10 object-cover rounded-full border-2 border-purple-200" />
                            : <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-xl">⚖️</div>
                          }
                        </td>
                        <td className="p-3 font-bold">{ref.name}</td>
                        <td className="p-3 text-gray-600">{ref.email}</td>
                        <td className="p-3"><button onClick={() => handleDeleteReferee(ref.id, ref.name)} className="text-red-600 hover:text-red-800 font-bold text-sm bg-red-50 px-3 py-1 rounded">🗑️ حذف</button></td>
                      </tr>
                    ))
                  }
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