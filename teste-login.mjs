import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://dnrqttdcopljvucbfiew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRucnF0dGRjb3BsanZ1Y2JmaWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjYwNTQsImV4cCI6MjA5MTI0MjA1NH0.5ZPxbyGRAn-EebpkTPAtDYIMI2RhPgYffOtb3nH4yt4'
)

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'osmane.silvamarques@gmail.com',
  password: 'granja123'
})

console.log('ERRO:', error)
console.log('DATA:', data?.user?.email)
