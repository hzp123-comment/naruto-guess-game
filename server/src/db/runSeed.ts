import { db } from './knex';
import { ensureSchema } from './schema';
import narutoPlayersData from './seeds/naruto-players.json';

// 火影角色种子数据导入
async function run() {
  await ensureSchema();
  
  console.log('[seed] 开始导入火影角色数据...');
  
  // 清空现有数据（如果需要重新导入）
  const existingCount = await db('players').count('* as count');
  if (Number((existingCount as any)[0].count) > 0) {
    console.log('[seed] 清空现有选手数据...');
    await db('player_difficulties').del();
    await db('players').del();
  }
  
  // 导入火影角色
  const rows = (narutoPlayersData as any[]).map((p) => ({
    nickname: p.nickname,
    village: p.village,
    family_org: p.family_org,
    rank: p.rank,
    status: p.status,
    eye_technique: p.eye_technique,
    has_kekkei: p.has_kekkei ?? false,
    is_jinchuriki: p.is_jinchuriki ?? false,
    is_easy: p.is_easy ?? false,
    is_enabled: p.is_enabled ?? true,
  }));
  
  console.log(`[seed] 导入 ${rows.length} 个火影角色...`);
  
  if (rows.length) {
    await db.batchInsert('players', rows, 50);
    
    // 为所有角色添加 normal 难度
    const players = await db('players').select('id', 'nickname', 'is_easy');
    const memberships = players.flatMap((player: any) => [
      { player_id: player.id, difficulty_key: 'normal' },
      ...(player.is_easy ? [{ player_id: player.id, difficulty_key: 'easy' }] : []),
    ]);
    
    for (let index = 0; index < memberships.length; index += 500) {
      await db('player_difficulties').insert(memberships.slice(index, index + 500))
        .onConflict(['player_id', 'difficulty_key']).ignore();
    }
  }
  
  // 统计导入结果
  const stats = await db('players')
    .select('village')
    .count('* as count')
    .groupBy('village');
  
  console.log('[seed] 导入完成！');
  console.log(`[seed] 共导入 ${rows.length} 个角色`);
  console.log('[seed] 按忍村分布:');
  stats.forEach((s: any) => console.log(`  ${s.village}: ${s.count}`));
  
  await db.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
