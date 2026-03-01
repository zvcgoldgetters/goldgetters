import path from 'path';
import { fileURLToPath } from 'url';
import { buildConfig } from 'payload';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { Users } from './payload/collections/Users';
import { serverEnv } from './lib/env/server';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

if (!serverEnv.payloadSecret) {
  throw new Error('PAYLOAD_SECRET must be set');
}

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users],
  editor: lexicalEditor(),
  graphQL: {
    disable: true,
  },
  secret: serverEnv.payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: serverEnv.databaseUri,
      authToken: serverEnv.databaseAuthToken,
    },
  }),
});
