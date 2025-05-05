import {ListDetail} from './List';

export interface DripCampaignDetails {
  calendlyLink: string;
  campaignId: number;
  createdAt: string;
  emailLength: string;
  emailTone: string;
  id: number;
  numberOfEmails: number;
  websiteUrl: string;
}

export interface DripCampaignEmail {
  createdAt: string;
  delayBetweenPreviousEmail: string;
  emailContent: string;
  emailLength: string;
  emailSequence: number;
  emailSubject: string;
  emailTone: string;
  id: number;
  isAddUnsubscribeLink: boolean;
  isEmailSent: boolean;
  previousEmailSendTime: string;
}

export interface DripCampaignList {
  createdAt: string;
  id: number;
  type: string;
}

export interface DripCampaignSettings {
  createdAt: string;
  id: number;
  settingsType: string;
  settingsValue: string;
  updatedAt: string;
}

export interface RawDripCampaignPage {
  audienceType: string;
  contactStatus: string;
  createdAt: string;
  currentStep: string;
  details: DripCampaignDetails;
  emailAbout: string;
  emails: DripCampaignEmail[];
  id: string;
  lists: DripCampaignList[];
  settings: DripCampaignSettings[];
  status: string;
  targetAudience: string;
}

export class DripCampaign {
  audienceType: string;
  contactStatus: string;
  createdAt: string;
  currentStep: string;
  details: object;
  emailAbout: string;
  emails: object[];
  id: string;
  lists: object[];
  settings: object[];
  status: string;
  targetAudience: string;

  constructor(rawData: RawDripCampaignPage) {
  }
}
