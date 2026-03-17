import React, { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { useAuth } from '../context/Auth'
import UserProfileBanner from '../components/UserProfileBanner'
import OwlbookStyles from '../components/OwlbookStyles'

function PostCard({ post, onDelete, onAddComment, onDeleteComment, user, onUserClick }) {
  const [commentText, setCommentText] = useState('')
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="owl-post-card">
      {/* Post header */}
      <div className="owl-post-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="owl-post-title" onClick={() => setExpanded(e => !e)}>
            {post.title}
            <span className="owl-post-toggle">{expanded ? '▲' : '▼'}</span>
          </div>
          <div className="owl-post-meta">
            <span
              className={`owl-post-author${onUserClick && post.user_id ? ' clickable' : ''}`}
              onClick={() => { if (onUserClick && post.user_id) onUserClick(post.user_id, post.user_name || 'Anonymous') }}
            >
              {post.user_name || 'Anonymous'}
            </span>
            <span className="owl-post-dot">·</span>
            <span>{new Date(post.created_at).toLocaleString('th-TH')}</span>
            <span className="owl-post-dot">·</span>
            <span>{(post.comments || []).length} ความคิดเห็น</span>
          </div>
        </div>
        {user && post.user_id === user.id && (
          <button onClick={() => onDelete(post.id)} className="owl-post-delete">ลบ</button>
        )}
      </div>

      {/* Post body (expandable) */}
      {expanded && (
        <>
          <div className="owl-post-body">{post.content}</div>

          {/* Comments */}
          <div className="owl-comments">
            {(post.comments || []).map(c => (
              <div key={c.id} className="owl-comment">
                <div className="owl-comment-meta">
                  <span
                    className={`owl-post-author${onUserClick && c.user_id ? ' clickable' : ''}`}
                    onClick={() => { if (onUserClick && c.user_id) onUserClick(c.user_id, c.user_name || 'Anonymous') }}
                  >
                    {c.user_name || 'Anonymous'}
                  </span>
                  <span className="owl-post-dot">·</span>
                  <span style={{ fontSize: 12, color: 'var(--owl-text-faint)' }}>{new Date(c.created_at).toLocaleString('th-TH')}</span>
                  {user && c.user_id === user.id && (
                    <button
                      className="owl-comment-delete"
                      onClick={() => onDeleteComment && onDeleteComment(c.id)}
                    >
                      ลบ
                    </button>
                  )}
                </div>
                <div className="owl-comment-body">{c.content}</div>
              </div>
            ))}

            {user ? (
              <div className="owl-comment-form">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="เขียนความคิดเห็น…"
                  className="owl-input owl-comment-input"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (!commentText.trim()) return
                      onAddComment(post.id, commentText)
                      setCommentText('')
                    }
                  }}
                />
                <button
                  className="owl-btn owl-btn-add"
                  onClick={() => {
                    if (!commentText.trim()) return
                    onAddComment(post.id, commentText)
                    setCommentText('')
                  }}
                >
                  ตอบ
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--owl-text-faint)', marginTop: 10 }}>โปรดล็อกอินเพื่อแสดงความคิดเห็น</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function Forum() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState(null)
  const [profileUser, setProfileUser] = useState(null)
  const [spoilerDismissed, setSpoilerDismissed] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    try { document.body.style.overflow = spoilerDismissed ? '' : 'hidden' } catch {}
    return () => { try { document.body.style.overflow = '' } catch {} }
  }, [spoilerDismissed])

  useEffect(() => { fetchPosts() }, [])

  async function fetchPosts() {
    setLoading(true)
    const { data: postsData, error: postsErr } = await supabase
      .from('Forum_post')
      .select('*, Forum_comment(*)')
      .order('created_at', { ascending: false })

    if (postsErr) { setError(postsErr.message); setLoading(false); return }

    const postsList = postsData || []
    const userIds = [...new Set(postsList.flatMap(p => [p.user_id].concat((p.Forum_comment || []).map(c => c.user_id))).filter(Boolean))]
    let profilesMap = {}
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesErr } = await supabase
        .from('profiles').select('id, user_name').in('id', userIds)
      if (!profilesErr && profilesData)
        profilesMap = Object.fromEntries(profilesData.map(r => [r.id, r.user_name]))
    }

    const normalized = postsList.map(p => ({
      ...p,
      user_name: profilesMap[p.user_id] ?? null,
      comments: (p.Forum_comment || []).map(c => ({ ...c, user_name: profilesMap[c.user_id] ?? null }))
    }))
    setPosts(normalized)
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault(); setError(null)
    if (!user) { setError('โปรดล็อกอินก่อนโพสต์'); return }
    if (!title.trim() || !content.trim()) { setError('กรุณากรอกหัวข้อและเนื้อหา'); return }
    const { error } = await supabase.from('Forum_post').insert([{ title: title.trim(), content: content.trim(), user_id: user.id }]).select().single()
    if (error) { setError(error.message); return }
    setTitle(''); setContent(''); setCreateOpen(false)
    await fetchPosts()
  }

  async function handleDelete(postId) {
    setError(null)
    const { error } = await supabase.from('Forum_post').delete().eq('id', postId)
    if (error) { setError(error.message); return }
    setPosts(p => p.filter(x => x.id !== postId))
  }

  async function handleAddComment(postId, text) {
    if (!user) return setError('Not authenticated')
    const { error } = await supabase.from('Forum_comment').insert([{ content: text.trim(), post_id: postId, user_id: user.id }]).select().single()
    if (error) { setError(error.message); return }
    await fetchPosts()
  }

  async function handleDeleteComment(commentId) {
    setError(null)
    const { error } = await supabase.from('Forum_comment').delete().eq('id', commentId)
    if (error) { setError(error.message); return }
    await fetchPosts()
  }

  return (
    <div className="owl-catalog">
      <OwlbookStyles />
      <style>{`
        /* ── Forum-specific styles ── */
        .owl-forum-wrap { max-width: 800px; margin: 0 auto; }

        .owl-forum-topbar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 28px;
        }
        .owl-forum-heading {
          font-family: 'DM Serif Display', serif; font-size: 1.8rem;
          color: var(--owl-purple-700); margin: 0;
        }

        /* ── Create post panel ── */
        .owl-create-panel {
          background: var(--owl-surface); border: 1.5px solid var(--owl-border);
          border-radius: 14px; padding: 20px; margin-bottom: 28px;
          animation: owl-fadein 0.2s ease;
        }
        @keyframes owl-fadein { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }
        .owl-create-title-input {
          width: 100%; padding: 10px 14px; border-radius: 10px;
          border: 1.5px solid var(--owl-border); background: var(--owl-bg);
          font-size: 14px; color: var(--owl-text); outline: none;
          font-family: 'DM Sans', sans-serif; margin-bottom: 10px;
          transition: border 0.2s;
        }
        .owl-create-title-input:focus { border-color: var(--owl-accent); }
        .owl-create-title-input::placeholder { color: var(--owl-text-faint); }
        .owl-create-textarea {
          width: 100%; padding: 10px 14px; border-radius: 10px;
          border: 1.5px solid var(--owl-border); background: var(--owl-bg);
          font-size: 14px; color: var(--owl-text); outline: none; resize: vertical;
          font-family: 'DM Sans', sans-serif; min-height: 120px; margin-bottom: 12px;
          transition: border 0.2s; line-height: 1.6;
        }
        .owl-create-textarea:focus { border-color: var(--owl-accent); }
        .owl-create-textarea::placeholder { color: var(--owl-text-faint); }
        .owl-create-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .owl-btn-cancel {
          padding: 7px 14px; border-radius: 10px; font-size: 13px; font-weight: 500;
          cursor: pointer; border: 1.5px solid var(--owl-border); background: transparent;
          color: var(--owl-text-faint); font-family: 'DM Sans', sans-serif; transition: all 0.15s;
        }
        .owl-btn-cancel:hover { color: var(--owl-text-sub); border-color: var(--owl-text-faint); }

        /* ── New post button ── */
        .owl-btn-new-post {
          padding: 8px 18px; border-radius: 10px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: 1.5px solid var(--owl-accent); background: transparent;
          color: var(--owl-accent); font-family: 'DM Sans', sans-serif; transition: all 0.15s;
          white-space: nowrap;
        }
        .owl-btn-new-post:hover { background: var(--owl-accent); color: var(--owl-bg); }

        /* ── Post card ── */
        .owl-post-card {
          background: var(--owl-surface); border: 1.5px solid var(--owl-border);
          border-radius: 14px; margin-bottom: 12px; overflow: hidden;
          transition: border-color 0.2s;
        }
        .owl-post-card:hover { border-color: var(--owl-purple-200); }
        .owl-post-header {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 16px 18px; cursor: default;
        }
        .owl-post-title {
          font-size: 15px; font-weight: 600; color: var(--owl-purple-700);
          cursor: pointer; display: flex; align-items: center; gap: 8px;
          line-height: 1.4; margin-bottom: 5px;
        }
        .owl-post-title:hover { color: var(--owl-accent); }
        .owl-post-toggle { font-size: 10px; color: var(--owl-text-faint); flex-shrink: 0; }
        .owl-post-meta { font-size: 12.5px; color: var(--owl-text-faint); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .owl-post-author { color: var(--owl-text-sub); font-weight: 500; }
        .owl-post-author.clickable { color: var(--owl-accent); cursor: pointer; }
        .owl-post-author.clickable:hover { text-decoration: underline; }
        .owl-post-dot { color: var(--owl-border); }
        .owl-post-delete {
          flex-shrink: 0; padding: 4px 10px; border-radius: 7px; font-size: 12px;
          border: 1px solid var(--owl-border); background: transparent;
          color: var(--owl-text-faint); cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
        }
        .owl-post-delete:hover { border-color: var(--owl-red); color: var(--owl-red); }

        /* ── Post body ── */
        .owl-post-body {
          padding: 0 18px 16px; font-size: 14px; line-height: 1.7;
          color: var(--owl-text); white-space: pre-wrap;
          border-top: 1px solid var(--owl-border);
          padding-top: 14px;
        }

        /* ── Comments ── */
        .owl-comments { padding: 0 18px 16px; }
        .owl-comment {
          padding: 10px 14px; background: var(--owl-bg); border-radius: 10px;
          margin-bottom: 8px; border: 1px solid var(--owl-border);
        }
        .owl-comment-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; font-size: 12.5px; color: var(--owl-text-faint); }
        .owl-comment-delete {
          margin-left: auto; padding: 2px 8px; border-radius: 6px; font-size: 11px;
          border: 1px solid var(--owl-border); background: transparent;
          color: var(--owl-text-faint); cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
        }
        .owl-comment-delete:hover { border-color: var(--owl-red); color: var(--owl-red); }
        .owl-comment-body { font-size: 13.5px; color: var(--owl-text); line-height: 1.55; }
        .owl-comment-form { display: flex; gap: 8px; margin-top: 10px; }
        .owl-comment-input { flex: 1; min-width: 0; }

        /* ── Spoiler overlay ── */
        .owl-spoiler-overlay {
          position: fixed; inset: 0; background: rgba(10,5,20,0.85);
          z-index: 9999; display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(6px);
        }
        .owl-spoiler-modal {
          background: var(--owl-surface); border: 1.5px solid var(--owl-border);
          border-radius: 16px; padding: 28px 32px; max-width: 480px; width: 92%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.7);
        }
        .owl-spoiler-icon { font-size: 2.5rem; margin-bottom: 12px; }
        .owl-spoiler-title {
          font-family: 'DM Serif Display', serif; font-size: 1.4rem;
          color: var(--owl-purple-700); margin: 0 0 10px;
        }
        .owl-spoiler-text { font-size: 14px; color: var(--owl-text-sub); line-height: 1.6; margin: 0 0 20px; }
        .owl-btn-accept {
          padding: 10px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; border: none; background: var(--owl-accent);
          color: var(--owl-bg); font-family: 'DM Sans', sans-serif; transition: opacity 0.15s;
        }
        .owl-btn-accept:hover { opacity: 0.88; }

        /* ── Error ── */
        .owl-forum-error {
          padding: 10px 14px; border-radius: 10px; margin-bottom: 16px;
          background: rgba(240,112,128,0.12); border: 1px solid var(--owl-red);
          color: var(--owl-red); font-size: 13.5px;
        }

        /* ── Empty state ── */
        .owl-forum-empty {
          text-align: center; padding: 60px 20px;
          color: var(--owl-text-faint); font-size: 15px;
        }
        .owl-forum-empty-icon { font-size: 3rem; margin-bottom: 12px; }
      `}</style>

      {/* Spoiler warning overlay */}
      {!spoilerDismissed && (
        <div className="owl-spoiler-overlay">
          <div className="owl-spoiler-modal" role="dialog" aria-modal="true">
            <div className="owl-spoiler-icon">⚠️</div>
            <h3 className="owl-spoiler-title">คำเตือน: อาจมีสปอย</h3>
            <p className="owl-spoiler-text">เนื้อหาในฟอรัมอาจเปิดเผยเนื้อหาสำคัญ (spoilers) โปรดกดปุ่มยอมรับเพื่อดำเนินการต่อ</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="owl-btn-accept" onClick={() => setSpoilerDismissed(true)}>ยอมรับ</button>
            </div>
          </div>
        </div>
      )}

      <div className="owl-forum-wrap">
        {/* Top bar */}
        <div className="owl-forum-topbar">
          <h2 className="owl-forum-heading">ฟอรัม</h2>
          {user && !createOpen && (
            <button className="owl-btn-new-post" onClick={() => setCreateOpen(true)}>
              + โพสต์ใหม่
            </button>
          )}
        </div>

        {/* Error */}
        {error && <div className="owl-forum-error">{error}</div>}

        {/* Create post panel */}
        {user && createOpen && (
          <div className="owl-create-panel">
            <input
              placeholder="หัวข้อโพสต์…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="owl-create-title-input"
            />
            <textarea
              placeholder="เขียนเนื้อหาโพสต์…"
              value={content}
              onChange={e => setContent(e.target.value)}
              className="owl-create-textarea"
            />
            <div className="owl-create-actions">
              <button className="owl-btn-cancel" onClick={() => { setCreateOpen(false); setTitle(''); setContent(''); setError(null) }}>ยกเลิก</button>
              <button className="owl-btn owl-btn-add" onClick={handleCreate}>โพสต์</button>
            </div>
          </div>
        )}

        {!user && (
          <div style={{ marginBottom: 20, fontSize: 14, color: 'var(--owl-text-faint)' }}>
            <a href="/login" style={{ color: 'var(--owl-accent)' }}>ล็อกอิน</a> เพื่อร่วมพูดคุยในฟอรัม
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="owl-loading">กำลังโหลดโพสต์…</div>
        ) : posts.length === 0 ? (
          <div className="owl-forum-empty">
            <div className="owl-forum-empty-icon">🦉</div>
            <div>ยังไม่มีโพสต์ในฟอรัม เป็นคนแรกที่โพสต์สิ!</div>
          </div>
        ) : (
          posts.map(p => (
            <PostCard
              key={p.id}
              post={p}
              onDelete={handleDelete}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              user={user}
              onUserClick={(uid, name) => setProfileUser({ id: uid, name })}
            />
          ))
        )}
      </div>

      {profileUser && (
        <UserProfileBanner
          userId={profileUser.id}
          displayName={profileUser.name}
          onClose={() => setProfileUser(null)}
        />
      )}
    </div>
  )
}