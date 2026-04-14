import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { ElioChat } from '@monprojetpro/module-elio'

export default async function ElioHubPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <ElioChat
        dashboardType="hub"
        userId={user?.id ?? ''}
      />
    </div>
  )
}
