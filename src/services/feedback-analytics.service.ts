// services/feedback-analytics.service.ts
import mongoose from 'mongoose';
import { FeedbackModel, Rating, Recommendation } from '../models/feedback.model';

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

// ── Builds the $match filter. Empty object when restaurantId is absent = global (no filter). ──
const matchStage = (restaurantId?: string) =>
  restaurantId ? { x_restaurant_id: toObjectId(restaurantId) } : {};

const RATING_FIELDS = [
  'x_friendliness_rating', 'x_attentiveness_rating', 'x_menu_knowledge_rating',
  'x_service_speed_rating', 'x_food_quality_rating', 'x_cleanliness_rating', 'x_overall_rating',
  'x_bartender_friendliness_rating', 'x_bartender_drink_knowledge_rating',
  'x_bartender_speed_rating', 'x_bartender_welcome_rating', 'x_bartender_overall_rating',
  'x_hostess_friendliness_rating', 'x_hostess_seating_rating', 'x_hostess_welcome_rating',
  'x_hostess_communication_rating', 'x_hostess_overall_rating',
] as const;

const RECOMMENDATIONS: Recommendation[] = [
  'Very Likely', 'Likely', 'Neutral', 'Unlikely', 'Very Unlikely',
];

export interface OverviewStats {
  totalFeedbacks: number;
  averages: Record<string, number>;
  recommendationBreakdown: Record<Recommendation, number>;
  recommendationPercentage: Record<Recommendation, number>;
  firstFeedbackAt: Date | null;
  lastFeedbackAt: Date | null;
}

export interface WaiterPerformance {
  waiter_name: string;
  feedbackCount: number;
  averages: Record<string, number>;
}

export interface RatingDistributionEntry {
  field: string;
  distribution: Record<Rating, number>;
}

export interface Evaluator {
  id: string;
  customer_name: string;
  customer_email: string;
  waiter_name: string;
  overall_rating: Rating;
  recommendation: Recommendation;
  comment?: string;
  date: Date;
}

export interface EvaluatorsPage {
  total: number;
  page: number;
  pageSize: number;
  data: Evaluator[];
}

export interface TrendPoint {
  bucket: string;
  feedbackCount: number;
  averageOverallRating: number;
}

export interface RestaurantLeaderboardEntry {
  restaurantId: string;
  feedbackCount: number;
  averageOverallRating: number;
}

class FeedbackAnalyticsService {
  // ── Overview: counts, averages across every rating field, recommendation split ──
  async getOverview(restaurantId?: string): Promise<OverviewStats> {
    const [result] = await FeedbackModel.aggregate([
      { $match: matchStage(restaurantId) },
      {
        $group: {
          _id: null,
          totalFeedbacks: { $sum: 1 },
          firstFeedbackAt: { $min: '$x_date' },
          lastFeedbackAt: { $max: '$x_date' },
          ...Object.fromEntries(
            RATING_FIELDS.map(f => [f, { $avg: `$${f}` }]),
          ),
          recommendations: { $push: '$x_recommendation' },
        },
      },
    ]);

    if (!result) {
      return {
        totalFeedbacks: 0,
        averages: Object.fromEntries(RATING_FIELDS.map(f => [f.replace(/^x_/, ''), 0])),
        recommendationBreakdown: Object.fromEntries(RECOMMENDATIONS.map(r => [r, 0])) as Record<Recommendation, number>,
        recommendationPercentage: Object.fromEntries(RECOMMENDATIONS.map(r => [r, 0])) as Record<Recommendation, number>,
        firstFeedbackAt: null,
        lastFeedbackAt: null,
      };
    }

    const averages: Record<string, number> = {};
    for (const f of RATING_FIELDS) {
      const key = f.replace(/^x_/, '');
      averages[key] = round(result[f] ?? 0);
    }

    const recommendationBreakdown = Object.fromEntries(
      RECOMMENDATIONS.map(r => [r, 0]),
    ) as Record<Recommendation, number>;
    for (const rec of result.recommendations as Recommendation[]) {
      recommendationBreakdown[rec] = (recommendationBreakdown[rec] ?? 0) + 1;
    }

    const recommendationPercentage = Object.fromEntries(
      RECOMMENDATIONS.map(r => [
        r,
        round((recommendationBreakdown[r] / result.totalFeedbacks) * 100),
      ]),
    ) as Record<Recommendation, number>;

    return {
      totalFeedbacks: result.totalFeedbacks,
      averages,
      recommendationBreakdown,
      recommendationPercentage,
      firstFeedbackAt: result.firstFeedbackAt,
      lastFeedbackAt: result.lastFeedbackAt,
    };
  }

