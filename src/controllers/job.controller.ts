import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { restaurantService } from '../services/restaurant.service';
import { errorResponse, successResponse } from '../models/response.model';
import { jobService } from '../services/job.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REQUIRED_FIELDS = [
  'restaurant_id',
  'title',
  'position',
  'description',
  'contact_email',
  'contact_phone',
] as const;

const VALID_EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Seasonal', 'Internship'] as const;
const VALID_STATUSES = ['open', 'closed', 'draft'] as const;

// Accepts either a real array (JSON body) or a comma-separated string (multipart/form-data)
function toArray(value: any): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

export class JobController {

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { restaurant_id, status, department, search, page, limit } = req.query;

      const { jobs, total } = await jobService.getAll({
        restaurant_id: restaurant_id as string | undefined,
        status: status as string | undefined,
        department: department as string | undefined,
        search: search as string | undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });

      res.status(200).json(successResponse('Jobs fetched', { jobs, total }));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch jobs', err.message));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id as string)) {
        res.status(400).json(errorResponse('Invalid job ID')); return;
      }

      const job = await jobService.getById(id as string);
      if (!job) { res.status(404).json(errorResponse('Job not found')); return; }

      res.status(200).json(successResponse('Job fetched', job));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch job', err.message));
    }
  }

  async getByRestaurant(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(restaurantId as string)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const jobs = await jobService.getByRestaurant(restaurantId as string);
      res.status(200).json(successResponse('Jobs fetched', jobs));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch jobs for restaurant', err.message));
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const body = { ...req.body };

      // ── Check required fields ────────────────────────────────────────────────
      const missing = REQUIRED_FIELDS.filter(
        (k) => body[k] === undefined || body[k] === null || body[k] === '',
      );
      if (missing.length) {
        res.status(400).json(errorResponse(`Missing required fields: ${missing.join(', ')}`));
        return;
      }

      // ── Validate restaurant id + existence ───────────────────────────────────
      if (!mongoose.Types.ObjectId.isValid(body.restaurant_id)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }
      const restaurant = await restaurantService.getById(String(body.restaurant_id));
      if (!restaurant) {
        res.status(404).json(errorResponse('Restaurant not found')); return;
      }

      // ── Validate contact email ───────────────────────────────────────────────
      if (!EMAIL_RE.test(body.contact_email)) {
        res.status(400).json(errorResponse('Invalid contact email format')); return;
      }

      // ── Validate enums if provided ───────────────────────────────────────────
      if (body.employment_type && !VALID_EMPLOYMENT_TYPES.includes(body.employment_type)) {
        res.status(400).json(
          errorResponse(`employment_type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`),
        );
        return;
      }
      if (body.status && !VALID_STATUSES.includes(body.status)) {
        res.status(400).json(errorResponse(`status must be one of: ${VALID_STATUSES.join(', ')}`));
        return;
      }

      const id = await jobService.create({
        restaurant_id:     String(body.restaurant_id),
        position:          String(body.position).trim().slice(0, 150),
        title:             String(body.title).trim().slice(0, 150), 
        department:        body.department ? String(body.department).trim() : undefined,
        employment_type:   body.employment_type || 'Full-time',
        description:       String(body.description).trim(),
        requirements:      toArray(body.requirements),
        responsibilities:  toArray(body.responsibilities),
        keywords:          toArray(body.keywords),
        contact_email:     String(body.contact_email).trim().toLowerCase(),
        contact_phone:     String(body.contact_phone).trim(),
        location:          body.location ? String(body.location).trim() : undefined,
  
        status:            body.status || 'open',
        closing_date:      body.closing_date ? new Date(body.closing_date) : undefined,
      });

      res.status(201).json(successResponse('Job posting created', { id }));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to create job', err.message));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id as string)) {
        res.status(400).json(errorResponse('Invalid job ID')); return;
      }

      const body = { ...req.body };

      if (body.restaurant_id) {
        if (!mongoose.Types.ObjectId.isValid(body.restaurant_id)) {
          res.status(400).json(errorResponse('Invalid restaurant ID')); return;
        }
        const restaurant = await restaurantService.getById(String(body.restaurant_id));
        if (!restaurant) { res.status(404).json(errorResponse('Restaurant not found')); return; }
      }

      if (body.contact_email && !EMAIL_RE.test(body.contact_email)) {
        res.status(400).json(errorResponse('Invalid contact email format')); return;
      }
      if (body.employment_type && !VALID_EMPLOYMENT_TYPES.includes(body.employment_type)) {
        res.status(400).json(
          errorResponse(`employment_type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`),
        );
        return;
      }
      if (body.status && !VALID_STATUSES.includes(body.status)) {
        res.status(400).json(errorResponse(`status must be one of: ${VALID_STATUSES.join(', ')}`));
        return;
      }

      if (body.requirements !== undefined) body.requirements = toArray(body.requirements);
      if (body.responsibilities !== undefined) body.responsibilities = toArray(body.responsibilities);
      if (body.keywords !== undefined) body.keywords = toArray(body.keywords);

      const job = await jobService.update(id as string, body);
      if (!job) { res.status(404).json(errorResponse('Job not found')); return; }

      res.status(200).json(successResponse('Job updated', job));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to update job', err.message));
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id as string)) {
        res.status(400).json(errorResponse('Invalid job ID')); return;
      }

      const deleted = await jobService.delete(id as string);
      if (!deleted) { res.status(404).json(errorResponse('Job not found')); return; }

      res.status(200).json(successResponse('Job deleted'));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to delete job', err.message));
    }
  }
}

export const jobController = new JobController();