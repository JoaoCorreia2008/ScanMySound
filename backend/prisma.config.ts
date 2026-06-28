// Configuração do Prisma CLI.
// O provider e o url são lidos diretamente do schema.prisma.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
})
