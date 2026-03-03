import React, { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import userMangaList from '../lib/userMangaList'
import { useAuth } from '../context/Auth'
import OwlbookStyles from './OwlbookStyles'
import MangaDetail from './MangaDetail'
import LogoLoader from './LogoLoader'

export default function UserProfileBanner({ userId, displayName, onClose }) {
  const { user: currentUser } = useAuth()

  const [profileName, setProfileName] = useState(displayName || '')
  const [overviewItems, setOverviewItems] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedManga, setSelectedManga] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    if (!userId) return
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Profile name
        const { data: profileData, error: profileErr } = await supabase
          .from('Profiles')
          .select('user_name')
          .eq('id', userId)
          .single()
        if (!profileErr && profileData && profileData.user_name) {
          if (mounted) setProfileName(profileData.user_name)
        }

        // Overview from user_manga_list (reuse pattern from Status page)
        const { data: listRows, error: listErr } = await userMangaList.getList(userId)
        if (listErr) { console.warn('profile overview', listErr) }
        const ids = (listRows || []).map(r => r.manga_id).filter(Boolean)
        let overview = []
        if (ids.length) {
          const { data: mangasData, error: mangasErr } = await supabase
            .from('Manga')
            .select('id, title, cover')
            .in('id', ids)
          if (mangasErr) { console.warn('profile overview mangas', mangasErr) }
          const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
          const normalize = (item) => {
            let imageUrl = null
            if (item.cover) {
              if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
              else {
                try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch (e) { imageUrl = null }
              }
            }
            return { ...item, imageUrl }
          }
          const byId = Object.fromEntries((mangasData || []).map(normalize).map(m => [m.id, m]))
          overview = (listRows || []).map(r => ({ ...r, manga: byId[r.manga_id] || null }))
        }

        // Favorites for this user (pattern from Status favorites)
        const { data: favRows, error: favErr } = await supabase
          .from('User_Favorite')
          .select('manga_id')
          .eq('user_id', userId)
        if (favErr) { console.warn('profile favorites', favErr) }
        const favIds = (favRows || []).map(r => r.manga_id).filter(Boolean)
        let favList = []
        if (favIds.length) {
          const { data: favMangas, error: favMangasErr } = await supabase
            .from('Manga')
            .select('id, title, cover')
            .in('id', favIds)
          if (favMangasErr) { console.warn('profile fav mangas', favMangasErr) }
          const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
          const normalizeFav = (item) => {
            let imageUrl = null
            if (item.cover) {
              if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
              else {
                try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch (e) { imageUrl = null }
              }
            }
            return { ...item, imageUrl }
          }
          favList = (favMangas || []).map(normalizeFav)
        }

        if (!mounted) return
        setOverviewItems(overview)
        setFavorites(favList)
      } catch (e) {
        console.error('UserProfileBanner load', e)
        if (mounted) setError(e.message || String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [userId])

  // Note: banner now shows manga info only; no click-to-open detail here

  if (!userId) return null

  return (
    <>
      <OwlbookStyles />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ width: 920, maxWidth: '96vw', maxHeight: '90vh', background: '#110b22', borderRadius: 18, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.7)', border: '1px solid #3a2468', color: '#f0eaff', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, color: '#b89af0' }}>PROFILE OVERVIEW</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{profileName || displayName || 'ผู้ใช้ไม่ระบุชื่อ'}</div>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: '#1f1438', color: '#b89af0', borderRadius: 10, width: 32, height: 32, cursor: 'pointer' }}>✕</button>
          </div>

          {loading ? (
            <LogoLoader message="กำลังโหลดโปรไฟล์..." />
          ) : error ? (
            <div style={{ padding: 20, fontSize: 14, color: '#f97373' }}>{error}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#cfb8ff', marginBottom: 8 }}>Overview</div>
                {overviewItems.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#6a4e98' }}>ยังไม่มีรายการใน My List</div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {overviewItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 4px', borderBottom: '1px solid rgba(58,36,104,0.7)' }}>
                        {item.manga && item.manga.imageUrl ? (
                          <img src={item.manga.imageUrl} alt={item.manga.title} style={{ width: 54, height: 78, objectFit: 'cover', borderRadius: 8, marginRight: 10 }} />
                        ) : (
                          <div style={{ width: 54, height: 78, borderRadius: 8, background: '#281a48', marginRight: 10 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.manga ? item.manga.title : 'Unknown title'}</div>
                          <div style={{ fontSize: 11, color: '#b89af0', marginTop: 2 }}>Status: {item.status || '-' }{item.progress != null ? ` · Ep ${item.progress}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#cfb8ff', marginBottom: 8 }}>Favorite Manga</div>
                {favorites.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#6a4e98' }}>ยังไม่มีรายการโปรด</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, maxHeight: 320, overflowY: 'auto' }}>
                    {favorites.map(m => (
                      <div key={m.id} style={{ display: 'flex', gap: 8 }}>
                        {m.imageUrl ? (
                          <img src={m.imageUrl} alt={m.title} style={{ width: 60, height: 88, objectFit: 'cover', borderRadius: 8 }} />
                        ) : (
                          <div style={{ width: 60, height: 88, borderRadius: 8, background: '#281a48' }} />
                        )}
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#f0eaff', alignSelf: 'center' }}>{m.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* No MangaDetail overlay from inside banner to avoid stacked modals */}
    </>
  )
}
