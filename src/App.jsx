import { Link } from 'react-router-dom'
import React from 'react'
import './App.css'
import AppRoute from './route/app-route'
import { AuthProvider, useAuth } from './context/Auth'

function HeaderAuth(){
  const { user, signOut } = useAuth()
  return (
    <header style={{padding:12,display:'flex',gap:12,alignItems:'center',borderBottom:'1px solid #eee'}}>
      <Link to="/">หนังสือ</Link>
      <Link to="/forum">ฟอรัม</Link>
      <Link to="/random">สุ่มมังงะ</Link>
      <div style={{marginLeft:'auto'}}>
        {user ? (
          (() => {
            const displayName = user?.email ? String(user.email).split('@')[0] : user?.email
            return (
              <>
                <Link to="/status" title={user?.email} style={{marginRight:12, textDecoration:'none', color:'inherit', cursor:'pointer'}}>Signed in: {displayName}</Link>
                <button onClick={()=>signOut()} style={{padding:'6px 10px', borderRadius:6}}>Logout</button>
              </>
            )
          })()
        ) : (
          <>
            <Link to="/login">Login</Link>
          </>
        )}
      </div>
    </header>
  )
}

function App(){
  return (
    <AuthProvider>
      <HeaderAuth />
      <AppRoute />
    </AuthProvider>
  )
}

export default App
