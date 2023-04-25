export interface ScoreMap {
  [id: string]: number;
}

export interface CountScoreMap {
  [countId: string]: {
    score: number;
    blockOrder: string;
    updated: string;
  };
}

export interface VerificationMap {
  [userId: string]: { [verificationId: string]: 1 };
}

export const MAX_SCORE = 200;
