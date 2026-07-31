import { Knex } from 'knex';
import { db } from './knex';
import { userNameFromUsername } from '../services/identityDisplay';
import { DIFFICULTY_LEVELS } from '../difficulties';
import { winningGuessMetricsByPlayer } from '../services/matchGuessMetrics';

const FIRST_GUESS_BACKFILL_BATCH_SIZE = 1000;
const USER_DISPLAY_ID_BACKFILL_BATCH_SIZE = 1000;
const PLAYER_DIFFICULTIES_BACKFILL_MIGRATION = '20260724-player-difficulties-backfill';
const MULTI_WINNING_GUESSES_BACKFILL_MIGRATION = '20260729-multi-winning-guesses-backfill';
const MULTI_WINNING_GUESSES_BACKFILL_BATCH_SIZE = 200;

export async function backfillLegacyPlayerDifficulties(instance: Knex = db): Promise<void> {
  await instance.transaction(async (trx) => {
    const applied = await trx('app_migrations')
      .where({ name: PLAYER_DIFFICULTIES_BACKFILL_MIGRATION })
      .first();
    if (applied) return;

    const players = await trx('players').select('id', 'is_easy');
    const memberships = players.flatMap((player) => [
      { player_id: player.id, difficulty_key: 'normal' },
      ...(Boolean(player.is_easy) ? [{ player_id: player.id, difficulty_key: 'easy' }] : []),
    ]);
    for (let index = 0; index < memberships.length; index += 500) {
      await trx('player_difficulties')
        .insert(memberships.slice(index, index + 500))
        .onConflict(['player_id', 'difficulty_key'])
        .ignore();
    }
    await trx('app_migrations')
      .insert({ name: PLAYER_DIFFICULTIES_BACKFILL_MIGRATION })
      .onConflict('name')
      .ignore();
  });
}

async function backfillUserDisplayIds(instance: Knex): Promise<void> {
  let cursor = 0;
  while (true) {
    const users = await instance('users')
      .select('id', 'username')
      .where('id', '>', cursor)
      .where((builder) => builder.whereNull('display_id').orWhere('display_id', ''))
      .orderBy('id')
      .limit(USER_DISPLAY_ID_BACKFILL_BATCH_SIZE);
    if (!users.length) return;
    cursor = Number(users[users.length - 1].id);
    await instance.transaction(async (trx) => {
      for (const user of users) {
        await trx('users').where({ id: user.id }).update({
          display_id: userNameFromUsername(user.username),
        });
      }
    });
  }
}

function firstGuessPlayerId(value: unknown): number {
  try {
    const guesses = JSON.parse(String(value));
    if (!Array.isArray(guesses) || !guesses.length) return 0;
    const first = guesses[0];
    const id = Number(
      typeof first === 'object' && first
        ? (first as { playerId?: unknown }).playerId
        : first
    );
    return Number.isInteger(id) && id > 0 ? id : 0;
  } catch {
    return 0;
  }
}

async function backfillFirstGuessPlayerIds(instance: Knex): Promise<void> {
  let cursor = 0;
  while (true) {
    const rows = await instance('games')
      .select('id', 'guesses')
      .where('id', '>', cursor)
      .whereNull('first_guess_player_id')
      .where('guess_count', '>', 0)
      .whereNot('status', 'playing')
      .orderBy('id')
      .limit(FIRST_GUESS_BACKFILL_BATCH_SIZE);
    if (!rows.length) return;
    cursor = Number(rows[rows.length - 1].id);

    const grouped = new Map<number, number[]>();
    for (const row of rows) {
      const playerId = firstGuessPlayerId(row.guesses);
      const ids = grouped.get(playerId) ?? [];
      ids.push(Number(row.id));
      grouped.set(playerId, ids);
    }
    await instance.transaction(async (trx) => {
      for (const [playerId, ids] of grouped) {
        await trx('games').whereIn('id', ids).update({ first_guess_player_id: playerId });
      }
    });
  }
}

