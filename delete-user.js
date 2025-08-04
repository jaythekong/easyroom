import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role
const supabase = createClient(
  'https://yjdrwwelnuyuifjqfebv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZHJ3d2VsbnV5dWlmanFmZWJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA3MzE3NiwiZXhwIjoyMDY4NjQ5MTc2fQ.dmGNkx4mfNjUlB-OYojPqWwpGZrpPCLk9rSYT-QXTWQ'
)

// Call the edge function to delete user
const { data, error } = await supabase.functions.invoke('delete-auth-user', {
  body: {
    email: 'romneath.song@gmail.com'
  }
})

if (error) {
  console.error('Error calling delete function:', error)
} else {
  console.log('Deletion result:', data)
}