import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://dnrqttdcopljvucbfiew.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRucnF0dGRjb3BsanZ1Y2JmaWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjYwNTQsImV4cCI6MjA5MTI0MjA1NH0.5ZPxbyGRAn-EebpkTPAtDYIMI2RhPgYffOtb3nH4yt4'
)

// Busca o ID do admin
const { data: adminAuth } = await supabase.auth.signInWithPassword({
  email: 'osmane.silvamarques@gmail.com',
  password: 'granja123'
})

const adminId = adminAuth?.user?.id
console.log('Admin ID:', adminId)

if (adminId) {
  // Insere o admin na tabela (se ainda não existir)
  const { error } = await supabase.from('usuarios_plano').upsert({
    id: adminId,
    nome: 'Osmane',
    email: 'osmane.silvamarques@gmail.com',
    whatsapp: '31996031369',
    status: 'aprovado',
    is_admin: true,
    data_aprovacao: new Date().toISOString(),
    data_expiracao: null
  })
  if (error) console.log('Erro ao inserir admin:', error.message)
  else console.log('Admin cadastrado com sucesso!')
}
