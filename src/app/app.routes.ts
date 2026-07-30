import { Routes } from '@angular/router';
import { routeConstants } from './helpers/routeConstants';
import { AuthGuard } from './guard/auth.guard';

/**
 * `data.title` is the page name shown in the header beside the sidebar toggle.
 * `brand-layout` reads it off the activated route, so a new page gets its title by
 * declaring it HERE — there is nothing to wire up in the page's own template.
 *
 * A page that needs a DYNAMIC title (e.g. `brand-list-contacts` showing the list's
 * name) still passes `[headline]` to `<brand-layout>`, which takes precedence.
 */
export const routes: Routes = [
  { path: '', redirectTo: '/' + routeConstants.LOGIN, pathMatch: 'full' },
  {
    path: routeConstants.LOGIN,
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: routeConstants.EMAIL_CONFIRMATION,
    loadComponent: () =>
      import('./pages/email-confirmation/email-confirmation.component').then((m) => m.EmailConfirmationComponent),
  },
  {
    path: routeConstants.FORGET_PASSWORD,
    loadComponent: () => import('./pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: routeConstants.RESET_PASSWORD,
    loadComponent: () => import('./pages/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: routeConstants.REGISTER,
    loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: routeConstants.BRAND.CREATE,
    loadComponent: () => import('./pages/brand-create/brand-create.component').then((m) => m.BrandCreateComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.SUBSCRIPTION_SELECTION,
    loadComponent: () =>
      import('./pages/brand-subscription-selection/brand-subscription-selection.component').then(
        (m) => m.BrandSubscriptionSelectionComponent,
      ),
  },
  {
    path: routeConstants.BRAND.WELCOME,
    loadComponent: () => import('./pages/brand-welcome/brand-welcome.component').then((m) => m.BrandWelcomeComponent),
  },
  {
    path: routeConstants.BRAND.ORGANIZATION_LIST,
    loadComponent: () => import('./pages/brand-list/brand-list.component').then((m) => m.BrandListComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.CREATE_DRIP_CAMPAIGN,
    data: { title: 'Create Campaign' },
    loadComponent: () =>
      import('./pages/brand-drip-campaign/brand-drip-campaign.component').then(
        (m) => m.BrandDripCampaignComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.LAUNCH_DRIP_CAMPAIGN,
    data: { title: 'Campaign' },
    loadComponent: () =>
      import('./pages/brand-launch-drip-campaign/brand-launch-drip-campaign.component').then(
        (m) => m.BrandLaunchDripCampaignComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.LIST_DRIP_CAMPAIGN,
    data: { title: 'Manage Campaigns' },
    loadComponent: () =>
      import('./pages/brand-list-of-drip-campaigns/brand-list-of-drip-campaigns.component').then(
        (m) => m.BrandListOfDripCampaignsComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.PROMOTION_COMPANY_DESC,
    data: { title: 'Company Description' },
    loadComponent: () =>
      import('./pages/prospecting-company-description/prospecting-company-description.component').then(
        (m) => m.ProspectingCompanyDescriptionComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.PROMOTION_PRODUCT_DESC,
    data: { title: 'Product/Service Description' },
    loadComponent: () =>
      import('./pages/prospecting-product-description/prospecting-product-description.component').then(
        (m) => m.ProspectingProductDescriptionComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.DASHBOARD,
    data: { title: 'Dashboard' },
    loadComponent: () =>
      import('./pages/brand-dashboard/brand-dashboard.component').then((m) => m.BrandDashboardComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.PROSPECTING_CONV_ALL,
    data: { title: 'Inbox' },
    loadComponent: () =>
      import('./pages/brand-conversations/brand-conversations.component').then((m) => m.BrandConversationsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.PROSPECTING_SENT_CONV,
    data: { title: 'Sent' },
    loadComponent: () =>
      import('./pages/brand-conversation-sent/brand-conversation-sent.component').then((m) => m.BrandConversationSentComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.INVITE_PEOPLE,
    data: { title: 'Invite People' },
    loadComponent: () =>
      import('./pages/brand-invite-people/brand-invite-people.component').then((m) => m.BrandInvitePeopleComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.SLACK_INTEGRATION,
    data: { title: 'Slack Integration' },
    loadComponent: () =>
      import('./pages/slack-integration/slack-integration.component').then(
        (m) => m.SlackIntegrationComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.SMTP_SETTINGS,
    data: { title: 'SMTP Accounts' },
    loadComponent: () =>
      import('./pages/brand-email-account-settings/brand-email-account-settings.component').then(
        (m) => m.BrandEmailAccountSettingsComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.NEGATIVE_PROMPTS,
    data: { title: 'Negative Prompts' },
    loadComponent: () =>
      import('./pages/negative-prompt/negative-prompt.component').then(
        (m) => m.NegativePromptComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.SUPPRESSION_LIST,
    data: { title: 'Suppression List' },
    loadComponent: () =>
      import('./pages/suppression-list/suppression-list.component').then((m) => m.SuppressionListComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.LANDING_PAGES,
    data: { title: 'Landing Pages' },
    loadComponent: () =>
      import('./pages/landing-page-create/landing-page-create.component').then(
        (m) => m.LandingPageCreateComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.LIST_PROMOTION,
    data: { title: 'Promotions' },
    loadComponent: () => import('./pages/landing-pages/landing-page.component').then((m) => m.LandingPageComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.MANAGE_LIST,
    data: { title: 'Manage Lists' },
    loadComponent: () =>
      import('./pages/manage-list/manage-list.component').then(
        (m) => m.ManageListComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.LIST_CONTACTS,
    data: { title: 'List Contacts' },
    loadComponent: () =>
      import('./pages/brand-list-contacts/brand-list-contacts.component').then(
        (m) => m.BrandListContactsComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.LEAD_MAGNETS,
    data: { title: 'Lead Magnets' },
    loadComponent: () =>
      import('./pages/lead-magnets/lead-magnets.component').then(
        (m) => m.LeadMagnetsComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.MANAGE_CONTACTS,
    data: { title: 'Manage Contacts' },
    loadComponent: () =>
      import('./pages/brand-contacts/brand-contacts.component').then(
        (m) => m.BrandContactsComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.FIND_LEADS,
    data: { title: 'Find Leads' },
    loadComponent: () =>
      import('./pages/brand-find-leads/brand-find-leads.component').then(
        (m) => m.BrandFindLeadsComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.EDIT_PROFILE,
    data: { title: 'Edit Profile' },
    loadComponent: () =>
      import('./pages/edit-brand-user/edit-brand-user.component').then((m) => m.EditBrandUserComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.EDIT_COMPANY,
    data: { title: 'Edit Company' },
    loadComponent: () => import('./pages/edit-brand/edit-brand.component').then((m) => m.EditBrandComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.PRICE,
    data: { title: 'Pricing' },
    loadComponent: () =>
      import('./pages/brand-price/brand-price.component').then((m) => m.BrandPriceComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.SUBSCRIPTION,
    data: { title: 'Subscription' },
    loadComponent: () =>
      import('./pages/brand-credits/brand-credits.component').then((m) => m.BrandCreditsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: routeConstants.BRAND.LANDING_PAGE_NO_AUTH,
    loadComponent: () =>
      import('./pages/public-landing-page/public-landing-page.component').then(
        (m) => m.PublicLandingPageComponent,
      ),
  },
  {
    path: routeConstants.BRAND.IMPORT_CONTACTS_IN_SENDY,
    data: { title: 'Import Contacts' },
    loadComponent: () =>
      import('./pages/import-contacts-in-sendy/import-contacts-in-sendy.component').then(
        (m) => m.ImportContactsInSendyComponent,
      ),
  },
];
