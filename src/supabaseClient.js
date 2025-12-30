// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// 1. Supabase 대시보드 -> Project Settings -> API 메뉴에서 확인 가능
const supabaseUrl = 'https://brlnhhiuzmbtpdbhzbkv.supabase.co' 
const supabaseKey = 'sb_publishable_jjywGFRrRy0wvnscuQAwjA_klj4dfzY'

export const supabase = createClient(supabaseUrl, supabaseKey)