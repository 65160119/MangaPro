import React from 'react'
import RatingStars from './RatingStars'
import AddToListForm from './AddToListForm'
import LogoLoader from './LogoLoader'
import supabase from '../lib/supabaseClient'
import OwlbookStyles from './OwlbookStyles'

// ─── shared fetch helpers ─────────────────────────────────────────────────────

export async function openCatalogDetail({ m, setSelectedManga, setDetailTab, setShowAddForm, setProgressStats, setFavUsers, setFavCount, setFavModalOpen }) {
  setSelectedManga({ ...m, _loading: true })
  setDetailTab('details')
  setShowAddForm(false)
  setProgressStats(null)
  setFavUsers([])
  setFavCount(0)
  setFavModalOpen(false)
  try {
    const { data, error: err } = await supabase.from('Manga').select('*').eq('id', m.id).single()
    if (err || !data) { setSelectedManga(prev => prev ? { ...prev, _loading: false } : prev); return }
    const imageUrl = resolveImageUrl(data.cover, m.imageUrl)
    setSelectedManga({ ...data, imageUrl, tags: normalizeTags(data.tags), _loading: false })
  } catch {
    setSelectedManga(prev => prev ? { ...prev, _loading: false } : prev)
  }
}

export async function openStatusDetail({ m, setSelectedManga, setDetailLoading }) {
  setSelectedManga({ ...m, _loading: true })
  setDetailLoading(true)
  try {
    const { data, error } = await supabase.from('Manga').select('*').eq('id', m.id).single()
    if (!error && data) {
      setSelectedManga({ ...m, ...data, imageUrl: resolveImageUrl(data.cover, m.imageUrl), tags: normalizeTags(data.tags), _loading: false })
    } else {
      setSelectedManga({ ...m, _loading: false })
    }
  } catch { setSelectedManga({ ...m, _loading: false }) }
  finally { setDetailLoading(false) }
}

export async function openQuizDetail({ m, setSelectedManga, setDetailLoading }) {
  const getField = (obj, keys) => { for (const k of keys) { if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k] } return null }
  setSelectedManga({ ...m, _loading: true })
  setDetailLoading(true)
  try {
    const { data, error } = await supabase.from('Manga').select('*').eq('id', m.id).single()
    if (!error && data) {
      setSelectedManga({
        ...m, ...data,
        imageUrl: resolveImageUrl(data.cover, m.imageUrl),
        tags: normalizeTags(data.tags),
        publisher: getField(data, ['publisher', 'ผู้จัดพิมพ์']),
        author: getField(data, ['author', 'ผู้แต่ง']),
        status: getField(data, ['status', 'สถานะ']),
        _loading: false,
      })
    } else { setSelectedManga({ ...m, _loading: false }) }
  } catch { setSelectedManga({ ...m, _loading: false }) }
  finally { setDetailLoading(false) }
}

export async function openRandomDetail({ m, setSelectedManga, setDetailLoading }) {
  setSelectedManga({ ...m, _loading: true })
  setDetailLoading(true)
  try {
    const { data, error } = await supabase.from('Manga').select('*').eq('id', m.id).single()
    if (!error && data) {
      setSelectedManga({ ...m, ...data, imageUrl: resolveImageUrl(data.cover, m.imageUrl), tags: normalizeTags(data.tags), _loading: false })
    } else { setSelectedManga({ ...m, _loading: false }) }
  } catch { setSelectedManga({ ...m, _loading: false }) }
  finally { setDetailLoading(false) }
}

// ─── private helpers ──────────────────────────────────────────────────────────

