import React, { useEffect, useState, useRef, useCallback } from 'react'
import supabase from '../lib/supabaseClient'
import useFavorite from '../lib/favorites'
import RatingStars from '../components/RatingStars'
import AddToListForm from '../components/AddToListForm'
import { useAuth } from '../context/Auth'

// Small favorite overlay (used on cards)
function FavoriteButtonSmall({ mangaId, onClick }){
  const { user } = useAuth()
  const { isFavorite, loading, toggle } = useFavorite(mangaId)
  if (!user) return null
  const title = isFavorite ? 'เลิกชอบ' : 'เพิ่มในรายการโปรด'
  return (
    <button
      title={title}
      onClick={(e)=>{ e.stopPropagation(); if(onClick) onClick(e); toggle() }}
      style={{position:'absolute', top:8, right:8, zIndex:20, border:'none', background:'rgba(255,255,255,0.9)', padding:6, borderRadius:6, cursor:'pointer'}}
    >
      <span style={{color: isFavorite ? '#e0245e' : '#666'}}>{isFavorite ? '♥' : '♡'}</span>
    </button>
  )
}

// Larger favorite button (used in modal)
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

export default function Catalog(){
  const [mangas, setMangas] = useState([])
  const [topRated, setTopRated] = useState([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedManga, setSelectedManga] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const openManga = async (m) => {
    // show modal immediately with basic data, then fetch full record from Supabase
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

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      // Note: adjust table name to your actual table (e.g., 'Manga' or 'manga')
      const { data, error } = await supabase
        .from('Manga')
        .select('id, title, cover, tags, update')
        .limit(100)

      console.log('Supabase fetch:', { dataSample: (data || []).slice(0,5), error })

      if (!mounted) return
      if (error) {
        setError(error.message)
        setMangas([])
        setLoading(false)
        return
      }

      // Convert storage paths to public URLs when necessary
      const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'

      const normalizeItem = (item) => {
        let imageUrl = null
        if (item.cover) {
          if (/^https?:\/\//i.test(item.cover)) {
            imageUrl = item.cover
          } else {
            try {
              const publicData = supabase.storage.from(bucket).getPublicUrl(item.cover)
              imageUrl = publicData?.data?.publicUrl || null
            } catch (e) {
              imageUrl = null
            }
          }
        }

        let tagsArray = []
        if (item.tags) {
          if (Array.isArray(item.tags)) tagsArray = item.tags.map(t => String(t).trim()).filter(Boolean)
          else if (typeof item.tags === 'string') tagsArray = item.tags.split(',').map(s => s.trim()).filter(Boolean)
        }
        return { ...item, imageUrl, tags: tagsArray }
      }

      let normalized = (data || []).map(normalizeItem)
      // If records include a `created_at` timestamp, sort newest-first.
      // Otherwise reverse the incoming array so recently-added rows (likely at end) appear first.
      if (normalized.length > 0 && normalized[0].created_at !== undefined) {
        normalized.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      } else {
        normalized = normalized.slice().reverse()
      }
      setMangas(normalized)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  const { user } = useAuth()

  // fetch top-rated mangas (compute avg & votes from `rating` table)
  useEffect(()=>{
    let mounted = true
    async function fetchTopRated(){
      try{
        const { data: ratings, error: ratingsErr } = await supabase.from('rating').select('manga_id, rating')
        if (ratingsErr) { console.warn('ratings fetch err', ratingsErr); setTopRated([]); return }
        const map = {}
        ;(ratings || []).forEach(r => {
          const id = r.manga_id
          if (!id) return
          if (!map[id]) map[id] = { sum: 0, count: 0 }
          map[id].sum += Number(r.rating || 0)
          map[id].count += 1
        })
        const arr = Object.entries(map).map(([manga_id, v]) => ({ manga_id, avg: v.sum / v.count, votes: v.count }))
        arr.sort((a,b) => b.avg - a.avg || b.votes - a.votes)
        const top = arr.slice(0, 12)
        const ids = top.map(t => t.manga_id)
        if (ids.length === 0) { if (mounted) setTopRated([]); return }
        const { data: mangasData, error: mangasErr } = await supabase.from('Manga').select('id, title, cover, tags, update').in('id', ids)
        if (mangasErr) { console.warn('top manga fetch err', mangasErr); if (mounted) setTopRated([]); return }
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
        const byId = Object.fromEntries((mangasData||[]).map(normalizeItem).map(m=>[m.id,m]))
        const result = top.map(t => ({ ...(byId[t.manga_id] || {}), avg: t.avg, votes: t.votes }))
        if (mounted) setTopRated(result)
      }catch(e){ console.warn('fetchTopRated', e); if (mounted) setTopRated([]) }
    }
    fetchTopRated()
    return ()=>{ mounted = false }
  }, [mangas])

      // refs for each shelf container to control scrolling
      const shelfRefs = useRef({})

      // Build search URLs for external stores using the manga title (do not store links in DB)
      const buildStoreSearchUrl = (site, title) => {
        const q = encodeURIComponent(String(title || '').trim())
        switch ((site || '').toLowerCase()){
          case 'shopee':
            return `https://shopee.co.th/search?keyword=${q}`
          case 'lazada':
            return `https://www.lazada.co.th/catalog/?q=${q}`
          case 'yaakz':
            return `https://www.yaakz.com/search/?q=${q}`
          case 'naiin':
            return `https://www.naiin.com/search-result?title=${q}`
          case 'bookwalker':
            return `https://bookwalker.in.th/search/?word=${q}&order=relevance&page=1`
          default:
            return `https://www.google.com/search?q=${q}`
        }
      }

      // visible counts per shelf for "load more" (client-side)
      const [visibleCounts, setVisibleCounts] = useState({})
      const DEFAULT_VISIBLE = 20

      const handleLoadMore = (tag) => {
        // Attempt server-side fetch for this tag to get more items
        loadMoreFromServer(tag)
      }

      const handleShowLess = (tag) => {
        setVisibleCounts(prev => ({ ...prev, [tag]: DEFAULT_VISIBLE }))
      }

      // server-side load more for a tag: fetch additional items with that tag
      async function loadMoreFromServer(tag) {
        try {
          // count current items we already have for that tag
          const currentCount = mangas.filter(m => (m.tags || []).includes(tag)).length
          const from = currentCount
          const to = currentCount + DEFAULT_VISIBLE - 1

          // first try array contains (for text[] column)
          let res = await supabase
            .from('Manga')
            .select('id, title, cover, tags')
            .contains('tags', [tag])
            .range(from, to)

          // if no data and maybe tags stored as comma string, fallback to ilike
          if ((!res.data || res.data.length === 0) && (!res.error)) {
            res = await supabase
              .from('Manga')
              .select('id, title, cover, tags')
              .ilike('tags', `%${tag}%`)
              .range(from, to)
          }

          if (res.error) {
            console.warn('Error loading more for', tag, res.error)
            return
          }

          const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
          const newItems = (res.data || []).map(item => {
            // reuse normalize logic inline to avoid scope issues
            let imageUrl = null
            if (item.cover) {
              if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
              else {
                try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch(e) { imageUrl = null }
              }
            }
            let tagsArray = []
            if (item.tags) {
              if (Array.isArray(item.tags)) tagsArray = item.tags.map(t => String(t).trim()).filter(Boolean)
              else if (typeof item.tags === 'string') tagsArray = item.tags.split(',').map(s => s.trim()).filter(Boolean)
            }
            return { ...item, imageUrl, tags: tagsArray }
          })

          if (newItems.length === 0) {
            // nothing new; increase visible count client-side as a fallback
            setVisibleCounts(prev => ({ ...prev, [tag]: (prev[tag] || DEFAULT_VISIBLE) + DEFAULT_VISIBLE }))
            return
          }

          // merge new items, avoiding duplicates — place newly loaded items first
          setMangas(prev => {
            const existingIds = new Set(prev.map(p => p.id))
            const filteredNew = newItems.filter(it => !existingIds.has(it.id))
            if (filteredNew.length === 0) return prev
            // put newest-loaded items at the front so they appear left-most
            return [...filteredNew, ...prev]
          })

          // ensure visible count increases so user sees newly loaded items
          setVisibleCounts(prev => ({ ...prev, [tag]: (prev[tag] || DEFAULT_VISIBLE) + newItems.length }))
        } catch (e) {
          console.error('loadMoreFromServer error', e)
        }
      }

      const scrollShelf = useCallback((tag, direction) => {
        const el = shelfRefs.current[tag]
        if (!el) return
        // scroll amount: roughly two cards width
        const scrollAmount = el.clientWidth * 0.6 || 320
        el.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' })
      }, [])

      if (loading) return <div>Loading catalog...</div>
      if (error) return <div>Error: {error}</div>

      // Build shelves grouped by tag: primary first, then secondary
      const shelves = {}
      const tagOrder = []
      // when searching or tag filtering, we'll render a single results shelf instead of the usual tag shelves
      const isFiltering = Boolean(search && String(search).trim()) || Boolean(tagFilter)
      const sourceList = isFiltering
        ? mangas.filter(x => {
          const titleMatch = search ? String(x.title || '').toLowerCase().includes(search.toLowerCase()) : true
          const tagMatch = tagFilter ? (Array.isArray(x.tags) ? x.tags.includes(tagFilter) : String(x.tags || '').toLowerCase().includes(String(tagFilter).toLowerCase())) : true
          return titleMatch && tagMatch
        })
        : mangas
      sourceList.forEach(m => {
        (m.tags || []).forEach(tag => {
          if (!shelves[tag]) {
            shelves[tag] = { primary: [] }
            tagOrder.push(tag)
          }
          shelves[tag].primary.push(m)
        })
      })

      // Ensure within each shelf primary items come first (left) and secondary items are on the right.
      // Also sort within each group by created_at (newest first) when that field exists.
      Object.keys(shelves).forEach(tag => {
        const hasUpdate = (shelves[tag].primary || []).some(i => typeof i.update !== 'undefined')
        if (hasUpdate) {
          const sortByUpdate = (a, b) => new Date(b.update) - new Date(a.update)
          shelves[tag].primary = (shelves[tag].primary || []).slice().sort(sortByUpdate)
        } else {
          // keep insertion order but ensure arrays are shallow-copied to avoid mutation surprises
          shelves[tag].primary = (shelves[tag].primary || []).slice()
        }
      })

      // Sort tags alphabetically for consistent order, but keep 'Untagged' at the end
      const sortedTags = tagOrder.sort((a,b) => {
        if (a === 'Untagged') return 1
        if (b === 'Untagged') return -1
        return a.localeCompare(b)
      })

  // build a list of available tags for the filter dropdown
  const availableTags = Array.from(new Set(mangas.flatMap(m => (m.tags || [])))).filter(Boolean).sort((a,b)=>a.localeCompare(b))

  // determine which tags should be shown in the shelves area
  const visibleTags = (() => {
    if (isFiltering) {
      if (tagFilter) return [tagFilter].filter(t => !!shelves[t])
      // collect tags present in the filtered sourceList
      return Array.from(new Set(sourceList.flatMap(m => (m.tags || [])))).filter(Boolean).sort((a,b)=>a.localeCompare(b))
    }
    return sortedTags
  })()

  return (
    <div style={{padding:20}}>
      <h2>Bookshelves</h2>
      {/* Search bar */}
        <div className="mb-3 flex items-center gap-3">
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="ค้นหาชื่อมังงะ"
            className="px-3 py-2 rounded-lg border border-gray-200 w-96"
          />
          <select value={tagFilter} onChange={e=>setTagFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200">
            <option value="">ทั้งหมด</option>
            {availableTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="text-gray-500"></div>
        </div>
      {/* When not filtering, show Latest and Top Rated. If filtering, hide them and only show matching tag shelves below. */}
      { !isFiltering && (
        <>
          {/* Latest updates row */}
          <section className="mb-5">
            <h3 className="mt-1.5">อัพเดตล่าสุด</h3>
            <div className="flex gap-3 overflow-x-auto pt-2">
              {(() => {
                  const latest = mangas.slice().filter(m=>m.update).sort((a,b)=> new Date(b.update) - new Date(a.update)).slice(0,12)
                  if (latest.length === 0) return <div className="text-gray-500">ยังไม่มีการอัพเดต</div>
                  // Render larger uniform cards for the latest row (fixed width and consistent image height)
                  return latest.map(m => (
                    <div key={m.id} className="cursor-pointer" onClick={() => openManga(m)} style={{flex: '0 0 160px', width:160}}>
                      <div style={{width:'100%', height:240, overflow:'hidden', borderRadius:8, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        {m.imageUrl ? <img src={m.imageUrl} alt={m.title} style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}} /> : <div style={{width:'100%', height:'100%', background:'#f2f2f2'}} />}
                      </div>
                      <div className="text-sm mt-1.5 truncate" style={{height:32}}>{m.title}</div>
                      <div className="text-xs text-gray-600">{new Date(m.update).toLocaleDateString()}</div>
                    </div>
                  ))
              })()}
            </div>
          </section>
          {/* Top rated mangas */}
          <section className="mb-5">
            <h3 className="mt-1.5">มังงะที่มีคะแนนมากที่สุด</h3>
            <div className="flex gap-3 overflow-x-auto pt-2">
              {topRated.length === 0 ? <div className="text-gray-500">ยังไม่มีการให้คะแนน</div> : topRated.map(m => (
                <div key={m.id || m.manga_id} className="w-32 cursor-pointer" onClick={() => openManga(m)}>
                  {m.imageUrl ? <img src={m.imageUrl} alt={m.title} className="w-full h-44 object-cover rounded-md" /> : <div className="w-full h-44 bg-gray-200 rounded-md" />}
                  <div className="text-sm mt-1.5 truncate">{m.title}</div>
                  <div className="text-xs text-gray-600">{m.avg ? `Avg ${Number(m.avg).toFixed(1)}` : ''} {m.votes ? `(${m.votes})` : ''}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      {sortedTags.length === 0 && <div>No tags found.</div>}
      {sortedTags.map(tag => {
        const items = (shelves[tag].primary || [])
        return (
          <section key={tag} style={{marginBottom:28, position:'relative', overflow:'hidden'}}>
            <h3 style={{margin:0, marginBottom:8}}>{tag}</h3>

            {/* left button */}
            <button
              aria-label={`Scroll ${tag} left`}
              onClick={() => scrollShelf(tag, -1)}
              style={{
                position:'absolute',
                left:0,
                top:'50%',
                transform:'translateY(-50%)',
                zIndex:10,
                border:'none',
                background:'rgba(0,0,0,0.45)',
                color:'#fff',
                width:36,
                height:'60%',
                display: items.length ? 'flex' : 'none',
                alignItems:'center',
                justifyContent:'center',
                cursor:'pointer',
                borderRadius:4
              }}
            >
              ‹
            </button>

            <div
              ref={el => (shelfRefs.current[tag] = el)}
              className="flex gap-3 overflow-x-auto pb-1 pl-11 pr-11 items-start"
            >
              {(items.slice(0, visibleCounts[tag] || DEFAULT_VISIBLE)).map(m => (
                <div key={m.id} onClick={() => openManga(m)} className="flex-0 flex-col min-w-[200px] border border-gray-200 p-2 rounded-md bg-white box-border cursor-pointer relative" role="button" tabIndex={0} aria-label={`Open ${m.title}`}>
                  {m.imageUrl ? (
                    <div className="w-full h-48 bg-white rounded-md overflow-hidden flex items-center justify-center">
                      <img src={m.imageUrl} alt={m.title} className="block w-full h-full object-contain rounded"/>
                    </div>
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center rounded">No cover</div>
                  )}
                  <div className="mt-2 font-semibold text-sm leading-tight truncate min-h-[2.4em]">{m.title}</div>
                  {/* Favorite button overlay */}
                  <FavoriteButtonSmall mangaId={m.id} onClick={(e)=>{ e.stopPropagation(); }} />
                </div>
              ))}
            </div>

            {/* Load more / Show less controls */}
            <div style={{marginTop:8, paddingLeft:44, paddingRight:44}}>
              {items.length > (visibleCounts[tag] || DEFAULT_VISIBLE) ? (
                <button onClick={() => handleLoadMore(tag)} style={{padding:'6px 10px', borderRadius:6, border:'1px solid #ccc', background:'#fafafa', cursor:'pointer'}}>ดูเพิ่มเติม</button>
              ) : (items.length > DEFAULT_VISIBLE ? (
                <button onClick={() => handleShowLess(tag)} style={{padding:'6px 10px', borderRadius:6, border:'1px solid #ccc', background:'#fff', cursor:'pointer'}}>ย่อ</button>
              ) : null)}
            </div>

            {/* right button */}
            <button
              aria-label={`Scroll ${tag} right`}
              onClick={() => scrollShelf(tag, 1)}
              style={{
                position:'absolute',
                right:0,
                top:'50%',
                transform:'translateY(-50%)',
                zIndex:10,
                border:'none',
                background:'rgba(0,0,0,0.66)',
                color:'#fff',
                width:36,
                height:'60%',
                display: items.length ? 'flex' : 'none',
                alignItems:'center',
                justifyContent:'center',
                cursor:'pointer',
                borderRadius:4
              }}
            >
              ›
            </button>
          </section>
        )
      })}
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

                        {/* External store search links (generated on the fly, not stored) */}
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

                      {/* show common fields with nice labels first */}
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

                      {/* show status + update next (status first, then update), then remaining fields like Random page */}
                      <div style={{marginTop:10}}>
                        {(() => {
                          const excluded = new Set(['imageUrl','id','cover','tags','title','_loading','description','author','publisher','volume','avg','votes'])
                          const entries = Object.entries(selectedManga).filter(([k]) => !excluded.has(k))
                          // place status first, update second if present
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
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {showAddForm && selectedManga && <AddToListForm mangaId={selectedManga.id} onClose={()=>setShowAddForm(false)} onAdded={()=>{ setShowAddForm(false); }} />}
    </div>
  )
}
