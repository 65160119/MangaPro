import React, { useEffect, useState, useRef, useCallback } from 'react'
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
        const primaryTag = tagsArray.length > 0 ? tagsArray[0] : 'Untagged'

        return { ...item, imageUrl, tags: tagsArray, primaryTag }
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
            const primaryTag = tagsArray.length > 0 ? tagsArray[0] : 'Untagged'
            return { ...item, imageUrl, tags: tagsArray, primaryTag }
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
            shelves[tag] = { primary: [], secondary: [] }
            tagOrder.push(tag)
          }
          if (tag === m.primaryTag) shelves[tag].primary.push(m)
          else shelves[tag].secondary.push(m)
        })
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
        const items = [...(shelves[tag].primary || []), ...(shelves[tag].secondary || [])]
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
                <div key={m.id} className="shelf-card">
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
    </div>
  )
}
