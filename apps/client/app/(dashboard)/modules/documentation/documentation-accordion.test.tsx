import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentationAccordion, type ModuleDoc } from './documentation-accordion'

const mockModules: ModuleDoc[] = [
  {
    moduleId: 'chat',
    moduleName: 'Chat',
    guide: '## Introduction\nLe chat permet la messagerie temps réel.\n\n## Fonctionnalités\nEnvoyer des messages.',
    faq: '## Q: Comment envoyer un message ?\nCliquer sur le champ de texte et appuyer sur Entrée.',
    flows: '## Flux envoi\nClient → Serveur → MiKL',
  },
  {
    moduleId: 'documents',
    moduleName: 'Documents',
    guide: '## Introduction\nGestion documentaire.\n\n## Upload\nGlisser-déposer.',
    faq: '## Q: Quels formats sont supportés ?\nPDF, DOCX, PNG, JPG.',
    flows: '## Flux upload\nClient → Storage',
  },
]

describe('DocumentationAccordion', () => {
  it('renders all module items', () => {
    render(<DocumentationAccordion modules={mockModules} searchTerm="" />)
    expect(screen.getByText('Chat')).toBeTruthy()
    expect(screen.getByText('Documents')).toBeTruthy()
  })

  it('opens accordion on click and shows content', () => {
    render(<DocumentationAccordion modules={mockModules} searchTerm="" />)
    const trigger = screen.getByTestId('accordion-trigger-chat')
    fireEvent.click(trigger)
    expect(screen.getByTestId('accordion-content-chat')).toBeTruthy()
  })

  it('switches tabs correctly', () => {
    render(<DocumentationAccordion modules={mockModules} searchTerm="" />)
    fireEvent.click(screen.getByTestId('accordion-trigger-chat'))

    // Default tab is Guide
    const contentEl = screen.getByTestId('tab-content-chat')
    expect(contentEl.innerHTML).toContain('Introduction')

    // Switch to FAQ tab
    fireEvent.click(screen.getByTestId('tab-faq-chat'))
    expect(contentEl.innerHTML).toContain('envoyer un message')
  })

  it('shows no-results message when search term matches nothing', () => {
    render(
      <DocumentationAccordion
        modules={mockModules}
        searchTerm="terme_inexistant_xyz"
      />
    )
    expect(screen.getByTestId('no-results')).toBeTruthy()
  })

  it('filters modules by search term (case-insensitive)', () => {
    render(<DocumentationAccordion modules={mockModules} searchTerm="chat" />)
    expect(screen.getByText('Chat')).toBeTruthy()
    expect(screen.queryByText('Documents')).toBeNull()
  })

  it('filters by content within doc text', () => {
    render(<DocumentationAccordion modules={mockModules} searchTerm="glisser" />)
    // "glisser-déposer" is in Documents module only
    expect(screen.getByText('Documents')).toBeTruthy()
    expect(screen.queryByText('Chat')).toBeNull()
  })
})
