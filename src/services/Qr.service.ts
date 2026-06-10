import QRCode from 'qrcode';
import { restaurantService } from './restaurant.service';
import { Restaurant } from '../models/restaurant.model';


const FRONTEND_BASE_URL = process.env.FRONTEND_URL ?? 'https://yourapp.com';

export class QrService {
  buildFeedbackUrl(qrToken: string): string {
    return `${FRONTEND_BASE_URL}/feedback?token=${encodeURIComponent(qrToken)}`;
  }

  async generateQrBuffer(
    restaurantId: number,
  ): Promise<{ buffer: Buffer; restaurant: Restaurant }> {
    const restaurant = await restaurantService.getById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const buffer = await QRCode.toBuffer(this.buildFeedbackUrl(restaurant.x_qr_token), {
      type:  'png',
      width: 400,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    });

    return { buffer, restaurant };
  }

  async generateQrDataUrl(restaurantId: number): Promise<{
    dataUrl:     string;
    restaurant:  Restaurant;
    feedbackUrl: string;
  }> {
    const restaurant = await restaurantService.getById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const feedbackUrl = this.buildFeedbackUrl(restaurant.x_qr_token);
    const dataUrl     = await QRCode.toDataURL(feedbackUrl, { width: 400, margin: 2 });

    return { dataUrl, restaurant, feedbackUrl };
  }
}

export const qrService = new QrService();