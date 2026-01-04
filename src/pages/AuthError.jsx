import React from 'react'
import { useSearchParams } from 'react-router-dom'

export default function AuthError(){
  const [params] = useSearchParams()
  const error = params.get('error') || 'Unknown error'
  return (
    <div style={{padding:20, maxWidth:640, margin:'20px auto'}}>
      <h2>Authentication error</h2>
      <p style={{color:'red'}}>{error}</p>
    </div>
  )
}
