export const selectKpiData = [
  {
    title: "Most Valuable Menu Items",
    key: "most_valuable_menu_items",
    tooltipText: "Which items on your menu are most profitable compared to those that are flopping.",
    required: false,
    selected: false,
    icon: "/assets/images/arrow-up.png",
  },
  {
    title: "Least Valuable Menu Items",
    key: "least_valuable_menu_items",
    tooltipText: "Which items on your menu are most profitable compared to those that are flopping.",
    required: false,
    selected: false,
    icon: "/assets/images/arrow-down-in-box.png",
  },
  {
    title: "Cost of Goods Sold(CoGS)",
    key: "cost_of_goods_sold",
    tooltipText:
      "Relation between what was spent on products (by category) and how much was sold during a period of time.  Industry standards dictate restaurant CoGS fall between 20% and 40%, usually higher on food and lower at the bar.",
    required: false,
    selected: false,
    icon: "/assets/images/cogs-icon.png",
  },
  {
    title: "Labor Cost Percentage",
    key: "labor_cost_percentage",
    tooltipText:
      "Percentage of your revenue that pays for labor.  Made up of prime costs and cost of goods sold.  A healthy labor cost percentage is usually around 20%–35% of sales. ",
    required: false,
    selected: false,
    icon: "/assets/images/percentage-icon.png",
  },
  {
    title: "Prime Cost",
    key: "prime_cost",
    tooltipText:
      "Total sum of your labor costs and your cost of goods sold (CoGS), including all food and liquor costs.  It affects your entire operations (how you price your menu, schedule you staff, and create your budget).  Your prime costs should be between 55% and 70%.  Too low means you could be sacrificing quality or running your staff into the ground and anything high means your costs are too high.",
    required: false,
    selected: false,
    icon: "/assets/images/dollar-icon.png",
  },
  {
    title: "Break-Even Point",
    key: "break_even_point",
    tooltipText:
      "How much revenue your business needs to earn to cover your expenses.  You never want to spend more than you’re earning.  Once you know your break-even point, you also know when you’ve covered your costs and started generating profit. ",
    required: false,
    selected: false,
    icon: "/assets/images/break-even-point-icon.png",
  },
  {
    title: "Food Cost Percentage",
    key: "food_cost_percentage",
    tooltipText:
      "Difference between what it costs to produce an item and its price on the menu.  Food cost percentage should fall between 20% and 40%, with most restaurants aiming to keep food cost around 30%.  Bar cost percentage should fall between 18% and 24% with a goal of 20%.",
    required: false,
    selected: false,
    icon: "/assets/images/food-cost-percentage.png",
  },
  {
    title: "Gross Profit & Gross Profit Margin",
    key: "gross_profit_and_margin",
    tooltipText:
      "The money your establishment makes after deducting the costs of goods sold. It can be shown as a number or a percentage (margin).  When used as a key performance indicator, most restaurants aim for a gross profit margin of around 70%.",
    required: false,
    selected: false,
    icon: "/assets/images/graph-icon.png",
  },
  {
    title: "Inventory Turnover Ration(ITR)",
    key: "inventory_turnover_ration",
    tooltipText:
      "The number of times your restaurant or bar has sold out of its total inventory during a period of time.  Keep tabs on how often you use your entire inventory to prevent overstocking or understocking your shelves.  Typically, most restaurants that have fresh ingredients aim to turn their inventory over less than seven days or between four and eight times per month.",
    required: false,
    selected: false,
    icon: "/assets/images/itr-icon.png",
  },
  {
    title: "Menu Item Profitability",
    key: "menu_item_profitability",
    required: false,
    selected: false,
    tooltipText:
      "Tells you which items on your menu are performing well and which ones aren’t.  Menu item profitability is another way to gauge the performance of a menu item.",
    icon: "/assets/images/menu-item-profitability-icon.png",
  },
  {
    title: "Net Profit Margins",
    key: "net_profit_margins",
    required: false,
    selected: false,
    tooltipText:
      "Represents the money your restaurant or bar makes after accounting for all operating costs, including CoGS, labor, rent, equipment, hardware, and utilities.  The average restaurant profit is 6%, but profit margins vary by concept. ",
    icon: "/assets/images/net-profit-margin-icon.png",
  },
  {
    title: "Bar Cost Percentage",
    key: "bar_cost_percentage",
    required: false,
    selected: false,
    tooltipText:
      "Difference between what it costs to produce an item and its price on the menu.  Food cost percentage should fall between 20% and 40%, with most restaurants aiming to keep food cost around 30%.  Bar cost percentage should fall between 18% and 24% with a goal of 20%.",
    icon: "/assets/images/bar-cost-percentage-icon.png",
  },
  {
    title: "Product Name",
    key: "product_name",
    required: true,
    icon: "/assets/images/product-name-icon.png",
  },
  {
    title: "Current Inventory Level",
    key: "current_inventory_level",
    required: true,
    icon: "/assets/images/current-inventory-level-icon.png",
  },
  {
    title: "Par Level",
    key: "par_level",
    required: true,
    icon: "/assets/images/medel-icon.png",
  },
  {
    title: "Unit of Measure",
    key: "unit_of_measure",
    required: true,
    icon: "/assets/images/unit-of-measure-icon.png",
  },
  {
    title: "Distributor/Supplier",
    key: "distributor_or_supplier",
    required: true,
    icon: "/assets/images/distributor-supplier-icon.png",
  },
  {
    title: "Rep Name",
    key: "rep_name",
    required: true,
    icon: "/assets/images/person-icon.png",
  },
  {
    title: "Rep Email",
    key: "rep_name",
    required: true,
    icon: "/assets/images/envelop-icon.png",
  },
  {
    title: "Rep Mobile Phone",
    key: "rep_mobile_name",
    required: true,
    icon: "/assets/images/mobile-icon.png",
  },
];

