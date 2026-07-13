// routes/global-analytics.routes.ts
import { Router } from 'express';
import { globalAnalyticsController } from '../controllers/global-analytics.controller';

const globalAnalyrouter = Router();

globalAnalyrouter.get('/overview', globalAnalyticsController.getOverview);
globalAnalyrouter.get('/waiter-performance', globalAnalyticsController.getWaiterPerformance);
globalAnalyrouter.get('/rating-distribution', globalAnalyticsController.getRatingDistribution);
globalAnalyrouter.get('/evaluators', globalAnalyticsController.getEvaluators);
globalAnalyrouter.get('/trend', globalAnalyticsController.getTrend);
globalAnalyrouter.get('/restaurant-leaderboard', globalAnalyticsController.getRestaurantLeaderboard);

export default globalAnalyrouter;