import React, { useEffect, useState, useRef } from 'react'
import supabase from '../lib/supabaseClient'
import LogoLoader from '../components/LogoLoader'
import OwlbookStyles from '../components/OwlbookStyles'
import MangaDetail, { openRandomDetail } from '../components/MangaDetail'

export default function Random() {
  const [covers, setCovers] = useState([])
  const [loading, setLoading] = useState(true)
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const ITEM_W = 160
  const VISIBLE = 5
  const GAP = 12
  const COPIES = 20
  const slotWidth = ITEM_W + GAP

  const [position, setPosition] = useState(0)
  const positionRef = useRef(0)
  const [transformDuration, setTransformDuration] = useState(80)
  const [spinning, setSpinning] = useState(false)
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState(null)
  const timerRef = useRef(null)
  const [selectedManga, setSelectedManga] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const audioRef = useRef(null)
  const getAudio = () => {
    if (!audioRef.current) {
      try { audioRef.current = new (window.AudioContext || window.webkitAudioContext)() }
      catch (e) { audioRef.current = null }
    }
    return audioRef.current
  }
  const playTick = () => {
    const ctx = getAudio(); if (!ctx) return
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'square'; o.frequency.value = 900; g.gain.value = 0.002
    o.connect(g); g.connect(ctx.destination); o.start()
    setTimeout(() => { try { o.stop() } catch { } }, 60)
  }
  const playChime = () => {
    const ctx = getAudio(); if (!ctx) return
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = 600; g.gain.value = 0.015
    o.connect(g); g.connect(ctx.destination); o.start()
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.0)
    setTimeout(() => { try { o.stop() } catch { } }, 1100)
  }

  const openManga = async (m) => {
    await openRandomDetail({ m, setSelectedManga, setDetailLoading })
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase.from('Manga').select('id,title,cover,tags').limit(400)
        if (error) { if (!mounted) return; setCovers([]); setLoading(false); return }
        const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'
        const normalized = (data || []).map(item => {
          let imageUrl = null
          if (item.cover) {
            if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
            else { try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch (e) { imageUrl = null } }
          }
          let tags = []
          if (item.tags) {
            if (Array.isArray(item.tags)) tags = item.tags.map(t => String(t).trim()).filter(Boolean)
            else if (typeof item.tags === 'string') tags = item.tags.split(',').map(s => s.trim()).filter(Boolean)
          }
          return { id: item.id, title: item.title, imageUrl, tags }
        }).filter(i => i.imageUrl)

        for (let i = normalized.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [normalized[i], normalized[j]] = [normalized[j], normalized[i]] }
        const imgs = normalized.slice(0, 80)
        await Promise.all(imgs.map(i => new Promise(res => { const im = new Image(); im.onload = im.onerror = res; im.src = i.imageUrl })))

        if (!mounted) return
        setCovers(normalized)
        const gset = new Set(); normalized.forEach(it => (it.tags || []).forEach(t => gset.add(t)))
        setGenres(['All', ...Array.from(gset).sort((a, b) => a.localeCompare(b))])
      } catch (e) { if (!mounted) return; setCovers([]) }
      finally { if (!mounted) return; setLoading(false) }
    }
    load()
    return () => { mounted = false; if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  useEffect(() => { setIndex(0); setResult(null) }, [selectedGenre])

  const visibleCovers = selectedGenre === 'All' ? covers : covers.filter(c => (c.tags || []).includes(selectedGenre))
  const sequence = visibleCovers.length ? Array(COPIES).fill(visibleCovers).flat() : []
  const centerSlot = Math.floor(VISIBLE / 2)

  useEffect(() => {
    if (!sequence.length) return
    const mid = Math.floor(sequence.length / 2)
    setTransformDuration(0)
    setPosition(mid)
    positionRef.current = mid
    const t = setTimeout(() => setTransformDuration(80), 30)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCovers.length])

  useEffect(() => { positionRef.current = position }, [position])

  const spin = () => {
    if (spinning) return
    const visible = visibleCovers
    const n = visible.length
    if (n === 0) return
    setSpinning(true); setResult(null)

    const DURATION = 7000
    const loops = 3 + Math.floor(Math.random() * 3)
    const final = Math.floor(Math.random() * n)

    const startVisible = positionRef.current % n
    let steps = loops * n + ((final - startVisible + n) % n)
    if (steps <= 0) steps = n

    const weights = new Array(steps).fill(0).map((_, i) => { const t = steps === 1 ? 1 : i / (steps - 1); return t * t * t })
    const totalW = weights.reduce((a, b) => a + b, 0) || 1
    const delays = weights.map(w => Math.max(20, (DURATION * w) / totalW))

    let step = 0
    const tick = () => {
      step++
      const nextPos = positionRef.current + 1
      setPosition(nextPos)
      positionRef.current = nextPos
      const nextVisibleIndex = nextPos % n
      setIndex(nextVisibleIndex)
      try { playTick() } catch { }

      if (step >= steps) {
        setSpinning(false)
        const picked = visible[nextVisibleIndex]
        setResult(picked)
        try { playChime() } catch { }
        openManga(picked)
        return
      }

      const d = delays[Math.max(0, step - 1)] || 40
      setTransformDuration(d)

      const threshold = sequence.length - (VISIBLE * 2)
      if (positionRef.current > threshold) {
        const mid = Math.floor(sequence.length / 2)
        timerRef.current = setTimeout(() => {
          // instant rebase without animation flash
          setTransformDuration(0)
          setPosition(mid)
          positionRef.current = mid
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTransformDuration(d)
              timerRef.current = setTimeout(tick, d)
            })
          })
        }, d)
      } else {
        timerRef.current = setTimeout(tick, d)
      }
    }

    setTransformDuration(delays[0] || 30)
    timerRef.current = setTimeout(tick, delays[0] || 30)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  if (loading) return <LogoLoader message="กำลังโหลดปก..." fullscreen />

  const translateX = -(position - centerSlot) * slotWidth
  const stripW = ITEM_W * VISIBLE + GAP * (VISIBLE - 1)

  return (
    <div className="owl-catalog">
      <OwlbookStyles />
      <style>{`
        .owl-random-wrap {
          display: flex; flex-direction: column; align-items: center;
          padding: 40px 20px; min-height: 80vh;
        }

        /* ── Heading ── */
        .owl-random-title {
          font-family: 'DM Serif Display', serif; font-size: 2rem;
          color: var(--owl-purple-700); margin: 0 0 8px; letter-spacing: -0.5px;
        }
        .owl-random-subtitle {
          font-size: 13.5px; color: var(--owl-text-faint); margin-bottom: 40px;
        }

        /* ── Machine frame ── */
        .owl-machine {
          background: var(--owl-surface);
          border: 2px solid var(--owl-border);
          border-radius: 20px;
          padding: 24px 28px 20px;
          box-shadow: 0 0 0 1px var(--owl-purple-100), var(--owl-shadow-lg);
          display: flex; flex-direction: column; align-items: center; gap: 20px;
          position: relative;
        }
        /* glow pulse while spinning */
        .owl-machine.spinning {
          box-shadow: 0 0 0 1px var(--owl-accent), 0 0 32px rgba(192,132,252,0.25), var(--owl-shadow-lg);
          border-color: var(--owl-accent);
          transition: box-shadow 0.3s, border-color 0.3s;
        }

        /* ── Reel window ── */
        .owl-reel-outer {
          border-radius: 12px; overflow: hidden; position: relative;
          background: var(--owl-bg);
          box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
        }
        /* left/right fade gradients */
        .owl-reel-outer::before, .owl-reel-outer::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 80px; z-index: 2; pointer-events: none;
        }
        .owl-reel-outer::before { left: 0; background: linear-gradient(to right, var(--owl-surface), transparent); }
        .owl-reel-outer::after  { right: 0; background: linear-gradient(to left,  var(--owl-surface), transparent); }

        /* center spotlight */
        .owl-reel-spotlight {
          position: absolute; top: 0; bottom: 0; left: 50%;
          transform: translateX(-50%);
          width: 174px; z-index: 3; pointer-events: none;
          border-left: 2px solid var(--owl-accent);
          border-right: 2px solid var(--owl-accent);
          border-radius: 4px;
          box-shadow: inset 0 0 20px rgba(192,132,252,0.08);
        }

        /* ── Reel strip ── */
        .owl-reel-strip { display: flex; align-items: center; padding: 10px 0; }
        .owl-reel-item {
          flex: 0 0 auto; border-radius: 8px; overflow: hidden;
          background: var(--owl-surface-2);
          display: flex; align-items: center; justify-content: center;
        }

        /* ── Controls row ── */
        .owl-controls { display: flex; align-items: center; gap: 14px; width: 100%; justify-content: center; }

        /* ── Genre dropdown (reuses global owl-dropdown classes) ── */

        /* ── Spin button ── */
        .owl-spin-btn {
          padding: 11px 32px; border-radius: 12px; font-size: 15px; font-weight: 700;
          cursor: pointer; border: none; font-family: 'DM Serif Display', serif;
          background: linear-gradient(135deg, var(--owl-accent), var(--owl-purple-200));
          color: var(--owl-bg); letter-spacing: 0.02em;
          transition: opacity 0.15s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(192,132,252,0.35);
        }
        .owl-spin-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-2px); box-shadow: 0 6px 28px rgba(192,132,252,0.5); }
        .owl-spin-btn:active:not(:disabled) { transform: translateY(0); }
        .owl-spin-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── Result badge ── */
        .owl-result-badge {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 18px; border-radius: 12px;
          background: var(--owl-surface-2); border: 1.5px solid var(--owl-accent);
          animation: owl-fadein 0.3s ease;
        }
        .owl-result-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--owl-accent); flex-shrink: 0; }
        .owl-result-title { font-size: 14px; font-weight: 600; color: var(--owl-purple-700); }
        .owl-result-sub { font-size: 12px; color: var(--owl-text-faint); }
        @keyframes owl-fadein { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
      `}</style>

      <div className="owl-random-wrap">
        <h2 className="owl-random-title">สุ่มมังงะ</h2>
        <p className="owl-random-subtitle">ให้โชคชะตาเลือกมังงะให้คุณ 🎰</p>

        <div className={`owl-machine${spinning ? ' spinning' : ''}`}>

          {/* Reel */}
          <div className="owl-reel-outer" style={{ width: stripW, height: 300 }}>
            <div className="owl-reel-spotlight" />
            <div
              className="owl-reel-strip"
              style={{
                gap: GAP,
                transform: `translateX(${translateX}px)`,
                transition: transformDuration <= 0 ? 'none' : `transform ${transformDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1.0)`,
              }}
            >
              {sequence.length === 0 ? (
                <div style={{ width: ITEM_W, height: 280, borderRadius: 8, background: 'var(--owl-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--owl-text-faint)', fontSize: 13 }}>ไม่มีปก</div>
              ) : sequence.map((it, i) => (
                <div key={`${it.id}-${i}`} className="owl-reel-item" style={{ width: ITEM_W, height: 280 }}>
                  <img src={it.imageUrl} alt={it.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="owl-controls">
            {/* Genre custom dropdown */}
            <div className="owl-dropdown">
              <button
                className={`owl-dropdown-btn${dropdownOpen ? ' open' : ''}`}
                onClick={() => setDropdownOpen(o => !o)}
              >
                {selectedGenre === 'All' ? 'ทุกหมวดหมู่' : selectedGenre}
              </button>
              {dropdownOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setDropdownOpen(false)} />
                  <div className="owl-dropdown-menu">
                    {genres.map(g => (
                      <div
                        key={g}
                        className={`owl-dropdown-item${selectedGenre === g ? ' selected' : ''}`}
                        onClick={() => { setSelectedGenre(g); setDropdownOpen(false) }}
                      >
                        {g === 'All' ? 'ทุกหมวดหมู่' : g}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              className="owl-spin-btn"
              onClick={spin}
              disabled={spinning || visibleCovers.length === 0}
            >
              {spinning ? 'กำลังสุ่ม…' : '🎲 หมุน!'}
            </button>
          </div>

          {/* Result */}
          {result && !spinning && (
            <div className="owl-result-badge">
              <div className="owl-result-dot" />
              <div>
                <div className="owl-result-title">{result.title}</div>
                <div className="owl-result-sub">สุ่มเสร็จแล้ว! ใช่เรื่องที่คุณอยากอ่านไหม</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          user={null}
          onClose={() => setSelectedManga(null)}
          onRequestAddToList={null}
          showFavoriteButton={false}
          showProgressTab={false}
        />
      )}
    </div>
  )
}