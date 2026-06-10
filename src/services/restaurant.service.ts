import { v4 as uuidv4 } from 'uuid';
import { odooRequest } from '../shared/odoo-client';
import { ODOO_FIELDS, ODOO_MODELS } from '../config/odoo';
import { CreateRestaurantDto, Restaurant } from '../models/restaurant.model';


export class RestaurantService {
  async getAll(): Promise<Restaurant[]> {
    return odooRequest(ODOO_MODELS.RESTAURANT, 'search_read', [[]], {
      fields: ODOO_FIELDS.RESTAURANT,
    });
  }

  async getById(id: number): Promise<Restaurant | null> {
    const results = await odooRequest(
      ODOO_MODELS.RESTAURANT, 'search_read',
      [[['id', '=', id]]],
      { fields: ODOO_FIELDS.RESTAURANT },
    );
    return results[0] ?? null;
  }

  async getByQrToken(token: string): Promise<Restaurant | null> {
    const results = await odooRequest(
      ODOO_MODELS.RESTAURANT, 'search_read',
      [[['x_qr_token', '=', token]]],
      { fields: ODOO_FIELDS.RESTAURANT },
    );
    return results[0] ?? null;
  }

  async create(dto: CreateRestaurantDto): Promise<number> {
    return odooRequest(ODOO_MODELS.RESTAURANT, 'create', [[{
      ...dto,
      x_qr_token: uuidv4(),
    }]]);
  }
}

export const restaurantService = new RestaurantService();