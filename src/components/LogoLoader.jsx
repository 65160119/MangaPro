import React from 'react'

// fullscreen=true  → คลุมทั้งจอ (ใช้ตอนโหลดหน้า)
// fullscreen=false → inline ตรงกลาง component (ใช้ใน modal หรือ section)
export default function LogoLoader({ message = 'กำลังโหลด...', fullscreen = false }) {
  return (
    <div style={{
      ...(fullscreen ? { position: 'fixed', inset: 0, zIndex: 9999, background: '#110b22' } : { minHeight: '40vh' }),
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    }}>
      <style>{`
        @keyframes owl-bob {
          0%, 100% { transform: translateY(0);   opacity: 1;   }
          50%       { transform: translateY(-8px); opacity: 0.8; }
        }
      `}</style>
      <img
        src="/Owl-Book.png"
        alt="Loading"
        style={{ width: fullscreen ? 100 : 80, height: 'auto', objectFit: 'contain', animation: 'owl-bob 1.6s ease-in-out infinite' }}
      />
      <div style={{ fontSize: 14, color: '#b89af0' }}>{message}</div>
    </div>
  )
}