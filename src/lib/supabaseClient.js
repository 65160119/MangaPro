import { createClient } from '@supabase/supabase-js'

// Uses Vite env variables. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Support multiple possible env var names (fallback to publishable default key if present)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || import.meta.env.VITE_SUPABASE_ANON

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
