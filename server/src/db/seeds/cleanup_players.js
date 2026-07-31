const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'naruto-players.json');
const outputFile = path.join(__dirname, 'naruto-players-cleaned.json');

const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

// 需要删除的昵称列表（没有具体名字的人物）
const removePatterns = [
  '长老',           // 日向长老
  '二代',           // 二代雷影、二代水影等
  '初代',           // 初代雷影、初代水影等
  '三代',           // 三代雷影
  '之父',           // XX之父
  '之母',           // XX之母
  '之兄',           // XX之兄
  '之姐',           // XX之姐
  '之弟',           // XX之弟
  '之妹',           // XX之妹
  '之师',           // XX之师
  '之祖',           // XX之祖父、XX之祖母
  '之子',           // XX之子
  '叔父',           // XX之叔父
  '一族之长',       // 日向一族之长、猿飞一族之长
  '之姐',           // XX之姐
];

function shouldRemove(nickname) {
  // 精确匹配的情况
  const exactMatches = ['日向长老'];
  if (exactMatches.includes(nickname)) return true;
  
  // 二代/初代/三代 X 影
  if (/^(初代|二代|三代|四代|五代)[水土雷风影]$/.test(nickname)) return true;
  
  // 关系描述的人物
  for (const pattern of removePatterns) {
    if (pattern === '长老') {
      if (nickname.endsWith('长老')) return true;
    } else if (pattern === '一族之长') {
      if (nickname.endsWith('一族之长')) return true;
    } else {
      if (nickname.endsWith(pattern)) return true;
    }
  }
  
  return false;
}

const cleaned = data.filter(p => !shouldRemove(p.nickname));
const removed = data.filter(p => shouldRemove(p.nickname));

console.log(`原始数量: ${data.length}`);
console.log(`删除数量: ${removed.length}`);
console.log(`剩余数量: ${cleaned.length}`);
console.log('\n删除的人物:');
removed.forEach(p => console.log(`  - ${p.nickname}`));

fs.writeFileSync(outputFile, JSON.stringify(cleaned, null, 2), 'utf-8');
console.log(`\n已保存到: ${outputFile}`);
