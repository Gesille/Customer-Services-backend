import { Request, Response } from 'express';
import mongoose from 'mongoose';
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
  // Waiter / Waitress
  'friendliness_rating',
  'attentiveness_rating',
  'menu_knowledge_rating',
  'service_speed_rating',
  'food_quality_rating',
  'cleanliness_rating',
  'overall_rating',
  // Bartender
  'bartender_friendliness_rating',
  'bartender_drink_knowledge_rating',
  'bartender_speed_rating',
  'bartender_welcome_rating',
  'bartender_overall_rating',
  // Hostess
  'hostess_friendliness_rating',
  'hostess_seating_rating',
  'hostess_welcome_rating',
  'hostess_communication_rating',
  'hostess_overall_rating',
] as const;

const REQUIRED_FIELDS = [
  'restaurant_id',
  'customer_name',
  'customer_email',
  'waiter_name',
  ...RATING_FIELDS,
  'recommendation',
] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class FeedbackController {

  async getByRestaurant(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.restaurantId;
      if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const feedbacks = await feedbackService.getByRestaurant(id as string);
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

      // ── Validate restaurant id ───────────────────────────────────────────────
      if (!mongoose.Types.ObjectId.isValid(body.restaurant_id)) {
        res.status(400).json(errorResponse('Invalid restaurant ID'));
        return;
      }

      // ── Validate email format ────────────────────────────────────────────────
      if (!EMAIL_RE.test(body.customer_email)) {
        res.status(400).json(errorResponse('Invalid customer email format'));
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
        restaurant_id:                    String(body.restaurant_id),
        customer_name:                    String(body.customer_name).trim().slice(0, 100),
        customer_email:                   String(body.customer_email).trim().slice(0, 150),
        waiter_name:                      String(body.waiter_name).trim().slice(0, 100),
        // Waiter / Waitress
        friendliness_rating:              Number(body.friendliness_rating)              as Rating,
        attentiveness_rating:             Number(body.attentiveness_rating)             as Rating,
        menu_knowledge_rating:            Number(body.menu_knowledge_rating)            as Rating,
        service_speed_rating:             Number(body.service_speed_rating)             as Rating,
        food_quality_rating:              Number(body.food_quality_rating)              as Rating,
        cleanliness_rating:               Number(body.cleanliness_rating)               as Rating,
        overall_rating:                   Number(body.overall_rating)                   as Rating,
        // Bartender
        bartender_friendliness_rating:    Number(body.bartender_friendliness_rating)    as Rating,
        bartender_drink_knowledge_rating: Number(body.bartender_drink_knowledge_rating) as Rating,
        bartender_speed_rating:           Number(body.bartender_speed_rating)           as Rating,
        bartender_welcome_rating:         Number(body.bartender_welcome_rating)         as Rating,
        bartender_overall_rating:         Number(body.bartender_overall_rating)         as Rating,
        // Hostess
        hostess_friendliness_rating:      Number(body.hostess_friendliness_rating)      as Rating,
        hostess_seating_rating:           Number(body.hostess_seating_rating)           as Rating,
        hostess_welcome_rating:           Number(body.hostess_welcome_rating)           as Rating,
        hostess_communication_rating:     Number(body.hostess_communication_rating)     as Rating,
        hostess_overall_rating:           Number(body.hostess_overall_rating)           as Rating,
        // Common
        recommendation: body.recommendation,
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
      const id = req.params.restaurantId;
      if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const stats = await feedbackService.getStats(id as string);
      res.status(200).json(successResponse('Stats fetched', stats));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch stats', err.message));
    }
  }
}

export const feedbackController = new FeedbackController();