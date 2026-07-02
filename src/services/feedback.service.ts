import { odooRequest }      from '../shared/odoo-client';
import { ODOO_MODELS, ODOO_FIELDS } from '../config/odoo';

import { restaurantService } from './restaurant.service';
import { emailService }      from './email.service';
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

export class FeedbackService {

  async getByRestaurant(restaurantId: number): Promise<Feedback[]> {
    return odooRequest(
      ODOO_MODELS.FEEDBACK, 'search_read',
      [[['x_restaurant_id', '=', restaurantId]]],
      { fields: ODOO_FIELDS.FEEDBACK },
    );
  }

  async create(dto: CreateFeedbackDto): Promise<number> {
    const restaurant = await restaurantService.getById(dto.restaurant_id);
    if (!restaurant) throw new Error('Restaurant not found');

    const id: number = await odooRequest(
      ODOO_MODELS.FEEDBACK, 'create',
      [[{
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
        x_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }]],
    );

    // Fire-and-forget email — never blocks the response or throws to the caller
    this.notifyAsync(id, restaurant.x_name, restaurant.x_manager_email);

    return id;
  }

  /**
   * Compute stats without pulling every row into memory.
   * Uses Odoo's read_group to aggregate on the server side.
   */
  async getStats(restaurantId: number): Promise<{
    total:     number;
    avgRating: number;
    breakdown: Record<string, number>;
  }> {
    const [group] = await odooRequest(
      ODOO_MODELS.FEEDBACK, 'read_group',
      [[['x_restaurant_id', '=', restaurantId]]],
      {
        fields:  [...RATING_FIELDS.map(f => `${f}:avg`), 'x_restaurant_id'],
        groupby: ['x_restaurant_id'],
      },
    ) as any[];

    if (!group) return { total: 0, avgRating: 0, breakdown: {} };

    const total: number = group.x_restaurant_id_count ?? 0;

    const breakdown: Record<string, number> = {};
    for (const field of RATING_FIELDS) {
      breakdown[field] = Math.round((group[field] ?? 0) * 10) / 10;
    }

    const avgRating = total
      ? Math.round(
          (Object.values(breakdown).reduce((a, b) => a + b, 0) / RATING_FIELDS.length)
          * 10,
        ) / 10
      : 0;

    return { total, avgRating, breakdown };
  }

  // ── private ──────────────────────────────────────────────────────────────────

  private async notifyAsync(
    feedbackId:     number,
    restaurantName: string,
    managerEmail:   string,
  ): Promise<void> {
    try {
      const [saved] = await odooRequest(
        ODOO_MODELS.FEEDBACK, 'search_read',
        [[['id', '=', feedbackId]]],
        { fields: ODOO_FIELDS.FEEDBACK },
      );
      await emailService.sendFeedbackNotification(saved, restaurantName, managerEmail);
    } catch (err: any) {
      // Log but never crash — the feedback is already saved
      console.error('[email] Failed to send notification:', err.message);
    }
  }
}

export const feedbackService = new FeedbackService();