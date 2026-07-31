export interface User {
  id: number;
  username: string;
  display_id: string | null;
  password_hash: string;
  role: 'user' | 'admin';
  token_version: number;
  created_at: string;
}

export interface Player {
  id: number;
  nickname: string;
  village: string;
  family_org: string; // JSON 数组字符串
  rank: string;
  status: string;
  eye_technique: string;
  has_kekkei: boolean | number;
  is_jinchuriki: boolean | number;
  is_easy?: boolean | number;
  difficulties?: string[];
  is_enabled: boolean | number;
  created_at: string;
}

export type FeedbackLevel = 'correct' | 'close' | 'wrong';

export interface AttributeFeedback {
  value: string | number | boolean | string[];
  level: FeedbackLevel;
  hint?: 'higher' | 'lower';
}

export interface GuessFeedback {
  playerId: number;
  nickname: string;
  correct: boolean;
  attributes: {
    village: AttributeFeedback;
    familyOrg: AttributeFeedback;
    rank: AttributeFeedback;
    status: AttributeFeedback;
    eyeTechnique: AttributeFeedback;
    hasKekkei: AttributeFeedback;
    isJinchuriki: AttributeFeedback;
  };
}

export interface GameRow {
  id: number;
  session_id: string | null;
  user_id: number | null;
  guest_key: string | null;
  target_player_id: number;
  mode: string;
  guesses: string;
  guess_times: string;
  status: 'playing' | 'won' | 'lost';
  guess_count: number;
  created_at: string;
  finished_at: string | null;
}
