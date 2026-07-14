import mongoose from 'mongoose';
import { CreateJobDto, Job, JobModel } from '../models/job.model';

function toJob(doc: any): Job {
  const restaurant = doc.restaurant_id;
  const isPopulated = restaurant && typeof restaurant === 'object' && restaurant._id;

  return {
    id: doc._id.toString(),
    restaurant_id: isPopulated ? restaurant._id.toString() : restaurant?.toString(),
    // Assumes restaurant.model.ts exposes `x_name` (per RestaurantController) — adjust if the field differs
    restaurant_name: isPopulated ? restaurant.x_name : undefined,
    position: doc.position,
    title: doc.title,
    department: doc.department,
    employment_type: doc.employment_type,
    description: doc.description,
    requirements: doc.requirements || [],
    responsibilities: doc.responsibilities || [],
    keywords: doc.keywords || [],
    contact_email: doc.contact_email,
    contact_phone: doc.contact_phone,
    location: doc.location,
    
    status: doc.status,
    closing_date: doc.closing_date,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface JobFilters {
  restaurant_id?: string;
  status?: string;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class JobService {
  async getAll(filters: JobFilters = {}): Promise<{ jobs: Job[]; total: number }> {
    const { restaurant_id, status, department, search, page = 1, limit = 10 } = filters;

    const query: Record<string, any> = {};
    if (restaurant_id) query.restaurant_id = restaurant_id;
    if (status) query.status = status;
    if (department) query.department = department;
    if (search) query.$text = { $search: search };

    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      JobModel.find(query)
        .populate('restaurant_id', 'x_name x_location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JobModel.countDocuments(query),
    ]);

    return { jobs: docs.map(toJob), total };
  }

  async getById(id: string): Promise<Job | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await JobModel.findById(id).populate('restaurant_id', 'x_name x_location').lean();
    return doc ? toJob(doc) : null;
  }

  async getByRestaurant(restaurantId: string): Promise<Job[]> {
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) return [];
    const docs = await JobModel.find({ restaurant_id: restaurantId, status: 'open' })
      .populate('restaurant_id', 'x_name x_location')
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toJob);
  }

  async create(dto: CreateJobDto): Promise<string> {
    const doc = await JobModel.create(dto);
    return doc._id.toString();
  }

  async update(id: string, data: Partial<CreateJobDto>): Promise<Job | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await JobModel.findByIdAndUpdate(id, data, { new: true,runValidators: true,context: 'query',  })
      .populate('restaurant_id', 'x_name x_location')
      .lean();
    return doc ? toJob(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const doc = await JobModel.findByIdAndDelete(id);
    return Boolean(doc);
  }
}

export const jobService = new JobService();