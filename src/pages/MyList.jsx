import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/Auth'
import userMangaList from '../lib/userMangaList'
import supabase from '../lib/supabaseClient'

export default function MyList(){
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    let mounted = true
    async function load(){
      if (!user) { setItems([]); return }
      setLoading(true)
      try{
        const { data: listRows, error: listErr } = await userMangaList.getList(user.id)
        if (listErr) { console.warn('list fetch', listErr); if (mounted) setItems([]); return }
        const ids = (listRows || []).map(r => r.manga_id).filter(Boolean)
        if (ids.length === 0) { if (mounted) setItems([]); return }
        const { data: mangasData, error: mangasErr } = await supabase.from('Manga').select('id, title, cover').in('id', ids)
        if (mangasErr) { console.warn('manga fetch', mangasErr); if (mounted) setItems([]); return }
        const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
        const normalize = (item) => {
          let imageUrl = null
          if (item.cover) {
            if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
            else { try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch(e){ imageUrl = null } }
          }
          return { ...item, imageUrl }
        }
        const byId = Object.fromEntries((mangasData||[]).map(normalize).map(m=>[m.id,m]))
        const merged = (listRows||[]).map(r => ({ ...r, manga: byId[r.manga_id] || null }))
        if (mounted) setItems(merged)
      }catch(e){ console.warn('mylist load', e); if (mounted) setItems([]) }
      finally{ if (mounted) setLoading(false) }
    }
    load()
    return ()=>{ mounted = false }
  }, [user])

  const handleUpdate = async (entryId, updates) => {
    try{
      const { error } = await userMangaList.updateEntry(entryId, updates)
      if (error) return alert('Update error: '+(error.message||error))
      // refresh
      const { data: listRows } = await userMangaList.getList(user.id)
      const ids = (listRows || []).map(r => r.manga_id).filter(Boolean)
      const { data: mangasData } = await supabase.from('Manga').select('id, title, cover').in('id', ids)
      const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
      const normalize = (item) => {
        let imageUrl = null
        if (item.cover) {
          if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
          else { try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch(e){ imageUrl = null } }
        }
        return { ...item, imageUrl }
      }
      const byId = Object.fromEntries((mangasData||[]).map(normalize).map(m=>[m.id,m]))
      setItems((listRows||[]).map(r => ({ ...r, manga: byId[r.manga_id] || null })))
    }catch(e){ console.warn('update', e); alert(String(e)) }
  }

  const handleRemove = async (entryId) => {
    if (!confirm('ลบรายการนี้จาก My List?')) return
    try{
      const { error } = await userMangaList.removeEntry(entryId)
      if (error) return alert('Delete error: '+(error.message||error))
      setItems(prev => prev.filter(x => x.id !== entryId))
    }catch(e){ console.warn('remove', e); alert(String(e)) }
  }

  if (!user) return <div style={{padding:20}}>โปรดล็อกอินเพื่อเข้าถึง My List</div>
  if (loading) return <div style={{padding:20}}>Loading My List...</div>

  return (
    <div style={{padding:20}}>
      <h2>My List</h2>
      {items.length === 0 ? (
        <div style={{color:'#666'}}>ยังไม่มีรายการใน My List</div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:12}}>
          {items.map(entry => (
            <div key={entry.id} style={{border:'1px solid #eee', padding:12, borderRadius:8, display:'flex', gap:12, alignItems:'center'}}>
              <div style={{width:72, flex:'0 0 auto'}}>
                {entry.manga && entry.manga.imageUrl ? <img src={entry.manga.imageUrl} alt={entry.manga.title} style={{width:'100%', height:100, objectFit:'cover', borderRadius:4}} /> : <div style={{width:72, height:100, background:'#eee', borderRadius:4}} />}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{entry.manga ? entry.manga.title : 'Unknown'}</div>
                <div style={{marginTop:6, display:'flex', gap:8, alignItems:'center'}}>
                  <select defaultValue={entry.status || 'planned'} onChange={e => handleUpdate(entry.id, { status: e.target.value })}>
                    <option value="planned">planned</option>
                    <option value="reading">reading</option>
                    <option value="completed">completed</option>
                  </select>
                  <input type="number" placeholder="progress" defaultValue={entry.progress ?? ''} onBlur={e => handleUpdate(entry.id, { progress: e.target.value ? Number(e.target.value) : null })} style={{width:84}} />
                  <button onClick={() => handleRemove(entry.id)} style={{marginLeft:'auto', background:'#fee', border:'1px solid #fcc', padding:'6px 8px', borderRadius:6, cursor:'pointer'}}>Remove</button>
                </div>
                <div style={{marginTop:6, fontSize:12, color:'#666'}}>Added: {entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
