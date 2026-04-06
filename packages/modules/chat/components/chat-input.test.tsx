import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from './chat-input'

describe('ChatInput', () => {
  it('renders the textarea and send button', () => {
    render(<ChatInput onSend={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /envoyer/i })).toBeInTheDocument()
  })

  it('send button is disabled when content is empty', () => {
    render(<ChatInput onSend={vi.fn()} />)
    expect(screen.getByRole('button', { name: /envoyer/i })).toBeDisabled()
  })

  it('send button is enabled when content is not empty', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={vi.fn()} />)
    await user.type(screen.getByRole('textbox', { name: /message/i }), 'Hello')
    expect(screen.getByRole('button', { name: /envoyer/i })).toBeEnabled()
  })

  it('calls onSend with payload when button is clicked', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    await user.type(screen.getByRole('textbox', { name: /message/i }), 'Hello MiKL')
    await user.click(screen.getByRole('button', { name: /envoyer/i }))
    expect(onSend).toHaveBeenCalledWith({ content: 'Hello MiKL', file: undefined })
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('clears input after send', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={vi.fn()} />)
    const textarea = screen.getByRole('textbox', { name: /message/i })
    await user.type(textarea, 'Hello')
    await user.click(screen.getByRole('button', { name: /envoyer/i }))
    expect(textarea).toHaveValue('')
  })

  it('sends message on Enter key (without Shift)', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByRole('textbox', { name: /message/i })
    await user.type(textarea, 'Test message')
    await user.keyboard('{Enter}')
    expect(onSend).toHaveBeenCalledWith({ content: 'Test message', file: undefined })
  })

  it('does NOT send on Shift+Enter', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByRole('textbox', { name: /message/i })
    await user.type(textarea, 'Hello')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('does not send empty or whitespace content', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByRole('textbox', { name: /message/i })
    await user.type(textarea, '   ')
    await user.keyboard('{Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('is disabled when isSending is true', () => {
    render(<ChatInput onSend={vi.fn()} isSending={true} />)
    expect(screen.getByRole('textbox', { name: /message/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /envoyer/i })).toBeDisabled()
  })

  it('shows custom placeholder', () => {
    render(<ChatInput onSend={vi.fn()} placeholder="Votre message ici..." />)
    expect(screen.getByPlaceholderText('Votre message ici...')).toBeInTheDocument()
  })
})
