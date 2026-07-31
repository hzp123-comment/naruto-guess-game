import { randomUUID } from 'crypto';
import { evalCommandScript, redis, redisKey } from '../redis';
import { GuessFeedback } from '../types';

export type SingleGameMode = string;

export interface SingleGameState {
  id: string;
  identityKey: string;
  userId: number | null;
  guestKey: string | null;
  mode: SingleGameMode;
  targetPlayerId: number;
  guesses: GuessFeedback[];
  guessTimes: Array<number | null>;
  createdAt: number;
  lastActiveAt: number;
}

export const SINGLE_GAME_TTL_SECONDS = 1800;

// 内存存储（单机模式降级方案）
const memoryStore = new Map<string, string>();
const memoryActiveMap = new Map<string, string>();

function gameKey(id: string): string {
  return redisKey(`single:game:${id}`);
}

function activeKey(identityKey: string, mode: SingleGameMode): string {
  return redisKey(`single:active:${identityKey}:${mode}`);
}

function normalizeGuessTimes(game: SingleGameState): void {
  if (!Array.isArray(game.guessTimes)) game.guessTimes = [];
  game.guessTimes = game.guessTimes.map((value) => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : null
  ));
  if (game.guessTimes.length > game.guesses.length) {
    game.guessTimes = game.guessTimes.slice(0, game.guesses.length);
  }
  while (game.guessTimes.length < game.guesses.length) game.guessTimes.push(null);
}

function isRedisAvailable(): boolean {
  return redis() !== null;
}

export async function createOrResumeSingleGame(input: {
  identityKey: string;
  userId: number | null;
  guestKey: string | null;
  mode: SingleGameMode;
  targetPlayerId: number;
}): Promise<SingleGameState> {
  const useRedis = isRedisAvailable();
  const active = activeKey(input.identityKey, input.mode);
  
  if (useRedis) {
    const client = redis()!;
    const existingId = await client.get(active);
    if (existingId) {
      const existing = await loadSingleGame(existingId, input.identityKey);
      if (existing) return existing;
      await client.del(active);
    }
  } else {
    const existingId = memoryActiveMap.get(active);
    if (existingId) {
      const existing = await loadSingleGame(existingId, input.identityKey);
      if (existing) return existing;
      memoryActiveMap.delete(active);
    }
  }

  const now = Date.now();
  const game: SingleGameState = {
    id: randomUUID(),
    identityKey: input.identityKey,
    userId: input.userId,
    guestKey: input.guestKey,
    mode: input.mode,
    targetPlayerId: input.targetPlayerId,
    guesses: [],
    guessTimes: [],
    createdAt: now,
    lastActiveAt: now,
  };
  await saveSingleGame(game);
  return game;
}

export async function loadSingleGame(
  id: string,
  identityKey: string,
  touch = false
): Promise<SingleGameState | null> {
  const useRedis = isRedisAvailable();
  let raw: string | null;
  
  if (useRedis) {
    raw = await redis()!.get(gameKey(id));
  } else {
    raw = memoryStore.get(gameKey(id)) ?? null;
  }
  
  if (!raw) return null;
  const game = JSON.parse(raw) as SingleGameState;
  if (game.identityKey !== identityKey) return null;
  if (!Array.isArray(game.guesses)) game.guesses = [];
  normalizeGuessTimes(game);
  if (game.lastActiveAt + SINGLE_GAME_TTL_SECONDS * 1000 <= Date.now()) {
    await deleteSingleGame(game);
    return null;
  }
  if (touch) {
    game.lastActiveAt = Date.now();
    await saveSingleGame(game);
  }
  return game;
}

export async function saveSingleGame(game: SingleGameState): Promise<void> {
  const useRedis = isRedisAvailable();
  normalizeGuessTimes(game);
  game.lastActiveAt = Date.now();
  
  if (useRedis) {
    const client = redis()!;
    await client.multi()
      .set(gameKey(game.id), JSON.stringify(game), { EX: SINGLE_GAME_TTL_SECONDS })
      .set(activeKey(game.identityKey, game.mode), game.id, { EX: SINGLE_GAME_TTL_SECONDS })
      .exec();
  } else {
    memoryStore.set(gameKey(game.id), JSON.stringify(game));
    memoryActiveMap.set(activeKey(game.identityKey, game.mode), game.id);
  }
}

export async function deleteSingleGame(game: SingleGameState): Promise<void> {
  const useRedis = isRedisAvailable();
  const active = activeKey(game.identityKey, game.mode);
  const gameKeyStr = gameKey(game.id);
  
  if (useRedis) {
    try {
      await evalCommandScript(
        'single-game-delete-v1',
        `if redis.call('get', KEYS[1]) == ARGV[1] then
           return redis.call('del', KEYS[1], KEYS[2])
         end
         return redis.call('del', KEYS[2])`,
        [active, gameKeyStr],
        [game.id]
      );
      return;
    } catch {
      // Redis 命令失败，尝试直接删除
      const client = redis();
      if (client) {
        try {
          await client.del(gameKeyStr);
          await client.del(active);
          return;
        } catch {
          // 直接删除也失败，回退到内存存储
        }
      }
    }
  }
  // 回退到内存存储
  memoryStore.delete(gameKeyStr);
  memoryActiveMap.delete(active);
}
