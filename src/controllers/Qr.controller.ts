import { Request, Response }  from 'express';
import mongoose from 'mongoose';
import { restaurantService }  from '../services/restaurant.service';
import { errorResponse, successResponse } from '../models/response.model';
import { qrService } from '../services/Qr.service';
import { buildPrintHtml } from '../shared/script/qr-print.view';
import ScanLog from "../models/ScanLog.model"


export class QrController {

  async getQrImage(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(id as string)) {
        res.status(400).json(errorResponse('Invalid restaurant ID')); return;
      }

      const { buffer, restaurant } = await qrService.generateQrBuffer(id as string);
      const slug = restaurant.x_name.replace(/\s+/g, '-').toLowerCase();

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="qr-${slug}.png"`);
      res.status(200).send(buffer);
    } catch (err: any) {
      const status = err.message === 'Restaurant not found' ? 404 : 500;
      res.status(status).json(errorResponse(err.message));
    }
  }

 async getPrintPage(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id as string)) { res.status(400).send('Invalid restaurant ID'); return; }

    const { dataUrl, restaurant, feedbackUrl } = await qrService.generateQrDataUrl(id as string);
    const html = buildPrintHtml(restaurant.x_name, restaurant.x_location, dataUrl, feedbackUrl);

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (err: any) {
    const status = err.message === 'Restaurant not found' ? 404 : 500;
    res.status(status).send(err.message);
  }
}

async resolveToken(req: Request, res: Response): Promise<void> {
  try {
    const restaurant = await restaurantService.getByQrToken(String(req.params.token));
    if (!restaurant) { res.status(404).json(errorResponse('Invalid QR code')); return; }

    ScanLog.create({ restaurantId: restaurant.id }).catch((e) =>
      console.error("Scan log failed:", e)
    );

    res.status(200).json(successResponse('Restaurant found', {
      id:       restaurant.id,
      name:     restaurant.x_name,
      location: restaurant.x_location,
    }));
  } catch (err: any) {
    res.status(500).json(errorResponse('Failed to resolve QR token', err.message));
  }
}
  async generateQr(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      res.status(400).json(errorResponse('Invalid restaurant ID')); return;
    }

    await restaurantService.markQrGenerated(id as string);
    const { dataUrl, restaurant, feedbackUrl } = await qrService.generateQrDataUrl(id as string);

    res.status(200).json(successResponse('QR generated', {
      id: restaurant.id,
      name: restaurant.x_name,
      dataUrl,
      feedbackUrl,
    }));
  } catch (err: any) {
    const status = err.message === 'Restaurant not found' ? 404 : 500;
    res.status(status).json(errorResponse(err.message));
  }
}
}

export const qrController = new QrController();