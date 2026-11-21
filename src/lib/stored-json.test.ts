import { describe, expect, it } from 'vitest'
import { parseStoredJson, stepConfigObject } from './stored-json'

describe('DeepSpace JSON field compatibility', () => {
  it('decodes native JSON objects', () => {
    expect(stepConfigObject({ url: 'https://api.github.com' })).toEqual({ url: 'https://api.github.com' })
  })
  it('decodes legacy string and double-encoded JSON', () => {
    const config = { field: 'title' }
    expect(stepConfigObject(JSON.stringify(config))).toEqual(config)
    expect(stepConfigObject(JSON.stringify(JSON.stringify(config)))).toEqual(config)
  })
  it('reads execution history arrays returned by JSON columns', () => {
    expect(parseStoredJson([{ label: 'first' }])).toEqual([{ label: 'first' }])
    expect(parseStoredJson(JSON.stringify([{ label: 'first' }]))).toEqual([{ label: 'first' }])
  })
  it('rejects null and invalid configs', () => {
    expect(stepConfigObject('{invalid}')).toBeNull()
    expect(stepConfigObject(null)).toBeNull()
    expect(stepConfigObject(['array'])).toBeNull()
  })
})
