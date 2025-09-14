export class DripEmail {
  id?: number;
  drip_campaign_id?: number;
  created_at?: string = "";
  emailSequence: number;
  is_email_sent?: boolean = false;
  previous_email_send_time?: string = "";
  delayBetweenPreviousEmail?: EmailDelay;
  emailSubject: string = "";
  emailContent: string = "";
  aiRawData: string = "";
  isSpintax?: boolean = true;
}

export class EmailDelay {
  days: number = 1;
  hours: number = 0;
  minutes: number = 0;

  constructor() {

  }
}
