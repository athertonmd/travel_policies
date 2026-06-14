import { ReviewSessionRepository } from '../review-session-repository';
import { ReviewSessionEntity } from '../../domain/types';

export class InMemoryReviewSessionRepository implements ReviewSessionRepository {
  private store = new Map<string, ReviewSessionEntity>();

  async create(session: ReviewSessionEntity): Promise<ReviewSessionEntity> {
    this.store.set(session.review_id, { ...session });
    return { ...session };
  }

  async findById(reviewId: string): Promise<ReviewSessionEntity | null> {
    const s = this.store.get(reviewId);
    return s ? { ...s } : null;
  }

  async findByPolicy(policyId: string): Promise<ReviewSessionEntity[]> {
    return Array.from(this.store.values())
      .filter((s) => s.policy_id === policyId)
      .map((s) => ({ ...s }));
  }

  async update(session: ReviewSessionEntity): Promise<ReviewSessionEntity> {
    this.store.set(session.review_id, { ...session });
    return { ...session };
  }

  clear(): void { this.store.clear(); }
}
