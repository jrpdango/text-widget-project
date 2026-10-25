import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

type User = ReturnType<typeof userEvent.setup>

async function addWidgetWith(user: User, markdown: string) {
  await user.click(screen.getByRole('button', { name: 'Add widget' }))
  const textarea = screen.getAllByRole('textbox')[0]
  await user.click(textarea)
  await user.paste(markdown)
}

async function showPreview(user: User, cardIndex = 0) {
  const cards = screen.getAllByRole('article', { name: 'Text widget' })
  await user.click(within(cards[cardIndex]).getByRole('button', { name: 'Preview' }))
  await waitFor(() => {
    expect(document.querySelector('.markdown-body')).not.toBeNull()
  })
}

describe('markdown preview', () => {
  it('renders headings, emphasis, lists, and links', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addWidgetWith(
      user,
      '# Hello\n\nSome **bold** text.\n\n- one\n- two\n\n[Example](https://example.com)',
    )
    await showPreview(user)

    expect(screen.getByRole('heading', { level: 1, name: 'Hello' })).toBeInTheDocument()
    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(within(document.querySelector('.markdown-body') as HTMLElement).getAllByRole('listitem')).toHaveLength(2)

    const link = screen.getByRole('link', { name: 'Example' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('supports GFM tables and task lists', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addWidgetWith(
      user,
      '| Name | Value |\n| --- | --- |\n| Alpha | 1 |\n\n- [x] shipped\n- [ ] pending',
    )
    await showPreview(user)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Alpha' })).toBeInTheDocument()

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()
  })

  it('adds syntax highlighting to fenced code blocks', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addWidgetWith(user, '```ts\nconst answer: number = 42\n```')
    await showPreview(user)

    const code = document.querySelector('pre code')
    expect(code).not.toBeNull()
    expect(code).toHaveClass('hljs')
    expect(code?.querySelector('.hljs-keyword')).not.toBeNull()
  })

  it('does not render raw HTML from markdown', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addWidgetWith(
      user,
      '<b>not bold markup</b>\n\n<img src="x" onerror="window.__pwned = true" />\n\n<script>window.__pwned = true</script>',
    )
    await showPreview(user)

    const preview = document.querySelector('.markdown-body')
    expect(preview?.querySelector('b')).toBeNull()
    expect(preview?.querySelector('img')).toBeNull()
    expect(preview?.querySelector('script')).toBeNull()
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
  })

  it('strips markdown images but keeps their surrounding text', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addWidgetWith(user, 'Before\n\n![a cat](https://example.com/cat.png)\n\nAfter')
    await showPreview(user)

    expect(document.querySelector('.markdown-body img')).toBeNull()
    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
  })

  it('toggles Write/Preview independently for each widget', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addWidgetWith(user, '# One')
    await addWidgetWith(user, '# Two')

    await showPreview(user, 0)

    expect(screen.getByRole('heading', { level: 1, name: 'Two' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'One' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getAllByRole('textbox')[0]).toHaveValue('# One')

    const cards = screen.getAllByRole('article', { name: 'Text widget' })
    await user.click(within(cards[0]).getByRole('button', { name: 'Write' }))

    expect(screen.getAllByRole('textbox')).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: 'Two' })).not.toBeInTheDocument()
  })
})
