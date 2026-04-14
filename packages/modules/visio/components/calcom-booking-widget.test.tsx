import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CalcomBookingWidget } from './calcom-booking-widget'

describe('CalcomBookingWidget', () => {
  it('renders an iframe', () => {
    render(
      <CalcomBookingWidget
        calcomUrl="https://cal.monprojet-pro.com/mikl/consultation"
        clientId="client-123"
        operatorId="op-456"
      />
    )
    const iframe = screen.getByTitle('Prendre rendez-vous avec MiKL')
    expect(iframe).toBeDefined()
    expect(iframe.tagName).toBe('IFRAME')
  })

  it('includes clientId and operatorId in iframe src', () => {
    render(
      <CalcomBookingWidget
        calcomUrl="https://cal.monprojet-pro.com/mikl/consultation"
        clientId="client-123"
        operatorId="op-456"
      />
    )
    const iframe = screen.getByTitle('Prendre rendez-vous avec MiKL')
    const src = iframe.getAttribute('src') ?? ''
    expect(src).toContain('metadata[clientId]=client-123')
    expect(src).toContain('metadata[operatorId]=op-456')
  })

  it('uses the provided calcomUrl as base', () => {
    render(
      <CalcomBookingWidget
        calcomUrl="https://cal.monprojet-pro.com/mikl/consultation"
        clientId="c1"
        operatorId="o1"
      />
    )
    const iframe = screen.getByTitle('Prendre rendez-vous avec MiKL')
    const src = iframe.getAttribute('src') ?? ''
    expect(src).toContain('cal.monprojet-pro.com/mikl/consultation')
  })

  it('sets loading=lazy on iframe', () => {
    render(
      <CalcomBookingWidget
        calcomUrl="https://cal.monprojet-pro.com/mikl/consultation"
        clientId="c1"
        operatorId="o1"
      />
    )
    const iframe = screen.getByTitle('Prendre rendez-vous avec MiKL')
    expect(iframe.getAttribute('loading')).toBe('lazy')
  })
})
