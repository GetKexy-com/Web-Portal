export const CAMPAIGN_STATUS = {
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  RUNNING: 'RUNNING',
  FAILED: 'FAILED',
} as const;

export type CampaignStatus = typeof CAMPAIGN_STATUS[keyof typeof CAMPAIGN_STATUS];

type ResearchStatuses = {
  webScrapeStatus?: string;
  mapScrapeStatus?: string;
  linkedinScrapeStatus?: string;
  sportsScrapeStatus?: string;
  sportsApplies?: boolean;
};

/**
 * Whether every research pass the send waits for has finished — the same rule as KexyApi's
 * send gate: web, map and LinkedIn, plus sports when it applies to the drip (`sportsApplies`,
 * new drips only). A status missing from an older API counts as done, so the portal can deploy
 * first. The page and the scrape card both use this, so they never disagree.
 */
export function isResearchDone(c: ResearchStatuses | null | undefined): boolean {
  if (!c) return false;
  const done = (s?: string) => s === CAMPAIGN_STATUS.SUCCEEDED;
  return (
    done(c.webScrapeStatus) &&
    done(c.mapScrapeStatus) &&
    (c.linkedinScrapeStatus == null || done(c.linkedinScrapeStatus)) &&
    (!c.sportsApplies || done(c.sportsScrapeStatus))
  );
}

/** Whether any research pass the send waits for is running right now (see `isResearchDone`). */
export function isResearchRunning(c: ResearchStatuses | null | undefined): boolean {
  if (!c) return false;
  const running = (s?: string) => s === CAMPAIGN_STATUS.RUNNING;
  return (
    running(c.webScrapeStatus) ||
    running(c.mapScrapeStatus) ||
    running(c.linkedinScrapeStatus) ||
    (!!c.sportsApplies && running(c.sportsScrapeStatus))
  );
}

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
  webScrapeStatus: CampaignStatus;
  mapScrapeStatus: CampaignStatus;
  /** Undefined from an API older than the LinkedIn pass. */
  linkedinScrapeStatus?: CampaignStatus;
  sportsScrapeStatus?: CampaignStatus;
  /**
   * Whether the sports pass applies to this drip (KexyApi `sportsAppliesToDrip`: sports on,
   * and the drip created after go-live). Older drips keep a meaningless PENDING sports status.
   */
  sportsApplies?: boolean;
  createdAt: string;
  details: IDripCampaignDetails;
  emails: ICampaignEmail[];
  settings: ICampaignSetting[];
  lists: ICampaignList[];
  leadMagnet: [];
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
    this.webScrapeStatus = rawData.webScrapeStatus;
    this.mapScrapeStatus = rawData.mapScrapeStatus;
    // Copied explicitly like every field here: dropping these made the page and the scrape
    // card treat LinkedIn and sports as done, so a drip still being researched said "live".
    this.linkedinScrapeStatus = rawData.linkedinScrapeStatus;
    this.sportsScrapeStatus = rawData.sportsScrapeStatus;
    this.sportsApplies = rawData.sportsApplies;
    this.createdAt = rawData.createdAt;

    this.details = {
      ...rawData.details,
      title: {
        ...rawData.details.title,
      },
      companyDescription: {
        ...rawData.details.companyDescription,
      },
    };
    // `?? []` on the relations, because `GET /drip-campaigns?view=summary` omits
    // `emails` and `settings` — a list view reads neither, and each email row carries
    // three copies of its body. Without this the constructor throws
    // `Cannot read properties of undefined (reading 'map')` the moment anyone points a
    // consumer of this model at the summary shape. Absent relation and empty relation
    // are treated alike on purpose: neither tells you anything a caller can act on.
    this.emails = (rawData.emails ?? []).map(email => {
      return {
        ...email,
        delayBetweenPreviousEmail: JSON.parse(email.delayBetweenPreviousEmail),
      };
    });
    this.settings = (rawData.settings ?? []).map(setting => ({
      ...setting,
      settingsValue: JSON.parse(setting.settingsValue),
    }));

    this.lists = [...(rawData.lists ?? [])];
    this.leadMagnet = rawData.leadMagnet;

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
      contactStatus: CAMPAIGN_STATUS.PENDING,
      webScrapeStatus: CAMPAIGN_STATUS.PENDING,
      mapScrapeStatus: CAMPAIGN_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      details: {
        id: 0,
        campaignId: null,
        leadMagnetIds: null,
        numberOfEmails: 0,
        emailTone: 'Neutral',
        templateOptions: '',
        emailLength: 'Medium',
        websiteUrl: '',
        calendlyLink: '',
        createdAt: new Date().toISOString(),
        title: {
          id: 0,
          title: '',
          status: 'inactive',
          titleType: 'drip',
          createdAt: new Date().toISOString(),
        },
        companyDescription: {
          id: 0,
          status: 'inactive',
          companyName: '',
          description: '',
          createdAt: new Date().toISOString(),
        },
      },
      emails: [],
      settings: [],
      lists: [],
      leadMagnet: [],
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
          createdAt: new Date().toISOString(),
        },
      },
      emails: json.emails || [],
      settings: json.settings || [],
      lists: json.lists || [],
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
  webScrapeStatus: CampaignStatus;
  mapScrapeStatus: CampaignStatus;
  linkedinScrapeStatus?: CampaignStatus;
  sportsScrapeStatus?: CampaignStatus;
  sportsApplies?: boolean;
  createdAt: string;
  details: IRawDripCampaignDetails;
  emails: IRawCampaignEmail[];
  settings: IRawCampaignSetting[];
  lists: IRawCampaignList[];
  leadMagnet: [];
}

interface IDripCampaignDetails {
  id: number;
  campaignId: number | null;
  numberOfEmails: number;
  leadMagnetIds: number[];
  templateOptions: string;
  emailTone: string;
  emailLength: string;
  websiteUrl: string;
  calendlyLink: string;
  createdAt: string;
  title: ICampaignTitle;
  companyDescription: ICompanyDescription;
}

interface ICampaignEmail {
  id: number;
  emailSequence: number;
  isEmailSent: boolean;
  isAddUnsubscribeLink: boolean;
  previousEmailSendTime: string | null;
  delayBetweenPreviousEmail: { days: number; hours: number; minutes: number };
  emailTone: string;
  templateOptions: string;
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

interface IRawCampaignList extends ICampaignList {
}

interface ICampaignTitle {
  id: number;
  title: string;
  status: string;
  titleType: string;
  createdAt: string;
}

interface ICompanyDescription {
  id: number;
  companyName: string;
  status: string;
  description: string;
  createdAt: string;
}
