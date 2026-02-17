import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/Auth'
import supabase from '../lib/supabaseClient'
import userMangaList from '../lib/userMangaList'
import useFavorite from '../lib/favorites'
import { Link } from 'react-router-dom'
import RatingStars from '../components/RatingStars'
import AddToListForm from '../components/AddToListForm'

function FavoriteButtonSmall({ mangaId }){
  const { user } = useAuth()
  const { isFavorite, loading, toggle } = useFavorite(mangaId)
  if (!user) return null
  const title = isFavorite ? 'เลิกชอบ' : 'เพิ่มในรายการโปรด'
  return (
    <button
      title={title}
      onClick={async (e)=>{ e.stopPropagation(); await toggle() }}
      style={{position:'absolute', top:8, right:8, zIndex:20, border:'none', background:'rgba(255,255,255,0.9)', padding:6, borderRadius:6, cursor:'pointer'}}
    >
      <span style={{color: isFavorite ? '#e0245e' : '#666'}}>{isFavorite ? '♥' : '♡'}</span>
    </button>
  )
}

// Larger favorite button used inside modal
function FavoriteButtonLarge({ mangaId }){
  const { user } = useAuth()
  const { isFavorite, loading, toggle } = useFavorite(mangaId)
  if (!user) return null
  const label = isFavorite ? 'เลิกชอบ' : 'เพิ่มในรายการโปรด'
  return (
    <button onClick={async (e)=>{ e.stopPropagation(); if (!user) return alert('โปรดล็อกอินก่อน'); await toggle() }} style={{padding:'6px 10px', borderRadius:8, background:isFavorite? '#ffeef0' : '#f1f5f9', border:'1px solid #ddd', cursor:'pointer'}}>
      {label}
    </button>
  )
}

