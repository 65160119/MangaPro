import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/Auth'
import supabase from '../lib/supabaseClient'
import userMangaList from '../lib/userMangaList'
import useFavorite from '../lib/favorites'
import AddToListForm from '../components/AddToListForm'
import OwlbookStyles from '../components/OwlbookStyles'
import MangaDetail, { openStatusDetail } from '../components/MangaDetail'

const STATUS_OPTIONS = ['planned', 'reading', 'completed', 'dropped']
const STATUS_COLORS = { planned: '#a07ae0', reading: '#3B82F6', completed: '#10B981', dropped: '#EF4444' }
const STATUS_LABELS = { planned: 'Plan to Read', reading: 'Reading', completed: 'Completed', dropped: 'Dropped' }

function FavoriteButtonSmall({ mangaId }) {
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorite(mangaId)
  if (!user) return null
  return (
    <button title={isFavorite ? 'เลิกชอบ' : 'เพิ่มในรายการโปรด'}
      onClick={async (e) => { e.stopPropagation(); await toggle() }}
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
    <button className={`owl-btn owl-btn-fav${isFavorite ? ' active' : ''}`}
      onClick={async (e) => { e.stopPropagation(); if (!user) return alert('โปรดล็อกอินก่อน'); await toggle() }}
    >
      {isFavorite ? '♥ เลิกชอบ' : '♡ เพิ่มในรายการโปรด'}
    </button>
  )
}

