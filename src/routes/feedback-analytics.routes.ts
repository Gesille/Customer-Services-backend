// routes/feedback-analytics.routes.ts
import { Router } from 'express';
import { feedbackAnalyticsController } from '../controllers/feedback-analytics.controller';
import { readLimiter } from '../middleware';

export const feedbackAnalyticsRouter = Router();

feedbackAnalyticsRouter.get(
  '/:restaurantId/overview', readLimiter,
  feedbackAnalyticsController.getOverview.bind(feedbackAnalyticsController),
);
feedbackAnalyticsRouter.get(
  '/:restaurantId/waiters', readLimiter,
  feedbackAnalyticsController.getWaiterPerformance.bind(feedbackAnalyticsController),
);
feedbackAnalyticsRouter.get(
  '/:restaurantId/distribution', readLimiter,
  feedbackAnalyticsController.getRatingDistribution.bind(feedbackAnalyticsController),
);
feedbackAnalyticsRouter.get(
  '/:restaurantId/evaluators', readLimiter,
  feedbackAnalyticsController.getEvaluators.bind(feedbackAnalyticsController),
);
feedbackAnalyticsRouter.get(
  '/:restaurantId/trend', readLimiter,
  feedbackAnalyticsController.getTrend.bind(feedbackAnalyticsController),
);

export default feedbackAnalyticsRouter;