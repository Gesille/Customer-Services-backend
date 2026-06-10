import { Request, Response } from 'express';
import { feedbackService }            from '../services/feedback.service';
import { restaurantService }          from '../services/restaurant.service';
import { errorResponse, successResponse } from '../models/response.model';
import { Rating } from '../models/feedback.model';


const VALID_RECOMMENDATIONS = [
  'Very Likely', 'Likely',
  'Neutral', 'Unlikely',
  'Very Unlikely'
] as const;

const RATING_FIELDS = [
  'friendliness_rating',
  'attentiveness_rating',
  'menu_knowledge_rating',
  'service_speed_rating',
  'food_quality_rating',
  'cleanliness_rating',
  'overall_rating',
] as const;

const REQUIRED_FIELDS = [
  'restaurant_id',
  'customer_name',
  'waiter_name',
  ...RATING_FIELDS,
  'recommendation',
] as const;

export class FeedbackController {

  async getByRestaurant(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.restaurantId);
      if (isNaN(id)) { res.status(400).json(errorResponse('Invalid restaurant ID')); return; }

      const feedbacks = await feedbackService.getByRestaurant(id);
      res.status(200).json(successResponse('Feedbacks fetched', feedbacks));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch feedbacks', err.message));
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      let body = { ...req.body };

      // ── Resolve restaurant from QR token if restaurant_id missing ────────────
      if (!body.restaurant_id && body.qr_token) {
        const restaurant = await restaurantService.getByQrToken(String(body.qr_token));
        if (!restaurant) {
          res.status(404).json(errorResponse('Invalid QR code — restaurant not found'));
          return;
        }
        body.restaurant_id = restaurant.id;
      }

      // ── Check required fields ────────────────────────────────────────────────
      const missing = REQUIRED_FIELDS.filter(
        k => body[k] === undefined || body[k] === null || body[k] === '',
      );
      if (missing.length) {
        res.status(400).json(errorResponse(`Missing required fields: ${missing.join(', ')}`));
        return;
      }

      // ── Validate recommendation ──────────────────────────────────────────────
      if (!VALID_RECOMMENDATIONS.includes(body.recommendation)) {
        res.status(400).json(
          errorResponse(`recommendation must be one of: ${VALID_RECOMMENDATIONS.join(', ')}`),
        );
        return;
      }

      // ── Validate ratings ─────────────────────────────────────────────────────
      for (const field of RATING_FIELDS) {
        const n = Number(body[field]);
        if (!Number.isInteger(n) || n < 1 || n > 5) {
          res.status(400).json(errorResponse(`${field} must be an integer between 1 and 5`));
          return;
        }
      }

      // ── Persist ──────────────────────────────────────────────────────────────
      const id = await feedbackService.create({
        restaurant_id:          Number(body.restaurant_id),
        customer_name:          String(body.customer_name).trim().slice(0, 100),
        waiter_name:            String(body.waiter_name).trim().slice(0, 100),
        friendliness_rating:    Number(body.friendliness_rating)    as Rating,
        attentiveness_rating:   Number(body.attentiveness_rating)   as Rating,
        menu_knowledge_rating:  Number(body.menu_knowledge_rating)  as Rating,
        service_speed_rating:   Number(body.service_speed_rating)   as Rating,
        food_quality_rating:    Number(body.food_quality_rating)    as Rating,
        cleanliness_rating:     Number(body.cleanliness_rating)     as Rating,
        overall_rating:         Number(body.overall_rating)         as Rating,
        recommendation:         body.recommendation,
        comment: body.comment
          ? String(body.comment).trim().slice(0, 1000)
          : undefined,
      });

      res.status(201).json(successResponse('Feedback submitted successfully', { id }));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to submit feedback', err.message));
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.restaurantId);
      if (isNaN(id)) { res.status(400).json(errorResponse('Invalid restaurant ID')); return; }

      const stats = await feedbackService.getStats(id);
      res.status(200).json(successResponse('Stats fetched', stats));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch stats', err.message));
    }
  }
}

export const feedbackController = new FeedbackController();