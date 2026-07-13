// controllers/feedback-analytics.controller.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { feedbackAnalyticsService } from '../services/feedback-analytics.service';
import { errorResponse, successResponse } from '../models/response.model';
import { reportPdfService } from '../services/report-pdf.service';

const isValidId = (id: unknown) =>
  typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

export class FeedbackAnalyticsController {
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params; // now optional — route no longer requires it

      if (restaurantId && !isValidId(restaurantId)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const overview = await feedbackAnalyticsService.getOverview(restaurantId as string);
      res.status(200).json(successResponse('Overview fetched', overview));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch overview', err.message));
    }
  }

  async getWaiterPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;

      if (restaurantId && !isValidId(restaurantId)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const performance = await feedbackAnalyticsService.getWaiterPerformance(restaurantId as string);
      res.status(200).json(successResponse('Waiter performance fetched', performance));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch waiter performance', err.message));
    }
  }

  async getRatingDistribution(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;

      if (restaurantId && !isValidId(restaurantId)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const distribution = await feedbackAnalyticsService.getRatingDistribution(restaurantId as string);
      res.status(200).json(successResponse('Rating distribution fetched', distribution));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch rating distribution', err.message));
    }
  }

  async getEvaluators(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;

      if (restaurantId && !isValidId(restaurantId)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

      const evaluators = await feedbackAnalyticsService.getEvaluators(restaurantId as string, page, pageSize);
      res.status(200).json(successResponse('Evaluators fetched', evaluators));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch evaluators', err.message));
    }
  }

  async getTrend(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;

      if (restaurantId && !isValidId(restaurantId)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const granularity = ['day', 'week', 'month'].includes(String(req.query.granularity))
        ? (req.query.granularity as 'day' | 'week' | 'month')
        : 'day';

      const trend = await feedbackAnalyticsService.getTrend(restaurantId as string, granularity);
      res.status(200).json(successResponse('Trend fetched', trend));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch trend', err.message));
    }
  }
  async getRestaurantLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const leaderboard = await feedbackAnalyticsService.getRestaurantLeaderboard();
    res.status(200).json(successResponse('Restaurant leaderboard fetched', leaderboard));
  } catch (err: any) {
    res.status(500).json(errorResponse('Failed to fetch restaurant leaderboard', err.message));
  }
}
async getDailyReport(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      if (!restaurantId || !isValidId(restaurantId)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const now = new Date();
      const year = Number(req.query.year) || now.getUTCFullYear();
      const month = Number(req.query.month) || now.getUTCMonth() + 1;

      if (month < 1 || month > 12) {
        res.status(400).json(errorResponse('month must be between 1 and 12')); return;
      }

      const report = await feedbackAnalyticsService.getDailyReport(restaurantId as string, year, month);
      res.status(200).json(successResponse('Daily report fetched', report));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch daily report', err.message));
    }
  }

  async getMonthlyReport(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      if (!restaurantId || !isValidId(restaurantId)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const year = Number(req.query.year) || new Date().getUTCFullYear();
      const report = await feedbackAnalyticsService.getMonthlyReport(restaurantId as string, year);
      res.status(200).json(successResponse('Monthly report fetched', report));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch monthly report', err.message));
    }
  }

  async getReportPdf(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      if (!restaurantId || !isValidId(restaurantId)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const now = new Date();
      const year = Number(req.query.year) || now.getUTCFullYear();
      const month = Number(req.query.month) || now.getUTCMonth() + 1;

      await reportPdfService.streamRestaurantReport(res, restaurantId as string, year, month);
    } catch (err: any) {
      const status = err.message === 'Restaurant not found' ? 404 : 500;
      res.status(status).json(errorResponse('Failed to generate report PDF', err.message));
    }
  }
}

export const feedbackAnalyticsController = new FeedbackAnalyticsController();