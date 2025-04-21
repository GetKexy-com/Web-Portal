// import { Component, inject, Input, OnDestroy, OnInit } from "@angular/core";
// import { AuthService } from "../../services/auth.service";
// import { Subscription } from "rxjs";
// import { constants } from "src/app/helpers/constants";
// import { ProspectingService } from "../../services/prospecting.service";
// import { usaStates } from "src/assets/usaStates";
// import { canadaStates } from "src/assets/canadaStates";
// import { PageUiService } from "../../services/page-ui.service";
// import {KexyButtonComponent} from '../kexy-button/kexy-button.component';
// import {KexySelectDropdownComponent} from '../kexy-select-dropdown/kexy-select-dropdown.component';
// import {FormsModule} from '@angular/forms';
//
// @Component({
//   selector: 'search-contact-modal-content',
//   imports: [
//     KexyButtonComponent,
//     KexySelectDropdownComponent,
//     FormsModule
//   ],
//   templateUrl: './search-contact-modal-content.component.html',
//   styleUrl: './search-contact-modal-content.component.scss'
// })
// export class SearchContactModalContentComponent {
//   @Input() closeModal;
//   @Input() searchContactClick;
//   isLoading = false;
//
//   public labelOptions = [];
//   public dripCampaignTitles;
//   public userData;
//   public contactName = "";
//   public contactEmail = "";
//   public companyName = "";
//   public marketingStatusOptions = [...constants.MARKETING_STATUS_OPTIONS];
//   public emailStatusOptions = [...constants.EMAIL_STATUS_OPTIONS];
//   public selectedMarketingStatus;
//   public selectedEmailStatus;
//   public countries = [...constants.COUNTRIES];
//   public selectedCountry: string = "";
//   public statesOptions = [];
//   public usaStatesWithKeyValuePair = [];
//   public canadaStatesWithKeyValuePair = [];
//   public city;
//   public selectedState;
//   public dripCampaignTitlesSubscription: Subscription;
//   public contactLabelsSubscription: Subscription;
//
//   constructor(private _authService: AuthService, private prospectingService: ProspectingService, private pageUiService: PageUiService) {
//   }
//
//   async ngOnInit() {
//     this.userData = this._authService.userTokenValue;
//
//     // Set Label subscription
//     this.prospectingService.getLabels({ supplier_id: this.userData.supplier_id });
//     this.contactLabelsSubscription = this.prospectingService.labels.subscribe((labels) => {
//       // Set label dropdown options
//       this.labelOptions = [];
//       labels.map(i => this.labelOptions.push({
//         key: i.label,
//         value: i.label,
//         itemBgColor: i.bg_color,
//         itemTextColor: i.text_color,
//         id: i.id,
//         isSelected: false,
//       }));
//
//       // Set previous filter value
//       this.setPreviousFilterValue();
//     });
//   }
//
//   ngOnDestroy(): void {
//     if (this.dripCampaignTitlesSubscription) this.dripCampaignTitlesSubscription.unsubscribe();
//     if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
//   }
//
//   setPreviousFilterValue = () => {
//     const activeFilterCount = this.prospectingService.searchContactActiveFilterCount;
//     const filterData = this.prospectingService.searchContactFilterData;
//     if (activeFilterCount && filterData) {
//       // Labels
//       if (filterData.labels && filterData.labels.length) {
//         filterData.labels.forEach(label => {
//           const index = this.labelOptions.findIndex(l => l.id === label.id);
//           if (index > -1) {
//             this.labelOptions[index].isSelected = true;
//           }
//         });
//       }
//
//       if (filterData.name) this.contactName = filterData.name;
//       if (filterData.city) this.city = filterData.city;
//       if (filterData.companyName) this.companyName = filterData.companyName;
//       if (filterData.email) this.contactEmail = filterData.email;
//       if (filterData.country) {
//         this.selectedCountry = filterData.country;
//         this.getStatesList();
//       }
//       if (filterData.state) this.selectedState = filterData.state;
//       if (filterData.emailStatus) {
//         const index = this.emailStatusOptions.findIndex(emailStatus => emailStatus.key === filterData.emailStatus);
//         if (index > -1) {
//           this.selectedEmailStatus = this.emailStatusOptions[index].value;
//         }
//       }
//       if (filterData.marketingStatus) this.selectedMarketingStatus = this.pageUiService.capitalizeFirstLetter(filterData.marketingStatus);
//     }
//   };
//
//   handleMultiselectFunctionality = (options, selectedValue) => {
//     const i = options.indexOf(selectedValue);
//     if (i > -1) {
//       options[i].isSelected = !options[i].isSelected;
//     }
//   };
//
//   onLabelSelect = (selectedValue, index = null, rowIndex = null) => {
//     this.handleMultiselectFunctionality(this.labelOptions, selectedValue);
//   };
//
//   onMarketingStatusSelect = (selectedValue, index = null, rowIndex = null) => {
//     this.selectedMarketingStatus = selectedValue.value;
//   };
//
//   onEmailStatusSelect = (selectedValue, index = null, rowIndex = null) => {
//     this.selectedEmailStatus = selectedValue.value;
//   };
//
//   onCountrySelect = async (selectedValue, index, rowIndex) => {
//     this.selectedCountry = selectedValue.value;
//     this.getStatesList();
//   };
//
//   getStatesList = () => {
//     if (this.selectedCountry === constants.UNITED_STATES) {
//       // set key value pair for state options
//       this.setKeyValuePairForStates();
//
//       this.statesOptions = this.usaStatesWithKeyValuePair.sort((a, b) => a.value.localeCompare(b.value));
//     }
//     if (this.selectedCountry === constants.CANADA) {
//       // set key value pair for state options
//       this.setKeyValuePairForStates();
//
//       this.statesOptions = this.canadaStatesWithKeyValuePair.sort((a, b) => a.value.localeCompare(b.value));
//     }
//   };
//
//   setKeyValuePairForStates = () => {
//     // For USA
//     if (this.selectedCountry === constants.UNITED_STATES && !this.usaStatesWithKeyValuePair.length) {
//       this.usaStatesWithKeyValuePair = [];
//       usaStates.map((i) => this.usaStatesWithKeyValuePair.push({ key: i.name, value: i.name, code: i.code }));
//     }
//
//     // For Canada
//     if (this.selectedCountry === constants.CANADA && !this.canadaStatesWithKeyValuePair.length) {
//       this.canadaStatesWithKeyValuePair = [];
//       canadaStates.map((i) => this.canadaStatesWithKeyValuePair.push({ key: i.name, value: i.name, code: i.code }));
//     }
//   };
//
//   onStateSelect = async (selectedValue, index, rowIndex) => {
//     this.selectedState = selectedValue.value;
//   };
//
//   searchBtnClick = () => {
//     this.isLoading = true;
//     let emailStatus = "";
//     if (this.selectedEmailStatus) {
//       emailStatus = this.emailStatusOptions.find(status => status.value === this.selectedEmailStatus).key;
//     }
//     const data = {
//       labels: this.labelOptions.filter(l => l.isSelected),
//       name: this.contactName,
//       companyName: this.companyName,
//       email: this.contactEmail,
//       city: this.city,
//       state: this.selectedState,
//       country: this.selectedCountry,
//       marketingStatus: this.selectedMarketingStatus?.toLowerCase(),
//       emailStatus: emailStatus,
//     };
//     console.log({ data });
//     this.searchContactClick(data);
//   };
// }

