// routes/global-analytics.routes.ts
import { Router } from 'express';
import { globalAnalyticsController } from '../controllers/global-analytics.controller';

const globalAnalyrouter = Router();

globalAnalyrouter.get('/global-overview', globalAnalyticsController.getOverview);
globalAnalyrouter.get('/global-waiter-performance', globalAnalyticsController.getWaiterPerformance);
globalAnalyrouter.get('/global-rating-distribution', globalAnalyticsController.getRatingDistribution);
globalAnalyrouter.get('/global-evaluators', globalAnalyticsController.getEvaluators);
globalAnalyrouter.get('/global-trend', globalAnalyticsController.getTrend);
globalAnalyrouter.get('/global-restaurant-leaderboard', globalAnalyticsController.getRestaurantLeaderboard);

export default globalAnalyrouter;