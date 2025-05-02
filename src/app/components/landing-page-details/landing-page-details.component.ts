import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { constants } from 'src/app/helpers/constants';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { FileSystemDirectoryEntry, FileSystemFileEntry, NgxFileDropEntry, NgxFileDropModule } from 'ngx-file-drop';
import { AuthService } from 'src/app/services/auth.service';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProspectingService } from '../../services/prospecting.service';
import { Subscription } from 'rxjs';
import { CampaignService } from 'src/app/services/campaign.service';
import { environment } from '../../../environments/environment';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { personSeniorities } from '../../helpers/campaign-premise-constants';
import { PageUiService } from '../../services/page-ui.service';
import { CreateProductComponent } from '../create-product/create-product.component';
import { AddProductDescriptionComponent } from '../add-product-description/add-product-description.component';
import { CreateCampaignTitleComponent } from '../create-campaign-title/create-campaign-title.component';
import { CreateCampaignDetailsComponent } from '../create-campaign-details/create-campaign-details.component';
import { CreateCampaignUnitComponent } from '../create-campaign-unit/create-campaign-unit.component';
import { CreateCampaignVideoUrlComponent } from '../create-campaign-video-url/create-campaign-video-url.component';
import { ErrorMessageCardComponent } from '../error-message-card/error-message-card.component';
import { KexySelectDropdownComponent } from '../kexy-select-dropdown/kexy-select-dropdown.component';
import { CampaignLayoutBottmBtnsComponent } from '../campaign-layout-bottm-btns/campaign-layout-bottm-btns.component';
import { CommonModule } from '@angular/common';
import { ILandingPageDetail, LandingPage } from '../../models/LandingPage';

@Component({
  selector: 'landing-page-details',
  imports: [
    ReactiveFormsModule,
    NgxFileDropModule,
    ErrorMessageCardComponent,
    KexySelectDropdownComponent,
    FormsModule,
    CampaignLayoutBottmBtnsComponent,
    CommonModule,
  ],
  templateUrl: './landing-page-details.component.html',
  styleUrl: './landing-page-details.component.scss',
})
export class LandingPageDetailsComponent implements OnInit, OnDestroy {
  @Input() nextBtnClick;
  @Input() backBtnClick;
  public constants = constants;
  public landingPage: LandingPage = LandingPage.empty();
  public userData;
  public primaryForm: FormGroup;
  public campaignTypes;
  public selectedCampaignType;
  public submitted: boolean = false;
  public products: any[] = [];
  public campaignTitlesDropdownOptions: any[] = [];
  public campaignInnerDetailsDropdownOptions: any[] = [];
  public productDescription: any[] = [];
  public campaignVideoUrlDropdownOptions: any[] = [];
  public selectProductNameKey: string;
  public selectedProductDescriptionKey: string;
  public selectedCampaignTitle: string;
  public selectedCampaignInnerDetails: string;
  public selectedCampaignVideoUrl: string;
  public sellSheetFileName;
  public model;
  public landingPageId;
  public campaignDuplicate = false;
  public campaignTitle: string = '';
  public campaignDetails: string = '';
  public productKnowledge: string = '';
  public purchaseUrl: string = '';
  public visitWebsite: string = '';
  public customButtonUrl: string = '';
  public customButtonLabel: string = '';
  public productsSubscription: Subscription;
  public campaignTitlesSubscription: Subscription;
  public campaignInnerDetailsSubscription: Subscription;
  public campaignUnitsSubscription: Subscription;
  public campaignVideoUrlsSubscription: Subscription;

  constructor(
    private ngbOffcanvas: NgbOffcanvas,
    private _authService: AuthService,
    private campaignService: CampaignService,
    private pageUiService: PageUiService,
    private route: ActivatedRoute,
    private prospectingService: ProspectingService,
  ) {
  }

  @ViewChild('stateSelectionModal') stateSelectionModalRef: ElementRef;