export const rndcData = [
  {
    rep_name: "Amy Taylor",
    rep_email: "amytaylor@gmail.com",
    rep_phone: "+1 (858) 855 0001",
    state: "Alaska",
    city: "Anchorage",
    zip_code: "99524",
    delete: "",
  },
  {
    rep_name: "Johnny Day",
    rep_email: "johnnyday@gmail.com",
    rep_phone: "+1 (858) 855 0001",
    state: "Alaska",
    city: "Anchorage",
    zip_code: "99524",
    delete: "",
  },
  {
    rep_name: "Bill Bason",
    rep_email: "billbason@gmail.com",
    rep_phone: "+1 (858) 855 0001",
    state: "Alaska",
    city: "Anchorage",
    zip_code: "99524",
    delete: "",
  },
  {
    rep_name: "Amy Taylor",
    rep_email: "amytaylor@gmail.com",
    rep_phone: "+1 (858) 855 0001",
    state: "Alaska",
    city: "Anchorage",
    zip_code: "99524",
    delete: "",
  },
];

export const prospectingCardData = [
  {
    profile_img: "/assets/images/user.png",
    client_name: "James Riggs",
    client_job_title: "Co-Owner",
    client_company_name: "Fenton River Grill",
    client_company_logo: "/assets/images/fenton-logo.png",
    lead_location: "Pomfret, Connecticut, United States",
    company_industry: "Restaurant",
    about_company: "Home - Fenton River Grill l Mansfield, CT",
    // email_body_text: `\n\nMy name is Scott, and I am the owner of KEXY Vodka, a premium vodka that has been delighting enthusiasts in our region. I recently came across the news that Fenton River Grill is running low on vodka inventory, and I wanted to present you with an exciting promotion.\n\nWe take immense pride in crafting our vodka using only the finest ingredients and employing traditional distillation methods. Our product stands out for its smoothness, exceptional quality, and impeccable taste, making it the perfect addition to your bar's offerings. With its refined flavor profile, KEXY Vodka appeals to the most discerning vodka connoisseurs and guarantees a delightful experience with every sip.\n\nTo further entice you, we are currently offering an exclusive promotion for local bars like yours. If you choose to restock your vodka inventory with KEXY Vodka, we will provide you with an irresistible discount of 50% on your first order. This is an exceptional opportunity to replenish your shelves with an outstanding vodka brand while optimizing your bottom line.\n\nI would be delighted to arrange a tasting session at your convenience, allowing you to experience firsthand the exceptional quality and flavor of KEXY Vodka. Additionally, I am available to discuss any specific requirements or answer any questions you may have regarding our product or the pricing structure.`,
    email_body_text: `\n\nMy name is Scott, and I am the owner of KEXY Vodka, a premium vodka that has been delighting enthusiasts in our region. I recently came across the news that Fenton River Grill is running low on vodka inventory, and I wanted to present you with an exciting promotion.\n\nIf you choose to restock your vodka inventory with KEXY Vodka, we will provide you with an irresistible discount of 50% on your first order. This is an exceptional opportunity to replenish your shelves with an outstanding vodka brand while optimizing your bottom line.`,
  },
  {
    profile_img: "/assets/images/schram.jpg",
    client_name: "Philip Schram",
    client_job_title: "Owner",
    client_company_name: "Wings and Rings",
    client_company_logo: "/assets/images/buffalo-logo.png",
    lead_location: "Cincinnati, Ohio, United States",
    company_industry: "Franchising",
    about_company: "Wings and Rings – Learn More About Franchising",
    email_body_text: `\n\nAs the owner of KEXY Vodka, I'm reaching out to all local bars and restaurants in the Cincinnati, Ohio, United States area with an exclusive promotion. I actually live very close to Cincinnati, Ohio, United States and as a frequent patron of your establishment, this is about the time you guys usually tend to run out of certain vodkas. KEXY Vodka is a premium gold medal winner vodka that has been delighting enthusiasts in our region for years.\n\nWe take immense pride in crafting our vodka using only the finest ingredients and employing traditional distillation methods. Our product stands out for its smoothness, exceptional quality, and impeccable taste, making it the perfect addition to your bar's offerings. With its refined flavor profile, KEXY Vodka appeals to the most discerning vodka connoisseurs and guarantees a delightful experience with every sip.\n\nIf you choose to restock your vodka inventory with KEXY Vodka, I'd be happy to offer you a special introductory discount of 50% on as many cases as you would like. This is an exceptional opportunity to replenish your shelves with an outstanding vodka brand while optimizing your bottom line.\n\nI would be delighted to arrange a tasting session at your convenience, allowing you to experience firsthand the exceptional quality and flavor of KEXY Vodka. Additionally, I am available to discuss any specific requirements or answer any questions you may have regarding our product or the pricing structure.`,
  },
];