  // ── Per-waiter averages, sorted by overall rating descending ──
  async getWaiterPerformance(restaurantId?: string): Promise<WaiterPerformance[]> {
    const rows = await FeedbackModel.aggregate([
      { $match: matchStage(restaurantId) },
      {
        $group: {
          _id: '$x_waiter_name',
          feedbackCount: { $sum: 1 },
          x_friendliness_rating: { $avg: '$x_friendliness_rating' },
          x_attentiveness_rating: { $avg: '$x_attentiveness_rating' },
          x_menu_knowledge_rating: { $avg: '$x_menu_knowledge_rating' },
          x_service_speed_rating: { $avg: '$x_service_speed_rating' },
          x_food_quality_rating: { $avg: '$x_food_quality_rating' },
          x_cleanliness_rating: { $avg: '$x_cleanliness_rating' },
          x_overall_rating: { $avg: '$x_overall_rating' },
        },
      },
      { $sort: { x_overall_rating: -1 } },
    ]);

    return rows.map(row => ({
      waiter_name: row._id,
      feedbackCount: row.feedbackCount,
      averages: {
        friendliness_rating: round(row.x_friendliness_rating),
        attentiveness_rating: round(row.x_attentiveness_rating),
        menu_knowledge_rating: round(row.x_menu_knowledge_rating),
        service_speed_rating: round(row.x_service_speed_rating),
        food_quality_rating: round(row.x_food_quality_rating),
        cleanliness_rating: round(row.x_cleanliness_rating),
        overall_rating: round(row.x_overall_rating),
      },
    }));
  }

  // ── Histogram (1-5 counts) for every rating field ──
  async getRatingDistribution(restaurantId?: string): Promise<RatingDistributionEntry[]> {
    const facetStages = Object.fromEntries(
      RATING_FIELDS.map(f => [
        f,
        [
          { $group: { _id: `$${f}`, count: { $sum: 1 } } },
        ],
      ]),
    );

    const [result] = await FeedbackModel.aggregate([
      { $match: matchStage(restaurantId) },
      { $facet: facetStages },
    ]);

    return RATING_FIELDS.map(f => {
      const rows: { _id: Rating; count: number }[] = result?.[f] ?? [];
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<Rating, number>;
      for (const row of rows) distribution[row._id] = row.count;
      return { field: f.replace(/^x_/, ''), distribution };
    });
  }

  // ── Paginated list of who submitted feedback ──
  async getEvaluators(
    restaurantId?: string,
    page = 1,
    pageSize = 20,
  ): Promise<EvaluatorsPage> {
    const match = matchStage(restaurantId);
    const skip = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      FeedbackModel.countDocuments(match),
      FeedbackModel.find(match)
        .sort({ x_date: -1 })
        .skip(skip)
        .limit(pageSize)
        .select(
          'x_customer_name x_customer_email x_waiter_name x_overall_rating x_recommendation x_comment x_date',
        )
        .lean(),
    ]);

    return {
      total,
      page,
      pageSize,
      data: rows.map((r: any) => ({
        id: r._id.toString(),
        customer_name: r.x_customer_name,
        customer_email: r.x_customer_email,
        waiter_name: r.x_waiter_name,
        overall_rating: r.x_overall_rating,
        recommendation: r.x_recommendation,
        comment: r.x_comment,
        date: r.x_date,
      })),
    };
  }

  // ── Feedback volume + avg overall rating bucketed by day/week/month ──
  async getTrend(
    restaurantId?: string,
    granularity: 'day' | 'week' | 'month' = 'day',
  ): Promise<TrendPoint[]> {
    const dateFormat = { day: '%Y-%m-%d', week: '%G-W%V', month: '%Y-%m' }[granularity];

    const rows = await FeedbackModel.aggregate([
      { $match: matchStage(restaurantId) },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$x_date' } },
          feedbackCount: { $sum: 1 },
          averageOverallRating: { $avg: '$x_overall_rating' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return rows.map(r => ({
      bucket: r._id,
      feedbackCount: r.feedbackCount,
      averageOverallRating: round(r.averageOverallRating),
    }));
  }

  // ── Global-only: compares restaurants against each other ──
  async getRestaurantLeaderboard(): Promise<RestaurantLeaderboardEntry[]> {
    const rows = await FeedbackModel.aggregate([
      {
        $group: {
          _id: '$x_restaurant_id',
          feedbackCount: { $sum: 1 },
          averageOverallRating: { $avg: '$x_overall_rating' },
        },
      },
      { $sort: { averageOverallRating: -1 } },
    ]);

    return rows.map(r => ({
      restaurantId: r._id.toString(),
      feedbackCount: r.feedbackCount,
      averageOverallRating: round(r.averageOverallRating),
    }));
  }
}

function round(n: number | undefined | null): number {
  return typeof n === 'number' ? Math.round(n * 100) / 100 : 0;
}

export const feedbackAnalyticsService = new FeedbackAnalyticsService();