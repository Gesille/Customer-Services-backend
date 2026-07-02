export type Rating = 1 | 2 | 3 | 4 | 5;

export type Recommendation =
  | 'Very Likely'
  | 'Likely'
  | 'Neutral'
  | 'Unlikely'
  | 'Very Unlikely';

export interface Feedback {
  id: number;
  x_restaurant_id:               number;
  x_customer_name:               string;
  x_customer_email:              string;
  x_waiter_name:                 string;
  // Waiter / Waitress
  x_friendliness_rating:         Rating;
  x_attentiveness_rating:        Rating;
  x_menu_knowledge_rating:       Rating;
  x_service_speed_rating:        Rating;
  x_food_quality_rating:         Rating;
  x_cleanliness_rating:          Rating;
  x_overall_rating:              Rating;
  // Bartender
  x_bartender_friendliness_rating:    Rating;
  x_bartender_drink_knowledge_rating: Rating;
  x_bartender_speed_rating:           Rating;
  x_bartender_welcome_rating:         Rating;
  x_bartender_overall_rating:         Rating;
  // Hostess
  x_hostess_friendliness_rating:      Rating;
  x_hostess_seating_rating:           Rating;
  x_hostess_welcome_rating:           Rating;
  x_hostess_communication_rating:     Rating;
  x_hostess_overall_rating:           Rating;
  // Common
  x_recommendation:              Recommendation;
  x_comment?:                    string;
  x_date:                        string;
}

export interface CreateFeedbackDto {
  restaurant_id:               number;
  customer_name:               string;
  customer_email:               string;
  waiter_name:                 string;
  // Waiter / Waitress
  friendliness_rating:         Rating;
  attentiveness_rating:        Rating;
  menu_knowledge_rating:       Rating;
  service_speed_rating:        Rating;
  food_quality_rating:         Rating;
  cleanliness_rating:          Rating;
  overall_rating:              Rating;
  // Bartender
  bartender_friendliness_rating:    Rating;
  bartender_drink_knowledge_rating: Rating;
  bartender_speed_rating:           Rating;
  bartender_welcome_rating:         Rating;
  bartender_overall_rating:         Rating;
  // Hostess
  hostess_friendliness_rating:      Rating;
  hostess_seating_rating:           Rating;
  hostess_welcome_rating:           Rating;
  hostess_communication_rating:     Rating;
  hostess_overall_rating:           Rating;
  // Common
  recommendation:              Recommendation;
  comment?:                    string;
}