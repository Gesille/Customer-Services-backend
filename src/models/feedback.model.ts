export type Rating = 1 | 2 | 3 | 4 | 5;

export type Recommendation =
  | 'Very Likely'
  | 'Likely'
  | 'Neutral'
  | 'Unlikely'
  | 'Very Unlikely';

export interface Feedback {
  id: number;
  x_restaurant_id:         number;
  x_customer_name:         string;
  x_waiter_name:           string;
  x_friendliness_rating:   Rating;   // Q1: Excellent=4 Good=3 Fair=2 Poor=1
  x_attentiveness_rating:  Rating;   // Q2: Very Satisfied=5 … Very Dissatisfied=1
  x_menu_knowledge_rating: Rating;   // Q3: Yes completely=4 Mostly=3 Somewhat=2 No=1
  x_service_speed_rating:  Rating;   // Q4: Excellent=4 Good=3 Fair=2 Poor=1
  x_food_quality_rating:   Rating;   // kept from original schema
  x_cleanliness_rating:    Rating;   // kept from original schema
  x_overall_rating:        Rating;   // kept from original schema
  x_recommendation:        Recommendation; // Q5: Very Likely → Very Unlikely
  x_comment?:              string;
  x_date:                  string;
}

export interface CreateFeedbackDto {
  restaurant_id:           number;
  customer_name:           string;
  waiter_name:             string;
  friendliness_rating:     Rating;
  attentiveness_rating:    Rating;
  menu_knowledge_rating:   Rating;
  service_speed_rating:    Rating;
  food_quality_rating:     Rating;
  cleanliness_rating:      Rating;
  overall_rating:          Rating;
  recommendation:          Recommendation;
  comment?:                string;
}