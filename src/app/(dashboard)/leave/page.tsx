import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeaveClient from './LeaveClient'

export const metadata = { title: 'Leave Request — HR Work Manager' }

export default async function LeavePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: leaveHistory } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return <LeaveClient userId={user.id} profile={profile} leaveHistory={leaveHistory ?? []} />
}
