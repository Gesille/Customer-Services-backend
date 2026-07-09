import mongoose, { Schema, Document } from 'mongoose';

export type Rating = 1 | 2 | 3 | 4 | 5;

export type Recommendation =
  | 'Very Likely'
  | 'Likely'
  | 'Neutral'
  | 'Unlikely'
  | 'Very Unlikely';


export interface Feedback {
  id: string;
  x_restaurant_id:               string;
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
  restaurant_id:               string;
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



export interface FeedbackDocument extends Document {
  x_restaurant_id:               mongoose.Types.ObjectId;
  x_customer_name:               string;
  x_customer_email:              string;
  x_waiter_name:                 string;
  x_friendliness_rating:         Rating;
  x_attentiveness_rating:        Rating;
  x_menu_knowledge_rating:       Rating;
  x_service_speed_rating:        Rating;
  x_food_quality_rating:         Rating;
  x_cleanliness_rating:          Rating;
  x_overall_rating:              Rating;
  x_bartender_friendliness_rating:    Rating;
  x_bartender_drink_knowledge_rating: Rating;
  x_bartender_speed_rating:           Rating;
  x_bartender_welcome_rating:         Rating;
  x_bartender_overall_rating:         Rating;
  x_hostess_friendliness_rating:      Rating;
  x_hostess_seating_rating:           Rating;
  x_hostess_welcome_rating:           Rating;
  x_hostess_communication_rating:     Rating;
  x_hostess_overall_rating:           Rating;
  x_recommendation:              Recommendation;
  x_comment?:                    string;
  x_date:                        Date;
}

const rating = { type: Number, required: true, min: 1, max: 5 };

const feedbackSchema = new Schema<FeedbackDocument>(
  {
    x_restaurant_id: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    x_customer_name:  { type: String, required: true, trim: true, maxlength: 100 },
    x_customer_email: { type: String, required: true, trim: true, maxlength: 150 },
    x_waiter_name:    { type: String, required: true, trim: true, maxlength: 100 },
    // Waiter / Waitress
    x_friendliness_rating:   { ...rating },
    x_attentiveness_rating:  { ...rating },
    x_menu_knowledge_rating: { ...rating },
    x_service_speed_rating:  { ...rating },
    x_food_quality_rating:   { ...rating },
    x_cleanliness_rating:    { ...rating },
    x_overall_rating:        { ...rating },
    // Bartender
    x_bartender_friendliness_rating:    { ...rating },
    x_bartender_drink_knowledge_rating: { ...rating },
    x_bartender_speed_rating:           { ...rating },
    x_bartender_welcome_rating:         { ...rating },
    x_bartender_overall_rating:         { ...rating },
    // Hostess
    x_hostess_friendliness_rating:      { ...rating },
    x_hostess_seating_rating:           { ...rating },
    x_hostess_welcome_rating:           { ...rating },
    x_hostess_communication_rating:     { ...rating },
    x_hostess_overall_rating:           { ...rating },
    // Common
    x_recommendation: {
      type: String,
      required: true,
      enum: ['Very Likely', 'Likely', 'Neutral', 'Unlikely', 'Very Unlikely'],
    },
    x_comment: { type: String, maxlength: 1000 },
    x_date:    { type: Date, default: Date.now },
  },
  { timestamps: false },
);

export const FeedbackModel = mongoose.model<FeedbackDocument>('Feedback', feedbackSchema);