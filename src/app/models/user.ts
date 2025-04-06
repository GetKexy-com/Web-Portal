export class User {
  id!: number;
  first_name!: string;
  last_name!: string;
  email!: string;
  created_at?: string;
  is_claimed?: boolean;
  logo_image_url?: string;
  token?: string;
  restaurant_id?: number;
  distributor_id?: number;
  supplier_id?: number;
  restaurant_name?: string;
  restaurant_logo?: string;
  distributor_name?: string;
  distributor_logo?: string;
  zip_code?: string;
  side?: string;
  is_foh_setup?: boolean;
  is_boh_setup?: boolean;
  job_title?: string;
  role?: string;
  company_id?: number;
  active_feature?: string;
  supplier_name?: string;
  supplier_logo?: string;
  type?: string;
}
