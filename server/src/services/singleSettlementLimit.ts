import { evalCommandScript, redis, redisKey } from '../redis';

const WINDOW_SECONDS = 60;
const PERSIST_LIMIT = 4;

const localCounts = new Map<string, { count: number; allowed: boolean; expiresAt: number; games: Set<string> }>();

/** Returns whether this completed single-player game should be persisted. */
export async function shouldPersistSingleSettlement(
  identityKey: string,
  gameId: string
): Promise<boolean> {
  const client = redis();
  if (!client) {
    const key = identityKey;
    const now = Date.now();
    let entry = localCounts.get(key);
    if (!entry || entry.expiresAt <= now) {
      entry = { count: 0, allowed: true, expiresAt: now + WINDOW_SECONDS * 1000, games: new Set() };
      localCounts.set(key, entry);
    }
    if (entry.games.has(gameId)) return true;
    entry.count += 1;
    entry.allowed = entry.count <= PERSIST_LIMIT;
    entry.games.add(gameId);
    return entry.allowed;
  }
  const result = await evalCommandScript(
    'single-settlement-soft-limit-v1',
    `local field = 'game:' .. ARGV[1]
     local existing = redis.call('HGET', KEYS[1], field)
     if existing then return tonumber(existing) end
     local count = tonumber(redis.call('HGET', KEYS[1], 'count') or 0) + 1
     local allowed = count <= tonumber(ARGV[2]) and 1 or 0
     redis.call('HSET', KEYS[1], 'count', tostring(count), field, tostring(allowed))
     if count == 1 or redis.call('TTL', KEYS[1]) < 0 then
       redis.call('EXPIRE', KEYS[1], ARGV[3])
     end
     return allowed`,
    [redisKey(`single:settlement-limit:${identityKey}`)],
    [gameId, String(PERSIST_LIMIT), String(WINDOW_SECONDS)]
  );
  return Number(result) === 1;
}
