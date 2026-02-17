import supabase from './supabaseClient'

export async function addToList(userId, mangaId, opts = {}){
  if (!userId || !mangaId) throw new Error('Missing userId or mangaId')
  const status = opts.status || 'planned'
  const progress = typeof opts.progress === 'undefined' ? null : opts.progress
  return supabase.from('user_manga_list').insert([{ user_id: userId, manga_id: mangaId, status, progress }])
}

export async function getList(userId){
  if (!userId) return { data: [], error: null }
  return supabase.from('user_manga_list').select('id, user_id, manga_id, status, progress, created_at').eq('user_id', userId)
}

export async function updateEntry(id, updates){
  if (!id) throw new Error('Missing id')
  return supabase.from('user_manga_list').update(updates).eq('id', id)
}

export async function removeEntry(id){
  if (!id) throw new Error('Missing id')
  return supabase.from('user_manga_list').delete().eq('id', id)
}

export default {
  addToList, getList, updateEntry, removeEntry
}
