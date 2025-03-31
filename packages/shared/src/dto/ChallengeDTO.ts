/**
 * Data Transfer Object for Challenge entity
 */
export interface ChallengeDTO {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChallengeDTO {
  title: string;
  description: string;
  difficulty: string;
  type: string;
}

export interface UpdateChallengeDTO {
  title?: string;
  description?: string;
  difficulty?: string;
  type?: string;
}
