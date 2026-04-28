// Pure scoring utilities — easy to unit-test
export interface FeedbackRow {
  rating: number;
  quality_category?: string | null;
  trainer_id: string;
}

export interface TrainerStat {
  trainer_id: string;
  avg_rating: number;
  total_feedbacks: number;
  valid_feedbacks: number;
  high_quality_pct: number;
  normalized_feedback: number;
  final_score: number;
  rank: number;
}

export const MONTH_LABELS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// CRITICAL FIX: month is 1-indexed (Jan=1). Previous bug used 0-indexed indexing causing March→Feb shift.
export const monthLabel = (month1Indexed: number) => MONTH_LABELS[month1Indexed - 1] ?? "—";

export function computeMonthlyEvaluation(feedback: FeedbackRow[]): TrainerStat[] {
  const byTrainer = new Map<string, FeedbackRow[]>();
  for (const f of feedback) {
    if (!byTrainer.has(f.trainer_id)) byTrainer.set(f.trainer_id, []);
    byTrainer.get(f.trainer_id)!.push(f);
  }

  const stats = Array.from(byTrainer.entries()).map(([trainer_id, rows]) => {
    const total = rows.length;
    const valid = rows.filter((r) => r.quality_category === "high" || r.quality_category === "medium" || r.quality_category == null);
    const validCount = valid.length;
    const highCount = rows.filter((r) => r.quality_category === "high").length;
    const avg = validCount ? valid.reduce((s, r) => s + r.rating, 0) / validCount : 0;
    return {
      trainer_id,
      avg_rating: avg,
      total_feedbacks: total,
      valid_feedbacks: validCount,
      high_quality_pct: total ? (highCount / total) * 100 : 0,
      normalized_feedback: 0,
      final_score: 0,
      rank: 0,
    } as TrainerStat;
  });

  const maxFeedback = Math.max(1, ...stats.map((s) => s.valid_feedbacks));
  for (const s of stats) {
    s.normalized_feedback = (s.valid_feedbacks / maxFeedback) * 5; // scale to 0-5
    s.final_score = 0.7 * s.avg_rating + 0.3 * s.normalized_feedback;
  }

  stats.sort((a, b) => b.final_score - a.final_score);
  stats.forEach((s, i) => (s.rank = i + 1));
  return stats;
}
