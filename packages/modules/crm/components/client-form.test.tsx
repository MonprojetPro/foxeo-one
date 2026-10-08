import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClientForm } from './client-form'

describe('ClientForm', () => {
  it('should render all form fields', () => {
    render(<ClientForm onSubmit={vi.fn()} />)

    expect(screen.getByLabelText(/^nom \*/i)).toBeDefined()
    expect(screen.getByLabelText(/email/i)).toBeDefined()
    expect(screen.getByLabelText(/entreprise/i)).toBeDefined()
    expect(screen.getByLabelText(/t.l.phone/i)).toBeDefined()
    expect(screen.getByLabelText(/secteur/i)).toBeDefined()
    // Client type radio group
    expect(screen.getByText(/ponctuel/i)).toBeDefined()
    expect(screen.getByText(/complet/i)).toBeDefined()
    expect(screen.getByText(/direct one/i)).toBeDefined()
  })

  it('should default clientType to ponctuel in create mode', () => {
    render(<ClientForm onSubmit={vi.fn()} />)

    const ponctuelRadio = screen.getByDisplayValue('ponctuel') as HTMLInputElement
    expect(ponctuelRadio.checked).toBe(true)
  })

  it('should show validation errors for required fields', async () => {
    render(<ClientForm onSubmit={vi.fn()} />)

    const submitButton = screen.getByRole('button', { name: /cr.er|enregistrer/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/au moins 2 caract/i)).toBeDefined()
    })
  })

  it('should show validation error for invalid email', async () => {
    render(<ClientForm onSubmit={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/^nom \*/i), { target: { value: 'Jean Dupont' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } })

    const submitButton = screen.getByRole('button', { name: /cr.er|enregistrer/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email invalide/i)).toBeDefined()
    })
  })

  it('should call onSubmit with valid data in create mode', async () => {
    const onSubmit = vi.fn()
    render(<ClientForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/^nom \*/i), { target: { value: 'Jean Dupont' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jean@acme.com' } })

    const submitButton = screen.getByRole('button', { name: /cr.er/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })

    const calledWith = onSubmit.mock.calls[0][0]
    expect(calledWith.name).toBe('Jean Dupont')
    expect(calledWith.email).toBe('jean@acme.com')
    expect(calledWith.clientType).toBe('ponctuel')
  })

  it('should prefill values in edit mode', () => {
    render(
      <ClientForm
        onSubmit={vi.fn()}
        defaultValues={{
          name: 'Jean Dupont',
          email: 'jean@acme.com',
          company: 'Acme Corp',
          clientType: 'complet',
        }}
        mode="edit"
      />
    )

    expect((screen.getByLabelText(/^nom \*/i) as HTMLInputElement).value).toBe('Jean Dupont')
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('jean@acme.com')
    expect((screen.getByLabelText(/entreprise/i) as HTMLInputElement).value).toBe('Acme Corp')
    const completRadio = screen.getByDisplayValue('complet') as HTMLInputElement
    expect(completRadio.checked).toBe(true)
  })

  // T-035d — les gestionnaires de mots de passe n'ont rien à faire ici.
  // La page de connexion, elle, garde son auto-remplissage : ces attributs ne
  // doivent JAMAIS y être posés.
  it('demande aux gestionnaires de mots de passe de ne pas remplir ce formulaire', () => {
    const { container } = render(<ClientForm onSubmit={vi.fn()} />)

    const form = container.querySelector('form')!
    expect(form.getAttribute('autocomplete')).toBe('off')
    expect(form.getAttribute('data-form-type')).toBe('other')

    const nom = screen.getByLabelText(/^nom \*/i)
    expect(nom.getAttribute('autocomplete')).toBe('off')
    expect(nom.getAttribute('data-1p-ignore')).toBe('true')
    expect(nom.getAttribute('data-lpignore')).toBe('true')
    expect(nom.getAttribute('data-bwignore')).toBe('true')

    const email = screen.getByLabelText(/email/i)
    expect(email.getAttribute('data-1p-ignore')).toBe('true')
  })

  // T-035 — client « entité » (personne morale)
  describe('mode entité', () => {
    function renderEntity() {
      render(
        <ClientForm
          onSubmit={vi.fn()}
          defaultValues={{ clientKind: 'entity' }}
        />
      )
    }

    it('remplace prénom/nom par la raison sociale', () => {
      renderEntity()

      expect(screen.queryByLabelText(/^pr.nom/i)).toBeNull()
      expect(screen.queryByLabelText(/^nom \*/i)).toBeNull()
      expect(screen.getByLabelText(/nom de l.entit. \*/i)).toBeDefined()
      expect(screen.getByLabelText(/siret/i)).toBeDefined()
    })

    // T-039 — le champ unique « Nom du contact » a ete RETIRE : il ne savait
    // porter qu'une seule personne alors qu'un client en a plusieurs, et il
    // faisait doublon avec le carnet. Le formulaire renvoie vers l'onglet.
    it('ne propose plus de champ « Nom du contact »', () => {
      renderEntity()

      expect(screen.queryByLabelText(/nom du contact/i)).toBeNull()
    })

    it('renvoie vers l onglet Contacts, pour que le champ retire ne laisse pas un trou', () => {
      renderEntity()

      expect(screen.getByText(/onglet/i)).toBeDefined()
      expect(screen.getByText(/qui re.oit les factures/i)).toBeDefined()
    })

    it('exige la raison sociale, pas le nom de famille', async () => {
      renderEntity()

      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'cse@habitat77.fr' } })
      fireEvent.click(screen.getByRole('button', { name: /cr.er/i }))

      await waitFor(() => {
        expect(screen.getByText(/le nom de l.entit. est requis/i)).toBeDefined()
      })
    })

    it('soumet une entité sans prénom ni nom de famille', async () => {
      const onSubmit = vi.fn()
      render(<ClientForm onSubmit={onSubmit} defaultValues={{ clientKind: 'entity' }} />)

      fireEvent.change(screen.getByLabelText(/nom de l.entit. \*/i), {
        target: { value: 'CSE Habitat 77' },
      })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'cse@habitat77.fr' } })
      fireEvent.click(screen.getByRole('button', { name: /cr.er/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })

      const calledWith = onSubmit.mock.calls[0][0]
      expect(calledWith.clientKind).toBe('entity')
      expect(calledWith.company).toBe('CSE Habitat 77')
      expect(calledWith.name).toBe('')
    })
  })

  it('should show "Enregistrer" button in edit mode', () => {
    render(
      <ClientForm
        onSubmit={vi.fn()}
        defaultValues={{ name: 'Test', email: 'test@test.com', clientType: 'ponctuel' }}
        mode="edit"
      />
    )

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDefined()
  })

  it('should show "Créer" button in create mode', () => {
    render(<ClientForm onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: /cr.er/i })).toBeDefined()
  })

  it('should call onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ClientForm onSubmit={vi.fn()} onCancel={onCancel} />)

    const cancelButton = screen.getByRole('button', { name: /annuler/i })
    fireEvent.click(cancelButton)

    expect(onCancel).toHaveBeenCalled()
  })

  it('should disable buttons when isPending is true', () => {
    render(<ClientForm onSubmit={vi.fn()} isPending={true} />)

    const submitButton = screen.getByRole('button', { name: /cr.er|enregistrer|en cours/i })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('should display server error on email field', () => {
    render(
      <ClientForm
        onSubmit={vi.fn()}
        serverError={{ field: 'email', message: 'Cet email est déjà associé à un client' }}
      />
    )

    expect(screen.getByText(/cet email est d.j. associ/i)).toBeDefined()
  })
})
