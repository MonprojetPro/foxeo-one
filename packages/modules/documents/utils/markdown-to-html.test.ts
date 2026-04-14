import { describe, it, expect } from 'vitest'
import { markdownToHtml } from './markdown-to-html'

describe('markdownToHtml', () => {
  it('converts headings to HTML', () => {
    const result = markdownToHtml('# Titre principal')
    expect(result).toContain('<h1')
    expect(result).toContain('Titre principal')
  })

  it('converts h2 headings', () => {
    const result = markdownToHtml('## Sous-titre')
    expect(result).toContain('<h2')
    expect(result).toContain('Sous-titre')
  })

  it('converts bold and italic text', () => {
    const result = markdownToHtml('**gras** et *italique*')
    expect(result).toContain('<strong>gras</strong>')
    expect(result).toContain('<em>italique</em>')
  })

  it('converts code blocks with syntax highlighting', () => {
    const result = markdownToHtml('```js\nconst x = 1\n```')
    expect(result).toContain('<pre')
    expect(result).toContain('<code>')
    expect(result).toContain('const x = 1')
  })

  it('converts inline code', () => {
    const result = markdownToHtml('Use `npm install` to install')
    expect(result).toContain('<code')
    expect(result).toContain('npm install')
  })

  it('converts unordered lists', () => {
    const result = markdownToHtml('- Item 1\n- Item 2')
    expect(result).toContain('<li')
    expect(result).toContain('Item 1')
    expect(result).toContain('Item 2')
  })

  it('converts links', () => {
    const result = markdownToHtml('[MonprojetPro](https://monprojet-pro.com)')
    expect(result).toContain('<a href="https://monprojet-pro.com"')
    expect(result).toContain('MonprojetPro')
  })

  it('converts blockquotes', () => {
    const result = markdownToHtml('> Citation importante')
    expect(result).toContain('<blockquote')
    expect(result).toContain('Citation importante')
  })

  it('wraps plain text in paragraphs', () => {
    const result = markdownToHtml('Un simple paragraphe de texte.')
    expect(result).toContain('<p')
    expect(result).toContain('Un simple paragraphe de texte.')
  })

  it('escapes HTML in code blocks', () => {
    const result = markdownToHtml('```\n<div>test</div>\n```')
    expect(result).toContain('&lt;div&gt;')
    expect(result).not.toContain('<div>test</div>')
  })

  it('converts horizontal rules', () => {
    const result = markdownToHtml('---')
    expect(result).toContain('<hr')
  })

  // XSS / Security tests
  it('escapes raw HTML script tags outside code blocks', () => {
    const result = markdownToHtml('<script>alert("xss")</script>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })

  it('escapes img onerror XSS payloads', () => {
    const result = markdownToHtml('<img onerror="alert(1)" src=x>')
    expect(result).not.toContain('<img')
    expect(result).toContain('&lt;img')
  })

  it('neutralizes javascript: URLs in links', () => {
    const result = markdownToHtml('[click](javascript:alert(1))')
    expect(result).not.toContain('javascript:')
    expect(result).toContain('href="#"')
  })

  it('escapes HTML inside inline code', () => {
    const result = markdownToHtml('Use `<script>alert(1)</script>` to test')
    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('<script>alert')
  })

  it('wraps ordered lists in ol tags', () => {
    const result = markdownToHtml('1. First\n2. Second')
    expect(result).toContain('<ol')
    expect(result).toContain('First')
    expect(result).toContain('Second')
  })

  it('blocks data: protocol in links', () => {
    const result = markdownToHtml('[click](data:text/html,<script>alert(1)</script>)')
    expect(result).not.toContain('data:text/html')
    expect(result).toContain('href="#"')
  })
})
