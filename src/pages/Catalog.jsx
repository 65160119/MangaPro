import React, { useEffect, useState, useRef, useCallback } from 'react'
import supabase from '../lib/supabaseClient'

export default function Catalog(){
  const [mangas, setMangas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedManga, setSelectedManga] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

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
        .select('id, title, cover, tags')
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

      // refs for each shelf container to control scrolling
      const shelfRefs = useRef({})

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
      mangas.forEach(m => {
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
        const hasUpdatedAt = (shelves[tag].primary || []).some(i => typeof i.updated_at !== 'undefined')
        if (hasUpdatedAt) {
          const sortByUpdated = (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
          shelves[tag].primary = (shelves[tag].primary || []).slice().sort(sortByUpdated)
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

  return (
    <div style={{padding:20}}>
      <h2>Bookshelves</h2>
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
              className="shelf-container"
            >
              {(items.slice(0, visibleCounts[tag] || DEFAULT_VISIBLE)).map(m => (
                <div key={m.id} className="shelf-card" onClick={() => openManga(m)} style={{cursor:'pointer'}} role="button" tabIndex={0} aria-label={`Open ${m.title}`}>
                  {m.imageUrl ? (
                    <div className="shelf-thumb">
                      <img src={m.imageUrl} alt={m.title} className="shelf-img"/>
                    </div>
                  ) : (
                    <div style={{width:'100%', aspectRatio:'2/3', background:'#eee', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:4}}>No cover</div>
                  )}
                  <div className="shelf-title">{m.title}</div>
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
                    <div style={{color:'#666', marginTop:6}}>{(selectedManga.tags||[]).join(', ') || 'Untagged'}</div>
                  </div>
                  <button onClick={()=>setSelectedManga(null)} style={{border:'none', background:'transparent', fontSize:20, cursor:'pointer'}}>✕</button>
                </div>
                <div style={{marginTop:12, color:'#333'}}>
                  {selectedManga._loading ? (
                    <div>กำลังโหลดข้อมูล...</div>
                  ) : (
                    <div>
                      <div style={{marginBottom:8}}>
                        <div style={{marginTop:6, fontSize:14, lineHeight:1.45}}>{selectedManga.description || 'ไม่มีข้อมูลคำอธิบาย'}</div>
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
                        {selectedManga.status && (
                          <div style={{marginBottom:6}}><strong>Status:</strong> <span style={{color:'#333'}}>{selectedManga.status}</span></div>
                        )}
                        {selectedManga.updated_at && (
                          <div style={{marginBottom:6}}><strong>Update:</strong> <span style={{color:'#333'}}>{String(selectedManga.updated_at)}</span></div>
                        )}
                      </div>

                      {/* show any remaining fields */}
                      <div style={{marginTop:10}}>
                        {Object.entries(selectedManga).filter(([k]) => !['imageUrl','id','cover','tags','title','_loading','description','author','publisher','volume','status','updated_at'].includes(k)).map(([k,v]) => (
                          <div key={k} style={{marginBottom:8}}>
                            <strong style={{textTransform:'capitalize'}}>{k.replace(/_/g,' ')}:</strong>
                            <div style={{color:'#333'}}>{Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : String(v))}</div>
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
