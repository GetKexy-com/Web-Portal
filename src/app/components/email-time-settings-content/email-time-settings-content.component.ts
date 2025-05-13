import {Component, OnDestroy, OnInit} from "@angular/core";
import {NgbActiveOffcanvas} from "@ng-bootstrap/ng-bootstrap";
import Swal from "sweetalert2";
import {constants} from "../../helpers/constants";
import {AuthService} from "../../services/auth.service";
import {DripCampaignService} from "../../services/drip-campaign.service";
import {Subscription} from "rxjs";
import {ProspectingService} from "../../services/prospecting.service";
import {PageUiService} from "../../services/page-ui.service";
import {KexyTabComponent} from '../kexy-tab/kexy-tab.component';
import {FormsModule} from '@angular/forms';
import {KexySelectDropdownComponent} from '../kexy-select-dropdown/kexy-select-dropdown.component';
import {KexyToggleSwitchComponent} from '../kexy-toggle-switch/kexy-toggle-switch.component';
import {CommonModule} from '@angular/common';
import {ListDetail} from '../../models/List';
import {DripCampaign} from '../../models/DripCampaign';

@Component({
  selector: 'email-time-settings-content',
  imports: [
    KexyTabComponent,
    FormsModule,
    KexySelectDropdownComponent,
    KexyToggleSwitchComponent,
    CommonModule,
  ],
  templateUrl: './email-time-settings-content.component.html',
  styleUrl: './email-time-settings-content.component.scss'
})
export class EmailTimeSettingsContentComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  isWaitingFlag: boolean = true;
  submitted: boolean = false;
  dayOptions = constants.EMAIL_SETTINGS_DAYS;
  startTimeOptions = [...constants.EMAIL_SETTINGS_TIMES];
  endTimeOptions = [...constants.EMAIL_SETTINGS_TIMES];
  scheduleCampaignTurnOffAutomatically = false;
  unenrollContactsFromOtherCampaign = false;
  runCampaignFields = {
    day: constants.EVERYDAY,
    from: "",
    to: "",
    fromOptions: [...constants.EMAIL_SETTINGS_TIMES],
    toOptions: [...constants.EMAIL_SETTINGS_TIMES],
  };
  runCampaignArray = [{...this.runCampaignFields}];
  dontRunCampaignFields = {day: ""};
  dontRunCampaignArray = [{...this.dontRunCampaignFields}];
  dripCampaignDropDownList = [];
  userData;
  dripCampaignTitles;
  dripCampaignList: DripCampaign[];
  selectedDripCampaign = "";
  dripCampaignId;
  settings;
  enrollment;
  runCampaign = constants.ANYTIME;
  unenrollCampaign = "unenrollFromAll";
  scheduleCampaignTurnOffAutomaticallyDate = "";
  scheduleCampaignTurnOffAutomaticallyTime = "";
  runTimeId;
  dontRunTimeId;
  turnOffTimeId;
  unenrollFromCampaignId;
  dripCampaign;
  constants = constants;
  enrollList;
  unEnrollList;
  enrollmentLabelOptions = [];
  unenrollmentLabelOptions = [];
  prospectUnenrollIfReply: boolean = false;
  prospectUnenrollIfReplyId;
  allowReenrollId;
  allowContactsReenroll = false;
  dripCampaignTitlesSubscription: Subscription;
  contactLabelsSubscription: Subscription;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    public _authService: AuthService,
    public dripCampaignService: DripCampaignService,
    public prospectingService: ProspectingService,
    public pageUiService: PageUiService,
  ) {
  }

  async ngOnInit() {
    this.setInitialData();

    await this.getAndSetLabels();
    await this.getAndSetDripCampaignTitleSubscription();
    await this.getDripCampaignsApiCall();

    this.setPreviousData();
    this.isWaitingFlag = false;
  }

  ngOnDestroy() {
    if (this.dripCampaignTitlesSubscription) this.dripCampaignTitlesSubscription.unsubscribe();
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
  }

  setInitialData = () => {
    this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    console.log(this.dripCampaign);
    this.dripCampaignId = this.dripCampaign.id;
    this.settings = this.dripCampaign.settings;
    this.enrollment = this.dripCampaign.lists;
    this.userData = this._authService.userTokenValue;
  }

  setPreviousData = () => {
    if (this.enrollment) {
      this.setEnrollmentPreviousData();
    }

    if (this.settings?.length) {
      console.log("settings", this.settings);

      const prospectUnenrollIfReplyIndex = this.settings.findIndex(r => r.settingsType === "prospect_un_enroll_if_reply");
      if (prospectUnenrollIfReplyIndex > -1) {
        let prospectUnenrollIfReplyData = this.settings[prospectUnenrollIfReplyIndex];
        this.prospectUnenrollIfReplyId = prospectUnenrollIfReplyData.id;

        if (typeof prospectUnenrollIfReplyData.settingsValue === "string") {
          prospectUnenrollIfReplyData.settingsValue = JSON.parse(prospectUnenrollIfReplyData.settingsValue);
        }
        this.prospectUnenrollIfReply = prospectUnenrollIfReplyData.settingsValue[0].value;
      }

      const allowReenrollIndex = this.settings.findIndex(r => r.settingsType === "allow_re_enroll");
      if (allowReenrollIndex > -1) {
        let allowReenrollData = this.settings[allowReenrollIndex];
        this.allowReenrollId = allowReenrollData.id;
        this.allowContactsReenroll = allowReenrollData.settingsValue[0].value;
      }

      const runTimeIndex = this.settings.findIndex(r => r.settingsType === "run_time");
      if (runTimeIndex > -1) {
        let runCampaignData = this.settings[runTimeIndex];
        this.runTimeId = runCampaignData.id;
        this.runCampaign = runCampaignData.settingsValue[0].type;
        const campaignArray = runCampaignData.settingsValue;
        console.log({campaignArray})
        campaignArray.forEach(campaign => {
          campaign["fromOptions"] = [...constants.EMAIL_SETTINGS_TIMES];
          campaign["toOptions"] = [...constants.EMAIL_SETTINGS_TIMES];
        });
        this.runCampaignArray = campaignArray;
      }

      const dontRunTimeIndex = this.settings.findIndex(r => r.settingsType === "do_not_run_time");
      if (dontRunTimeIndex > -1) {
        let dontRunCampaignData = this.settings[dontRunTimeIndex];
        this.dontRunTimeId = dontRunCampaignData.id;
        if (dontRunCampaignData.settingsValue && dontRunCampaignData.settingsValue.length) {
          this.dontRunCampaignArray = dontRunCampaignData.settingsValue;
        }
      }

      const turnOffTimeIndex = this.settings.findIndex(r => r.settingsType === "turn_off_time");
      if (turnOffTimeIndex > -1) {
        let turnOffTimeData = this.settings[turnOffTimeIndex];
        this.turnOffTimeId = turnOffTimeData.id;
        if (turnOffTimeData.settingsValue.length) {
          this.scheduleCampaignTurnOffAutomatically = true;
          const [date, time, period] = turnOffTimeData.settingsValue[0].day.split(" ");
          if (date) this.scheduleCampaignTurnOffAutomaticallyDate = date;
          if (time && period) this.scheduleCampaignTurnOffAutomaticallyTime = `${time} ${period}`;
        }
      }

      const unenrollFromCampaignIndex = this.settings.findIndex(r => r.settingsType === "un_enroll_from_campaign");
      if (unenrollFromCampaignIndex > -1) {
        this.unenrollFromCampaignId = this.settings[unenrollFromCampaignIndex].id;
        let unenrollFromCampaignData = this.settings[unenrollFromCampaignIndex].settingsValue;
        if (unenrollFromCampaignData.length) {
          // this.changeUnenrollContactOption();
          this.unenrollContactsFromOtherCampaign = true;
          const unenrollObj = unenrollFromCampaignData[0];
          if (unenrollObj?.unenroll === "all_other_campaigns") {
            this.unenrollCampaign = "unenrollFromAll";
          } else {
            this.unenrollCampaign = "unenrollFromSpecific";
          }

          if (Array.isArray(unenrollObj?.unenroll)) {
            unenrollObj?.unenroll.forEach((campaign) => {
              const campaignIndex = this.dripCampaignDropDownList.findIndex(d => d.id === campaign);
              if (campaignIndex > -1) {
                this.dripCampaignDropDownList[campaignIndex].isSelected = true;
              }
            });
          }
        }
      }
    }
  };

  setEnrollmentPreviousData = () => {
    this.enrollList = this.enrollment.filter(r => r.type === "enroll_list");
    this.unEnrollList = this.enrollment.filter(r => r.type === "un_enroll_list");

    // **Remove Enrolled Items from Dropdowns**
    this.enrollList.forEach(enroll => {
      const index = this.enrollmentLabelOptions.findIndex(r => r.id === enroll.list.id);
      if (index > -1) Object.assign(enroll, this.enrollmentLabelOptions.splice(index, 1)[0]);

      const unenrollIndex = this.unenrollmentLabelOptions.findIndex(r => r.id === enroll.list.id);
      if (unenrollIndex > -1) this.unenrollmentLabelOptions.splice(unenrollIndex, 1);
    });

    // **Mark Unenrolled Items & Remove from Enrollment Dropdown**
    this.unEnrollList.forEach(unEnroll => {
      const index = this.unenrollmentLabelOptions.findIndex(r => r.id === unEnroll.list.id);
      if (index > -1) this.unenrollmentLabelOptions[index].isSelected = true;

      const enrollIndex = this.enrollmentLabelOptions.findIndex(r => r.id === unEnroll.list.id);
      if (enrollIndex > -1) this.enrollmentLabelOptions.splice(enrollIndex, 1);
    });
  };


  getAndSetDripCampaignTitleSubscription = async () => {
    await this.dripCampaignService.getAllDripCampaignTitle({supplier_id: this.userData.supplier_id});

    this.dripCampaignTitlesSubscription = this.dripCampaignService.dripCampaignTitles.subscribe((dripCampaignTitles) => {
      this.dripCampaignTitles = dripCampaignTitles;
      this.dripCampaignTitles.map((i) => {
        i.value = i.title.length > 100 ? i.title.slice(0, 100) + "..." : i.title;
      });
    });
  };

  getDripCampaignsApiCall = async () => {
    this.dripCampaignList = await this.dripCampaignService.getListOfDripCampaignsWithoutPagination(true);
    if (this.dripCampaignList.length) {
      this.dripCampaignList = this.dripCampaignList.filter(i => {
        return (i.status === constants.PUBLISHED || i.status === constants.ACTIVE);
      });
    }

    if (this.dripCampaignList.length) {
      this.dripCampaignList.forEach((cam: DripCampaign) => {
        this.dripCampaignDropDownList.push({
          key: cam.id,
          value: cam.details.title.title,
          id: cam.id,
          isSelected: false,
        });
      });
    } else {
      this.dripCampaignDropDownList = [];
    }
  };

  // getCampaignTitle = (title_id) => {
  //   const index = this.dripCampaignTitles && this.dripCampaignTitles.findIndex(i => i.id.toString() === title_id.toString());
  //   if (index < 0) return;
  //
  //   return this.dripCampaignTitles[index].title;
  // };

  onDaySelect = (day, index = null, rowIndex = null) => {
    console.log(rowIndex);
    this.runCampaignArray[rowIndex].day = day.value;
  };

  onStartTimeSelect = (time, index = null, rowIndex = null) => {
    const data = this.runCampaignArray[rowIndex];
    data.from = time.value;

    if (time.value) {
      const timeIndex = data.fromOptions.findIndex(i => i.value === time.value);
      if (timeIndex > -1) {
        data.toOptions = data.toOptions.slice(timeIndex + 1);
      }
    } else {
      data.toOptions = [...constants.EMAIL_SETTINGS_TIMES];
    }
  };

  onEndTimeSelect = (time, index = null, rowIndex = null) => {
    const data = this.runCampaignArray[rowIndex];
    data.to = time.value;

    if (!data.from) {
      if (time.value) {
        const timeIndex = data.toOptions.findIndex(i => i.value === time.value);
        if (timeIndex > -1) {
          data.fromOptions = data.fromOptions.slice(0, timeIndex);
        }
      } else {
        data.fromOptions = [...constants.EMAIL_SETTINGS_TIMES];
      }
    }
  };

  onDripCampaignSelect = async (selectedValue, index, rowIndex) => {
    selectedValue.isSelected = !selectedValue.isSelected;
  };

  onScheduleCampaignTurnOffAutomaticallyTime = (time, index = null, rowIndex = null) => {
    this.scheduleCampaignTurnOffAutomaticallyTime = time.value;
  };

  changeScheduleCampaignOption = () => {
    this.scheduleCampaignTurnOffAutomatically = !this.scheduleCampaignTurnOffAutomatically;
  };

  changeUnenrollContactOption = () => {
    this.unenrollContactsFromOtherCampaign = !this.unenrollContactsFromOtherCampaign;
  };

  addNewRunCampaign = () => {
    this.runCampaignArray.push({...this.runCampaignFields});
  };

  removeRunCampaign = (data) => {
    const index = this.runCampaignArray.indexOf(data);
    if (index > -1) {
      this.runCampaignArray.splice(index, 1);
    }
  };

  addNewDontRunCampaign = () => {
    this.dontRunCampaignArray.push({...this.dontRunCampaignFields});
  };

  removeDontRunCampaign = (data) => {
    const index = this.dontRunCampaignArray.indexOf(data);
    if (index > -1) {
      this.dontRunCampaignArray.splice(index, 1);
    }
  };

  handleSubmitTiming = async () => {
    this.submitted = true;

    const postData = {
      drip_campaign_id: this.dripCampaignId,
      companyId: this.userData.supplier_id,
      settings: [
        {
          ...(this.runTimeId && {id: this.runTimeId}),
          dripCampaignId: this.dripCampaignId,
          companyId: this.userData.supplier_id,
          settingsType: "run_time",
          settingsValue: this.runCampaignArray.map(item => {
            return {
              type: this.runCampaign,
              day: item.day,
              from: this.runCampaign === "specific_time" ? item.from : null,
              to: this.runCampaign === "specific_time" ? item.to : null,
            };
          }),
        },
        {
          ...(this.dontRunTimeId && {id: this.dontRunTimeId}),
          dripCampaignId: this.dripCampaignId,
          companyId: this.userData.supplier_id,
          settingsType: "do_not_run_time",
          settingsValue: this.dontRunCampaignArray
            .filter(item => item.day)
            .map(item => ({day: item.day})),
        },
        {
          ...(this.turnOffTimeId && {id: this.turnOffTimeId}),
          dripCampaignId: this.dripCampaignId,
          companyId: this.userData.supplier_id,
          settingsType: "turn_off_time",
          settingsValue: this.scheduleCampaignTurnOffAutomatically ? [{day: `${this.scheduleCampaignTurnOffAutomaticallyDate} ${this.scheduleCampaignTurnOffAutomaticallyTime}`}] : [],
        },
        {
          ...(this.unenrollFromCampaignId && {id: this.unenrollFromCampaignId}),
          dripCampaignId: this.dripCampaignId,
          companyId: this.userData.supplier_id,
          settingsType: "un_enroll_from_campaign",
          settingsValue: this.unenrollContactsFromOtherCampaign ? [
            {
              unenroll: this.unenrollCampaign === "unenrollFromAll" ? "all_other_campaigns" : this.dripCampaignDropDownList
                .filter(i => i.isSelected)
                .map(i => i.id),
            },
          ] : [],
        },
      ],
    };

    this.isLoading = true;
    try {
      await this.dripCampaignService.updateSettings(postData);
      this.setInitialData();
      await this.getAndSetLabels();
      this.setPreviousData();
      Swal.fire("Success", "Settings saved successfully", "success");

    } catch (e) {
      await Swal.fire({
        title: `Error`,
        text: e.message,
        icon: "warning",
      });
    } finally {
      this.isLoading = false;
    }
  };

  selectedSettingsType = constants.ENROLLMENT_TRIGGERS;
  setSelectedSettingsType = (value) => {
    this.selectedSettingsType = value;
  };

  removeActiveList = async (list) => {
    console.log(list);
    const isConfirm = await Swal.fire({
      title: "Are you sure?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, remove!",
    });

    if (isConfirm.dismiss) {
      return;
    }

    const swal = this.pageUiService.showSweetAlertLoading();
    swal.showLoading();

    const postData = {
      list_id: list.list.id,
      dripCampaignId: this.dripCampaignId,
      companyId: this.userData.supplier_id,
    };

    try {
      await this.dripCampaignService.removeListFromCampaign(postData);
      this.setInitialData();
      await this.getAndSetLabels();
      this.setPreviousData();

    } catch (e) {
      Swal.fire("Error", e.message);

    } finally {
      swal.close();
    }
  };

  handleMultiselectFunctionality = (options, selectedValue) => {
    const i = options.indexOf(selectedValue);
    if (i > -1) {
      options[i].isSelected = !options[i].isSelected;
    }
  };

  onEnrollmentLabelSelect = (selectedValue, index = null, rowIndex = null) => {
    this.handleMultiselectFunctionality(this.enrollmentLabelOptions, selectedValue);

    // If the item is selected, remove it from unenrollmentLabelOptions
    if (selectedValue.isSelected) {
      this.removeFromUnenrollmentLabelOptions(selectedValue);
    } else {
      // If the item is deselected, you might want to add it back to unenrollmentLabelOptions (if needed)
      this.addBackToUnenrollmentLabelOptions(selectedValue);
    }
  };

  removeFromUnenrollmentLabelOptions = (selectedValue) => {
    const index = this.unenrollmentLabelOptions.findIndex(r => r.id === selectedValue.id);
    if (index > -1) {
      this.unenrollmentLabelOptions.splice(index, 1);
    }
  };

  addBackToUnenrollmentLabelOptions = (selectedValue) => {
    const index = this.unenrollmentLabelOptions.findIndex(r => r.id === selectedValue.id);
    if (index === -1) {
      this.unenrollmentLabelOptions.push({...selectedValue});
    }
  };

  changeProspectUnenrollIfReply = () => {
    this.prospectUnenrollIfReply = !this.prospectUnenrollIfReply;
  };

  onUnenrollmentLabelSelect = (selectedValue, index = null, rowIndex = null) => {
    this.handleMultiselectFunctionality(this.unenrollmentLabelOptions, selectedValue);

    // If the item is selected, remove it from enrollmentLabelOptions
    if (selectedValue.isSelected) {
      this.removeFromEnrollmentLabelOptions(selectedValue);
    } else {
      // If the item is deselected, you might want to add it back to enrollmentLabelOptions (if needed)
      this.addBackToEnrollmentLabelOptions(selectedValue);
    }
  };

  removeFromEnrollmentLabelOptions = (selectedValue) => {
    const index = this.enrollmentLabelOptions.findIndex(r => r.id === selectedValue.id);
    if (index > -1) {
      this.enrollmentLabelOptions.splice(index, 1);
    }
  };

  addBackToEnrollmentLabelOptions = (selectedValue) => {
    const index = this.enrollmentLabelOptions.findIndex(r => r.id === selectedValue.id);
    if (index === -1) {
      this.enrollmentLabelOptions.push({...selectedValue});
    }
  };

  changeAllowContactsReenrollOption = () => {
    this.allowContactsReenroll = !this.allowContactsReenroll;
  };

  labelOptions = [];
  getAndSetLabels = async () => {
    // Get Label
    const getLabelApiPostData = {
      companyId: this.userData.supplier_id,
      page: 1,
      limit: 1000,
    };
    await this.prospectingService.getLabelsOnly(getLabelApiPostData);

    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.labelsOnly.subscribe((labels: ListDetail[]) => {
      // Set label dropdown options
      this.enrollmentLabelOptions = [];
      this.unenrollmentLabelOptions = [];
      this.labelOptions = [];
      labels.forEach(i => {
        const labelObj = {
          key: i.label,
          value: i.label,
          itemBgColor: i.bgColor,
          itemTextColor: i.textColor,
          id: i.id,
          isSelected: false,
        };
        this.enrollmentLabelOptions.push({...labelObj});
        this.unenrollmentLabelOptions.push({...labelObj});
        this.labelOptions.push({...labelObj});
      });
    });
  };

  isEmptyEnrollList = false;
  handleSubmitEnrollmentTriggers = async () => {
    this.submitted = true;
    // const enrollListIds = this.enrollmentLabelOptions.filter(i => i.isSelected).map(i => i.id);
    // if (!enrollListIds.length && !this.enrollList.length) {
    //   this.isEmptyEnrollList = true;
    //   return;
    // }
    // this.isEmptyEnrollList = false;

    const newEnrollListIds = this.enrollmentLabelOptions.filter(i => i.isSelected).map(i => i.id);
    const previousEnrollListIds = this.enrollList.map(i => i.list.id);

    const postData = {
      drip_campaign_id: this.dripCampaignId,
      companyId: this.userData.supplier_id,
      enrollListIds: [...newEnrollListIds, ...previousEnrollListIds],
      unEnrollListIds: this.unenrollmentLabelOptions.filter(i => i.isSelected).map(i => i.id),
      otherSettings: [
        {
          ...(this.prospectUnenrollIfReplyId && {id: this.prospectUnenrollIfReplyId}),
          dripCampaignId: this.dripCampaignId,
          companyId: this.userData.supplier_id,
          settingsType: "prospect_un_enroll_if_reply",
          settingsValue: [
            {
              value: this.prospectUnenrollIfReply,
            },
          ],
        },
        {
          ...(this.allowReenrollId && {id: this.allowReenrollId}),
          dripCampaignId: this.dripCampaignId,
          companyId: this.userData.supplier_id,
          settingsType: "allow_re_enroll",
          settingsValue: [
            {
              value: this.allowContactsReenroll,
            },
          ],
        },
      ],
    };

    this.isLoading = true;
    try {
      await this.dripCampaignService.enrollmentTriggers(postData);
      this.setInitialData();
      await this.getAndSetLabels();
      this.setPreviousData();

      if (this.dripCampaign.status === constants.ACTIVE && newEnrollListIds.length) {
        const postData = {
          drip_campaign_id: this.dripCampaignId,
          supplier_id: this.userData.supplier_id,
          notify: "false",
        };
        await this.dripCampaignService.activateDripCampaign(postData);
      }

      Swal.fire("Success", "Settings saved successfully", "success");

    } catch (e) {
      await Swal.fire({
        title: `Error`,
        text: e.message,
        icon: "warning",
      });
    } finally {
      this.isLoading = false;
    }
  };
}
