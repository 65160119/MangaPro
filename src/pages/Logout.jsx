import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/Auth'

export default function Logout(){
  const { signOut } = useAuth()
  const navigate = useNavigate()
  useEffect(()=>{
    async function doSignOut(){
      try{ await signOut() }catch{}
      navigate('/')
    }
    doSignOut()
  }, [])
  return <div style={{padding:20}}>Signing out...</div>
}
