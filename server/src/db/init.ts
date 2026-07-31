import type { Knex } from 'knex';
import { db } from './knex';
import { backfillLegacyPlayerDifficulties, ensureSchema } from './schema';
import playersData from './seeds/naruto-players.json';

const normalizeNickname = (value: string) => value.toLocaleLowerCase('en-US').replace(/[_-]/g, '');

export async function seedPlayersIfEmpty(): Promise<void> {
  const row = await db('players').count<{ c: number }[]>({ c: '*' });
  const count = Number(row[0].c);
  if (count > 0) return;
  const rows = (playersData as any[]).map((p) => ({
    nickname: p.nickname,
    village: p.village ?? '',
    family_org: p.family_org ?? '[]',
    rank: p.rank ?? '中忍',
    status: p.status ?? '存活',
    eye_technique: p.eye_technique ?? '无',
    has_kekkei: p.has_kekkei ?? false,
    is_jinchuriki: p.is_jinchuriki ?? false,
    is_easy: p.is_easy ?? false,
    is_enabled: p.is_enabled ?? true,
  }));
  await db.batchInsert('players', rows, 50);
  console.log(`[seed] 已导入 ${rows.length} 名角色`);
}

export async function backfillEasyPlayers(): Promise<void> {
  await db.transaction(async (trx) => {
    const applied = await trx('app_migrations').where({ name: 'naruto-easy-players' }).first();
    if (applied) return;
    const playerRows = await trx('players').select('id', 'nickname');
    const ids = playerRows
      .filter((player) => {
        const p = playersData.find((d: any) => d.nickname === player.nickname);
        return p?.is_easy;
      })
      .map((player) => player.id);
    for (let index = 0; index < ids.length; index += 200) {
      await trx('players').whereIn('id', ids.slice(index, index + 200)).update({ is_easy: true });
    }
    await trx('app_migrations')
      .insert({ name: 'naruto-easy-players' })
      .onConflict('name')
      .ignore();
  });
}

export async function initDb(): Promise<void> {
  await ensureSchema();
  await seedPlayersIfEmpty();
  await backfillEasyPlayers();
  await backfillLegacyPlayerDifficulties();
}
