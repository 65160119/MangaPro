import { useEffect, useState, useCallback } from 'react'
import supabase from './supabaseClient'
import { useAuth } from '../context/Auth'

// Hook to check and toggle favorite for a given mangaId
export function useFavorite(mangaId){
  const { user } = useAuth()
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchFav = useCallback(async () => {
    setError(null)
    if (!user || !mangaId) { setIsFavorite(false); return }
    setLoading(true)
    try{
      const { data, error } = await supabase
        .from('User_Favorite')
        .select('id')
        .eq('user_id', user.id)
        .eq('manga_id', mangaId)
        .limit(1)

      if (error) throw error
      setIsFavorite((data || []).length > 0)
    }catch(e){
      console.warn('fetchFav', e)
      setError(e.message || String(e))
      setIsFavorite(false)
    }finally{ setLoading(false) }
  }, [user, mangaId])

  useEffect(()=>{ fetchFav() }, [fetchFav])

  const toggle = useCallback(async () => {
    setError(null)
    if (!user) { setError('Not authenticated'); return }
    if (!mangaId) { setError('No manga id'); return }

    // optimistic update
    const prev = isFavorite
    setIsFavorite(!prev)

    try{
      if (prev){
        const { error } = await supabase
          .from('User_Favorite')
          .delete()
          .match({ user_id: user.id, manga_id: mangaId })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('User_Favorite')
          .insert([{ user_id: user.id, manga_id: mangaId }])
        if (error) throw error
      }
      // re-sync after server op to ensure state matches DB
      await fetchFav()
    }catch(e){
      console.warn('toggleFav', e)
      setError(e.message || String(e))
      // rollback optimistic
      setIsFavorite(prev)
    }
  }, [user, mangaId, isFavorite, fetchFav])

  return { isFavorite, loading, error, fetchFav, toggle }
}

export default useFavorite
