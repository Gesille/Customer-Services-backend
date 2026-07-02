import { Router } from 'express';
import { feedbackController } from '../controllers/feedback.controller';
import { feedbackLimiter, readLimiter } from '../middleware';

export const feedbackRouter = Router();
 
feedbackRouter.get ('/',                              readLimiter, feedbackController.getByRestaurant.bind(feedbackController));
feedbackRouter.get ('/restaurant/:restaurantId',      readLimiter, feedbackController.getByRestaurant.bind(feedbackController));
feedbackRouter.get ('/stats/:restaurantId',           readLimiter, feedbackController.getStats.bind(feedbackController));
feedbackRouter.post('/',                              feedbackLimiter, feedbackController.create.bind(feedbackController));
export default feedbackRouter;