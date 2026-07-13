import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../models/response.model';
import {
  getOverview,
  getWaiterPerformance,
  getRatingDistribution,
  getEvaluators,
  getTrend,
  getRestaurantLeaderboard,
} from '../services/globalAnalytics.service';

export class GlobalAnalyticsController {

  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await getOverview();
      res.status(200).json(successResponse('Global overview fetched', overview));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch global overview', err.message));
    }
  }

  async getWaiterPerformance(req: Request, res: Response): Promise<void> {
    try {
      const performance = await getWaiterPerformance();
      res.status(200).json(successResponse('Global waiter performance fetched', performance));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch global waiter performance', err.message));
    }
  }

  async getRatingDistribution(req: Request, res: Response): Promise<void> {
    try {
      const distribution = await getRatingDistribution();
      res.status(200).json(successResponse('Global rating distribution fetched', distribution));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch global rating distribution', err.message));
    }
  }

  async getEvaluators(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

      const evaluators = await getEvaluators(page, pageSize);
      res.status(200).json(successResponse('Global evaluators fetched', evaluators));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch global evaluators', err.message));
    }
  }

  async getTrend(req: Request, res: Response): Promise<void> {
    try {
      const granularity = ['day', 'week', 'month'].includes(String(req.query.granularity))
        ? (req.query.granularity as 'day' | 'week' | 'month')
        : 'day';

      const trend = await getTrend(granularity);
      res.status(200).json(successResponse('Global trend fetched', trend));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch global trend', err.message));
    }
  }

  async getRestaurantLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const leaderboard = await getRestaurantLeaderboard();
      res.status(200).json(successResponse('Restaurant leaderboard fetched', leaderboard));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch restaurant leaderboard', err.message));
    }
  }
}

export const globalAnalyticsController = new GlobalAnalyticsController();