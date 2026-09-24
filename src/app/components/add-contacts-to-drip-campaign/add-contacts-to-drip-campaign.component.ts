import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveOffcanvas, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { ProspectingService } from '../../services/prospecting.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { constants } from 'src/app/helpers/constants';
import { DripCampaignService } from '../../services/drip-campaign.service';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { CommonModule } from '@angular/common';
import { Contact } from '../../models/Contact';
import { KexyButtonComponent } from '../kexy-button/kexy-button.component';

@Component({
  selector: 'add-contacts-to-drip-campaign',
  imports: [FormsModule, KexySelectDropdownComponent, ErrorMessageCardComponent, CommonModule, KexyButtonComponent],
  templateUrl: './add-contacts-to-drip-campaign.component.html',
  styleUrl: './add-contacts-to-drip-campaign.component.scss',
})
export class AddContactsToDripCampaignComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  labels = [];
  userData;
  dripCampaignDropDownList = [];
  dripCampaignList;
  dripCampaignTitles;
  selectedDripCampaign = '';
  addToDripCampaignId;
  submitted: boolean = false;
  selectedContacts;
  selectedLabelIds = [];
  contactLabelsSubscription: Subscription;
  dripCampaignTitlesSubscription: Subscription;

  constructor(
    public activeCanvas: NgbActiveOffcanvas,
    private _authService: AuthService,
    private prospectingService: ProspectingService,
    private dripCampaignService: DripCampaignService,
    private route: ActivatedRoute,
  ) {
  }

  async ngOnInit() {
    this.userData = this._authService.userTokenValue;
    this.selectedContacts = this.prospectingService.selectedContactsInContactsPage;
    console.log(this.selectedContacts);


    this.getDripCampaignsApiCall();
  }

  ngOnDestroy() {
    if (this.contactLabelsSubscription) this.contactLabelsSubscription.unsubscribe();
    if (this.dripCampaignTitlesSubscription) this.dripCampaignTitlesSubscription.unsubscribe();
  }

  getAndSetLabels = async () => {
    // Get Label
    const getLabelApiPostData = {
      companyId: this.userData.supplier_id,
      page: this.prospectingService.manageListCurrentPage || 1,
      limit: this.prospectingService.manageListLimit || 100,
    };
    await this.prospectingService.getLabelsOnly(getLabelApiPostData);

    // Set Label Subscription
    this.contactLabelsSubscription = this.prospectingService.labelsOnly.subscribe((labels) => {
      // Set label dropdown options
      this.labels = labels;
    });
  };

  getDripCampaignsApiCall = async () => {
    // this.isLoading = true;
    // Fresh, not the cached list: whether a campaign is COMPLETE decides whether picking
    // it warns that it will be reactivated, and a stale "active" would skip that warning.
    this.dripCampaignList =
      await this.dripCampaignService.getListOfDripCampaignsWithoutPagination(true);
    // this.isLoading = false;
    if (this.dripCampaignList.length) {
      // COMPLETE is offered too: adding prospects to it reactivates it (confirmed on pick).
      this.dripCampaignList = this.dripCampaignList.filter((i) => {
        return i.status === constants.ACTIVE || i.status === constants.PAUSE || i.status === constants.COMPLETE;
      });
    }

    this.dripCampaignList.forEach((cam) => {
      const completed = this.dripCampaignService.isCompleted(cam);
      this.dripCampaignDropDownList.push({
        key: cam.id,
        id: cam.id,
        lists: cam.lists,
        value: completed ? `${cam.details.title.title} (Completed)` : cam.details.title.title,
        campaign: cam,
      });
    });

    if (this.addToDripCampaignId) {
      const index = this.dripCampaignDropDownList.findIndex(
        (d) => d.id.toString() === this.addToDripCampaignId,
      );
      if (index > -1) {
        this.onDripCampaignSelect(this.dripCampaignDropDownList[index]);
      }
    }
  };

  // getCampaignTitle = (title_id) => {
  //   const index = this.dripCampaignTitles && this.dripCampaignTitles.findIndex(i => i.id.toString() === title_id.toString());
  //   if (index < 0) return;
  //
  //   return this.dripCampaignTitles[index].title;
  // };

  getAndSetDripCampaignTitleSubscription = async () => {
    await this.dripCampaignService.getAllDripCampaignTitle({
      supplier_id: this.userData.supplier_id,
    });

    this.dripCampaignTitlesSubscription = this.dripCampaignService.dripCampaignTitles.subscribe(
      (dripCampaignTitles) => {
        this.dripCampaignTitles = dripCampaignTitles;
        this.dripCampaignTitles.map((i) => {
          i.value = i.title.length > 100 ? i.title.slice(0, 100) + '...' : i.title;
        });
      },
    );
  };

  labelOptions = [];
  selectedLabel: object;

  onDripCampaignSelect = async (selectedValue, index = 0, rowIndex = 0) => {
    console.log('labels', selectedValue);
    // Adding prospects to a COMPLETED drip reactivates it, so say so the moment it is
    // picked. Declining leaves the previous choice (or none) in place.
    if (
      selectedValue?.id !== this.selectedDripCampaign?.['id'] &&
      this.dripCampaignService.isCompleted(selectedValue?.campaign) &&
      !(await this.dripCampaignService.confirmReactivation('prospects'))
    ) {
      return;
    }
    this.labels = [];
    this.selectedLabel = null;
    this.selectedDripCampaign = selectedValue;
    this.addToDripCampaignId = selectedValue.id;
    selectedValue.lists.forEach((l) => {
      this.labels.push(l.list);
    });

    this.labelOptions = [];
    this.labels.forEach(i => {
      if (!i.contactListCount) {
        const labelObj = {
          key: i.label,
          value: i.label,
          itemBgColor: i.bgColor,
          itemTextColor: i.textColor,
          id: i.id,
        };
        this.labelOptions.push(labelObj);
      }
    });

    console.log(this.labels);
  };

  onLabelSelect = (selectedValue, index = null, rowIndex = null) => {
    if (!selectedValue.key) {
      this.selectedLabel = null;
      return;
    }
    this.selectedLabel = selectedValue;
    console.log(this.selectedContacts.listIds);
    // id need to be as string as we save it as string in DB.
    this.selectedLabelIds = [selectedValue.id.toString()];

  };

  setAndGetEditMultipleContactApiPayload = () => {
    const contacts = this.selectedContacts.map((c: Contact) => {
      return Contact.contactPostDto(c);
    });
    return {
      companyId: this.userData.supplier_id,
      contacts,
      listIds: this.selectedLabelIds,
    };
  };

  getContactsApiPayload = () => {
    return {
      companyId: this.userData.supplier_id,
      dripCampaignId: '',
      listIds: [],
      contactName: '',
      companyName: '',
      jobTitle: '',
      emailStatus: '',
      marketingStatus: '',
      city: '',
      state: '',
      country: '',
      page: this.prospectingService.brandContactCurrentPage,
      limit: this.prospectingService.brandContactContactLimit,
      sortBy: '',
      sortType: '',
    };
  };

  handleSubmit = async () => {
    this.submitted = true;
    // this.setSelectedLabelIds();

    // Validation
    if (!this.selectedDripCampaign['value'] || !this.selectedLabel) return;


    // A completed drip is reactivated after the prospects are added, so it must pass the
    // Activate button's checks first — before anything is written.
    const campaign = this.selectedDripCampaign['campaign'];
    const reactivating = this.dripCampaignService.isCompleted(campaign);
    if (reactivating) {
      const blocker = this.dripCampaignService.getActivationBlocker({
        emailCount: campaign.emails?.length ?? 0,
        enrollListCount: (campaign.lists ?? []).filter((l) => l.type === 'enroll_list').length,
        smtpId: this.dripCampaignService.getSelectedSmtpId(campaign),
      });
      if (blocker) {
        await Swal.fire({
          title: `Error`,
          text: `${blocker.message} Open the campaign to fix this, then add the contacts again.`,
          icon: 'warning',
        });
        return;
      }
    }

    const getContactApiPostData = this.getContactsApiPayload();
    this.isLoading = true;
    try {
      let contacts: Contact[] = this.selectedContacts;
      console.log(contacts);

      // Edit Contact(s)
      const postData = {
        companyId: this.userData.supplier_id,
        listIds: this.selectedLabelIds,
        contacts: this.selectedContacts,
      };
      console.log(postData);
      await this.prospectingService.assignList(postData);

      const mappedContacts = contacts.map((c: Contact): any => {
        return c.id;
      });
      const assignApiPostData = {
        contactIds: mappedContacts,
        dripCampaignId: this.addToDripCampaignId,
      };
      await this.dripCampaignService.assignContactsAndLabelsInCampaign(assignApiPostData);

      let reactivated = false;
      if (reactivating) {
        await this.dripCampaignService.activateDripCampaign({
          drip_campaign_id: this.addToDripCampaignId,
          companyId: this.userData.supplier_id,
        });
        // The backend leaves the campaign complete when nobody added is owed an email
        // (they had all been through it already), so read the outcome back. This also
        // refreshes the cached campaign list, whose status is now stale.
        const refreshed = await this.dripCampaignService.getListOfDripCampaignsWithoutPagination(true);
        reactivated =
          refreshed.find((c) => String(c.id) === String(this.addToDripCampaignId))?.status === constants.ACTIVE;
      }

      await this.prospectingService.getContacts(getContactApiPostData, true);
      this.prospectingService.selectedContactsInContactsPage = [];

      if (reactivating) {
        await Swal.fire(
          reactivated
            ? { title: 'Done!', text: 'Contact(s) added and the drip campaign is active again.', icon: 'success' }
            : {
                title: 'Done!',
                text: 'Contact(s) added. They were already in this campaign, so it stays complete.',
                icon: 'info',
              },
        );
      } else {
        await Swal.fire('Done!', 'Contact(s) added successfully!', 'success');
      }

      this.activeCanvas.dismiss('Cross click');
    } catch (e) {
      await Swal.fire('Error', e.message);
    } finally {
      this.isLoading = false;
    }
  };
}