export const menuPerformanceModalData = [
  {
    icon: "/assets/images/break-even-point-icon.png",
    message: "This is where KEXY analyzes which are your most and least valuable products.",
    categories: [],
    previous: false,
    next: true,
  },
  {
    icon: "/assets/images/angle-envelop-icon.png",
    message: "List how much your menu items cost, as well as how much you sell them to customers for.",
    categories: [],
    previous: true,
    next: true,
  },
  {
    icon: "/assets/images/bar-cost-percentage-icon.png",
    message: "Record the amount of menu items sold each day",
    categories: [],
    previous: true,
    next: false,
  },
];

export const OrderInventoryModalData = [
  {
    icon: "/assets/icon/merge-icon.svg",
    message: "We have merged the Inventory and Ordering sections.",
    categories: [],
    previous: false,
    next: true,
  },
  {
    icon: "/assets/icon/toggle-icon.svg",
    message: "Toggle back and forth between the two, and view in Board or List mode.",
    categories: [],
    previous: true,
    next: true,
  },
  {
    icon: "/assets/icon/bottle-icon.svg",
    message: "Orders are now organized by four categories:",
    categories: [
      {
        no: "01.",
        name: "Created (you sent the order)",
      },
      {
        no: "02.",
        name: "Pending (waiting for rep to confirm)",
      },
      {
        no: "03.",
        name: "Confirmed (rep received it)",
      },
      {
        no: "04.",
        name: "Received (you received your order)",
      },
    ],
    previous: true,
    next: false,
  },
];

export const reportModalData = [
  {
    icon: "/assets/icon/briefcase-icon.svg",
    message: "This section provides you with an overall snapshot of your business.",
    categories: [],
    previous: false,
    next: true,
  },
  {
    icon: "/assets/icon/statistics-icon.svg",
    message: "Manage all your key performance indicators (KPI’s) from here.",
    categories: [],
    previous: true,
    next: true,
  },
  {
    icon: "/assets/images/calendar-icon.png",
    message: "Receive reports as frequently as you would like (daily, weekly, monthly or annually)",
    categories: [],
    previous: true,
    next: false,
  },
];

export const businessOperationModalData = [
  {
    icon: "/assets/images/angle-envelop-icon.png",
    message: "This is where you enter in your daily sales, labor costs, as well as guest check counts.",
    categories: [],
    previous: false,
    next: true,
  },
  {
    icon: "/assets/images/user-with-check-icon.png",
    message:
      "By having your managers consistently complete this section, we can accurately predict your upcoming staffing requirements.",
    categories: [],
    previous: true,
    next: false,
  },
];

export const dripCampaignInitialModalData = [
  {
    icon: "/assets/images/angle-envelop-icon.png",
    message: "This is where you build out your automated AI email campaigns.",
    categories: [],
    previous: false,
    next: true,
  },
  {
    icon: "/assets/images/promotion-blue-icon.png",
    message:
      "Select one of your product promotions to be included in the campaign",
    categories: [],
    previous: true,
    next: true,
  },
  {
    icon: "/assets/images/click-blue-icon.png",
    message:
      "Make sure to click the 'Send Test Campaign' button to verify all your emails before you hit the 'Publish' button",
    categories: [],
    previous: true,
    next: false,
  },
];

export const promotionInitialModalData = [
  {
    faIcon: "",
    icon: "/assets/icon/blue-company-icon.svg",
    message: "The first thing you should do in this section is fill out all your company and product descriptions.",
    categories: [],
    previous: false,
    next: true,
  },
  {
    icon: "/assets/images/promotion-blue-icon.png",
    faIcon: "",
    message: 'If you have an Amateur or Pro account, select either "Featured Product" or "Deal" when creating your promotion.',
    categories: [],
    previous: true,
    next: true,
  },
  {
    icon: "",
    faIcon: "fa-calendar-o",
    message: "Choose how long you want your promotion to run. You cannot add expired promotions to drip campaigns",
    categories: [],
    previous: true,
    next: false,
  },
];
