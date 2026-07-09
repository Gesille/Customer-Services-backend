import mongoose from 'mongoose';
import { FeedbackModel } from '../models/feedback.model';
import { restaurantService } from './restaurant.service';
import { emailService } from './email.service';
import { CreateFeedbackDto, Feedback } from '../models/feedback.model';

const RATING_FIELDS = [
  // Waiter / Waitress
  'x_friendliness_rating',
  'x_attentiveness_rating',
  'x_menu_knowledge_rating',
  'x_service_speed_rating',
  'x_food_quality_rating',
  'x_cleanliness_rating',
  'x_overall_rating',
  // Bartender
  'x_bartender_friendliness_rating',
  'x_bartender_drink_knowledge_rating',
  'x_bartender_speed_rating',
  'x_bartender_welcome_rating',
  'x_bartender_overall_rating',
  // Hostess
  'x_hostess_friendliness_rating',
  'x_hostess_seating_rating',
  'x_hostess_welcome_rating',
  'x_hostess_communication_rating',
  'x_hostess_overall_rating',
] as const;

function toFeedback(doc: any): Feedback {
  return {
    id:                                  doc._id.toString(),
    x_restaurant_id:                     doc.x_restaurant_id.toString(),
    x_customer_name:                     doc.x_customer_name,
    x_customer_email:                    doc.x_customer_email,
    x_waiter_name:                       doc.x_waiter_name,
    x_friendliness_rating:               doc.x_friendliness_rating,
    x_attentiveness_rating:              doc.x_attentiveness_rating,
    x_menu_knowledge_rating:             doc.x_menu_knowledge_rating,
    x_service_speed_rating:              doc.x_service_speed_rating,
    x_food_quality_rating:               doc.x_food_quality_rating,
    x_cleanliness_rating:                doc.x_cleanliness_rating,
    x_overall_rating:                    doc.x_overall_rating,
    x_bartender_friendliness_rating:     doc.x_bartender_friendliness_rating,
    x_bartender_drink_knowledge_rating:  doc.x_bartender_drink_knowledge_rating,
    x_bartender_speed_rating:            doc.x_bartender_speed_rating,
    x_bartender_welcome_rating:          doc.x_bartender_welcome_rating,
    x_bartender_overall_rating:          doc.x_bartender_overall_rating,
    x_hostess_friendliness_rating:       doc.x_hostess_friendliness_rating,
    x_hostess_seating_rating:            doc.x_hostess_seating_rating,
    x_hostess_welcome_rating:            doc.x_hostess_welcome_rating,
    x_hostess_communication_rating:      doc.x_hostess_communication_rating,
    x_hostess_overall_rating:            doc.x_hostess_overall_rating,
    x_recommendation:                    doc.x_recommendation,
    x_comment:                           doc.x_comment,
    x_date:                              new Date(doc.x_date).toISOString(),
  };
}

export class FeedbackService {

  async getByRestaurant(restaurantId: string): Promise<Feedback[]> {
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) return [];
    const docs = await FeedbackModel
      .find({ x_restaurant_id: restaurantId })
      .sort({ x_date: -1 })
      .lean();
    return docs.map(toFeedback);
  }

  async create(dto: CreateFeedbackDto): Promise<string> {
    const restaurant = await restaurantService.getById(dto.restaurant_id);
    if (!restaurant) throw new Error('Restaurant not found');

    const doc = await FeedbackModel.create({
      x_restaurant_id:                    dto.restaurant_id,
      x_customer_name:                    dto.customer_name,
      x_customer_email:                   dto.customer_email,
      x_waiter_name:                      dto.waiter_name,
      // Waiter / Waitress
      x_friendliness_rating:              dto.friendliness_rating,
      x_attentiveness_rating:             dto.attentiveness_rating,
      x_menu_knowledge_rating:            dto.menu_knowledge_rating,
      x_service_speed_rating:             dto.service_speed_rating,
      x_food_quality_rating:              dto.food_quality_rating,
      x_cleanliness_rating:               dto.cleanliness_rating,
      x_overall_rating:                   dto.overall_rating,
      // Bartender
      x_bartender_friendliness_rating:    dto.bartender_friendliness_rating,
      x_bartender_drink_knowledge_rating: dto.bartender_drink_knowledge_rating,
      x_bartender_speed_rating:           dto.bartender_speed_rating,
      x_bartender_welcome_rating:         dto.bartender_welcome_rating,
      x_bartender_overall_rating:         dto.bartender_overall_rating,
      // Hostess
      x_hostess_friendliness_rating:      dto.hostess_friendliness_rating,
      x_hostess_seating_rating:           dto.hostess_seating_rating,
      x_hostess_welcome_rating:           dto.hostess_welcome_rating,
      x_hostess_communication_rating:     dto.hostess_communication_rating,
      x_hostess_overall_rating:           dto.hostess_overall_rating,
      // Common
      x_recommendation: dto.recommendation,
      x_comment:        dto.comment,
      x_date:           new Date(),
    });

    // Fire-and-forget email — never blocks the response or throws to the caller
    this.notifyAsync(doc._id.toString(), restaurant.x_name, restaurant.x_manager_email);

    return doc._id.toString();
  }

  
  async getStats(restaurantId: string): Promise<{
    total:     number;
    avgRating: number;
    breakdown: Record<string, number>;
  }> {
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return { total: 0, avgRating: 0, breakdown: {} };
    }

    const [group] = await FeedbackModel.aggregate([
      { $match: { x_restaurant_id: new mongoose.Types.ObjectId(restaurantId) } },
      {
        $group: {
          _id: '$x_restaurant_id',
          total: { $sum: 1 },
          ...Object.fromEntries(RATING_FIELDS.map(f => [f, { $avg: `$${f}` }])),
        },
      },
    ]);

    if (!group) return { total: 0, avgRating: 0, breakdown: {} };

    const breakdown: Record<string, number> = {};
    for (const field of RATING_FIELDS) {
      breakdown[field] = Math.round((group[field] ?? 0) * 10) / 10;
    }

    const total: number = group.total ?? 0;
    const avgRating = total
      ? Math.round(
          (Object.values(breakdown).reduce((a, b) => a + b, 0) / RATING_FIELDS.length)
          * 10,
        ) / 10
      : 0;

    return { total, avgRating, breakdown };
  }



  private async notifyAsync(
    feedbackId:     string,
    restaurantName: string,
    managerEmail:   string,
  ): Promise<void> {
    try {
      const doc = await FeedbackModel.findById(feedbackId).lean();
      if (!doc) return;
      await emailService.sendFeedbackNotification(toFeedback(doc), restaurantName, managerEmail);
    } catch (err: any) {
      // Log but never crash — the feedback is already saved
      console.error('[email] Failed to send notification:', err.message);
    }
  }
}

export const feedbackService = new FeedbackService();