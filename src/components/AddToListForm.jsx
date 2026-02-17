import React, { useState } from 'react'
import { useAuth } from '../context/Auth'
import userMangaList from '../lib/userMangaList'
import supabase from '../lib/supabaseClient'

export default function AddToListForm({ mangaId, onClose, onAdded }){
  const { user } = useAuth()
  const [status, setStatus] = useState('planned')
  const [progress, setProgress] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [maxProgress, setMaxProgress] = useState(null)

  // fetch manga metadata (volume) to determine max progress
  React.useEffect(()=>{
    let mounted = true
    async function loadMeta(){
      if (!mangaId) return
      try{
        // select `volume` (column was renamed to `volume`)
        const { data, error } = await supabase.from('Manga').select('volume').eq('id', mangaId).single()
        if (error) { console.warn('loadMeta', error); return }
        if (!mounted) return
        const v = data?.volume
        if (v == null) { setMaxProgress(null); return }
        // try to parse integers in the value; take the largest number found
        const nums = String(v).match(/\d+/g)
        if (!nums || nums.length === 0) { setMaxProgress(null); return }
        const parsed = nums.map(n=>parseInt(n,10)).filter(n=>!isNaN(n))
        if (parsed.length === 0) { setMaxProgress(null); return }
        const max = Math.max(...parsed)
        setMaxProgress(max)
      }catch(e){ console.warn('loadMeta', e) }
    }
    loadMeta()
    return ()=>{ mounted = false }
  }, [mangaId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return alert('โปรดล็อกอินก่อน')
    if (!mangaId) { setErrorMsg('Missing manga id'); return }
    setLoading(true)
    try{
      const opts = { status }
      if (progress !== '') {
        const p = Number(progress)
        if (isNaN(p) || p < 1) { setErrorMsg('Progress must be a positive number'); setLoading(false); return }
        if (maxProgress && p > maxProgress) { setErrorMsg(`Progress cannot exceed ${maxProgress}`); setLoading(false); return }
        opts.progress = p
      }
      const { data, error } = await userMangaList.addToList(user.id, mangaId, opts)
      if (error) {
        console.error('addToList error', error)
        if (error.code === '23505') alert('รายการนี้มีอยู่แล้วใน My List')
        else alert('Error: ' + (error.message || String(error)))
        setErrorMsg(error.message || String(error))
      } else {
        if (onAdded) onAdded()
        onClose && onClose()
      }
    }catch(err){
      console.warn('addToList', err)
      setErrorMsg(String(err))
      alert(String(err))
    }finally{ setLoading(false) }
  }

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:120}}>
      <form onSubmit={handleSubmit} style={{width:360, background:'#fff', padding:16, borderRadius:8}}>
        <h3 style={{marginTop:0}}>Add to My List</h3>
        <div style={{marginBottom:8}}>
          <label style={{display:'block', marginBottom:6}}>Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)} style={{width:'100%', padding:8}}>
            <option value="planned">planned</option>
            <option value="reading">reading</option>
            <option value="completed">completed</option>
            <option value="dropped">dropped</option>
          </select>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{display:'block', marginBottom:6}}>Progress (optional)</label>
          <input type="number" value={progress} onChange={e=>setProgress(e.target.value)} placeholder={maxProgress ? `1 - ${maxProgress}` : 'e.g. 12'} style={{width:'100%', padding:8}} min={1} max={maxProgress || undefined} />
          {maxProgress && <div style={{fontSize:12, color:'#666', marginTop:6}}>This title has {maxProgress} volume{maxProgress>1?'s':''}; progress will be constrained.</div>}
        </div>
        {errorMsg && <div style={{color:'red', marginBottom:8}}>{errorMsg}</div>}
        <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
          <button type="button" onClick={onClose} style={{padding:'6px 10px', borderRadius:6}}>Cancel</button>
          <button type="submit" disabled={loading} style={{padding:'6px 12px', borderRadius:6, background:'#2563eb', color:'#fff', border:'none'}}>{loading ? 'Adding...' : 'Add'}</button>
        </div>
      </form>
    </div>
  )
}
