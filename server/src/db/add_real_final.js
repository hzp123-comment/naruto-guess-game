const fs = require('fs');
const path = require('path');

const playersPath = path.join(__dirname, 'seeds', 'naruto-players.json');
const data = JSON.parse(fs.readFileSync(playersPath, 'utf-8'));

const existingNames = new Set(data.map(p => p.nickname));

const newCharacters = [
  {
    nickname: '千手瓦间',
    village: '木叶',
    family_org: '["千手家族"]',
    rank: '下忍',
    status: '阵亡',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '水户门炎',
    village: '木叶',
    family_org: '["其他"]',
    rank: '上忍',
    status: '存活',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '转寝小春',
    village: '木叶',
    family_org: '["其他"]',
    rank: '上忍',
    status: '存活',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '秋道丁座',
    village: '木叶',
    family_org: '["秋道家族"]',
    rank: '上忍',
    status: '存活',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '艾',
    village: '云隐',
    family_org: '["其他"]',
    rank: '影级',
    status: '存活',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '达鲁伊',
    village: '云隐',
    family_org: '["其他"]',
    rank: '影级',
    status: '存活',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '希',
    village: '云隐',
    family_org: '["其他"]',
    rank: '上忍',
    status: '存活',
    eye_technique: '白眼',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '金角',
    village: '云隐',
    family_org: '["其他"]',
    rank: '上忍',
    status: '阵亡',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: true,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '银角',
    village: '云隐',
    family_org: '["其他"]',
    rank: '上忍',
    status: '阵亡',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: true,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '赤土',
    village: '岩隐',
    family_org: '["其他"]',
    rank: '上忍',
    status: '存活',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '白',
    village: '其他',
    family_org: '["其他"]',
    rank: '上忍',
    status: '阵亡',
    eye_technique: '无',
    has_kekkei: true,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '左近',
    village: '音隐',
    family_org: '["音隐五人众"]',
    rank: '上忍',
    status: '阵亡',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '右近',
    village: '音隐',
    family_org: '["音隐五人众"]',
    rank: '上忍',
    status: '阵亡',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '伊势乌冬',
    village: '木叶',
    family_org: '["其他"]',
    rank: '下忍',
    status: '存活',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: false,
    is_enabled: true
  },
  {
    nickname: '风祭萌黄',
    village: '木叶',
    family_org: '["其他"]',
    rank: '下忍',
    status: '存活',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: false,
    is_enabled: true
  },
  {
    nickname: '菖蒲',
    village: '木叶',
    family_org: '["其他"]',
    rank: '下忍',
    status: '存活',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: false,
    is_enabled: true
  },
  {
    nickname: '白绝',
    village: '其他',
    family_org: '["晓组织"]',
    rank: '上忍',
    status: '阵亡',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  },
  {
    nickname: '黑绝',
    village: '其他',
    family_org: '["晓组织"]',
    rank: '上忍',
    status: '存活',
    eye_technique: '无',
    has_kekkei: false,
    is_jinchuriki: false,
    is_easy: true,
    is_enabled: true
  }
];

const uniqueNewChars = newCharacters.filter(char => {
  if (existingNames.has(char.nickname)) {
    console.log(`跳过已存在角色: ${char.nickname}`);
    return false;
  }
  return true;
});

console.log(`\n添加 ${uniqueNewChars.length} 个新角色`);
uniqueNewChars.forEach(char => console.log(`  + ${char.nickname}`));

const updatedData = [...data, ...uniqueNewChars];
fs.writeFileSync(playersPath, JSON.stringify(updatedData, null, 2), 'utf-8');

console.log(`\n最终角色数: ${updatedData.length}`);
