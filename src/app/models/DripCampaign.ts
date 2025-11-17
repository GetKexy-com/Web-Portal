export class DripCampaign {
  id: number;
  company: object;
  targetAudience: string;
  audienceType: string;
  emailAbout: string;
  userPromptPriority: boolean;
  currentStep: string;
  status: string;
  contactStatus: string;
  createdAt: string;
  details: IDripCampaignDetails;
  emails: ICampaignEmail[];
  settings: ICampaignSetting[];
  lists: ICampaignList[];
  isSelected?: boolean;

  constructor(rawData: IRawDripCampaign) {
    this.id = rawData.id;
    this.company = rawData.company;
    this.targetAudience = rawData.targetAudience;
    this.audienceType = rawData.audienceType;
    this.emailAbout = rawData.emailAbout;
    this.userPromptPriority = rawData.userPromptPriority;
    this.currentStep = rawData.currentStep;
    this.status = rawData.status;
    this.contactStatus = rawData.contactStatus;
    this.createdAt = rawData.createdAt;

    this.details = {
      ...rawData.details,
      title: {
        ...rawData.details.title
      }
    };

    this.emails = rawData.emails.map(email => ({
      ...email,
      delayBetweenPreviousEmail: JSON.parse(email.delayBetweenPreviousEmail)
    }));

    this.settings = rawData.settings.map(setting => ({
      ...setting,
      settingsValue: JSON.parse(setting.settingsValue)
    }));

    this.lists = [...rawData.lists];
  }

  static empty(): DripCampaign {
    const emptyRawData: IRawDripCampaign = {
      id: 0,
      company: {},
      targetAudience: '',
      audienceType: '',
      emailAbout: '',
      userPromptPriority: false,
      currentStep: '1',
      status: 'inactive',
      contactStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      details: {
        id: 0,
        campaignId: null,
        numberOfEmails: 0,
        emailTone: 'Neutral',
        emailLength: 'Medium',
        websiteUrl: '',
        calendlyLink: '',
        createdAt: new Date().toISOString(),
        title: {
          id: 0,
          title: '',
          status: 'inactive',
          titleType: 'drip',
          createdAt: new Date().toISOString()
        }
      },
      emails: [],
      settings: [],
      lists: []
    };

    return new DripCampaign(emptyRawData);
  }

  static fromJSON(json: any): DripCampaign {
    return new DripCampaign({
      ...json,
      details: {
        ...json.details,
        title: json.details?.title || {
          id: 0,
          title: '',
          status: 'inactive',
          titleType: 'drip',
          createdAt: new Date().toISOString()
        }
      },
      emails: json.emails || [],
      settings: json.settings || [],
      lists: json.lists || []
    });
  }
}

// Interface definitions
export interface IRawDripCampaign {
  id: number;
  company: object;
  targetAudience: string;
  audienceType: string;
  emailAbout: string;
  userPromptPriority: boolean;
  currentStep: string;
  status: string;
  contactStatus: string;
  createdAt: string;
  details: IRawDripCampaignDetails;
  emails: IRawCampaignEmail[];
  settings: IRawCampaignSetting[];
  lists: IRawCampaignList[];
}

interface IDripCampaignDetails {
  id: number;
  campaignId: number | null;
  numberOfEmails: number;
  emailTone: string;
  emailLength: string;
  websiteUrl: string;
  calendlyLink: string;
  createdAt: string;
  title: ICampaignTitle;
}

interface ICampaignEmail {
  id: number;
  emailSequence: number;
  isEmailSent: boolean;
  isAddUnsubscribeLink: boolean;
  previousEmailSendTime: string | null;
  delayBetweenPreviousEmail: { days: number; hours: number; minutes: number };
  emailTone: string;
  emailLength: string;
  emailSubject: string;
  emailContent: string;
  createdAt: string;
}

interface ICampaignSetting {
  id: number;
  settingsType: string;
  settingsValue: any;
  createdAt: string;
  updatedAt: string;
}

interface ICampaignList {
  id: number;
  type: string;
  createdAt: string;
}

// Raw interfaces for JSON parsing
interface IRawDripCampaignDetails extends Omit<IDripCampaignDetails, 'title'> {
  title: ICampaignTitle;
}

interface IRawCampaignEmail extends Omit<ICampaignEmail, 'delayBetweenPreviousEmail'> {
  delayBetweenPreviousEmail: string;
}

interface IRawCampaignSetting extends Omit<ICampaignSetting, 'settingsValue'> {
  settingsValue: string;
}

interface IRawCampaignList extends ICampaignList {}

interface ICampaignTitle {
  id: number;
  title: string;
  status: string;
  titleType: string;
  createdAt: string;
}
