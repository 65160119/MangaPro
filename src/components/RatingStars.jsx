import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/Auth'

// Helper functions (can be imported and used elsewhere)
export async function getUserRating(mangaId) {
  try {
    const session = await supabase.auth.getSession()
    const user = session?.data?.session?.user ?? null
    if (!user) return null
    const { data, error } = await supabase
      .from('rating')
      .select('rating')
      .eq('manga_id', mangaId)
      .eq('user_id', user.id)
      .single()
    if (error) throw error
    return data?.rating ?? null
  } catch (err) {
    console.warn('getUserRating', err)
    return null
  }
}

export async function getAverageRating(mangaId) {
  try {
    const { data, error, count } = await supabase
      .from('rating')
      .select('rating', { count: 'exact' })
      .eq('manga_id', mangaId)

    if (error) throw error
    const rows = data || []
    const votes = rows.length
    const sum = rows.reduce((s, r) => s + (Number(r.rating) || 0), 0)
    const avg = votes > 0 ? sum / votes : 0
    return { average: avg, votes }
  } catch (err) {
    console.warn('getAverageRating', err)
    return { average: 0, votes: 0 }
  }
}

export async function submitRating(mangaId, value) {
  try {
    const session = await supabase.auth.getSession()
    const user = session?.data?.session?.user ?? null
    if (!user) throw new Error('Not authenticated')

    // Use upsert to insert or update existing rating (unique constraint on user_id,manga_id)
    const payload = { user_id: user.id, manga_id: mangaId, rating: Number(value) }
    const { data, error } = await supabase
      .from('rating')
      .upsert([payload], { onConflict: ['user_id', 'manga_id'] })
      .select()

    if (error) throw error
    return data
  } catch (err) {
    console.warn('submitRating', err)
    throw err
  }
}

export default function RatingStars({ mangaId }){
  const { user } = useAuth()
  const [userRating, setUserRating] = useState(null)
  const [hover, setHover] = useState(0)
  const [avg, setAvg] = useState(0)
  const [votes, setVotes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load(){
      setLoading(true)
      try{
        // fetch average and votes
        const res = await getAverageRating(mangaId)
        if (!mounted) return
        setAvg(res.average || 0)
        setVotes(res.votes || 0)

        // fetch user rating if logged in
        if (user && user.id){
          const { data, error } = await supabase
            .from('rating')
            .select('rating')
            .eq('manga_id', mangaId)
            .eq('user_id', user.id)
            .single()
          if (!error && data) setUserRating(Number(data.rating))
        } else {
          setUserRating(null)
        }
      }catch(e){ console.warn('Rating load', e) }
      finally{ if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [mangaId, user])

  const handleClick = async (value) => {
    if (!user){
      alert('โปรดล็อกอินก่อนให้คะแนน')
      return
    }
    if (!mangaId) return
    try{
      setSubmitting(true)
      await submitRating(mangaId, value)
      setUserRating(value)
      // refresh averages
      const res = await getAverageRating(mangaId)
      setAvg(res.average || 0)
      setVotes(res.votes || 0)
    }catch(e){
      console.error('submit rating', e)
      alert('มีข้อผิดพลาดในการส่งคะแนน')
    }finally{ setSubmitting(false) }
  }

  const displayAverage = votes > 0 ? avg.toFixed(1) : '0.0'

  return (
    <div style={{display:'inline-block'}}>
      <div style={{display:'flex', alignItems:'center', gap:8}}>
        <div style={{display:'flex', gap:6}}>
          {[1,2,3,4,5].map(i => (
            <button
              key={i}
              aria-label={`Rate ${i} star`}
              onMouseEnter={()=>setHover(i)}
              onMouseLeave={()=>setHover(0)}
              onClick={() => handleClick(i)}
              disabled={submitting || !user}
              style={{
                cursor: user ? 'pointer' : 'not-allowed',
                border: 'none',
                background: 'transparent',
                fontSize: 20,
                color: (hover || userRating) >= i ? '#ffb400' : '#ccc'
              }}
            >{(hover || userRating) >= i ? '★' : '☆'}</button>
          ))}
        </div>
        <div style={{fontSize:13, color:'#333'}}>{loading ? 'Loading…' : `Average ${displayAverage} (${votes} votes)`}</div>
      </div>
    </div>
  )
}
