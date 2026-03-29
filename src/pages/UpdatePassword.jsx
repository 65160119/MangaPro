import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import OwlbookStyles from '../components/OwlbookStyles'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null)
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const goBackToLogin = async () => {
    try { await supabase.auth.signOut() } catch (e) { console.warn('signOut', e) }
    navigate('/login')
  }

  const handleSubmit = async () => {
    setStatus(null)
    if (!password) { setStatus('กรุณากรอกรหัสผ่านใหม่'); setIsError(true); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setIsError(false)
      setStatus('เปลี่ยนรหัสผ่านสำเร็จแล้ว! โปรดเข้าสู่ระบบด้วยรหัสผ่านใหม่ของคุณ')
      // เพื่อความปลอดภัย ออกจากระบบจากลิงก์รีเซ็ต แล้วให้ผู้ใช้ล็อกอินใหม่เอง
      await supabase.auth.signOut()
      navigate('/login')
    } catch (e) {
      setIsError(true)
      setStatus(e.message || String(e))
    }
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
        .owl-status-success {
          padding: 9px 13px; border-radius: 9px; font-size: 13px; margin-bottom: 8px;
          background: rgba(16,185,129,0.1); border: 1px solid #10B981; color: #10B981;
        }
        .owl-status-error {
          padding: 9px 13px; border-radius: 9px; font-size: 13px; margin-bottom: 8px;
          background: rgba(240,112,128,0.1); border: 1px solid var(--owl-red); color: var(--owl-red);
        }
      `}</style>

      <div className="owl-login-card">
        <div className="owl-login-logo">
          <img src="/Owl-Book.png" alt="Owlbook" />
          <h1 className="owl-modal-title" style={{ textAlign: 'center' }}>ตั้งรหัสผ่านใหม่</h1>
          <p className="owl-login-sub">กรอกรหัสผ่านใหม่ของคุณด้านล่าง</p>
        </div>

        <div className="owl-login-fields">
          <input className="owl-input" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}
            type="password" placeholder="รหัสผ่านใหม่"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {status && (
          <div className={isError ? 'owl-status-error' : 'owl-status-success'}>{status}</div>
        )}

        <button className="owl-login-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}
        </button>

        <div className="owl-login-footer">
          <button type="button" className="owl-login-link" onClick={goBackToLogin}>
            ← กลับไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    </div>
  )
}