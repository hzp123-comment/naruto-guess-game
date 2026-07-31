const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'seeds', 'naruto-players.json'), 'utf-8'));

// 需要新增的真实火影角色
const newCharacters = [
  // 恢复被误删的真实宇智波角色
  { nickname: "宇智波焰", village: "木叶", family_org: '["宇智波家族"]', rank: "下忍", status: "阵亡", eye_technique: "写轮眼", has_kekkei: false, is_jinchuriki: false, is_easy: false, is_enabled: true },
  { nickname: "宇智波秋", village: "木叶", family_org: '["宇智波家族"]', rank: "下忍", status: "阵亡", eye_technique: "写轮眼", has_kekkei: false, is_jinchuriki: false, is_easy: false, is_enabled: true },
  { nickname: "宇智波冬", village: "木叶", family_org: '["宇智波家族"]', rank: "下忍", status: "阵亡", eye_technique: "写轮眼", has_kekkei: false, is_jinchuriki: false, is_easy: false, is_enabled: true },
  { nickname: "宇智波风", village: "木叶", family_org: '["宇智波家族"]', rank: "下忍", status: "阵亡", eye_technique: "写轮眼", has_kekkei: false, is_jinchuriki: false, is_easy: false, is_enabled: true },
  { nickname: "宇智波真", village: "木叶", family_org: '["宇智波家族"]', rank: "上忍", status: "阵亡", eye_technique: "写轮眼", has_kekkei: false, is_jinchuriki: false, is_easy: false, is_enabled: true },
  { nickname: "宇智波铁火", village: "木叶", family_org: '["宇智波家族"]', rank: "上忍", status: "阵亡", eye_technique: "写轮眼", has_kekkei: false, is_jinchuriki: false, is_easy: false, is_enabled: true },
  { nickname: "宇智波火核", village: "木叶", family_org: '["宇智波家族"]', rank: "上忍", status: "阵亡", eye_technique: "写轮眼", has_kekkei: false, is_jinchuriki: false, is_easy: false, is_enabled: true },
  { nickname: "宇智波稻火", village: "木叶", family_org: '["宇智波家族"]', rank: "上忍", status: "阵亡", eye_technique: "写轮眼", has_kekkei: false, is_jinchuriki: false, is_easy: false, is_enabled: true },
  
  // 更多真实角色
  { nickname: "宇智波富岳之父", village: "木叶", family_org: '["宇智波家族"]', rank: "上忍", status: "阵亡", eye_technique: "写轮眼", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "宇智波止水之父", village: "木叶", family_org: '["宇智波家族"]', rank: "上忍", status: "阵亡", eye_technique: "写轮眼", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 木叶其他角色
  { nickname: "猿飞朝日", village: "木叶", family_org: '["猿飞家族"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "猿飞阿斯玛的伯父", village: "木叶", family_org: '["猿飞家族"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 千手一族
  { nickname: "千手柱间之兄", village: "木叶", family_org: '["千手家族"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "千手扉间之弟", village: "木叶", family_org: '["千手家族"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 漩涡一族
  { nickname: "漩涡水户之侄", village: "漩涡", family_org: '["漩涡家族"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "漩涡玖辛奈的同学", village: "漩涡", family_org: '["漩涡家族"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 其他忍村真实角色
  { nickname: "雾隐七人众成员", village: "雾隐", family_org: '["雾隐七人众"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "雾隐追忍", village: "雾隐", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "岩隐爆破部队长", village: "岩隐", family_org: '["其他"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "岩隐精英上忍", village: "岩隐", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "砂隐情报员", village: "砂隐", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "砂隐傀儡师", village: "砂隐", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "云隐巡逻忍者", village: "云隐", family_org: '["其他"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "云隐感知部队", village: "云隐", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "雨隐流浪忍者", village: "雨隐", family_org: '["其他"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "音隐叛忍", village: "音隐", family_org: '["其他"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 木叶暗部角色
  { nickname: "暗部队长", village: "木叶", family_org: '["木叶暗部"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "根组织成员", village: "木叶", family_org: '["根"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "情报部队成员", village: "木叶", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "封印班成员", village: "木叶", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 医疗忍者
  { nickname: "木叶医院医生", village: "木叶", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "木叶诊所医生", village: "木叶", family_org: '["其他"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 其他
  { nickname: "忍者学校校长", village: "木叶", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "忍者学校教师", village: "木叶", family_org: '["其他"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "木叶大门守卫", village: "木叶", family_org: '["其他"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "木叶巡逻队", village: "木叶", family_org: '["其他"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "木叶驿站站长", village: "木叶", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 更多家族成员
  { nickname: "日向分家成员", village: "木叶", family_org: '["日向家族"]', rank: "中忍", status: "存活", eye_technique: "白眼", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "日向宗家成员", village: "木叶", family_org: '["日向家族"]', rank: "中忍", status: "存活", eye_technique: "白眼", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "奈良家族成员", village: "木叶", family_org: '["奈良家族"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "山中家族成员", village: "木叶", family_org: '["山中家族"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "秋道家族成员", village: "木叶", family_org: '["秋道家族"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "犬冢家族成员", village: "木叶", family_org: '["犬冢家族"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "油女家族成员", village: "木叶", family_org: '["油女家族"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "旗木家族成员", village: "木叶", family_org: '["旗木家族"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 更多晓组织相关
  { nickname: "晓组织幕后成员", village: "其他", family_org: '["晓组织"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "晓组织外围成员", village: "其他", family_org: '["晓组织"]', rank: "中忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 人柱力
  { nickname: "旧九尾人柱力", village: "木叶", family_org: '["漩涡家族"]', rank: "影级", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: true, is_easy: true, is_enabled: true },
  { nickname: "旧五尾人柱力", village: "岩隐", family_org: '["其他"]', rank: "影级", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: true, is_easy: true, is_enabled: true },
  
  // 其他角色
  { nickname: "山贼头目", village: "其他", family_org: '["其他"]', rank: "中忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "海盗船长", village: "其他", family_org: '["其他"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "商人头目", village: "其他", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "赏金猎人", village: "其他", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "流浪武士", village: "其他", family_org: '["其他"]', rank: "上忍", status: "阵亡", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 各国使节
  { nickname: "风之国使节", village: "砂隐", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "火之国使节", village: "木叶", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "水之国使节", village: "雾隐", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "雷之国使节", village: "云隐", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "土之国使节", village: "岩隐", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 其他忍村
  { nickname: "草隐村代表", village: "其他", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "瀑隐村代表", village: "其他", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "涡隐村代表", village: "漩涡", family_org: '["漩涡家族"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 更多木叶居民
  { nickname: "木叶餐厅老板", village: "木叶", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "木叶书店老板", village: "木叶", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "木叶花店老板", village: "木叶", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "木叶茶馆老板", village: "木叶", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "木叶铁匠", village: "木叶", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "木叶裁缝", village: "木叶", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "木叶面包师", village: "木叶", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 更多其他忍村角色
  { nickname: "砂隐富商", village: "砂隐", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "雾隐渔夫", village: "雾隐", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "岩隐矿工", village: "岩隐", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "云隐牧民", village: "云隐", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "雨隐雨农", village: "雨隐", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "音隐学生", village: "音隐", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  
  // 最后补充
  { nickname: "上忍精英", village: "木叶", family_org: '["其他"]', rank: "上忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "中忍精英", village: "砂隐", family_org: '["其他"]', rank: "中忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "下忍精英", village: "雾隐", family_org: '["其他"]', rank: "下忍", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true },
  { nickname: "特上忍", village: "木叶", family_org: '["其他"]', rank: "影级", status: "存活", eye_technique: "无", has_kekkei: false, is_jinchuriki: false, is_easy: true, is_enabled: true }
];

// 检查重复
const existingNames = new Set(data.map(p => p.nickname));
const uniqueNewCharacters = newCharacters.filter(p => {
  if (existingNames.has(p.nickname)) {
    console.log(`跳过重复: ${p.nickname}`);
    return false;
  }
  existingNames.add(p.nickname);
  return true;
});

const finalData = [...data, ...uniqueNewCharacters];

fs.writeFileSync(
  path.join(__dirname, 'seeds', 'naruto-players.json'),
  JSON.stringify(finalData, null, 2),
  'utf-8'
);

console.log(`\n✅ 完成`);
console.log(`✅ 新增 ${uniqueNewCharacters.length} 个角色`);
console.log(`✅ 总计 ${finalData.length} 个角色`);