async function backfillMultiWinningGuesses(instance: Knex): Promise<void> {
  const applied = await instance('app_migrations')
    .where({ name: MULTI_WINNING_GUESSES_BACKFILL_MIGRATION })
    .first();
  if (applied) return;

  let cursor = 0;
  while (true) {
    const matches = await instance('match_records')
      .select('id', 'replay')
      .where('id', '>', cursor)
      .orderBy('id')
      .limit(MULTI_WINNING_GUESSES_BACKFILL_BATCH_SIZE);
    if (!matches.length) break;
    cursor = Number(matches[matches.length - 1].id);
    await instance.transaction(async (trx) => {
      const matchIds = matches.map((match) => Number(match.id));
      await trx('match_players')
        .whereIn('match_id', matchIds)
        .update({ winning_guess_sum: 0, winning_rounds: 0 });
      for (const match of matches) {
        const metrics = winningGuessMetricsByPlayer(match.replay);
        for (const [playerKey, values] of metrics) {
          await trx('match_players')
            .where({ match_id: match.id, player_key: playerKey })
            .update({
              winning_guess_sum: values.winningGuessSum,
              winning_rounds: values.winningRounds,
            });
        }
      }
    });
  }

  await instance('app_migrations')
    .insert({ name: MULTI_WINNING_GUESSES_BACKFILL_MIGRATION })
    .onConflict('name')
    .ignore();
}

