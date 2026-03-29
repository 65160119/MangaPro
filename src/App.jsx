import { Link, useLocation } from 'react-router-dom'
import React from 'react'
import './App.css'
import AppRoute from './route/app-route'
import { AuthProvider, useAuth } from './context/Auth'

function HeaderAuth() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const navLinks = [
    { to: '/', label: 'คลังมังงะ' },
    { to: '/forum', label: 'ฟอรัม' },
    { to: '/random', label: 'สุ่มมังงะ' },
    { to: '/quiz', label: 'Quiz' },
  ]

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  // ซ่อน header แค่ตอนอยู่หน้า reset password จากลิงก์อีเมล
  if (location.pathname.startsWith('/update-password')) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        .owl-header {
          position: sticky; top: 0; z-index: 50;
          background: #0d0820;
          border-bottom: 1px solid #2a1a48;
          backdrop-filter: blur(12px);
          padding: 0 32px;
          display: flex; align-items: center; height: 72px; gap: 8px;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 2px 20px rgba(0,0,0,0.4);
        }

        .owl-header-brand {
          font-family: 'DM Serif Display', serif;
          font-size: 1.3rem;
          color: #cfb8ff;
          letter-spacing: -0.3px;
          margin-right: 20px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .owl-header-brand span { font-style: italic; color: #c084fc; }

        .owl-nav-link {
          padding: 6px 12px; border-radius: 8px;
          font-size: 13.5px; font-weight: 500;
          color: #b89af0; text-decoration: none;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .owl-nav-link:hover { background: #1f1438; color: #e8d8ff; }
        .owl-nav-link.active { background: #2a1a48; color: #c084fc; }

        .owl-header-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }

        .owl-user-chip {
          display: flex; align-items: center; gap: 7px;
          padding: 5px 12px; border-radius: 20px;
          background: #1f1438; border: 1px solid #3a2468;
          color: #cfb8ff; font-size: 13px; font-weight: 500;
          text-decoration: none; transition: border-color 0.15s;
          max-width: 180px;
        }
        .owl-user-chip:hover { border-color: #c084fc; }
        .owl-user-chip-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #c084fc; flex-shrink: 0;
        }
        .owl-user-chip-name {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .owl-btn-logout {
          padding: 6px 14px; border-radius: 8px;
          border: 1px solid #3a2468; background: transparent;
          color: #b89af0; font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
        }
        .owl-btn-logout:hover { background: #2a1a48; color: #f07080; border-color: #f07080; }

        .owl-btn-login {
          padding: 6px 16px; border-radius: 8px;
          border: 1px solid #c084fc; background: transparent;
          color: #c084fc; font-size: 13px; font-weight: 600;
          text-decoration: none; font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
        }
        .owl-btn-login:hover { background: #c084fc; color: #110b22; }
      `}</style>

      <header className="owl-header">
        {/* Brand */}
        <Link to="/" title="Owlbook" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <img src="/Owl-Book.png" alt="Owlbook" style={{ height: 56, width: 56, objectFit: 'contain' }} />
        </Link>

        {/* Nav links */}
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`owl-nav-link${isActive(to) ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}

        {/* Right side */}
        <div className="owl-header-right">
          {user ? (
            <>
              <Link to="/status" className="owl-user-chip" title={user?.email}>
                <span className="owl-user-chip-dot" />
                <span className="owl-user-chip-name">
                  {user?.email ? String(user.email).split('@')[0] : user?.email}
                </span>
              </Link>
              <button onClick={() => signOut()} className="owl-btn-logout">Logout</button>
            </>
          ) : (
            <Link to="/login" className="owl-btn-login">Login</Link>
          )}
        </div>
      </header>
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <HeaderAuth />
      <AppRoute />
    </AuthProvider>
  )
}

export default App