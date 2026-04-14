import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DocumentSummary } from '../types/validation.types'

// Mock react-markdown to avoid needing the actual package
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown">{children}</div>
  ),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    <a href={href} {...props}>{children}</a>,
}))

vi.mock('@monprojetpro/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    formatFileSize: (size: number) => `${size}B`,
  }
})

const mockDocuments: DocumentSummary[] = [
  {
    id: 'doc-1',
    name: 'brief.pdf',
    fileType: 'application/pdf',
    fileSize: 2048,
    filePath: 'op-1/c-1/brief.pdf',
  },
]

describe('RequestContent', () => {
  async function importComponent() {
    const { RequestContent } = await import('./request-content')
    return RequestContent
  }

  it('should render markdown content', async () => {
    const RequestContent = await importComponent()
    render(<RequestContent content="# Mon besoin\nVoici le contenu." documents={[]} />)
    const md = screen.getByTestId('markdown')
    expect(md.textContent).toContain('Mon besoin')
  })

  it('should not render documents section when empty', async () => {
    const RequestContent = await importComponent()
    render(<RequestContent content="Contenu" documents={[]} />)
    expect(screen.queryByText(/Documents joints/)).toBeNull()
  })

  it('should render documents when provided', async () => {
    const RequestContent = await importComponent()
    render(<RequestContent content="Contenu" documents={mockDocuments} />)
    expect(screen.getByText('brief.pdf')).toBeDefined()
    expect(screen.getByText('Documents joints (1)')).toBeDefined()
  })

  it('should show document type and size', async () => {
    const RequestContent = await importComponent()
    render(<RequestContent content="Contenu" documents={mockDocuments} />)
    expect(screen.getByText(/PDF/)).toBeDefined()
    expect(screen.getByText(/2048B/)).toBeDefined()
  })

  it('should render download link for each document', async () => {
    const RequestContent = await importComponent()
    render(<RequestContent content="Contenu" documents={mockDocuments} />)
    const link = screen.getByRole('link', { name: /brief\.pdf/i })
    expect(link.getAttribute('href')).toContain('documents')
  })
})
