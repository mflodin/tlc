export function readText(formData: FormData, name: string): string {
  let value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

export function readInt(value: string | null | undefined, fallback = 0): number {
  let n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) ? n : fallback
}

export function notFound(what: string): Response {
  return new Response(`${what} not found`, { status: 404 })
}
