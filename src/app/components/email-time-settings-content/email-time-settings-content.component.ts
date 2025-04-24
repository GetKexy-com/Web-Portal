import { Component, OnDestroy, OnInit } from "@angular/core";
import { NgbActiveOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import Swal from "sweetalert2";
import { constants } from "../../helpers/constants";
import { AuthService } from "../../services/auth.service";
import { DripCampaignService } from "../../services/drip-campaign.service";
import { Subscription } from "rxjs";
import { ProspectingService } from "../../services/prospecting.service";
import { PageUiService } from "../../services/page-ui.service";
import {KexyTabComponent} from '../kexy-tab/kexy-tab.component';
import {FormsModule} from '@angular/forms';
import {KexySelectDropdownComponent} from '../kexy-select-dropdown/kexy-select-dropdown.component';
import {ErrorMessageCardComponent} from '../error-message-card/error-message-card.component';
import {KexyToggleSwitchComponent} from '../kexy-toggle-switch/kexy-toggle-switch.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'email-time-settings-content',
  imports: [
    KexyTabComponent,
    FormsModule,
    KexySelectDropdownComponent,
    ErrorMessageCardComponent,
    KexyToggleSwitchComponent,
    CommonModule,
  ],
  templateUrl: './email-time-settings-content.component.html',
  styleUrl: './email-time-settings-content.component.scss'
})
export class EmailTimeSettingsContentComponent {
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
  runCampaignArray = [{ ...this.runCampaignFields }];
  dontRunCampaignFields = { day: "" };
  dontRunCampaignArray = [{ ...this.dontRunCampaignFields }];
  dripCampaignDropDownList = [];
  userData;
  dripCampaignTitles;
  dripCampaignList;
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
    // private route: ActivatedRoute,
  ) {
  }

  async ngOnInit() {
    this.dripCampaign = this.dripCampaignService.getDripCampaignContentPageData();
    this.dripCampaignId = this.dripCampaign.id;
    this.userData = this._authService.userTokenValue;

    await this.getSettings();
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

  setPreviousData = () => {
    if (this.enrollment) {
      this.setEnrollmentPreviousData();
    }

    if (this.settings) {
      console.log("settings", this.settings);

      const prospectUnenrollIfReplyIndex = this.settings.findIndex(r => r.settings_type === "prospect_un_enroll_if_reply");
      if (prospectUnenrollIfReplyIndex > -1) {
        let prospectUnenrollIfReplyData = this.settings[prospectUnenrollIfReplyIndex];
        this.prospectUnenrollIfReplyId = prospectUnenrollIfReplyData.id;
        this.prospectUnenrollIfReply = prospectUnenrollIfReplyData.settings_value[0].value;
      }

      const allowReenrollIndex = this.settings.findIndex(r => r.settings_type === "allow_re_enroll");
      if (allowReenrollIndex > -1) {
        let allowReenrollData = this.settings[allowReenrollIndex];
        this.allowReenrollId = allowReenrollData.id;
        this.allowContactsReenroll = allowReenrollData.settings_value[0].value;
      }

      const runTimeIndex = this.settings.findIndex(r => r.settings_type === "run_time");
      if (runTimeIndex > -1) {
        let runCampaignData = this.settings[runTimeIndex];
        this.runTimeId = runCampaignData.id;
        this.runCampaign = runCampaignData.settings_value[0].type;
        const campaignArray = runCampaignData.settings_value;
        campaignArray.forEach(campaign => {
          campaign["fromOptions"] = [...constants.EMAIL_SETTINGS_TIMES];
          campaign["toOptions"] = [...constants.EMAIL_SETTINGS_TIMES];
        });
        this.runCampaignArray = campaignArray;
      }

      const dontRunTimeIndex = this.settings.findIndex(r => r.settings_type === "do_not_run_time");
      if (dontRunTimeIndex > -1) {
        let dontRunCampaignData = this.settings[dontRunTimeIndex];
        this.dontRunTimeId = dontRunCampaignData.id;
        if (dontRunCampaignData.settings_value && dontRunCampaignData.settings_value.length) {
          this.dontRunCampaignArray = dontRunCampaignData.settings_value;
        }
      }

      const turnOffTimeIndex = this.settings.findIndex(r => r.settings_type === "turn_off_time");
      if (turnOffTimeIndex > -1) {
        let turnOffTimeData = this.settings[turnOffTimeIndex];
        this.turnOffTimeId = turnOffTimeData.id;
        if (turnOffTimeData.settings_value.length) {
          // this.changeScheduleCampaignOption();
          this.scheduleCampaignTurnOffAutomatically = true;
          const [date, time, period] = turnOffTimeData.settings_value[0].day.split(" ");
          if (date) this.scheduleCampaignTurnOffAutomaticallyDate = date;
          if (time && period) this.scheduleCampaignTurnOffAutomaticallyTime = `${time} ${period}`;
        }
      }

      const unenrollFromCampaignIndex = this.settings.findIndex(r => r.settings_type === "un_enroll_from_campaign");
      if (unenrollFromCampaignIndex > -1) {
        this.unenrollFromCampaignId = this.settings[unenrollFromCampaignIndex].id;
        let unenrollFromCampaignData = this.settings[unenrollFromCampaignIndex].settings_value;
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

    const enrolledIds = new Set(this.enrollList.map(enroll => enroll.kexy_label_id));
    const unEnrolledIds = new Set(this.unEnrollList.map(unEnroll => unEnroll.kexy_label_id));

    // **Remove Enrolled Items from Dropdowns**
    this.enrollList.forEach(enroll => {
      const index = this.enrollmentLabelOptions.findIndex(r => r.id === enroll.kexy_label_id);
      if (index > -1) Object.assign(enroll, this.enrollmentLabelOptions.splice(index, 1)[0]);

      const unenrollIndex = this.unenrollmentLabelOptions.findIndex(r => r.id === enroll.kexy_label_id);
      if (unenrollIndex > -1) this.unenrollmentLabelOptions.splice(unenrollIndex, 1);
    });

    // **Mark Unenrolled Items & Remove from Enrollment Dropdown**
    this.unEnrollList.forEach(unEnroll => {
      const index = this.unenrollmentLabelOptions.findIndex(r => r.id === unEnroll.kexy_label_id);
      if (index > -1) this.unenrollmentLabelOptions[index].isSelected = true;

      const enrollIndex = this.enrollmentLabelOptions.findIndex(r => r.id === unEnroll.kexy_label_id);
      if (enrollIndex > -1) this.enrollmentLabelOptions.splice(enrollIndex, 1);
    });

    // // **Repopulate Dropdowns When No Enrollments Exist**
    // this.enrollmentLabelOptions = this.enrollList.length
    //   ? this.enrollmentLabelOptions
    //   : this.labelOptions.filter(option => !unEnrolledIds.has(option.id)).map(option => ({ ...option }));
    //
    // this.unenrollmentLabelOptions = this.unEnrollList.length
    //   ? this.unenrollmentLabelOptions
    //   : this.labelOptions.filter(option => !enrolledIds.has(option.id)).map(option => ({ ...option }));
  };


  getAndSetDripCampaignTitleSubscription = async () => {
    await this.dripCampaignService.getAllDripCampaignTitle({ supplier_id: this.userData.supplier_id });

    this.dripCampaignTitlesSubscription = this.dripCampaignService.dripCampaignTitles.subscribe((dripCampaignTitles) => {
      this.dripCampaignTitles = dripCampaignTitles;
      this.dripCampaignTitles.map((i) => {
        i.value = i.title.length > 100 ? i.title.slice(0, 100) + "..." : i.title;
      });
    });
  };

  getDripCampaignsApiCall = async () => {
    const postData = {
      page: 1,
      supplier_id: this.userData.supplier_id,
      limit: 1000,
      get_total_count: false,
    };
    this.dripCampaignList = await this.dripCampaignService.getListOfDripCampaignsWithoutPagination(postData, true);
    if (this.dripCampaignList.length) {
      this.dripCampaignList = this.dripCampaignList.filter(i => {
        return (i.status === constants.PUBLISHED || i.status === constants.ACTIVE);
      });
    }

    if (this.dripCampaignList.length) {
      this.dripCampaignList.forEach(cam => {
        this.dripCampaignDropDownList.push({
          key: cam.id,
          value: this.getCampaignTitle(cam.drip_campaign_detail.drip_campaign_title_id),
          id: cam.id,
          isSelected: false,
        });
      });
    } else {
      this.dripCampaignDropDownList = [];
    }
  };

  getCampaignTitle = (title_id) => {
    const index = this.dripCampaignTitles && this.dripCampaignTitles.findIndex(i => i.id.toString() === title_id.toString());
    if (index < 0) return;

    return this.dripCampaignTitles[index].title;
  };

  getSettings = async () => {
    const postData = {
      supplier_id: this.userData.supplier_id,
      drip_campaign_id: this.dripCampaignId,
    };
    const data = await this.dripCampaignService.getSettings(postData);
    if (data && (data["settings"] || data["enrollment_triggers"])) {
      this.settings = data["settings"];
      this.enrollment = data["enrollment_triggers"];
    }
  };

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
    this.runCampaignArray.push({ ...this.runCampaignFields });
  };

  removeRunCampaign = (data) => {
    const index = this.runCampaignArray.indexOf(data);
    if (index > -1) {
      this.runCampaignArray.splice(index, 1);
    }
  };

  addNewDontRunCampaign = () => {
    this.dontRunCampaignArray.push({ ...this.dontRunCampaignFields });
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
      supplier_id: this.userData.supplier_id,
      settings: [
        {
          ...(this.runTimeId && { id: this.runTimeId }),
          settings_type: "run_time",
          settings_value: this.runCampaignArray.map(item => {
            return {
              type: this.runCampaign,
              day: item.day,
              from: this.runCampaign === "specific_time" ? item.from : null,
              to: this.runCampaign === "specific_time" ? item.to : null,
            };
          }),
        },
        {
          ...(this.dontRunTimeId && { id: this.dontRunTimeId }),
          settings_type: "do_not_run_time",
          settings_value: this.dontRunCampaignArray
            .filter(item => item.day)
            .map(item => ({ day: item.day })),
        },
        {
          ...(this.turnOffTimeId && { id: this.turnOffTimeId }),
          settings_type: "turn_off_time",
          settings_value: this.scheduleCampaignTurnOffAutomatically ? [{ day: `${this.scheduleCampaignTurnOffAutomaticallyDate} ${this.scheduleCampaignTurnOffAutomaticallyTime}` }] : [],
        },
        {
          ...(this.unenrollFromCampaignId && { id: this.unenrollFromCampaignId }),
          settings_type: "un_enroll_from_campaign",
          settings_value: this.unenrollContactsFromOtherCampaign ? [
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
      await this.getSettings();
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
      drip_campaign_id: this.dripCampaignId,
      supplier_id: this.userData.supplier_id,
      list_id: list.kexy_label_id,
    };

    try {
      await this.dripCampaignService.removeListFromCampaign(postData);
      await this.getSettings();
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
      this.unenrollmentLabelOptions.push({ ...selectedValue });
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
      this.enrollmentLabelOptions.push({ ...selectedValue });
    }
  };

  changeAllowContactsReenrollOption = () => {
    this.allowContactsReenroll = !this.allowContactsReenroll;
  };

  labelOptions = [];
  getAndSetLabels = async () => {
    // Get Label
    const getLabelApiPostData = {
      supplier_id: this.userData.supplier_id,
      page: 1,
      limit: 1000,
      get_total_count: true,
    };
    await this.prospectingService.getLabelsOnly(getLabelApiPostData);

    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.labelsOnly.subscribe((labels) => {
      // Set label dropdown options
      this.enrollmentLabelOptions = [];
      this.unenrollmentLabelOptions = [];
      this.labelOptions = [];
      labels.forEach(i => {
        const labelObj = {
          key: i.label,
          value: i.label,
          itemBgColor: i.bg_color,
          itemTextColor: i.text_color,
          id: i.id,
          isSelected: false,
        };
        this.enrollmentLabelOptions.push({ ...labelObj });
        this.unenrollmentLabelOptions.push({ ...labelObj });
        this.labelOptions.push({ ...labelObj });
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
    const previousEnrollListIds = this.enrollList.map(i => i.kexy_label_id);

    const postData = {
      drip_campaign_id: this.dripCampaignId,
      supplier_id: this.userData.supplier_id,
      enroll_list_ids: [...newEnrollListIds, ...previousEnrollListIds],
      un_enroll_list_ids: this.unenrollmentLabelOptions.filter(i => i.isSelected).map(i => i.id),
      other_settings: [
        {
          ...(this.prospectUnenrollIfReplyId && { id: this.prospectUnenrollIfReplyId }),
          settings_type: "prospect_un_enroll_if_reply",
          settings_value: [
            {
              value: this.prospectUnenrollIfReply,
            },
          ],
        },
        {
          ...(this.allowReenrollId && { id: this.allowReenrollId }),
          settings_type: "allow_re_enroll",
          settings_value: [
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
      await this.getSettings();
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
