import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  RestaurantModel,
  CreateRestaurantDto,
  Restaurant,
} from '../models/restaurant.model';

function toRestaurant(doc: any): Restaurant {
  return {
    id:              doc._id.toString(),
    x_name:          doc.x_name,
    x_location:      doc.x_location,
    x_manager_email: doc.x_manager_email,
    x_qr_token:      doc.x_qr_token,
  };
}

export class RestaurantService {
  async getAll(): Promise<Restaurant[]> {
    const docs = await RestaurantModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(toRestaurant);
  }

  async getById(id: string): Promise<Restaurant | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await RestaurantModel.findById(id).lean();
    return doc ? toRestaurant(doc) : null;
  }

  async getByQrToken(token: string): Promise<Restaurant | null> {
    const doc = await RestaurantModel.findOne({ x_qr_token: token }).lean();
    return doc ? toRestaurant(doc) : null;
  }

  async create(dto: CreateRestaurantDto): Promise<string> {
    const doc = await RestaurantModel.create({
      ...dto,
      x_qr_token: uuidv4(),
    });
    return doc._id.toString();
  }
}

export const restaurantService = new RestaurantService();