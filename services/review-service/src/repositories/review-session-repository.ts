import { ReviewSessionEntity } from '../domain/types';

export interface ReviewSessionRepository {
  create(session: ReviewSessionEntity): Promise<ReviewSessionEntity>;
  findById(reviewId: string): Promise<ReviewSessionEntity | null>;
  findByPolicy(policyId: string): Promise<ReviewSessionEntity[]>;
  update(session: ReviewSessionEntity): Promise<ReviewSessionEntity>;
}
