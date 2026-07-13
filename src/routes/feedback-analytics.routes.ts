// routes/feedback-analytics.routes.ts
import { Router } from 'express';
import { feedbackAnalyticsController } from '../controllers/feedback-analytics.controller';
import { readLimiter } from '../middleware';

export const feedbackAnalyticsRouter = Router();

feedbackAnalyticsRouter.get(
  '/overview', readLimiter,
  feedbackAnalyticsController.getOverview.bind(feedbackAnalyticsController),
);
feedbackAnalyticsRouter.get(
  'waiters', readLimiter,
  feedbackAnalyticsController.getWaiterPerformance.bind(feedbackAnalyticsController),
);
feedbackAnalyticsRouter.get(
  'distribution', readLimiter,
  feedbackAnalyticsController.getRatingDistribution.bind(feedbackAnalyticsController),
);
feedbackAnalyticsRouter.get(
  'evaluators', readLimiter,
  feedbackAnalyticsController.getEvaluators.bind(feedbackAnalyticsController),
);
feedbackAnalyticsRouter.get(
  'trend', readLimiter,
  feedbackAnalyticsController.getTrend.bind(feedbackAnalyticsController),
);

export default feedbackAnalyticsRouter;