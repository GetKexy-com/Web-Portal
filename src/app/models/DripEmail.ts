export class DripEmail {
  id?: number;
  drip_campaign_id?: number;
  created_at?: string = "";
  email_sequence: number;
  is_email_sent?: boolean = false;
  previous_email_send_time?: string = "";
  delay_between_previous_email?: EmailDelay;
  email_subject: string = "";
  email_content: string = "";
}

export class EmailDelay {
  days: number = 1;
  hours: number = 0;
  minutes: number = 0;

  constructor() {

  }
}
