import path from 'path';
import { fileURLToPath } from 'url';
import { buildConfig } from 'payload';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { Albums } from './payload/collections/Albums';
import { Bookings } from './payload/collections/Bookings';
import { Leagues } from './payload/collections/Leagues';
import { Matches } from './payload/collections/Matches';
import { Media } from './payload/collections/Media';
import { News } from './payload/collections/News';
import { Players } from './payload/collections/Players';
import { Previews } from './payload/collections/Previews';
import { Reports } from './payload/collections/Reports';
import { Seasons } from './payload/collections/Seasons';
import { SourceRecords } from './payload/collections/SourceRecords';
import { TeamEvents } from './payload/collections/TeamEvents';
import { Teams } from './payload/collections/Teams';
import { Users } from './payload/collections/Users';
import { Venues } from './payload/collections/Venues';
import { clubSettings } from './payload/globals/ClubSettings';
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
  collections: [
    Users,
    Players,
    Teams,
    Venues,
    Leagues,
    Seasons,
    Matches,
    TeamEvents,
    Reports,
    Previews,
    News,
    Albums,
    Media,
    Bookings,
    SourceRecords,
  ],
  globals: [clubSettings],
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