import {Component, DestroyRef, inject, Input, OnInit, Signal, signal, WritableSignal} from '@angular/core';
import { AuthService } from "../../services/auth.service";
import { constants } from "src/app/helpers/constants";
import { ProspectingService } from "../../services/prospecting.service";
import { usaStates } from "src/assets/usaStates";
import { canadaStates } from "src/assets/canadaStates";
import { PageUiService } from "../../services/page-ui.service";
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';
import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'search-contact-modal-content',
  standalone: true,
  imports: [
    KexyButtonComponent,
    KexySelectDropdownComponent,
    FormsModule
  ],
  templateUrl: './search-contact-modal-content.component.html',
  styleUrl: './search-contact-modal-content.component.scss'
})
export class SearchContactModalContentComponent implements OnInit {
  // Inputs
  @Input() closeModal!: () => void;
  @Input() searchContactClick!: (data: any) => void;

  // Services
  private authService = inject(AuthService);
  private prospectingService = inject(ProspectingService);
  private pageUiService = inject(PageUiService);
  private destroyRef = inject(DestroyRef);

  // State signals
  isLoading = signal(false);
  labelOptions = signal<any[]>([]);
  statesOptions = signal<any[]>([]);
  selectedMarketingStatus = signal<string>('');
  selectedEmailStatus = signal<string>('');
  selectedCountry = signal<string>('');
  selectedState = signal<string>('');

  // Form values
  contactName = '';
  contactEmail = '';
  companyName = '';
  city = '';

