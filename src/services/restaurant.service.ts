import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateRestaurantDto,
  Restaurant,
  RestaurantModel,
} from '../models/restaurant.model';
import ScanLog from '../models/ScanLog.model';
import { FeedbackModel } from '../models/feedback.model';

function toRestaurant(doc: any): Restaurant {
  return {
    id:              doc._id.toString(),
    x_name:          doc.x_name,
    x_location:      doc.x_location,
    x_manager_email: doc.x_manager_email,
    x_website:       doc.x_website,
    x_image:         doc.x_image,
    x_tables:        doc.x_tables,
    x_color:         doc.x_color,
    x_status:        doc.x_status,
    x_qr_token:      doc.x_qr_token,
    x_qr_generated:  Boolean(doc.x_qr_generated),
  };
}

function monthRange(offsetMonths = 0) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offsetMonths, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offsetMonths + 1, 1));
  return { start, end };
}

export class RestaurantService {
  // Returns restaurants enriched with totalScans, avgRating, and scansTrend
  // (% change in scans this month vs last month) — powers the RestaurantCard
  // stats on the frontend dashboard.
  async getAll(): Promise<Restaurant[]> {
    const docs = await RestaurantModel.find().sort({ createdAt: -1 }).lean();
    const restaurants = docs.map(toRestaurant);
    if (restaurants.length === 0) return restaurants;

    const ids = restaurants.map((r) => new mongoose.Types.ObjectId(r.id));
    const thisMonth = monthRange(0);
    const lastMonth = monthRange(1);

    const [totalScansAgg, thisMonthScansAgg, lastMonthScansAgg, avgRatingAgg] = await Promise.all([
      ScanLog.aggregate([
        { $match: { restaurantId: { $in: ids } } },
        { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
      ]),
      ScanLog.aggregate([
        { $match: { restaurantId: { $in: ids }, createdAt: { $gte: thisMonth.start, $lt: thisMonth.end } } },
        { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
      ]),
      ScanLog.aggregate([
        { $match: { restaurantId: { $in: ids }, createdAt: { $gte: lastMonth.start, $lt: lastMonth.end } } },
        { $group: { _id: '$restaurantId', count: { $sum: 1 } } },
      ]),
      FeedbackModel.aggregate([
        { $match: { x_restaurant_id: { $in: ids } } },
        { $group: { _id: '$x_restaurant_id', avg: { $avg: '$x_overall_rating' } } },
      ]),
    ]);

    const totalScansById = new Map(totalScansAgg.map((r: any) => [String(r._id), r.count]));
    const thisMonthById   = new Map(thisMonthScansAgg.map((r: any) => [String(r._id), r.count]));
    const lastMonthById   = new Map(lastMonthScansAgg.map((r: any) => [String(r._id), r.count]));
    const avgRatingById   = new Map(avgRatingAgg.map((r: any) => [String(r._id), r.avg]));

    return restaurants.map((r) => {
      const thisM = thisMonthById.get(r.id) ?? 0;
      const lastM = lastMonthById.get(r.id) ?? 0;
      const scansTrend =
        lastM === 0
          ? (thisM > 0 ? 100 : 0)
          : Number((((thisM - lastM) / lastM) * 100).toFixed(0));

      return {
        ...r,
        totalScans: totalScansById.get(r.id) ?? 0,
        avgRating: Number((avgRatingById.get(r.id) ?? 0).toFixed(1)),
        scansTrend,
      };
    });
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
      x_qr_generated: false,
    });
    return doc._id.toString();
  }

  async update(id: string, data: Partial<Restaurant>): Promise<Restaurant | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await RestaurantModel.findByIdAndUpdate(id, data, { new: true }).lean();
    return doc ? toRestaurant(doc) : null;
  }

  async getWithoutQr(): Promise<Restaurant[]> {
    const docs = await RestaurantModel.find({ x_qr_generated: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toRestaurant);
  }

  async markQrGenerated(id: string): Promise<Restaurant> {
    const restaurant = await this.getById(id);
    if (!restaurant) throw new Error('Restaurant not found');
    if (restaurant.x_qr_generated) return restaurant;

    const updated = await this.update(id, { x_qr_generated: true });
    return updated as Restaurant;
  }
}

export const restaurantService = new RestaurantService();