  async ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['id']) {
        this.landingPageId = params['id'];
      }
      if (params['action'] && params['action'] === constants.DUPLICATE) {
        this.campaignDuplicate = true;
      }
    });

    this.userData = this._authService.userTokenValue;
    this.getAndSetSelectedCampaign();
    await this.setFormGroupField();

    this.getAndSetProductSubscription();
    this.getAndSetCampaignTitleSubscription();
    this.getAndSetCampaignInnerDetailsSubscription();
    this.getAndSetCampaignVideoUrlsSubscription();

    console.log('submitted', this.submitted);
  }

  ngOnDestroy(): void {
    if (this.productsSubscription) this.productsSubscription.unsubscribe();
    if (this.campaignTitlesSubscription) this.campaignTitlesSubscription.unsubscribe();
    if (this.campaignInnerDetailsSubscription) this.campaignInnerDetailsSubscription.unsubscribe();
    if (this.campaignUnitsSubscription) this.campaignUnitsSubscription.unsubscribe();
    if (this.campaignVideoUrlsSubscription) this.campaignVideoUrlsSubscription.unsubscribe();
  }

  getAndSetProductSubscription = async () => {
    // Get products api call
    await this.prospectingService.getProducts({
      supplier_id: this.userData.supplier_id,
      page: 1,
      limit: 1000,
      get_total_count: 'false',
    });

    // Set subscription to get up to date products
    this.productsSubscription = this.prospectingService.allProduct.subscribe((products) => {
      this.products = products;
      this.products.map((p) => {
        p.value = p.name;
      });

      //Adding new product description in product description creditsPriceOptions
      if (this.selectProductNameKey) {
        const { id } = this.prospectingService.getSelectedProduct();
        const index = this.products.findIndex((i) => i.id === id);
        this.onProductNameSelect(this.products[index]);
      }

      // Setting product if needs to show previous data
      const index = this.products.findIndex((i) => i.id === this.landingPage.detail.prospectingProduct.id);
      if (index > -1) {
        this.onProductNameSelect(this.products[index]);

        //Setting product description/knowledge
        const descIndex = this.productDescription.findIndex((i) => i.key === this.landingPage.detail.productKnowledge);
        this.onProductDescriptionSelect(this.productDescription[descIndex]);
      }
    });
  };

  getAndSetCampaignTitleSubscription = async () => {
    // Get campaignTitles api call
    await this.campaignService.getAllCampaignTitle();

    // Set campaignTitle subscription
    this.campaignTitlesSubscription = this.campaignService.campaignTitles.subscribe((campaignTitles) => {
      this.campaignTitlesDropdownOptions = campaignTitles;
      this.campaignTitlesDropdownOptions.map((i) => {
        i.value = i.title.length > 100 ? i.title.slice(0, 100) + '...' : i.title;
      });

      // Setting previous data if any
      let campaignData = this.campaignService.getLandingPageData();
      console.log(this.campaignTitlesDropdownOptions);
      console.log({ campaignData });
      if (Object.keys(campaignData).length) {
        const index = this.campaignTitlesDropdownOptions.findIndex(
          (i) => i.id.toString() === campaignData['detail'].title?.id.toString(),
        );
        if (index > -1) {
          this.onCampaignTitleSelect(this.campaignTitlesDropdownOptions[index]);
        }
      }
    });
  };

  getAndSetCampaignInnerDetailsSubscription = async () => {
    // Get campaignInnerDetails api call
    await this.campaignService.getAllCampaignInnerDetail({ supplier_id: this.userData.supplier_id });

    // Set campaignInnerDetails subscription
    this.campaignInnerDetailsSubscription = this.campaignService.campaignInnerDetails.subscribe(
      (campaignInnerDetails) => {
        this.campaignInnerDetailsDropdownOptions = campaignInnerDetails;
        this.campaignInnerDetailsDropdownOptions.map((i) => {
          i.value = i.innerDetail.length > 100 ? i.innerDetail.slice(0, 100) + '...' : i.innerDetail;
        });

        // Setting previous data if any
        let campaignData = this.campaignService.getLandingPageData();
        if (Object.keys(campaignData).length) {
          const index = this.campaignInnerDetailsDropdownOptions.findIndex(
            (i) => i.id.toString() === campaignData['detail'].innerDetail?.id.toString(),
          );

          if (index > -1) {
            this.onCampaignInnerDetailsSelect(this.campaignInnerDetailsDropdownOptions[index]);
          }
        }
      },
    );
  };

  getAndSetCampaignVideoUrlsSubscription = async () => {
    // Get campaignVideoUrls api call
    await this.campaignService.getAllCampaignVideoUrl();

    // Set campaignVideoUrls subscription
    this.campaignVideoUrlsSubscription = this.campaignService.campaignVideoUrls.subscribe((videoUrls) => {
      this.campaignVideoUrlDropdownOptions = videoUrls;
      this.campaignVideoUrlDropdownOptions.map((i) => {
        i.value = i.videoUrl;
      });

      console.log(this.campaignVideoUrlDropdownOptions);
      // Setting previous data if any
      let campaignData = this.campaignService.getLandingPageData();
      if (Object.keys(campaignData).length) {
        const index = this.campaignVideoUrlDropdownOptions.findIndex(
          (i) => i.videoUrl.toString() === campaignData['detail']['video'].toString(),
        );

        if (index > -1) {
          this.onCampaignVideoUrlSelect(this.campaignVideoUrlDropdownOptions[index]);
        }
      }
    });
  };

  onProductNameSelect = (product, index = null, rowIndex = null) => {
    this.selectProductNameKey = product.name;
    this.primaryForm.patchValue({
      product: product.id,
    });

    // Reset previous product description dropdowns as new product has been selected here
    this.productDescription = [];
    this.selectedProductDescriptionKey = '';
    this.primaryForm.patchValue({ productKnowledge: '' });

    const descriptions = Array.isArray(product.descriptions) ? product.descriptions : JSON.parse(product.descriptions);
    descriptions.forEach((d) => {
      this.productDescription.push({
        key: d,
        value: d.length > 100 ? d.slice(0, 100) + '...' : d,
        supplier_id: product.supplier_id,
        user_id: product.user_id,
        category_id: product.category_id,
        created_at: product.created_at,
        product_id: product.id,
        product_name: product.name,
        product_descriptions: product.descriptions,
        product_status: product.status,
      });
    });
    // this.prospectingService.setSelectedProduct(product);
    console.log('productDesc', this.productDescription);
  };

  onCampaignTitleSelect = (campaignTitle, index = null, rowIndex = null) => {
    this.selectedCampaignTitle = campaignTitle.value;
    this.primaryForm.patchValue({ campaignTitle: campaignTitle.id });
  };

  onCampaignInnerDetailsSelect = (campaignInnerDetails, index = null, rowIndex = null) => {
    this.selectedCampaignInnerDetails = campaignInnerDetails?.value || '';
    this.primaryForm.patchValue({ campaignDetails: campaignInnerDetails?.id || '' });
  };

  onCampaignVideoUrlSelect = (videoUrl, index = null, rowIndex = null) => {
    this.selectedCampaignVideoUrl = videoUrl.value;
    this.primaryForm.patchValue({ productVideo: videoUrl.value });
  };

  handleDeleteCampaignTitle = async (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    console.log('ev', data);
    const confirmed = await this.__isDeleteConfirmed();
    if (!confirmed) return;

    const postData = {
      supplier_id: this.userData.supplier_id,
      title_id: data.id,
    };
    try {
      await this.campaignService.deleteCampaignTitle(postData);

      // If selected data gets deleted then we need to empty selected field
      const campaignTitleId = this.primaryForm.get('campaignTitle')?.value;
      if (this.selectedCampaignTitle && data.id === campaignTitleId) {
        this.selectedCampaignTitle = '';
        this.primaryForm.patchValue({ campaignTitle: '' });
      }
    } catch (e) {
    }
  };

  handleDeleteCampaignDetails = async (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    const confirmed = await this.__isDeleteConfirmed();
    if (!confirmed) return;

    const postData = {
      supplier_id: this.userData.supplier_id,
      inner_detail_id: data.id,
    };

    try {
      await this.campaignService.deleteCampaignInnerDetail(postData);

      // If selected data gets deleted then we need to empty selected field
      const campaignDetailsId = this.primaryForm.get('campaignDetails')?.value;
      if (this.selectedCampaignInnerDetails && data.id === campaignDetailsId) {
        this.selectedCampaignInnerDetails = '';
        this.primaryForm.patchValue({ campaignDetails: '' });
      }
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  handleDeleteCampaignVideoUrl = async (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    const confirmed = await this.__isDeleteConfirmed();
    if (!confirmed) return;

    const postData = {
      id: data.id,
    };

    try {
      await this.campaignService.deleteCampaignVideoUrl(postData);

      // If selected data gets deleted then we need to empty selected field
      if (this.selectedCampaignVideoUrl && data.value === this.selectedCampaignVideoUrl) {
        this.selectedCampaignVideoUrl = '';
        this.primaryForm.patchValue({ productVideo: '' });
      }
    } catch (e) {
    }
  };

  handleDeleteProduct = async (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    const confirmed = await this.__isDeleteConfirmed();
    if (!confirmed) return;

    const postData = {
      id: data.id,
    };

    try {
      await this.prospectingService.deleteProduct(postData);

      // If selected details gets deleted then we need to empty selected field
      const productId = this.primaryForm.get('product')?.value;
      if (this.selectProductNameKey && data.id === productId) {
        this.selectProductNameKey = '';
        this.selectedProductDescriptionKey = '';
        this.primaryForm.patchValue({ product: '' });
        this.primaryForm.patchValue({ productKnowledge: '' });
      }
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  handleDeleteProductDescription = async (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    const confirmed = await this.__isDeleteConfirmed();
    if (!confirmed) return;

    let index = data.product_descriptions.indexOf(data.key);
    let productDescriptions = data.product_descriptions;
    productDescriptions.splice(index, 1);

    const payload = {
      name: data.product_name,
      descriptions: productDescriptions,
      companyId: this.userData.supplier_id,
      id: data.product_id,
    };

    try {
      await this.prospectingService.updateProduct(payload);

      // If selected details gets deleted then we need to empty selected field
      if (productDescriptions.findIndex(pd => pd === this.selectedProductDescriptionKey) === -1) {
        this.selectedProductDescriptionKey = '';
        this.primaryForm.patchValue({ productKnowledge: '' });
      }
    } catch (e) {
    }
  };

  handleClickEditIconInVideoUrl = (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();
    // Set selected item in service and open canvas
    this.campaignService.setEditVideoUrlItem(data);
    this.openCreateCampaignVideoUrlCanvas();
  };

  handleClickEditIconInProduct = (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    // Set selected item in service and open canvas
    console.log(data);
    this.prospectingService.setSelectedProduct(data);

    // Parameter need for edit purpose
    this.openCreateProductCanvas('', '', true);
  };

  handleClickEditIconInProductDescription = (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    // Set selected item in service and open canvas
    let index = data.product_descriptions.indexOf(data.key);

    // Set product description index
    data.descriptionIndex = index;

    // Set the data in service and open canvas
    this.getProductByIdAndSetProductInService();
    this.prospectingService.setSelectedDescription(data);
    this.openAddProductDescCanvas();
  };

  handleClickEditIconInTitleOfCampaign = (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    // Set selected item in service and open canvas
    this.campaignService.setEditCampaignTitleItem(data);
    this.openCreateCampaignTitleCanvas();
  };

  handleClickEditIconInDetailOfCampaign = (data, event: Event) => {
    // Stop the event propagation to prevent the outer button click handler from being called
    event.stopPropagation();

    // Set selected item in service and open canvas
    this.campaignService.setEditCampaignDetailItem(data);
    this.openCreateCampaignInnerDetailsCanvas();
  };

  getProductByIdAndSetProductInService = () => {
    const productId = this.primaryForm.get('product').value;
    const productIndex = this.products.findIndex(i => i.id === productId);
    this.prospectingService.setSelectedProduct(this.products[productIndex]);
  };

  openCreateProductCanvas = (distributorOrRep = '', rowIndex = '', edit = false) => {
    console.log('false edit', edit);

    if (!edit) {
      console.log('false edit');
      // Emptying service selected data for creating new product
      this.prospectingService.setSelectedProduct('');
      this.prospectingService.setSelectedDescription('');
    }

    this.__createRightSideSlide(CreateProductComponent);
  };

  openAddProductDescCanvas = () => {
    this.getProductByIdAndSetProductInService();
    this.__createRightSideSlide(AddProductDescriptionComponent);
  };

  openCreateCampaignTitleCanvas = () => {
    this.__createRightSideSlide(CreateCampaignTitleComponent);
  };

  openCreateCampaignInnerDetailsCanvas = () => {
    this.__createRightSideSlide(CreateCampaignDetailsComponent);
  };

  openCreateCampaignUnitsCanvas = () => {
    this.__createRightSideSlide(CreateCampaignUnitComponent);
  };

  openCreateCampaignVideoUrlCanvas = () => {
    this.__createRightSideSlide(CreateCampaignVideoUrlComponent);
  };

  __createRightSideSlide = (Component) => {
    this.ngbOffcanvas.open(Component, {
      panelClass: 'attributes-bg edit-rep-canvas',
      backdropClass: 'edit-rep-canvas-backdrop',
      position: 'end',
      scroll: false,
    });
  };

  __isDeleteConfirmed = async () => {
    let isConfirm = await Swal.fire({
      title: `Are you sure?`,
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });

    return !isConfirm.dismiss;
  };

  onProductDescriptionSelect = async (description, index = null, rowIndex = null) => {
    this.selectedProductDescriptionKey = description.value;
    if (this.selectedProductDescriptionKey) {
      this.primaryForm.patchValue({ productKnowledge: description.key });
    }
  };

  getAndSetSelectedCampaign = () => {
    this.campaignTypes = this.campaignService.getCampaignTypes();
    this.campaignService.selectedCampaign.subscribe((campaign) => {
      console.log({ campaign });
      this.selectedCampaignType = campaign;
    });
  };

  public isCheckedPurchaseCheckbox: boolean = false;
  public isCheckedVisitWebsiteCheckbox: boolean = false;
  public isCheckedCallMessageCheckbox: boolean = false;
  public isCheckedCustomBtnCheckbox: boolean = false;
  handleCheckboxClick = (value) => {
    if (value === constants.PURCHASE) this.isCheckedPurchaseCheckbox = !this.isCheckedPurchaseCheckbox;
    if (value === constants.VISIT_WEBSITE) this.isCheckedVisitWebsiteCheckbox = !this.isCheckedVisitWebsiteCheckbox;
    if (value === constants.CUSTOM_BTN) this.isCheckedCustomBtnCheckbox = !this.isCheckedCustomBtnCheckbox;
  };

  validateUrl = (value) => {
    if (value === constants.PURCHASE) {
      return this.pageUiService.validateUrl(this.purchaseUrl);
    }
    if (value === constants.VISIT_WEBSITE) {
      return this.pageUiService.validateUrl(this.visitWebsite);
    }
    if (value === constants.CUSTOM_BTN) {
      return this.pageUiService.validateUrl(this.customButtonUrl);
    }
  };

  setFormGroupField = async () => {
    // Check previous data in service
    this.landingPage = this.campaignService.getLandingPageData();
    if (!this.landingPage || !Object.keys(this.landingPage).length) {
      this.landingPage = LandingPage.empty();
    }
    const landingPageDetail: ILandingPageDetail = this.landingPage.detail;
    this.campaignService.changeLandingPageType(landingPageDetail.landingPageType);

    // Setting video url if any
    if (landingPageDetail.video) {
      this.selectedCampaignVideoUrl = landingPageDetail.video;
    }

    // Setting purchase url
    if (landingPageDetail.purchaseUrl) {
      this.purchaseUrl = landingPageDetail.purchaseUrl;
      this.isCheckedPurchaseCheckbox = true;
    }

    // Setting visit website
    if (landingPageDetail.visitWebsite) {
      this.visitWebsite = landingPageDetail.visitWebsite;
      this.isCheckedVisitWebsiteCheckbox = true;
    }

    // Setting custom button
    if (landingPageDetail.customButtonUrl) {
      this.customButtonUrl = landingPageDetail.customButtonUrl;
      this.isCheckedCustomBtnCheckbox = true;
    }

    // Setting custom button
    if (landingPageDetail.customButtonLabel) {
      this.customButtonLabel = landingPageDetail.customButtonLabel;
    }


    // Setting environment imageurl if edit or duplicate
    let campaignImage;
    if (landingPageDetail && this.landingPageId || this.campaignDuplicate) {
      campaignImage = environment.imageUrl + landingPageDetail.image;
    }

    this.primaryForm = new FormGroup({
      productPhoto: new FormControl(
        campaignImage ? campaignImage : '',
        Validators.compose([Validators.required]),
      ),
      productVideo: new FormControl(landingPageDetail.video),
      product: new FormControl(
        landingPageDetail.prospectingProduct.id,
        Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(30)]),
      ),
      campaignTitle: new FormControl(
        landingPageDetail.title.title,
        Validators.compose([
          Validators.required,
          Validators.minLength(0),
          Validators.maxLength(50),
        ]),
      ),
      campaignDetails: new FormControl(
        landingPageDetail.innerDetail.innerDetail,
        Validators.compose([Validators.minLength(0), Validators.maxLength(1500)]),
      ),
      productKnowledge: new FormControl(
        landingPageDetail.productKnowledge,
        Validators.compose([
          Validators.required,
          Validators.minLength(0),
        ]),
      ),
      price: new FormControl(
        landingPageDetail.price,
        Validators.compose([
          Validators.required,
        ]),
      ),
      estimatedSavings: new FormControl(
        landingPageDetail.estimatedSavings,
        Validators.compose([
          Validators.required,
        ]),
      ),
      category: new FormControl(
        '1',
        Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(100)]),
      ),
      size: new FormControl(landingPageDetail.size),
      amount: new FormControl(landingPageDetail.amount),
      additionalInfo: new FormControl(landingPageDetail.additionalInfo),
      sellSheet: new FormControl(landingPageDetail.salesSheet),
      typeOfCampaign: new FormControl(
        this.selectedCampaignType,
        Validators.compose([Validators.required, Validators.minLength(0), Validators.maxLength(100)]),
      ),
      purchase: new FormControl(''),
    });


  };

  formValidationErrorCheck = (fieldName: string) => {
    return (
      this.primaryForm.controls[fieldName].invalid && (this.submitted || this.primaryForm.controls[fieldName].dirty)
    );
  };

  productImageDrop(files: NgxFileDropEntry[]) {
    for (const droppedFile of files) {
      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          // Here you can access the real file
          if (file.type.indexOf('image/') !== 0) {
            alert('Invalid Image - Please select a valid image');
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            this.primaryForm.patchValue({
              productPhoto: reader.result,
            });
          };
          reader.readAsDataURL(file);
        });
      }
    }
  }

  sellSheetFileDrop(files: NgxFileDropEntry[]) {
    this.sellSheetFileName = files[0].fileEntry.name;

    for (const droppedFile of files) {
      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          // Here you can access the real file
          if (file.type !== 'application/pdf' && file.type.indexOf('image/') !== 0) {
            alert('Invalid File - Please select a  Pdf or Image');
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            this.primaryForm.patchValue({
              sellSheet: reader.result,
            });
          };
          reader.readAsDataURL(file);
        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
      }
    }
  }

  deleteShellSheetBtnClick = () => {
    this.primaryForm.patchValue({ sellSheet: '' });
    this.sellSheetFileName = '';
  };

  handleClickNextButton = async () => {
    this.submitted = true;
    let data = this.primaryForm.getRawValue();

    // Setting price value to 0 for featured or product listing type of campaign if empty
    if (
      this.selectedCampaignType === constants.FEATURED_PRODUCT ||
      this.selectedCampaignType === constants.LISTING_OF_PRODUCT ||
      this.selectedCampaignType === constants.ANNOUNCEMENT_KEY
    ) {
      if (!data.price) {
        this.primaryForm.patchValue({ price: 0 });
      }
      if (!data.estimatedSavings) {
        this.primaryForm.patchValue({ estimatedSavings: 0 });
      }
    }

    // Form validation
    if (!this.primaryForm.valid) {
      console.log(this.primaryForm);
      return;
    }
    if ((!this.isCheckedPurchaseCheckbox && !this.isCheckedVisitWebsiteCheckbox && !this.isCheckedCustomBtnCheckbox) || (!this.purchaseUrl && !this.visitWebsite && !this.customButtonUrl) || (this.customButtonLabel && !this.customButtonUrl) || (!this.customButtonLabel && this.customButtonUrl)) {
      console.log(this.purchaseUrl, this.visitWebsite, this.customButtonUrl);
      return;
    }
    if ((this.isCheckedPurchaseCheckbox && !this.purchaseUrl) || (this.isCheckedVisitWebsiteCheckbox && !this.visitWebsite) || (this.isCheckedCustomBtnCheckbox && (!this.customButtonUrl || !this.customButtonLabel))) {
      return;
    }
    if (!this.isCheckedCustomBtnCheckbox) {
      this.customButtonLabel = '';
      this.customButtonUrl = '';
    }
    if (!this.isCheckedVisitWebsiteCheckbox) this.visitWebsite = '';
    if (!this.isCheckedPurchaseCheckbox) this.purchaseUrl = '';
    // validation end

    let startDateData = '';
    let endDateData = '';

    // For edit extract environment url
    let campaignImage = data.productPhoto.startsWith(environment.imageUrl)
      ? data.productPhoto.replace(environment.imageUrl, '')
      : data.productPhoto;

    // ToDo
    // update campaignCreate api so that establishment_search_type and establishment_search_value can be passed empty
    const payload = {

      landingPageType: this.selectedCampaignType,
      companyId: this.userData.supplier_id,
      titleId: data.campaignTitle,
      innerDetailsId: data.campaignDetails,
      prospectingProductId: data.product,
      productKnowledge: data.productKnowledge,
      image: campaignImage,
      video: data.productVideo,
      estimatedSavings: data.estimatedSavings,
      price: data.price,
      size: data.size,
      amount: data.amount,
      additionalInfo: data.additionalInfo,
      salesSheet: data.sellSheet,
      purchaseUrl: this.purchaseUrl,
      visitWebsite: this.visitWebsite,
      messageCallNumber: '',
      customButtonUrl: this.customButtonUrl,
      customButtonLabel: this.customButtonLabel,
    };

    if (this.landingPageId && !this.campaignDuplicate) {
      payload['landingPageId'] = this.landingPageId;
    }

    try {
      const campaignId = await this.campaignService.campaignCreateApi(payload);

      // Proceed to next page
      this.nextBtnClick(campaignId, true);

    } catch (e) {
      Swal.fire({
        title: `Error`,
        text: e.message,
        icon: 'warning',
      });
    }
  };

  handleCloseIconInImage = () => {
    this.primaryForm.patchValue({
      productPhoto: '',
    });
  };

  handleCampaignChange = () => {
    let data = this.primaryForm.getRawValue();

    this.campaignService.changeLandingPageType(data.typeOfCampaign);
  };

  primaryFormSubmitted = () => {
  };
  protected readonly environment = environment;
  protected readonly personSeniorities = personSeniorities;
}
