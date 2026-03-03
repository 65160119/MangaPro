import React, { useState } from 'react'
import { useAuth } from '../context/Auth'
import userMangaList from '../lib/userMangaList'
import supabase from '../lib/supabaseClient'
import OwlbookStyles from './OwlbookStyles'

const STATUS_OPTIONS = [
  { value: 'planned',   label: 'Plan to Read', color: '#a07ae0' },
  { value: 'reading',   label: 'Reading',       color: '#3B82F6' },
  { value: 'completed', label: 'Completed',     color: '#10B981' },
  { value: 'dropped',   label: 'Dropped',       color: '#EF4444' },
]

export default function AddToListForm({ mangaId, onClose, onAdded }) {
  const { user } = useAuth()
  const [status, setStatus] = useState('planned')
  const [progress, setProgress] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [maxProgress, setMaxProgress] = useState(null)
  const [statusOpen, setStatusOpen] = useState(false)

  React.useEffect(() => {
    let mounted = true
    async function loadMeta() {
      if (!mangaId) return
      try {
        const { data, error } = await supabase.from('Manga').select('volume').eq('id', mangaId).single()
        if (error || !mounted) return
        const v = data?.volume
        if (v == null) return
        const nums = String(v).match(/\d+/g)
        if (!nums?.length) return
        const max = Math.max(...nums.map(n => parseInt(n, 10)).filter(n => !isNaN(n)))
        if (mounted) setMaxProgress(max)
      } catch { }
    }
    loadMeta()
    return () => { mounted = false }
  }, [mangaId])

  const handleSubmit = async () => {
    if (!user) return alert('โปรดล็อกอินก่อน')
    if (!mangaId) { setErrorMsg('Missing manga id'); return }
    setLoading(true)
    setErrorMsg('')
    try {
      const opts = { status }
      if (progress !== '') {
        const p = Number(progress)
        if (isNaN(p) || p < 1) { setErrorMsg('Progress ต้องเป็นตัวเลขที่มากกว่า 0'); setLoading(false); return }
        if (maxProgress && p > maxProgress) { setErrorMsg(`Progress ต้องไม่เกิน ${maxProgress}`); setLoading(false); return }
        opts.progress = p
      }
      const { error } = await userMangaList.addToList(user.id, mangaId, opts)
      if (error) {
        if (error.code === '23505') setErrorMsg('รายการนี้มีอยู่ใน My List แล้ว')
        else setErrorMsg(error.message || String(error))
      } else {
        if (onAdded) onAdded()
        onClose?.()
      }
    } catch (err) { setErrorMsg(String(err)) }
    finally { setLoading(false) }
  }

  const selectedStatus = STATUS_OPTIONS.find(s => s.value === status)

  return (
    <div className="owl-overlay" style={{ zIndex: 120 }} onClick={onClose}>
      <OwlbookStyles />
      <div className="owl-atl-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="owl-atl-title">+ เพิ่มใน My List</h3>
          <button className="owl-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Status picker */}
        <div className="owl-atl-field">
          <div className="owl-atl-label">สถานะ</div>
          <div className="owl-dropdown" style={{ width: '100%' }}>
            <button
              className={`owl-dropdown-btn${statusOpen ? ' open' : ''}`}
              style={{ width: '100%' }}
              onClick={() => setStatusOpen(o => !o)}
            >
              <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: selectedStatus?.color, marginRight: 8, verticalAlign: 'middle' }} />
              {selectedStatus?.label}
            </button>
            {statusOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setStatusOpen(false)} />
                <div className="owl-dropdown-menu" style={{ width: '100%' }}>
                  {STATUS_OPTIONS.map(s => (
                    <div key={s.value}
                      className={`owl-dropdown-item${status === s.value ? ' selected' : ''}`}
                      onClick={() => { setStatus(s.value); setStatusOpen(false) }}
                    >
                      <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: s.color, marginRight: 8, verticalAlign: 'middle' }} />
                      {s.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress input */}
        <div className="owl-atl-field">
          <div className="owl-atl-label">
            Progress (เล่มที่)
            {maxProgress && <span style={{ color: 'var(--owl-text-faint)', fontWeight: 400, marginLeft: 6 }}>สูงสุด {maxProgress} เล่ม</span>}
          </div>
          <input
            type="number"
            value={progress}
            onChange={e => setProgress(e.target.value)}
            placeholder={maxProgress ? `1 – ${maxProgress}` : 'ไม่บังคับ'}
            min={1}
            max={maxProgress || undefined}
            className="owl-atl-input"
          />
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="owl-atl-error">{errorMsg}</div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="owl-btn" style={{ border: '1.5px solid var(--owl-border)', color: 'var(--owl-text-faint)', background: 'transparent' }} onClick={onClose}>
            ยกเลิก
          </button>
          <button className="owl-btn owl-btn-add" onClick={handleSubmit} disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'กำลังเพิ่ม…' : '+ เพิ่มใน List'}
          </button>
        </div>

      </div>

      <style>{`
        .owl-atl-modal {
          width: 380px; max-width: 94vw;
          background: var(--owl-bg-2); border-radius: 16px; padding: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.7); border: 1.5px solid var(--owl-border);
          animation: owl-fadein 0.2s ease;
        }
        @keyframes owl-fadein { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        .owl-atl-title {
          font-family: 'DM Serif Display', serif; font-size: 1.2rem;
          color: var(--owl-purple-700); margin: 0;
        }
        .owl-atl-field { margin-bottom: 16px; }
        .owl-atl-label {
          font-size: 12px; font-weight: 600; color: var(--owl-text-faint);
          text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 7px;
        }
        .owl-atl-input {
          width: 100%; padding: 10px 14px; border-radius: 10px;
          border: 1.5px solid var(--owl-border); background: var(--owl-surface);
          font-size: 14px; color: var(--owl-text); outline: none;
          font-family: 'DM Sans', sans-serif; transition: border 0.2s;
        }
        .owl-atl-input:focus { border-color: var(--owl-accent); box-shadow: 0 0 0 3px rgba(192,132,252,0.15); }
        .owl-atl-input::placeholder { color: var(--owl-text-faint); }
        .owl-atl-error {
          padding: 9px 13px; border-radius: 9px; font-size: 13px;
          background: rgba(240,112,128,0.1); border: 1px solid var(--owl-red);
          color: var(--owl-red); margin-top: 4px;
        }
      `}</style>
    </div>
  )
}