export default function Status(){
  const { user } = useAuth()
  const [tab, setTab] = useState('favorites')
  const [favorites, setFavorites] = useState([])
  const [loadingFav, setLoadingFav] = useState(false)
  const [selectedManga, setSelectedManga] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const displayName = user?.email ? String(user.email).split('@')[0] : 'User'
  const [overviewItems, setOverviewItems] = useState([])
  const [loadingOverview, setLoadingOverview] = useState(false)

  useEffect(()=>{
    let mounted = true
    async function loadFavorites(){
      if (!user) { setFavorites([]); return }
      setLoadingFav(true)
      try{
        const { data: favRows, error: favErr } = await supabase.from('User_Favorite').select('manga_id').eq('user_id', user.id)
        if (favErr) { console.warn('fav fetch', favErr); if (mounted) setFavorites([]); return }
        const ids = (favRows || []).map(r => r.manga_id).filter(Boolean)
        if (ids.length === 0) { if (mounted) setFavorites([]); return }
        const { data: mangasData, error: mangasErr } = await supabase.from('Manga').select('id, title, cover, tags, update').in('id', ids)
        if (mangasErr) { console.warn('manga fetch', mangasErr); if (mounted) setFavorites([]); return }
        const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
        const normalizeItem = (item) => {
          let imageUrl = null
          if (item.cover) {
            if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
            else { try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch(e){ imageUrl = null } }
          }
          let tagsArray = []
          if (item.tags) {
            if (Array.isArray(item.tags)) tagsArray = item.tags.map(t => String(t).trim()).filter(Boolean)
            else if (typeof item.tags === 'string') tagsArray = item.tags.split(',').map(s => s.trim()).filter(Boolean)
          }
          return { ...item, imageUrl, tags: tagsArray }
        }
        const normalized = (mangasData || []).map(normalizeItem)
        if (mounted) setFavorites(normalized)
      }catch(e){ console.warn('loadFavorites', e); if (mounted) setFavorites([]) }
      finally{ if (mounted) setLoadingFav(false) }
    }
    if (tab === 'favorites') loadFavorites()
    if (tab === 'overview') loadOverview()
    return ()=>{ mounted = false }
  }, [user, tab])

  async function loadOverview(){
    if (!user) { setOverviewItems([]); return }
    setLoadingOverview(true)
    try{
      const { data: listRows, error: listErr } = await userMangaList.getList(user.id)
      if (listErr) { console.warn('overview fetch', listErr); setOverviewItems([]); return }
      const ids = (listRows||[]).map(r=>r.manga_id).filter(Boolean)
      if (ids.length === 0) { setOverviewItems([]); return }
      const { data: mangasData, error: mangasErr } = await supabase.from('Manga').select('id, title, cover').in('id', ids)
      if (mangasErr) { console.warn('overview mangas', mangasErr); setOverviewItems([]); return }
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
      setOverviewItems(merged)
    }catch(e){ console.warn('loadOverview', e); setOverviewItems([]) }
    finally{ setLoadingOverview(false) }
  }

  const handleOverviewUpdate = async (entryId, updates) => {
    try{
      const { error } = await userMangaList.updateEntry(entryId, updates)
      if (error) return alert('Update error: '+(error.message||error))
      await loadOverview()
    }catch(e){ console.warn('overview update', e); alert(String(e)) }
  }

  const handleOverviewRemove = async (entryId) => {
    if (!confirm('ลบรายการนี้จาก My List?')) return
    try{
      const { error } = await userMangaList.removeEntry(entryId)
      if (error) return alert('Delete error: '+(error.message||error))
      await loadOverview()
    }catch(e){ console.warn('overview remove', e); alert(String(e)) }
  }

  // openManga: fetch full record and show detail modal (similar to Catalog)
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
    } finally {
      setDetailLoading(false)
    }
  }

  const buildStoreSearchUrl = (site, title) => {
    const q = encodeURIComponent(String(title || '').trim())
    switch ((site || '').toLowerCase()){
      case 'shopee': return `https://shopee.co.th/search?keyword=${q}`
      case 'lazada': return `https://www.lazada.co.th/catalog/?q=${q}`
      case 'yaakz': return `https://www.yaakz.com/search/?q=${q}`
      case 'naiin': return `https://www.naiin.com/search-result?title=${q}`
      case 'bookwalker': return `https://bookwalker.in.th/search/?word=${q}&order=relevance&page=1`
      default: return `https://www.google.com/search?q=${q}`
    }
  }

  return (
    <div style={{padding:20}}>
      <h2>สถานะของ {displayName}</h2>

      <div style={{display:'flex',gap:12,marginTop:12,borderBottom:'1px solid #eee',paddingBottom:8}}>
        <button onClick={()=>setTab('favorites')} style={{background: tab==='favorites' ? '#eee' : 'transparent', padding:'6px 10px', borderRadius:6}}>Favorites</button>
        <button onClick={()=>setTab('overview')} style={{background: tab==='overview' ? '#eee' : 'transparent', padding:'6px 10px', borderRadius:6}}>Overview</button>
      </div>

      {/* Modal for selected manga */}
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
                    <FavoriteButtonLarge mangaId={selectedManga.id} />
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

                      <div style={{marginTop:10, marginBottom:8}}>
                        <div style={{fontSize:13, fontWeight:600, marginBottom:6}}>หาซื้อได้ที่</div>
                        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                          {
                            (() => {
                              const stores = [
                                { key: 'shopee', label: 'Shopee', color: '#ff6d00' },
                                { key: 'lazada', label: 'Lazada', color: '#ff5a5f' },
                                { key: 'yaakz', label: 'Yaakz', color: '#0b73b7' },
                                { key: 'naiin', label: 'นายอินทร์', color: '#0066cc' },
                                { key: 'bookwalker', label: 'BookWalker', color: '#2b2b2b' }
                              ]
                              return stores.map(s => {
                                const url = buildStoreSearchUrl(s.key, selectedManga.title)
                                return (
                                  <a key={s.key}
                                    href={url}
                                    onClick={e => { e.preventDefault(); try { window.open(url, '_blank', 'noopener') } catch { window.location.href = url } }}
                                    style={{padding:'6px 10px', background:s.color, color:'#fff', borderRadius:6, textDecoration:'none'}}
                                  >{s.label}</a>
                                )
                              })
                            })()
                          }
                        </div>
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

                      <div style={{marginTop:10}}>
                        {(() => {
                          const excluded = new Set(['imageUrl','id','cover','tags','title','_loading','description','author','publisher','volume','avg','votes'])
                          const entries = Object.entries(selectedManga).filter(([k]) => !excluded.has(k))
                          const order = ['status','update']
                          const ordered = []
                          const rest = []
                          entries.forEach(([k,v]) => {
                            if (order.includes(k)) ordered.push([k,v])
                            else rest.push([k,v])
                          })
                          const final = [...ordered, ...rest]
                          return final.map(([k,v]) => {
                            let display = ''
                            if (k === 'update' && v) {
                              try { display = new Date(v).toLocaleDateString() } catch { display = String(v) }
                            } else if (Array.isArray(v)) display = v.join(', ')
                            else if (typeof v === 'object') display = JSON.stringify(v)
                            else display = String(v)
                            return (
                              <div key={k} style={{marginBottom:8}}>
                                <strong style={{textTransform:'capitalize'}}>{k.replace(/_/g,' ')}:</strong>
                                <div style={{color:'#333'}}>{display}</div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                {showAddForm && selectedManga && <AddToListForm mangaId={selectedManga.id} onClose={()=>setShowAddForm(false)} onAdded={()=>{ setShowAddForm(false) }} />}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{marginTop:16}}>
        {tab === 'favorites' && (
          <div>
            {loadingFav ? (
              <div>Loading favorites...</div>
            ) : (
              <>
                {favorites.length === 0 ? (
                  <div style={{color:'#666'}}>ยังไม่มีรายการโปรด</div>
                ) : (
                    <section style={{marginBottom:20}}>
                    <h3 style={{marginTop:6}}>รายการโปรดของคุณ</h3>
                    <div style={{display:'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap:16, paddingTop:12}}>
                          {favorites.map(m => (
                            <div key={m.id} style={{width:'100%', cursor:'pointer', position:'relative'}} onClick={() => openManga(m)}>
                              {m.imageUrl ? <img src={m.imageUrl} alt={m.title} style={{width:'100%', height:200, objectFit:'cover', borderRadius:8}} /> : <div style={{width:'100%', height:200, background:'#eee', borderRadius:8}} />}
                              <div style={{fontSize:14, marginTop:8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%'}}>{m.title}</div>
                              <div style={{fontSize:12, color:'#666'}}>{m.update ? new Date(m.update).toLocaleDateString() : ''}</div>
                              <FavoriteButtonSmall mangaId={m.id} />
                            </div>
                          ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'overview' && (
          <div>
            {loadingOverview ? (
              <div>Loading overview...</div>
            ) : (
              <>
                {overviewItems.length === 0 ? (
                  <div style={{color:'#666'}}>ยังไม่มีรายการใน My List</div>
                ) : (
                  <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12}}>
                    {overviewItems.map(entry => (
                      <div key={entry.id} style={{border:'1px solid #eee', padding:12, borderRadius:8, display:'flex', gap:12, alignItems:'center'}}>
                        <div style={{width:72, flex:'0 0 auto'}}>
                          {entry.manga && entry.manga.imageUrl ? <img src={entry.manga.imageUrl} alt={entry.manga.title} style={{width:'100%', height:100, objectFit:'cover', borderRadius:4}} /> : <div style={{width:72, height:100, background:'#eee', borderRadius:4}} />}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600}}>{entry.manga ? entry.manga.title : 'Unknown'}</div>
                          <div style={{marginTop:6, display:'flex', gap:8, alignItems:'center'}}>
                            <select value={entry.status || 'planned'} onChange={e => handleOverviewUpdate(entry.id, { status: e.target.value })}>
                              <option value="planned">planned</option>
                              <option value="reading">reading</option>
                              <option value="completed">completed</option>
                              <option value="dropped">dropped</option>
                            </select>
                            <input type="number" placeholder="progress" defaultValue={entry.progress ?? ''} onBlur={e => handleOverviewUpdate(entry.id, { progress: e.target.value ? Number(e.target.value) : null })} style={{width:84}} />
                            <button onClick={() => handleOverviewRemove(entry.id)} style={{marginLeft:'auto', background:'#fee', border:'1px solid #fcc', padding:'6px 8px', borderRadius:6, cursor:'pointer'}}>Remove</button>
                          </div>
                          <div style={{marginTop:6, fontSize:12, color:'#666'}}>Added: {entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
