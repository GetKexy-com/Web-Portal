export class Conversation {
  id: number;
  name: string;
  email: string;
  name_initials: string;
  last_conv_date: string;
  last_message: string;
  color: string;
  emails: ConversationEmail[];
}

export class ConversationEmail {
  body: string;
  send_time: string;
  is_opened: boolean;
  msg_send: boolean;
}
