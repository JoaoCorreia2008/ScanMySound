const { PrismaClient } = require('@prisma/client')

const prisma = globalThis.__scanmymusicPrisma || new PrismaClient({
	log: ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
	globalThis.__scanmymusicPrisma = prisma
}

module.exports = prisma
