// Visio Module
export { manifest } from './manifest'

// Components
export { MeetingList } from './components/meeting-list'
export { MeetingListSkeleton } from './components/meeting-list-skeleton'
export { MeetingStatusBadge } from './components/meeting-status-badge'
export { MeetingScheduleDialog } from './components/meeting-schedule-dialog'
export { CalcomBookingWidget } from './components/calcom-booking-widget'
export { ClientVisioTab } from './components/client-visio-tab'
export type { VisioRecipient, SendMeetLinkFn } from './components/client-visio-tab'

// Recording Components
export { RecordingList } from './components/recording-list'
export { RecordingListPage } from './components/recording-list-page'
export { RecordingStatusBadge } from './components/recording-status-badge'

// Post-Meeting Dialog Components (Story 5.4)
export { PostMeetingDialog } from './components/post-meeting-dialog'
export { CreateLabForm } from './components/create-lab-form'
export { SendResourcesForm } from './components/send-resources-form'
export { ScheduleFollowUpForm } from './components/schedule-follow-up-form'
export { NotInterestedForm } from './components/not-interested-form'
export type { ParcoursTemplate } from './components/create-lab-form'
export type { ProspectDocument } from './components/send-resources-form'

// Hooks
export { useMeetings } from './hooks/use-meetings'
export { useCoachingInfo, useCoachingRealtime, coachingInfoKey } from './hooks/use-coaching'
export { useMeetingRecordings } from './hooks/use-meeting-recordings'
export { usePostMeetingDialog } from './hooks/use-post-meeting-dialog'
export type { PostMeetingDialogState, UsePostMeetingDialogReturn } from './hooks/use-post-meeting-dialog'

// Actions
export { getMeetings } from './actions/get-meetings'
export { getCoachingInfo } from './actions/get-coaching-info'
export type { ClientCoachingInfo } from './actions/get-coaching-info'
export { createMeeting } from './actions/create-meeting'
export { startMeeting } from './actions/start-meeting'
export { endMeeting } from './actions/end-meeting'
export { getMeetingRecordings } from './actions/get-meeting-recordings'
export { syncMeetingResults } from './actions/sync-meeting-results'
export { downloadTranscript } from './actions/download-transcript'
export { downloadRecording } from './actions/download-recording'
export { cancelMeeting } from './actions/cancel-meeting'
export { rescheduleMeeting } from './actions/reschedule-meeting'

// Post-Meeting Actions (Story 5.4)
export { createLabOnboarding } from './actions/create-lab-onboarding'
export { sendProspectResources } from './actions/send-prospect-resources'
export { scheduleFollowUp } from './actions/schedule-follow-up'
export { markProspectNotInterested } from './actions/mark-prospect-not-interested'
export { NotInterestedReasonValues } from './actions/post-meeting-schemas'
export type { CreateLabOnboardingInput, LabOnboardingResult } from './actions/create-lab-onboarding'
export type { SendProspectResourcesInput, ProspectResourcesResult } from './actions/send-prospect-resources'
export type { ScheduleFollowUpInput, FollowUpResult } from './actions/schedule-follow-up'
export type { MarkProspectNotInterestedInput, NotInterestedReason } from './actions/mark-prospect-not-interested'

// Récupération des résultats de visio (T-050) — cœur partagé par la Server
// Action « Récupérer maintenant » et par le cron de rattrapage du Hub.
export { syncMeetingResultsCore, getGoogleAccessToken } from './lib/meeting-results-sync'
export type { MeetingSyncOutcome, SyncReason } from './lib/meeting-results-sync'
export {
  readTranscriptSyncState,
  shouldAttemptTranscriptSync,
  transcriptSyncReferenceDate,
  canSyncMeetingResults,
  hasExceededGiveUpDelay,
  describeTranscriptSyncState,
  TRANSCRIPT_SYNC_GIVE_UP_HOURS,
} from './utils/transcript-sync-state'
export type { TranscriptSyncState, SyncCandidateMeeting } from './utils/transcript-sync-state'

// Utils (Story 5.4)
export { generateResourceLinks } from './utils/generate-resource-links'
export type { ResourceLink } from './utils/generate-resource-links'

// Types
export type {
  Meeting,
  MeetingDB,
  MeetingStatus,
  MeetingType,
  CreateMeetingInput,
  StartMeetingInput,
  EndMeetingInput,
  GetMeetingsInput,
} from './types/meeting.types'

export { MeetingStatusValues, MeetingTypeValues } from './types/meeting.types'

export type {
  MeetingRecording,
  MeetingRecordingDB,
  TranscriptionStatus,
  GetMeetingRecordingsInput,
} from './types/recording.types'

export { TranscriptionStatusValues } from './types/recording.types'
