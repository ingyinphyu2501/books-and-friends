import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = 'https://kzbaigemclyrdbtaspcb.supabase.co'
const supabaseAnonKey = 'sb_publishable_ADc-5NJkULSVpcN209TlvQ_AoCYI8sD'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
