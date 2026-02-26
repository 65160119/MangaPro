import React, { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import useFavorite from '../lib/favorites'
import RatingStars from '../components/RatingStars'
import AddToListForm from '../components/AddToListForm'
import { useAuth } from '../context/Auth'

/* ─── Owlbook Design Tokens (injected as a style tag) ─── */
const OwlbookStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

    :root {
      --owl-bg:          #110b22;
      --owl-bg-2:        #16102c;
      --owl-surface:     #1f1438;
      --owl-surface-2:   #281a48;
      --owl-border:      #3a2468;
      --owl-purple-50:   #3a2468;
      --owl-purple-100:  #4a2e80;
      --owl-purple-200:  #6644b0;
      --owl-purple-400:  #aa84ee;
      --owl-purple-500:  #bea0f8;
      --owl-purple-600:  #cfb8ff;
      --owl-purple-700:  #e8d8ff;
      --owl-text:        #f0eaff;
      --owl-text-sub:    #b89af0;
      --owl-text-faint:  #6a4e98;
      --owl-accent:      #c084fc;
      --owl-tag-bg:      #32206a;
      --owl-tag-text:    #d4b8ff;
      --owl-gold:        #f4c842;
      --owl-red:         #f07080;
      --owl-shadow:      0 2px 20px rgba(0,0,0,0.55);
      --owl-shadow-lg:   0 8px 48px rgba(0,0,0,0.72);
    }

    .owl-catalog * { font-family: 'DM Sans', sans-serif; color: var(--owl-text); box-sizing: border-box; }
    .owl-catalog { background: var(--owl-bg); min-height: 100vh; padding: 24px 36px; }

    /* ── Title ── */
    .owl-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
    .owl-brand-logo { font-family: 'DM Serif Display', serif; font-size: 2rem; color: var(--owl-purple-600); letter-spacing: -0.5px; }
    .owl-brand-logo span { font-style: italic; color: var(--owl-accent); }

    /* ── Search bar ── */
    .owl-search-row { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; flex-wrap: wrap; }
    .owl-input {
      padding: 10px 16px; border-radius: 12px;
      border: 1.5px solid var(--owl-border); background: var(--owl-surface);
      font-size: 14px; color: var(--owl-text); outline: none; transition: border 0.2s, box-shadow 0.2s;
      min-width: 260px;
    }
    .owl-input:focus { border-color: var(--owl-accent); box-shadow: 0 0 0 3px rgba(192,132,252,0.18); }
    .owl-input::placeholder { color: var(--owl-text-faint); }
    .owl-select {
      padding: 10px 14px; border-radius: 12px;
      border: 1.5px solid var(--owl-border); background: var(--owl-surface);
      font-size: 14px; color: var(--owl-text); outline: none; cursor: pointer;
      appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23c084fc' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
      transition: border 0.2s;
    }
    .owl-select:focus { border-color: var(--owl-accent); }
    .owl-select option { background: #2a1a46; color: var(--owl-text); }

    /* ── Section headings ── */
    .owl-section { margin-bottom: 36px; position: relative; overflow: hidden; }
    .owl-section-title {
      font-family: 'DM Serif Display', serif; font-size: 1.35rem;
      color: var(--owl-purple-700); margin: 0 0 14px 0; display: flex; align-items: center; gap: 8px;
    }
    .owl-section-title::before {
      content: ''; display: inline-block; width: 4px; height: 20px;
      border-radius: 4px; background: linear-gradient(to bottom, var(--owl-accent), var(--owl-purple-500));
    }

    /* ── Shelf scroll ── */
    .owl-shelf { display: flex; gap: 14px; overflow-x: auto; padding: 4px 48px 12px; align-items: flex-start; scroll-snap-type: x mandatory; }
    .owl-shelf::-webkit-scrollbar { height: 4px; }
    .owl-shelf::-webkit-scrollbar-track { background: var(--owl-surface-2); border-radius: 4px; }
    .owl-shelf::-webkit-scrollbar-thumb { background: var(--owl-purple-200); border-radius: 4px; }

    /* ── Manga card ── */
    .owl-card {
      flex: 0 0 156px; background: var(--owl-surface); border-radius: 12px;
      border: 1.5px solid var(--owl-border); overflow: hidden; cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      position: relative; scroll-snap-align: start;
    }
    .owl-card:hover { transform: translateY(-5px); box-shadow: 0 12px 36px rgba(0,0,0,0.6); border-color: var(--owl-accent); }
    .owl-card-img { width: 100%; height: 200px; object-fit: cover; display: block; background: var(--owl-surface-2); }
    .owl-card-img-placeholder { width: 100%; height: 200px; background: var(--owl-surface-2); display: flex; align-items: center; justify-content: center; color: var(--owl-text-faint); font-size: 13px; }
    .owl-card-body { padding: 8px 10px 10px; background: var(--owl-surface); }
    .owl-card-title { font-size: 12.5px; font-weight: 600; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.7em; color: var(--owl-text); }

    /* ── Latest card (wider) ── */
    .owl-latest-card { flex: 0 0 148px; cursor: pointer; transition: transform 0.2s; scroll-snap-align: start; }
    .owl-latest-card:hover { transform: translateY(-3px); }
    .owl-latest-img { width: 100%; height: 210px; object-fit: cover; border-radius: 10px; display: block; background: var(--owl-surface-2); }
    .owl-latest-title { font-size: 12.5px; font-weight: 600; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .owl-latest-date { font-size: 11px; color: var(--owl-text-sub); margin-top: 2px; }

    /* ── Scroll buttons ── */
    .owl-scroll-btn {
      position: absolute; top: 50%; transform: translateY(-50%);
      z-index: 10; border: none; background: rgba(42,26,70,0.92);
      box-shadow: 0 2px 12px rgba(0,0,0,0.5);
      color: var(--owl-accent); width: 34px; height: 64px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; border-radius: 8px; font-size: 18px;
      border: 1px solid var(--owl-border);
      transition: background 0.15s, color 0.15s;
    }
    .owl-scroll-btn:hover { background: var(--owl-accent); color: #1a0f2e; }
    .owl-scroll-btn.left { left: 4px; }
    .owl-scroll-btn.right { right: 4px; }

    /* ── Tag pill ── */
    .owl-tag { display: inline-block; padding: 3px 9px; border-radius: 20px; background: var(--owl-tag-bg); color: var(--owl-tag-text); font-size: 11.5px; font-weight: 500; margin-right: 4px; margin-bottom: 4px; }

    /* ── Fav button small ── */
    .owl-fav-sm {
      position: absolute; top: 8px; right: 8px; z-index: 20;
      border: none; background: rgba(255,255,255,0.92); padding: 5px 7px;
      border-radius: 8px; cursor: pointer; font-size: 15px; line-height: 1;
      box-shadow: 0 1px 4px rgba(0,0,0,0.12); transition: transform 0.15s;
    }
    .owl-fav-sm:hover { transform: scale(1.2); }

    /* ── Load more ── */
    .owl-loadmore { display: inline-block; margin-top: 8px; margin-left: 48px; padding: 6px 14px; border-radius: 20px; border: 1.5px solid var(--owl-border); background: var(--owl-surface); color: var(--owl-purple-600); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
    .owl-loadmore:hover { background: var(--owl-purple-100); border-color: var(--owl-purple-300, #c084fc); }

    /* ── Modal overlay ── */
    .owl-overlay { position: fixed; inset: 0; background: rgba(30,10,60,0.55); display: flex; align-items: center; justify-content: center; z-index: 60; backdrop-filter: blur(3px); }
    .owl-modal {
      width: 920px; max-width: 96vw; max-height: 92vh; overflow-y: auto;
      background: var(--owl-surface); border-radius: 18px; padding: 28px;
      box-shadow: var(--owl-shadow-lg); border: 1.5px solid var(--owl-border);
    }
    .owl-modal::-webkit-scrollbar { width: 6px; }
    .owl-modal::-webkit-scrollbar-thumb { background: var(--owl-purple-200); border-radius: 3px; }

    /* ── Modal header ── */
    .owl-modal-title { font-family: 'DM Serif Display', serif; font-size: 1.6rem; color: var(--owl-purple-700); margin: 0 0 4px; line-height: 1.25; }
    .owl-close-btn { border: none; background: var(--owl-surface-2); color: var(--owl-text-sub); width: 34px; height: 34px; border-radius: 10px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
    .owl-close-btn:hover { background: var(--owl-purple-100); color: var(--owl-purple-600); }

    /* ── Modal action buttons ── */
    .owl-btn { padding: 7px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1.5px solid transparent; }
    .owl-btn-add { background: var(--owl-purple-50); border-color: var(--owl-purple-200); color: var(--owl-purple-700); }
    .owl-btn-add:hover { background: var(--owl-purple-100); }
    .owl-btn-fav { background: #fff0f5; border-color: #fdb0c8; color: var(--owl-red); }
    .owl-btn-fav:hover { background: #ffe0ec; }
    .owl-btn-fav.active { background: #ffe0ec; }

    /* ── Detail tabs ── */
    .owl-tabs { display: flex; gap: 4px; margin: 16px 0 12px; border-bottom: 2px solid var(--owl-border); }
    .owl-tab { padding: 8px 16px; font-size: 13.5px; font-weight: 500; cursor: pointer; border: none; background: transparent; color: var(--owl-text-sub); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s; }
    .owl-tab.active { color: var(--owl-purple-600); border-bottom-color: var(--owl-purple-500); }
    .owl-tab:hover:not(.active) { color: var(--owl-purple-400); }

    /* ── Store links ── */
    .owl-store-link {
      padding: 6px 13px; border-radius: 8px; text-decoration: none; font-size: 12.5px;
      font-weight: 600; color: #fff; transition: opacity 0.15s, transform 0.15s;
    }
    .owl-store-link:hover { opacity: 0.88; transform: translateY(-1px); }

    /* ── Progress bars ── */
    .owl-progress-label { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
    .owl-progress-bar-bg { height: 12px; background: var(--owl-surface-2); border-radius: 6px; overflow: hidden; }
    .owl-progress-bar-fill { height: 100%; border-radius: 6px; transition: width 0.4s ease; }
    .owl-progress-row { margin-bottom: 14px; cursor: default; }
    .owl-progress-row.clickable { cursor: pointer; }
    .owl-progress-row.clickable:hover .owl-progress-bar-fill { filter: brightness(1.1); }

    /* ── Sub-modal (fav users) ── */
    .owl-sub-overlay { position: fixed; inset: 0; background: rgba(30,10,60,0.4); display: flex; align-items: center; justify-content: center; z-index: 70; }
    .owl-sub-modal { width: 340px; max-width: 92vw; background: var(--owl-surface); border-radius: 14px; padding: 18px; box-shadow: var(--owl-shadow-lg); }

    /* ── Rating row ── */
    .owl-rating-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }

    /* ── Top rated card (small) ── */
    .owl-top-card { flex: 0 0 128px; cursor: pointer; scroll-snap-align: start; transition: transform 0.2s; }
    .owl-top-card:hover { transform: translateY(-3px); }
    .owl-top-img { width: 100%; height: 172px; object-fit: cover; border-radius: 10px; display: block; background: var(--owl-surface-2); }
    .owl-top-title { font-size: 12px; font-weight: 600; margin-top: 5px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .owl-top-score { font-size: 11px; color: var(--owl-gold); font-weight: 600; margin-top: 2px; }

    /* ── Divider ── */
    .owl-divider { border: none; border-top: 1.5px solid var(--owl-border); margin: 8px 0 20px; }

    /* ── Field key/value in modal ── */
    .owl-field-key { font-size: 12px; font-weight: 600; color: var(--owl-text-sub); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
    .owl-field-val { font-size: 14px; color: var(--owl-text); margin-bottom: 12px; line-height: 1.5; }

    /* ── Loading state ── */
    .owl-loading { color: var(--owl-text-sub); font-size: 14px; padding: 40px; text-align: center; }
    @keyframes owl-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .owl-loading { animation: owl-pulse 1.5s infinite; }
  `}</style>
)

/* ─────────────────────────── Favorite buttons ─────────────────────────── */
function FavoriteButtonSmall({ mangaId, onClick }) {
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorite(mangaId)
  if (!user) return null
  return (
    <button
      title={isFavorite ? 'เลิกชอบ' : 'เพิ่มในรายการโปรด'}
      onClick={(e) => { e.stopPropagation(); if (onClick) onClick(e); toggle() }}
      className="owl-fav-sm"
    >
      <span style={{ color: isFavorite ? '#e0245e' : '#bbb' }}>{isFavorite ? '♥' : '♡'}</span>
    </button>
  )
}

function FavoriteButtonLarge({ mangaId }) {
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorite(mangaId)
  if (!user) return null
  return (
    <button
      onClick={async (e) => { e.stopPropagation(); if (!user) return alert('โปรดล็อกอินก่อน'); await toggle() }}
      className={`owl-btn owl-btn-fav${isFavorite ? ' active' : ''}`}
    >
      {isFavorite ? '♥ เลิกชอบ' : '♡ เพิ่มในรายการโปรด'}
    </button>
  )
}

/* ─────────────────────────── Main Catalog ─────────────────────────── */
export default function Catalog() {
  const [mangas, setMangas] = useState([])
  const [topRated, setTopRated] = useState([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedManga, setSelectedManga] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [detailTab, setDetailTab] = useState('details')
  const [progressStats, setProgressStats] = useState(null)
  const [favUsers, setFavUsers] = useState([])
  const [favModalOpen, setFavModalOpen] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [favCount, setFavCount] = useState(0)

  const { user } = useAuth()

  /* ── open manga modal ── */
  const openManga = async (m) => {
    setSelectedManga({ ...m, _loading: true })
    setDetailTab('details')
    setProgressStats(null)
    setFavCount(0)
    setFavUsers([])
    setFavModalOpen(false)
    setDetailLoading(true)
    try {
      const { data, error } = await supabase.from('Manga').select('*').eq('id', m.id).single()
      if (!error && data) {
        const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
        let imageUrl = m.imageUrl || null
        if (!imageUrl && data.cover) {
          if (/^https?:\/\//i.test(data.cover)) imageUrl = data.cover
          else { try { imageUrl = supabase.storage.from(bucket).getPublicUrl(data.cover)?.data?.publicUrl || null } catch (e) { imageUrl = null } }
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
      setSelectedManga({ ...m, _loading: false })
    } finally {
      setDetailLoading(false)
    }
  }

  /* ── fetch stats ── */
  const fetchStats = async (mangaId) => {
    if (!mangaId) return
    setStatsLoading(true)
    try {
      const { data: listRows, error: listErr } = await supabase.from('user_manga_list').select('user_id, status').eq('manga_id', mangaId)
      if (listErr) throw listErr
      const counts = { plan: 0, reading: 0, completed: 0, dropped: 0, other: 0 }
      const mapStatus = (s) => {
        const v = String(s || '').toLowerCase()
        if (!v) return 'plan'
        if (v.includes('plan')) return 'plan'
        if (v.includes('read') || v.includes('progress')) return 'reading'
        if (v.includes('complete') || v.includes('finish') || v.includes('จบ')) return 'completed'
        if (v.includes('drop')) return 'dropped'
        return 'other'
      }
      ;(listRows || []).forEach(r => { const k = mapStatus(r.status); counts[k] = (counts[k] || 0) + 1 })
      const totalAdded = (listRows || []).length
      const { data: favRows, error: favErr } = await supabase.from('User_Favorite').select('user_id').eq('manga_id', mangaId)
      if (favErr) throw favErr
      const favCnt = (favRows || []).length
      let favUsernames = []
      if (favCnt > 0) {
        const ids = favRows.map(r => r.user_id).filter(Boolean)
        if (ids.length > 0) {
          const { data: profilesData, error: profilesErr } = await supabase.from('Profiles').select('id, user_name').in('id', ids)
          if (!profilesErr && profilesData) {
            const profilesMap = Object.fromEntries(profilesData.map(r => [r.id, r.user_name]))
            favUsernames = ids.map(id => profilesMap[id] ?? String(id))
          } else { favUsernames = ids.map(id => String(id)) }
        }
      }
      setProgressStats({ mangaId, counts, totalAdded })
      setFavCount(favCnt)
      setFavUsers(favUsernames)
    } catch (e) {
      setProgressStats({ counts: { plan: 0, reading: 0, completed: 0, dropped: 0 }, totalAdded: 0 })
      setFavCount(0); setFavUsers([])
    } finally { setStatsLoading(false) }
  }

  /* ── load catalog ── */
  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('Manga').select('id, title, cover, tags, update').limit(100)
      if (!mounted) return
      if (error) { setError(error.message); setMangas([]); setLoading(false); return }
      const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
      const normalizeItem = (item) => {
        let imageUrl = null
        if (item.cover) {
          if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
          else { try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch (e) { imageUrl = null } }
        }
        let tagsArray = []
        if (item.tags) {
          if (Array.isArray(item.tags)) tagsArray = item.tags.map(t => String(t).trim()).filter(Boolean)
          else if (typeof item.tags === 'string') tagsArray = item.tags.split(',').map(s => s.trim()).filter(Boolean)
        }
        return { ...item, imageUrl, tags: tagsArray }
      }
      let normalized = (data || []).map(normalizeItem)
      if (normalized.length > 0 && normalized[0].created_at !== undefined) normalized.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      else normalized = normalized.slice().reverse()
      setMangas(normalized)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  /* ── top rated ── */
  useEffect(() => {
    let mounted = true
    async function fetchTopRated() {
      try {
        const { data: ratings, error: ratingsErr } = await supabase.from('rating').select('manga_id, rating')
        if (ratingsErr) { setTopRated([]); return }
        const map = {}
        ;(ratings || []).forEach(r => {
          const id = r.manga_id; if (!id) return
          if (!map[id]) map[id] = { sum: 0, count: 0 }
          map[id].sum += Number(r.rating || 0); map[id].count += 1
        })
        const arr = Object.entries(map).map(([manga_id, v]) => ({ manga_id, avg: v.sum / v.count, votes: v.count }))
        arr.sort((a, b) => b.avg - a.avg || b.votes - a.votes)
        const top = arr.slice(0, 12)
        const ids = top.map(t => t.manga_id)
        if (ids.length === 0) { if (mounted) setTopRated([]); return }
        const { data: mangasData, error: mangasErr } = await supabase.from('Manga').select('id, title, cover, tags, update').in('id', ids)
        if (mangasErr) { if (mounted) setTopRated([]); return }
        const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
        const normalizeItem = (item) => {
          let imageUrl = null
          if (item.cover) {
            if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
            else { try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch (e) { imageUrl = null } }
          }
          let tagsArray = []
          if (item.tags) {
            if (Array.isArray(item.tags)) tagsArray = item.tags.map(t => String(t).trim()).filter(Boolean)
            else if (typeof item.tags === 'string') tagsArray = item.tags.split(',').map(s => s.trim()).filter(Boolean)
          }
          return { ...item, imageUrl, tags: tagsArray }
        }
        const byId = Object.fromEntries((mangasData || []).map(normalizeItem).map(m => [m.id, m]))
        const result = top.map(t => ({ ...(byId[t.manga_id] || {}), avg: t.avg, votes: t.votes }))
        if (mounted) setTopRated(result)
      } catch (e) { if (mounted) setTopRated([]) }
    }
    fetchTopRated()
    return () => { mounted = false }
  }, [mangas])

  /* ── store search ── */
  const buildStoreSearchUrl = (site, title) => {
    const q = encodeURIComponent(String(title || '').trim())
    switch ((site || '').toLowerCase()) {
      case 'shopee': return `https://shopee.co.th/search?keyword=${q}`
      case 'lazada': return `https://www.lazada.co.th/catalog/?q=${q}`
      case 'yaakz': return `https://www.yaakz.com/search/?q=${q}`
      case 'naiin': return `https://www.naiin.com/search-result?title=${q}`
      case 'bookwalker': return `https://bookwalker.in.th/search/?word=${q}&order=relevance&page=1`
      default: return `https://www.google.com/search?q=${q}`
    }
  }

  if (loading) return (
    <div className="owl-catalog">
      <OwlbookStyles />
      <div className="owl-loading">กำลังโหลดคลังมังงะ…</div>
    </div>
  )
  if (error) return (
    <div className="owl-catalog">
      <OwlbookStyles />
      <div style={{ color: '#e05e6d', padding: 40 }}>Error: {error}</div>
    </div>
  )

  /* ── build shelves ── */
  const isFiltering = Boolean(search && String(search).trim()) || Boolean(tagFilter)
  const sourceList = isFiltering
    ? mangas.filter(x => {
      const titleMatch = search ? String(x.title || '').toLowerCase().includes(search.toLowerCase()) : true
      const tagMatch = tagFilter ? (Array.isArray(x.tags) ? x.tags.includes(tagFilter) : String(x.tags || '').toLowerCase().includes(String(tagFilter).toLowerCase())) : true
      return titleMatch && tagMatch
    })
    : mangas

  const shelves = {}; const tagOrder = []
  sourceList.forEach(m => {
    (m.tags || []).forEach(tag => {
      if (!shelves[tag]) { shelves[tag] = { primary: [] }; tagOrder.push(tag) }
      shelves[tag].primary.push(m)
    })
  })
  Object.keys(shelves).forEach(tag => {
    const hasUpdate = (shelves[tag].primary || []).some(i => typeof i.update !== 'undefined')
    if (hasUpdate) shelves[tag].primary = shelves[tag].primary.slice().sort((a, b) => new Date(b.update) - new Date(a.update))
    else shelves[tag].primary = shelves[tag].primary.slice()
  })
  const sortedTags = tagOrder.sort((a, b) => {
    if (a === 'Untagged') return 1; if (b === 'Untagged') return -1; return a.localeCompare(b)
  })
  const availableTags = Array.from(new Set(mangas.flatMap(m => (m.tags || [])))).filter(Boolean).sort((a, b) => a.localeCompare(b))
  const visibleTags = (() => {
    if (isFiltering) {
      if (tagFilter) return [tagFilter].filter(t => !!shelves[t])
      return Array.from(new Set(sourceList.flatMap(m => (m.tags || [])))).filter(Boolean).sort((a, b) => a.localeCompare(b))
    }
    return sortedTags
  })()

  /* ── progress bar data ── */
  const PROGRESS_BARS = [
    { key: 'plan', label: 'Plan to Read', color: '#a07ae0' },
    { key: 'reading', label: 'Reading', color: '#3B82F6' },
    { key: 'completed', label: 'Completed', color: '#10B981' },
    { key: 'dropped', label: 'Dropped', color: '#EF4444' },
  ]

  const STORES = [
    { key: 'shopee', label: 'Shopee', color: '#ff6d00' },
    { key: 'lazada', label: 'Lazada', color: '#0f146d' },
    { key: 'yaakz', label: 'Yaakz', color: '#0b73b7' },
    { key: 'naiin', label: 'นายอินทร์', color: '#1a5eab' },
    { key: 'bookwalker', label: 'BookWalker', color: '#2b2b2b' },
  ]

  return (
    <div className="owl-catalog">
      <OwlbookStyles />

      {/* Search row */}
      <div className="owl-search-row">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  ค้นหาชื่อมังงะ…"
          className="owl-input"
        />
        <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="owl-select">
          <option value="">ทุกหมวดหมู่</option>
          {availableTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {isFiltering && (
          <button
            onClick={() => { setSearch(''); setTagFilter('') }}
            style={{ padding: '9px 14px', borderRadius: 12, border: '1.5px solid var(--owl-border)', background: 'var(--owl-surface)', color: 'var(--owl-text-sub)', fontSize: 13, cursor: 'pointer' }}
          >
            ✕ ล้าง
          </button>
        )}
      </div>

      {/* Latest + Top Rated (hidden while filtering) */}
      {!isFiltering && (
        <>
          <section className="owl-section">
            <h3 className="owl-section-title">อัพเดตล่าสุด</h3>
            <div className="owl-shelf">
              {(() => {
                const latest = mangas.slice().filter(m => m.update).sort((a, b) => new Date(b.update) - new Date(a.update)).slice(0, 12)
                if (latest.length === 0) return <div style={{ color: 'var(--owl-text-faint)', fontSize: 14 }}>ยังไม่มีการอัพเดต</div>
                return latest.map(m => (
                  <div key={m.id} className="owl-latest-card" onClick={() => openManga(m)}>
                    {m.imageUrl
                      ? <img src={m.imageUrl} alt={m.title} className="owl-latest-img" />
                      : <div className="owl-latest-img" style={{ background: 'var(--owl-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--owl-text-faint)', fontSize: 12 }}>No cover</div>
                    }
                    <div className="owl-latest-title">{m.title}</div>
                    <div className="owl-latest-date">{new Date(m.update).toLocaleDateString('th-TH')}</div>
                  </div>
                ))
              })()}
            </div>
          </section>

          <hr className="owl-divider" />

          <section className="owl-section">
            <h3 className="owl-section-title">มังงะยอดนิยม ⭐</h3>
            <div className="owl-shelf">
              {topRated.length === 0
                ? <div style={{ color: 'var(--owl-text-faint)', fontSize: 14 }}>ยังไม่มีการให้คะแนน</div>
                : topRated.map(m => (
                  <div key={m.id || m.manga_id} className="owl-top-card" onClick={() => openManga(m)}>
                    {m.imageUrl
                      ? <img src={m.imageUrl} alt={m.title} className="owl-top-img" />
                      : <div className="owl-top-img" style={{ background: 'var(--owl-surface-2)' }} />
                    }
                    <div className="owl-top-title">{m.title}</div>
                    <div className="owl-top-score">★ {m.avg ? Number(m.avg).toFixed(1) : '–'} {m.votes ? `(${m.votes})` : ''}</div>
                  </div>
                ))
              }
            </div>
          </section>

          <hr className="owl-divider" />
        </>
      )}

      {/* Tag shelves */}
      {sortedTags.length === 0 && (
        <div style={{ color: 'var(--owl-text-faint)', fontSize: 14, padding: '20px 0' }}>ไม่พบรายการ</div>
      )}

      {visibleTags.map(tag => {
        if (!shelves[tag]) return null
        const items = shelves[tag].primary || []
        return (
          <section key={tag} className="owl-section">
            <h3 className="owl-section-title">{tag}</h3>
            <div className="owl-shelf">
              {items.map(m => (
                <div key={m.id} className="owl-card" onClick={() => openManga(m)} role="button" tabIndex={0} aria-label={`Open ${m.title}`}>
                  {m.imageUrl
                    ? <img src={m.imageUrl} alt={m.title} className="owl-card-img" />
                    : <div className="owl-card-img-placeholder">No cover</div>
                  }
                  <div className="owl-card-body">
                    <div className="owl-card-title">{m.title}</div>
                  </div>
                  <FavoriteButtonSmall mangaId={m.id} onClick={e => e.stopPropagation()} />
                </div>
              ))}
            </div>

          </section>
        )
      })}

      {/* ── Manga detail modal ── */}
      {selectedManga && (
        <div className="owl-overlay" onClick={() => setSelectedManga(null)}>
          <div className="owl-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 24 }}>
              {/* Cover */}
              <div style={{ flexShrink: 0, width: 240 }}>
                {selectedManga.imageUrl
                  ? <img src={selectedManga.imageUrl} alt={selectedManga.title} style={{ width: '100%', height: 340, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
                  : <div style={{ width: '100%', height: 340, borderRadius: 12, background: 'var(--owl-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--owl-text-faint)' }}>No cover</div>
                }
                {/* Tags under cover */}
                <div style={{ marginTop: 12 }}>
                  {(selectedManga.tags || []).map(t => <span key={t} className="owl-tag">{t}</span>)}
                  {!(selectedManga.tags || []).length && <span className="owl-tag" style={{ background: 'var(--owl-surface-2)', color: 'var(--owl-text-faint)' }}>Untagged</span>}
                </div>
              </div>

              {/* Right pane */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Title row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <h2 className="owl-modal-title">{selectedManga.title}</h2>
                  <button className="owl-close-btn" onClick={() => setSelectedManga(null)}>✕</button>
                </div>

                {/* Rating */}
                <div className="owl-rating-row">
                  <RatingStars mangaId={selectedManga.id} />
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <button className="owl-btn owl-btn-add" onClick={e => { e.stopPropagation(); if (!user) return alert('โปรดล็อกอินก่อน'); setShowAddForm(true) }}>
                    + Add to My List
                  </button>
                  <FavoriteButtonLarge mangaId={selectedManga.id} />
                </div>

                {/* Tabs */}
                <div className="owl-tabs">
                  <button className={`owl-tab${detailTab === 'details' ? ' active' : ''}`} onClick={() => setDetailTab('details')}>Details</button>
                  <button
                    className={`owl-tab${detailTab === 'stats' ? ' active' : ''}`}
                    onClick={() => {
                      setDetailTab('stats')
                      if (!progressStats || progressStats.mangaId !== selectedManga.id) fetchStats(selectedManga.id)
                    }}
                  >
                    Progress
                  </button>
                </div>

                {/* Tab content */}
                {selectedManga._loading ? (
                  <div className="owl-loading">กำลังโหลดข้อมูล…</div>
                ) : detailTab === 'details' ? (
                  <div>
                    {/* Description */}
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--owl-text)', marginBottom: 16 }}>
                      {selectedManga.description || 'ไม่มีข้อมูลคำอธิบาย'}
                    </p>

                    {/* Common fields */}
                    {selectedManga.author && <div><div className="owl-field-key">Author</div><div className="owl-field-val">{selectedManga.author}</div></div>}
                    {selectedManga.publisher && <div><div className="owl-field-key">Publisher</div><div className="owl-field-val">{selectedManga.publisher}</div></div>}
                    {selectedManga.volume && <div><div className="owl-field-key">Volume</div><div className="owl-field-val">{selectedManga.volume}</div></div>}

                    {/* Other fields */}
                    {(() => {
                      const excluded = new Set(['imageUrl', 'id', 'cover', 'tags', 'title', '_loading', 'description', 'author', 'publisher', 'volume', 'avg', 'votes'])
                      const entries = Object.entries(selectedManga).filter(([k]) => !excluded.has(k))
                      const order = ['status', 'update']
                      const ordered = []; const rest = []
                      entries.forEach(([k, v]) => { if (order.includes(k)) ordered.push([k, v]); else rest.push([k, v]) })
                      return [...ordered, ...rest].map(([k, v]) => {
                        let display = ''
                        if (k === 'update' && v) { try { display = new Date(v).toLocaleDateString('th-TH') } catch { display = String(v) } }
                        else if (Array.isArray(v)) display = v.join(', ')
                        else if (typeof v === 'object') display = JSON.stringify(v)
                        else display = String(v)
                        return <div key={k}><div className="owl-field-key">{k.replace(/_/g, ' ')}</div><div className="owl-field-val">{display}</div></div>
                      })
                    })()}

                    {/* Store links */}
                    <div style={{ marginTop: 20 }}>
                      <div className="owl-field-key" style={{ marginBottom: 8 }}>หาซื้อได้ที่</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {STORES.map(s => {
                          const url = buildStoreSearchUrl(s.key, selectedManga.title)
                          return (
                            <a key={s.key} href={url} className="owl-store-link"
                              style={{ background: s.color }}
                              onClick={e => { e.preventDefault(); try { window.open(url, '_blank', 'noopener') } catch { window.location.href = url } }}
                            >{s.label}</a>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Progress tab */
                  <div style={{ paddingTop: 4 }}>
                    {statsLoading ? (
                      <div className="owl-loading">กำลังโหลดสถิติ…</div>
                    ) : (() => {
                      const s = progressStats || { counts: { plan: 0, reading: 0, completed: 0, dropped: 0 }, totalAdded: 0 }
                      const total = s.totalAdded || 0
                      const pct = (count) => total ? Math.round((count / total) * 100) : 0
                      return (
                        <div>
                          {PROGRESS_BARS.map(({ key, label, color }) => (
                            <div key={key} className="owl-progress-row">
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <div className="owl-progress-label">{label}</div>
                                <div style={{ fontSize: 13, color: 'var(--owl-text-sub)' }}>{s.counts[key] || 0}</div>
                              </div>
                              <div className="owl-progress-bar-bg">
                                <div className="owl-progress-bar-fill" style={{ width: `${pct(s.counts[key] || 0)}%`, background: color }} />
                              </div>
                            </div>
                          ))}
                          {/* Favorites */}
                          <div className="owl-progress-row clickable" onClick={() => setFavModalOpen(true)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <div className="owl-progress-label">♥ Favorite</div>
                              <div style={{ fontSize: 13, color: 'var(--owl-text-sub)' }}>{favCount}</div>
                            </div>
                            <div className="owl-progress-bar-bg">
                              <div className="owl-progress-bar-fill" style={{ width: `${pct(favCount)}%`, background: 'var(--owl-gold)' }} />
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--owl-purple-400)', marginTop: 3 }}>คลิกเพื่อดูรายชื่อ →</div>
                          </div>
                          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'var(--owl-surface-2)', fontSize: 13, color: 'var(--owl-text-sub)' }}>
                            มีผู้เพิ่มมังงะนี้ทั้งหมด <strong style={{ color: 'var(--owl-purple-600)' }}>{total}</strong> คน
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Favorite users sub-modal */}
      {favModalOpen && (
        <div className="owl-sub-overlay" onClick={() => setFavModalOpen(false)}>
          <div className="owl-sub-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <strong style={{ fontSize: 15, color: 'var(--owl-purple-700)' }}>♥ ผู้ที่ชื่นชอบมังงะนี้</strong>
              <button className="owl-close-btn" onClick={() => setFavModalOpen(false)}>✕</button>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {favUsers.length === 0
                ? <div style={{ color: 'var(--owl-text-faint)', fontSize: 14 }}>ยังไม่มีผู้ชื่นชอบ</div>
                : favUsers.map((u, i) => (
                  <div key={i} style={{ padding: '8px 4px', borderBottom: '1px solid var(--owl-border)', fontSize: 14, color: 'var(--owl-text)' }}>
                    <span style={{ marginRight: 8, color: 'var(--owl-text-faint)' }}>{i + 1}.</span>{u}
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {showAddForm && selectedManga && (
        <AddToListForm mangaId={selectedManga.id} onClose={() => setShowAddForm(false)} onAdded={() => setShowAddForm(false)} />
      )}
    </div>
  )
}