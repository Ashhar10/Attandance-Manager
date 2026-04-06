import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HolidaysClient from './HolidaysClient'

export const metadata = { title: 'Holidays — HR Work Manager' }

export default async function HolidaysPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: holidays } = await supabase
    .from('company_holidays')
    .select('*')
    .order('date', { ascending: true })

  return <HolidaysClient profile={profile} initialHolidays={holidays ?? []} />
}
