import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

/* ══════════════════════════════════════════════════════
   15 LANGUAGES
══════════════════════════════════════════════════════ */
const LANGS = {
  en: { name: 'English',    flag: '🇬🇧', dir: 'ltr',
    loading: 'Loading your stats...', no_data: 'No player data found.',
    no_data_sub: 'This account is not linked to a registered player.',
    logout: 'Logout', matches: 'Matches', goals: 'Goals', assists: 'Assists',
    yellow: 'Yellow', red: 'Red', rating: 'Rating', position: 'Position',
    performance: 'Performance Summary', participated: 'You participated in',
    match_word: 'matches so far.', no_matches: 'No matches played yet.',
  },
  fr: { name: 'Français',   flag: '🇫🇷', dir: 'ltr',
    loading: 'Chargement...', no_data: 'Joueur introuvable.',
    no_data_sub: "Ce compte n'est pas lié à un joueur.",
    logout: 'Déconnexion', matches: 'Matchs', goals: 'Buts', assists: 'Passes déc.',
    yellow: 'Jaune', red: 'Rouge', rating: 'Note', position: 'Poste',
    performance: 'Résumé des performances', participated: 'Vous avez joué',
    match_word: 'matchs jusqu\'à présent.', no_matches: 'Aucun match joué.',
  },
  ar: { name: 'العربية',    flag: '🇸🇦', dir: 'rtl',
    loading: 'جاري التحميل...', no_data: 'لا توجد بيانات.',
    no_data_sub: 'الحساب غير مرتبط بلاعب.',
    logout: 'خروج', matches: 'المباريات', goals: 'الأهداف', assists: 'التمريرات',
    yellow: 'صفراء', red: 'حمراء', rating: 'التقييم', position: 'المركز',
    performance: 'ملخص الأداء', participated: 'شاركت في',
    match_word: 'مباراة حتى الآن.', no_matches: 'لم تشارك في أي مباراة بعد.',
  },
  es: { name: 'Español',    flag: '🇪🇸', dir: 'ltr',
    loading: 'Cargando...', no_data: 'Jugador no encontrado.',
    no_data_sub: 'Cuenta no vinculada a jugador.',
    logout: 'Salir', matches: 'Partidos', goals: 'Goles', assists: 'Asistencias',
    yellow: 'Amarilla', red: 'Roja', rating: 'Nota', position: 'Posición',
    performance: 'Resumen', participated: 'Has jugado',
    match_word: 'partidos hasta ahora.', no_matches: 'Sin partidos jugados.',
  },
  pt: { name: 'Português',  flag: '🇧🇷', dir: 'ltr',
    loading: 'Carregando...', no_data: 'Jogador não encontrado.',
    no_data_sub: 'Conta não vinculada a jogador.',
    logout: 'Sair', matches: 'Jogos', goals: 'Gols', assists: 'Assistências',
    yellow: 'Amarelo', red: 'Vermelho', rating: 'Nota', position: 'Posição',
    performance: 'Resumo', participated: 'Você jogou',
    match_word: 'jogos até agora.', no_matches: 'Nenhum jogo jogado.',
  },
  de: { name: 'Deutsch',    flag: '🇩🇪', dir: 'ltr',
    loading: 'Laden...', no_data: 'Spieler nicht gefunden.',
    no_data_sub: 'Konto nicht mit Spieler verknüpft.',
    logout: 'Abmelden', matches: 'Spiele', goals: 'Tore', assists: 'Vorlagen',
    yellow: 'Gelb', red: 'Rot', rating: 'Bewertung', position: 'Position',
    performance: 'Leistungsübersicht', participated: 'Du hast',
    match_word: 'Spiele gespielt.', no_matches: 'Keine Spiele.',
  },
  it: { name: 'Italiano',   flag: '🇮🇹', dir: 'ltr',
    loading: 'Caricamento...', no_data: 'Giocatore non trovato.',
    no_data_sub: 'Account non collegato a giocatore.',
    logout: 'Esci', matches: 'Partite', goals: 'Gol', assists: 'Assist',
    yellow: 'Giallo', red: 'Rosso', rating: 'Voto', position: 'Ruolo',
    performance: 'Riepilogo', participated: 'Hai giocato',
    match_word: 'partite finora.', no_matches: 'Nessuna partita.',
  },
  tr: { name: 'Türkçe',     flag: '🇹🇷', dir: 'ltr',
    loading: 'Yükleniyor...', no_data: 'Oyuncu bulunamadı.',
    no_data_sub: 'Hesap oyuncuya bağlı değil.',
    logout: 'Çıkış', matches: 'Maçlar', goals: 'Goller', assists: 'Asistler',
    yellow: 'Sarı', red: 'Kırmızı', rating: 'Puan', position: 'Pozisyon',
    performance: 'Performans', participated: 'Oynadın',
    match_word: 'maç şimdiye kadar.', no_matches: 'Hiç maç yok.',
  },
  ru: { name: 'Русский',    flag: '🇷🇺', dir: 'ltr',
    loading: 'Загрузка...', no_data: 'Игрок не найден.',
    no_data_sub: 'Аккаунт не связан с игроком.',
    logout: 'Выход', matches: 'Матчи', goals: 'Голы', assists: 'Передачи',
    yellow: 'Жёлтая', red: 'Красная', rating: 'Рейтинг', position: 'Позиция',
    performance: 'Сводка', participated: 'Сыграно',
    match_word: 'матчей.', no_matches: 'Нет матчей.',
  },
  zh: { name: '中文',        flag: '🇨🇳', dir: 'ltr',
    loading: '加载中...', no_data: '未找到球员。',
    no_data_sub: '账户未关联球员。',
    logout: '退出', matches: '比赛', goals: '进球', assists: '助攻',
    yellow: '黄牌', red: '红牌', rating: '评分', position: '位置',
    performance: '表现摘要', participated: '参与了',
    match_word: '场比赛。', no_matches: '暂无比赛。',
  },
  ja: { name: '日本語',      flag: '🇯🇵', dir: 'ltr',
    loading: '読み込み中...', no_data: '選手が見つかりません。',
    no_data_sub: 'アカウントに選手が紐づいていません。',
    logout: 'ログアウト', matches: '試合', goals: 'ゴール', assists: 'アシスト',
    yellow: 'イエロー', red: 'レッド', rating: '評価', position: 'ポジション',
    performance: 'パフォーマンス', participated: '参加した試合',
    match_word: '試合。', no_matches: '試合なし。',
  },
  ko: { name: '한국어',      flag: '🇰🇷', dir: 'ltr',
    loading: '로딩 중...', no_data: '선수를 찾을 수 없습니다.',
    no_data_sub: '계정이 선수와 연결되지 않았습니다.',
    logout: '로그아웃', matches: '경기', goals: '골', assists: '어시스트',
    yellow: '옐로우', red: '레드', rating: '평점', position: '포지션',
    performance: '성과 요약', participated: '참가한 경기',
    match_word: '경기.', no_matches: '경기 없음.',
  },
  nl: { name: 'Nederlands',  flag: '🇳🇱', dir: 'ltr',
    loading: 'Laden...', no_data: 'Speler niet gevonden.',
    no_data_sub: 'Account niet gekoppeld aan speler.',
    logout: 'Uitloggen', matches: 'Wedstrijden', goals: 'Doelpunten', assists: 'Assists',
    yellow: 'Geel', red: 'Rood', rating: 'Beoordeling', position: 'Positie',
    performance: 'Prestatie', participated: 'Je hebt',
    match_word: 'wedstrijden gespeeld.', no_matches: 'Geen wedstrijden.',
  },
  pl: { name: 'Polski',      flag: '🇵🇱', dir: 'ltr',
    loading: 'Ładowanie...', no_data: 'Zawodnik nie znaleziony.',
    no_data_sub: 'Konto nie powiązane z zawodnikiem.',
    logout: 'Wyloguj', matches: 'Mecze', goals: 'Gole', assists: 'Asysty',
    yellow: 'Żółta', red: 'Czerwona', rating: 'Ocena', position: 'Pozycja',
    performance: 'Podsumowanie', participated: 'Zagrałeś',
    match_word: 'meczów.', no_matches: 'Brak meczów.',
  },
  sw: { name: 'Kiswahili',   flag: '🇰🇪', dir: 'ltr',
    loading: 'Inapakia...', no_data: 'Mchezaji hajapatikana.',
    no_data_sub: 'Akaunti haijaunganishwa na mchezaji.',
    logout: 'Toka', matches: 'Mechi', goals: 'Magoli', assists: 'Msaada',
    yellow: 'Njano', red: 'Nyekundu', rating: 'Ukadiriaji', position: 'Nafasi',
    performance: 'Muhtasari', participated: 'Umeshiriki katika',
    match_word: 'mechi hadi sasa.', no_matches: 'Hakuna mechi.',
  },
};

