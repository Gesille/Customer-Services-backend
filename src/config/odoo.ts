export const ODOO_MODELS = {
  RESTAURANT: 'x_restaurant',
  FEEDBACK:   'x_restaurant_feedback',
} as const;

export const ODOO_FIELDS = {
  RESTAURANT: ['id', 'x_name', 'x_location', 'x_manager_email', 'x_qr_token'] as const,
  FEEDBACK: [
    'id',
    'x_restaurant_id',
    'x_customer_name',
    'x_waiter_name',
    'x_friendliness_rating',
    'x_attentiveness_rating',
    'x_menu_knowledge_rating',
    'x_service_speed_rating',
    'x_food_quality_rating',
    'x_cleanliness_rating',
    'x_overall_rating',
    'x_recommendation',
    'x_comment',
    'x_date',
  ] as const,
} as const;