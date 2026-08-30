import path from 'path';
import { fileURLToPath } from 'url';
import { buildConfig } from 'payload';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { RsvpEvents } from './payload/collections/RsvpEvents';
import { RsvpResponses } from './payload/collections/RsvpResponses';
import { TeamEvents } from './payload/collections/TeamEvents';
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
    autoLogin:
      process.env.NODE_ENV === 'development' &&
      serverEnv.payloadAutoLoginEnabled &&
      serverEnv.payloadAdminEmail &&
      serverEnv.payloadAdminPassword
        ? {
            email: serverEnv.payloadAdminEmail,
            password: serverEnv.payloadAdminPassword,
            prefillOnly: false,
          }
        : false,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, TeamEvents, RsvpEvents, RsvpResponses],
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