/* ══════════════════════════════════════════════════════
   LANGUAGE SELECTOR
══════════════════════════════════════════════════════ */
const LangSelector = ({ current, onChange }) => {
  const [open, setOpen] = useState(false);
  const lang = LANGS[current];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all border"
        style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)', color: '#fff' }}
      >
        <span className="text-lg leading-none">{lang.flag}</span>
        <span className="hidden sm:block text-white/80">{lang.name}</span>
        <span className="text-[10px] text-white/40">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 z-50 rounded-2xl border overflow-hidden shadow-2xl"
            style={{ background: '#0e1a14', borderColor: 'rgba(255,255,255,0.08)', width: 180, maxHeight: 340, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {Object.entries(LANGS).map(([code, l]) => (
              <button key={code}
                onClick={() => { onChange(code); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all text-left"
                style={{
                  background: current === code ? 'rgba(34,197,94,0.2)' : 'transparent',
                  color: current === code ? '#4ade80' : 'rgba(255,255,255,0.6)',
                  fontWeight: current === code ? 700 : 400,
                }}
              >
                <span className="text-xl">{l.flag}</span>
                <span>{l.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   STAT BOX
══════════════════════════════════════════════════════ */
const StatBox = ({ label, value, icon, gradient, delay = 0 }) => (
  <div
    className="relative overflow-hidden rounded-2xl p-5 shadow-xl group"
    style={{
      background: gradient,
      animation: `fadeUp 0.5s ease ${delay}ms both`,
    }}
  >
    {/* big watermark icon */}
    <div className="absolute -top-2 -right-2 text-6xl opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 select-none pointer-events-none">
      {icon}
    </div>
    <div className="relative z-10">
      <div className="text-3xl font-black text-white mb-1 tabular-nums">{value ?? 0}</div>
      <div className="text-[11px] font-bold text-white/60 uppercase tracking-widest">{label}</div>
    </div>
    {/* shimmer line at bottom */}
    <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
  </div>
);

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const PlayerDashboard = () => {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lang, setLang] = useState('en');
  const t = LANGS[lang];

  useEffect(() => { fetchRealData(); }, []);

  const fetchRealData = async () => {
    try {
      const res = await api.get('/me/player-stats');
      setData(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      alert('⚠️ This account is not linked to a registered player.');
    } finally {
      setLoading(false);
    }
  };

  /* ── LOADING ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07120d' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-[3px] border-green-900" />
          <div className="absolute inset-0 rounded-full border-[3px] border-t-green-400 border-transparent animate-spin" />
        </div>
        <p className="text-green-400/70 text-sm font-bold uppercase tracking-widest animate-pulse">{t.loading}</p>
      </div>
    </div>
  );

  /* ── NO DATA ── */
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#07120d' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="text-center p-10 rounded-3xl border max-w-md"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-black text-red-400 mb-2">{t.no_data}</h2>
        <p className="text-gray-500 text-sm mb-6">{t.no_data_sub}</p>
        <button onClick={logout}
          className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-xl font-bold transition">
          {t.logout}
        </button>
      </div>
    </div>
  );

  const playerImage = data.photo
    ? `http://127.0.0.1:8000${data.photo}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=10b981&color=fff&size=256&bold=true`;

  const teamLogo = data.team_logo ? `http://127.0.0.1:8000${data.team_logo}` : null;
  const s = data.stats || {};
  const rating = s.rating ?? null;
  const ratingColor = rating >= 7.5 ? '#22c55e' : rating >= 6 ? '#facc15' : rating ? '#ef4444' : '#6b7280';
  const ratingPct = rating ? (rating / 10) : 0;

  return (
    <div dir={t.dir} style={{ background: '#07120d', fontFamily: "'Outfit', 'Segoe UI', sans-serif", minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-ring { 0%,100%{opacity:.4} 50%{opacity:.8} }
        * { box-sizing: border-box; }
      `}</style>

      {/* ════════════════════════════════
          HERO
      ════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ minHeight: 340 }}>

        {/* Layered background */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 50%, rgba(20,100,50,0.35) 0%, transparent 65%),
            radial-gradient(ellipse 50% 80% at 90% 10%, rgba(30,58,138,0.15) 0%, transparent 55%),
            #07120d
          `
        }} />

        {/* Subtle pitch lines texture */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.035 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={i} x1="0" y1={`${(i + 1) * 8.3}%`} x2="100%" y2={`${(i + 1) * 8.3}%`}
              stroke="white" strokeWidth="1" />
          ))}
          <circle cx="70%" cy="50%" r="80" fill="none" stroke="white" strokeWidth="1" />
        </svg>

        {/* Topbar */}
        <div className="relative z-20 flex items-center justify-between px-6 md:px-10 pt-5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}>
              ⚽
            </div>
            <span className="text-white/30 text-xs font-bold uppercase tracking-widest hidden sm:block">
              Player Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <LangSelector current={lang} onChange={setLang} />
            <button onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border"
              style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }}>
              <span>{t.logout}</span>
              <span style={{ direction: 'ltr' }}>→</span>
            </button>
          </div>
        </div>

        {/* Player info block */}
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-7 px-6 md:px-10 pt-6 pb-10"
          style={{ animation: 'fadeUp 0.6s ease both' }}>

          {/* Photo */}
          <div className="relative shrink-0">
            {/* glow halo */}
            <div className="absolute -inset-4 rounded-3xl pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.25) 0%, transparent 70%)', animation: 'pulse-ring 3s ease infinite' }} />
            <div className="relative rounded-3xl overflow-hidden border-2 shadow-2xl"
              style={{ width: 148, height: 148, borderColor: 'rgba(34,197,94,0.45)', boxShadow: '0 0 50px rgba(34,197,94,0.2)' }}>
              <img src={playerImage} alt={data.name} className="w-full h-full object-cover" />
              {/* inner shimmer */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(140deg, rgba(255,255,255,0.07) 0%, transparent 50%)' }} />
            </div>
            {/* jersey number */}
            <div className="absolute -bottom-3 -right-3 w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg text-white border-2 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', borderColor: '#07120d' }}>
              {data.jersey_number || '?'}
            </div>
          </div>

          {/* Name / position / team */}
          <div className="flex-1 text-center md:text-left">
            {/* team row */}
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2.5">
              {teamLogo && (
                <img src={teamLogo} alt="team" className="w-5 h-5 object-contain opacity-80" />
              )}
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(74,222,128,0.6)' }}>
                {data.team_name}
              </span>
            </div>
            {/* name */}
            <h1 className="text-white font-black uppercase mb-3 leading-none"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.02em', textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>
              {data.name}
            </h1>
            {/* position chip */}
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border"
              style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)', color: '#4ade80' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {data.position || 'Player'}
            </span>
          </div>

          {/* Rating ring - desktop */}
          <div className="hidden md:flex flex-col items-center gap-1.5 shrink-0 mb-4"
            style={{ animation: 'fadeUp 0.6s ease 0.15s both', opacity: 0 }}>
            <div className="relative" style={{ width: 88, height: 88 }}>
              <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                <circle cx="44" cy="44" r="36" fill="none" stroke={ratingColor} strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - ratingPct)}`}
                  style={{ transition: 'stroke-dashoffset 1.2s ease', filter: `drop-shadow(0 0 6px ${ratingColor}88)` }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black" style={{ color: ratingColor }}>
                  {rating ?? '—'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.rating}</span>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #07120d)' }} />
      </div>

      {/* ════════════════════════════════
          STATS GRID
      ════════════════════════════════ */}
      <div className="px-6 md:px-10 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatBox label={t.matches} value={s.matches}      icon="📅" delay={0}   gradient="linear-gradient(135deg,#1e3a8a,#2563eb)" />
          <StatBox label={t.goals}   value={s.goals}        icon="⚽" delay={60}  gradient="linear-gradient(135deg,#14532d,#16a34a)" />
          <StatBox label={t.assists} value={s.assists}      icon="🎯" delay={120} gradient="linear-gradient(135deg,#4c1d95,#7c3aed)" />
          <StatBox label={t.yellow}  value={s.yellow_cards} icon="🟨" delay={180} gradient="linear-gradient(135deg,#78350f,#d97706)" />
          <StatBox label={t.red}     value={s.red_cards}    icon="🟥" delay={240} gradient="linear-gradient(135deg,#7f1d1d,#dc2626)" />
          {/* Rating mobile */}
          <div className="md:hidden relative overflow-hidden rounded-2xl p-5 shadow-xl"
            style={{ background: `linear-gradient(135deg, ${ratingColor}55, ${ratingColor}99)`, animation: 'fadeUp 0.5s ease 300ms both' }}>
            <div className="text-3xl font-black text-white mb-1">{rating ?? '—'}</div>
            <div className="text-[11px] font-bold text-white/60 uppercase tracking-widest">{t.rating}</div>
          </div>
          {/* Rating desktop (same slot) */}
          <div className="hidden md:block relative overflow-hidden rounded-2xl p-5 shadow-xl"
            style={{ background: `linear-gradient(135deg, ${ratingColor}44, ${ratingColor}88)`, animation: 'fadeUp 0.5s ease 300ms both' }}>
            <div className="text-3xl font-black text-white mb-1">{rating ?? '—'}</div>
            <div className="text-[11px] font-bold text-white/60 uppercase tracking-widest">{t.rating}</div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════
          PERFORMANCE SUMMARY
      ════════════════════════════════ */}
      <div className="px-6 md:px-10 pb-12" style={{ animation: 'fadeUp 0.6s ease 0.4s both', opacity: 0 }}>
        <div className="rounded-3xl border p-7 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.018)', borderColor: 'rgba(255,255,255,0.06)' }}>

          {/* decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)', transform: 'translate(20%,-20%)' }} />

          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-1 h-6 rounded-full bg-green-500" />
            <h2 className="text-sm font-black text-white/80 uppercase tracking-widest">{t.performance}</h2>
          </div>

          <p className="text-gray-400 text-sm leading-relaxed relative z-10 mb-6">
            {!s.matches || s.matches === 0
              ? t.no_matches
              : `${t.participated} ${s.matches} ${t.match_word}`}
          </p>

          {/* Progress bars */}
          {s.matches > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10">
              {[
                { label: t.goals,   value: s.goals ?? 0,        color: '#22c55e' },
                { label: t.assists, value: s.assists ?? 0,      color: '#8b5cf6' },
                { label: t.yellow,  value: s.yellow_cards ?? 0, color: '#f59e0b' },
              ].map(bar => (
                <div key={bar.label}>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{bar.label}</span>
                    <span className="font-black" style={{ color: bar.color }}>{bar.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full"
                      style={{
                        width: `${Math.min((bar.value / Math.max(s.matches, 1)) * 100, 100)}%`,
                        background: bar.color,
                        transition: 'width 1.2s ease',
                        boxShadow: `0 0 8px ${bar.color}88`,
                      }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default PlayerDashboard;