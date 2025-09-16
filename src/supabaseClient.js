import { createClient } from '@supabase/supabase-js'  //this is our SupaBase url and Anon Key


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
console.log(supabaseUrl, supabaseKey);