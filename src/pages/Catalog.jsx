import React, { useEffect, useState, useRef, useCallback } from 'react'
import supabase from '../lib/supabaseClient'
import useFavorite from '../lib/favorites'
import RatingStars from '../components/RatingStars'
import AddToListForm from '../components/AddToListForm'
import { useAuth } from '../context/Auth'
import OwlbookStyles from '../components/OwlbookStyles'
import MangaDetail, { openCatalogDetail } from '../components/MangaDetail'
import UserProfileBanner from '../components/UserProfileBanner'

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
  const [showAddForm, setShowAddForm] = useState(false)
  const [detailTab, setDetailTab] = useState('details')
  const [progressStats, setProgressStats] = useState(null)
  const [favUsers, setFavUsers] = useState([])
  const [favModalOpen, setFavModalOpen] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [favCount, setFavCount] = useState(0)
  const [profileUser, setProfileUser] = useState(null)

  const { user } = useAuth()

  /* ── open manga modal ── */
  const openManga = async (m) => {
    await openCatalogDetail({
      m,
      setSelectedManga,
      setDetailTab,
      setShowAddForm,
      setProgressStats,
      setFavUsers,
      setFavCount,
      setFavModalOpen,
    })
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
      let favUsersList = []
      if (favCnt > 0) {
        const ids = favRows.map(r => r.user_id).filter(Boolean)
        if (ids.length > 0) {
          const { data: profilesData, error: profilesErr } = await supabase.from('Profiles').select('id, user_name').in('id', ids)
          if (!profilesErr && profilesData) {
            const profilesMap = Object.fromEntries(profilesData.map(r => [r.id, r.user_name]))
            favUsersList = ids.map(id => ({ id, name: profilesMap[id] ?? String(id) }))
          } else {
            favUsersList = ids.map(id => ({ id, name: String(id) }))
          }
        }
      }
      setProgressStats({ mangaId, counts, totalAdded })
      setFavCount(favCnt)
      setFavUsers(favUsersList)
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

  /* ── shelf refs + scroll ── */
  const shelfRefs = useRef({})
  const scrollShelf = useCallback((tag, direction) => {
    const el = shelfRefs.current[tag]
    if (!el) return
    el.scrollBy({ left: direction * (el.clientWidth * 0.6 || 320), behavior: 'smooth' })
  }, [])


  /* ── visible counts ── */
  const [visibleCounts, setVisibleCounts] = useState({})
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const DEFAULT_VISIBLE = 20

  const handleLoadMore = (tag) => loadMoreFromServer(tag)
  const handleShowLess = (tag) => setVisibleCounts(prev => ({ ...prev, [tag]: DEFAULT_VISIBLE }))

  async function loadMoreFromServer(tag) {
    try {
      const currentCount = mangas.filter(m => (m.tags || []).includes(tag)).length
      const from = currentCount; const to = currentCount + DEFAULT_VISIBLE - 1
      let res = await supabase.from('Manga').select('id, title, cover, tags').contains('tags', [tag]).range(from, to)
      if ((!res.data || res.data.length === 0) && (!res.error)) {
        res = await supabase.from('Manga').select('id, title, cover, tags').ilike('tags', `%${tag}%`).range(from, to)
      }
      if (res.error) return
      const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
      const newItems = (res.data || []).map(item => {
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
      })
      if (newItems.length === 0) { setVisibleCounts(prev => ({ ...prev, [tag]: (prev[tag] || DEFAULT_VISIBLE) + DEFAULT_VISIBLE })); return }
      setMangas(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        const filteredNew = newItems.filter(it => !existingIds.has(it.id))
        if (filteredNew.length === 0) return prev
        return [...filteredNew, ...prev]
      })
      setVisibleCounts(prev => ({ ...prev, [tag]: (prev[tag] || DEFAULT_VISIBLE) + newItems.length }))
    } catch (e) { console.error(e) }
  }

  if (loading) return (
    <div className="owl-catalog">
      <OwlbookStyles />
      <div className="owl-loader-wrap-full">
        <img src="/Owl-Book.png" alt="loading" className="owl-loader-img-lg" />
        <div className="owl-loader-text">กำลังโหลดคลังมังงะ…</div>
      </div>
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
        <div className="owl-dropdown">
          <button
            className={`owl-dropdown-btn${dropdownOpen ? ' open' : ''}`}
            onClick={() => setDropdownOpen(o => !o)}
          >
            {tagFilter || 'ทุกหมวดหมู่'}
          </button>
          {dropdownOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setDropdownOpen(false)} />
              <div className="owl-dropdown-menu">
                {['', ...availableTags].map(t => (
                  <div
                    key={t || '__all__'}
                    className={`owl-dropdown-item${tagFilter === t ? ' selected' : ''}`}
                    onClick={() => { setTagFilter(t); setDropdownOpen(false) }}
                  >
                    {t || 'ทุกหมวดหมู่'}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {isFiltering && (
          <button onClick={() => { setSearch(''); setTagFilter('') }} className="owl-btn-clear">
            ✕ ล้าง
          </button>
        )}
      </div>

      {/* Latest + Top Rated (hidden while filtering) */}
      {!isFiltering && (
        <>
          <section className="owl-section">
            <h3 className="owl-section-title">อัพเดตล่าสุด</h3>
            <div className="owl-shelf" ref={el => (shelfRefs.current['__latest__'] = el)}>
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
            <div className="owl-shelf" ref={el => (shelfRefs.current['__toprated__'] = el)}>
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
        const visible = visibleCounts[tag] || DEFAULT_VISIBLE
        return (
          <section key={tag} className="owl-section">
            <h3 className="owl-section-title">{tag}</h3>

            <div className="owl-shelf" ref={el => (shelfRefs.current[tag] = el)}>
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

      {/* ── Manga detail modal (shared component) ── */}
      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          user={user}
          onClose={() => setSelectedManga(null)}
          onRequestAddToList={() => setShowAddForm(true)}
          showAddForm={showAddForm}
          onAddedToList={() => setShowAddForm(false)}
          detailTab={detailTab}
          onChangeTab={(tab) => {
            setDetailTab(tab)
            if (tab === 'stats' && (!progressStats || progressStats.mangaId !== selectedManga.id)) {
              fetchStats(selectedManga.id)
            }
          }}
          progressBars={PROGRESS_BARS}
          statsLoading={statsLoading}
          progressStats={progressStats}
          favCount={favCount}
          onOpenFavModal={() => setFavModalOpen(true)}
          showFavoriteButton={true}
          FavoriteButtonLarge={FavoriteButtonLarge}
          showProgressTab={true}
        />
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
                  <div
                    key={u.id || i}
                    style={{ padding: '8px 4px', borderBottom: '1px solid var(--owl-border)', fontSize: 14, color: 'var(--owl-text)', cursor: 'pointer' }}
                    onClick={() => { setProfileUser(u); setFavModalOpen(false) }}
                  >
                    <span style={{ marginRight: 8, color: 'var(--owl-text-faint)' }}>{i + 1}.</span>
                    <span style={{ color: 'var(--owl-accent)', textDecoration: 'underline' }}>{u.name}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {profileUser && (
        <UserProfileBanner
          userId={profileUser.id}
          displayName={profileUser.name}
          onClose={() => setProfileUser(null)}
        />
      )}

      {/* Add-to-list form is rendered inside MangaDetail via showAddForm */}
    </div>
  )
}