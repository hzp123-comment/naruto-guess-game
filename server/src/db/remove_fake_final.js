const fs = require('fs');
const path = require('path');

const playersPath = path.join(__dirname, 'seeds', 'naruto-players.json');
const data = JSON.parse(fs.readFileSync(playersPath, 'utf-8'));

const fakeCharacters = new Set([
  '宇智波叶月',
  '宇智波光炮',
  '千手阿间',
  '千手间木',
  '日向长老',
  '奈良鹿迪',
  '森野次郎',
  '铃木五郎',
  '德川',
  '月光花',
  '宇多田'
]);

const cleanedData = data.filter(player => {
  if (fakeCharacters.has(player.nickname)) {
    console.log(`删除虚构角色: ${player.nickname}`);
    return false;
  }
  return true;
});

console.log(`\n原始角色数: ${data.length}`);
console.log(`清理后角色数: ${cleanedData.length}`);
console.log(`删除了 ${data.length - cleanedData.length} 个虚构角色`);

fs.writeFileSync(playersPath, JSON.stringify(cleanedData, null, 2), 'utf-8');
console.log('\n文件已更新: naruto-players.json');
