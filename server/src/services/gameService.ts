import { Player, GuessFeedback, AttributeFeedback } from '../types';

/** 文本属性精确比较 */
function textAttr(guess: string, target: string): AttributeFeedback {
  return { value: guess, level: guess === target ? 'correct' : 'wrong' };
}

/** 家族/组织属性比较 - 多选交集匹配 */
function familyOrgAttr(guessPlayer: Player, targetPlayer: Player): AttributeFeedback {
  let guessFamilies: string[] = [];
  let targetFamilies: string[] = [];
  
  try {
    guessFamilies = typeof guessPlayer.family_org === 'string' 
      ? JSON.parse(guessPlayer.family_org) 
      : guessPlayer.family_org || [];
    targetFamilies = typeof targetPlayer.family_org === 'string' 
      ? JSON.parse(targetPlayer.family_org) 
      : targetPlayer.family_org || [];
  } catch {
    guessFamilies = [];
    targetFamilies = [];
  }
  
  // 计算交集
  const intersection = guessFamilies.filter(f => targetFamilies.includes(f));
  
  if (intersection.length === guessFamilies.length && intersection.length === targetFamilies.length) {
    // 完全匹配
    return { value: guessFamilies, level: 'correct' };
  } else if (intersection.length > 0) {
    // 有交集
    return { value: guessFamilies, level: 'close' };
  } else {
    // 完全不匹配
    return { value: guessFamilies, level: 'wrong' };
  }
}

/** 布尔属性比较 */
function boolAttr(guess: boolean | number, target: boolean | number): AttributeFeedback {
  const guessBool = Boolean(guess);
  const targetBool = Boolean(target);
  return { value: guessBool, level: guessBool === targetBool ? 'correct' : 'wrong' };
}

/** 逐属性对比猜测角色与目标角色,产出反馈 */
export function compareGuess(guess: Player, target: Player): GuessFeedback {
  const correct = guess.id === target.id;
  return {
    playerId: guess.id,
    nickname: guess.nickname,
    correct,
    attributes: {
      // 忍村：精确匹配
      village: textAttr(guess.village, target.village),
      // 家族/组织：多选交集匹配
      familyOrg: familyOrgAttr(guess, target),
      // 实力等级：精确匹配
      rank: textAttr(guess.rank, target.rank),
      // 生存状态：精确匹配
      status: textAttr(guess.status, target.status),
      // 瞳术：精确匹配
      eyeTechnique: textAttr(guess.eye_technique, target.eye_technique),
      // 血继限界：布尔匹配
      hasKekkei: boolAttr(guess.has_kekkei, target.has_kekkei),
      // 人柱力：布尔匹配
      isJinchuriki: boolAttr(guess.is_jinchuriki, target.is_jinchuriki),
    },
  };
}

/** Upgrade Redis game snapshots created before a feedback attribute was added. */
export function completeGuessFeedback(
  feedback: GuessFeedback,
  guess?: Player,
  target?: Player
): GuessFeedback {
  // 检查是否包含所有新属性
  if (feedback.attributes.village) return feedback;
  
  return {
    ...feedback,
    attributes: {
      village: guess && target ? textAttr(guess.village, target.village) : { value: '-', level: 'wrong' },
      familyOrg: guess && target ? familyOrgAttr(guess, target) : { value: [], level: 'wrong' },
      rank: guess && target ? textAttr(guess.rank, target.rank) : { value: '-', level: 'wrong' },
      status: guess && target ? textAttr(guess.status, target.status) : { value: '-', level: 'wrong' },
      eyeTechnique: guess && target ? textAttr(guess.eye_technique, target.eye_technique) : { value: '-', level: 'wrong' },
      hasKekkei: guess && target ? boolAttr(guess.has_kekkei, target.has_kekkei) : { value: false, level: 'wrong' },
      isJinchuriki: guess && target ? boolAttr(guess.is_jinchuriki, target.is_jinchuriki) : { value: false, level: 'wrong' },
    },
  };
}

export const MAX_GUESSES = 7; // 火影角色猜测次数限制
