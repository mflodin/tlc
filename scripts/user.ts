// Manages user accounts.
//
//   npm run user -- list
//   npm run user -- add <username> [--role viewer|editor]    (default role: viewer)
//   npm run user -- reset-password <username>
//   npm run user -- role <username> <viewer|editor>
//   npm run user -- remove <username>
//
// In production: dokku run tlc npm run user -- add <username> --role editor
//
// New and reset passwords are generated and printed once; users can change theirs at /account.
import { generatePassword } from '../app/data/passwords.ts'
import {
  createUser,
  deleteUser,
  getUserByName,
  isRole,
  listUsers,
  setPassword,
  setRole,
  type Role,
} from '../app/data/users.ts'
import { migrateDatabase, openDatabase } from '../app/db.ts'

const [command, ...args] = process.argv.slice(2)

function usage(): never {
  console.error(
    'Usage: npm run user -- <list | add <name> [--role viewer|editor] | reset-password <name> | role <name> <role> | remove <name>>',
  )
  process.exit(1)
}

function parseRole(value: string | undefined): Role {
  if (value === undefined || !isRole(value)) {
    console.error('Role must be "viewer" or "editor".')
    process.exit(1)
  }
  return value
}

const db = openDatabase()
await migrateDatabase(db)

async function requireUser(name: string | undefined) {
  if (!name) usage()
  let user = await getUserByName(db, name)
  if (!user) {
    console.error(`No user "${name}".`)
    process.exit(1)
  }
  return user
}

try {
  switch (command) {
    case 'list': {
      let users = await listUsers(db)
      if (users.length === 0) console.log('No users yet.')
      for (let user of users) console.log(`${user.username.padEnd(24)} ${user.role}`)
      break
    }
    case 'add': {
      let [name, ...rest] = args
      if (!name) usage()
      let roleIndex = rest.indexOf('--role')
      let role = roleIndex === -1 ? 'viewer' : parseRole(rest[roleIndex + 1])
      let password = generatePassword()
      let user = await createUser(db, name, password, role)
      console.log(`Created ${user.role} "${user.username}" with password: ${password}`)
      break
    }
    case 'reset-password': {
      let user = await requireUser(args[0])
      let password = generatePassword()
      await setPassword(db, user.id, password)
      console.log(`New password for "${user.username}": ${password}`)
      console.log('Their existing sessions have been logged out.')
      break
    }
    case 'role': {
      let user = await requireUser(args[0])
      await setRole(db, user.id, parseRole(args[1]))
      console.log(`"${user.username}" is now ${args[1]}.`)
      break
    }
    case 'remove': {
      let user = await requireUser(args[0])
      await deleteUser(db, user.id)
      console.log(`Removed "${user.username}". Their sessions stop working immediately.`)
      break
    }
    default:
      usage()
  }
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
} finally {
  await db.close()
}
