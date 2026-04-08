// Email Module — Story 3.9
export { ClientEmailTab } from './components/client-email-tab'
export { EmailComposer } from './components/email-composer'
export { GmailConnectBanner } from './components/gmail-connect-banner'
export { EmailThreadList } from './components/email-thread-list'
export { EmailThreadView } from './components/email-thread-view'

export { getGmailStatus } from './actions/get-gmail-status'
export { revokeGmail } from './actions/revoke-gmail'
export { getClientThreads } from './actions/get-client-threads'
export { getThreadMessages } from './actions/get-thread-messages'
export { sendEmail } from './actions/send-email'
export { trashEmail } from './actions/trash-email'

export { SendEmailInput } from './types/email.types'
export type { GmailStatus, EmailThread, EmailMessage } from './types/email.types'
