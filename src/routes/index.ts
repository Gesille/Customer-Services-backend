import { Router } from 'express';
import { restaurantRouter } from './restaurant.routes';
import { feedbackRouter } from './feedback.routes';


export const rootRouter = Router();
rootRouter.use('/restaurants', restaurantRouter);
rootRouter.use('/feedbacks',   feedbackRouter);

export default rootRouter;