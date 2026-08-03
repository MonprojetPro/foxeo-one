import { describe, expect, it } from 'vitest'
import { buildHouseholdsQuery, buildUsersQuery, MAX_LIMIT } from './query'

describe('buildHouseholdsQuery', () => {
  it('ne produit aucune query string sans critère', () => {
    expect(buildHouseholdsQuery()).toBe('')
    expect(buildHouseholdsQuery({})).toBe('')
  })

  it('omet offset 0 et activity "all" (défauts du guichet)', () => {
    expect(buildHouseholdsQuery({ offset: 0, activity: 'all' })).toBe('')
  })

  it('plafonne limit au maximum accepté par le guichet', () => {
    expect(buildHouseholdsQuery({ limit: 5000 })).toBe(`?limit=${MAX_LIMIT}`)
    expect(buildHouseholdsQuery({ limit: 0 })).toBe('?limit=1')
  })

  it('ignore une recherche vide ou faite d’espaces', () => {
    expect(buildHouseholdsQuery({ search: '   ' })).toBe('')
  })

  it('encode la recherche', () => {
    expect(buildHouseholdsQuery({ search: 'Tao family' })).toBe('?search=Tao+family')
    expect(buildHouseholdsQuery({ search: 'a&b=c' })).toContain('search=a%26b%3Dc')
  })

  it('transmet tri, ordre, activité et filtre officiel', () => {
    const qs = buildHouseholdsQuery({
      limit: 50,
      offset: 100,
      sort: 'created_at',
      order: 'asc',
      activity: 'dormant',
      official: true,
    })
    expect(qs).toContain('limit=50')
    expect(qs).toContain('offset=100')
    expect(qs).toContain('sort=created_at')
    expect(qs).toContain('order=asc')
    expect(qs).toContain('activity=dormant')
    expect(qs).toContain('official=true')
  })

  it('transmet official=false quand le filtre est explicitement à false', () => {
    expect(buildHouseholdsQuery({ official: false })).toBe('?official=false')
  })
})

describe('buildUsersQuery', () => {
  it('omet les défauts du guichet', () => {
    expect(buildUsersQuery()).toBe('')
    expect(buildUsersQuery({ offset: 0, status: 'all' })).toBe('')
  })

  it('plafonne limit comme la liste des foyers', () => {
    expect(buildUsersQuery({ limit: 999 })).toBe(`?limit=${MAX_LIMIT}`)
  })

  it('transmet le filtre « email non vérifié » (verified=false)', () => {
    expect(buildUsersQuery({ verified: false })).toBe('?verified=false')
  })

  it('transmet recherche, statut, tri et ordre', () => {
    const qs = buildUsersQuery({
      search: 'culus.osteo@gmail.com',
      status: 'banned',
      sort: 'created_at',
      order: 'asc',
    })
    expect(qs).toContain('search=culus.osteo%40gmail.com')
    expect(qs).toContain('status=banned')
    expect(qs).toContain('sort=created_at')
    expect(qs).toContain('order=asc')
  })
})
