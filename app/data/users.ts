import type { Database } from 'remix/data-table'

import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from './passwords.ts'
import { users, type UserRow } from './tables.ts'

export const ROLES = ['viewer', 'editor'] as const
export type Role = (typeof ROLES)[number]

/** The logged-in user as the app sees it; never includes the password hash. */
export interface User {
  id: number
  username: string
  role: Role
  sessionVersion: number
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value)
}

function toUser(row: UserRow): User {
  // The table's check constraint only allows the two roles.
  let role = row.role as Role
  return { id: row.id, username: row.username, role, sessionVersion: row.session_version }
}

function normalizeUsername(username: string): string {
  return username.normalize('NFC').trim()
}

export function validatePassword(password: string): string | null {
  return password.length >= MIN_PASSWORD_LENGTH
    ? null
    : `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`
}

async function findRow(db: Database, username: string): Promise<UserRow | null> {
  // The column is "collate nocase", so this matches regardless of case.
  return db.findOne(users, { where: { username: normalizeUsername(username) } })
}

export async function getUserById(db: Database, id: number): Promise<User | null> {
  let row = await db.find(users, id)
  return row ? toUser(row) : null
}

export async function getUserByName(db: Database, username: string): Promise<User | null> {
  let row = await findRow(db, username)
  return row ? toUser(row) : null
}

export async function listUsers(db: Database): Promise<User[]> {
  let rows = await db.findMany(users, { orderBy: ['username', 'asc'] })
  return rows.map(toUser)
}

// Hashed once so unknown usernames take as long to reject as wrong passwords.
let dummyHash: Promise<string> | undefined

/** Returns the user when the username and password match, otherwise null. */
export async function authenticate(
  db: Database,
  username: string,
  password: string,
): Promise<User | null> {
  let row = await findRow(db, username)
  if (!row) {
    dummyHash ??= hashPassword('not a real password')
    await verifyPassword(password, await dummyHash)
    return null
  }
  return (await verifyPassword(password, row.password_hash)) ? toUser(row) : null
}

export async function createUser(
  db: Database,
  username: string,
  password: string,
  role: Role,
): Promise<User> {
  let name = normalizeUsername(username)
  if (!/^[\p{L}\p{N}._-]{1,40}$/u.test(name)) {
    throw new Error('Usernames can use letters, digits, ".", "_" and "-" (max 40).')
  }
  let problem = validatePassword(password)
  if (problem) throw new Error(problem)
  if (await findRow(db, name)) throw new Error(`User "${name}" already exists.`)

  let row = await db.create(
    users,
    { username: name, password_hash: await hashPassword(password), role },
    { returnRow: true },
  )
  return toUser(row)
}

/** Sets a new password and logs out the user's existing sessions. */
export async function setPassword(db: Database, userId: number, password: string): Promise<User> {
  let problem = validatePassword(password)
  if (problem) throw new Error(problem)
  let row = await db.find(users, userId)
  if (!row) throw new Error('No such user.')
  let updated = await db.update(users, userId, {
    password_hash: await hashPassword(password),
    session_version: row.session_version + 1,
  })
  return toUser(updated)
}

export async function setRole(db: Database, userId: number, role: Role): Promise<User> {
  return toUser(await db.update(users, userId, { role }))
}

export async function deleteUser(db: Database, userId: number): Promise<boolean> {
  return db.delete(users, userId)
}
