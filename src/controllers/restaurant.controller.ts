import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { restaurantService } from '../services/restaurant.service';
import { errorResponse, successResponse } from '../models/response.model';


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class RestaurantController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const restaurants = await restaurantService.getAll();
      res.status(200).json(successResponse('Restaurants fetched', restaurants));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch restaurants', err.message));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id as string)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const restaurant = await restaurantService.getById(id as string);
      if (!restaurant) { res.status(404).json(errorResponse('Restaurant not found')); return; }

      res.status(200).json(successResponse('Restaurant fetched', restaurant));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch restaurant', err.message));
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { x_name, x_location, x_manager_email } = req.body;

      if (!x_name || !x_location || !x_manager_email) {
        res.status(400).json(errorResponse('Missing required fields: x_name, x_location, x_manager_email'));
        return;
      }
      if (!EMAIL_RE.test(x_manager_email)) {
        res.status(400).json(errorResponse('Invalid manager email format'));
        return;
      }

      const id = await restaurantService.create({
        x_name:          String(x_name).trim().slice(0, 100),
        x_location:      String(x_location).trim().slice(0, 200),
        x_manager_email: String(x_manager_email).trim().toLowerCase(),
      });

      res.status(201).json(successResponse('Restaurant created', { id }));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to create restaurant', err.message));
    }
  }
}

export const restaurantController = new RestaurantController();