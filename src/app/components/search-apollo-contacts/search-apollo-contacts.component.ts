import { AfterViewChecked, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { constants } from "src/app/helpers/constants";
import {NgbModal, NgbOffcanvas, NgbTooltip} from "@ng-bootstrap/ng-bootstrap";
import { Router } from "@angular/router";
import { AuthService } from "src/app/services/auth.service";
import { countries } from "src/assets/countries";
import { states } from "src/assets/states";
import { ProspectingService } from "../../services/prospecting.service";
import Swal from "sweetalert2";
import { CampaignService } from "../../services/campaign.service";
import {
  allPersonTitlesArray, defaultPersonTitlesArray,
  fundingList,
  noOfEmployees,
  offPremisePersonTitles,
  offPremiseQOrganizationKeywordTags,
  onPremiseBohPersonTitles,
  onPremiseFohPersonTitles,
  onPremiseOrganizationIndustryTagIds,
  organizationIndustryTagIds,
  personSeniorities, revenueList, revenueMinMaxList,
  technologies,
} from "../../helpers/campaign-premise-constants";
import { Subscription } from "rxjs";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { routeConstants } from "../../helpers/routeConstants";
import {KexySelectDropdownComponent} from '../kexy-select-dropdown/kexy-select-dropdown.component';
import {CommonModule, DecimalPipe, NgClass, NgStyle} from '@angular/common';
import {KexyTabComponent} from '../kexy-tab/kexy-tab.component';
import {CampaignLayoutBottmBtnsComponent} from '../campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
import {KexyDropdownToggleComponent} from '../kexy-dropdown-toggle/kexy-dropdown-toggle.component';
import {FormsModule} from '@angular/forms';
import {RestaurantSearchFieldsComponent} from '../restaurant-search-fields/restaurant-search-fields.component';
import {ModalComponent} from '../modal/modal.component';
import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
import {StateSelectionContentComponent} from '../state-selection-content/state-selection-content.component';

@Component({
  selector: 'search-apollo-contacts',
  imports: [
    KexySelectDropdownComponent,
    NgClass,
    NgStyle,
    KexyTabComponent,
    DecimalPipe,
    CampaignLayoutBottmBtnsComponent,
    KexyDropdownToggleComponent,
    FormsModule,
    NgbTooltip,
    RestaurantSearchFieldsComponent,
    ModalComponent,
    KexyButtonComponent,
    StateSelectionContentComponent,
    CommonModule
  ],
  templateUrl: './search-apollo-contacts.component.html',
  styleUrl: './search-apollo-contacts.component.scss'
})
export class SearchApolloContactsComponent {
  @Input() setWaitingFlagToTrue;
  @Input() setWaitingFlagToFalse;
  @Input() nextBtnClick;
  @Input() backBtnClick;

  public constants = constants;
  public selectedRestaurantSearchType = constants.ZIP_POSTAL_CODE;
  public zipcode = [];
  public cityList = [];
  public selectedStates = [];
  public filteredStates = [];
  public selectedStatesCopy = [];
  public states = [];
  public jobList: any = [];
  public allJobList = [...allPersonTitlesArray];
  public supportedTechnologies = [...technologies];
  public companyKeywords = [];
  public technologies: any[] = [];
  public savedSearches: any = [];
  public modalReference;
  public saveSearchModalReference;
  public stateSearchQuery: string = "";
  public userData;
  public creditNumber: number;
  public countries = [
    { key: "unitedStates", value: constants.UNITED_STATES },
    { key: "canada", value: constants.CANADA },
  ];
  public selectedSavedSearches: string = "";
  public selectedCountry: string = constants.UNITED_STATES;
  public selectedCountryCode: string = constants.US;
  public targetPeopleTypeOptions = [
    {
      key: "offPremise",
      value: constants.OFF_PREMISE,
      subText: "(recommended titles automatically selected)",
    },
    {
      key: "onPremise(FOH)",
      value: constants.ON_PREMISE_FOH,
    },
    {
      key: "directToConsumer",
      value: constants.DTC,
    },
  ];
  public selectedTargettedPeople: string = constants.OFF_PREMISE;
  public personSeniorities = personSeniorities;
  public organizationIndustryTagIds = organizationIndustryTagIds;
  public noOfEmployees = noOfEmployees;
  public revenueList = revenueList;
  public revenueMinMaxList = revenueMinMaxList;
  public fundingList = fundingList;
  public usaStatesCount = 51;
  public canadaStatesCount = 10;
  public isIndustryFoodAndBeverage = false;
  public monthlyRemainingCredits;
  public additionalRemainingCredits;
  public totalRemainingCredits;
  public dripCampaignStatus: string = "";
  public dripCampaignList;
  public dripCampaignTitles;
  public selectedDripCampaign = "";
  public selectedLaunchDripCampaignType;
  public companies: object[] = [];
  public excludedCompanies: object[] = [];
  public pastCompanies: object[] = [];
  public revenueFieldDataToShow = [];
  public departmentsAndJobFunctionFieldDataToShow: string[] = [];
  public companyKeywordsFieldDataToShow: string[] = [];
  public companyFieldDataToShow: string[] = [];
  public departmentsAndJobFunctions = [...constants.DEPARTMENTS_AND_JOB_FUNCTIONS];
  public filteredDepartmentsAndJobFunctions = [...constants.DEPARTMENTS_AND_JOB_FUNCTIONS];
  public selectedDepartmentsAndJobFunctions = [];
  public searchDepartmentQuery: string = "";
  public showAdvancedSectionInIncludeKeywords: boolean = true;
  public isSelectedCompanyName: boolean = true;
  public isSelectedSocialMediaTags: boolean = true;
  public isSelectedSocialMediaDescription: boolean = false;
  public isSelectedSeoDescription: boolean = false;
  public isSelectedIncludePastCompany: boolean = false;
  public isSelectedDomainExists: boolean = false;
  public isSelectedNotAnyOfCompany: boolean = false;
  public isAnyOf: string = "isAnyOf";
  public isKnown: string = "isKnown";
  public isUnknown: string = "isUnknown";
  public selectedCompanyType: string = "isAnyOf";
  public dripCampaignStatusSubscription: Subscription;
  public dripCampaignTitlesSubscription: Subscription;

  @ViewChild("stateSelectionModal") stateSelectionModalRef: ElementRef;
  @ViewChild("jobTitleScrollElRef") private jobTitleScrollElRef: ElementRef;
  @ViewChild("countryScrollElRef") private countryScrollElRef: ElementRef;
  @ViewChild("targetPeopleScrollElRef") private targetPeopleScrollElRef: ElementRef;
  @ViewChild("dtcScrollElRef") private dtcScrollElRef: ElementRef;
  @ViewChild("employeeScrollElRef") private employeeScrollElRef: ElementRef;
  @ViewChild("revenueScrollElRef") private revenueScrollElRef: ElementRef;
  @ViewChild("fundingScrollElRef") private fundingScrollElRef: ElementRef;
  @ViewChild("saveSearchModal") private saveSearchModal: ElementRef;

  constructor(
    private modal: NgbModal,
    private router: Router,
    private _authService: AuthService,
    private prospectingService: ProspectingService,
    private campaignService: CampaignService,
    private dripCampaignService: DripCampaignService,
  ) {
  }

  async ngOnInit() {
    this.userData = this._authService.userTokenValue;
    if (this.userData.industry === constants.FOOD_AND_BEVERAGE) {
      this.isIndustryFoodAndBeverage = true;
    }
    this.selectedLaunchDripCampaignType = this.dripCampaignService.selectedLaunchDripCampaignType;

    const savedSearchesData = {
      supplier_id: this.userData.supplier_id,
    };
    this.dripCampaignService.getSavedSearchList(savedSearchesData).then((res: any) => {
      res.forEach(search => {
        this.savedSearches.push({
          key: search["id"],
          value: search["search_name"],
          ...search,
        });
      });
    });
    this.setCountryDropdown();
    this.getStatesList();
    if (!this.isIndustryFoodAndBeverage) {
      // this.setPersonTitles(defaultPersonTitlesArray);
      this.setPersonTitles([]);
    } else {
      this.setPersonTitles(offPremisePersonTitles);
    }

    if (this.campaignService.getSelectedCountry()) {
      this.selectedCountry = this.campaignService.getSelectedCountry();
    }
    if (this.campaignService.getSelectedSearchType()) {
      this.selectedRestaurantSearchType = this.campaignService.getSelectedSearchType();
    }
    if (this.campaignService.getSelectedSavedSearch()) {
      this.selectedSavedSearches = this.campaignService.getSelectedSavedSearch();
      this.showSavedSearchModal = false;
    }

    //Get credits data
    this.userOrganisationApiCall();

    this.dripCampaignStatusSubscription = this.dripCampaignService.dripCampaignStatus.subscribe(status => {
      this.dripCampaignStatus = status;
    });

    // Get Technology field data
    // this.getSupportedTechnologies();

    // Show previous data if any
    this.showPreviousData();
  }

  ngOnDestroy(): void {
    if (this.dripCampaignStatusSubscription) this.dripCampaignStatusSubscription.unsubscribe();
    if (this.dripCampaignTitlesSubscription) this.dripCampaignTitlesSubscription.unsubscribe();
  }

  setCountryDropdown = () => {
    console.log("coutries", countries);
    this.countries = countries.map(country => {
      return {
        key: country["isoCode"],
        value: country["name"],
        phonecode: country["phonecode"],
      };
    });
  };

  userOrganisationApiCall = async () => {
    const subscription = await this._authService.getSubscriptionData(true);
    this.monthlyRemainingCredits = subscription.subscription_credits[0];
    this.additionalRemainingCredits = subscription.subscription_additional_credits;
    this.totalRemainingCredits = this.monthlyRemainingCredits.current_credits + (this.additionalRemainingCredits.total_credits - this.additionalRemainingCredits.used_credits);
  };

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  jobTitleScroll = false;
  countryScroll = false;
  dripScroll = false;
  targetPeopleScroll = false;
  dtcScroll = false;
  fundingScroll = false;
  noEmployeeScroll = false;
  revenueScroll = false;
  scrollToBottom = () => {
    try {
      if (this.jobTitleScroll) {
        this.jobTitleScrollElRef.nativeElement.scrollIntoView();
      }
      if (this.countryScroll) {
        this.countryScrollElRef.nativeElement.scrollIntoView();
      }
      if (this.targetPeopleScroll) {
        this.targetPeopleScrollElRef.nativeElement.scrollIntoView();
      }
      if (this.dtcScroll) {
        this.dtcScrollElRef.nativeElement.scrollIntoView();
      }
      if (this.fundingScroll) {
        this.fundingScrollElRef.nativeElement.scrollIntoView();
      }
      if (this.revenueScroll) {
        this.revenueScrollElRef.nativeElement.scrollIntoView();
      }
      if (this.noEmployeeScroll) {
        this.employeeScrollElRef.nativeElement.scrollIntoView();
      }
    } catch (err) {
    }
  };

  onJobTitleOpen = (open) => {
    this.jobTitleScroll = open;
  };
  onDtcOpen = (open) => {
    this.dtcScroll = open;
  };
  onFundingOpen = (open) => {
    this.fundingScroll = open;
  };
  onEmployeeScrollOpen = (open) => {
    this.noEmployeeScroll = open;
  };
  onRevenueScrollOpen = (open) => {
    this.revenueScroll = open;
  };
  onCountryOpen = (open) => {
    this.countryScroll = open;
  };
  onDripCampaignOpen = (open) => {
    this.dripScroll = open;
  };
  onTargetPeopleOpen = (open) => {
    this.targetPeopleScroll = open;
  };

  public setPersonTitles = (data) => {
    this.jobList = data;
  };

  setSelectedRestaurantSearchType = (value) => {
    this.selectedRestaurantSearchType = value;
    this.numberOfEstablishment = 0;
  };

  getCityListOrZipcodeValue = async (value) => {
    if (value) {
      if (this.selectedRestaurantSearchType === constants.ZIP_POSTAL_CODE) {
        this.zipcode.push({ val: value });
      } else if (this.selectedRestaurantSearchType === constants.CITY) {
        this.cityList.push({ val: value });
      }
    }

    // Clear the cache data because search parameter changed
    this.prospectingService.totalSearchedContactCount = 0;
    this.prospectingService.cachedSaledLeadSearchContacts = [];

    this.numberOfEstablishment = await this.getCreateDealSearchContacts();
  };

  removeCityListOrZipcodeValue = async (value) => {
    if (this.selectedRestaurantSearchType === constants.ZIP_POSTAL_CODE) {
      const index = this.zipcode.indexOf(value);
      this.zipcode.splice(index, 1);
    } else if (this.selectedRestaurantSearchType === constants.CITY) {
      const index = this.cityList.indexOf(value);
      this.cityList.splice(index, 1);
    } else if (this.selectedRestaurantSearchType === constants.STATE_PROVINCE) {
      const index = this.selectedStates.indexOf(value);
      this.selectedStates.splice(index, 1);
    }
  };

  openStateSelectionModal = () => {
    if (this.selectedRestaurantSearchType === constants.STATE_PROVINCE) {
      this.modalReference = this.modal.open(this.stateSelectionModalRef, { size: "md" });
    }
  };

  handleAddCityOrZipcodeName = (value) => {
    if (this.selectedRestaurantSearchType === constants.ZIP_POSTAL_CODE) {
      this.zipcode.push({ val: value });
    } else if (this.selectedRestaurantSearchType === constants.CITY) {
      this.cityList.push({ val: value });
    }
  };

  handleRemoveCityOrZipcodeName = () => {
    if (this.selectedRestaurantSearchType === constants.ZIP_POSTAL_CODE) {
      this.zipcode.length > 0 ? this.zipcode.pop() : "";
    } else if (this.selectedRestaurantSearchType === constants.CITY) {
      this.cityList.length > 0 ? this.cityList.pop() : "";
    }
  };

  toggleStateValue = (value) => {
    const index = this.selectedStatesCopy.findIndex((i) => i.val === value);
    if (index > -1) {
      this.selectedStatesCopy.splice(index, 1);
    } else {
      this.selectedStatesCopy.push({ val: value });
    }
  };

  toggleAllStateSelection = () => {
    if (this.selectedStatesCopy.length === this.filteredStates.length) {
      this.selectedStatesCopy = [];
    } else {
      this.selectedStatesCopy = [];
      this.filteredStates.map((i) => this.selectedStatesCopy.push({ val: i.name }));
    }
  };

  handleStateSearchQueryChange = (value) => {
    this.stateSearchQuery = value;
    if (this.stateSearchQuery) {
      this.filteredStates = this.states.filter((i) =>
        i.name.toLowerCase().includes(this.stateSearchQuery.toLowerCase()),
      );
    } else {
      this.filteredStates = this.states;
    }
  };

  submitStateSelection = () => {
    this.selectedStates = this.selectedStatesCopy;
    this.closeModal();
  };

  closeModal = () => {
    this.modalReference.close();
  };

  getStatesList = () => {
    // if (this.selectedCountry === constants.UNITED_STATES) {
    //   this.states = usaStates;
    //   this.states = this.states.sort((a, b) => a.name.localeCompare(b.name));
    // }
    // if (this.selectedCountry === constants.CANADA) {
    //   this.states = canadaStates;
    //   this.states = this.states.sort((a, b) => a.name.localeCompare(b.name));
    // }
    const selectedCountryStates = states.filter((state) => state.countryCode === this.selectedCountryCode);
    this.states = selectedCountryStates.sort((a, b) => a.name.localeCompare(b.name));
    console.log("states", this.states);
    this.filteredStates = this.states;
  };

  getDepartmentKeys = (): string[] => {
    if (!this.departmentsAndJobFunctionFieldDataToShow.length) return [];

    let keys = [];
    this.departmentsAndJobFunctionFieldDataToShow.forEach(department => {
      const index = this.filteredDepartmentsAndJobFunctions.findIndex(item => item.name === department);
      const selectedDepartmentObj = this.filteredDepartmentsAndJobFunctions[index];
      const subItems = selectedDepartmentObj.subItems;
      const selectedSubItems = subItems.filter(item => item.isSelected);

      if (subItems.length === selectedSubItems.length) {
        keys.push(selectedDepartmentObj.key);
      } else {
        selectedSubItems.forEach(item => keys.push(item.key));
      }
    });
    return keys;
  };

  getCompanyKeys = (): string[] => {
    if (!this.companyKeywordsFieldDataToShow.length) return [];
    let keys: string[] = [];
    this.companyKeywordsFieldDataToShow.forEach(keyword => {
      const index = this.companyKeywords.findIndex(item => item.value === keyword);
      if (index > -1) {
        keys.push(keyword);
      }
    });
    return keys;
  };

  getTechnologyKeys = (): string[] => {
    let keys = [];
    this.technologies.forEach(tech => {
      if (tech.isSelected) {
        keys.push(tech.key);
      }
    });
    return keys;
  };

  getIncludedOrganizationKeywordFields = (): string[] => {
    let keys = [];
    if (this.isSelectedSocialMediaTags) keys.push("tags");
    if (this.isSelectedCompanyName) keys.push("name");
    if (this.isSelectedSeoDescription) keys.push("seo_description");
    if (this.isSelectedSocialMediaDescription) keys.push("social_media_description");
    return keys;
  };

  getCompanyIds = () => {
    let ids = [];
    this.companies.forEach(company => {
      if (company["isSelected"]) ids.push(company["key"]);
    });
    return ids;
  };

  getNotOrganizationIds = () => {
    let ids = [];
    this.excludedCompanies.forEach(company => {
      if (company["isSelected"]) ids.push(company["key"]);
    });
    return ids;
  };

  getPastOrganizationIds = () => {
    let ids = [];
    this.pastCompanies.forEach(company => {
      if (company["isSelected"]) ids.push(company["key"]);
    });
    return ids;
  };

  public numberOfEstablishment = 0;
  getCreateDealSearchContacts = async () => {
    let locationList = [];
    let countryName = this.selectedCountry === constants.UNITED_STATES ? constants.US : this.selectedCountry;
    if (this.selectedRestaurantSearchType === constants.ZIP_POSTAL_CODE) {
      this.zipcode.map((i) => locationList.push(i.val));
    } else if (this.selectedRestaurantSearchType === constants.CITY) {
      this.cityList.map((i) => locationList.push(`${i.val}, ${countryName}`));
    } else if (this.selectedRestaurantSearchType === constants.STATE_PROVINCE) {
      this.selectedStates.map((i) => locationList.push(`${i.val}, ${countryName}`));
    }

    if ((this.selectedCountry === constants.UNITED_STATES && locationList.length === this.usaStatesCount) || (this.selectedCountry === constants.CANADA && locationList.length === this.canadaStatesCount)) {
      locationList = [this.selectedCountry];
    }

    // Filter out only user selected values
    const selectedIndustryTags = this.organizationIndustryTagIds.filter(i => i.isSelected);
    const selectedPersonSeniorities = this.personSeniorities.filter(i => i.isSelected);
    const selectedJobList = this.jobList.filter(i => i.isSelected);
    const noOfEmployeeList = this.noOfEmployees.filter(i => i.isSelected);
    const fundingList = this.fundingList.filter(i => i.isSelected);
    const revenueList = this.revenueList.filter(i => i.isSelected);

    const companyKeys: string[] = this.getCompanyKeys();
    const technologyKeys: string[] = this.getTechnologyKeys();
    const departmentKeys: string[] = this.getDepartmentKeys();

    const payload = {
      search_from: constants.CAMPAIGN,
      person_locations: locationList.length ? locationList : [this.selectedCountry],
      person_titles: selectedJobList.length ? selectedJobList.map(i => i.key) : [],
      q_organization_keyword_tags: companyKeys.length ? companyKeys : offPremiseQOrganizationKeywordTags.map(i => i.key),
      organization_industry_tag_ids: selectedIndustryTags.length ? selectedIndustryTags.map(i => i.key) : this.organizationIndustryTagIds.map(i => i.key),
      person_seniorities: selectedPersonSeniorities.length ? selectedPersonSeniorities.map(i => i.key) : this.personSeniorities.map(i => i.key),
      currently_using_any_of_technology_uids: technologyKeys,
      person_department_or_subdepartments: departmentKeys,
      included_organization_keyword_fields: this.getIncludedOrganizationKeywordFields(),
    };

    if (this.selectedCompanyType === this.isKnown) payload["exist_fields"] = ["organization_id"];
    if (this.selectedCompanyType === this.isUnknown) payload["not_exist_fields"] = ["organization_id"];
    if (this.selectedCompanyType === this.isAnyOf) {
      let selectedCompanyIds = this.getCompanyIds();
      if (selectedCompanyIds.length) payload["organization_ids"] = selectedCompanyIds;

      if (this.isSelectedNotAnyOfCompany) {
        let selectedCompanyIds = this.getNotOrganizationIds();
        if (selectedCompanyIds.length) payload["not_organization_ids"] = selectedCompanyIds;
      }

      if (this.isSelectedIncludePastCompany) {
        let selectedCompanyIds = this.getPastOrganizationIds();
        if (selectedCompanyIds.length) payload["person_past_organization_ids"] = selectedCompanyIds;
      }

      if (this.isSelectedDomainExists) {
        payload["exist_fields"] = [constants.ORGANIZATION_DOMAIN];
      }
    }

    // Set payload properties based on selectedTargettedPeople
    if (this.selectedTargettedPeople === constants.OFF_PREMISE) {
      payload.organization_industry_tag_ids = [];
      payload.person_seniorities = [];
    }
    if (this.selectedTargettedPeople === constants.ON_PREMISE_FOH || this.selectedTargettedPeople === constants.ON_PREMISE_BOH) {
      payload.person_seniorities = [];
      payload.q_organization_keyword_tags = [];
    }
    if (this.selectedTargettedPeople === constants.DTC) {
      payload.person_titles = [];
      payload.q_organization_keyword_tags = [];
    }

    // If user is NOT F&B then do not send any keyword tags.
    // and we only use what user selected for industry and person_seniorities
    if (!this.isIndustryFoodAndBeverage) {
      payload.q_organization_keyword_tags = companyKeys.length ? companyKeys : [];
      payload.organization_industry_tag_ids = selectedIndustryTags.map(i => i.key);
      payload.person_seniorities = selectedPersonSeniorities.map(i => i.key);
    }

    if (noOfEmployeeList.length) {
      payload["organization_num_employees_ranges"] = noOfEmployeeList.map(i => i.key);
    }
    if (fundingList.length) {
      payload["organization_latest_funding_stage_cd"] = fundingList.map(i => parseInt(i.key));
    }
    if (revenueList.length) {
      payload["organization_trading_status"] = revenueList.map(i => i.key);
    }

    if (this.minRevenueSelected && this.maxRevenueSelected) {
      payload["revenue_range"] = {
        "min": this.minRevenueSelected.key,
        "max": this.maxRevenueSelected.key,
      };
    } else {
      if (this.minRevenueSelected) {
        payload["revenue_range"] = { "min": this.minRevenueSelected.key };
      }
      if (this.maxRevenueSelected) {
        payload["revenue_range"] = { "max": this.maxRevenueSelected.key };
      }
    }

    // Set additional search info
    const additionalSearchInfo = {
      selectedCountry: this.selectedCountry,
      selectedRestaurantSearchType: this.selectedRestaurantSearchType,
    };
    if (payload["organization_ids"]?.length) additionalSearchInfo["companies"] = this.companies.filter(item => item["isSelected"]);
    if (payload["not_organization_ids"]?.length) additionalSearchInfo["excludedCompanies"] = this.excludedCompanies.filter(item => item["isSelected"]);
    if (payload["person_past_organization_ids"]?.length) additionalSearchInfo["pastCompanies"] = this.pastCompanies.filter(item => item["isSelected"]);
    if (this.isIndustryFoodAndBeverage) additionalSearchInfo["selectedTargettedPeople"] = this.selectedTargettedPeople;

    this.campaignService.setSearchFilters(payload, additionalSearchInfo);
    await this.prospectingService.getSalesLeadContacts(1, true);
    if (!this.prospectingService.totalSearchedContactCount) {
      await Swal.fire({
        title: `Warning`,
        text: `No contacts found!`,
        icon: "warning",
      });
    }
    return this.prospectingService.totalSearchedContactCount;
  };

  public showPreviousData = () => {
    let pageData = this.campaignService.getSearchFilters();
    if (Object.keys(pageData).length == 0) return;
    this.showSearchFilterData(pageData);
  };

  onSelectTargetPeople = (selectedItem, index, rowIndex) => {
    this.selectedTargettedPeople = selectedItem.value;

    // Setting variables for Off Premise (FOH)
    if (this.selectedTargettedPeople === constants.OFF_PREMISE) {
      this.setPersonTitles(offPremisePersonTitles);
    }

    // Setting variables for On Premise (FOH)
    if (this.selectedTargettedPeople === constants.ON_PREMISE_FOH) {
      // Deselect person titles if any or all selected
      onPremiseFohPersonTitles.map(i => i.isSelected = false);
      this.setPersonTitles(onPremiseFohPersonTitles);

      this.organizationIndustryTagIds = [];
      this.organizationIndustryTagIds = onPremiseOrganizationIndustryTagIds;
    }

    // Setting variables for On Premise (BOH)
    if (this.selectedTargettedPeople === constants.ON_PREMISE_BOH) {
      // Deselect person titles if any or all selected
      onPremiseBohPersonTitles.map(i => i.isSelected = false);

      this.setPersonTitles(onPremiseBohPersonTitles);
      this.organizationIndustryTagIds = [];
      onPremiseOrganizationIndustryTagIds.map(i => i.isSelected = false);
      this.organizationIndustryTagIds = onPremiseOrganizationIndustryTagIds;
    }

    // Setting variables for DTC
    if (this.selectedTargettedPeople === constants.DTC) {
      this.organizationIndustryTagIds = [];
      organizationIndustryTagIds.map(i => i.isSelected = false);
      this.organizationIndustryTagIds = organizationIndustryTagIds;

      this.personSeniorities = [];
      personSeniorities.map(i => i.isSelected = false);
      this.personSeniorities = personSeniorities;
    }

    this.shouldShowSavedSearchModal();
  };


  handleJobSelectFromSearchedItem = (selectedValue) => {
    // checking if selected item is already pushed into job titles.If not then push it into job titles.Because jobTitles is small array to work with later.
    const i = this.jobList.findIndex(i => i.key === selectedValue.key);
    if (i > -1) {
      this.jobList[i].isSelected = !this.jobList[i].isSelected;
    } else {
      this.jobList.push({ ...selectedValue, isSelected: true });
    }

    // Toggle selected item in all job titles .
    const j = this.allJobList.indexOf(selectedValue);
    if (j > -1) {
      // Toggle the selected state of the individual item
      this.allJobList[j].isSelected = !this.allJobList[j].isSelected;
    }
  };

  selectAllJobs = (options = []) => {
    this.jobList = options;
    this.shouldShowSavedSearchModal();
  };
  selectAllIndustry = (options = []) => {
    this.organizationIndustryTagIds = options;
    this.shouldShowSavedSearchModal();
  };

  selectAllSeniorities = (options = []) => {
    this.personSeniorities = options;
    this.shouldShowSavedSearchModal();
  };
  selectAllFunding = (options = []) => {
    this.fundingList = options;
    this.shouldShowSavedSearchModal();
  };

  // selectAllRevenue = (options = []) => {
  //   this.revenueList = options;
  //   this.shouldShowSavedSearchModal();
  // };

  selectAllNoOfEmployee = (options = []) => {
    this.noOfEmployees = options;
    this.shouldShowSavedSearchModal();
  };

  handleMultiselectFunctionality = (options, selectedValue) => {
    const i = options.indexOf(selectedValue);
    if (i > -1) {
      options[i].isSelected = !options[i].isSelected;
    } else {
      // searched item which user type but did not match any
      options.push({ ...selectedValue, isSelected: true });
    }
    this.shouldShowSavedSearchModal();
  };

  showSavedSearchModal = true;
  onCountrySelect = async (selectedValue, index, rowIndex) => {
    if (this.selectedCountry === selectedValue.value) return;
    this.selectedCountry = selectedValue.value;
    this.selectedCountryCode = selectedValue.key;
    this.getStatesList();

    this.shouldShowSavedSearchModal();

    // Set search city or state to empty
    this.cityList = [];
    this.selectedStates = [];
    this.selectedStatesCopy = [];
    this.numberOfEstablishment = 0;
  };

  shouldShowSavedSearchModal = () => {
    this.showSavedSearchModal = true;
  };

  onSavedSearchSelect = async (selectedValue, index, rowIndex) => {
    // We have to clear previous search data to use the new selected data
    this.resetSearchFilter();
    this.selectedSavedSearches = selectedValue;
    selectedValue["parsed_search_details"] = JSON.parse(selectedValue.search_details);
    this.selectedRestaurantSearchType = selectedValue.search_area_type;

    // this.selectedCountry = selectedValue.country;
    const countryIndex = this.countries.findIndex((c) => c["value"] === selectedValue.country);
    if (countryIndex > -1) {
      this.onCountrySelect(this.countries[countryIndex], null, null);
    }

    this.campaignService.setSelectedSearchType(this.selectedRestaurantSearchType);
    this.campaignService.setSelectedCountry(this.selectedCountry);
    this.campaignService.setSelectedSavedSearch(selectedValue);

    // Get state list for the selectedCountry
    // this.getStatesList();

    // Fill all the inputs with the saved search details
    this.showSearchFilterData(selectedValue["parsed_search_details"]);

    this.showSavedSearchModal = false;
    // We need to reset previous count from cache to show latest data when a saved search is selected.
    this.prospectingService.totalSearchedContactCount = 0;
  };


  deleteSavedSearch = (option, ev) => {
    // If selected data gets deleted then we need to empty selected field
    if (option.id === this.selectedSavedSearches["id"]) {
      this.selectedSavedSearches = "";
    }
    this.savedSearches.splice(this.savedSearches.indexOf(option), 1);
    const postData = {
      supplier_id: this.userData.supplier_id,
      search_id: option.id,
    };
    this.dripCampaignService.deleteSaveSearch(postData);
  };

  resetSearchFilter = () => {
    this.selectedStates = [];
    this.jobList.forEach(i => {
      i.isSelected = false;
    });
    this.organizationIndustryTagIds.forEach(i => {
      i.isSelected = false;
    });
    this.personSeniorities.forEach(i => {
      i.isSelected = false;
    });
    this.fundingList.forEach(i => {
      i.isSelected = false;
    });
    this.revenueList.forEach(i => {
      i.isSelected = false;
    });
    this.noOfEmployees.forEach(i => {
      i.isSelected = false;
    });
    this.departmentsAndJobFunctions = [...constants.DEPARTMENTS_AND_JOB_FUNCTIONS];
    this.technologies = [...constants.TECHNOLOGY_OPTIONS];
  };

  showSearchFilterData = (data) => {
    console.log("data", data);
    if (this.isIndustryFoodAndBeverage) {
      const index = this.targetPeopleTypeOptions.findIndex(i => i.value === data.selectedTargettedPeople);
      this.onSelectTargetPeople(this.targetPeopleTypeOptions[index], 0, 0);
    }

    if (data["selectedRestaurantSearchType"]) this.selectedRestaurantSearchType = data["selectedRestaurantSearchType"];

    if (data["selectedCountry"]) this.selectedCountry = data["selectedCountry"];
    let countryName = this.selectedCountry === constants.UNITED_STATES ? constants.US : this.selectedCountry;
    const locationList = data.person_locations;
    this.cityList = [];
    this.selectedStates = [];
    this.zipcode = [];
    if (locationList && locationList.length) {
      locationList.forEach((location) => {
        const stateName = location.replace(", " + countryName, "");
        if (this.selectedRestaurantSearchType === constants.CITY) {
          this.cityList.push({ val: stateName });
        } else if (this.selectedRestaurantSearchType === constants.STATE_PROVINCE) {
          this.selectedStates.push({ val: stateName });
        } else if (this.selectedRestaurantSearchType === constants.ZIP_POSTAL_CODE) {
          this.zipcode.push({ val: stateName });
        }
      });
    }

    const selectedJobList = data.person_titles;
    if (selectedJobList && selectedJobList.length) {
      selectedJobList.map(i => {
        const index = this.jobList.findIndex(j => j.key === i.toLowerCase());
        if (index > -1) {
          this.jobList[index].isSelected = true;
        } else {
          this.jobList.unshift({
            isSelected: true,
            key: i.toLowerCase(),
            value: i,
          });
        }
      });
    }

    const selectedIndustryTags = data.organization_industry_tag_ids;
    if (selectedIndustryTags && selectedIndustryTags.length) {
      selectedIndustryTags.map(i => {
        const index = this.organizationIndustryTagIds.findIndex(j => j.key === i);
        this.organizationIndustryTagIds[index].isSelected = true;
      });
    }

    const selectedPersonSeniorities = data.person_seniorities;
    if (selectedPersonSeniorities && selectedPersonSeniorities.length) {
      selectedPersonSeniorities.map(i => {
        const index = this.personSeniorities.findIndex(j => j.key === i);
        this.personSeniorities[index].isSelected = true;
      });
    }

    const selectedFunding = data.organization_latest_funding_stage_cd;
    if (selectedFunding && selectedFunding.length) {
      selectedFunding.map(i => {
        const index = this.fundingList.findIndex(j => parseInt(j.key) === i);
        this.fundingList[index].isSelected = true;
      });
    }

    const selectedRevenueList = data.organization_trading_status;
    if (selectedRevenueList && selectedRevenueList.length) {
      selectedRevenueList.map(i => {
        const index = this.revenueList.findIndex(j => j.key === i);
        this.revenueList[index].isSelected = true;
      });
    }

    const selectedRevenueRange = data.revenue_range;
    if (selectedRevenueRange && Object.keys(selectedRevenueRange).length > 0) {
      if (selectedRevenueRange["min"]) {
        const minIndex = this.revenueMinMaxList.findIndex(i => i.key === selectedRevenueRange["min"]);
        this.minRevenueSelected = this.revenueMinMaxList[minIndex];
      }
      if (selectedRevenueRange["max"]) {
        const maxIndex = this.revenueMinMaxList.findIndex(i => i.key === selectedRevenueRange["max"]);
        this.maxRevenueSelected = this.revenueMinMaxList[maxIndex];
      }
    } else {
      this.minRevenueSelected = {};
      this.maxRevenueSelected = {};
    }
    this.setRevenueFieldsDataToShow();

    const selectedEmployeeRange = data.organization_num_employees_ranges;
    if (selectedEmployeeRange && selectedEmployeeRange.length) {
      selectedEmployeeRange.map(i => {
        const index = this.noOfEmployees.findIndex(j => j.key === i);
        this.noOfEmployees[index].isSelected = true;
      });
    }

    const departments = data.person_department_or_subdepartments;
    if (departments?.length > 0) {
      this.setSavedDepartments(departments);
    }

    const technologies = data.currently_using_any_of_technology_uids;
    if (technologies?.length > 0) {
      this.technologies = [];
      technologies.forEach(technology => {
        const technologyItem = this.supportedTechnologies.find(item => item.key === technology);
        this.technologies.push({ ...technologyItem, isSelected: true });
        // this.onSelectTechnology(technologyItem);
      });
    }

    const includedOrganizationKeywordFields = data.included_organization_keyword_fields;
    if (includedOrganizationKeywordFields?.length > 0) {
      includedOrganizationKeywordFields.forEach(item => {
        if (item === "tags") this.isSelectedSocialMediaTags = true;
        if (item === "name") this.isSelectedCompanyName = true;
        if (item === "seo_description") this.isSelectedSeoDescription = true;
        if (item === "social_media_description") this.isSelectedSocialMediaDescription = true;
      });
    }

    const companyKeywords = data.q_organization_keyword_tags;
    if (companyKeywords?.length > 0) {
      this.companyKeywords = [];
      companyKeywords.forEach(item => {
        const dataObj = {
          key: item,
          value: item,
          isSelected: true,
        };
        this.companyKeywords.push(dataObj);
      });
      this.setSelectedCompanyKeywords();
    }

    const organizationIds = data.organization_ids;
    const companies = data.companies;
    if (organizationIds?.length > 0 && companies?.length) {
      this.companies = companies;
      this.setSelectedCompanies();
    }

    const notOrganizationIds = data.not_organization_ids;
    const excludedCompanies = data.excludedCompanies;
    if (notOrganizationIds?.length && excludedCompanies?.length) {
      this.isSelectedNotAnyOfCompany = true;
      this.excludedCompanies = excludedCompanies;
      this.setSelectedCompanies();
    }

    const personPastOrganizationIds = data.person_past_organization_ids;
    const pastCompanies = data.pastCompanies;
    if (personPastOrganizationIds?.length && pastCompanies?.length) {
      this.isSelectedIncludePastCompany = true;
      this.pastCompanies = pastCompanies;
      this.setSelectedCompanies();
    }

    const existFields = data.exist_fields;
    if (existFields?.length) {
      if (existFields[0] === constants.ORGANIZATION_DOMAIN) {
        this.isSelectedDomainExists = true;
      } else {
        this.selectedCompanyType = this.isKnown;
        this.setSelectedCompanies();
      }
    }

    const notExistFields = data.not_exist_fields;
    if (notExistFields?.length) {
      this.selectedCompanyType = this.isUnknown;
      this.setSelectedCompanies();
    }
  };

  setSavedDepartments = (departments) => {
    departments.forEach(department => {
      const index = this.departmentsAndJobFunctions.findIndex(item =>
        item.key === department || item.subItems?.some(subitem => subitem.key === department),
      );

      if (index === -1) return; // Skip if no match is found

      const departmentItem = this.departmentsAndJobFunctions[index];
      departmentItem.isOpen = true;

      if (departmentItem.key === department) {
        departmentItem.isSelected = true;
      } else {
        const subItem = departmentItem.subItems?.find(subitem => subitem.key === department);
        if (subItem) {
          subItem.isSelected = true;
        }
      }
    });

    this.setSelectedDepartmentList();
  };

  // onDripCampaignSelect = async (selectedValue, index, rowIndex) => {
  //   this.selectedDripCampaign = selectedValue;
  // };
  minRevenueSelected;
  maxRevenueSelected;
  onMinRevenueSelect = async (selectedValue, index, rowIndex) => {
    this.minRevenueSelected = selectedValue;
    this.setRevenueFieldsDataToShow();
    this.shouldShowSavedSearchModal();
  };
  onMaxRevenueSelect = async (selectedValue, index, rowIndex) => {
    this.maxRevenueSelected = selectedValue;
    this.setRevenueFieldsDataToShow();
    this.shouldShowSavedSearchModal();
  };

  clearRevenueItem = (item) => {
    console.log(item);
    if (item.includes("Min:")) {
      this.minRevenueSelected = undefined;
    }

    if (item.includes("Max:")) {
      this.maxRevenueSelected = undefined;
    }

    const index = this.revenueList.findIndex(i => i.key === item);
    if (index > -1) {
      this.revenueList[index].isSelected = false;
    }

    const i = this.revenueFieldDataToShow.indexOf(item);
    if (i > -1) {
      this.revenueFieldDataToShow.splice(i, 1);
    }

  };

  setRevenueFieldsDataToShow = () => {
    this.revenueFieldDataToShow = [];
    if (this.minRevenueSelected?.value) {
      this.revenueFieldDataToShow.push(`Min:${this.minRevenueSelected.value}`);
    }

    if (this.maxRevenueSelected?.value) {
      this.revenueFieldDataToShow.push(`Max:${this.maxRevenueSelected.value}`);
    }

    this.revenueList.map(i => {
      if (i.isSelected) {
        this.revenueFieldDataToShow.push(i.key);
      }
    });
  };

  clearDepartmentAndJobFunction = (item: string) => {
    const index = this.filteredDepartmentsAndJobFunctions.findIndex(department => department.name === item);
    if (index > -1) {
      const department = this.filteredDepartmentsAndJobFunctions[index];
      department.isSelected = false;
      department.subItems.forEach(subItem => subItem.isSelected = false);

      const i = this.departmentsAndJobFunctionFieldDataToShow.indexOf(item);
      if (i > -1) {
        this.departmentsAndJobFunctionFieldDataToShow.splice(i, 1);
      }
    }
  };

  clearCompanyKeyWords = (keyword: string) => {
    const index = this.companyKeywords.findIndex((item) => item.value === keyword);
    if (index > -1) {
      this.companyKeywords.splice(index, 1);
    }

    const i = this.companyKeywordsFieldDataToShow.indexOf(keyword);
    this.companyKeywordsFieldDataToShow.splice(i, 1);
  };

  clearCompany = (companies, selectedCompany: string) => {
    const index = companies.findIndex((item) => item["value"] === selectedCompany);
    if (index > -1) {
      companies[index]["isSelected"] = !companies[index]["isSelected"];
    }
  };

  clearCompanyFields = (company: string) => {
    if (company.includes(constants.COMPANY)) {
      let companyName = company.replace(`${constants.COMPANY}: `, "");
      this.clearCompany(this.companies, companyName);
    }

    if (company.includes(constants.EXCLUDED)) {
      let companyName = company.replace(`${constants.EXCLUDED}: `, "");
      this.clearCompany(this.excludedCompanies, companyName);
    }

    if (company.includes(constants.PAST)) {
      let companyName = company.replace(`${constants.PAST}: `, "");
      this.clearCompany(this.pastCompanies, companyName);
    }

    // const index = this.companies.findIndex((item) => item["value"] === company);
    // if (index > -1) {
    //   this.companies[index]["isSelected"] = !this.companies[index]["isSelected"];
    // }

    const i = this.companyFieldDataToShow.indexOf(company);
    this.companyFieldDataToShow.splice(i, 1);
  };

  onIndustrySelect = async (selectedValue, index, rowIndex) => {
    this.handleMultiselectFunctionality(this.organizationIndustryTagIds, selectedValue);
  };

  onPersonSenioritiySelect = async (selectedValue, index, rowIndex) => {
    this.handleMultiselectFunctionality(this.personSeniorities, selectedValue);
  };

  onFundingSelect = async (selectedValue, index, rowIndex) => {
    this.handleMultiselectFunctionality(this.fundingList, selectedValue);
  };
  onRevenueSelect = async (selectedValue, index, rowIndex) => {
    this.handleMultiselectFunctionality(this.revenueList, selectedValue);
    this.setRevenueFieldsDataToShow();
  };
  onNoOfEmployeeSelect = async (selectedValue, index, rowIndex) => {
    this.handleMultiselectFunctionality(this.noOfEmployees, selectedValue);
  };

  handleClickNextButton = async () => {
    // Validation
    // if (this.creditNumber > this.totalRemainingCredits || !this.creditNumber) {
    //   await Swal.fire({
    //     title: `Warning`,
    //     text: `Credits must be between 1 to ${this.totalRemainingCredits}`,
    //     icon: "warning",
    //   });
    //   return;
    // }
    // if (!this.selectedDripCampaign) {
    //   Swal.fire({
    //     title: `Warning`,
    //     text: `Please select drip campaign.`,
    //     icon: "warning",
    //   });
    //   return;
    // }
    if (!this.numberOfEstablishment) {
      Swal.fire({
        title: `Warning`,
        text: `Please select area and search.`,
        icon: "warning",
      });
      return;
    }

    if (this.showSavedSearchModal) {
      this.saveSearchModalReference = this.modal.open(this.saveSearchModal, { size: "md" });
      this.campaignService.setSelectedSavedSearch("");
    }

    if (this.selectedLaunchDripCampaignType !== constants.BROAD_CAMPAIGN) {
      // Navigate to the next page
      this.nextBtnClick();
      return;
    }

    await this.updateDripCampaignApi();
    const payload = {
      drip_campaign_id: this.selectedDripCampaign["key"],
      prospects: [],
    };
    // We call this API here to trigger the email notification to the user about launching
    // the drip campaign. This has nothing to do with assigning prospects here
    await this.dripCampaignService.assignProspectApi(payload);
  };

  saveSearchName = "";
  saveSearchLoading = false;
  saveSearchBtnClick = async () => {
    if (!this.saveSearchName) {
      Swal.fire({
        title: `Warning`,
        text: `Please enter a valid name`,
        icon: "warning",
      });
      return;
    }
    this.saveSearchLoading = true;
    const searchData = this.campaignService.getSearchFilters();
    console.log(searchData);
    if (this.isIndustryFoodAndBeverage) {
      searchData["selectedTargettedPeople"] = this.selectedTargettedPeople;
    }
    const payload = {
      supplier_id: this.userData.supplier_id,
      search_name: this.saveSearchName,
      country: this.selectedCountry,
      search_area_type: this.selectedRestaurantSearchType,
      search_details: JSON.stringify(searchData),
    };
    await this.dripCampaignService.saveSearch(payload);
    this.saveSearchModalReference.close();
    this.saveSearchLoading = false;
  };

  handleCloseSaveSearchModal = () => {
    console.log("close clicked");
    this.saveSearchModalReference.close();
  };

  updateDripCampaignApi = async () => {
    const searchData = this.campaignService.getSearchFilters();

    this.campaignService.setDripCampaignId(this.selectedDripCampaign["key"]);

    const selectedDripCampaignIndex = this.dripCampaignList.findIndex(i => i.id.toString() === this.selectedDripCampaign["key"].toString());
    const drip_campaign = this.dripCampaignList[selectedDripCampaignIndex];

    const payload = {
      drip_campaign_id: this.selectedDripCampaign["key"],
      supplier_id: this.userData.supplier_id,
      allowed_credit_limit: this.creditNumber || 1,
      drip_campaign_title_id: drip_campaign.drip_campaign_detail.drip_campaign_title_id,
      number_of_emails: drip_campaign.drip_campaign_detail.number_of_emails,
      email_tone: drip_campaign.drip_campaign_detail.email_tone,
      website_url: drip_campaign.drip_campaign_detail.website_url,
      calendly_link: drip_campaign.drip_campaign_detail.calendly_link,
      campaign_id: drip_campaign.drip_campaign_detail.campaign_id,
      supplier_side: this.userData.side,
      status: constants.ACTIVE,
      establishment_search_type: this.selectedRestaurantSearchType,
      establishment_search_value: JSON.stringify(searchData),
      target_audience: drip_campaign.target_audience,
      email_about: drip_campaign.email_about,
      audience_type: drip_campaign.audience_type,
    };

    try {
      await this.dripCampaignService.createOrUpdateDripCampaign(payload);

      let isConfirm = await Swal.fire({
        title: `Success`,
        text: "Campaign launched successfully",
        icon: "success",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Ok",
      });

      if (!isConfirm.dismiss) {
        await this.router.navigate([routeConstants.BRAND.LIST_DRIP_CAMPAIGN]);
      }

    } catch (e) {
      Swal.fire("Error", e.message, "error");
    }
  };

  // handleCreditInputChange = (e) => {
  //   this.creditNumber = parseInt(e.replaceAll(",", ""));
  //   if (this.creditNumber < 1) {
  //   }
  // };

  getCampaignTitle = (title_id) => {
    const index = this.dripCampaignTitles && this.dripCampaignTitles.findIndex(i => i.id.toString() === title_id.toString());
    if (index < 0) return;

    return this.dripCampaignTitles[index].title;
  };

  isOpenRevenueAccordion: boolean = false;
  // handleToggleRevenueAccordion = () => {
  //   this.isOpenRevenueAccordion = !this.isOpenRevenueAccordion;
  // };

  setSelectedDepartmentList = () => {
    this.selectedDepartmentsAndJobFunctions = this.filteredDepartmentsAndJobFunctions.filter(department => department.isSelected || department.subItems.some(subItem => subItem.isSelected));

    this.departmentsAndJobFunctionFieldDataToShow = [];
    if (this.selectedDepartmentsAndJobFunctions.length) {
      this.selectedDepartmentsAndJobFunctions.forEach(item => this.departmentsAndJobFunctionFieldDataToShow.push(item.name));
    }
  };

  handleToggleDepartment = (department: object) => {
    department["isOpen"] = !department["isOpen"];
  };

  toggleDepartmentSelection = (department: object, event) => {
    this.eventStopPropagation(event);
    department["isSelected"] = !department["isSelected"];
    department["subItems"].forEach(subItem => {
      subItem["isSelected"] = department["isSelected"];
    });
    this.setSelectedDepartmentList();
    this.shouldShowSavedSearchModal();
  };

  toggleDepartmentSubItemSelection = (departmentSubitem: object) => {
    departmentSubitem["isSelected"] = !departmentSubitem["isSelected"];
    this.setSelectedDepartmentList();
    this.shouldShowSavedSearchModal();
  };

  eventStopPropagation = (event) => {
    event.stopPropagation();
  };

  getDepartmentIconClass(department: any): { [key: string]: boolean } {
    const subItems = department.subItems || [];
    const totalSubItems = subItems.length;
    const selectedSubItems = subItems.filter(subItem => subItem.isSelected).length;

    const allSelected = selectedSubItems && selectedSubItems === totalSubItems;
    const noneSelected = selectedSubItems === 0;

    return {
      "fa-square-o": noneSelected,
      "fa-check-square": allSelected,
      "fa-minus-square-o": !noneSelected && !allSelected,
      "selected": !noneSelected,
    };
  }

  getDepartmentSubItemClass = (subItem: object) => {
    const isSelected = subItem["isSelected"];

    return {
      "fa-check-square": isSelected,
      "fa-square-o": !isSelected,
      "selected": isSelected,
    };
  };

  handleSearchDepartment = () => {
    // If query is empty, return the original list.
    if (!this.searchDepartmentQuery) {
      this.filteredDepartmentsAndJobFunctions = this.departmentsAndJobFunctions;
      return;
    }

    const lowerCaseQuery = this.searchDepartmentQuery.toLowerCase();

    this.filteredDepartmentsAndJobFunctions = this.departmentsAndJobFunctions
      .map(department => {

        // Filtering matching sub-items.
        const filteredSubItems = department.subItems.filter(subItem =>
          subItem.name.toLowerCase().startsWith(lowerCaseQuery),
        );

        // Check if department name starts with the query or has matching sub-items.
        if (
          department.name.toLowerCase().startsWith(lowerCaseQuery) ||
          filteredSubItems.length > 0
        ) {
          // Return a new department object with filtered sub-items.
          return {
            ...department,
            isOpen: true,
            subItems: filteredSubItems,
          };
        }

        return null; // Exclude the department if it doesn't match.
      })
      .filter(department => department !== null); // Remove null entries.
  };

  toggleAdvancedSection = () => {
    this.showAdvancedSectionInIncludeKeywords = !this.showAdvancedSectionInIncludeKeywords;
  };

  toggleCompanyNameSelection = () => {
    if (!this.isSelectedSocialMediaTags && !this.isSelectedSocialMediaDescription && !this.isSelectedSeoDescription) return;
    this.isSelectedCompanyName = !this.isSelectedCompanyName;
    this.shouldShowSavedSearchModal();
  };

  toggleSocialMediaTagsSelection = () => {
    if (!this.isSelectedCompanyName && !this.isSelectedSocialMediaDescription && !this.isSelectedSeoDescription) return;
    this.isSelectedSocialMediaTags = !this.isSelectedSocialMediaTags;
    this.shouldShowSavedSearchModal();
  };

  toggleSocialMediaDescriptionSelection = () => {
    if (!this.isSelectedCompanyName && !this.isSelectedSeoDescription && !this.isSelectedSocialMediaTags) return;
    this.isSelectedSocialMediaDescription = !this.isSelectedSocialMediaDescription;
    this.shouldShowSavedSearchModal();
  };

  toggleSeoDescriptionSelection = () => {
    if (!this.isSelectedCompanyName && !this.isSelectedSocialMediaDescription && !this.isSelectedSocialMediaTags) return;
    this.isSelectedSeoDescription = !this.isSelectedSeoDescription;
    this.shouldShowSavedSearchModal();
  };

  onSelectCompanyKeyword = (selectedValue) => {
    const index = this.companyKeywords.indexOf(selectedValue);
    if (index < 0) {
      this.companyKeywords.push({ ...selectedValue, isSelected: true });
    } else {
      this.companyKeywords.splice(index, 1);
    }

    this.setSelectedCompanyKeywords();
    this.shouldShowSavedSearchModal();
  };

  setSelectedCompanyKeywords = () => {
    this.companyKeywordsFieldDataToShow = [];
    this.companyKeywords.forEach(item => this.companyKeywordsFieldDataToShow.push(item.value));
  };

  toggleCompanySelectOption = (item: string) => {
    if (item === "includePastCompany") this.isSelectedIncludePastCompany = !this.isSelectedIncludePastCompany;
    if (item === "isNotAnyOf") this.isSelectedNotAnyOfCompany = !this.isSelectedNotAnyOfCompany;
    if (item === "domainExists") this.isSelectedDomainExists = !this.isSelectedDomainExists;
    this.shouldShowSavedSearchModal();
  };

  isCompanyFieldLoading: boolean = false;
  onSearchAndSetCompanies = async (selectedValue) => {
    if (!selectedValue.searchQuery) {
      selectedValue.isSelected = !selectedValue.isSelected;
      this.setSelectedCompanies();
      return;
    }

    let selectedCompanies = this.companies.filter(company => company["isSelected"]);

    const postData = {
      supplier_id: this.userData.supplier_id,
      q_organization_name: selectedValue.value,
    };
    try {
      this.isCompanyFieldLoading = true;
      const companies = await this.dripCampaignService.getApolloOrganizations(postData);
      if (companies["length"]) {
        this.companies = companies["map"](company => {
          return {
            key: company["id"],
            value: company["name"],
            isSelected: false,
          };
        });
      }

    } catch (e) {
      await Swal.fire("error", e.message);

    } finally {
      if (selectedCompanies.length) {
        this.companies = [...this.companies, ...selectedCompanies];
      }
      this.setSelectedCompanies();
      this.isCompanyFieldLoading = false;
    }
  };

  setSelectedCompanies = () => {
    this.companyFieldDataToShow = [];

    this.companies.forEach(item => {
      if (item["isSelected"]) this.companyFieldDataToShow.push(`${constants.COMPANY}: ` + item["value"]);
    });

    this.excludedCompanies.forEach(item => {
      if (item["isSelected"]) this.companyFieldDataToShow.push(`${constants.EXCLUDED}: ` + item["value"]);
    });

    this.pastCompanies.forEach(item => {
      if (item["isSelected"]) this.companyFieldDataToShow.push(`${constants.PAST}: ` + item["value"]);
    });
    this.shouldShowSavedSearchModal();
  };

  isExcludeCompanyFieldLoading: boolean = false;
  onSearchAndSetExcludeCompanies = async (selectedValue) => {
    if (!selectedValue.searchQuery) {
      selectedValue.isSelected = !selectedValue.isSelected;
      this.setSelectedCompanies();
      return;
    }

    let selectedCompanies = this.excludedCompanies.filter(company => company["isSelected"]);

    const postData = {
      supplier_id: this.userData.supplier_id,
      q_organization_name: selectedValue.value,
    };
    try {
      this.isExcludeCompanyFieldLoading = true;
      const companies = await this.dripCampaignService.getApolloOrganizations(postData);
      if (companies["length"]) {
        this.excludedCompanies = companies["map"](company => {
          return {
            key: company["id"],
            value: company["name"],
            isSelected: false,
          };
        });
      }

    } catch (e) {
      await Swal.fire("error", e.message);

    } finally {
      if (selectedCompanies.length) {
        this.excludedCompanies = [...this.excludedCompanies, ...selectedCompanies];
      }
      this.setSelectedCompanies();
      this.isExcludeCompanyFieldLoading = false;
    }
  };

  isPastCompanyFieldLoading: boolean = false;
  onSearchAndSetPastCompanies = async (selectedValue) => {
    if (!selectedValue.searchQuery) {
      selectedValue.isSelected = !selectedValue.isSelected;
      this.setSelectedCompanies();
      return;
    }

    let selectedCompanies = this.pastCompanies.filter(company => company["isSelected"]);

    const postData = {
      supplier_id: this.userData.supplier_id,
      q_organization_name: selectedValue.value,
    };
    try {
      this.isPastCompanyFieldLoading = true;
      const companies = await this.dripCampaignService.getApolloOrganizations(postData);
      if (companies["length"]) {
        this.pastCompanies = companies["map"](company => {
          return {
            key: company["id"],
            value: company["name"],
            isSelected: false,
          };
        });
      }

    } catch (e) {
      await Swal.fire("error", e.message);

    } finally {
      if (selectedCompanies.length) {
        this.pastCompanies = [...this.pastCompanies, ...selectedCompanies];
      }
      this.setSelectedCompanies();
      this.isPastCompanyFieldLoading = false;
    }
  };

  // getSupportedTechnologies = async () => {
  //   const postData = {
  //     supplier_id: this.userData.supplier_id,
  //   };
  //   try {
  //     const technologies = await this.dripCampaignService.getSupportedTechnologies(postData);
  //     this.supportedTechnologies = technologies["split"](",");
  //     this.supportedTechnologies.splice(0, 1); //Remove first field bacause its "Category"
  //
  //     this.supportedTechnologies = this.supportedTechnologies.map(technology => {
  //       const [technologyName, technologySection] = technology.split("\n");
  //       return {
  //         key: this.pageUiService.makeStringUnderscoreVersion(technologyName),
  //         value: technologyName,
  //         technologySection,
  //         isSelected: false,
  //       };
  //     });
  //
  //     console.log("supportedTechnologies", this.supportedTechnologies);
  //
  //   } catch (e) {
  //     await Swal.fire("error", e.message);
  //   }
  // };

  onJobSelect = async (selectedValue, index, rowIndex) => {
    const i = this.jobList.indexOf(selectedValue);
    if (i > -1) {
      // Toggle the selected state of the individual item
      this.jobList[i].isSelected = !this.jobList[i].isSelected;

      // Toggle selected item in all job titles .
      const j = this.allJobList.findIndex(a => a.key === selectedValue.key);
      if (j > -1) {
        // Toggle the selected state of the individual item
        this.allJobList[j].isSelected = !this.allJobList[j].isSelected;
      }

    } else {
      // Job selection from searched item.
      this.handleJobSelectFromSearchedItem(selectedValue);
    }
    this.shouldShowSavedSearchModal();
  };


  onSelectTechnology = async (selectedValue) => {
    if (!selectedValue.searchQuery) {
      selectedValue.isSelected = !selectedValue.isSelected;

      const index = this.technologies.indexOf(selectedValue);
      if (index === -1) {
        this.technologies.push(selectedValue);
      }
      this.shouldShowSavedSearchModal();
      return;
    }
    if (!selectedValue.value) {
      return;
    }

    const selectedTechnologies = this.technologies.filter(technology => technology.isSelected);
    const matchingTechnologies = this.supportedTechnologies.filter(technology => technology.value.toLowerCase().startsWith(selectedValue.value.toLowerCase()));
    this.technologies = [...matchingTechnologies, ...selectedTechnologies];
  };
}
