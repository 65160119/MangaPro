import React, { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { useAuth } from '../context/Auth'

function PostCard({post, onDelete, onAddComment, user}){
  const [commentText, setCommentText] = useState('')
  return (
    <div style={{border:'1px solid #eee', padding:12, borderRadius:8, marginBottom:12}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <strong>{post.title}</strong>
          <div style={{fontSize:12,color:'#666'}}>{post.user_email || 'Anonymous'} · {new Date(post.created_at).toLocaleString()}</div>
        </div>
        {user && post.user_id === user.id && (
          <button onClick={()=>onDelete(post.id)} style={{background:'transparent',border:'none',color:'#c00'}}>Delete</button>
        )}
      </div>
      <div style={{marginTop:8, whiteSpace:'pre-wrap'}}>{post.content}</div>

      <div style={{marginTop:10}}>
        {(post.comments || []).map(c=> (
          <div key={c.id} style={{padding:8, background:'#fafafa', borderRadius:6, marginBottom:6}}>
            <div style={{fontSize:13}}><strong>{c.user_email || 'Anonymous'}</strong> <span style={{color:'#666', fontSize:12}}>{new Date(c.created_at).toLocaleString()}</span></div>
            <div style={{marginTop:6}}>{c.content}</div>
          </div>
        ))}

        {user ? (
          <form onSubmit={e=>{ e.preventDefault(); if(!commentText.trim()) return; onAddComment(post.id, commentText); setCommentText('') }} style={{display:'flex', gap:8, marginTop:8}}>
            <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Add a comment" style={{flex:1,padding:8,borderRadius:6,border:'1px solid #e5e7eb'}} />
            <button style={{padding:'8px 10px', borderRadius:6}}>Reply</button>
          </form>
        ) : (
          <div style={{marginTop:8,fontSize:13,color:'#666'}}>Please login to comment.</div>
        )}
      </div>
    </div>
  )
}

export default function Forum(){
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState(null)

  useEffect(()=>{ fetchPosts() }, [])

  async function fetchPosts(){
    setLoading(true)
    // 1) get posts + comments (no relation alias)
    const { data: postsData, error: postsErr } = await supabase
      .from('Forum_post')
      .select('*, Forum_comment(*)')
      .order('created_at', { ascending:false })

    if (postsErr){ setError(postsErr.message); setLoading(false); return }

    const postsList = postsData || []

    // 2) gather user_ids and try to fetch profile emails from `profiles` table
    const userIds = [...new Set(postsList.map(p => p.user_id).filter(Boolean))]
    let profilesMap = {}
    if (userIds.length > 0){
      const { data: profilesData, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds)

      if (!profilesErr && profilesData){
        profilesMap = Object.fromEntries(profilesData.map(r => [r.id, r.email]))
      }
    }

    const normalized = postsList.map(p => ({
      ...p,
      user_email: profilesMap[p.user_id] ?? p.user_email ?? null,
      comments: (p.Forum_comment || []).map(c=> ({...c}))
    }))

    setPosts(normalized)
    setLoading(false)
  }

  async function handleCreate(e){
    e.preventDefault(); setError(null)
    if (!user) { setError('You must be logged in to create posts'); return }
    if (!title.trim() || !content.trim()) { setError('Title and content required'); return }

    const insert = {
      title: title.trim(),
      content: content.trim(),
      user_id: user.id
    }
    const { data, error } = await supabase.from('Forum_post').insert([insert]).select().single()
    if (error){ setError(error.message); return }
    setTitle(''); setContent('')
    fetchPosts()
  }

  async function handleDelete(postId){
    setError(null)
    const { error } = await supabase.from('Forum_post').delete().eq('id', postId)
    if (error){ setError(error.message); return }
    setPosts(p => p.filter(x=> x.id !== postId))
  }

  async function handleAddComment(postId, text){
    if (!user) return setError('Not authenticated')
    const insert = { content: text.trim(), post_id: postId, user_id: user.id }
    const { data, error } = await supabase.from('Forum_comment').insert([insert]).select().single()
    if (error){ setError(error.message); return }
    fetchPosts()
  }

  return (
    <div style={{padding:20, maxWidth:900, margin:'0 auto'}}>
      <h2>ฟอรัม</h2>
      {error && <div style={{color:'red', marginBottom:8}}>{error}</div>}

      {user ? (
        <form onSubmit={handleCreate} style={{display:'flex', flexDirection:'column', gap:8, marginBottom:16}}>
          <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} style={{padding:10,borderRadius:8,border:'1px solid #e5e7eb'}} />
          <textarea placeholder="Write your post..." value={content} onChange={e=>setContent(e.target.value)} rows={6} style={{padding:10,borderRadius:8,border:'1px solid #e5e7eb'}} />
          <div style={{display:'flex', gap:8}}>
            <button style={{padding:'10px 12px', borderRadius:8, background:'#0b79ff', color:'#fff', border:'none'}}>Create Post</button>
          </div>
        </form>
      ) : (
        <div style={{marginBottom:16}}>Please <a href="/login">login</a> to create posts.</div>
      )}

      {loading ? <div>Loading posts…</div> : (
        <div>
          {posts.length === 0 && <div style={{color:'#666'}}>No posts yet.</div>}
          {posts.map(p=> (
            <PostCard key={p.id} post={p} onDelete={handleDelete} onAddComment={handleAddComment} user={user} />
          ))}
        </div>
      )}
    </div>
  )
}
