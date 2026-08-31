import { describe, it, expect, vi, afterEach } from 'vitest'
import { compressImageIfPossible } from './compress-image'

function makeFile(name: string, type: string, size = 1024): File {
  return new File([new ArrayBuffer(size)], name, { type })
}

describe('compressImageIfPossible', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('leaves PDF untouched (not an image)', async () => {
    const file = makeFile('doc.pdf', 'application/pdf')
    const result = await compressImageIfPossible(file)
    expect(result).toBe(file)
  })

  it('leaves GIF untouched (canvas would destroy the animation)', async () => {
    const file = makeFile('anim.gif', 'image/gif')
    const result = await compressImageIfPossible(file)
    expect(result).toBe(file)
  })

  it('leaves HEIC untouched (browsers cannot decode it in a canvas)', async () => {
    const file = makeFile('photo.heic', 'image/heic')
    const result = await compressImageIfPossible(file)
    expect(result).toBe(file)
  })

  it('falls back to the original file if compression fails', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode failed')))
    const file = makeFile('capture.png', 'image/png')
    const result = await compressImageIfPossible(file)
    expect(result).toBe(file)
  })
})
