import freeEmailDomains from 'free-email-domains';

export class Contact {
  id: number;
  isSelected?: boolean;
  apolloContactId?: string;
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
      // const parsed = JSON.parse(detailsString);
      return this.convertToCamelCase(detailsString);
    } catch (error) {
      console.error('Failed to parse contact details:', error);
      return {} as ContactDetails;
    }
  }

  private convertToCamelCase(data: any): ContactDetails {
    return {
      id: data.id,
      apolloContactId: data.apolloContactId,
      firstName: data.firstName || data.first_name,
      lastName: data.lastName || data.last_name,
      name: data.name,
      linkedinUrl: data.linkedinUrl || 'https://linkedin.com',
      title: data.title,
      marketingStatus: data.marketingStatus,
      emailStatus: data.emailStatus,
      photoUrl: data.photoUrl,
      twitterUrl: data.twitterUrl,
      githubUrl: data.githubUrl,
      facebookUrl: data.facebookUrl,
      headline: data.headline,
      email: data.email ? data.email.trim() : '',
      organizationId: data.organization_id,
      employmentHistory: data.employment_history,
      state: data.state,
      city: data.city,
      country: data.country,
      notes: data.notes,
      organization: data.organization
        ? {
          name: data.organization.name,
          websiteUrl: data.organization.websiteUrl,
          blogUrl: data.organization.blogUrl,
          angellistUrl: data.organization.angellistUrl,
          linkedinUrl: data.organization.linkedinUrl || 'https://linkedin.com',
          twitterUrl: data.organization.twitter_url,
          facebookUrl: data.organization.facebook_url,
          logoUrl: data.organization.logo_url,
          phone: data.organization.phone,
          industry: data.organization.industry,
          foundedYear: data.organization.founded_year,
          estimatedNumEmployees: data.organization.estimated_num_employees,
          streetAddress: data.organization.street_address,
          city: data.organization.city,
          state: data.organization.state,
          postalCode: data.organization.postal_code,
          country: data.organization.country,
        }
        : undefined,
      isLikelyToEngage: data.is_likely_to_engage,
    };
  }

  static contactPostDto(contact: Contact) {
    return {
      id: contact.id.toString() || '',
      apolloContactId: contact.details?.apolloContactId || '',
      firstName: contact.details.firstName || contact.contactName.split(' ')[0] || '',
      lastName: contact.details.lastName || contact.contactName.split(' ').slice(1).join(' ') || '',
      name: contact.details.name || contact.contactName || '',
      linkedinUrl: contact.details.linkedinUrl || '',
      title: contact.details.title || contact.jobTitle || '',
      marketingStatus: contact.details.marketingStatus || contact.marketingStatus || 'subscribed',
      emailStatus: contact.details.emailStatus || contact.emailStatus || null,
      photoUrl: contact.details.photoUrl || null,
      twitterUrl: contact.details.twitterUrl || null,
      githubUrl: contact.details.githubUrl || null,
      facebookUrl: contact.details.facebookUrl || null,
      headline: contact.details.headline || contact.jobTitle || '',
      email: contact.details.email || contact.email || '',
      organizationId: contact.details.organizationId || '',
      employmentHistory: contact.details.employmentHistory || [{}],
      state: contact.details.state || contact.state || '',
      city: contact.details.city || contact.city || '',
      country: contact.details.country || contact.country || '',
      notes: contact.details.notes || contact.notes || '',
      organization: {
        name: contact.details.organization?.name || contact.companyName || '',
        websiteUrl: contact.details.organization?.websiteUrl || null,
        blogUrl: contact.details.organization?.blogUrl || null,
        angellistUrl: contact.details.organization?.angellistUrl || null,
        linkedinUrl: contact.details.organization?.linkedinUrl || '',
        twitterUrl: contact.details.organization?.twitterUrl || null,
        facebookUrl: contact.details.organization?.facebookUrl || null,
        logoUrl: contact.details.organization?.logoUrl || null,
        phone: contact.details.organization?.phone || '',
        industry: contact.details.organization?.industry || null,
        foundedYear: contact.details.organization?.foundedYear || null,
        estimatedNumEmployees: contact.details.organization?.estimatedNumEmployees || null,
        streetAddress: contact.details.organization?.streetAddress || '',
        city: contact.details.organization?.city || contact.city || '',
        state: contact.details.organization?.state || contact.state || '',
        postalCode: contact.details.organization?.postalCode || '',
        country: contact.details.organization?.country || contact.country || '',
      },
      isLikelyToEngage: contact.details.isLikelyToEngage ?? true,
    };
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
      emailStatus: '',
      marketingStatus: '',
      listIds: [],
      details: JSON.stringify({
        id: '',
        apolloContactId: '',
        firstName: '',
        lastName: '',
        name: '',
        linkedinUrl: '',
        title: '',
        marketingStatus: '',
        emailStatus: null,
        photoUrl: null,
        twitterUrl: null,
        githubUrl: null,
        facebookUrl: null,
        headline: '',
        email: '',
        organizationId: '',
        employmentHistory: [],
        state: '',
        city: '',
        country: '',
        notes: '',
        organization: {
          name: '',
          websiteUrl: null,
          blogUrl: null,
          angellistUrl: null,
          linkedinUrl: null,
          twitterUrl: null,
          facebookUrl: null,
          logoUrl: null,
          phone: '',
          industry: null,
          foundedYear: null,
          estimatedNumEmployees: null,
          streetAddress: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
        isLikelyToEngage: false,
      }),
      source: 'manual',
      notes: null,
      status: 'inactive',
      createdAt: new Date().toISOString(),
    };
    return new Contact(emptyRawData);
  }

  static parseCsvDataToContact(csvData) {
    const contacts = [];
    csvData.data.map((contact: any) => {
      const email = contact['Email'].trim();
      let linkedin = contact['Linkedin'] || '';
      if (!linkedin) {
        linkedin = 'https://www.linkedin.com';
      }
      let companyLinkedin = contact['Company Linkedin Url'] || '';
      if (!companyLinkedin) {
        companyLinkedin = 'https://www.linkedin.com';
      }

      let website = contact['Website'] || '';
      if (website && !website.startsWith('http')) {
        website = `https://${website}`;
      }
      if (!website) {
        const emailDomain = email.split('@')[1];
        if (!freeEmailDomains.includes(emailDomain)) {
          website = `https://${emailDomain}`;
        }
      }

      const c: Contact = Contact.empty();
      c.email = email;
      c.state = contact['State'];
      c.city = contact['City'];
      c.country = contact['Country'];
      c.details.firstName = contact['First Name'];
      c.details.lastName = contact['Last Name'];
      c.details.name = `${contact['First Name']} ${contact['Last Name']}`;
      c.details.linkedinUrl = linkedin.trim();
      c.details.title = contact['Job Title'];
      c.details.headline = contact['Job Title'];
      c.details.city = contact['City'];
      c.details.state = contact['State'];
      c.details.country = contact['Country'];
      c.details.organization = {};
      c.details.organization.name = contact['Company Name'];
      c.details.organization.phone = contact['Phone Number'];
      c.details.organization.city = contact['City'];
      c.details.organization.state = contact['State'];
      c.details.organization.country = contact['Country'];
      c.details.organization.linkedinUrl = companyLinkedin.trim();
      c.details.organization.websiteUrl = website;
      contacts.push(Contact.contactPostDto(c));
    });

    return contacts;
  }

  static fromJSON(json: any): Contact {
    return new Contact({
      ...json,
      listIds: json.listIds || [],
      details: json.details || '{}',
    });
  }
}

// Supporting interfaces with camelCase properties
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
  apolloContactId?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  linkedinUrl?: string;
  title?: string;
  marketingStatus?: string;
  emailStatus?: string | null;
  photoUrl?: string | null;
  twitterUrl?: string | null;
  githubUrl?: string | null;
  facebookUrl?: string | null;
  headline?: string;
  email?: string;
  organizationId?: string;
  employmentHistory?: any[][];
  state?: string;
  city?: string;
  country?: string;
  notes?: string;
  organization?: ContactOrganization;
  isLikelyToEngage?: boolean;
}

export interface ContactOrganization {
  name?: string;
  websiteUrl?: string | null;
  blogUrl?: string | null;
  angellistUrl?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  facebookUrl?: string | null;
  logoUrl?: string | null;
  phone?: string;
  industry?: string | null;
  foundedYear?: number | null;
  estimatedNumEmployees?: number | null;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export enum MarketingStatus {
  SUBSCRIBED = 'subscribed',
  UNSUBSCRIBED = 'unsubscribed',
  PENDING = 'pending',
}
