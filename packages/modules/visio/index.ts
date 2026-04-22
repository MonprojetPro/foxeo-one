// Visio Module
export { manifest } from './manifest'

// Components
export { MeetingList } from './components/meeting-list'
export { MeetingListSkeleton } from './components/meeting-list-skeleton'
export { MeetingStatusBadge } from './components/meeting-status-badge'
export { MeetingScheduleDialog } from './components/meeting-schedule-dialog'
export { CalcomBookingWidget } from './components/calcom-booking-widget'

// Recording Components (Story 5.2)
export { RecordingPlayer } from './components/recording-player'
export { RecordingList } from './components/recording-list'
export { RecordingListPage } from './components/recording-list-page'
export { TranscriptViewer } from './components/transcript-viewer'
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
export { useMeetingRecordings } from './hooks/use-meeting-recordings'
export { usePostMeetingDialog } from './hooks/use-post-meeting-dialog'
export type { PostMeetingDialogState, UsePostMeetingDialogReturn } from './hooks/use-post-meeting-dialog'

// Actions
export { getMeetings } from './actions/get-meetings'
export { createMeeting } from './actions/create-meeting'
export { startMeeting } from './actions/start-meeting'
export { endMeeting } from './actions/end-meeting'
export { getMeetingRecordings } from './actions/get-meeting-recordings'
export { downloadRecording } from './actions/download-recording'
export { downloadTranscript } from './actions/download-transcript'

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

// Utils (Story 5.2)
export { parseSrt, formatTimestamp } from './utils/parse-srt'
export type { SrtEntry } from './utils/parse-srt'

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
  DownloadRecordingInput,
  DownloadTranscriptInput,
} from './types/recording.types'

export { TranscriptionStatusValues } from './types/recording.types'
