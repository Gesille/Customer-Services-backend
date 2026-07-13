import mongoose, { Schema, Document } from 'mongoose';
export interface Restaurant {
  id:              string;
  x_name:          string;
  x_location:      string;
  x_manager_email: string;
  x_website?:      string;
  x_image?:        string;
  x_tables?:       number;
  x_color?:        string;
  x_status?:       'active' | 'paused';
  x_qr_token:      string;
  x_qr_generated:  boolean;
}

export interface CreateRestaurantDto {
  x_name:          string;
  x_location:      string;
  x_manager_email: string;
  x_website?:      string;
  x_image?:        string;
  x_tables?:       number;
  x_color?:        string;
  x_status?:       'active' | 'paused';
}

export interface RestaurantDocument extends Document {
  x_name:          string;
  x_location:      string;
  x_manager_email: string;
  x_website?:      string;
  x_image?:        string;
  x_tables?:       number;
  x_color?:        string;
  x_status?:       'active' | 'paused';
  x_qr_token:      string;
  x_qr_generated:  boolean;
}

const restaurantSchema = new Schema<RestaurantDocument>(
  {
    x_name:          { type: String, required: true, trim: true, maxlength: 100 },
    x_location:      { type: String, required: true, trim: true, maxlength: 200 },
    x_manager_email: { type: String, required: true, trim: true, lowercase: true },
    x_website:       { type: String, trim: true },
    x_image:         { type: String, trim: true },
    x_tables:        { type: Number, default: 0 },
    x_color:         { type: String, default: 'violet' },
    x_status:        { type: String, enum: ['active', 'paused'], default: 'active' },
    x_qr_token:      { type: String, required: true, unique: true, index: true },
    x_qr_generated:  { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

export const RestaurantModel = mongoose.model<RestaurantDocument>('Restaurant', restaurantSchema);