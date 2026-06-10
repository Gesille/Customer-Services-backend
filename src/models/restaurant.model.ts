export interface Restaurant {
  id:              number;
  x_name:          string;
  x_location:      string;
  x_manager_email: string;
  x_qr_token:      string;
}
 
export interface CreateRestaurantDto {
  x_name:          string;
  x_location:      string;
  x_manager_email: string;
}