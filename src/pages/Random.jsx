import React, { useEffect, useState, useRef } from 'react'
import supabase from '../lib/supabaseClient'

export default function Random(){
  // data + loading
  const [covers, setCovers] = useState([])
  const [loading, setLoading] = useState(true)

  // genre/filter
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('All')

  // strip / animation state
  const ITEM_W = 160
  const VISIBLE = 5
  const GAP = 12
  const COPIES = 20
  const slotWidth = ITEM_W + GAP

  const [position, setPosition] = useState(0)
  const positionRef = useRef(0)
  const [transformDuration, setTransformDuration] = useState(80)
  const [spinning, setSpinning] = useState(false)
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState(null)
  const timerRef = useRef(null)
  const [selectedManga, setSelectedManga] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const audioRef = useRef(null)
  const getAudio = () => {
    if (!audioRef.current) {
      try { audioRef.current = new (window.AudioContext || window.webkitAudioContext)() }
      catch(e) { audioRef.current = null }
    }
    return audioRef.current
  }
  const playTick = () => {
    const ctx = getAudio(); if (!ctx) return
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'square'; o.frequency.value = 900; g.gain.value = 0.002
    o.connect(g); g.connect(ctx.destination); o.start()
    setTimeout(()=>{ try{ o.stop() }catch{} }, 60)
  }
  const playChime = () => {
    const ctx = getAudio(); if (!ctx) return
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = 600; g.gain.value = 0.015
    o.connect(g); g.connect(ctx.destination); o.start()
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.0)
    setTimeout(()=>{ try{ o.stop() }catch{} }, 1100)
  }

  // fetch full record and show modal
  const openManga = async (m) => {
    setSelectedManga({ ...m, _loading: true })
    setDetailLoading(true)
    try {
      const { data, error } = await supabase.from('Manga').select('*').eq('id', m.id).single()
      if (!error && data) {
        const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
        let imageUrl = m.imageUrl || null
        if (!imageUrl && data.cover) {
          if (/^https?:\/\//i.test(data.cover)) imageUrl = data.cover
          else { try { imageUrl = supabase.storage.from(bucket).getPublicUrl(data.cover)?.data?.publicUrl || null } catch(e) { imageUrl = null } }
        }
        let tagsArray = []
        if (data.tags) {
          if (Array.isArray(data.tags)) tagsArray = data.tags.map(t => String(t).trim()).filter(Boolean)
          else if (typeof data.tags === 'string') tagsArray = data.tags.split(',').map(s => s.trim()).filter(Boolean)
        }
        setSelectedManga({ ...m, ...data, imageUrl, tags: tagsArray, _loading: false })
      } else {
        setSelectedManga({ ...m, _loading: false })
      }
    } catch (e) {
      console.error('fetch detail', e)
      setSelectedManga({ ...m, _loading: false })
    } finally { setDetailLoading(false) }
  }

  useEffect(() => {
    let mounted = true
    async function load(){
      setLoading(true)
      try{
        const { data, error } = await supabase.from('Manga').select('id,title,cover,tags').limit(400)
        if (error) { console.warn('Random fetch error', error); if (!mounted) return; setCovers([]); setLoading(false); return }
        const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
        const normalized = (data||[]).map(item => {
          let imageUrl = null
          if (item.cover){
            if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
            else { try{ imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null }catch(e){ imageUrl = null } }
          }
          let tags = []
          if (item.tags){ if (Array.isArray(item.tags)) tags = item.tags.map(t=>String(t).trim()).filter(Boolean)
            else if (typeof item.tags === 'string') tags = item.tags.split(',').map(s=>s.trim()).filter(Boolean)
          }
          return { id: item.id, title: item.title, imageUrl, tags }
        }).filter(i=>i.imageUrl)

        // shuffle and preload subset
        for (let i = normalized.length -1; i>0; i--){ const j = Math.floor(Math.random()*(i+1)); [normalized[i], normalized[j]] = [normalized[j], normalized[i]] }
        const imgs = normalized.slice(0,80)
        await Promise.all(imgs.map(i=>new Promise(res=>{ const im=new Image(); im.onload=im.onerror=res; im.src=i.imageUrl })) )

        if (!mounted) return
        setCovers(normalized)
        const gset = new Set(); normalized.forEach(it => (it.tags||[]).forEach(t => gset.add(t)))
        setGenres(['All', ...Array.from(gset).sort((a,b)=>a.localeCompare(b))])
      }catch(e){ console.error('Random load error', e); if (!mounted) return; setCovers([]) }
      finally{ if (!mounted) return; setLoading(false) }
    }
    load()
    return ()=>{ mounted=false; if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  useEffect(()=>{ setIndex(0); setResult(null) }, [selectedGenre])

  // derived visible sequence
  const visibleCovers = selectedGenre === 'All' ? covers : covers.filter(c=> (c.tags||[]).includes(selectedGenre))
  const sequence = visibleCovers.length ? Array(COPIES).fill(visibleCovers).flat() : []
  const centerSlot = Math.floor(VISIBLE/2)

  // reset position when sequence changes
  useEffect(()=>{
    if (!sequence.length) return
    const mid = Math.floor(sequence.length/2)
    setTransformDuration(0)
    setPosition(mid)
    positionRef.current = mid
    const t = setTimeout(()=> setTransformDuration(80), 30)
    return ()=> clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCovers.length])

  // keep ref in sync
  useEffect(()=>{ positionRef.current = position }, [position])

  const spin = () => {
    if (spinning) return
    const visible = visibleCovers
    const n = visible.length
    if (n===0) return
    setSpinning(true); setResult(null)

    const DURATION = 5000
    const loops = 3 + Math.floor(Math.random()*3)
    const final = Math.floor(Math.random()*n)

    const startVisible = positionRef.current % n
    let steps = loops * n + ((final - startVisible + n) % n)
    if (steps<=0) steps = n

    const weights = new Array(steps).fill(0).map((_,i)=>{ const t = steps===1?1:i/(steps-1); return 2*t - t*t })
    const totalW = weights.reduce((a,b)=>a+b,0)||1
    const delays = weights.map(w => Math.max(20, (DURATION * w)/totalW))

    let step = 0
    const tick = () => {
      step++
      const nextPos = positionRef.current + 1
      setPosition(nextPos)
      positionRef.current = nextPos
      const nextVisibleIndex = nextPos % n
      setIndex(nextVisibleIndex)
      try{ playTick() }catch{}

      if (step>=steps){
          setSpinning(false)
          const picked = visible[nextVisibleIndex]
          setResult(picked)
          try{ playChime() }catch{}
          // open modal with full details
          openManga(picked)
          return
      }

      const d = delays[Math.max(0, step-1)] || 40
      setTransformDuration(d)

      // rebase to middle if approaching end to avoid overflow
      const threshold = sequence.length - (VISIBLE * 2)
      if (positionRef.current > threshold) {
        const mid = Math.floor(sequence.length/2)
        timerRef.current = setTimeout(()=>{
          // do a quick rebase without animation
          setTransformDuration(0)
          setPosition(mid)
          positionRef.current = mid
          // restore duration and continue
          setTimeout(()=>{ setTransformDuration(d); timerRef.current = setTimeout(tick, d) }, 30)
        }, d)
      } else {
        timerRef.current = setTimeout(tick, d)
      }
    }

    setTransformDuration(delays[0] || 30)
    timerRef.current = setTimeout(tick, delays[0] || 30)
  }

  useEffect(()=>()=>{ if (timerRef.current) clearTimeout(timerRef.current) }, [])

  if (loading) return <div style={{padding:20}}>กำลังโหลดปก...</div>

  const translateX = -(position - centerSlot) * slotWidth

  return (
    <div style={{padding:20, display:'flex', flexDirection:'column', alignItems:'center'}}>
      <h2>สุ่มมังงะ</h2>

      <div style={{width: (ITEM_W * VISIBLE) + (GAP * (VISIBLE - 1)), height:330, overflow:'hidden', position:'relative'}}>
        <div style={{position:'absolute', left:0, right:0, top:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none'}}>
          <div style={{width:ITEM_W + 14, height:320, borderRadius:6, boxShadow:'0 6px 18px rgba(0,0,0,0.22)', border:'4px solid rgba(255,255,255,0.6)', pointerEvents:'none'}} />
        </div>

        <div style={{display:'flex', gap:GAP, transform:`translateX(${translateX}px)`, transition:`transform ${transformDuration}ms linear`, padding: '10px 0'}}>
          {sequence.length === 0 ? (
            <div style={{width:ITEM_W, height:320, borderRadius:6, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}>ไม่มีปก</div>
          ) : sequence.map((it, i) => (
            <div key={`${it.id}-${i}`} style={{width:ITEM_W, height:320, flex:'0 0 auto', borderRadius:6, overflow:'hidden', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <img src={it.imageUrl} alt={it.title} style={{width:'100%', height:'100%', objectFit:'contain'}} />
            </div>
          ))}
        </div>
      </div>

      <div style={{height:12}} />

      <div style={{display:'flex', gap:12, alignItems:'center'}}>
        <label style={{fontSize:13}}>Genre:</label>
        <select value={selectedGenre} onChange={e=>setSelectedGenre(e.target.value)} style={{padding:6, borderRadius:6}}>
          {genres.map(g=> <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div style={{height:12}} />

      <div style={{display:'flex', gap:12}}>
        <button onClick={spin} disabled={spinning || visibleCovers.length===0} style={{padding:'8px 14px', borderRadius:6, cursor: spinning ? 'not-allowed' : 'pointer'}}>{spinning ? 'กำลังสุ่ม...' : 'หมุน'}</button>
      </div>

      <div style={{height:12}} />
      {result ? (
        <div style={{textAlign:'center'}}>
          <div style={{fontWeight:700}}>{result.title}</div>
          <div style={{fontSize:12,color:'#666'}}>สุ่มเสร็จแล้ว!</div>
        </div>
      ) : null}

      {/* Modal for selected manga */}
      {selectedManga ? (
        <div onClick={()=>setSelectedManga(null)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:60}}>
          <div onClick={e=>e.stopPropagation()} style={{width:620, maxWidth:'94%', maxHeight:'88vh', overflowY:'auto', background:'#fff', borderRadius:8, padding:16, boxShadow:'0 10px 36px rgba(0,0,0,0.38)'}}>
            <div style={{display:'flex', gap:14, alignItems:'flex-start'}}>
              <div style={{width:160, flex:'0 0 auto'}}>
                {selectedManga.imageUrl ? <img src={selectedManga.imageUrl} alt={selectedManga.title} style={{width:'100%', height:260, objectFit:'cover', borderRadius:6}} /> : <div style={{width:'100%', height:260, background:'#f2f2f2', borderRadius:6}} />}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                  <div style={{minWidth:0}}>
                    <h3 style={{margin:0, fontSize:20, lineHeight:1.05, overflowWrap:'anywhere'}}>{selectedManga.title}</h3>
                    <div style={{color:'#666', marginTop:6, fontSize:14}}>{(selectedManga.tags||[]).join(', ') || 'Untagged'}</div>
                  </div>
                  <button onClick={()=>setSelectedManga(null)} style={{border:'none', background:'transparent', fontSize:20, cursor:'pointer', marginLeft:8}}>✕</button>
                </div>
                <div style={{marginTop:12, color:'#333', fontSize:14}}>
                  {selectedManga._loading ? (
                    <div>กำลังโหลดข้อมูล...</div>
                  ) : (
                    <div>
                      {selectedManga.description ? (
                        <p style={{margin:0, fontSize:14, lineHeight:1.45}}>{selectedManga.description}</p>
                      ) : (
                        <p style={{margin:0, fontSize:14, lineHeight:1.45}}>ไม่มีข้อมูลคำอธิบาย</p>
                      )}

                      <div style={{marginTop:12}}>
                        {Object.entries(selectedManga).filter(([k]) => !['imageUrl','id','cover','tags','title','_loading','description'].includes(k)).map(([k,v]) => (
                          <div key={k} style={{marginBottom:8, fontSize:14}}>
                            <strong style={{textTransform:'capitalize', marginRight:8}}>{k.replace(/_/g,' ')}:</strong>
                            <span style={{color:'#333'}}>{Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : String(v))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
