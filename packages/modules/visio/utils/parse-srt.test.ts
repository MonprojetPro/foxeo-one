import { describe, it, expect } from 'vitest'
import { parseSrt, formatTimestamp } from './parse-srt'

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:04,000
Bonjour et bienvenue

2
00:00:05,500 --> 00:00:08,200
Aujourd'hui nous allons discuter

3
00:01:10,000 --> 00:01:15,300
Du projet MonprojetPro`

describe('parseSrt', () => {
  it('parses valid SRT content', () => {
    const entries = parseSrt(SAMPLE_SRT)
    expect(entries).toHaveLength(3)
  })

  it('extracts correct index', () => {
    const entries = parseSrt(SAMPLE_SRT)
    expect(entries[0].index).toBe(1)
    expect(entries[1].index).toBe(2)
    expect(entries[2].index).toBe(3)
  })

  it('converts timestamps to seconds', () => {
    const entries = parseSrt(SAMPLE_SRT)
    expect(entries[0].start).toBe(1)
    expect(entries[0].end).toBe(4)
    expect(entries[1].start).toBe(5.5)
    expect(entries[1].end).toBe(8.2)
    expect(entries[2].start).toBe(70)
    expect(entries[2].end).toBe(75.3)
  })

  it('extracts text content', () => {
    const entries = parseSrt(SAMPLE_SRT)
    expect(entries[0].text).toBe('Bonjour et bienvenue')
    expect(entries[1].text).toBe("Aujourd'hui nous allons discuter")
    expect(entries[2].text).toBe('Du projet MonprojetPro')
  })

  it('handles empty content', () => {
    expect(parseSrt('')).toEqual([])
    expect(parseSrt('   ')).toEqual([])
  })

  it('handles multi-line subtitle text', () => {
    const multiLine = `1
00:00:01,000 --> 00:00:04,000
Première ligne
Deuxième ligne`
    const entries = parseSrt(multiLine)
    expect(entries).toHaveLength(1)
    expect(entries[0].text).toBe('Première ligne\nDeuxième ligne')
  })

  it('handles dot separator instead of comma', () => {
    const dotSrt = `1
00:00:01.000 --> 00:00:04.000
Test`
    const entries = parseSrt(dotSrt)
    expect(entries).toHaveLength(1)
    expect(entries[0].start).toBe(1)
  })

  it('skips malformed blocks', () => {
    const malformed = `not a number
00:00:01,000 --> 00:00:04,000
Text

2
00:00:05,000 --> 00:00:08,000
Valid text`
    const entries = parseSrt(malformed)
    expect(entries).toHaveLength(1)
    expect(entries[0].index).toBe(2)
  })

  it('handles hours in timestamps', () => {
    const hourSrt = `1
01:30:00,000 --> 01:30:05,000
After 90 minutes`
    const entries = parseSrt(hourSrt)
    expect(entries[0].start).toBe(5400)
    expect(entries[0].end).toBe(5405)
  })
})

describe('formatTimestamp', () => {
  it('formats seconds to HH:MM:SS', () => {
    expect(formatTimestamp(0)).toBe('00:00:00')
    expect(formatTimestamp(1)).toBe('00:00:01')
    expect(formatTimestamp(60)).toBe('00:01:00')
    expect(formatTimestamp(3661)).toBe('01:01:01')
  })

  it('handles large values', () => {
    expect(formatTimestamp(7200)).toBe('02:00:00')
    expect(formatTimestamp(86399)).toBe('23:59:59')
  })

  it('truncates fractional seconds', () => {
    expect(formatTimestamp(1.5)).toBe('00:00:01')
    expect(formatTimestamp(59.9)).toBe('00:00:59')
  })
})
