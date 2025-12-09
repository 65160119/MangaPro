import React, { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'

export default function Catalog(){
  const [mangas, setMangas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      // Note: adjust table name to your actual table (e.g., 'Manga' or 'manga')
      const { data, error } = await supabase
        .from('Manga')
        .select('id, title, cover')
        .limit(100)

      if (!mounted) return
      if (error) {
        setError(error.message)
        setMangas([])
        setLoading(false)
        return
      }

      // Convert storage paths to public URLs when necessary
      const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
      const normalized = (data || []).map(item => {
        let imageUrl = null
        if (item.cover) {
          // if already a full URL, use it
          if (/^https?:\/\//i.test(item.cover)) {
            imageUrl = item.cover
          } else {
            // getPublicUrl returns an object with data.publicUrl
            try {
              const publicData = supabase.storage.from(bucket).getPublicUrl(item.cover)
              imageUrl = publicData?.data?.publicUrl || null
            } catch (e) {
              imageUrl = null
            }
          }
        }
        return { ...item, imageUrl }
      })

      setMangas(normalized)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <div>Loading catalog...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div style={{padding:20}}>
      <h2>Mangas</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:20}}>
        {mangas.map(m => (
          <div key={m.id} style={{border:'1px solid #ddd', padding:8, borderRadius:6, background:'#fff'}}>
            {m.imageUrl ? (
              <img src={m.imageUrl} alt={m.title} style={{width:'100%', aspectRatio: '2/3', objectFit:'cover', borderRadius:4, display:'block'}}/>
            ) : (
              <div style={{width:'100%', aspectRatio:'2/3', background:'#eee', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:4}}>No cover</div>
            )}
            <div style={{marginTop:10,fontWeight:700, fontSize:14}}>{m.title}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
