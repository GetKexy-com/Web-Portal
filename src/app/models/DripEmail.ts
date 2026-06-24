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
  rawEditorContent: string = "";
  aiRawData: string = "";
  templateOptions?: string = "";
  isSpintax?: boolean = true;
}

export class EmailDelay {
  days: number = 1;
  hours: number = 0;
  minutes: number = 0;

  constructor() {

  }

  /**
   * Default gap applied to every email AFTER the first one in a drip campaign.
   * Returns a fresh object each call so per-email edits never mutate a shared
   * reference.
   */
  static default(): EmailDelay {
    return { days: 3, hours: 0, minutes: 0 };
  }

  /**
   * Delay for the FIRST email in a campaign — it goes out almost immediately.
   * Returns a fresh object each call (see above).
   */
  static firstEmail(): EmailDelay {
    return { days: 0, hours: 0, minutes: 1 };
  }
}
