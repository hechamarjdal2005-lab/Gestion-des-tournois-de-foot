import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { jwtDecode } from 'jwt-decode';

const injectFonts = () => {
  if (document.getElementById('login-fonts')) return;
  const l = document.createElement('link');
  l.id = 'login-fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap';
  document.head.appendChild(l);
};

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const navigate = useNavigate();
  const { login } = useAuthStore();

  injectFonts();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('username', email);
      fd.append('password', password);

      const response = await api.post('/auth/login', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { access_token } = response.data;
      const decoded = jwtDecode(access_token);
      const userData = { email: decoded.sub, role: decoded.role, name: decoded.name || email };

      localStorage.setItem('token', access_token);
      login(access_token, userData);

      const routes = {
        super_admin:  '/admin/dashboard',
        team_manager: '/manager/dashboard',
        coach:        '/coach/dashboard',
        player:       '/player/dashboard',
        referee:      '/referee/dashboard',
      };
      navigate(routes[decoded.role] || '/');

    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('Connection error. Make sure the server is running.');
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#080a0f', display: 'flex',
      fontFamily: "'DM Sans',sans-serif", direction: 'ltr', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glows */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(0,229,160,0.04)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'rgba(56,189,248,0.03)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'center', padding: '60px 64px',
        borderRight: '1px solid #141826', position: 'relative',
      }} className="left-panel">
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#00e5a0,#00916a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚡</div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>TOURNEY</p>
              <p style={{ fontSize: 9, color: '#00e5a0', letterSpacing: '2.5px', opacity: 0.7 }}>MANAGEMENT SYSTEM</p>
            </div>
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: '#fff', fontFamily: "'Syne',sans-serif", lineHeight: 1.1, marginBottom: 16 }}>
            Your tournament.<br />
            <span style={{ color: '#00e5a0' }}>Your rules.</span>
          </h1>
          <p style={{ fontSize: 15, color: '#2e3748', lineHeight: 1.7, maxWidth: 380 }}>
            The all-in-one platform for managing football tournaments, squads, referees, and live match data.
          </p>
        </div>

        {/* Feature pills */}
        {['Multi-role access control', 'Live match control panel', 'Automated fixture generation', 'Advanced statistics'].map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: 99, background: '#00e5a0', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#4a5568' }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Right panel — form */}
      <div style={{
        width: '100%', maxWidth: 480, margin: 'auto',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '48px 40px',
      }}>

        {/* Logo (mobile / center) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#00e5a0,#00916a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>TOURNEY</p>
            <p style={{ fontSize: 9, color: '#00e5a0', letterSpacing: '2px', opacity: 0.7 }}>MANAGEMENT</p>
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', fontFamily: "'Syne',sans-serif", lineHeight: 1.1, marginBottom: 8 }}>
            Welcome back
          </h2>
          <p style={{ fontSize: 13, color: '#2e3748' }}>Sign in to access your dashboard</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 12, marginBottom: 20,
            background: 'rgba(255,107,107,0.07)', border: '1px solid rgba(255,107,107,0.2)',
            color: '#ff6b6b', fontSize: 13,
          }}>
            <span>✗</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#2e3748', letterSpacing: '2px', marginBottom: 7, textTransform: 'uppercase' }}>
              Email Address
            </label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@tourney.com"
              style={{
                width: '100%', background: '#0e1117', border: '1px solid #1c2236',
                color: '#e2e8f0', borderRadius: 12, padding: '13px 16px',
                fontSize: 14, outline: 'none', fontFamily: "'DM Sans',sans-serif",
                transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#00e5a0'; e.target.style.boxShadow = '0 0 0 3px rgba(0,229,160,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = '#1c2236'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#2e3748', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Password
              </label>
              <a href="/reset-password" style={{ fontSize: 11, color: '#00e5a0', textDecoration: 'none', opacity: 0.7 }}
                onMouseEnter={e => e.target.style.opacity = 1}
                onMouseLeave={e => e.target.style.opacity = 0.7}>
                Forgot password?
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                style={{
                  width: '100%', background: '#0e1117', border: '1px solid #1c2236',
                  color: '#e2e8f0', borderRadius: 12, padding: '13px 46px 13px 16px',
                  fontSize: 14, outline: 'none', fontFamily: "'DM Sans',sans-serif",
                  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = '#00e5a0'; e.target.style.boxShadow = '0 0 0 3px rgba(0,229,160,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = '#1c2236'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#2e3748',
                fontSize: 14, padding: 0, lineHeight: 1,
              }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? 'rgba(0,229,160,0.3)' : 'linear-gradient(135deg,#00e5a0,#00b87a)',
              color: '#080a0f', border: 'none', borderRadius: 12,
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Syne',sans-serif", letterSpacing: '0.5px',
              transition: 'transform 0.1s, box-shadow 0.15s',
              boxShadow: loading ? 'none' : '0 4px 24px rgba(0,229,160,0.2)',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,229,160,0.28)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,229,160,0.2)'; }}
          >
            {loading ? '⏳  Signing in...' : 'Sign In →'}
          </button>
        </form>

        {/* Footer note */}
        <div style={{ marginTop: 28, padding: '14px 16px', background: '#0e1117', borderRadius: 12, border: '1px solid #141826' }}>
          <p style={{ fontSize: 11, color: '#1e2636', textAlign: 'center', lineHeight: 1.6 }}>
            Accounts are created by the system administrator.<br />
            <span style={{ color: '#2e3748' }}>Check your email to set your password.</span>
          </p>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: #1e2636; }
        @media (min-width: 900px) {
          .left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
};

export default Login;