function resolveImageUrl(cover, fallback = null) {
  if (!cover) return fallback
  if (/^https?:\/\//i.test(cover)) return cover
  try {
    const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
    return supabase.storage.from(bucket).getPublicUrl(cover)?.data?.publicUrl || fallback
  } catch { return fallback }
}

function normalizeTags(tags) {
  if (!tags) return []
  if (Array.isArray(tags)) return tags.map(t => String(t).trim()).filter(Boolean)
  if (typeof tags === 'string') return tags.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

// ─── store config (shared) ──────────────────────────────────────────────────

const DEFAULT_STORES = [
  { key: 'shopee', label: 'Shopee', color: '#ff6d00' },
  { key: 'lazada', label: 'Lazada', color: '#0f146d' },
  { key: 'yaakz', label: 'Yaakz', color: '#0b73b7' },
  { key: 'naiin', label: 'นายอินทร์', color: '#1a5eab' },
  { key: 'bookwalker', label: 'BookWalker', color: '#2b2b2b' },
]

function buildDefaultStoreUrl(site, title) {
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

// ─── Modal component ──────────────────────────────────────────────────────────

export default function MangaDetail({
  manga,
  user,
  onClose,
  onRequestAddToList,
  showAddForm,
  onAddedToList,
  detailTab,
  onChangeTab,
  progressBars,
  statsLoading,
  progressStats,
  favCount,
  onOpenFavModal,
  showFavoriteButton,
  FavoriteButtonLarge,
  showProgressTab,
  showRating = true,
}) {
  if (!manga) return null

  const s = progressStats || { counts: { plan: 0, reading: 0, completed: 0, dropped: 0 }, totalAdded: 0 }
  const total = s.totalAdded || 0
  const pct = (count) => total ? Math.round((count / total) * 100) : 0
  const activeTab = showProgressTab ? detailTab : 'details'

  return (
    <>
      <OwlbookStyles />
      <div className="owl-overlay" onClick={onClose}>
        <div className="owl-modal" onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 24 }}>

            {/* ── Cover column ── */}
            <div style={{ flexShrink: 0, width: 240 }}>
              {manga.imageUrl
                ? <img
                    src={manga.imageUrl}
                    alt={manga.title}
                    style={{ width: '100%', height: 340, objectFit: 'cover', borderRadius: 12, display: 'block', border: '1.5px solid var(--owl-border)' }}
                  />
                : <div style={{ width: '100%', height: 340, borderRadius: 12, background: 'var(--owl-surface-2)', border: '1.5px solid var(--owl-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--owl-text-faint)', fontSize: 13 }}>
                    No cover
                  </div>
              }
              {/* Tags */}
              <div style={{ marginTop: 12 }}>
                {(manga.tags || []).length
                  ? (manga.tags || []).map(t => <span key={t} className="owl-tag">{t}</span>)
                  : <span className="owl-tag" style={{ background: 'var(--owl-surface-2)', color: 'var(--owl-text-faint)' }}>Untagged</span>
                }
              </div>
            </div>

            {/* ── Right pane ── */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Title + close */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <h2 className="owl-modal-title">{manga.title}</h2>
                <button className="owl-close-btn" onClick={onClose}>✕</button>
              </div>

              {/* Rating */}
              {showRating && (
                <div className="owl-rating-row">
                  <RatingStars mangaId={manga.id} />
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {onRequestAddToList && (
                  <button
                    className="owl-btn owl-btn-add"
                    onClick={e => { e.stopPropagation(); if (!user) return alert('โปรดล็อกอินก่อน'); onRequestAddToList() }}
                  >
                    + Add to My List
                  </button>
                )}
                {showFavoriteButton && FavoriteButtonLarge && <FavoriteButtonLarge mangaId={manga.id} />}
              </div>

              {/* Tabs */}
              {showProgressTab && (
                <div className="owl-tabs">
                  <button className={`owl-tab${activeTab === 'details' ? ' active' : ''}`} onClick={() => onChangeTab?.('details')}>Details</button>
                  <button className={`owl-tab${activeTab === 'stats' ? ' active' : ''}`} onClick={() => onChangeTab?.('stats')}>Stats</button>
                </div>
              )}

              {/* Loading */}
              {manga._loading ? (
                <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                  <img src="/Owl-Book.png" alt="loading" style={{ width: 72, height: 72, objectFit: 'contain', animation: 'owl-bob 1.5s ease-in-out infinite' }} />
                  <div style={{ fontSize: 13, color: 'var(--owl-text-sub)' }}>กำลังโหลดข้อมูล…</div>
                </div>

              /* Details tab */
              ) : (!showProgressTab || activeTab === 'details') ? (
                <div style={{ marginTop: showProgressTab ? 0 : 16 }}>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--owl-text)', marginBottom: 16 }}>
                    {manga.description || 'ไม่มีข้อมูลคำอธิบาย'}
                  </p>

                  {manga.author    && <><div className="owl-field-key">Author</div>   <div className="owl-field-val">{manga.author}</div></>}
                  {manga.publisher && <><div className="owl-field-key">Publisher</div><div className="owl-field-val">{manga.publisher}</div></>}
                  {manga.volume    && <><div className="owl-field-key">Volume</div>   <div className="owl-field-val">{manga.volume}</div></>}

                  {(() => {
                    const excluded = new Set(['imageUrl','id','cover','tags','title','_loading','description','author','publisher','volume','avg','votes'])
                    const entries = Object.entries(manga).filter(([k]) => !excluded.has(k))
                    const order = ['status', 'update']
                    const ordered = []; const rest = []
                    entries.forEach(([k, v]) => order.includes(k) ? ordered.push([k, v]) : rest.push([k, v]))
                    return [...ordered, ...rest].map(([k, v]) => {
                      let display = ''
                      if (k === 'update' && v) { try { display = new Date(v).toLocaleDateString('th-TH') } catch { display = String(v) } }
                      else if (Array.isArray(v)) display = v.join(', ')
                      else if (typeof v === 'object') display = JSON.stringify(v)
                      else display = String(v)
                      return (
                        <div key={k}>
                          <div className="owl-field-key">{k.replace(/_/g, ' ')}</div>
                          <div className="owl-field-val">{display}</div>
                        </div>
                      )
                    })
                  })()}

                  {/* Store links */}
                  {DEFAULT_STORES && (
                    <div style={{ marginTop: 20 }}>
                      <div className="owl-field-key" style={{ marginBottom: 8 }}>หาซื้อได้ที่</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {DEFAULT_STORES.map(st => {
                          const url = buildDefaultStoreUrl(st.key, manga.title)
                          return (
                            <a key={st.key} href={url} className="owl-store-link" style={{ background: st.color }}
                              onClick={e => { e.preventDefault(); try { window.open(url, '_blank', 'noopener') } catch { window.location.href = url } }}
                            >{st.label}</a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

              /* Stats tab */
              ) : (
                <div style={{ paddingTop: 4 }}>
                  {statsLoading ? (
                    <LogoLoader message="กำลังโหลดสถิติ..." />
                  ) : (
                    <div>
                      {(progressBars || []).map(({ key, label, color }) => (
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

                      {onOpenFavModal && (
                        (() => {
                          const favPct = total ? pct(favCount) : (favCount > 0 ? 100 : 0)
                          return (
                        <div className="owl-progress-row clickable" onClick={onOpenFavModal}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <div className="owl-progress-label">♥ Favorite</div>
                            <div style={{ fontSize: 13, color: 'var(--owl-text-sub)' }}>{favCount}</div>
                          </div>
                          <div className="owl-progress-bar-bg">
                            <div className="owl-progress-bar-fill" style={{ width: `${favPct}%`, background: 'var(--owl-gold)' }} />
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--owl-accent)', marginTop: 3 }}>คลิกเพื่อดูรายชื่อ →</div>
                        </div>
                          )
                        })()
                      )}

                      <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'var(--owl-surface-2)', border: '1px solid var(--owl-border)', fontSize: 13, color: 'var(--owl-text-sub)' }}>
                        คนที่ List เรื่องนี้ทั้งหมด <strong style={{ color: 'var(--owl-purple-600)' }}>{total}</strong> คน
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddForm && manga && onRequestAddToList && (
        <AddToListForm
          mangaId={manga.id}
          onClose={onAddedToList || onRequestAddToList}
          onAdded={onAddedToList || onRequestAddToList}
        />
      )}
    </>
  )
}