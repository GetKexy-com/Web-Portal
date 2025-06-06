export interface IInnerDetail {
  id: number;
  innerDetail: string;
  status: string;
  createdAt: string;
}

export interface IProspectingProduct {
  id: number;
  name: string;
  descriptions: string[];
  status: string;
  createdAt: string;
}

export interface ITitle {
  id: number;
  title: string;
  status: string;
  titleType: string;
  createdAt: string;
}

export const LandingPageType = {
  PRODUCT_LISTING: 'product_listing',
  DEAL: 'deal',
  FEATURED_PRODUCT: 'featured_product',
  ANNOUNCEMENT: 'announcement',
};
export const LandingPageStep = {
  DETAILS: 'campaign_details',
  CONTACTS: 'campaign_contacts',
  PREVIEW: 'campaign_preview',
  SUBMITTED: 'campaign_submitted',
};

export interface IQuestionReferredDataItem {
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string;
  mobileNumber: string;
}

export interface IContactInfo {
  id: number;
  transactionHandleBy: string;
  transactionHandleUrl: string | null;
  questionReferredData: IQuestionReferredDataItem[];
  distributorRep: null;
  questionForBuyer: boolean;
  createdAt: string;
}

export interface ILandingPageDetail {
  id: number;
  landingPageType: string;
  image: string;
  video: string;
  productKnowledge: string;
  price: string;
  estimatedSavings: string;
  size: string;
  amount: string;
  additionalInfo: string;
  salesSheet: string;
  purchaseUrl: string;
  visitWebsite: string;
  messageCallNumber: string;
  customButtonUrl: string;
  customButtonLabel: string;
  createdAt: string;
  innerDetail: IInnerDetail;
  prospectingProduct: IProspectingProduct;
  title: ITitle;
}

export interface IRawLandingPage {
  id: number;
  currentStep: string;
  status: string;
  token?: string;
  createdAt: string;
  detail: Omit<ILandingPageDetail, 'prospectingProduct'> & {
    prospectingProduct: Omit<IProspectingProduct, 'descriptions'> & {
      descriptions: string;
    };
  };
  contactInfo: Omit<IContactInfo, 'questionReferredData'> & {
    questionReferredData: string;
  };
}

export class LandingPage {
  id: number;
  isSelected?: boolean;
  currentStep: string;
  status: string;
  createdAt: string;
  detail: ILandingPageDetail;
  token?: string;
  contactInfo: IContactInfo;

  constructor(rawData: IRawLandingPage) {
    this.id = rawData.id;
    this.currentStep = rawData.currentStep;
    this.status = rawData.status;
    this.token = rawData.token;
    this.createdAt = rawData.createdAt;
    const desc = rawData.detail.prospectingProduct?.descriptions || '{}';
    this.detail = {
      ...rawData.detail,
      prospectingProduct: {
        ...rawData.detail.prospectingProduct,
        descriptions: JSON.parse(desc),
      },
    };

    if(rawData.contactInfo) {
      this.contactInfo = {
        ...rawData.contactInfo,
        questionReferredData: JSON.parse(rawData.contactInfo.questionReferredData),
      };
    }
  }

  // Add a static method for empty initialization
  static empty(): LandingPage {
    const emptyRawData: IRawLandingPage = {
      id: 0,
      currentStep: '1',
      status: 'inactive',
      createdAt: new Date().toISOString(),
      detail: {
        id: 0,
        landingPageType: LandingPageType.PRODUCT_LISTING,
        image: '',
        video: '',
        productKnowledge: '',
        price: '',
        estimatedSavings: '',
        size: '',
        amount: '',
        additionalInfo: '',
        salesSheet: '',
        purchaseUrl: '',
        visitWebsite: '',
        messageCallNumber: '',
        customButtonUrl: '',
        customButtonLabel: '',
        createdAt: new Date().toISOString(),
        innerDetail: {
          id: 0,
          innerDetail: '',
          status: 'inactive',
          createdAt: new Date().toISOString(),
        },
        prospectingProduct: {
          id: 0,
          name: '',
          descriptions: '[]',
          status: 'inactive',
          createdAt: new Date().toISOString(),
        },
        title: {
          id: 0,
          title: '',
          status: 'inactive',
          titleType: '',
          createdAt: new Date().toISOString(),
        },
      },
      contactInfo: {
        id: 0,
        transactionHandleBy: '',
        transactionHandleUrl: null,
        questionReferredData: '[]',
        distributorRep: null,
        questionForBuyer: false,
        createdAt: new Date().toISOString(),
      },
    };

    return new LandingPage(emptyRawData);
  }

}
