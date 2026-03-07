import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const BASE = 'http://127.0.0.1:8000';

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referees, setReferees] = useState([]);
  const [activeTab, setActiveTab] = useState('matches');

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genConfig, setGenConfig] = useState({ num_groups: 2, teams_qualify_per_group: 2 });

  const [editingMatchId, setEditingMatchId] = useState(null);
  const [matchForm, setMatchForm] = useState({ home: '', away: '', referee_id: '', penalty_home: '', penalty_away: '' });

  useEffect(() => { fetchTournament(); fetchReferees(); }, [id]);

  const fetchReferees = async () => {
    try { const res = await api.get('/referees'); setReferees(res.data); } catch (e) { console.error(e); }
  };

  const fetchTournament = async () => {
    try {
      const res = await api.get(`/tournaments/${id}`);
      setTournament(res.data);
      const type = res.data.type;
      if (type === 'league') setActiveTab('standings');
      else if (type === 'knockout') setActiveTab('matches');
      else if (type === 'mixed') setActiveTab('groups');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleGenerateMatches = async () => {
    if (!window.confirm('Generate fixtures?')) return;
    try {
      await api.post(`/tournaments/${id}/generate-matches`, {
        num_groups: genConfig.num_groups,
        teams_qualify_per_group: genConfig.teams_qualify_per_group,
        knockout_stage_legs: tournament?.knockout_stage_legs ?? genConfig.knockout_stage_legs,
        group_stage_legs: 1,
      });
      setShowGenerateModal(false);
      fetchTournament();
    } catch (e) { alert('❌ ' + (e.response?.data?.detail || '')); }
  };

  const handleSaveMatchData = async (matchId, isScoreUpdate) => {
    const currentMatch = tournament.matches.find(m => String(m.id) === String(matchId));
    const effectiveRefereeId = matchForm.referee_id ? parseInt(matchForm.referee_id) : currentMatch?.referee_id ? parseInt(currentMatch.referee_id) : null;
    if (!effectiveRefereeId) { alert('⚠️ Please assign a referee first!'); return; }
    try {
      const scoreHome = isScoreUpdate ? (parseInt(matchForm.home) || 0) : (currentMatch?.score_home ?? 0);
      const scoreAway = isScoreUpdate ? (parseInt(matchForm.away) || 0) : (currentMatch?.score_away ?? 0);
      const isGroupMatch = !!currentMatch?.group_name;
      const isDraw = scoreHome === scoreAway;
      const penaltyHome = !isGroupMatch && isDraw && matchForm.penalty_home !== '' ? parseInt(matchForm.penalty_home) : null;
      const penaltyAway = !isGroupMatch && isDraw && matchForm.penalty_away !== '' ? parseInt(matchForm.penalty_away) : null;
      const payload = {
        referee_id: effectiveRefereeId, score_home: scoreHome, score_away: scoreAway,
        status: isScoreUpdate ? 'finished' : (currentMatch?.status || 'scheduled'),
        ...(penaltyHome !== null ? { penalty_home: penaltyHome } : {}),
        ...(penaltyAway !== null ? { penalty_away: penaltyAway } : {}),
      };
      await api.post(`/matches/update-details?match_id=${matchId}`, payload, { headers: { 'Content-Type': 'application/json' } });
      setEditingMatchId(null);
      fetchTournament();
    } catch (e) { alert('❌ ' + (e.response?.data?.detail || 'Failed')); }
  };

  const handleDeleteTournament = async () => {
    if (!window.confirm('Delete this tournament?')) return;
    try { await api.delete(`/tournaments/${id}`); navigate('/admin/dashboard'); } catch (e) { alert('❌ Failed'); }
  };

  const handleAdvanceRound = async () => {
    if (!window.confirm('Advance to the next round?')) return;
    try { const res = await api.post(`/tournaments/${id}/advance-round`); alert('✅ ' + (res.data?.message || 'Done!')); fetchTournament(); }
    catch (e) { alert('❌ ' + (e.response?.data?.detail || '')); }
  };

  if (loading) return (
    <div dir="ltr" className="min-h-screen flex items-center justify-center" style={{ background: '#060c14' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-600 text-xs font-bold uppercase tracking-widest">Loading…</span>
      </div>
    </div>
  );
  if (!tournament) return (
    <div dir="ltr" className="min-h-screen flex items-center justify-center text-gray-500" style={{ background: '#060c14' }}>Not found</div>
  );

  const isKnockout = tournament.type === 'knockout';
  const isMixed    = tournament.type === 'mixed';
  const isLeague   = tournament.type === 'league';
  const groupMatches   = tournament.matches.filter(m => m.group_name);
  const koMatches      = tournament.matches.filter(m => !m.group_name);
  const groupsFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finished');
  const hasKoMatches   = koMatches.length > 0;

  const sharedProps = { user, navigate, referees, editingMatchId, matchForm, setEditingMatchId, setMatchForm, onSave: handleSaveMatchData, teams: tournament.teams };

  const TABS = [
    isLeague && { id:'standings', label:'Standings', icon:'🏆' },
    isMixed  && { id:'groups',    label:'Groups',    icon:'📋' },
    { id:'matches', label: isMixed ? 'Group Matches' : 'Matches', icon:'📅' },
    (isKnockout||isMixed) && { id:'bracket', label:'Bracket', icon:'🌳' },
    (isMixed && hasKoMatches) && { id:'ko_matches', label:'Knockout', icon:'⚡' },
  ].filter(Boolean);

  const typeLabel = isKnockout ? 'Knockout' : isMixed ? 'Mixed' : 'League';
  const typeColor = isKnockout ? '#f87171' : isMixed ? '#a78bfa' : '#38bdf8';

  return (
    <div dir="ltr" className="min-h-screen pb-12" style={{ background: '#060c14', fontFamily: "'Geist', system-ui, sans-serif", color: '#e2e8f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        * { font-family: 'Geist', system-ui, sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        @keyframes floatCup { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes floatTrophy { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-10px) scale(1.03)} }
      `}</style>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: 'rgba(6,12,20,0.95)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => navigate('/admin/dashboard')}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white border border-gray-800 hover:border-gray-600 transition text-sm font-bold">←</button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                  style={{ color: typeColor, borderColor: typeColor + '30', background: typeColor + '10' }}>{typeLabel}</span>
                <span className="text-[10px] text-gray-600">{tournament.teams.length} teams</span>
              </div>
              <h1 className="text-xl font-bold text-white truncate" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>{tournament.name}</h1>
            </div>
          </div>

          {user?.role === 'super_admin' && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <button onClick={() => setShowGenerateModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition hover:opacity-90"
                style={{ background: 'rgba(167,139,250,0.1)', borderColor: 'rgba(167,139,250,0.3)', color: '#a78bfa' }}>⚙ Generate</button>
              {(isMixed || isLeague) && (
                <button onClick={handleAdvanceRound}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition hover:opacity-90"
                  style={{ background: 'rgba(251,146,60,0.1)', borderColor: 'rgba(251,146,60,0.3)', color: '#fb923c' }}>⏭ Advance</button>
              )}
              <button onClick={() => navigate(`/tournament/${id}/statistics/advanced`)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition hover:opacity-90"
                style={{ background: 'rgba(34,211,238,0.08)', borderColor: 'rgba(34,211,238,0.25)', color: '#22d3ee' }}>📊 Stats</button>
              <button onClick={handleDeleteTournament}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition hover:opacity-90"
                style={{ background: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.2)', color: '#f87171' }}>🗑 Delete</button>
            </div>
          )}
        </div>

        {/* tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-0 border-t overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.05)', scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="pb-3 pt-2.5 px-5 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2"
              style={{ color: activeTab === tab.id ? '#60a5fa' : '#374151', borderColor: activeTab === tab.id ? '#3b82f6' : 'transparent' }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'standings' && <StandingsTable tournament={tournament} isMixed={false} />}
        {activeTab === 'groups'    && <StandingsTable tournament={tournament} isMixed={true} />}
        {activeTab === 'matches'   && (
          <MatchesList matches={isMixed ? (groupMatches.length > 0 ? groupMatches : []) : tournament.matches}
            {...sharedProps} onGenerate={() => setShowGenerateModal(true)} isKnockout={isKnockout} onAdvance={handleAdvanceRound} />
        )}
        {activeTab === 'ko_matches' && (
          <MatchesList matches={koMatches} {...sharedProps} onGenerate={null} isKnockout={true} onAdvance={handleAdvanceRound} />
        )}
        {activeTab === 'bracket' && (
          <>
            {isMixed && !groupsFinished && <MixedBracketPending groupMatches={groupMatches} onGoToGroups={() => setActiveTab('groups')} />}
            {isMixed && groupsFinished && <ChampionsLeagueBracket matches={koMatches} teams={tournament.teams} isMixed={true} tournamentImage={tournament.trophy_image} tournamentName={tournament.name} />}
            {isKnockout && <ChampionsLeagueBracket matches={tournament.matches} teams={tournament.teams} isMixed={false} readOnly={true} tournamentImage={tournament.trophy_image} tournamentName={tournament.name} />}
          </>
        )}
      </div>

      {/* ── GENERATE MODAL ── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-2xl border overflow-hidden w-full max-w-md" style={{ background: '#0d1624', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="text-sm font-black uppercase tracking-wider text-white">⚙ Generate Fixtures</div>
              <button onClick={() => setShowGenerateModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition text-sm">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {isMixed && (
                <div className="space-y-3 p-4 rounded-xl border" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Group Stage Settings</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-wider font-bold mb-1.5">Number of Groups</p>
                      <input type="number" min="2" value={genConfig.num_groups}
                        onChange={e => setGenConfig({...genConfig, num_groups: parseInt(e.target.value)||2})}
                        className="w-full text-white text-sm font-bold rounded-xl px-3 py-2 focus:outline-none border"
                        style={{ background: '#060c14', borderColor: 'rgba(255,255,255,0.1)' }} />
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-wider font-bold mb-1.5">Qualify / Group</p>
                      <input type="number" min="1" value={genConfig.teams_qualify_per_group}
                        onChange={e => setGenConfig({...genConfig, teams_qualify_per_group: parseInt(e.target.value)||1})}
                        className="w-full text-white text-sm font-bold rounded-xl px-3 py-2 focus:outline-none border"
                        style={{ background: '#060c14', borderColor: 'rgba(255,255,255,0.1)' }} />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600">Total qualifying: <span className="text-blue-400 font-black">{(genConfig.num_groups||2) * (genConfig.teams_qualify_per_group||1)} teams</span></p>
                </div>
              )}
              {isKnockout && (
                <div className="p-4 rounded-xl border text-center" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <p className="text-gray-500 text-sm">Fixtures will be generated based on the settings configured in the dashboard.</p>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowGenerateModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 border border-gray-800 hover:border-gray-700 transition">Cancel</button>
                <button onClick={handleGenerateMatches}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>✓ Generate</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MIXED BRACKET PENDING
══════════════════════════════════════════════════════ */
const MixedBracketPending = ({ groupMatches, onGoToGroups }) => {
  const total = groupMatches.length;
  const finished = groupMatches.filter(m => m.status === 'finished').length;
  const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="text-7xl mb-6 opacity-20">🏆</div>
      <h2 className="text-2xl font-black text-gray-300 mb-2">Bracket Pending</h2>
      <p className="text-gray-600 text-sm mb-8 text-center max-w-xs">Complete all group stage matches first.</p>
      {total > 0 && (
        <div className="w-64 mb-8">
          <div className="flex justify-between text-[10px] text-gray-600 mb-2 font-bold uppercase tracking-wider">
            <span>Group Stage Progress</span><span className="text-blue-400">{finished}/{total}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#3b82f6,#22c55e)' }} />
          </div>
        </div>
      )}
      <button onClick={onGoToGroups} className="px-6 py-2.5 rounded-xl text-sm font-black text-white transition hover:opacity-90"
        style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)' }}>Go to Groups →</button>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   STANDINGS TABLE
══════════════════════════════════════════════════════ */
const StandingsTable = ({ tournament, isMixed }) => {
  const standings = useMemo(() => {
    const table = {};
    tournament.teams.forEach(team => {
      table[team.id] = { id: team.id, name: team.name, logo: team.logo, group: team.group_name || null, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
    });
    tournament.matches
      .filter(m => m.status === 'finished' && m.home_team_id && m.away_team_id)
      .filter(m => !isMixed || m.group_name)
      .forEach(m => {
        const home = table[m.home_team_id]; const away = table[m.away_team_id];
        if (!home || !away) return;
        if (m.group_name) { if (!home.group) home.group = m.group_name; if (!away.group) away.group = m.group_name; }
        home.played++; away.played++;
        home.gf += m.score_home; home.ga += m.score_away;
        away.gf += m.score_away; away.ga += m.score_home;
        home.gd = home.gf - home.ga; away.gd = away.gf - away.ga;
        if (m.score_home > m.score_away) { home.won++; home.points += 3; away.lost++; }
        else if (m.score_home < m.score_away) { away.won++; away.points += 3; home.lost++; }
        else { home.drawn++; home.points++; away.drawn++; away.points++; }
      });
    if (isMixed) {
      Object.values(table).forEach(teamRow => {
        if (!teamRow.group) { const td = tournament.teams.find(t => t.id === teamRow.id); if (td?.group_name) teamRow.group = td.group_name; }
      });
    }
    const allTeams = Object.values(table);
    return isMixed
      ? allTeams.filter(t => t.group).sort((a,b) => b.points-a.points || b.gd-a.gd || b.gf-a.gf)
      : allTeams.sort((a,b) => b.points-a.points || b.gd-a.gd || b.gf-a.gf);
  }, [tournament, isMixed]);

  const TableBody = ({ teams }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {['#','Team','P','W','D','L','GF','GA','GD','Pts'].map(h => (
              <th key={h} className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-left ${h==='Pts'?'text-yellow-500':'text-gray-600'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((team, idx) => (
            <tr key={team.id} className="border-b hover:bg-white/5 transition"
              style={{ borderColor: 'rgba(255,255,255,0.04)', borderLeft: idx < 2 ? '3px solid rgba(34,197,94,0.5)' : '3px solid transparent' }}>
              <td className="px-3 py-3 text-gray-600 font-mono text-xs font-bold">{idx+1}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  {team.logo ? <img src={`${BASE}${team.logo}`} className="w-6 h-6 object-contain rounded" /> : <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-[9px] text-gray-400">{team.name?.[0]}</div>}
                  <span className="font-bold text-white text-sm truncate max-w-[120px]">{team.name}</span>
                </div>
              </td>
              <td className="px-3 py-3 text-gray-400">{team.played}</td>
              <td className="px-3 py-3 text-green-400 font-bold">{team.won}</td>
              <td className="px-3 py-3 text-gray-500">{team.drawn}</td>
              <td className="px-3 py-3 text-red-400">{team.lost}</td>
              <td className="px-3 py-3 text-gray-300">{team.gf}</td>
              <td className="px-3 py-3 text-gray-300">{team.ga}</td>
              <td className="px-3 py-3 font-bold text-xs" style={{ color: team.gd>0?'#22c55e':team.gd<0?'#ef4444':'#6b7280' }}>{team.gd>0?'+':''}{team.gd}</td>
              <td className="px-3 py-3 font-black text-xl text-yellow-400">{team.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (isMixed) {
    const groups = [...new Set(standings.map(t => t.group).filter(Boolean))].sort();
    if (groups.length === 0) return (
      <div className="text-center text-gray-600 py-16 rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-lg font-black mb-1">No groups yet</p>
        <p className="text-sm">Generate matches first.</p>
      </div>
    );
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map(gName => (
          <div key={gName} className="rounded-2xl border overflow-hidden" style={{ background: '#0d1624', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.15)' }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-black" style={{ background: '#22c55e' }}>{gName.replace('Group ','')}</div>
                <span className="text-sm font-black text-green-400">Group {gName.replace('Group ','')}</span>
              </div>
              <span className="text-[10px] text-gray-600">{standings.filter(t=>t.group===gName).length} teams</span>
            </div>
            <TableBody teams={standings.filter(t => t.group === gName)} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1624', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-sm font-black text-yellow-400">🏆 League Standings</span>
      </div>
      <TableBody teams={standings} />
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MATCHES LIST
══════════════════════════════════════════════════════ */
const MatchesList = ({ matches, user, navigate, referees, editingMatchId, matchForm, setEditingMatchId, setMatchForm, onSave, onGenerate, isKnockout, onAdvance, teams }) => {
  if (matches.length === 0) return (
    <div className="text-center py-20 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="text-5xl mb-4 opacity-20">📅</div>
      <p className="text-gray-600 text-lg font-black mb-4">No matches yet</p>
      {onGenerate && <button onClick={onGenerate} className="px-8 py-3 rounded-xl font-black text-white text-sm transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>⚙ Generate Fixtures</button>}
    </div>
  );

  const rounds = {};
  matches.forEach(m => { const key = m.round_number ?? 'TBD'; if (!rounds[key]) rounds[key] = []; rounds[key].push(m); });
  const sortedKeys = Object.keys(rounds).sort((a,b) => {
    const n = k => { if (String(k).startsWith('KO_R')) return parseInt(String(k).replace('KO_R','')) + 1000; return parseInt(String(k).replace(/\D/g,'')) || 0; };
    return n(a) - n(b);
  });
  const getRoundLabel = (key) => {
    const rMatches = rounds[key] || []; const realMatches = rMatches.filter(m => m.home_team_id);
    const uniquePairs = new Set(); realMatches.forEach(m => { uniquePairs.add([m.home_team_id, m.away_team_id].sort().join('-')); });
    const pairCount = uniquePairs.size || Math.ceil(rMatches.length / 2);
    if (String(key).startsWith('KO_R')) {
      if (pairCount === 1) return '🏆 Final'; if (pairCount === 2) return 'Semi-Finals';
      if (pairCount === 4) return 'Quarter-Finals'; if (pairCount === 8) return 'Round of 16';
      return `KO Round ${key.replace('KO_R','')}`;
    }
    return `Round ${key}`;
  };
  const groupMatchesByPair = (matchList) => {
    const pairs = {};
    matchList.forEach(m => {
      if (!m.home_team_id || !m.away_team_id) { pairs[`ph_${m.id}`] = [m]; return; }
      const pairKey = [m.home_team_id, m.away_team_id].sort().join('-');
      if (!pairs[pairKey]) pairs[pairKey] = [];
      pairs[pairKey].push(m);
    });
    return Object.values(pairs);
  };

  return (
    <div className="space-y-6">
      {isKnockout && user?.role === 'super_admin' && (
        <div className="flex justify-end">
          <button onClick={onAdvance} className="px-5 py-2 rounded-xl text-sm font-black border transition hover:opacity-90"
            style={{ background: 'rgba(251,146,60,0.08)', borderColor: 'rgba(251,146,60,0.25)', color: '#fb923c' }}>
            ⏭ Advance to Next Round
          </button>
        </div>
      )}
      {sortedKeys.map(rKey => {
        const isKoRound = String(rKey).startsWith('KO_R');
        const matchGroups = isKoRound ? groupMatchesByPair(rounds[rKey]) : rounds[rKey].map(m => [m]);
        return (
          <div key={rKey} className="rounded-2xl border overflow-hidden" style={{ background: '#0d1624', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              <span className="text-sm font-black text-blue-400">{getRoundLabel(rKey)}</span>
              <span className="text-[10px] text-gray-700 font-bold uppercase tracking-wider">{rounds[rKey].length} match{rounds[rKey].length !== 1 ? 'es' : ''}</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {matchGroups.map((group, gi) =>
                group.length === 2
                  ? <TwoLegCard key={`pair-${gi}`} matches={group} user={user} navigate={navigate} referees={referees} editingMatchId={editingMatchId} matchForm={matchForm} setEditingMatchId={setEditingMatchId} setMatchForm={setMatchForm} onSave={onSave} teams={teams} />
                  : <MatchCard key={group[0].id} m={group[0]} user={user} navigate={navigate} referees={referees} editingMatchId={editingMatchId} matchForm={matchForm} setEditingMatchId={setEditingMatchId} setMatchForm={setMatchForm} onSave={onSave} teams={teams} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   TEAM LOGO (small helper)
══════════════════════════════════════════════════════ */
const TeamLogo = ({ logo, name, size = 40, winner = false }) => {
  const imgSrc = logo ? `${BASE}${logo}` : null;
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
      background: winner ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${winner ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {imgSrc
        ? <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <span style={{ fontSize: size * 0.45, fontWeight: 900, color: '#4b5563' }}>{(name || '?')[0]}</span>
      }
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MATCH CARD — HORIZONTAL LAYOUT
   Home (logo + name) | Score / VS | Away (name + logo)
══════════════════════════════════════════════════════ */
const MatchCard = ({ m, user, navigate, referees, editingMatchId, matchForm, setEditingMatchId, setMatchForm, onSave, teams }) => {
  const isEditingScore = editingMatchId === `score_${m.id}`;
  const isAssigningRef = editingMatchId === `ref_${m.id}`;
  const isFinished = m.status === 'finished';
  const isPending  = !m.home_team_id || !m.away_team_id;
  const homeWon = isFinished && m.score_home > m.score_away;
  const awayWon = isFinished && m.score_away > m.score_home;
  const hasRef  = !!m.referee_id || !!m.referee_name;
  const isDraw  = isFinished && m.score_home === m.score_away;
  const hasPens = isFinished && m.penalty_home != null && !m.group_name;

  const homeTeam = teams?.find(t => t.id === m.home_team_id);
  const awayTeam = teams?.find(t => t.id === m.away_team_id);

  const openScore = () => { setMatchForm({ home: m.score_home??0, away: m.score_away??0, referee_id: m.referee_id?String(m.referee_id):'', penalty_home: m.penalty_home??'', penalty_away: m.penalty_away??'' }); setEditingMatchId(`score_${m.id}`); };
  const openRef   = () => { setMatchForm({ home: m.score_home??0, away: m.score_away??0, referee_id: m.referee_id?String(m.referee_id):'', penalty_home: m.penalty_home??'', penalty_away: m.penalty_away??'' }); setEditingMatchId(`ref_${m.id}`); };

  /* score input state for editing */
  const showPenFields = isEditingScore && !m.group_name
    && String(matchForm.home) !== '' && String(matchForm.away) !== ''
    && parseInt(matchForm.home) === parseInt(matchForm.away);

  return (
    <div className={`rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 ${isPending ? 'opacity-40' : ''}`}
      style={{ background: isFinished ? '#0a1520' : '#0d1828', borderColor: isFinished ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)' }}>

      {/* ── top bar: referee + live ── */}
      <div className="px-4 py-2 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
        <span className={`text-[10px] font-bold truncate ${hasRef ? 'text-purple-400' : 'text-gray-700 italic'}`}>
          {hasRef ? `⚖ ${m.referee_name || 'Assigned'}` : 'No referee'}
        </span>
        <div className="flex items-center gap-2">
          {isFinished
            ? <span className="text-[9px] px-2 py-0.5 rounded-full font-bold text-green-600" style={{ background: 'rgba(34,197,94,0.08)' }}>✅ FT</span>
            : <span className="text-[9px] px-2 py-0.5 rounded-full font-bold text-gray-700" style={{ background: 'rgba(255,255,255,0.04)' }}>🕒 Pending</span>
          }
          {user?.role === 'super_admin' && !isPending && (
            <button onClick={() => navigate(`/match/${m.id}/live-control`)}
              className="text-[10px] font-black px-2.5 py-1 rounded-lg border transition hover:opacity-90"
              style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.06)' }}>
              🎮 Live
            </button>
          )}
        </div>
      </div>

      {/* ── HORIZONTAL MATCH ROW ── */}
      <div className="px-4 py-4 flex-1">

        {/* Normal view: Home | Score | Away */}
        {!isEditingScore && (
          <div className="flex items-center gap-3">

            {/* HOME — logo + name */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <TeamLogo logo={homeTeam?.logo} name={m.home} winner={homeWon} />
              <div className="min-w-0">
                <p className={`text-sm font-black truncate leading-tight ${homeWon ? 'text-green-300' : 'text-white'}`}>
                  {m.home || 'TBD'}
                </p>
                {homeWon && <p className="text-[9px] text-green-500 font-bold uppercase tracking-wider">Winner ✓</p>}
              </div>
            </div>

            {/* CENTER — score or VS */}
            <div className="flex flex-col items-center shrink-0 gap-0.5">
              {isFinished ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl border ${homeWon ? 'text-green-400 border-green-900/50 bg-green-950/30' : 'text-white border-gray-800 bg-gray-900/50'}`}>
                      {m.score_home}
                    </div>
                    <span className="text-gray-700 text-xs font-bold">–</span>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl border ${awayWon ? 'text-green-400 border-green-900/50 bg-green-950/30' : 'text-white border-gray-800 bg-gray-900/50'}`}>
                      {m.score_away}
                    </div>
                  </div>
                  {/* Penalty result badge */}
                  {hasPens && (
                    <div className="mt-1 px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)' }}>
                      <span className="text-[9px] font-black text-orange-400 uppercase tracking-wider">Pens</span>
                      <span className="text-[10px] font-black text-orange-300">{m.penalty_home}–{m.penalty_away}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: '#374151', fontWeight: 900 }}>—</div>
                  <span className="text-[10px] font-black text-gray-700">VS</span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: '#374151', fontWeight: 900 }}>—</div>
                </div>
              )}
            </div>

            {/* AWAY — name + logo (reversed) */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-row-reverse">
              <TeamLogo logo={awayTeam?.logo} name={m.away} winner={awayWon} />
              <div className="min-w-0 text-right">
                <p className={`text-sm font-black truncate leading-tight ${awayWon ? 'text-green-300' : 'text-white'}`}>
                  {m.away || 'TBD'}
                </p>
                {awayWon && <p className="text-[9px] text-green-500 font-bold uppercase tracking-wider">Winner ✓</p>}
              </div>
            </div>
          </div>
        )}

        {/* Editing score: same horizontal layout with inputs */}
        {isEditingScore && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* home */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <TeamLogo logo={homeTeam?.logo} name={m.home} />
                <p className="text-xs font-black text-white truncate flex-1">{m.home || 'TBD'}</p>
              </div>
              {/* score inputs */}
              <div className="flex items-center gap-1.5 shrink-0">
                <input type="number" min="0" value={matchForm.home}
                  onChange={e => setMatchForm({...matchForm, home: e.target.value})}
                  className="w-12 h-11 text-center font-black text-lg rounded-xl border focus:outline-none transition"
                  style={{ background: '#060c14', borderColor: 'rgba(59,130,246,0.5)', color: '#60a5fa', boxShadow: '0 0 0 2px rgba(59,130,246,0.1)' }} />
                <span className="text-gray-700 text-sm font-bold">–</span>
                <input type="number" min="0" value={matchForm.away}
                  onChange={e => setMatchForm({...matchForm, away: e.target.value})}
                  className="w-12 h-11 text-center font-black text-lg rounded-xl border focus:outline-none transition"
                  style={{ background: '#060c14', borderColor: 'rgba(59,130,246,0.5)', color: '#60a5fa', boxShadow: '0 0 0 2px rgba(59,130,246,0.1)' }} />
              </div>
              {/* away */}
              <div className="flex items-center gap-2 flex-1 min-w-0 flex-row-reverse">
                <TeamLogo logo={awayTeam?.logo} name={m.away} />
                <p className="text-xs font-black text-white truncate flex-1 text-right">{m.away || 'TBD'}</p>
              </div>
            </div>

            {/* Penalty shootout — only when draw in knockout */}
            {showPenFields && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.2)' }}>
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-wider text-center">🎯 Penalty Shootout</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-center">
                    <p className="text-[9px] text-gray-600 mb-1 font-bold truncate">{m.home || 'Home'}</p>
                    <input type="number" min="0" placeholder="0" value={matchForm.penalty_home ?? ''}
                      onChange={e => setMatchForm({...matchForm, penalty_home: e.target.value})}
                      className="w-full h-10 text-center font-black text-base rounded-xl border focus:outline-none"
                      style={{ background: '#060c14', borderColor: 'rgba(251,146,60,0.5)', color: '#fb923c' }} />
                  </div>
                  <span className="text-gray-600 font-black shrink-0">–</span>
                  <div className="flex-1 text-center">
                    <p className="text-[9px] text-gray-600 mb-1 font-bold truncate">{m.away || 'Away'}</p>
                    <input type="number" min="0" placeholder="0" value={matchForm.penalty_away ?? ''}
                      onChange={e => setMatchForm({...matchForm, penalty_away: e.target.value})}
                      className="w-full h-10 text-center font-black text-base rounded-xl border focus:outline-none"
                      style={{ background: '#060c14', borderColor: 'rgba(251,146,60,0.5)', color: '#fb923c' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ACTIONS ── */}
      {user?.role === 'super_admin' && !isPending && (
        <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {isAssigningRef && (
            <div className="space-y-2">
              <select value={matchForm.referee_id} onChange={e=>setMatchForm({...matchForm,referee_id:e.target.value})}
                className="w-full rounded-xl px-3 py-2 text-xs border focus:outline-none"
                style={{ background:'#060c14', borderColor:'rgba(167,139,250,0.3)', color:'#e2e8f0' }}>
                <option value="">— Select Referee —</option>
                {referees.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={()=>setEditingMatchId(null)} className="flex-1 py-1.5 rounded-xl text-xs font-bold border text-gray-500 border-gray-800 hover:bg-gray-900 transition">Cancel</button>
                <button onClick={()=>onSave(m.id,false)} disabled={!matchForm.referee_id}
                  className="flex-1 py-1.5 rounded-xl text-xs font-black text-white transition hover:opacity-90"
                  style={{ background: matchForm.referee_id ? '#7c3aed' : '#374151' }}>✓ Assign</button>
              </div>
            </div>
          )}
          {isEditingScore && (
            <div className="space-y-2">
              {!hasRef && !matchForm.referee_id && (
                <select value={matchForm.referee_id} onChange={e=>setMatchForm({...matchForm,referee_id:e.target.value})}
                  className="w-full rounded-xl px-3 py-2 text-xs border focus:outline-none"
                  style={{ background:'#060c14', borderColor:'rgba(251,146,60,0.3)', color:'#e2e8f0' }}>
                  <option value="">⚠ Assign referee (required)</option>
                  {referees.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
                </select>
              )}
              <div className="flex gap-2">
                <button onClick={()=>setEditingMatchId(null)} className="flex-1 py-1.5 rounded-xl text-xs font-bold border text-gray-500 border-gray-800 hover:bg-gray-900 transition">Cancel</button>
                <button onClick={()=>onSave(m.id,true)} disabled={!hasRef&&!matchForm.referee_id}
                  className="flex-1 py-1.5 rounded-xl text-xs font-black text-white transition hover:opacity-90"
                  style={{ background: (hasRef||matchForm.referee_id) ? '#15803d' : '#374151' }}>💾 Save Result</button>
              </div>
            </div>
          )}
          {!isEditingScore && !isAssigningRef && (
            <div className="flex gap-2">
              <button onClick={openRef}
                className="flex-1 py-1.5 rounded-xl text-[10px] font-black border transition hover:opacity-90"
                style={{ color: hasRef?'#a78bfa':'#fbbf24', borderColor: hasRef?'rgba(167,139,250,0.2)':'rgba(251,191,36,0.2)', background: hasRef?'rgba(167,139,250,0.06)':'rgba(251,191,36,0.06)' }}>
                {hasRef ? '⚖ Change Ref' : '⚖ Assign Ref'}
              </button>
              <button onClick={openScore}
                className="flex-1 py-1.5 rounded-xl text-[10px] font-black border transition hover:opacity-90"
                style={{ color: isFinished?'#6b7280':'#60a5fa', borderColor: isFinished?'rgba(107,114,128,0.2)':'rgba(96,165,250,0.2)', background: isFinished?'rgba(107,114,128,0.06)':'rgba(96,165,250,0.06)' }}>
                {isFinished ? '✏ Edit Score' : '⚽ Enter Score'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* referee report */}
      {isFinished && !isPending && m.referee_report && (
        <div className="border-t px-4 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <a href={`${BASE}${m.referee_report}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-1.5 text-[10px] py-1.5 rounded-lg font-bold border text-blue-400 transition hover:bg-blue-900/20"
            style={{ borderColor: 'rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.04)' }}>
            📄 View Referee Report
          </a>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   TWO LEG CARD
══════════════════════════════════════════════════════ */
const TwoLegCard = ({ matches, user, navigate, referees, editingMatchId, matchForm, setEditingMatchId, setMatchForm, onSave, teams }) => {
  const leg1 = matches.find(m => m.leg_number === 1) || matches[0];
  const leg2 = matches.find(m => m.leg_number === 2) || matches[1];
  const homeId = leg1.home_team_id; const awayId = leg1.away_team_id;
  let totalHome = 0, totalAway = 0;
  matches.forEach(m => {
    if (m.status === 'finished') {
      if (m.home_team_id === homeId) { totalHome += m.score_home; totalAway += m.score_away; }
      else { totalHome += m.score_away; totalAway += m.score_home; }
    }
  });
  const bothFinished = matches.every(m => m.status === 'finished');
  const homeWinsAgg = bothFinished && totalHome > totalAway;
  const awayWinsAgg = bothFinished && totalAway > totalHome;
  const homeTeam = teams?.find(t => t.id === homeId);
  const awayTeam = teams?.find(t => t.id === awayId);

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1828', borderColor: 'rgba(96,165,250,0.15)' }}>
      <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ background: 'rgba(96,165,250,0.05)', borderColor: 'rgba(96,165,250,0.12)' }}>
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">🔄 Two Legs</span>
        {bothFinished && (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
            Agg: <span style={{ color: homeWinsAgg?'#22c55e':'#e2e8f0' }}>{totalHome}</span> – <span style={{ color: awayWinsAgg?'#22c55e':'#e2e8f0' }}>{totalAway}</span>
          </span>
        )}
      </div>

      {/* teams header — horizontal */}
      <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamLogo logo={homeTeam?.logo} name={leg1.home} size={28} winner={homeWinsAgg} />
          <span className={`text-xs font-black truncate ${homeWinsAgg?'text-green-300':'text-white'}`}>{leg1.home||'TBD'} {homeWinsAgg&&'✓'}</span>
        </div>
        <span className="text-[10px] text-gray-700 font-bold shrink-0">vs</span>
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-row-reverse">
          <TeamLogo logo={awayTeam?.logo} name={leg1.away} size={28} winner={awayWinsAgg} />
          <span className={`text-xs font-black truncate text-right ${awayWinsAgg?'text-green-300':'text-white'}`}>{awayWinsAgg&&'✓ '}{leg1.away||'TBD'}</span>
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {[leg1, leg2].map((m, li) => (
          <SingleLegRow key={m.id} m={m} legLabel={li===0?'1st Leg':'2nd Leg'} user={user} navigate={navigate} referees={referees} editingMatchId={editingMatchId} matchForm={matchForm} setEditingMatchId={setEditingMatchId} setMatchForm={setMatchForm} onSave={onSave} />
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   SINGLE LEG ROW
══════════════════════════════════════════════════════ */
const SingleLegRow = ({ m, legLabel, user, navigate, referees, editingMatchId, matchForm, setEditingMatchId, setMatchForm, onSave }) => {
  const isEditingScore = editingMatchId === `score_${m.id}`;
  const isAssigningRef = editingMatchId === `ref_${m.id}`;
  const isFinished = m.status === 'finished';
  const isPending  = !m.home_team_id || !m.away_team_id;
  const homeWon = isFinished && m.score_home > m.score_away;
  const awayWon = isFinished && m.score_away > m.score_home;
  const hasRef  = !!m.referee_id || !!m.referee_name;

  const openScore = () => { setMatchForm({ home:m.score_home??0, away:m.score_away??0, referee_id:m.referee_id?String(m.referee_id):'', penalty_home:m.penalty_home??'', penalty_away:m.penalty_away??'' }); setEditingMatchId(`score_${m.id}`); };
  const openRef   = () => { setMatchForm({ home:m.score_home??0, away:m.score_away??0, referee_id:m.referee_id?String(m.referee_id):'', penalty_home:m.penalty_home??'', penalty_away:m.penalty_away??'' }); setEditingMatchId(`ref_${m.id}`); };

  return (
    <div className={`px-4 py-3 ${isPending?'opacity-40':''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${legLabel.includes('1st')?'text-blue-400 bg-blue-950/40':'text-orange-400 bg-orange-950/40'}`}>{legLabel}</span>
        <span className={`text-[9px] font-bold ${hasRef?'text-purple-400':'text-gray-700'}`}>{hasRef?`⚖ ${m.referee_name||'Assigned'}`:'No referee'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-black flex-1 truncate ${homeWon?'text-green-300':'text-gray-300'}`}>{m.home||'TBD'}</span>
        {isEditingScore ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <input type="number" min="0" value={matchForm.home} onChange={e=>setMatchForm({...matchForm,home:e.target.value})}
              className="w-9 h-8 text-center font-black text-sm rounded-lg border focus:outline-none"
              style={{ background:'#060c14', borderColor:'rgba(59,130,246,0.4)', color:'#60a5fa' }} />
            <span className="text-gray-700 text-xs">–</span>
            <input type="number" min="0" value={matchForm.away} onChange={e=>setMatchForm({...matchForm,away:e.target.value})}
              className="w-9 h-8 text-center font-black text-sm rounded-lg border focus:outline-none"
              style={{ background:'#060c14', borderColor:'rgba(59,130,246,0.4)', color:'#60a5fa' }} />
          </div>
        ) : (
          <span className="shrink-0 font-black text-sm px-2" style={{ color: isFinished?'#fff':'#374151' }}>
            {isFinished ? `${m.score_home} – ${m.score_away}` : '– : –'}
          </span>
        )}
        <span className={`text-xs font-black flex-1 truncate text-right ${awayWon?'text-green-300':'text-gray-300'}`}>{m.away||'TBD'}</span>
      </div>
      {user?.role === 'super_admin' && !isPending && (
        <div className="mt-2 space-y-1.5">
          {isAssigningRef && (
            <div className="space-y-1.5">
              <select value={matchForm.referee_id} onChange={e=>setMatchForm({...matchForm,referee_id:e.target.value})}
                className="w-full rounded-xl px-3 py-1.5 text-[10px] border focus:outline-none"
                style={{ background:'#060c14', borderColor:'rgba(167,139,250,0.3)', color:'#e2e8f0' }}>
                <option value="">— Select Referee —</option>
                {referees.map(r=><option key={r.id} value={String(r.id)}>{r.name}</option>)}
              </select>
              <div className="flex gap-1.5">
                <button onClick={()=>setEditingMatchId(null)} className="flex-1 py-1 rounded-lg text-[10px] font-bold border text-gray-600 border-gray-800 hover:bg-gray-900 transition">Cancel</button>
                <button onClick={()=>onSave(m.id,false)} disabled={!matchForm.referee_id} className="flex-1 py-1 rounded-lg text-[10px] font-black text-white transition" style={{ background:matchForm.referee_id?'#7c3aed':'#374151' }}>✓ Assign</button>
              </div>
            </div>
          )}
          {isEditingScore && (
            <div className="flex gap-1.5">
              <button onClick={()=>setEditingMatchId(null)} className="flex-1 py-1 rounded-lg text-[10px] font-bold border text-gray-600 border-gray-800 hover:bg-gray-900 transition">Cancel</button>
              <button onClick={()=>onSave(m.id,true)} disabled={!hasRef&&!matchForm.referee_id} className="flex-1 py-1 rounded-lg text-[10px] font-black text-white transition" style={{ background:(hasRef||matchForm.referee_id)?'#15803d':'#374151' }}>💾 Save</button>
            </div>
          )}
          {!isEditingScore && !isAssigningRef && (
            <div className="flex gap-1.5">
              <button onClick={openRef} className="flex-1 py-1 rounded-lg text-[9px] font-black border transition" style={{ color:hasRef?'#a78bfa':'#fbbf24', borderColor:hasRef?'rgba(167,139,250,0.2)':'rgba(251,191,36,0.2)', background:hasRef?'rgba(167,139,250,0.05)':'rgba(251,191,36,0.05)' }}>{hasRef?'⚖ Ref':'⚖ Assign'}</button>
              <button onClick={openScore} className="flex-1 py-1 rounded-lg text-[9px] font-black border transition" style={{ color:isFinished?'#6b7280':'#60a5fa', borderColor:isFinished?'rgba(107,114,128,0.2)':'rgba(96,165,250,0.2)', background:isFinished?'rgba(107,114,128,0.05)':'rgba(96,165,250,0.05)' }}>{isFinished?'✏ Edit':'⚽ Score'}</button>
              <button onClick={()=>navigate(`/match/${m.id}/live-control`)} className="flex-1 py-1 rounded-lg text-[9px] font-black border transition" style={{ color:'#34d399', borderColor:'rgba(52,211,153,0.2)', background:'rgba(52,211,153,0.05)' }}>🎮</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   CHAMPIONS LEAGUE BRACKET
   — trophy_image replaces 🏆 emoji when available
══════════════════════════════════════════════════════ */
const ChampionsLeagueBracket = ({ matches, teams, isMixed, readOnly, tournamentImage, tournamentName }) => {
  const knockoutMatches = matches.filter(m => !m.group_name);
  const rounds = {};
  knockoutMatches.forEach(m => { const rKey = String(m.round_number); if (!rounds[rKey]) rounds[rKey] = []; rounds[rKey].push(m); });
  const roundKeys = Object.keys(rounds).sort((a,b)=>{ const n=k=>{ if(k.startsWith('KO_R')) return parseInt(k.replace('KO_R',''))+1000; return parseInt(k.replace(/\D/g,''))||0; }; return n(a)-n(b); });

  if (roundKeys.length === 0) return (
    <div className="text-center text-gray-600 py-20 rounded-2xl border" style={{ background:'rgba(255,255,255,0.02)', borderColor:'rgba(255,255,255,0.05)' }}>
      <div className="text-5xl mb-4 opacity-20">🌳</div><p className="text-xl font-black">No knockout rounds yet</p>
    </div>
  );

  const totalRounds = roundKeys.length;
  const getRoundTitle = (rKey) => {
    const rMatches = rounds[rKey]||[]; const realMatches=rMatches.filter(m=>m.home_team_id);
    const uniquePairs=new Set(); realMatches.forEach(m=>{ uniquePairs.add([m.home_team_id,m.away_team_id].sort().join('-')); });
    const pairCount=uniquePairs.size||Math.ceil(rMatches.length/2);
    if(pairCount===1)return'🏆 Final'; if(pairCount===2)return'Semi-Finals'; if(pairCount===4)return'Quarter-Finals'; if(pairCount===8)return'Round of 16';
    return`Round ${roundKeys.indexOf(rKey)+1}`;
  };

  const lastRoundKey=roundKeys[totalRounds-1]; const hasFinal=getRoundTitle(lastRoundKey).includes('Final');
  const finalMatches=hasFinal?(rounds[lastRoundKey]||[]):[];
  const getRepresentativeMatch=(rKey)=>{ const rMatches=rounds[rKey]||[]; const seen=new Set(); return rMatches.filter(m=>{ if(!m.home_team_id&&!m.away_team_id) return true; const key=[m.home_team_id,m.away_team_id].sort().join('-'); if(seen.has(key)) return false; seen.add(key); return true; }); };
  const splitRounds={}; roundKeys.forEach(rKey=>{ const all=getRepresentativeMatch(rKey); const half=Math.ceil(all.length/2); splitRounds[rKey]={right:all.slice(0,half),left:all.slice(half)}; });
  const preRounds=hasFinal?roundKeys.slice(0,totalRounds-1):roundKeys;
  const getColH=(n)=>n>=8?800:n>=4?560:n>=2?340:200;

  /* bracket team logo */
  const BracketTeamLogo=({name})=>{
    if(!name||name==='TBD') return <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center"><span className="text-gray-600 text-[10px]">?</span></div>;
    const td=teams?.find(t=>t.name===name);
    if(td?.logo) return <img src={`${BASE}${td.logo}`} alt={name} className="w-8 h-8 object-contain rounded" />;
    return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 to-gray-700 flex items-center justify-center text-xs font-black text-white shrink-0">{name.slice(0,2).toUpperCase()}</div>;
  };

  const getAgg=(m)=>{ const rMatches=rounds[String(m.round_number)]||[]; const pairMatches=rMatches.filter(rm=>(rm.home_team_id===m.home_team_id&&rm.away_team_id===m.away_team_id)||(rm.home_team_id===m.away_team_id&&rm.away_team_id===m.home_team_id)); if(pairMatches.length<=1) return null; let hT=0,aT=0; pairMatches.forEach(pm=>{ if(pm.home_team_id===m.home_team_id){hT+=pm.score_home||0;aT+=pm.score_away||0;}else{hT+=pm.score_away||0;aT+=pm.score_home||0;} }); return pairMatches.every(pm=>pm.status==='finished')?{home:hT,away:aT}:null; };

  const BracketCard=({m,isFinal})=>{ const agg=getAgg(m); const disp=agg||(m.status==='finished'?{home:m.score_home,away:m.score_away}:null); const hW=disp&&disp.home>disp.away; const aW=disp&&disp.away>disp.home; return (
    <div className="rounded-xl overflow-hidden border transition hover:-translate-y-0.5 hover:shadow-xl" style={{ background:isFinal?'linear-gradient(160deg,#1e1a08,#2a1f05)':'linear-gradient(160deg,#0f1828,#111827)', borderColor:isFinal?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.08)', minWidth:180 }}>
      <div className={`flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/40 ${hW?'bg-green-950/30':''}`}><BracketTeamLogo name={m.home}/><span className={`text-xs font-bold flex-1 truncate ${hW?'text-green-300':'text-gray-300'}`}>{m.home||<span className="text-gray-700">TBD</span>}</span>{disp&&<span className={`text-sm font-black w-6 text-center rounded ${hW?'text-green-400':'text-gray-300'}`}>{disp.home}</span>}</div>
      <div className={`flex items-center gap-2 px-3 py-2.5 ${aW?'bg-green-950/30':''}`}><BracketTeamLogo name={m.away}/><span className={`text-xs font-bold flex-1 truncate ${aW?'text-green-300':'text-gray-300'}`}>{m.away||<span className="text-gray-700">TBD</span>}</span>{disp&&<span className={`text-sm font-black w-6 text-center rounded ${aW?'text-green-400':'text-gray-300'}`}>{disp.away}</span>}</div>
      {!disp&&<div className="px-3 py-1 text-center"><span className="text-[9px] text-gray-700 bg-gray-800/40 px-2 py-0.5 rounded-full">Not played</span></div>}
      {agg&&<div className="px-3 py-1 text-center border-t border-gray-800/30"><span className="text-[9px] text-blue-400/60">Agg: {agg.home} – {agg.away}</span></div>}
    </div>
  ); };

  const BracketConn=({side,matchCount,colHeight})=>{ if(matchCount<2) return <div style={{width:24}}/>; const lines=[]; const pairCount=Math.ceil(matchCount/2); for(let i=0;i<pairCount;i++){ const t=(i*2+0.5)/matchCount*100; const b=(i*2+1.5)/matchCount*100; const mid=(t+b)/2; const xIn=12,xOut=side==='right'?0:24,xEnd=side==='right'?24:0; lines.push(<g key={i}><line x1={xOut} y1={`${t}%`} x2={xIn} y2={`${t}%`} stroke="rgba(59,130,246,0.2)" strokeWidth="1.5"/><line x1={xOut} y1={`${b}%`} x2={xIn} y2={`${b}%`} stroke="rgba(59,130,246,0.2)" strokeWidth="1.5"/><line x1={xIn} y1={`${t}%`} x2={xIn} y2={`${b}%`} stroke="rgba(59,130,246,0.2)" strokeWidth="1.5"/><line x1={xIn} y1={`${mid}%`} x2={xEnd} y2={`${mid}%`} stroke="rgba(59,130,246,0.3)" strokeWidth="1.5"/><circle cx={xIn} cy={`${mid}%`} r="2.5" fill="rgba(59,130,246,0.3)"/></g>); } return <svg width="24" style={{minHeight:colHeight,alignSelf:'stretch'}}>{lines}</svg>; };

  /* ─── Trophy: image if exists, else emoji ─── */
  const TrophyDisplay = () => {
    if (tournamentImage) {
      return (
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', filter: 'blur(40px)', opacity: 0.25, background: 'radial-gradient(#f59e0b, transparent)', pointerEvents: 'none' }} />
          <img
            src={`${BASE}${tournamentImage}`}
            alt={tournamentName || 'Trophy'}
            style={{ width: 120, height: 120, objectFit: 'contain', position: 'relative', zIndex: 1, animation: 'floatTrophy 4s ease-in-out infinite', filter: 'drop-shadow(0 8px 24px rgba(245,158,11,0.3))' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          {/* fallback emoji hidden by default */}
          <div style={{ display: 'none', fontSize: 70, lineHeight: 1, animation: 'floatCup 4s ease-in-out infinite' }}>🏆</div>
        </div>
      );
    }
    return (
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', filter: 'blur(40px)', opacity: 0.15, background: 'radial-gradient(#fbbf24, transparent)', pointerEvents: 'none' }} />
        <div style={{ fontSize: 70, lineHeight: 1, position: 'relative', zIndex: 1, userSelect: 'none', animation: 'floatCup 4s ease-in-out infinite' }}>🏆</div>
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto pb-8 rounded-2xl border relative" style={{ background:'linear-gradient(160deg,#06090f,#0a1020)', borderColor:'rgba(255,255,255,0.06)' }}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage:'radial-gradient(circle,rgba(99,140,255,0.3) 1px,transparent 1px)', backgroundSize:'34px 34px' }} />
      <div className="relative z-10 p-6">
        <div className="text-center mb-8">
          <span className="inline-block border px-5 py-1.5 rounded-full text-blue-300 text-xs font-black tracking-widest uppercase" style={{ background:'rgba(255,255,255,0.03)', borderColor:'rgba(255,255,255,0.08)' }}>🏆 Tournament Bracket</span>
          {readOnly && <p className="text-gray-700 text-xs mt-2">View only — enter scores from the <span className="text-blue-500">Matches</span> tab</p>}
        </div>
        <div className="flex flex-row items-center justify-center gap-0 min-w-max mx-auto">
          {preRounds.map((rKey,i)=>{ const matchList=splitRounds[rKey]?.right||[]; const colH=getColH(matchList.length); const isLast=i===preRounds.length-1; return (
            <div key={`r-${rKey}`} className="flex flex-row items-stretch">
              <div className="flex flex-col" style={{width:200}}>
                <div className="text-center mb-3"><span className="inline-block border text-blue-400/80 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.07)'}}>{getRoundTitle(rKey)}</span></div>
                <div className="flex flex-col justify-around flex-1" style={{minHeight:colH}}>{matchList.map(m=><div key={m.id} className="py-2 px-1"><BracketCard m={m}/></div>)}</div>
              </div>
              {isLast&&<BracketConn side="right" matchCount={matchList.length} colHeight={colH}/>}
            </div>
          );})}

          {/* ── CENTER: Trophy + Final ── */}
          <div className="flex flex-col items-center justify-center mx-4 relative z-20" style={{minWidth:220}}>
            <div className="text-center mb-4">
              <span className="inline-block border text-yellow-300 text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-lg" style={{background:'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))',borderColor:'rgba(245,158,11,0.3)'}}>🏆 Final</span>
            </div>
            <TrophyDisplay />
            <div className="w-full space-y-3">{finalMatches.map(m=><BracketCard key={m.id} m={m} isFinal/>)}</div>
            <div className="mt-5">
              <span className="px-5 py-2 rounded-full text-xs font-black shadow-lg" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#0b0d11',boxShadow:'0 4px 20px rgba(245,158,11,0.3)'}}>⭐ Champion ⭐</span>
            </div>
          </div>

          {[...preRounds].reverse().map((rKey,i)=>{ const matchList=splitRounds[rKey]?.left||[]; const colH=getColH(matchList.length); const isFirst=i===0; return (
            <div key={`l-${rKey}`} className="flex flex-row items-stretch">
              {isFirst&&<BracketConn side="left" matchCount={matchList.length} colHeight={colH}/>}
              <div className="flex flex-col" style={{width:200}}>
                <div className="text-center mb-3"><span className="inline-block border text-blue-400/80 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.07)'}}>{getRoundTitle(rKey)}</span></div>
                <div className="flex flex-col justify-around flex-1" style={{minHeight:colH}}>{matchList.map(m=><div key={m.id} className="py-2 px-1"><BracketCard m={m}/></div>)}</div>
              </div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
};

export default TournamentDetails;