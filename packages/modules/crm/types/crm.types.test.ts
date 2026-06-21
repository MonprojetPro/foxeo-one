import { describe, it, expect } from 'vitest'
import {
  Reminder,
  CreateReminderInput,
  UpdateReminderInput,
  ToggleReminderCompleteInput,
  ReminderFilterEnum,
  PortfolioStats,
  GraduationRate,
  ClientTimeEstimate,
  MrrInfo,
  ClientStatusEnum,
  SuspendClientInput,
  ReactivateClientInput,
  Client,
  UpgradeClientInput,
} from './crm.types'

describe('Reminder Types & Schemas', () => {
  describe('Reminder schema', () => {
    it('validates a complete reminder object', () => {
      const validReminder = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        operatorId: '123e4567-e89b-12d3-a456-426614174001',
        clientId: '123e4567-e89b-12d3-a456-426614174002',
        title: 'Call client',
        description: 'Discuss project scope',
        dueDate: new Date().toISOString(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = Reminder.safeParse(validReminder)
      expect(result.success).toBe(true)
    })

    it('validates reminder with nullable clientId', () => {
      const reminderWithoutClient = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        operatorId: '123e4567-e89b-12d3-a456-426614174001',
        clientId: null,
        title: 'General task',
        description: null,
        dueDate: new Date().toISOString(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = Reminder.safeParse(reminderWithoutClient)
      expect(result.success).toBe(true)
    })

    it('rejects reminder without required title', () => {
      const invalidReminder = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        operatorId: '123e4567-e89b-12d3-a456-426614174001',
        clientId: null,
        title: '',
        dueDate: new Date().toISOString(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = Reminder.safeParse(invalidReminder)
      expect(result.success).toBe(false)
    })

    it('rejects reminder with invalid UUID', () => {
      const invalidReminder = {
        id: 'not-a-uuid',
        operatorId: '123e4567-e89b-12d3-a456-426614174001',
        clientId: null,
        title: 'Task',
        dueDate: new Date().toISOString(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = Reminder.safeParse(invalidReminder)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateReminderInput schema', () => {
    it('validates valid create input', () => {
      const validInput = {
        title: 'New reminder',
        description: 'Do this task',
        dueDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
        clientId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = CreateReminderInput.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('validates create input without optional fields', () => {
      const minimalInput = {
        title: 'Task',
        dueDate: new Date().toISOString(),
      }

      const result = CreateReminderInput.safeParse(minimalInput)
      expect(result.success).toBe(true)
    })

    it('rejects title longer than 200 characters', () => {
      const invalidInput = {
        title: 'a'.repeat(201),
        dueDate: new Date().toISOString(),
      }

      const result = CreateReminderInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('200')
      }
    })

    it('rejects description longer than 1000 characters', () => {
      const invalidInput = {
        title: 'Task',
        description: 'a'.repeat(1001),
        dueDate: new Date().toISOString(),
      }

      const result = CreateReminderInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('1000')
      }
    })

    it('rejects empty title', () => {
      const invalidInput = {
        title: '',
        dueDate: new Date().toISOString(),
      }

      const result = CreateReminderInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects invalid date format', () => {
      const invalidInput = {
        title: 'Task',
        dueDate: '2024-13-45', // Invalid date
      }

      const result = CreateReminderInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateReminderInput schema', () => {
    it('validates update with all optional fields', () => {
      const validInput = {
        reminderId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Updated title',
        description: 'Updated description',
        dueDate: new Date().toISOString(),
      }

      const result = UpdateReminderInput.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('validates update with only reminderId', () => {
      const minimalInput = {
        reminderId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = UpdateReminderInput.safeParse(minimalInput)
      expect(result.success).toBe(true)
    })

    it('validates update with nullable description', () => {
      const input = {
        reminderId: '123e4567-e89b-12d3-a456-426614174000',
        description: null,
      }

      const result = UpdateReminderInput.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects update without reminderId', () => {
      const invalidInput = {
        title: 'Updated',
      }

      const result = UpdateReminderInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects title longer than 200 characters', () => {
      const invalidInput = {
        reminderId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'a'.repeat(201),
      }

      const result = UpdateReminderInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  describe('ToggleReminderCompleteInput schema', () => {
    it('validates valid toggle input', () => {
      const validInput = {
        reminderId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = ToggleReminderCompleteInput.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('rejects invalid UUID', () => {
      const invalidInput = {
        reminderId: 'not-a-uuid',
      }

      const result = ToggleReminderCompleteInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects missing reminderId', () => {
      const invalidInput = {}

      const result = ToggleReminderCompleteInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  describe('ReminderFilterEnum', () => {
    it('validates all filter values', () => {
      expect(ReminderFilterEnum.safeParse('all').success).toBe(true)
      expect(ReminderFilterEnum.safeParse('upcoming').success).toBe(true)
      expect(ReminderFilterEnum.safeParse('overdue').success).toBe(true)
      expect(ReminderFilterEnum.safeParse('completed').success).toBe(true)
    })

    it('rejects invalid filter value', () => {
      const result = ReminderFilterEnum.safeParse('invalid')
      expect(result.success).toBe(false)
    })
  })
})

describe('Stats Types & Schemas (Story 2.8)', () => {
  describe('PortfolioStats schema', () => {
    it('validates a complete portfolio stats object', () => {
      const validStats = {
        totalClients: 10,
        byStatus: { active: 6, archived: 3, suspended: 1 },
        byType: { complet: 5, directOne: 3, ponctuel: 2 },
        byDashboardType: { lab: 4, one: 6 },
        labActive: 3,
        oneActive: 3,
        mrr: { available: false, message: 'Module Facturation requis' },
      }

      const result = PortfolioStats.safeParse(validStats)
      expect(result.success).toBe(true)
    })

    it('validates with MRR available', () => {
      const stats = {
        totalClients: 5,
        byStatus: { active: 5, archived: 0, suspended: 0 },
        byType: { complet: 5, directOne: 0, ponctuel: 0 },
        byDashboardType: { lab: 2, one: 3 },
        labActive: 2,
        oneActive: 3,
        mrr: { available: true, amount: 4500 },
      }

      const result = PortfolioStats.safeParse(stats)
      expect(result.success).toBe(true)
    })

    it('rejects negative counts', () => {
      const invalid = {
        totalClients: -1,
        byStatus: { active: 0, archived: 0, suspended: 0 },
        byType: { complet: 0, directOne: 0, ponctuel: 0 },
        labActive: 0,
        oneActive: 0,
        mrr: { available: false, message: 'N/A' },
      }

      const result = PortfolioStats.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('GraduationRate schema', () => {
    it('validates a graduation rate object', () => {
      const validRate = {
        percentage: 40,
        graduated: 4,
        totalLabClients: 10,
      }

      const result = GraduationRate.safeParse(validRate)
      expect(result.success).toBe(true)
    })

    it('validates zero rate', () => {
      const result = GraduationRate.safeParse({
        percentage: 0,
        graduated: 0,
        totalLabClients: 0,
      })
      expect(result.success).toBe(true)
    })

    it('rejects negative percentage', () => {
      const result = GraduationRate.safeParse({
        percentage: -5,
        graduated: 0,
        totalLabClients: 0,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('ClientTimeEstimate schema', () => {
    it('validates a complete time estimate', () => {
      const valid = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        clientName: 'Alice',
        clientCompany: 'AliceCorp',
        clientType: 'complet',
        messageCount: 15,
        validationCount: 3,
        visioSeconds: 3600,
        totalEstimatedSeconds: 5400,
        lastActivity: new Date().toISOString(),
      }

      const result = ClientTimeEstimate.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('validates with null lastActivity', () => {
      const valid = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        clientName: 'Bob',
        clientCompany: 'BobInc',
        clientType: 'direct_one',
        messageCount: 0,
        validationCount: 0,
        visioSeconds: 0,
        totalEstimatedSeconds: 0,
        lastActivity: null,
      }

      const result = ClientTimeEstimate.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('rejects invalid clientType', () => {
      const invalid = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        clientName: 'Test',
        clientCompany: 'TestCorp',
        clientType: 'invalid-type',
        messageCount: 0,
        validationCount: 0,
        visioSeconds: 0,
        totalEstimatedSeconds: 0,
        lastActivity: null,
      }

      const result = ClientTimeEstimate.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('MrrInfo discriminated union', () => {
    it('validates MRR not available', () => {
      const result = MrrInfo.safeParse({ available: false, message: 'Module requis' })
      expect(result.success).toBe(true)
    })

    it('validates MRR available', () => {
      const result = MrrInfo.safeParse({ available: true, amount: 1500 })
      expect(result.success).toBe(true)
    })

    it('rejects MRR available without amount', () => {
      const result = MrrInfo.safeParse({ available: true, message: 'test' })
      expect(result.success).toBe(false)
    })
  })
})

describe('Client Lifecycle Types & Schemas (Story 2.9a)', () => {
  describe('ClientStatusEnum', () => {
    it('validates correct status values', () => {
      expect(ClientStatusEnum.safeParse('active').success).toBe(true)
      expect(ClientStatusEnum.safeParse('suspended').success).toBe(true)
      expect(ClientStatusEnum.safeParse('archived').success).toBe(true)
    })

    it('rejects invalid status value', () => {
      const result = ClientStatusEnum.safeParse('invalid-status')
      expect(result.success).toBe(false)
    })

    it('rejects old status values', () => {
      expect(ClientStatusEnum.safeParse('lab-actif').success).toBe(false)
      expect(ClientStatusEnum.safeParse('one-actif').success).toBe(false)
      expect(ClientStatusEnum.safeParse('inactif').success).toBe(false)
      expect(ClientStatusEnum.safeParse('suspendu').success).toBe(false)
    })
  })

  describe('Client schema with lifecycle fields', () => {
    it('validates client with suspendedAt', () => {
      const client = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        operatorId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Client',
        company: 'Test Corp',
        email: 'test@example.com',
        clientType: 'complet',
        status: 'suspended',
        suspendedAt: new Date().toISOString(),
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = Client.safeParse(client)
      expect(result.success).toBe(true)
    })

    it('validates client with archivedAt', () => {
      const client = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        operatorId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Client',
        company: 'Test Corp',
        email: 'test@example.com',
        clientType: 'complet',
        status: 'archived',
        suspendedAt: null,
        archivedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = Client.safeParse(client)
      expect(result.success).toBe(true)
    })

    it('validates client without lifecycle timestamps', () => {
      const client = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        operatorId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Client',
        company: 'Test Corp',
        email: 'test@example.com',
        clientType: 'complet',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = Client.safeParse(client)
      expect(result.success).toBe(true)
    })
  })

  describe('SuspendClientInput schema', () => {
    it('validates valid suspend input with reason', () => {
      const validInput = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'Client requested temporary pause',
      }

      const result = SuspendClientInput.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('validates suspend input without optional reason', () => {
      const validInput = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = SuspendClientInput.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('rejects invalid UUID', () => {
      const invalidInput = {
        clientId: 'not-a-uuid',
        reason: 'Test',
      }

      const result = SuspendClientInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects reason longer than 500 characters', () => {
      const invalidInput = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'a'.repeat(501),
      }

      const result = SuspendClientInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500')
      }
    })

    it('rejects missing clientId', () => {
      const invalidInput = {
        reason: 'Test',
      }

      const result = SuspendClientInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  describe('ReactivateClientInput schema', () => {
    it('validates valid reactivate input', () => {
      const validInput = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = ReactivateClientInput.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('rejects invalid UUID', () => {
      const invalidInput = {
        clientId: 'not-a-uuid',
      }

      const result = ReactivateClientInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects missing clientId', () => {
      const invalidInput = {}

      const result = ReactivateClientInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })
})

describe('Client Upgrade Types & Schemas (Story 2.9c)', () => {
  describe('UpgradeClientInput schema', () => {
    it('validates upgrade to Lab (complet) with parcoursConfig', () => {
      const validInput = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        targetType: 'complet',
        parcoursConfig: {
          templateId: '123e4567-e89b-12d3-a456-426614174001',
          activeStages: [{ key: 'stage-1', active: true }],
        },
      }

      const result = UpgradeClientInput.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('validates upgrade to One (direct_one) with modules', () => {
      const validInput = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        targetType: 'direct_one',
        modules: ['core-dashboard', 'documents'],
      }

      const result = UpgradeClientInput.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('validates upgrade to One without optional fields', () => {
      const validInput = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        targetType: 'direct_one',
      }

      const result = UpgradeClientInput.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('rejects invalid targetType', () => {
      const invalidInput = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        targetType: 'ponctuel',
      }

      const result = UpgradeClientInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects invalid clientId UUID', () => {
      const invalidInput = {
        clientId: 'not-a-uuid',
        targetType: 'complet',
      }

      const result = UpgradeClientInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects missing clientId', () => {
      const invalidInput = {
        targetType: 'complet',
      }

      const result = UpgradeClientInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects missing targetType', () => {
      const invalidInput = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = UpgradeClientInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects invalid templateId UUID in parcoursConfig', () => {
      const invalidInput = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        targetType: 'complet',
        parcoursConfig: {
          templateId: 'not-a-uuid',
          activeStages: [],
        },
      }

      const result = UpgradeClientInput.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('validates parcoursConfig with multiple stages', () => {
      const validInput = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        targetType: 'complet',
        parcoursConfig: {
          templateId: '123e4567-e89b-12d3-a456-426614174001',
          activeStages: [
            { key: 'discovery', active: true },
            { key: 'ideation', active: true },
            { key: 'validation', active: false },
          ],
        },
      }

      const result = UpgradeClientInput.safeParse(validInput)
      expect(result.success).toBe(true)
    })
  })
})
