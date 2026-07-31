import knex, { Knex } from 'knex';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

function resolveSqlitePath(dbUrl: string): string {
  const file = path.isAbsolute(dbUrl)
    ? dbUrl
    : path.resolve(__dirname, '../..', dbUrl);
  const dir = path.dirname(file);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
  } catch {
    const fallbackDir = process.env.NODE_ENV === 'production' ? '/tmp' : './data';
    fs.mkdirSync(fallbackDir, { recursive: true });
    return path.join(fallbackDir, path.basename(file));
  }
  return file;
}

function buildConfig(): Knex.Config {
  if (config.dbClient === 'pg') {
    return {
      client: 'pg',
      connection: config.dbUrl,
      pool: { min: config.dbPoolMin, max: config.dbPoolMax },
      acquireConnectionTimeout: config.dbAcquireTimeoutMs,
    };
  }
  const file = resolveSqlitePath(config.dbUrl);
  return {
    client: 'better-sqlite3',
    connection: { filename: file },
    useNullAsDefault: true,
  };
}

export const db = knex(buildConfig());
