import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/Auth'
import OwlbookStyles from '../components/OwlbookStyles'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const handleSubmit = async () => {
    setError(null)
    if (!email || !password) { setError('กรุณากรอก Email และ Password'); return }
    setLoading(true)
    try {
      const { error } = await signUp({ email, password })
      if (error) { setError(error.message); return }
      alert('เราได้ส่งอีเมลยืนยันไปให้แล้ว โปรดกดยืนยันอีเมลก่อน จากนั้นกลับมา Login อีกครั้ง')
      navigate('/login')
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  return (
    <div className="owl-catalog owl-login-bg">
      <OwlbookStyles />
      <style>{`
        .owl-login-bg {
          display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .owl-login-card {
          width: 380px; max-width: 100%;
          background: var(--owl-surface); border: 1.5px solid var(--owl-border);
          border-radius: 20px; padding: 36px 32px;
          box-shadow: var(--owl-shadow-lg);
          animation: owl-fadein 0.25s ease;
        }
        @keyframes owl-fadein { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        .owl-login-logo {
          display: flex; flex-direction: column; align-items: center; margin-bottom: 28px; gap: 10px;
        }
        .owl-login-logo img { width: 72px; height: 72px; object-fit: contain; }
        .owl-login-sub { font-size: 13.5px; color: var(--owl-text-faint); margin: 0; text-align: center; }
        .owl-login-fields { display: flex; flex-direction: column; gap: 12px; margin-bottom: 8px; }
        .owl-login-btn {
          width: 100%; padding: 11px; border-radius: 11px; border: none;
          background: linear-gradient(135deg, var(--owl-accent), var(--owl-purple-200));
          color: var(--owl-bg); font-size: 14.5px; font-weight: 700;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          transition: opacity 0.15s, transform 0.15s; margin-top: 4px;
        }
        .owl-login-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .owl-login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .owl-login-footer { margin-top: 18px; text-align: center; font-size: 13px; color: var(--owl-text-faint); }
        .owl-login-link { color: var(--owl-accent); text-decoration: none; transition: opacity 0.15s; }
        .owl-login-link:hover { opacity: 0.75; }
      `}</style>

      <div className="owl-login-card">
        {/* Logo */}
        <div className="owl-login-logo">
          <img src="/Owl-Book.png" alt="Owlbook" />
          <h1 className="owl-modal-title" style={{ textAlign: 'center' }}>สมัครสมาชิก</h1>
          <p className="owl-login-sub">สร้างบัญชี Owlbook ของคุณ</p>
        </div>

        {/* Fields */}
        <div className="owl-login-fields">
          <input className="owl-input" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}
            type="email" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <input className="owl-input" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}
            type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '9px 13px', borderRadius: 9, fontSize: 13, marginBottom: 8,
            background: 'rgba(240,112,128,0.1)', border: '1px solid var(--owl-red)', color: 'var(--owl-red)'
          }}>{error}</div>
        )}

        {/* Submit */}
        <button className="owl-login-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'กำลังสมัคร…' : 'สมัครสมาชิก'}
        </button>

        {/* Footer */}
        <div className="owl-login-footer">
          มีบัญชีอยู่แล้ว?{' '}
          <Link to="/login" className="owl-login-link">เข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  )
}