import { describe, expect, it } from 'vitest'

describe('test runner', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof document).toBe('object')
    expect(2 + 2).toBe(4)
  })
})
