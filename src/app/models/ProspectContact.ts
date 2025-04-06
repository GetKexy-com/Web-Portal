export class ProspectContact {
  id: string = "";
  supplier_id: string = "";
  created_at: string = "";
  email_subject: string = "";
  prospecting_conversations_messages = [];
  receiver_email: string = "";
  sender_email: string = "";
  receiver_details!: {
    id: string;
    first_name: string;
    last_name: string;
    jobTitle: string;
    companyName: string;
    companyWebsite: string;
    companyPhone: string;
    companyInfo: string;
    city: string;
    state: string;
    country: string;
  };
}

export const DUMMY_PROSPECT =
  {
    id: "57d4e077a6da9853b6ac8292",
    firstName: "Diego",
    lastName: "Bernal",
    jobTitle: "Executive Sous Chef",
    companyName: "Waldorf Astoria Monarch Beach Resort & Club",
    companyWebsite: "example.com",
    companyPhone: "+1 (234) 567-8910",
    companyInfo: "",
    city: "Irvine",
    state: "California",
    country: "United States",
  };

