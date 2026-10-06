import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { isSafeId, slugify } from './slug.ts'

describe('slugify', () => {
  it('keeps Swedish letters', () => {
    assert.equal(slugify('Fjällräv & Vänner'), 'fjällräv-vänner')
    assert.equal(slugify('ÅSA ÖRN'), 'åsa-örn')
  })

  it('drops other accents and punctuation', () => {
    assert.equal(slugify('Beyoncé – Déjà Vu!'), 'beyonce-deja-vu')
  })

  it('normalizes decomposed input', () => {
    assert.equal(slugify('vänner'), 'vänner')
  })

  it('falls back for empty results', () => {
    assert.equal(slugify('!!!'), 'untitled')
  })
})

describe('isSafeId', () => {
  it('accepts Swedish slugs and rejects path tricks', () => {
    assert.ok(isSafeId('fjällräv-vänner'))
    assert.ok(isSafeId('vänner'))
    assert.ok(!isSafeId('../etc'))
    assert.ok(!isSafeId('a/b'))
    assert.ok(!isSafeId('Upper'))
  })
})
