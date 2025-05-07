export class Contact {
  id: number;
  isSelected?: boolean;
  lists?: any[];
  email: string;
  contactName: string;
  companyName: string;
  jobTitle: string;
  city: string;
  state: string;
  country: string;
  emailStatus: string;
  marketingStatus: MarketingStatus;
  listIds: string[];
  details: ContactDetails;
  source: string;
  notes: string | null;
  status: string;
  createdAt: string;

  constructor(rawData: IRawContact) {
    this.id = rawData.id;
    this.email = rawData.email;
    this.contactName = rawData.contactName;
    this.companyName = rawData.companyName;
    this.jobTitle = rawData.jobTitle;
    this.city = rawData.city;
    this.state = rawData.state;
    this.country = rawData.country;
    this.emailStatus = rawData.emailStatus;
    this.marketingStatus = rawData.marketingStatus as MarketingStatus;
    this.listIds = rawData.listIds || [];
    this.details = this.parseDetails(rawData.details);
    this.source = rawData.source;
    this.notes = rawData.notes;
    this.status = rawData.status;
    this.createdAt = rawData.createdAt;
  }

  private parseDetails(detailsString: string): ContactDetails {
    try {
      return JSON.parse(detailsString);
    } catch (error) {
      console.error('Failed to parse contact details:', error);
      return {} as ContactDetails;
    }
  }

  static empty(): Contact {
    const emptyRawData: IRawContact = {
      id: 0,
      email: '',
      contactName: '',
      companyName: '',
      jobTitle: '',
      city: '',
      state: '',
      country: '',
      emailStatus: 'unverified',
      marketingStatus: 'unsubscribed',
      listIds: [],
      details: '{}',
      source: 'manual',
      notes: null,
      status: 'inactive',
      createdAt: new Date().toISOString()
    };
    return new Contact(emptyRawData);
  }

  static fromJSON(json: any): Contact {
    return new Contact({
      ...json,
      listIds: json.listIds || [],
      details: json.details || '{}'
    });
  }
}

// Supporting interfaces
export interface IRawContact {
  id: number;
  email: string;
  contactName: string;
  companyName: string;
  jobTitle: string;
  city: string;
  state: string;
  country: string;
  emailStatus: string;
  marketingStatus: string;
  listIds: string[];
  details: string; // JSON string
  source: string;
  notes: string | null;
  status: string;
  createdAt: string;
}

export interface ContactDetails {
  id?: string;
  apollo_contact_id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  linkedin_url?: string;
  title?: string;
  marketing_status?: string;
  email_status?: string | null;
  photo_url?: string | null;
  twitter_url?: string | null;
  github_url?: string | null;
  facebook_url?: string | null;
  headline?: string;
  email?: string;
  organization_id?: string;
  employment_history?: any[][];
  state?: string;
  city?: string;
  country?: string;
  notes?: string;
  organization?: ContactOrganization;
  is_likely_to_engage?: boolean;
}

export interface ContactOrganization {
  name?: string;
  website_url?: string | null;
  blog_url?: string | null;
  angellist_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  facebook_url?: string | null;
  logo_url?: string | null;
  phone?: string;
  industry?: string | null;
  founded_year?: number | null;
  estimated_num_employees?: number | null;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export enum MarketingStatus {
  SUBSCRIBED = 'subscribed',
  UNSUBSCRIBED = 'unsubscribed',
  PENDING = 'pending'
}
