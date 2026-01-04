import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/Auth'

export default function RequireAuth({ children }){
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <div style={{padding:20}}>Loading...</div>
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />
  return children
}