// Status dropdown for overview entries
function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="owl-dropdown" style={{ minWidth: 130 }}>
      <button
        className={`owl-dropdown-btn${open ? ' open' : ''}`}
        style={{ minWidth: 130, padding: '6px 32px 6px 10px', fontSize: 12, borderRadius: 8 }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[value] || '#888', marginRight: 7, verticalAlign: 'middle' }} />
        {STATUS_LABELS[value] || value}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div className="owl-dropdown-menu" style={{ minWidth: 140 }}>
            {STATUS_OPTIONS.map(s => (
              <div key={s} className={`owl-dropdown-item${value === s ? ' selected' : ''}`}
                style={{ fontSize: 13 }}
                onClick={() => { onChange(s); setOpen(false) }}
              >
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s], marginRight: 8, verticalAlign: 'middle' }} />
                {STATUS_LABELS[s]}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Status() {
  const { user, signOut } = useAuth()
  const [tab, setTab] = useState('favorites')
  const [favorites, setFavorites] = useState([])
  const [loadingFav, setLoadingFav] = useState(false)
  const [overviewItems, setOverviewItems] = useState([])
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [selectedManga, setSelectedManga] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [settingsError, setSettingsError] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const displayName = user?.email ? String(user.email).split('@')[0] : 'User'

  const normalizeManga = (item) => {
    const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
    let imageUrl = null
    if (item.cover) {
      if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
      else { try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch { imageUrl = null } }
    }
    let tags = []
    if (item.tags) {
      if (Array.isArray(item.tags)) tags = item.tags.map(t => String(t).trim()).filter(Boolean)
      else if (typeof item.tags === 'string') tags = item.tags.split(',').map(s => s.trim()).filter(Boolean)
    }
    return { ...item, imageUrl, tags }
  }

  useEffect(() => {
    let mounted = true
    if (tab === 'favorites') {
      setLoadingFav(true)
      async function loadFavorites() {
        try {
          if (!user) { setFavorites([]); return }
          const { data: favRows } = await supabase.from('User_Favorite').select('manga_id').eq('user_id', user.id)
          const ids = (favRows || []).map(r => r.manga_id).filter(Boolean)
          if (!ids.length) { if (mounted) setFavorites([]); return }
          const { data } = await supabase.from('Manga').select('id, title, cover, tags, update').in('id', ids)
          if (mounted) setFavorites((data || []).map(normalizeManga))
        } catch { if (mounted) setFavorites([]) }
        finally { if (mounted) setLoadingFav(false) }
      }
      loadFavorites()
    }
    if (tab === 'overview') loadOverview()
    return () => { mounted = false }
  }, [user, tab])

  async function loadOverview() {
    if (!user) { setOverviewItems([]); return }
    setLoadingOverview(true)
    try {
      const { data: listRows } = await userMangaList.getList(user.id)
      const ids = (listRows || []).map(r => r.manga_id).filter(Boolean)
      if (!ids.length) { setOverviewItems([]); return }
      const { data: mangasData } = await supabase.from('Manga').select('id, title, cover').in('id', ids)
      const byId = Object.fromEntries((mangasData || []).map(normalizeManga).map(m => [m.id, m]))
      setOverviewItems((listRows || []).map(r => ({ ...r, manga: byId[r.manga_id] || null })))
    } catch { setOverviewItems([]) }
    finally { setLoadingOverview(false) }
  }

  const handleUpdate = async (entryId, updates) => {
    try {
      await userMangaList.updateEntry(entryId, updates)
      await loadOverview()
    } catch (e) { alert(String(e)) }
  }

  const handleRemove = async (entryId) => {
    if (!confirm('ลบรายการนี้จาก My List?')) return
    try {
      await userMangaList.removeEntry(entryId)
      await loadOverview()
    } catch (e) { alert(String(e)) }
  }

  const openManga = async (m) => {
    await openStatusDetail({ m, setSelectedManga, setDetailLoading })
  }

  // group overview by status
  const grouped = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = overviewItems.filter(e => (e.status || 'planned') === s)
    return acc
  }, {})

  const handlePasswordChange = async () => {
    setSettingsMessage('')
    setSettingsError(false)
    if (!currentPassword || !newPassword) {
      setSettingsError(true)
      setSettingsMessage('กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่')
      return
    }
    setSettingsLoading(true)
    try {
      // ยืนยันรหัสผ่านปัจจุบันด้วยการล็อกอินอีกครั้ง
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      })
      if (reauthError) {
        throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง')
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setSettingsError(false)
      setSettingsMessage('เปลี่ยนรหัสผ่านสำเร็จแล้ว')
      setCurrentPassword('')
      setNewPassword('')
    } catch (e) {
      setSettingsError(true)
      setSettingsMessage(e.message || String(e))
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    if (deleteConfirm !== 'DELETE') return
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้')) return
    setSettingsMessage('')
    setSettingsError(false)
    setDeleteLoading(true)
    try {
      const { error } = await supabase.rpc('delete_user')
      if (error) throw error
      setSettingsMessage('ลบบัญชีสำเร็จแล้ว')
      await signOut()
      window.location.href = '/'
    } catch (e) {
      setSettingsError(true)
      setSettingsMessage(e.message || String(e))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="owl-catalog">
      <OwlbookStyles />
      <style>{`
        .owl-status-wrap { max-width: 1100px; margin: 0 auto; }

        /* ── Profile banner ── */
        .owl-profile-banner {
          display: flex; align-items: center; gap: 20px;
          padding: 24px 28px; margin-bottom: 28px;
          background: var(--owl-surface); border: 1.5px solid var(--owl-border);
          border-radius: 16px;
        }
        .owl-profile-avatar {
          width: 60px; height: 60px; border-radius: 50%;
          background: linear-gradient(135deg, var(--owl-accent), var(--owl-purple-200));
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Serif Display', serif; font-size: 1.6rem; color: var(--owl-bg);
          flex-shrink: 0;
        }
        .owl-profile-name {
          font-family: 'DM Serif Display', serif; font-size: 1.5rem;
          color: var(--owl-purple-700); margin: 0 0 2px;
        }
        .owl-profile-email { font-size: 13px; color: var(--owl-text-faint); }

        .owl-settings-btn {
          margin-left: auto; padding: 6px 12px; border-radius: 999px;
          border: 1px solid var(--owl-border); background: transparent;
          color: var(--owl-text-faint); font-size: 12px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all 0.15s;
        }
        .owl-settings-btn:hover { border-color: var(--owl-accent); color: var(--owl-accent); background: var(--owl-bg); }

        /* ── Tabs ── */
        .owl-status-tabs {
          display: flex; gap: 4px; margin-bottom: 28px;
          border-bottom: 2px solid var(--owl-border);
        }
        .owl-status-tab {
          padding: 9px 20px; font-size: 14px; font-weight: 500;
          border: none; background: transparent; cursor: pointer;
          color: var(--owl-text-faint); border-bottom: 2px solid transparent;
          margin-bottom: -2px; font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
        }
        .owl-status-tab.active { color: var(--owl-accent); border-bottom-color: var(--owl-accent); }
        .owl-status-tab:hover:not(.active) { color: var(--owl-text-sub); }

        /* ── Favorites grid ── */
        .owl-fav-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
        }
        .owl-fav-card {
          cursor: pointer; position: relative; border-radius: 10px; overflow: hidden;
          background: var(--owl-surface); border: 1.5px solid var(--owl-border);
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .owl-fav-card:hover { transform: translateY(-4px); border-color: var(--owl-accent); box-shadow: 0 8px 28px rgba(0,0,0,0.5); }
        .owl-fav-card-img { width: 100%; height: 190px; object-fit: cover; display: block; background: var(--owl-surface-2); }
        .owl-fav-card-body { padding: 8px 10px 10px; }
        .owl-fav-card-title { font-size: 12.5px; font-weight: 600; color: var(--owl-text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.35; min-height: 2.6em; }
        .owl-fav-card-date { font-size: 11px; color: var(--owl-text-faint); margin-top: 3px; }

        /* ── Overview group ── */
        .owl-overview-group { margin-bottom: 28px; }
        .owl-overview-group-title {
          font-size: 13px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; margin-bottom: 10px;
          display: flex; align-items: center; gap: 8px;
        }
        .owl-overview-group-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .owl-overview-list { display: flex; flex-direction: column; gap: 8px; }

        /* ── Overview entry ── */
        .owl-overview-entry {
          display: flex; gap: 14px; align-items: center;
          background: var(--owl-surface); border: 1.5px solid var(--owl-border);
          border-radius: 12px; padding: 12px 14px;
          transition: border-color 0.15s;
        }
        .owl-overview-entry:hover { border-color: var(--owl-purple-200); }
        .owl-overview-thumb {
          width: 52px; height: 72px; object-fit: cover; border-radius: 6px;
          background: var(--owl-surface-2); flex-shrink: 0; cursor: pointer;
          transition: opacity 0.15s;
        }
        .owl-overview-thumb:hover { opacity: 0.8; }
        .owl-overview-title { font-size: 13.5px; font-weight: 600; color: var(--owl-text); margin-bottom: 8px; cursor: pointer; }
        .owl-overview-title:hover { color: var(--owl-accent); }
        .owl-overview-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .owl-progress-input {
          width: 80px; padding: 6px 10px; border-radius: 8px; font-size: 12px;
          border: 1.5px solid var(--owl-border); background: var(--owl-bg);
          color: var(--owl-text); font-family: 'DM Sans', sans-serif; outline: none;
          transition: border 0.15s;
        }
        .owl-progress-input:focus { border-color: var(--owl-accent); }
        .owl-overview-date { font-size: 11.5px; color: var(--owl-text-faint); margin-top: 6px; }
        .owl-btn-remove {
          margin-left: auto; padding: 5px 12px; border-radius: 8px; font-size: 12px;
          border: 1px solid var(--owl-border); background: transparent;
          color: var(--owl-text-faint); cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.15s; flex-shrink: 0;
        }
        .owl-btn-remove:hover { border-color: var(--owl-red); color: var(--owl-red); }

        /* ── Empty state ── */
        .owl-status-empty { text-align: center; padding: 48px 0; color: var(--owl-text-faint); font-size: 14px; }
        .owl-status-empty-icon { font-size: 2.5rem; margin-bottom: 10px; }

        /* ── Settings modal ── */
        .owl-settings-modal {
          width: 420px; max-width: 94vw;
          background: var(--owl-bg-2); border-radius: 16px; padding: 20px 22px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.7); border: 1.5px solid var(--owl-border);
        }
        .owl-settings-title { font-size: 15px; font-weight: 600; color: var(--owl-purple-700); }
        .owl-settings-section { margin-top: 14px; }
        .owl-settings-label { font-size: 12px; font-weight: 600; color: var(--owl-text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .owl-settings-input {
          width: 100%; padding: 8px 12px; border-radius: 10px;
          border: 1.5px solid var(--owl-border); background: var(--owl-bg);
          font-size: 13px; color: var(--owl-text); outline: none;
          font-family: 'DM Sans', sans-serif; transition: border 0.2s;
        }
        .owl-settings-input:focus { border-color: var(--owl-accent); }
        .owl-settings-password-wrap { position: relative; }
        .owl-settings-toggle-eye {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          border: none; background: transparent; color: var(--owl-text-faint);
          cursor: pointer; font-size: 12px; padding: 2px 4px;
        }
        .owl-settings-hint { font-size: 12px; color: var(--owl-text-faint); margin-top: 4px; }
        .owl-settings-msg {
          margin-top: 12px; padding: 8px 11px; border-radius: 9px; font-size: 12.5px;
        }
        .owl-settings-msg.ok { background: rgba(16,185,129,0.08); border: 1px solid #10B981; color: #10B981; }
        .owl-settings-msg.err { background: rgba(240,112,128,0.08); border: 1px solid var(--owl-red); color: var(--owl-red); }
      `}</style>

      <div className="owl-status-wrap">

        {/* Profile banner */}
        <div className="owl-profile-banner">
          <div className="owl-profile-avatar">{displayName[0]?.toUpperCase()}</div>
          <div>
            <div className="owl-profile-name">{displayName}</div>
            <div className="owl-profile-email">{user?.email}</div>
          </div>
          <button className="owl-settings-btn" onClick={() => setSettingsOpen(true)}>
            ⚙ Settings
          </button>
        </div>

        {/* Tabs */}
        <div className="owl-status-tabs">
          <button className={`owl-status-tab${tab === 'favorites' ? ' active' : ''}`} onClick={() => setTab('favorites')}>
            ♥ รายการโปรด
          </button>
          <button className={`owl-status-tab${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>
            📋 My List
          </button>
        </div>

        {/* ── Favorites tab ── */}
        {tab === 'favorites' && (
          loadingFav ? (
            <div className="owl-loader-wrap">
              <img src="/Owl-Book.png" className="owl-loader-img" alt="" />
              <div className="owl-loader-text">กำลังโหลดรายการโปรด…</div>
            </div>
          ) : favorites.length === 0 ? (
            <div className="owl-status-empty">
              <div className="owl-status-empty-icon">♡</div>
              <div>ยังไม่มีรายการโปรด</div>
            </div>
          ) : (
            <div className="owl-fav-grid">
              {favorites.map(m => (
                <div key={m.id} className="owl-fav-card" onClick={() => openManga(m)}>
                  {m.imageUrl
                    ? <img src={m.imageUrl} alt={m.title} className="owl-fav-card-img" />
                    : <div className="owl-fav-card-img" />
                  }
                  <div className="owl-fav-card-body">
                    <div className="owl-fav-card-title">{m.title}</div>
                    <div className="owl-fav-card-date">{m.update ? new Date(m.update).toLocaleDateString('th-TH') : ''}</div>
                  </div>
                  <FavoriteButtonSmall mangaId={m.id} />
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          loadingOverview ? (
            <div className="owl-loader-wrap">
              <img src="/Owl-Book.png" className="owl-loader-img" alt="" />
              <div className="owl-loader-text">กำลังโหลด My List…</div>
            </div>
          ) : overviewItems.length === 0 ? (
            <div className="owl-status-empty">
              <div className="owl-status-empty-icon">📚</div>
              <div>ยังไม่มีรายการใน My List</div>
            </div>
          ) : (
            STATUS_OPTIONS.map(s => {
              const items = grouped[s]
              if (!items.length) return null
              return (
                <div key={s} className="owl-overview-group">
                  <div className="owl-overview-group-title" style={{ color: STATUS_COLORS[s] }}>
                    <span className="owl-overview-group-dot" style={{ background: STATUS_COLORS[s] }} />
                    {STATUS_LABELS[s]}
                    <span style={{ color: 'var(--owl-text-faint)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({items.length})</span>
                  </div>
                  <div className="owl-overview-list">
                    {items.map(entry => (
                      <div key={entry.id} className="owl-overview-entry">
                        {entry.manga?.imageUrl
                          ? <img src={entry.manga.imageUrl} alt={entry.manga?.title} className="owl-overview-thumb" onClick={() => openManga(entry.manga)} />
                          : <div className="owl-overview-thumb" />
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="owl-overview-title" onClick={() => entry.manga && openManga(entry.manga)}>
                            {entry.manga?.title || 'Unknown'}
                          </div>
                          <div className="owl-overview-controls">
                            <StatusDropdown value={entry.status || 'planned'} onChange={v => handleUpdate(entry.id, { status: v })} />
                            <input
                              type="number"
                              placeholder="เล่มที่"
                              className="owl-progress-input"
                              defaultValue={entry.progress ?? ''}
                              onBlur={e => handleUpdate(entry.id, { progress: e.target.value ? Number(e.target.value) : null })}
                            />
                            <button className="owl-btn-remove" onClick={() => handleRemove(entry.id)}>ลบ</button>
                          </div>
                          <div className="owl-overview-date">
                            เพิ่มเมื่อ {entry.created_at ? new Date(entry.created_at).toLocaleDateString('th-TH') : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )
        )}
      </div>

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          user={user}
          onClose={() => setSelectedManga(null)}
          onRequestAddToList={() => setShowAddForm(true)}
          showFavoriteButton={true}
          FavoriteButtonLarge={FavoriteButtonLarge}
          showProgressTab={false}
        />
      )}
      {showAddForm && selectedManga && (
        <AddToListForm mangaId={selectedManga.id} onClose={() => setShowAddForm(false)} onAdded={() => setShowAddForm(false)} />
      )}

      {settingsOpen && (
        <div className="owl-sub-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="owl-settings-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div className="owl-settings-title">Settings</div>
              <button className="owl-close-btn" onClick={() => setSettingsOpen(false)}>✕</button>
            </div>

            {/* Password section */}
            <div className="owl-settings-section">
              <div className="owl-settings-label">เปลี่ยนรหัสผ่าน</div>
              <div className="owl-settings-password-wrap" style={{ marginBottom: 8 }}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="owl-settings-input"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="รหัสผ่านปัจจุบัน"
                />
                <button
                  type="button"
                  className="owl-settings-toggle-eye"
                  onClick={() => setShowCurrentPassword(v => !v)}
                >
                  {showCurrentPassword ? 'ซ่อน' : 'แสดง'}
                </button>
              </div>
              <div className="owl-settings-password-wrap">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="owl-settings-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="รหัสผ่านใหม่"
                />
                <button
                  type="button"
                  className="owl-settings-toggle-eye"
                  onClick={() => setShowNewPassword(v => !v)}
                >
                  {showNewPassword ? 'ซ่อน' : 'แสดง'}
                </button>
              </div>
              <div className="owl-settings-hint">ใส่รหัสผ่านปัจจุบันจากนั้นกำหนดรหัสผ่านใหม่ ระบบจะใช้รหัสใหม่เมื่อเข้าสู่ระบบครั้งถัดไป</div>
              <button
                className="owl-btn owl-btn-add"
                style={{ marginTop: 8 }}
                onClick={handlePasswordChange}
                disabled={settingsLoading}
              >
                {settingsLoading ? 'กำลังอัปเดต…' : 'บันทึกรหัสผ่านใหม่'}
              </button>
            </div>

            {/* Delete account section */}
            <div className="owl-settings-section" style={{ borderTop: '1px solid var(--owl-border)', paddingTop: 12 }}>
              <div className="owl-settings-label" style={{ color: 'var(--owl-red)' }}>ลบบัญชี</div>
              <div className="owl-settings-hint">
                การลบบัญชีเป็นการกระทำถาวรและข้อมูลทั้งหมดจะถูกลบอย่างถาวร โปรดพิมพ์ "DELETE" ในช่องด้านล่างเพื่อยืนยันว่าคุณต้องการลบบัญชีของคุณ
              </div>
              <input
                className="owl-settings-input"
                style={{ marginTop: 8 }}
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="พิมพ์ DELETE เพื่อยืนยัน"
              />
              <button
                className="owl-btn"
                style={{ marginTop: 8, background: 'var(--owl-red)', color: '#fff', border: 'none' }}
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirm.trim() !== 'DELETE'}
              >
                {deleteLoading ? 'กำลังลบบัญชี…' : 'ลบบัญชีถาวร'}
              </button>
            </div>

            {settingsMessage && (
              <div className={`owl-settings-msg ${settingsError ? 'err' : 'ok'}`}>
                {settingsMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}