  // Constants
  marketingStatusOptions = [...constants.MARKETING_STATUS_OPTIONS];
  emailStatusOptions = [...constants.EMAIL_STATUS_OPTIONS];
  countries = [...constants.COUNTRIES];
  usaStatesWithKeyValuePair: any[] = [];
  canadaStatesWithKeyValuePair: any[] = [];

  async ngOnInit() {
    const userData = this.authService.userTokenValue;

    // Load labels
    this.prospectingService.getLabels({ supplier_id: userData.supplier_id });

    // Subscribe to labels changes
    this.prospectingService.labels
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((labels) => {
        this.labelOptions.set(labels.map(i => ({
          key: i.label,
          value: i.label,
          itemBgColor: i.bg_color,
          itemTextColor: i.text_color,
          id: i.id,
          isSelected: false,
        })));

        this.setPreviousFilterValue();
      });
  }

  setPreviousFilterValue() {
    const filterData = this.prospectingService.searchContactFilterData;
    if (!filterData) return;

    // Labels
    if (filterData.labels?.length) {
      this.labelOptions.update(options =>
        options.map(option => ({
          ...option,
          isSelected: filterData.labels.some((l: any) => l.id === option.id)
        }))
      );
    }

    // Other fields
    if (filterData.name) this.contactName = filterData.name;
    if (filterData.city) this.city = filterData.city;
    if (filterData.companyName) this.companyName = filterData.companyName;
    if (filterData.email) this.contactEmail = filterData.email;

    if (filterData.country) {
      this.selectedCountry.set(filterData.country);
      this.getStatesList();
    }

    if (filterData.state) this.selectedState.set(filterData.state);

    if (filterData.emailStatus) {
      const status = this.emailStatusOptions.find(s => s.key === filterData.emailStatus);
      if (status) this.selectedEmailStatus.set(status.value);
    }

    if (filterData.marketingStatus) {
      this.selectedMarketingStatus.set(this.pageUiService.capitalizeFirstLetter(filterData.marketingStatus));
    }
  }

  handleMultiselectFunctionality(options: any[], selectedValue: any) {
    const index = options.findIndex(opt => opt.value === selectedValue.value);
    if (index > -1) {
      options[index].isSelected = !options[index].isSelected;
    }
  }

  onLabelSelect = (selectedValue: any) => {
    this.labelOptions.update(options => {
      const newOptions = [...options];
      this.handleMultiselectFunctionality(newOptions, selectedValue);
      return newOptions;
    });
  };

  onMarketingStatusSelect = (selectedValue: any) => {
    this.selectedMarketingStatus.set(selectedValue.value);
  };

  onEmailStatusSelect = (selectedValue: any) => {
    this.selectedEmailStatus.set(selectedValue.value);
  };

  onCountrySelect = (selectedValue: any) => {
    this.selectedCountry.set(selectedValue.value);
    this.getStatesList();
  };

  getStatesList() {
    if (this.selectedCountry() === constants.UNITED_STATES) {
      if (!this.usaStatesWithKeyValuePair.length) {
        this.usaStatesWithKeyValuePair = usaStates.map(i => ({
          key: i.name,
          value: i.name,
          code: i.code
        }));
      }
      this.statesOptions.set([...this.usaStatesWithKeyValuePair].sort((a, b) => a.value.localeCompare(b.value)));
    }
    else if (this.selectedCountry() === constants.CANADA) {
      if (!this.canadaStatesWithKeyValuePair.length) {
        this.canadaStatesWithKeyValuePair = canadaStates.map(i => ({
          key: i.name,
          value: i.name,
          code: i.code
        }));
      }
      this.statesOptions.set([...this.canadaStatesWithKeyValuePair].sort((a, b) => a.value.localeCompare(b.value)));
    }
  }

  onStateSelect = (selectedValue: any) => {
    this.selectedState.set(selectedValue.value);
  };

  searchBtnClick() {
    this.isLoading.set(true);

    const emailStatus = this.selectedEmailStatus()
      ? this.emailStatusOptions.find(status => status.value === this.selectedEmailStatus())?.key
      : '';

    const data = {
      labels: this.labelOptions().filter(l => l.isSelected),
      name: this.contactName,
      companyName: this.companyName,
      email: this.contactEmail,
      city: this.city,
      state: this.selectedState(),
      country: this.selectedCountry(),
      marketingStatus: this.selectedMarketingStatus()?.toLowerCase(),
      emailStatus: emailStatus,
    };

    this.searchContactClick(data);
  }
}
