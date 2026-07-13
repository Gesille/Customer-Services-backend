import { Router } from 'express';
import { restaurantRouter } from './restaurant.routes';
import { feedbackRouter } from './feedback.routes';
import userRouter from './user.route';
import { cvRouter } from './cv.route';
import feedbackAnalyticsRouter from './feedback-analytics.routes';



export const rootRouter = Router();
rootRouter.use('/restaurants',restaurantRouter);
rootRouter.use('/feedbacks',feedbackRouter);
rootRouter.use('/users',userRouter);
rootRouter.use('/cv',cvRouter);
rootRouter.use('/analytics', feedbackAnalyticsRouter);

export default rootRouter;