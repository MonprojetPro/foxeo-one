import { describe, it, expect } from 'vitest'
import { CreateTicketInputSchema, UpdateTicketStatusSchema, TicketTypeEnum, TicketStatusEnum } from './support.types'

describe('Support Zod Schemas', () => {
  describe('TicketTypeEnum', () => {
    it('should accept valid types', () => {
      expect(TicketTypeEnum.parse('bug')).toBe('bug')
      expect(TicketTypeEnum.parse('question')).toBe('question')
      expect(TicketTypeEnum.parse('suggestion')).toBe('suggestion')
    })

    it('should reject invalid types', () => {
      expect(() => TicketTypeEnum.parse('feature')).toThrow()
    })
  })

  describe('TicketStatusEnum', () => {
    it('should accept valid statuses', () => {
      expect(TicketStatusEnum.parse('open')).toBe('open')
      expect(TicketStatusEnum.parse('in_progress')).toBe('in_progress')
      expect(TicketStatusEnum.parse('resolved')).toBe('resolved')
      expect(TicketStatusEnum.parse('closed')).toBe('closed')
    })

    it('should reject invalid statuses', () => {
      expect(() => TicketStatusEnum.parse('pending')).toThrow()
    })
  })

  describe('CreateTicketInputSchema', () => {
    const validInput = {
      type: 'bug',
      subject: 'Test subject here',
      description: 'A detailed description of the issue encountered',
    }

    it('should accept valid input', () => {
      expect(CreateTicketInputSchema.parse(validInput)).toMatchObject(validInput)
    })

    it('should default type to bug', () => {
      const result = CreateTicketInputSchema.parse({
        subject: 'Test subject here',
        description: 'A detailed description of the issue',
      })
      expect(result.type).toBe('bug')
    })

    it('should reject subject shorter than 3 characters', () => {
      const result = CreateTicketInputSchema.safeParse({ ...validInput, subject: 'AB' })
      expect(result.success).toBe(false)
    })

    it('should reject description shorter than 10 characters', () => {
      const result = CreateTicketInputSchema.safeParse({ ...validInput, description: 'short' })
      expect(result.success).toBe(false)
    })

    it('should accept optional screenshotUrls', () => {
      const result = CreateTicketInputSchema.parse({
        ...validInput,
        screenshotUrls: ['https://example.com/img.png'],
      })
      expect(result.screenshotUrls).toEqual(['https://example.com/img.png'])
    })

    it('should default screenshotUrls to an empty array', () => {
      const result = CreateTicketInputSchema.parse(validInput)
      expect(result.screenshotUrls).toEqual([])
    })

    it('should reject more than 3 screenshotUrls', () => {
      const result = CreateTicketInputSchema.safeParse({
        ...validInput,
        screenshotUrls: [
          'https://example.com/1.png',
          'https://example.com/2.png',
          'https://example.com/3.png',
          'https://example.com/4.png',
        ],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateTicketStatusSchema', () => {
    it('should accept valid input', () => {
      const result = UpdateTicketStatusSchema.parse({
        ticketId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'resolved',
      })
      expect(result.status).toBe('resolved')
    })

    it('should reject invalid UUID', () => {
      const result = UpdateTicketStatusSchema.safeParse({
        ticketId: 'not-a-uuid',
        status: 'open',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid status', () => {
      const result = UpdateTicketStatusSchema.safeParse({
        ticketId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })
})
