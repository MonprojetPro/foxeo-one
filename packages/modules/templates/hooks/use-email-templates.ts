import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import type { EmailTemplate } from '../actions/save-email-template'

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async (): Promise<EmailTemplate[]> => {
      const supabase = createBrowserSupabaseClient()

      const { data, error } = await supabase
        .from('email_templates')
        .select('id, template_key, subject, body, variables, created_at, updated_at')
        .order('template_key', { ascending: true })

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        templateKey: row.template_key,
        subject: row.subject,
        body: row.body,
        variables: (row.variables as string[]) ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    },
  })
}