export async function ensureSchema(instance: Knex = db): Promise<void> {
  if (!(await instance.schema.hasTable('users'))) {
    await instance.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('username', 32).notNullable().unique();
      t.string('display_id', 8).nullable();
      t.string('password_hash', 128).notNullable();
      t.string('role', 16).notNullable().defaultTo('user');
      t.integer('token_version').notNullable().defaultTo(0);
      t.boolean('leaderboard_hidden').notNullable().defaultTo(false);
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  if (!(await instance.schema.hasColumn('users', 'token_version'))) {
    await instance.schema.alterTable('users', (t) => t.integer('token_version').notNullable().defaultTo(0));
  }
  if (!(await instance.schema.hasColumn('users', 'display_id'))) {
    await instance.schema.alterTable('users', (t) => t.string('display_id', 8).nullable());
  }
  if (!(await instance.schema.hasColumn('users', 'leaderboard_hidden'))) {
    await instance.schema.alterTable('users', (t) => {
      t.boolean('leaderboard_hidden').notNullable().defaultTo(false);
    });
  }
  await backfillUserDisplayIds(instance);
  const usersIndexConcurrently = instance.client.config.client === 'pg' ? ' concurrently' : '';
  await instance.raw(
    `create index${usersIndexConcurrently} if not exists "users_display_id_idx" on "users" ("display_id")`
  );

  if (!(await instance.schema.hasTable('api_tokens'))) {
    await instance.schema.createTable('api_tokens', (t) => {
      t.increments('id').primary();
      t.string('name', 64).notNullable();
      t.string('token_hash', 64).notNullable().unique();
      t.string('prefix', 16).notNullable();
      t.integer('created_by_user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      t.timestamp('expires_at').notNullable();
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  const apiTokensIndexConcurrently = instance.client.config.client === 'pg' ? ' concurrently' : '';
  await instance.raw(
    `create index${apiTokensIndexConcurrently} if not exists "api_tokens_owner_created_idx" on "api_tokens" ("created_by_user_id", "created_at")`
  );

  if (!(await instance.schema.hasTable('app_migrations'))) {
    await instance.schema.createTable('app_migrations', (t) => {
      t.string('name', 128).primary();
      t.timestamp('applied_at').notNullable().defaultTo(instance.fn.now());
    });
  }

  if (!(await instance.schema.hasTable('players'))) {
    await instance.schema.createTable('players', (t) => {
      t.increments('id').primary();
      t.string('nickname', 64).notNullable().unique();
      t.string('village', 32).notNullable().defaultTo('其他');
      t.text('family_org').notNullable().defaultTo('[]');
      t.string('rank', 16).notNullable().defaultTo('上忍');
      t.string('status', 16).notNullable().defaultTo('存活');
      t.string('eye_technique', 32).notNullable().defaultTo('无');
      t.boolean('has_kekkei').notNullable().defaultTo(false);
      t.boolean('is_jinchuriki').notNullable().defaultTo(false);
      t.boolean('is_easy').notNullable().defaultTo(false);
      t.boolean('is_enabled').notNullable().defaultTo(true);
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }

  // 如果旧的 CS:GO 表结构存在（有 nationality 列），则迁移为火影角色结构
  if (await instance.schema.hasColumn('players', 'nationality')) {
    await instance.schema.dropTableIfExists('players');
    await instance.schema.createTable('players', (t) => {
      t.increments('id').primary();
      t.string('nickname', 64).notNullable().unique();
      t.string('village', 32).notNullable().defaultTo('其他');
      t.text('family_org').notNullable().defaultTo('[]');
      t.string('rank', 16).notNullable().defaultTo('上忍');
      t.string('status', 16).notNullable().defaultTo('存活');
      t.string('eye_technique', 32).notNullable().defaultTo('无');
      t.boolean('has_kekkei').notNullable().defaultTo(false);
      t.boolean('is_jinchuriki').notNullable().defaultTo(false);
      t.boolean('is_easy').notNullable().defaultTo(false);
      t.boolean('is_enabled').notNullable().defaultTo(true);
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
    console.log('[schema] 已迁移 players 表为火影角色结构');
  }

  // 确保新列存在
  if (!(await instance.schema.hasColumn('players', 'village'))) {
    await instance.schema.alterTable('players', (t) => {
      t.string('village', 32).notNullable().defaultTo('其他');
    });
  }
  if (!(await instance.schema.hasColumn('players', 'family_org'))) {
    await instance.schema.alterTable('players', (t) => {
      t.text('family_org').notNullable().defaultTo('[]');
    });
  }
  if (!(await instance.schema.hasColumn('players', 'rank'))) {
    await instance.schema.alterTable('players', (t) => {
      t.string('rank', 16).notNullable().defaultTo('上忍');
    });
  }
  if (!(await instance.schema.hasColumn('players', 'status'))) {
    await instance.schema.alterTable('players', (t) => {
      t.string('status', 16).notNullable().defaultTo('存活');
    });
  }
  if (!(await instance.schema.hasColumn('players', 'eye_technique'))) {
    await instance.schema.alterTable('players', (t) => {
      t.string('eye_technique', 32).notNullable().defaultTo('无');
    });
  }
  if (!(await instance.schema.hasColumn('players', 'has_kekkei'))) {
    await instance.schema.alterTable('players', (t) => {
      t.boolean('has_kekkei').notNullable().defaultTo(false);
    });
  }
  if (!(await instance.schema.hasColumn('players', 'is_jinchuriki'))) {
    await instance.schema.alterTable('players', (t) => {
      t.boolean('is_jinchuriki').notNullable().defaultTo(false);
    });
  }
  if (!(await instance.schema.hasColumn('players', 'is_easy'))) {
    await instance.schema.alterTable('players', (t) => {
      t.boolean('is_easy').notNullable().defaultTo(false);
    });
  }
  if (!(await instance.schema.hasColumn('players', 'is_enabled'))) {
    await instance.schema.alterTable('players', (t) => {
      t.boolean('is_enabled').notNullable().defaultTo(true);
    });
  }

  // 旧版 games 表 user_id 不可空且无 guest_key;检测到旧结构则重建(开发期数据可丢弃)
  if (
    (await instance.schema.hasTable('games')) &&
    !(await instance.schema.hasColumn('games', 'guest_key'))
  ) {
    await instance.schema.dropTable('games');
  }
  if (!(await instance.schema.hasTable('games'))) {
    await instance.schema.createTable('games', (t) => {
      t.increments('id').primary();
      t.string('session_id', 64).nullable();
      t.integer('user_id').nullable().references('id').inTable('users');
      t.string('guest_key', 64).nullable().index();
      t.integer('target_player_id').notNullable().references('id').inTable('players');
      t.string('mode', 16).notNullable().defaultTo('easy');
      t.text('guesses').notNullable().defaultTo('[]');
      t.text('guess_times').notNullable().defaultTo('[]');
      t.integer('first_guess_player_id').nullable();
      t.string('status', 16).notNullable().defaultTo('playing');
      t.integer('guess_count').notNullable().defaultTo(0);
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
      t.timestamp('finished_at').nullable();
    });
  }
  if (!(await instance.schema.hasColumn('games', 'session_id'))) {
    await instance.schema.alterTable('games', (t) => t.string('session_id', 64).nullable());
  }
  if (!(await instance.schema.hasColumn('games', 'guess_times'))) {
    await instance.schema.alterTable('games', (t) => t.text('guess_times').notNullable().defaultTo('[]'));
  }
  if (!(await instance.schema.hasTable('difficulty_levels'))) {
    await instance.schema.createTable('difficulty_levels', (t) => {
      t.string('key', 32).primary();
      t.integer('sort_order').notNullable().defaultTo(0);
      t.boolean('is_enabled').notNullable().defaultTo(true);
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  await instance('difficulty_levels')
    .insert(DIFFICULTY_LEVELS.map((difficulty) => ({
      key: difficulty.key,
      sort_order: difficulty.sortOrder,
      is_enabled: difficulty.isEnabled,
    })))
    .onConflict('key')
    .merge(['sort_order', 'is_enabled']);
  if (!(await instance.schema.hasTable('player_difficulties'))) {
    await instance.schema.createTable('player_difficulties', (t) => {
      t.integer('player_id').notNullable().references('id').inTable('players').onDelete('CASCADE');
      t.string('difficulty_key', 32).notNullable().references('key').inTable('difficulty_levels').onDelete('CASCADE');
      t.primary(['player_id', 'difficulty_key']);
      t.index(['difficulty_key', 'player_id']);
    });
  }
  if (!(await instance.schema.hasColumn('games', 'first_guess_player_id'))) {
    await instance.schema.alterTable('games', (t) => t.integer('first_guess_player_id').nullable());
  }
  await backfillFirstGuessPlayerIds(instance);
  await instance.raw(
    'create unique index if not exists "games_session_id_unique" on "games" ("session_id")'
  );
  // Active single-player games now live only in Redis and are not historical records.
  await instance('games').where({ status: 'playing' }).del();

  if (
    (await instance.schema.hasTable('match_records')) &&
    !(await instance.schema.hasColumn('match_records', 'bo_type'))
  ) {
    await instance.schema.dropTable('match_records');
  }
  if (!(await instance.schema.hasTable('match_records'))) {
    await instance.schema.createTable('match_records', (t) => {
      t.increments('id').primary();
      t.string('room_id', 64).notNullable();
      t.string('db_type', 16).notNullable().defaultTo('easy');
      t.integer('bo_type').notNullable().defaultTo(3);
      t.integer('winner_id').nullable().references('id').inTable('users');
      t.string('winner_key', 80).nullable();
      t.string('finish_reason', 32).nullable();
      t.string('forfeited_key', 80).nullable();
      t.text('players').notNullable().defaultTo('[]');
      t.text('replay').notNullable().defaultTo('[]');
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
      t.unique(['room_id']);
    });
  }
  if (!(await instance.schema.hasColumn('match_records', 'replay'))) {
    await instance.schema.alterTable('match_records', (t) => {
      t.text('replay').notNullable().defaultTo('[]');
    });
  }
  if (!(await instance.schema.hasColumn('match_records', 'db_type'))) {
    await instance.schema.alterTable('match_records', (t) => {
      t.string('db_type', 16).notNullable().defaultTo('easy');
    });
  }
  if (!(await instance.schema.hasColumn('match_records', 'winner_key'))) {
    await instance.schema.alterTable('match_records', (t) => {
      t.string('winner_key', 80).nullable();
    });
  }
  if (!(await instance.schema.hasColumn('match_records', 'finish_reason'))) {
    await instance.schema.alterTable('match_records', (t) => {
      t.string('finish_reason', 32).nullable();
    });
  }
  if (!(await instance.schema.hasColumn('match_records', 'forfeited_key'))) {
    await instance.schema.alterTable('match_records', (t) => {
      t.string('forfeited_key', 80).nullable();
    });
  }

  if (!(await instance.schema.hasTable('match_players'))) {
    await instance.schema.createTable('match_players', (t) => {
      t.increments('id').primary();
      t.integer('match_id').notNullable().references('id').inTable('match_records').onDelete('CASCADE');
      t.integer('user_id').nullable().references('id').inTable('users');
      t.string('player_key', 80).notNullable();
      t.string('player_name', 32).notNullable().defaultTo('');
      t.integer('score').notNullable().defaultTo(0);
      t.boolean('is_winner').notNullable().defaultTo(false);
      t.integer('winning_guess_sum').notNullable().defaultTo(0);
      t.integer('winning_rounds').notNullable().defaultTo(0);
      t.unique(['match_id', 'player_key']);
      t.index(['user_id', 'is_winner'], 'match_players_user_winner_idx');
    });
  }
  if (!(await instance.schema.hasColumn('match_players', 'winning_guess_sum'))) {
    await instance.schema.alterTable('match_players', (t) => {
      t.integer('winning_guess_sum').notNullable().defaultTo(0);
    });
  }
  if (!(await instance.schema.hasColumn('match_players', 'winning_rounds'))) {
    await instance.schema.alterTable('match_players', (t) => {
      t.integer('winning_rounds').notNullable().defaultTo(0);
    });
  }

  if (instance.client.config.client === 'pg') {
    await instance.raw(
      'alter table "match_records" alter column "room_id" type varchar(64)'
    );
  }

  const matchPlayerCount = Number(
    (await instance('match_players').count<{ count: number }[]>({ count: '*' }))[0].count
  );
  if (matchPlayerCount === 0) {
    const legacyMatches = await instance('match_records').select('id', 'winner_id', 'players');
    for (const match of legacyMatches) {
      let players: { userId: number | null; name: string; score: number }[] = [];
      try {
        players = JSON.parse(match.players);
      } catch {
        continue;
      }
      if (players.length) {
        await instance('match_players').insert(
          players.map((player, index) => ({
            match_id: match.id,
            user_id: player.userId,
            player_key: player.userId != null ? `u:${player.userId}` : `legacy:${match.id}:${index}`,
            player_name: player.name,
            score: player.score,
            is_winner: player.userId != null && player.userId === match.winner_id,
          }))
        );
      }
    }
  }
  await backfillMultiWinningGuesses(instance);

  const gameIndexes = [
    ['games_user_status_mode_idx', ['user_id', 'status', 'mode']],
    ['games_guest_status_mode_idx', ['guest_key', 'status', 'mode']],
    ['games_user_finished_idx', ['user_id', 'finished_at']],
    ['games_guest_finished_idx', ['guest_key', 'finished_at']],
  ] as const;
  for (const [name, columns] of gameIndexes) {
    const quotedColumns = columns.map((column) => `\"${column}\"`).join(', ');
    await instance.raw(`create index if not exists \"${name}\" on \"games\" (${quotedColumns})`);
  }
  const firstGuessIndexes = [
    ['games_first_guess_idx', ['first_guess_player_id']],
    ['games_user_first_guess_idx', ['user_id', 'first_guess_player_id']],
    ['games_guest_first_guess_idx', ['guest_key', 'first_guess_player_id']],
  ] as const;
  for (const [name, columns] of firstGuessIndexes) {
    const quotedColumns = columns.map((column) => `\"${column}\"`).join(', ');
    const concurrently = instance.client.config.client === 'pg' ? ' concurrently' : '';
    await instance.raw(
      `create index${concurrently} if not exists \"${name}\" on \"games\" (${quotedColumns})`
    );
  }

  await instance.raw(
    'create unique index if not exists "match_records_room_id_unique" on "match_records" ("room_id")'
  );
  await instance.raw(
    'create index if not exists "match_records_created_at_idx" on "match_records" ("created_at", "id")'
  );
  await instance.raw(
    'create index if not exists "match_players_user_match_idx" on "match_players" ("user_id", "match_id")'
  );
  await instance.raw(
    'create index if not exists "match_players_key_match_idx" on "match_players" ("player_key", "match_id")'
  );

  if (!(await instance.schema.hasTable('announcements'))) {
    await instance.schema.createTable('announcements', (t) => {
      t.increments('id').primary();
      t.string('title', 128).notNullable();
      t.text('content').notNullable();
      t.boolean('is_popup').notNullable().defaultTo(false);
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  if (!(await instance.schema.hasColumn('announcements', 'is_popup'))) {
    await instance.schema.alterTable('announcements', (t) => {
      t.boolean('is_popup').notNullable().defaultTo(false);
    });
  }

  // === 火影角色数据迁移 ===
  // 检查是否需要迁移（通过检查是否存在旧列）
  const needsNarutoMigration = await instance.schema.hasColumn('players', 'nationality');
  if (needsNarutoMigration) {
    // 备份旧数据
    const oldPlayers = await instance('players').select('*');
    
    // 删除旧表
    await instance.schema.dropTableIfExists('players');
    
    // 创建新表
    await instance.schema.createTable('players', (t) => {
      t.increments('id').primary();
      t.string('nickname', 64).notNullable().unique();
      t.string('village', 32).notNullable().defaultTo('其他');
      t.text('family_org').notNullable().defaultTo('[]'); // JSON数组存储多个家族/组织
      t.string('rank', 16).notNullable().defaultTo('上忍'); // 下忍/中忍/上忍/影级
      t.string('status', 16).notNullable().defaultTo('存活'); // 存活/阵亡/失踪
      t.string('eye_technique', 32).notNullable().defaultTo('无'); // 无/写轮眼/白眼/轮回眼
      t.boolean('has_kekkei').notNullable().defaultTo(false); // 是否有血继限界
      t.boolean('is_jinchuriki').notNullable().defaultTo(false); // 是否人柱力
      t.boolean('is_easy').notNullable().defaultTo(false);
      t.boolean('is_enabled').notNullable().defaultTo(true);
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
    
    // 插入新数据（通过导入脚本处理）
    console.log('=== 火影角色数据库迁移完成 ===');
    console.log(`备份旧数据: ${oldPlayers.length} 条记录`);
    console.log('请运行数据导入脚本以填充新数据');
    
    // 删除依赖 players 的表数据
    await instance('games').del();
    await instance('player_difficulties').del();
  }
}

// 初始化火影角色数据库
export async function initNarutoPlayers(instance: Knex = db): Promise<void> {
  // 删除旧数据
  await instance('players').del();
  
  // 新表结构已经在 ensureSchema 中创建
  // 数据将在运行时通过 API 导入
}
