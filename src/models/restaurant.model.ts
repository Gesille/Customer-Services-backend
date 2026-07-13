import mongoose, { Schema, Document } from 'mongoose';
export interface Restaurant {
  id:              string;
  x_name:          string;
  x_location:      string;
  x_manager_email: string;
  x_qr_token:      string;
  x_qr_generated:  boolean;
}

export interface CreateRestaurantDto {
  x_name:          string;
  x_location:      string;
  x_manager_email: string;
}


export interface RestaurantDocument extends Document {
  x_name:          string;
  x_location:      string;
  x_manager_email: string;
  x_qr_token:      string;
  x_qr_generated:  boolean;
}

const restaurantSchema = new Schema<RestaurantDocument>(
  {
    x_name:          { type: String, required: true, trim: true, maxlength: 100 },
    x_location:      { type: String, required: true, trim: true, maxlength: 200 },
    x_manager_email: { type: String, required: true, trim: true, lowercase: true },
    x_qr_token:      { type: String, required: true, unique: true, index: true },
    x_qr_generated:  { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

export const RestaurantModel = mongoose.model<RestaurantDocument>('Restaurant', restaurantSchema);