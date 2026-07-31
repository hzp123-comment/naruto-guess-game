/**
 * 将 naruto_mobile_db.md 转换为 naruto-players.json
 * 用法: node convertDb.js
 */
const fs = require('fs');
const path = require('path');

const MD_FILE = 'C:/Users/hp/Downloads/narutodb-website-master/narutodb-website-master/src/pages/api/data/naruto_mobile_db.md';
const JSON_FILE = path.join(__dirname, 'seeds/naruto-players.json');

// 章节标题 → 忍村映射
const villageMap = {
  '一、木叶村': '木叶',
  '二、砂隐村': '砂隐',
  '三、雾隐村': '雾隐',
  '四、云隐村': '云隐',
  '五、岩隐村': '岩隐',
  '六、音隐村': '音隐',
  '七、晓组织': '其他',
  '八、雨隐村': '雨隐',
  '九、大筒木一族': '其他',
  '十、尾兽': '其他',
  '十一、其他角色': '其他',
};

function parseMarkdownTable(content) {
  const lines = content.split('\n');
  const players = [];
  let currentVillage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 检测章节标题
    for (const [key, value] of Object.entries(villageMap)) {
      if (line.startsWith('## ' + key) || line.includes(key)) {
        currentVillage = value;
        break;
      }
    }

    // 跳过表头和分隔线
    if (line.startsWith('| 角色名') || line.startsWith('|--------') || !line.startsWith('|')) {
      continue;
    }

    // 解析表格行
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length < 7) continue;

    const [name, familyOrg, rank, status, eyeTechnique, kekkei, jinchuriki] = cells;

    // 跳过非角色行
    if (name === '角色名' || name.includes('---')) continue;

    // 转换家族/组织为 JSON 数组字符串
    const familyOrgList = familyOrg.split('/').map(s => s.trim()).filter(s => s && s !== '其他');
    const familyOrgJson = JSON.stringify(familyOrgList.length > 0 ? familyOrgList : ['其他']);

    // 转换血继限界
    const hasKekkei = kekkei !== '无' && kekkei !== '';

    // 转换人柱力
    const isJinchuriki = jinchuriki !== '否' && jinchuriki !== '';

    // 确定忍村（晓组织成员保留"其他"）
    let village = currentVillage;
    if (familyOrg.includes('晓组织')) {
      village = '其他';
    }

    players.push({
      nickname: name,
      village: village,
      family_org: familyOrgJson,
      rank: rank,
      status: status,
      eye_technique: eyeTechnique,
      has_kekkei: hasKekkei,
      is_jinchuriki: isJinchuriki,
      is_easy: false,
      is_enabled: true,
    });
  }

  return players;
}

function main() {
  console.log('读取数据库文档:', MD_FILE);
  const content = fs.readFileSync(MD_FILE, 'utf8');

  console.log('解析 Markdown 表格...');
  const players = parseMarkdownTable(content);

  console.log(`共解析出 ${players.length} 个角色`);

  // 去重（按 nickname）
  const seen = new Set();
  const uniquePlayers = [];
  for (const player of players) {
    if (!seen.has(player.nickname)) {
      seen.add(player.nickname);
      uniquePlayers.push(player);
    }
  }
  console.log(`去重后剩余 ${uniquePlayers.length} 个角色`);

  // 写入 JSON 文件
  console.log('写入 JSON 文件:', JSON_FILE);
  fs.writeFileSync(JSON_FILE, JSON.stringify(uniquePlayers, null, 2), 'utf8');

  console.log('✅ 转换完成！');
  console.log(`角色总数: ${uniquePlayers.length}`);

  // 统计信息
  const stats = {
    木叶: 0, 砂隐: 0, 雾隐: 0, 云隐: 0, 岩隐: 0, 音隐: 0, 雨隐: 0, 其他: 0,
  };
  let jinchurikiCount = 0;
  let kekkeiCount = 0;
  let eyeCount = 0;

  for (const p of uniquePlayers) {
    stats[p.village] = (stats[p.village] || 0) + 1;
    if (p.is_jinchuriki) jinchurikiCount++;
    if (p.has_kekkei) kekkeiCount++;
    if (p.eye_technique !== '无') eyeCount++;
  }

  console.log('\n=== 统计信息 ===');
  console.log('按忍村分布:', stats);
  console.log('人柱力:', jinchurikiCount, '位');
  console.log('血继限界:', kekkeiCount, '位');
  console.log('瞳术使用者:', eyeCount, '位');
}

main();
