import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL;
const isPostgres = databaseUrl?.startsWith('postgres');

export default defineConfig({
  schema: isPostgres ? './src/lib/db/schema.postgres.ts' : './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: isPostgres ? 'postgresql' : 'sqlite',
  dbCredentials: isPostgres 
    ? { url: databaseUrl! }
    : { url: databaseUrl?.replace('file:', '') || './data/ai-tutor.db' },
});
