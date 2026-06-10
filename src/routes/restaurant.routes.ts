import { Router } from 'express';
import { restaurantController } from '../controllers/restaurant.controller';
import { qrController } from '../controllers/Qr.controller';
import { readLimiter } from '../shared/middleware';

const router = Router();

export const restaurantRouter = Router();
 
// ⚠️  Static/specific routes MUST come before /:id to avoid route conflicts
restaurantRouter.get ('/',              readLimiter, restaurantController.getAll.bind(restaurantController));
restaurantRouter.post('/',                           restaurantController.create.bind(restaurantController));
restaurantRouter.get ('/qr/:token',     readLimiter, qrController.resolveToken.bind(qrController));   // ← before /:id
restaurantRouter.get ('/:id',           readLimiter, restaurantController.getById.bind(restaurantController));
restaurantRouter.get ('/:id/qr',        readLimiter, qrController.getQrImage.bind(qrController));
restaurantRouter.get ('/:id/qr/print',  readLimiter, qrController.getPrintPage.bind(qrController));


export default router;