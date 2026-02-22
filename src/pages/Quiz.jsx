import React, { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import RatingStars from '../components/RatingStars'
import AddToListForm from '../components/AddToListForm'
import { useAuth } from '../context/Auth'

export default function Quiz(){
  const [step, setStep] = useState(0)
  const [tagsOptions, setTagsOptions] = useState([])
  const [publishers, setPublishers] = useState([])
  const [answer, setAnswer] = useState({ tags: [], finished: null, publisher: null, mood: null, mc_gender: null })
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [relaxMsg, setRelaxMsg] = useState('')
  const [debugInfo, setDebugInfo] = useState(null)
  const [selectedManga, setSelectedManga] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const { user } = useAuth()

  useEffect(()=>{
    let mounted = true
    async function loadOptions(){
      try{
        // fetch a bunch of rows to collect tags and publishers (select * to handle Thai/English column names)
        const { data } = await supabase.from('Manga').select('*').limit(1000)
        if (!mounted) return
        const tagSet = new Set()
        const pubSet = new Set()
        ;(data||[]).forEach(r => {
          // handle both English and Thai column names
          const pubVal = r.publisher || r['ผู้จัดพิมพ์'] || r.publisher_name || r.publisher_name
          if (pubVal) pubSet.add(String(pubVal).trim())
          if (r.tags) {
            if (Array.isArray(r.tags)) r.tags.forEach(t=> t && tagSet.add(String(t).trim()))
            else if (typeof r.tags === 'string') r.tags.split(',').map(s=>s.trim()).filter(Boolean).forEach(t=>tagSet.add(t))
          }
        })
        setTagsOptions(Array.from(tagSet).sort((a,b)=>a.localeCompare(b)))
        setPublishers(Array.from(pubSet).sort((a,b)=>a.localeCompare(b)))
      }catch(e){ console.warn('quiz load options', e) }
    }
    loadOptions()
    return ()=>{ mounted = false }
  }, [])

  const onPick = (key, value) => {
    if (key === 'tags') {
      setAnswer(prev => {
        const arr = Array.isArray(prev.tags) ? prev.tags.slice() : []
        const idx = arr.indexOf(value)
        if (idx === -1) {
          if (arr.length >= 2) return prev // max 2
          arr.push(value)
        } else {
          arr.splice(idx,1)
        }
        return { ...prev, tags: arr }
      })
      return
    }
    setAnswer(prev => ({ ...prev, [key]: value }))
  }

  // helper to read fields that may be stored with English or Thai column names
  const getField = (obj, keys) => {
    for (const k of keys) {
      if (!obj) continue
      if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k]
    }
    return null
  }

  // normalize/compare helpers
  const detectFinished = (stRaw) => {
    const st = String(stRaw || '').toLowerCase()
    if (!st) return null
    // explicit negative like 'ยังไม่' (ยังไม่จบ) should be treated as not finished
    if (st.includes('ยังไม่') || st.includes('ongoing') || st.includes('not') || st.includes('on-going')) return false
    // explicit finished indicators
    if (st.includes('จบแล้ว') || (st.includes('จบ') && !st.includes('ยังไม่')) || st.includes('finish') || st.includes('finished') || st.includes('completed')) return true
    return null
  }

  const isMoodMatch = (moodValRaw, wantRaw) => {
    const moodVal = String(moodValRaw || '').toLowerCase()
    const want = String(wantRaw || '').toLowerCase()
    if (!want) return true
    if (!moodVal) return false
    if (moodVal.includes(want)) return true
    if (want === 'light') return moodVal.includes('สบาย') || moodVal.includes('light') || moodVal.includes('เบา')
    if (want === 'balance') return moodVal.includes('กลาง') || moodVal.includes('balance') || moodVal.includes('ปานกลาง')
    if (want === 'dark') return moodVal.includes('ดาร์ก') || moodVal.includes('dark') || moodVal.includes('มืด')
    return moodVal.includes(want)
  }

  const isMCMatch = (mcValRaw, wantGender) => {
    const mcVal = String(mcValRaw || '').toLowerCase()
    if (!wantGender) return true
    if (!mcVal) return false
    if (wantGender === 'male') return (mcVal.includes('male') || mcVal.includes('boy') || mcVal.includes('ชาย'))
    if (wantGender === 'female') return (mcVal.includes('female') || mcVal.includes('girl') || mcVal.includes('หญิง'))
    // 'both' mapping should accept 'both', 'couple', 'คู่', 'ทั้ง', and 'dual'
    if (wantGender === 'both') return (mcVal.includes('couple') || mcVal.includes('both') || mcVal.includes('คู่') || mcVal.includes('ทั้ง') || mcVal.includes('dual'))
    return false
  }

  const runSearch = async () => {
    setLoading(true)
    try{
      // fetch candidates and filter client-side for robustness
      // use select('*') to avoid 400 errors when table uses different column names
      const { data: rows } = await supabase.from('Manga').select('*').limit(500)
      const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
      const filtered = (rows || []).filter(item => {
        // tags: require all selected tags
        if (answer.tags && answer.tags.length > 0) {
          const itemTags = Array.isArray(item.tags) ? item.tags.map(t=>String(t).toLowerCase()) : (typeof item.tags === 'string' ? item.tags.split(',').map(s=>s.trim().toLowerCase()) : [])
          for (const t of answer.tags) {
            if (!itemTags.includes(String(t).toLowerCase())) return false
          }
        }
        // finished filter: use robust detector (handles 'ยังไม่จบ')
        if (answer.finished) {
          const isFinished = detectFinished(getField(item, ['status','สถานะ']))
          if (answer.finished === 'finished' && isFinished !== true) return false
          if (answer.finished === 'not_finished' && isFinished === true) return false
        }
        // publisher
        if (answer.publisher) {
          const pubVal = getField(item, ['publisher','ผู้จัดพิมพ์'])
          if (!pubVal || String(pubVal).trim().toLowerCase() !== String(answer.publisher).trim().toLowerCase()) return false
        }
        // mood matching (allow light/balance/dark mapping and Thai keywords)
        if (answer.mood) {
          if (!isMoodMatch(getField(item, ['mood','mood']), answer.mood)) return false
        }
        // main character gender: try to match keywords
        if (answer.mc_gender) {
          if (!isMCMatch(getField(item, ['mc','mc']), answer.mc_gender)) return false
        }
        return true
      })
      const normalized = (filtered||[]).map(item => {
        let imageUrl = null
        if (item.cover) {
          if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
          else { try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch(e){ imageUrl = null } }
        }
        return { ...item, imageUrl }
      })
      let final = (normalized || []).slice(0, 4)
      let msg = ''
      // set debug info initial
      setDebugInfo({ totalRows: (rows||[]).length, filteredCount: (filtered||[]).length, normalizedCount: (normalized||[]).length })
      // progressive relaxation if no exact matches
      if ((!final || final.length === 0)) {
        // 1) ignore publisher
        const relaxed1 = (normalized || []).filter(item => {
          // repeat filtering but without publisher
          if (answer.tags && answer.tags.length > 0) {
            const itemTags = Array.isArray(item.tags) ? item.tags.map(t=>String(t).toLowerCase()) : (typeof item.tags === 'string' ? item.tags.split(',').map(s=>s.trim().toLowerCase()) : [])
            for (const t of answer.tags) if (!itemTags.includes(String(t).toLowerCase())) return false
          }
          if (answer.finished) {
            const isFinished = detectFinished(getField(item, ['status','สถานะ']))
            if (answer.finished === 'finished' && isFinished !== true) return false
            if (answer.finished === 'not_finished' && isFinished === true) return false
          }
          if (answer.mood) {
            if (!isMoodMatch(getField(item, ['mood','mood']), answer.mood)) return false
          }
          if (answer.mc_gender) {
            if (!isMCMatch(getField(item, ['mc','mc']), answer.mc_gender)) return false
          }
          return true
        })
        if (relaxed1 && relaxed1.length > 0) { final = relaxed1.slice(0,4); msg = 'No exact matches — ignored publisher filter' }
      }
      if ((!final || final.length === 0)) {
        // 2) ignore tags as well
        const relaxed2 = (normalized || []).filter(item => {
          if (answer.finished) {
            const isFinished = detectFinished(getField(item, ['status','สถานะ']))
            if (answer.finished === 'finished' && isFinished !== true) return false
            if (answer.finished === 'not_finished' && isFinished === true) return false
          }
          if (answer.mood) {
            if (!isMoodMatch(getField(item, ['mood','mood']), answer.mood)) return false
          }
          if (answer.mc_gender) {
            if (!isMCMatch(getField(item, ['mc','mc']), answer.mc_gender)) return false
          }
          return true
        })
        if (relaxed2 && relaxed2.length > 0) { final = relaxed2.slice(0,4); msg = msg ? msg + '; also ignored tags' : 'No matches — ignored tags' }
      }
      if ((!final || final.length === 0)) {
        // 3) last resort: return any 4 items
        final = (normalized || []).slice(0,4)
        if (final.length > 0) msg = msg ? msg + '; returning popular items' : 'No matches — returning top items'
      }
      setRelaxMsg(msg)
      setResults(final)
      // update debug info with final count and relax message
      setDebugInfo(prev => ({ ...(prev||{}), finalCount: (final||[]).length, relaxMsg: msg }))
      setStep(5)
    }catch(e){ console.warn('quiz search', e) }
    finally{ setLoading(false) }
  }

  const reset = () => { setStep(0); setAnswer({ tags: [], finished: null, publisher: null, mood: null, mc_gender: null }); setResults([]); setSelectedManga(null) }

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
        setSelectedManga({ ...m, ...data, imageUrl, tags: tagsArray, publisher: getField(data, ['publisher','ผู้จัดพิมพ์']), author: getField(data, ['author','ผู้แต่ง']), status: getField(data, ['status','สถานะ']), _loading: false })
      } else {
        setSelectedManga({ ...m, _loading: false })
      }
    } catch (e) {
      console.error('fetch detail', e)
      setSelectedManga({ ...m, _loading: false })
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl mb-4">Quiz: หาแนะนำสำหรับคุณ</h2>

      {step === 0 && (
        <div>
          <p className="mb-3">คำถาม 1: แนวเรื่องที่คุณอยากอ่าน (เลือกได้สูงสุด 2 แท็ก)</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {tagsOptions.length === 0 ? <div className="text-gray-500">กำลังโหลดตัวเลือก...</div> : tagsOptions.map(t => (
              <button key={t} onClick={()=>onPick('tags', t)} className={`px-3 py-1 rounded ${answer.tags.includes(t)? 'bg-blue-600 text-white':'bg-gray-100'}`}>{t}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={()=>setStep(1)} disabled={answer.tags.length===0}>ถัดไป</button>
            <button className="px-4 py-2 rounded border" onClick={()=>setStep(1)}>ข้าม</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="mb-3">คำถาม 2: อยากอ่านเรื่องที่จบแล้วหรือไม่?</p>
          <div className="flex gap-2 mb-4">
            <button onClick={()=>onPick('finished','finished')} className={`px-4 py-2 rounded ${answer.finished==='finished'? 'bg-blue-600 text-white':'bg-gray-100'}`}>จบแล้ว</button>
            <button onClick={()=>onPick('finished','not_finished')} className={`px-4 py-2 rounded ${answer.finished==='not_finished'? 'bg-blue-600 text-white':'bg-gray-100'}`}>ยังไม่จบ</button>
            <button onClick={()=>onPick('finished', null)} className={`px-4 py-2 rounded ${answer.finished===null? 'bg-blue-600 text-white':'bg-gray-100'}`}>ไม่ระบุ</button>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={()=>setStep(2)}>ถัดไป</button>
            <button className="px-4 py-2 rounded border" onClick={()=>setStep(0)}>กลับ</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="mb-3">คำถาม 3: สำนักพิมพ์ที่อยากซื้อ (เลือกได้หนึ่งแห่ง)</p>
          <div className="mb-4">
            <select id="publisher-select" name="publisher" aria-label="สำนักพิมพ์" value={answer.publisher || ''} onChange={e=>onPick('publisher', e.target.value || null)} className="px-3 py-2 rounded border">
              <option value="">ไม่ระบุ</option>
              {publishers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={()=>setStep(3)}>ถัดไป</button>
            <button className="px-4 py-2 rounded border" onClick={()=>setStep(1)}>กลับ</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="mb-3">คำถาม 4: อยากได้อารมณ์แบบไหน?</p>
          <div className="flex gap-2 mb-4">
            <button onClick={()=>onPick('mood','light')} className={`px-4 py-2 rounded ${answer.mood==='light'? 'bg-blue-600 text-white':'bg-gray-100'}`}>สบายๆ</button>
            <button onClick={()=>onPick('mood','balance')} className={`px-4 py-2 rounded ${answer.mood==='balance'? 'bg-blue-600 text-white':'bg-gray-100'}`}>กลางๆ</button>
            <button onClick={()=>onPick('mood','dark')} className={`px-4 py-2 rounded ${answer.mood==='dark'? 'bg-blue-600 text-white':'bg-gray-100'}`}>ดาร์ก</button>
            <button onClick={()=>onPick('mood', null)} className={`px-4 py-2 rounded ${answer.mood===null? 'bg-blue-600 text-white':'bg-gray-100'}`}>ไม่ระบุ</button>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={()=>setStep(4)}>ถัดไป</button>
            <button className="px-4 py-2 rounded border" onClick={()=>setStep(2)}>กลับ</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <p className="mb-3">คำถาม 5: ตัวเอกเพศอะไร?</p>
          <div className="flex gap-2 mb-4">
            <button onClick={()=>onPick('mc_gender','male')} className={`px-4 py-2 rounded ${answer.mc_gender==='male'? 'bg-blue-600 text-white':'bg-gray-100'}`}>ชาย</button>
            <button onClick={()=>onPick('mc_gender','female')} className={`px-4 py-2 rounded ${answer.mc_gender==='female'? 'bg-blue-600 text-white':'bg-gray-100'}`}>หญิง</button>
            <button onClick={()=>onPick('mc_gender','both')} className={`px-4 py-2 rounded ${answer.mc_gender==='both'? 'bg-blue-600 text-white':'bg-gray-100'}`}>ทั้งคู่</button>
            <button onClick={()=>onPick('mc_gender', null)} className={`px-4 py-2 rounded ${answer.mc_gender===null? 'bg-blue-600 text-white':'bg-gray-100'}`}>ไม่ระบุ</button>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={()=>runSearch()} >ดูผลลัพธ์</button>
            <button className="px-4 py-2 rounded border" onClick={()=>setStep(3)}>กลับ</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <h3 className="text-xl mb-2">ผลลัพธ์ที่ตรงกับคำตอบของคุณ</h3>
          {relaxMsg ? <div className="text-sm text-yellow-700 mb-2">{relaxMsg}</div> : null}
          {debugInfo ? (
            <div className="text-xs text-gray-500 mb-2">แถวทั้งหมด: {debugInfo.totalRows} — หลังกรอง: {debugInfo.filteredCount} — มีรูป: {debugInfo.normalizedCount} — แสดง: {debugInfo.finalCount || 0}</div>
          ) : null}
          {loading ? <div>Loading...</div> : (
            <>
              {results.length === 0 ? (
                <div className="text-gray-500 mb-3">ไม่พบผลลัพธ์ ลองเปลี่ยนคำตอบ</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {results.map(m => (
                    <div key={m.id} onClick={() => openManga(m)} className="border rounded p-2 flex flex-col items-start cursor-pointer">
                      {m.imageUrl ? <img src={m.imageUrl} alt={m.title} className="w-40 h-60 object-cover rounded" /> : <div className="w-40 h-60 bg-gray-200 rounded" />}
                      <div className="font-semibold mt-2">{m.title}</div>
                      <div className="text-xs text-gray-600">{m.mood || ''} · {m.mc || ''}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <button className="px-4 py-2 rounded border" onClick={reset}>เริ่มใหม่</button>
              </div>
            </>
          )}

          {/* detail modal - reused behaviour similar to Catalog */}
          {selectedManga ? (
            <div onClick={()=>setSelectedManga(null)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:60}}>
              <div onClick={e=>e.stopPropagation()} style={{width:680, maxWidth:'95%', background:'#fff', borderRadius:8, padding:18, boxShadow:'0 10px 40px rgba(0,0,0,0.4)'}}>
                <div style={{display:'flex', gap:16}}>
                  <div style={{width:220, flex:'0 0 auto'}}>
                    {selectedManga.imageUrl ? <img src={selectedManga.imageUrl} alt={selectedManga.title} style={{width:'100%', height:320, objectFit:'contain', borderRadius:6}} /> : <div style={{width:'100%', height:320, background:'#f2f2f2', borderRadius:6}} />}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                      <div>
                        <h3 style={{margin:0}}>{selectedManga.title}</h3>
                        <div style={{display:'flex', alignItems:'center', gap:12, marginTop:6}}>
                          <div style={{color:'#666'}}>{(selectedManga.tags||[]).join(', ') || 'Untagged'}</div>
                          <div><RatingStars mangaId={selectedManga.id} /></div>
                        </div>
                      </div>
                      <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        <button onClick={(e)=>{ e.stopPropagation(); if(!user) return alert('โปรดล็อกอินก่อน'); setShowAddForm(true) }} style={{padding:'6px 10px', borderRadius:8, background:'#eef2ff', border:'1px solid #c7d2fe', cursor:'pointer'}}>Add to My List</button>
                        <button onClick={()=>setSelectedManga(null)} style={{border:'none', background:'transparent', fontSize:20, cursor:'pointer'}}>✕</button>
                      </div>
                    </div>
                    <div style={{marginTop:12, color:'#333'}}>
                      {selectedManga._loading ? (
                        <div>กำลังโหลดข้อมูล...</div>
                      ) : (
                        <div>
                          <div style={{marginBottom:8}}>
                            <div style={{marginTop:6, fontSize:14, lineHeight:1.45}}>{selectedManga.description || 'ไม่มีข้อมูลคำอธิบาย'}</div>
                          </div>
                          <div style={{marginTop:8}}>
                            {selectedManga.author && (
                              <div style={{marginBottom:6}}><strong>Author:</strong> <span style={{color:'#333'}}>{selectedManga.author}</span></div>
                            )}
                            {selectedManga.publisher && (
                              <div style={{marginBottom:6}}><strong>Publisher:</strong> <span style={{color:'#333'}}>{selectedManga.publisher}</span></div>
                            )}
                            {selectedManga.volume && (
                              <div style={{marginBottom:6}}><strong>Volume:</strong> <span style={{color:'#333'}}>{selectedManga.volume}</span></div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {showAddForm && selectedManga && <AddToListForm mangaId={selectedManga.id} onClose={()=>setShowAddForm(false)} onAdded={()=>{ setShowAddForm(false); }} />}

        </div>
      )}

    </div>
  )
}
