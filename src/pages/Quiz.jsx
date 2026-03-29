import React, { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import AddToListForm from '../components/AddToListForm'
import { useAuth } from '../context/Auth'
import OwlbookStyles from '../components/OwlbookStyles'
import MangaDetail, { openQuizDetail } from '../components/MangaDetail'

// ── shuffle helper ──────────────────────────────────────────────
function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const STEPS = [
  { key: 'tags',       label: 'แนวเรื่องที่อยากอ่าน',     sub: 'เลือกได้สูงสุด 2 แท็ก' },
  { key: 'finished',   label: 'อยากอ่านเรื่องที่จบแล้วไหม?', sub: 'ไม่บังคับ' },
  { key: 'publisher',  label: 'สำนักพิมพ์',                sub: 'เลือกสำนักพิมพ์ที่ต้องการจะอ่าน' },
  { key: 'mood',       label: 'อยากได้อารมณ์แบบไหน?',     sub: 'ไม่บังคับ' },
  { key: 'mc_gender',  label: 'ตัวเอกเพศอะไร?',           sub: 'ไม่บังคับ' },
]

export default function Quiz() {
  const [step, setStep] = useState(0)
  const [tagsOptions, setTagsOptions] = useState([])
  const [publishers, setPublishers] = useState([])
  const [pubDropdownOpen, setPubDropdownOpen] = useState(false)
  const [answer, setAnswer] = useState({ tags: [], finished: null, publisher: null, mood: null, mc_gender: null })
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [relaxMsg, setRelaxMsg] = useState('')
  const [selectedManga, setSelectedManga] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    let mounted = true
    async function loadOptions() {
      try {
        const { data } = await supabase.from('Manga').select('*').limit(1000)
        if (!mounted) return
        const tagSet = new Set()
        const pubSet = new Set()
        ;(data || []).forEach(r => {
          const pubVal = r.publisher || r['ผู้จัดพิมพ์']
          if (pubVal) pubSet.add(String(pubVal).trim())
          if (r.tags) {
            if (Array.isArray(r.tags)) r.tags.forEach(t => t && tagSet.add(String(t).trim()))
            else if (typeof r.tags === 'string') r.tags.split(',').map(s => s.trim()).filter(Boolean).forEach(t => tagSet.add(t))
          }
        })
        setTagsOptions(Array.from(tagSet).sort((a, b) => a.localeCompare(b)))
        setPublishers(Array.from(pubSet).sort((a, b) => a.localeCompare(b)))
      } catch (e) { console.warn('quiz load options', e) }
    }
    loadOptions()
    return () => { mounted = false }
  }, [])

  const onPick = (key, value) => {
    if (key === 'tags') {
      setAnswer(prev => {
        const arr = prev.tags.slice()
        const idx = arr.indexOf(value)
        if (idx === -1) { if (arr.length >= 2) return prev; arr.push(value) }
        else arr.splice(idx, 1)
        return { ...prev, tags: arr }
      })
      return
    }
    setAnswer(prev => ({ ...prev, [key]: value }))
  }

  const getField = (obj, keys) => {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k]
    }
    return null
  }

  const detectFinished = (stRaw) => {
    const st = String(stRaw || '').toLowerCase()
    if (!st) return null
    if (st.includes('ยังไม่') || st.includes('ongoing') || st.includes('not') || st.includes('on-going')) return false
    if (st.includes('จบแล้ว') || (st.includes('จบ') && !st.includes('ยังไม่')) || st.includes('finish') || st.includes('finished') || st.includes('completed')) return true
    return null
  }

  const isMoodMatch = (moodValRaw, wantRaw) => {
    const v = String(moodValRaw || '').toLowerCase(); const w = String(wantRaw || '').toLowerCase()
    if (!w) return true; if (!v) return false
    if (v.includes(w)) return true
    if (w === 'light') return v.includes('สบาย') || v.includes('light') || v.includes('เบา')
    if (w === 'balance') return v.includes('กลาง') || v.includes('balance') || v.includes('ปานกลาง')
    if (w === 'dark') return v.includes('ดาร์ก') || v.includes('dark') || v.includes('มืด')
    return v.includes(w)
  }

  const isMCMatch = (mcValRaw, wantGender) => {
    const v = String(mcValRaw || '').toLowerCase()
    if (!wantGender) return true; if (!v) return false
    if (wantGender === 'male') return v.includes('male') || v.includes('boy') || v.includes('ชาย')
    if (wantGender === 'female') return v.includes('female') || v.includes('girl') || v.includes('หญิง')
    if (wantGender === 'both') return v.includes('couple') || v.includes('both') || v.includes('คู่') || v.includes('ทั้ง') || v.includes('dual')
    return false
  }

  const runSearch = async () => {
    setLoading(true)
    try {
      const { data: rows } = await supabase.from('Manga').select('*').limit(500)
      const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'covers'

      const normalize = (item) => {
        let imageUrl = null
        if (item.cover) {
          if (/^https?:\/\//i.test(item.cover)) imageUrl = item.cover
          else { try { imageUrl = supabase.storage.from(bucket).getPublicUrl(item.cover)?.data?.publicUrl || null } catch { imageUrl = null } }
        }
        return { ...item, imageUrl }
      }

      const applyFilter = (items, { useTags = true, usePublisher = true, useMood = true, useMC = true, useFinished = true } = {}) =>
        items.filter(item => {
          if (useTags && answer.tags.length > 0) {
            const itemTags = Array.isArray(item.tags) ? item.tags.map(t => String(t).toLowerCase()) : (typeof item.tags === 'string' ? item.tags.split(',').map(s => s.trim().toLowerCase()) : [])
            for (const t of answer.tags) if (!itemTags.includes(String(t).toLowerCase())) return false
          }
          if (useFinished && answer.finished) {
            const isFinished = detectFinished(getField(item, ['status', 'สถานะ']))
            if (answer.finished === 'finished' && isFinished !== true) return false
            if (answer.finished === 'not_finished' && isFinished === true) return false
          }
          if (usePublisher && answer.publisher) {
            const pubVal = getField(item, ['publisher', 'ผู้จัดพิมพ์'])
            if (!pubVal || String(pubVal).trim().toLowerCase() !== String(answer.publisher).trim().toLowerCase()) return false
          }
          if (useMood && answer.mood && !isMoodMatch(getField(item, ['mood']), answer.mood)) return false
          if (useMC && answer.mc_gender && !isMCMatch(getField(item, ['mc']), answer.mc_gender)) return false
          return true
        })

      const normalized = (rows || []).map(normalize)

      // progressive relaxation — shuffle ก่อน slice เสมอ
      let final = [], msg = ''
      const tries = [
        { opts: {},                                          label: '' },
        { opts: { usePublisher: false },                    label: 'ไม่พบตรงสำนักพิมพ์ที่เลือก' },
        { opts: { usePublisher: false, useTags: false },    label: 'ไม่พบตรงแนวเรื่อง' },
        { opts: { usePublisher: false, useTags: false, useMood: false, useMC: false }, label: 'ผลที่ใกล้เคียงที่สุด' },
      ]
      for (const { opts, label } of tries) {
        const filtered = applyFilter(normalized, opts)
        if (filtered.length > 0) {
          final = shuffle(filtered).slice(0, 4)  // ← shuffle ตรงนี้
          msg = label
          break
        }
      }
      if (final.length === 0) {
        final = shuffle(normalized).slice(0, 4)
        msg = 'ไม่พบผลที่ตรง แสดงแบบสุ่ม'
      }

      setRelaxMsg(msg)
      setResults(final)
      setStep(5)
    } catch (e) { console.warn('quiz search', e) }
    finally { setLoading(false) }
  }

  const reset = () => {
    setStep(0)
    setAnswer({ tags: [], finished: null, publisher: null, mood: null, mc_gender: null })
    setResults([])
    setSelectedManga(null)
    setRelaxMsg('')
  }

  const openManga = async (m) => {
    await openQuizDetail({ m, setSelectedManga, setDetailLoading })
  }

  // ── shared option button ──────────────────────────────────────
  const OptionBtn = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`quiz-opt-btn${active ? ' active' : ''}`}>{children}</button>
  )

  const progress = Math.round((Math.min(step, 5) / 5) * 100)

  return (
    <div className="owl-catalog">
      <OwlbookStyles />
      <style>{`
        .owl-quiz-wrap {
          max-width: 640px; margin: 0 auto; padding: 40px 0;
          display: flex; flex-direction: column; gap: 0;
        }

        /* ── Header ── */
        .owl-quiz-heading {
          font-family: 'DM Serif Display', serif; font-size: 2rem;
          color: var(--owl-purple-700); margin: 0 0 6px;
        }
        .owl-quiz-sub { font-size: 13.5px; color: var(--owl-text-faint); margin-bottom: 28px; }

        /* ── Progress bar ── */
        .owl-quiz-progress-track {
          height: 4px; background: var(--owl-surface-2); border-radius: 4px; margin-bottom: 32px; overflow: hidden;
        }
        .owl-quiz-progress-fill {
          height: 100%; border-radius: 4px;
          background: linear-gradient(to right, var(--owl-accent), var(--owl-purple-400));
          transition: width 0.4s ease;
        }

        /* ── Step card ── */
        .owl-quiz-card {
          background: var(--owl-surface); border: 1.5px solid var(--owl-border);
          border-radius: 16px; padding: 28px;
          animation: owl-fadein 0.2s ease;
        }
        @keyframes owl-fadein { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }

        .owl-quiz-q { font-size: 1.1rem; font-weight: 600; color: var(--owl-purple-600); margin: 0 0 4px; }
        .owl-quiz-hint { font-size: 12.5px; color: var(--owl-text-faint); margin: 0 0 18px; }

        /* ── Option buttons ── */
        .owl-quiz-opts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
        .quiz-opt-btn {
          padding: 8px 16px; border-radius: 20px; font-size: 13.5px; font-weight: 500;
          border: 1.5px solid var(--owl-border); background: var(--owl-surface-2);
          color: var(--owl-text-sub); cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
        }
        .quiz-opt-btn:hover { border-color: var(--owl-accent); color: var(--owl-text); }
        .quiz-opt-btn.active { border-color: var(--owl-accent); background: var(--owl-purple-100); color: var(--owl-accent); font-weight: 600; }

        /* ── Nav buttons ── */
        .owl-quiz-nav { display: flex; gap: 8px; }
        .owl-quiz-btn-next {
          padding: 9px 24px; border-radius: 10px; font-size: 13.5px; font-weight: 600;
          border: none; background: var(--owl-accent); color: var(--owl-bg);
          cursor: pointer; font-family: 'DM Sans', sans-serif; transition: opacity 0.15s;
        }
        .owl-quiz-btn-next:hover:not(:disabled) { opacity: 0.88; }
        .owl-quiz-btn-next:disabled { opacity: 0.35; cursor: not-allowed; }
        .owl-quiz-btn-back {
          padding: 9px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 500;
          border: 1.5px solid var(--owl-border); background: transparent;
          color: var(--owl-text-faint); cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
        }
        .owl-quiz-btn-back:hover { border-color: var(--owl-text-faint); color: var(--owl-text-sub); }
        .owl-quiz-btn-skip {
          padding: 9px 14px; border-radius: 10px; font-size: 13px;
          border: none; background: transparent; color: var(--owl-text-faint);
          cursor: pointer; font-family: 'DM Sans', sans-serif; transition: color 0.15s;
        }
        .owl-quiz-btn-skip:hover { color: var(--owl-text-sub); }

        /* ── Results ── */
        .owl-quiz-results-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 24px;
        }
        .owl-quiz-result-card {
          background: var(--owl-surface); border: 1.5px solid var(--owl-border);
          border-radius: 12px; overflow: hidden; cursor: pointer;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .owl-quiz-result-card:hover { transform: translateY(-4px); border-color: var(--owl-accent); box-shadow: 0 8px 28px rgba(0,0,0,0.5); }
        .owl-quiz-result-img { width: 100%; height: 220px; object-fit: cover; display: block; background: var(--owl-surface-2); }
        .owl-quiz-result-body { padding: 10px 12px; }
        .owl-quiz-result-title { font-size: 13px; font-weight: 600; color: var(--owl-text); margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .owl-quiz-result-meta { font-size: 11.5px; color: var(--owl-text-faint); }

        /* ── Relax message ── */
        .owl-quiz-relax {
          padding: 8px 14px; border-radius: 8px; font-size: 12.5px;
          background: rgba(192,132,252,0.1); border: 1px solid var(--owl-border);
          color: var(--owl-text-sub); margin-bottom: 16px;
        }

        /* ── Loading ── */
        .owl-quiz-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 60px 0; }
      `}</style>

      <div className="owl-quiz-wrap">
        <h2 className="owl-quiz-heading">Quiz</h2>
        <p className="owl-quiz-sub">ตอบคำถามให้เราช่วยหามังงะที่เหมาะกับคุณ 🦉</p>

        {/* Progress bar */}
        <div className="owl-quiz-progress-track">
          <div className="owl-quiz-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* ── Step 0: Tags ── */}
        {step === 0 && (
          <div className="owl-quiz-card">
            <div className="owl-quiz-q">{STEPS[0].label}</div>
            <div className="owl-quiz-hint">{STEPS[0].sub}</div>
            <div className="owl-quiz-opts">
              {tagsOptions.length === 0
                ? <div className="owl-loader-wrap"><img src="/Owl-Book.png" className="owl-loader-img" alt="" /><div className="owl-loader-text">กำลังโหลด…</div></div>
                : tagsOptions.map(t => <OptionBtn key={t} active={answer.tags.includes(t)} onClick={() => onPick('tags', t)}>{t}</OptionBtn>)
              }
            </div>
            <div className="owl-quiz-nav">
              <button className="owl-quiz-btn-next" onClick={() => setStep(1)} disabled={answer.tags.length === 0}>ถัดไป</button>
              <button className="owl-quiz-btn-skip" onClick={() => setStep(1)}>ข้าม</button>
            </div>
          </div>
        )}

        {/* ── Step 1: Finished ── */}
        {step === 1 && (
          <div className="owl-quiz-card">
            <div className="owl-quiz-q">{STEPS[1].label}</div>
            <div className="owl-quiz-hint" />
            <div className="owl-quiz-opts">
              <OptionBtn active={answer.finished === 'finished'} onClick={() => onPick('finished', 'finished')}>จบแล้ว ✓</OptionBtn>
              <OptionBtn active={answer.finished === 'not_finished'} onClick={() => onPick('finished', 'not_finished')}>ยังไม่จบ</OptionBtn>
              <OptionBtn active={answer.finished === null} onClick={() => onPick('finished', null)}>ไม่ระบุ</OptionBtn>
            </div>
            <div className="owl-quiz-nav">
              <button className="owl-quiz-btn-next" onClick={() => setStep(2)}>ถัดไป</button>
              <button className="owl-quiz-btn-back" onClick={() => setStep(0)}>← กลับ</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Publisher ── */}
        {step === 2 && (
          <div className="owl-quiz-card">
            <div className="owl-quiz-q">{STEPS[2].label}</div>
            <div className="owl-quiz-hint">{STEPS[2].sub}</div>
            <div className="owl-quiz-opts" style={{ marginBottom: 24 }}>
              <div className="owl-dropdown">
                <button className={`owl-dropdown-btn${pubDropdownOpen ? ' open' : ''}`} onClick={() => setPubDropdownOpen(o => !o)}>
                  {answer.publisher || 'ไม่ระบุ'}
                </button>
                {pubDropdownOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setPubDropdownOpen(false)} />
                    <div className="owl-dropdown-menu">
                      {['', ...publishers].map(p => (
                        <div key={p || '__none__'} className={`owl-dropdown-item${answer.publisher === (p || null) ? ' selected' : ''}`}
                          onClick={() => { onPick('publisher', p || null); setPubDropdownOpen(false) }}>
                          {p || 'ไม่ระบุ'}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="owl-quiz-nav">
              <button className="owl-quiz-btn-next" onClick={() => setStep(3)}>ถัดไป</button>
              <button className="owl-quiz-btn-back" onClick={() => setStep(1)}>← กลับ</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Mood ── */}
        {step === 3 && (
          <div className="owl-quiz-card">
            <div className="owl-quiz-q">{STEPS[3].label}</div>
            <div className="owl-quiz-hint" />
            <div className="owl-quiz-opts">
              <OptionBtn active={answer.mood === 'light'} onClick={() => onPick('mood', 'light')}>☀️ สบายๆ</OptionBtn>
              <OptionBtn active={answer.mood === 'balance'} onClick={() => onPick('mood', 'balance')}>⚖️ กลางๆ</OptionBtn>
              <OptionBtn active={answer.mood === 'dark'} onClick={() => onPick('mood', 'dark')}>🌑 ดาร์ก</OptionBtn>
              <OptionBtn active={answer.mood === null} onClick={() => onPick('mood', null)}>ไม่ระบุ</OptionBtn>
            </div>
            <div className="owl-quiz-nav">
              <button className="owl-quiz-btn-next" onClick={() => setStep(4)}>ถัดไป</button>
              <button className="owl-quiz-btn-back" onClick={() => setStep(2)}>← กลับ</button>
            </div>
          </div>
        )}

        {/* ── Step 4: MC Gender ── */}
        {step === 4 && (
          <div className="owl-quiz-card">
            <div className="owl-quiz-q">{STEPS[4].label}</div>
            <div className="owl-quiz-hint" />
            <div className="owl-quiz-opts">
              <OptionBtn active={answer.mc_gender === 'male'} onClick={() => onPick('mc_gender', 'male')}>♂ ชาย</OptionBtn>
              <OptionBtn active={answer.mc_gender === 'female'} onClick={() => onPick('mc_gender', 'female')}>♀ หญิง</OptionBtn>
              <OptionBtn active={answer.mc_gender === 'both'} onClick={() => onPick('mc_gender', 'both')}>♂♀ ทั้งคู่</OptionBtn>
              <OptionBtn active={answer.mc_gender === null} onClick={() => onPick('mc_gender', null)}>ไม่ระบุ</OptionBtn>
            </div>
            <div className="owl-quiz-nav">
              <button className="owl-quiz-btn-next" onClick={runSearch}>ดูผลลัพธ์ ✨</button>
              <button className="owl-quiz-btn-back" onClick={() => setStep(3)}>← กลับ</button>
            </div>
          </div>
        )}

        {/* ── Step 5: Results ── */}
        {step === 5 && (
          <div className="owl-quiz-card">
            <div className="owl-quiz-q" style={{ marginBottom: 4 }}>ผลลัพธ์สำหรับคุณ ✨</div>

            {loading ? (
              <div className="owl-quiz-loading">
                <img src="/Owl-Book.png" className="owl-loader-img-lg" alt="" />
                <div className="owl-loader-text">กำลังค้นหามังงะที่เหมาะกับคุณ…</div>
              </div>
            ) : (
              <>
                {relaxMsg && <div className="owl-quiz-relax">💡 {relaxMsg}</div>}
                {results.length === 0 ? (
                  <div style={{ color: 'var(--owl-text-faint)', fontSize: 14, padding: '24px 0' }}>ไม่พบผลลัพธ์ ลองเปลี่ยนคำตอบดูนะ</div>
                ) : (
                  <div className="owl-quiz-results-grid">
                    {results.map(m => (
                      <div key={m.id} className="owl-quiz-result-card" onClick={() => openManga(m)}>
                        {m.imageUrl
                          ? <img src={m.imageUrl} alt={m.title} className="owl-quiz-result-img" />
                          : <div className="owl-quiz-result-img" />
                        }
                        <div className="owl-quiz-result-body">
                          <div className="owl-quiz-result-title">{m.title}</div>
                          <div className="owl-quiz-result-meta">{[m.mood, m.mc].filter(Boolean).join(' · ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="owl-quiz-btn-next" onClick={runSearch}>🔀 สุ่มมังงะที่เกี่ยวข้อง</button>
                  <button className="owl-quiz-btn-back" onClick={reset}>เริ่มใหม่ทั้งหมด</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          user={user}
          onClose={() => setSelectedManga(null)}
          onRequestAddToList={() => setShowAddForm(true)}
          showFavoriteButton={false}
          showProgressTab={false}
        />
      )}
      {showAddForm && selectedManga && (
        <AddToListForm mangaId={selectedManga.id} onClose={() => setShowAddForm(false)} onAdded={() => setShowAddForm(false)} />
      )}
    </div>
  )
}