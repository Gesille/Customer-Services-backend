// services/globalAnalytics.service.ts
import { FeedbackModel } from '../models/feedback.model';
import { RestaurantModel } from '../models/restaurant.model';

export async function getOverview() {
  // no $match stage at all → aggregates across every restaurant
  const [result] = await FeedbackModel.aggregate([
    {
      $group: {
        _id: null,
        avgOverallRating: { $avg: '$overall_rating' },
        totalFeedbacks: { $sum: 1 },
        lastFeedbackAt: { $max: '$createdAt' },
      },
    },
    { $project: { _id: 0 } },
  ]);
  return result ?? { avgOverallRating: 0, totalFeedbacks: 0, lastFeedbackAt: null };
}

export async function getWaiterPerformance() {
  return FeedbackModel.aggregate([
    {
      $group: {
        _id: '$waiter_name',
        avgOverallRating: { $avg: '$overall_rating' },
        feedbackCount: { $sum: 1 },
      },
    },
    { $project: { _id: 0, waiterName: '$_id', avgOverallRating: { $round: ['$avgOverallRating', 2] }, feedbackCount: 1 } },
    { $sort: { avgOverallRating: -1 } },
  ]);
}

export async function getRatingDistribution() {
  return FeedbackModel.aggregate([
    { $group: { _id: '$overall_rating', count: { $sum: 1 } } },
    { $project: { _id: 0, rating: '$_id', count: 1 } },
    { $sort: { rating: 1 } },
  ]);
}

export async function getEvaluators(page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [data, total] = await Promise.all([
    FeedbackModel.find().sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    FeedbackModel.countDocuments(),
  ]);
  return { data, total, page, pageSize };
}

export async function getTrend(granularity: 'day' | 'week' | 'month' = 'day') {
  const dateFormat = granularity === 'day' ? '%Y-%m-%d' : granularity === 'week' ? '%G-W%V' : '%Y-%m';
  return FeedbackModel.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        averageOverallRating: { $avg: '$overall_rating' },
        feedbackCount: { $sum: 1 },
      },
    },
    { $project: { _id: 0, bucket: '$_id', averageOverallRating: { $round: ['$averageOverallRating', 2] }, feedbackCount: 1 } },
    { $sort: { bucket: 1 } },
  ]);
}

export async function getRestaurantLeaderboard() {
  return FeedbackModel.aggregate([
    {
      $group: {
        _id: '$restaurant_id',
        avgOverallRating: { $avg: '$overall_rating' },
        feedbackCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: RestaurantModel.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'restaurant',
      },
    },
    { $unwind: '$restaurant' },
    {
      $project: {
        _id: 0,
        restaurantId: '$_id',
        name: '$restaurant.x_name',
        location: '$restaurant.x_location',
        avgOverallRating: { $round: ['$avgOverallRating', 2] },
        feedbackCount: 1,
      },
    },
    { $sort: { avgOverallRating: -1 } },
  ]);
}