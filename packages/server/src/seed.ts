import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@comeet.dev'
  const password = 'admin123'
  const name = 'Admin'

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { email },
      data: { isAdmin: true, passwordHash }
    })
    console.log(`\n  User updated: ${email}\n`)
    return
  }

  const oldUser = await prisma.user.findUnique({ where: { email: 'demo@comeet.dev' } })
  if (oldUser) {
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { email: 'demo@comeet.dev' },
      data: { email, name, passwordHash, isAdmin: true }
    })
    console.log(`\n  Migrated demo user to admin@comeet.dev\n`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, name, passwordHash, isAdmin: true }
  })

  await prisma.userSettings.create({
    data: { userId: user.id, language: 'Python' }
  })

  await prisma.meeting.create({
    data: {
      userId: user.id,
      title: 'Sample Technical Interview',
      status: 'ended',
      endedAt: new Date(),
      summary: 'A sample meeting demonstrating CoMeet capabilities.'
    }
  })

  console.log(`\n  Default admin user seeded`)
  console.log(`  Email: ${email}`)
  console.log(`  Name:  ${name}\n`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
