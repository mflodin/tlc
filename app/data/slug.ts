// Swedish letters are kept in slugs; Remix percent-encodes them in hrefs and decodes params.
const SAFE_ID = /^[a-z0-9åäö]+(?:-[a-z0-9åäö]+)*$/
const SWEDISH_LETTERS = 'åäö'

export function isSafeId(id: string): boolean {
  return SAFE_ID.test(id.normalize('NFC'))
}

/** "Fjällräv & Vänner" → "fjällräv-vänner". Other accents are dropped ("Beyoncé" → "beyonce"). */
export function slugify(value: string): string {
  let folded = [...value.normalize('NFC').toLowerCase()]
    .map((char) =>
      SWEDISH_LETTERS.includes(char) ? char : char.normalize('NFD').replace(/\p{Diacritic}/gu, ''),
    )
    .join('')

  return (
    folded
      .replace(/[^a-z0-9åäö]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/, '') || 'untitled'
  )
}

export function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
