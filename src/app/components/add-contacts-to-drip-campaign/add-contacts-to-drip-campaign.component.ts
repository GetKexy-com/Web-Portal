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

@Component({
  selector: 'add-contacts-to-drip-campaign',
  imports: [FormsModule, KexySelectDropdownComponent, ErrorMessageCardComponent, CommonModule],
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
  ) {}

  async ngOnInit() {
    this.userData = this._authService.userTokenValue;
    this.selectedContacts = this.prospectingService.selectedContactsInContactsPage;

    this.route.queryParams.subscribe((params) => {
      if (params['addToDripCampaignId']) {
        this.addToDripCampaignId = params['addToDripCampaignId'];
      }
    });

    await this.getAndSetDripCampaignTitleSubscription();
    this.getDripCampaignsApiCall();
    this.getAndSetLabels();
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
    this.dripCampaignList =
      await this.dripCampaignService.getListOfDripCampaignsWithoutPagination(true);
    if (this.dripCampaignList.length) {
      this.dripCampaignList = this.dripCampaignList.filter((i) => {
        return i.status === constants.ACTIVE || i.status === constants.PAUSE;
      });
    }

    this.dripCampaignList.forEach((cam) => {
      this.dripCampaignDropDownList.push({
        key: cam.id,
        id: cam.id,
        lists: cam.lists,
        value: cam.details.title.title,
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

  onDripCampaignSelect = async (selectedValue, index = 0, rowIndex = 0) => {
    console.log('labels', selectedValue);
    this.selectedDripCampaign = selectedValue;
    this.addToDripCampaignId = selectedValue.id;
  };

  // parseContactDetails = (data) => {
  //   console.log('data', data);
  //   const contacts = [];
  //   data.forEach((contact: Contact) => {
  //     const details = contact.details;
  //     details['id'] = contact.id;
  //     contacts.push({ ...contact, details: details });
  //     console.log('details', details);
  //   });
  //   return contacts;
  // };

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
    if (!this.selectedDripCampaign['value']) return;

    let postData;
    const getContactApiPostData = this.getContactsApiPayload();
    this.isLoading = true;
    try {
      let contacts: Contact[] = [];
      contacts = this.selectedContacts;
      console.log(contacts);

      // Edit Contact(s)
      postData = this.setAndGetEditMultipleContactApiPayload();
      if (this.prospectingService.selectedAllContacts) {
        postData['selectedAllContacts'] = true;
        postData['selectedAllContactsPayload'] = getContactApiPostData;
        postData['contacts'] = [];
      }
      await this.prospectingService.editContacts(postData);

      const assignApiPostData = {
        companyId: this.userData.supplier_id,
        contacts,
        listIds: [],
        notify: false,
        dripCampaignId: this.addToDripCampaignId,
      };
      await this.dripCampaignService.assignContactsAndLabelsInCampaign(assignApiPostData);

      this.getAndSetLabels();
      await this.prospectingService.getContacts(getContactApiPostData, true);
      this.prospectingService.selectedContactsInContactsPage = [];

      Swal.fire('Done!', 'Contact(s) added successfully!', 'success');

      this.activeCanvas.dismiss('Cross click');
    } catch (e) {
      await Swal.fire('Error', e.message);
    } finally {
      this.isLoading = false;
    }
  };
}
