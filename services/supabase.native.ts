import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = "https://uzhahidkajpoefmrasqr.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6aGFoaWRrYWpwb2VmbXJhc3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjkxNzEsImV4cCI6MjA4NzM0NTE3MX0.rKCzvu4AGglf2b6RcaWml6uLNqlS8KiaEdHHpKWWeNg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
