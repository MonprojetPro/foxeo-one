import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CursorButton } from './cursor-button'

// Mock clipboard API
const mockWriteText = vi.fn()
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
})

// Mock toast functions
vi.mock('@monprojetpro/ui', async () => {
  const actual = await vi.importActual('@monprojetpro/ui')
  return {
    ...actual,
    showSuccess: vi.fn(),
    showInfo: vi.fn(),
  }
})

describe('CursorButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as { location?: unknown }).location
    window.location = { href: '' } as Location
  })

  describe('Normal state (folder exists)', () => {
    it('should render "Ouvrir dans Cursor" button', () => {
      render(
        <CursorButton clientName="Test Client" folderExists={true} />
      )

      expect(
        screen.getByRole('button', { name: /ouvrir dans cursor/i })
      ).toBeInTheDocument()
    })

    it('should attempt to open cursor:// URL on click', () => {
      render(
        <CursorButton
          clientName="Acme Corp"
          companyName="Acme Inc"
          folderExists={true}
        />
      )

      const button = screen.getByRole('button', { name: /ouvrir dans cursor/i })
      fireEvent.click(button)

      expect(window.location.href).toContain('cursor://file/')
      expect(window.location.href).toContain('acme-inc')
    })
  })

  describe('Folder does not exist state', () => {
    it('should show alert and copy button when folder does not exist', () => {
      render(
        <CursorButton clientName="Test Client" folderExists={false} />
      )

      // Click the button to open the dialog
      const button = screen.getByRole('button', { name: /ouvrir dans cursor/i })
      fireEvent.click(button)

      expect(
        screen.getByText(/le dossier bmad de ce client n'existe pas encore/i)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /copier/i })
      ).toBeInTheDocument()
    })

    it('should display expected path in alert', () => {
      render(
        <CursorButton
          clientName="Jean Dupont"
          companyName="Café Français"
          folderExists={false}
        />
      )

      // Click to open dialog
      const button = screen.getByRole('button', { name: /ouvrir dans cursor/i })
      fireEvent.click(button)

      const codeElement = screen.getByText(/clients\/cafe-francais/)
      expect(codeElement).toBeInTheDocument()
    })

    it('should call clipboard writeText when copy button clicked', () => {
      mockWriteText.mockResolvedValue(undefined)

      render(
        <CursorButton clientName="Test" folderExists={false} />
      )

      // Open dialog first
      const button = screen.getByRole('button', { name: /ouvrir dans cursor/i })
      fireEvent.click(button)

      const copyButton = screen.getByRole('button', { name: /copier/i })
      fireEvent.click(copyButton)

      expect(mockWriteText).toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('should handle clipboard error gracefully', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard error'))

      render(<CursorButton clientName="Test" folderExists={false} />)

      // Open dialog first
      const button = screen.getByRole('button', { name: /ouvrir dans cursor/i })
      fireEvent.click(button)

      const copyButton = screen.getByRole('button', { name: /copier/i })

      // Should not throw
      expect(() => fireEvent.click(copyButton)).not.toThrow()
    })

    it('should use company name for slug if provided', () => {
      render(
        <CursorButton
          clientName="Jean Dupont"
          companyName="Test Company"
          folderExists={false}
        />
      )

      // Open dialog first
      const button = screen.getByRole('button', { name: /ouvrir dans cursor/i })
      fireEvent.click(button)

      expect(screen.getByText(/test-company/)).toBeInTheDocument()
    })

    it('should use client name for slug if no company', () => {
      render(<CursorButton clientName="Jean Dupont" folderExists={false} />)

      // Open dialog first
      const button = screen.getByRole('button', { name: /ouvrir dans cursor/i })
      fireEvent.click(button)

      expect(screen.getByText(/jean-dupont/)).toBeInTheDocument()
    })

    it('should normalize accents in displayed path', () => {
      render(
        <CursorButton
          clientName="Test"
          companyName="Société Française"
          folderExists={false}
        />
      )

      // Open dialog first
      const button = screen.getByRole('button', { name: /ouvrir dans cursor/i })
      fireEvent.click(button)

      expect(screen.getByText(/societe-francaise/)).toBeInTheDocument()
    })
  })
})
