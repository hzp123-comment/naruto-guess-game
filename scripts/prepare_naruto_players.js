/**
 * 导入火影角色数据到数据库
 */

const fs = require('fs');
const path = require('path');

// 读取火影角色数据
const narutoDataPath = "c:\\Users\\hp\\Downloads\\csgofriberg-main\\csgofriberg-main\\data\\imports\\boruto_players.json";
const narutoData = JSON.parse(fs.readFileSync(narutoDataPath, 'utf-8'));

// 转换为数据库格式
const players = narutoData.map(char => ({
  nickname: char.name,
  village: char.village,
  family_org: JSON.stringify(char.family_org),
  rank: char.rank,
  status: char.status,
  eye_technique: char.eye_technique,
  has_kekkei: char.has_kekkei,
  is_jinchuriki: char.is_jinchuriki,
  is_easy: ['影级', '上忍'].includes(char.rank),
  is_enabled: true
}));

// 保存为种子数据
const seedPath = "c:\\Users\\hp\\Downloads\\csgofriberg-main\\csgofriberg-main\\server\\src\\db\\seeds\\naruto-players.json";
fs.writeFileSync(seedPath, JSON.stringify(players, null, 2), 'utf-8');

console.log(`已转换 ${players.length} 个火影角色`);
console.log(`保存到: ${seedPath}`);

// 统计
const stats = {
  total: players.length,
  byVillage: {},
  byRank: {},
  byEye: {}
};

for (const p of players) {
  stats.byVillage[p.village] = (stats.byVillage[p.village] || 0) + 1;
  stats.byRank[p.rank] = (stats.byRank[p.rank] || 0) + 1;
  stats.byEye[p.eye_technique] = (stats.byEye[p.eye_technique] || 0) + 1;
}

console.log('\n=== 数据统计 ===');
console.log(`总数: ${stats.total}`);
console.log('\n按忍村:');
Object.entries(stats.byVillage).sort((a, b) => b[1] - a[1]).forEach(([v, c]) => console.log(`  ${v}: ${c}`));
console.log('\n按等级:');
Object.entries(stats.byRank).sort((a, b) => b[1] - a[1]).forEach(([r, c]) => console.log(`  ${r}: ${c}`));
console.log('\n按瞳术:');
Object.entries(stats.byEye).sort((a, b) => b[1] - a[1]).forEach(([e, c]) => console.log(`  ${e}: ${c}`));
