import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DripEmail, EmailDelay } from '../models/DripEmail';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SseService {
  private subjectStartSign = '^^';
  private subjectEndSign = '$$';
  public emailErrorSign = '@@';
  public paraStartSign = '[[[PARA]]]';
  private newEmailStartSign = '~~';

  //********
  // Prospect Email Related Variables
  private _prospectEmailContent = new BehaviorSubject('');
  prospectEmailContent = this._prospectEmailContent.asObservable();

  private _prospectEmailSubject = new BehaviorSubject('');
  prospectEmailSubject = this._prospectEmailSubject.asObservable();

  private _prospectEmailError = new BehaviorSubject('');
  prospectEmailError = this._prospectEmailError.asObservable();

  private _prospectEmailContentLoading = new BehaviorSubject(false);
  prospectEmailContentLoading = this._prospectEmailContentLoading.asObservable();
  // End of Prospect Email Related Variables
  //********

  //********
  // Drip Single Email Related Variables
  private _dripSingleEmailContent = new BehaviorSubject('');
  dripSingleEmailContent = this._dripSingleEmailContent.asObservable();

  private _dripSingleEmailSubject = new BehaviorSubject('');
  dripSingleEmailSubject = this._dripSingleEmailSubject.asObservable();

  private _dripSingleEmailLoading = new BehaviorSubject(false);
  dripSingleEmailLoading = this._dripSingleEmailLoading.asObservable();

  private _dripSingleEmailError = new BehaviorSubject('');
  dripSingleEmailError = this._dripSingleEmailError.asObservable();
  // End of Drip Single Email Related Variables
  //********

  //********
  // Drip Bulk Email Related Variables
  private _dripBulkEmails = new BehaviorSubject([]);
  dripBulkEmails = this._dripBulkEmails.asObservable();

  private _dripBulkEmailError = new BehaviorSubject('');
  dripBulkEmailError = this._dripBulkEmailError.asObservable();

  private _dripBulkEmailLoading = new BehaviorSubject(false);
  dripBulkEmailLoading = this._dripBulkEmailLoading.asObservable();
  // End of Drip Bulk Email Related Variables
  //********

  newEmailGenerateApiUrl = environment.newEmailGenerateApiUrl;
  oldConversationEmailGenerateApiUrl = environment.oldConversationEmailGenerateApiUrl;
  dripBulkEmailApiUrl = environment.dripBulkEmailApiUrl;
  dripFollowUpEmailApiUrl = environment.dripFollowUpEmailApiUrl;

  getEmailContentStream = (data, newEmail = true) => {
    this._prospectEmailContent.next('');
    this._prospectEmailSubject.next('');
    this._prospectEmailContentLoading.next(true);
    let subjectReady = false;
    const url = newEmail ? this.newEmailGenerateApiUrl : this.oldConversationEmailGenerateApiUrl;
    fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream,application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    })
      // Retrieve its body as ReadableStream
      .then(async (response) => {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader?.read();
          if (value) {
            let str = new TextDecoder().decode(value);
            // @@ is a prefix ONLY show when an error occur
            if (str.includes(this.emailErrorSign)) {
              this.addToEmailError(str);
              this._prospectEmailContentLoading.next(false);
              return;
            }

            str = this.__filterSubject(str);
            let contentStart = false;

            if (str.indexOf('\n\n') === -1 && !subjectReady) {
              this.addToEmailSubject(str);
            } else if (str.indexOf('\n\n') > -1 && !subjectReady) {
              let position = str.indexOf('\n\n');
              let newStr = str.split('\n\n');
              subjectReady = true;
              if (position === 0) {
                str = str.replace('\n\n', '');
                this.addToEmailContent(str);
              } else {
                this.addToEmailSubject(newStr[0]);
                const emailContent = newStr[1].replaceAll('\n\n', '<p>');
                this.addToEmailContent(emailContent);
              }
            } else if (subjectReady) {
              if (!contentStart) {
                str = str.replaceAll('\n\n', '<p>');
                contentStart = true;
              } else {
                str = str.replaceAll('\n\n', '</p><p>');
              }
              str = str.replaceAll('\n', '<br>');
              this.addToEmailContent(str);
            }

          }
          if (done) {
            this._prospectEmailContentLoading.next(false);
            return;
          }
        }

      })
      .catch((err) => console.error(err));
  };

  getDripFollowUpEmailContentStream = async (data) => {
    this._dripSingleEmailLoading.next(true);
    this._dripSingleEmailContent.next('');
    this._dripSingleEmailSubject.next('');
    let subjectReady = false;
    let emailContent = '';
    let fullStreamData = '';
    const url = this.dripFollowUpEmailApiUrl;
    fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream,application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    })
      // Retrieve its body as ReadableStream
      .then(async (response) => {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader?.read();
          if (value) {
            let str = new TextDecoder().decode(value);
            fullStreamData += str;
            // console.log({ str });
            // @@ is a prefix ONLY show when an error occur
            if (str.includes(this.emailErrorSign)) {
              this.addToDripSingleEmailError(str);
              this._dripSingleEmailLoading.next(false);
              return;
            }

            if (str.includes(this.subjectStartSign)) {
              // AI send "Subject:" as one stream object for 1st dripEmail. So we filter it here.
              str = str.replace(this.subjectStartSign, '');
              this.addToSingleEmailSubject(str);
            } else {
              let contentStart = false;

              if (str.indexOf(this.subjectEndSign) === -1 && !subjectReady) {
                this.addToSingleEmailSubject(str);
              } else if (str.indexOf(this.subjectEndSign) > -1 && !subjectReady) {
                let newStr = str.split(this.subjectEndSign);
                this.addToSingleEmailSubject(newStr[0]);
                emailContent += newStr[1];
                subjectReady = true;
              } else if (subjectReady) {
                if (!contentStart) {
                  contentStart = true;
                }
                emailContent += str;
              }
            }

            if (emailContent.length > 10) {
              emailContent = emailContent
                .replaceAll(this.paraStartSign, '<p>');
              this.addToSingleEmailContent(emailContent);
              emailContent = '';
            }
          }

          if (done) {
            console.log({ fullStreamData });
            let newCon = fullStreamData.split('$$').pop();
            emailContent = this.__formatEmailContent(newCon);
            this.addToSingleEmailContent(emailContent, true);
            this._dripSingleEmailLoading.next(false);
            return;
          }
        }

      })
      .catch((err) => console.error(err));
  };

  dripBulkEmailContentStream = async (data) => {
    let emails: DripEmail[] = [];
    let emailSequence = 1;
    let emailSubject = '';
    let emailContent = '';
    let aiEmailData = '';
    let delayBetweenPreviousEmail: EmailDelay = { days: 3, hours: 0, minutes: 0 };
    this._dripBulkEmailLoading.next(true);
    let subjectReady = false;
    const url = this.dripBulkEmailApiUrl;
    fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream,application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    })
      // Retrieve its body as ReadableStream
      .then(async (response) => {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader?.read();
          if (value) {
            let str = new TextDecoder().decode(value);
            console.log({ str });
            // @@ is a prefix ONLY show when an error occur
            if (str.includes(this.emailErrorSign)) {
              this.addToEmailError(str);
              this._dripBulkEmailLoading.next(false);
              return;
            }

            // "#####" (newEmailStartSign variable) means a new dripEmail content is started here and
            // completed previous dripEmail content So we push content of previous Email in here
            // and start the new dripEmail content.
            if (str.includes(this.newEmailStartSign)) {
              let currentAiData = aiEmailData;
              let current_subject = emailSubject;
              let current_content = emailContent;
              emailSubject = '';
              emailContent = '';
              subjectReady = false;

              // There are times we get the stream like this - "thrilled##### \n\n^^Welcome to"
              // In the case above, we have a part that is connect to the previous email and another
              // part is the starting of subject for the next email.
              // That's why we split the stream string with ### and
              // add first part to the previous email_content, last part to the email_subject for next email
              let cleanStr = str.split(this.newEmailStartSign);
              current_content += cleanStr[0];
              currentAiData += cleanStr[0];
              aiEmailData = cleanStr[1];
              emailSubject = cleanStr[1].replace(this.subjectStartSign, '');

              // Check if the subject has the end sign in here.
              // If it has then we have to end the subject and start the content
              if (emailSubject.indexOf(this.subjectEndSign) > -1 && !subjectReady) {
                let newStr = emailSubject.split(this.subjectEndSign);
                emailSubject = newStr[0];
                // If subject and content in one stream then before content start '\n\n' needs to be
                // replaced by [[[para]]] so we can parse it nicely later.
                emailContent += newStr[1].replaceAll('\n\n', this.paraStartSign);
                subjectReady = true;
              }

              if (current_content) {
                current_content = this.__formatEmailContent(current_content);
                const email: DripEmail = {
                  delayBetweenPreviousEmail,
                  emailSequence,
                  emailSubject: current_subject,
                  emailContent: current_content,
                  aiRawData: currentAiData,
                };
                emails.push(email);
                this.addToDripBulkEmails(emails);
                // Increment email_sequence by 1 so next dripEmail sequence is set to next number.
                emailSequence += 1;
              }

              // !!!! IMPORTANT !!!
              // We have to stop the current loop here and reset 'email_content' variable because new Email is started
              // and content needs to be restarted from scratch. If we do not stop current loop then
              // new Email content will be added to the previous dripEmail instead of new dripEmail.
              // email_content = "";

              continue;
            }

            if (str.includes(this.subjectStartSign)) {
              aiEmailData += str;
              // AI send "^^" as one stream object for 1st dripEmail. So we filter it here.
              str = str.replace(this.subjectStartSign, '');
              emailSubject += str;
            } else {
              aiEmailData += str;
              let contentStart = false;

              if (str.indexOf(this.subjectEndSign) === -1 && !subjectReady) {
                emailSubject += str;
              } else if (str.indexOf(this.subjectEndSign) > -1 && !subjectReady) {
                let newStr = str.split(this.subjectEndSign);
                emailSubject += newStr[0];
                subjectReady = true;
              } else if (subjectReady) {
                if (!contentStart) {
                  contentStart = true;
                }
                emailContent += str;
              }
            }
          }

          if (done) {
            if (emailSubject && emailContent) {
              emailContent = this.__formatEmailContent(emailContent);
              const email: DripEmail = {
                delayBetweenPreviousEmail,
                emailSequence,
                emailSubject,
                emailContent,
                aiRawData: aiEmailData,
              };
              emails.push(email);
              this.addToDripBulkEmails(emails);
            }
            this._dripBulkEmailLoading.next(false);
            return;
          }
        }

      })
      .catch((err) => console.error(err));
  };

  __formatEmailContent: (content: string) => string = (content: string): string => {
    let paraArray = content.split(this.paraStartSign);
    console.log({ paraArray });

    const lastPara = paraArray.pop()
      .replace(/^\n/, "")
      .replace(/\n/g, "<br>");

    paraArray = paraArray.map((para) => {
      return para.replace(/\n/g, "");
    });
    console.log({ lastPara });
    paraArray.push(lastPara);
    return paraArray.join('<p>');
  };

  __filterSubject = (str) => {
    if (str.includes('Subject:')) {
      // AI send "Subject:" as one stream object for 1st dripEmail. So we filter it here.
      str = str.replace('Subject:', '');
    } else if (str.includes('\n\nSubject')) {
      // Sometime AI send "Subject" and ":" in different stream object. So we filter it here.
      str = str.replace('\n\nSubject', '');
    }
    return str;
  };


  addToDripBulkEmails(emails) {
    this._dripBulkEmails.next(emails);
  }

  updateDripBulkEmail(email) {
    let emails = [...this._dripBulkEmails.getValue()];
    // If user update email that was not saved to DB yet.
    console.log('email', email);
    console.log('allEmails', emails);
    let index = -1;
    if (!email.id) {
      index = emails.findIndex((e) => e.emailSequence === email.emailSequence);
    } else {
      index = emails.findIndex((e) => e.id === email.id);
    }
    if (index !== -1) {
      emails[index] = email;
    }
    this._dripBulkEmails.next(emails);
  }

  // addToDripBulkEmailError(chunk) {
  //   let content = this._dripBulkEmailError.getValue();
  //   content += chunk;
  //   this._dripBulkEmailError.next(content);
  // }

  removeDripBulkEmailData = () => {
    this._dripBulkEmails.next([]);
  };

  addToEmailContent(chunk) {
    let content = this._prospectEmailContent.getValue();
    content += chunk;
    this._prospectEmailContent.next(content);
  }

  addToEmailSubject(chunk) {
    let content = this._prospectEmailSubject.getValue();
    content += chunk;
    this._prospectEmailSubject.next(content);
  }

  addToSingleEmailContent(chunk, freshStart = false) {
    if(freshStart) {
      this._dripSingleEmailContent.next("");
      this._dripSingleEmailContent.next(chunk);
      return;
    }
    let content = this._dripSingleEmailContent.getValue();
    content += chunk;
    this._dripSingleEmailContent.next(content);
  }

  addToSingleEmailSubject(chunk) {
    let content = this._dripSingleEmailSubject.getValue();
    content += chunk;
    this._dripSingleEmailSubject.next(content);
  }

  addToEmailError(chunk) {
    let content = this._prospectEmailError.getValue();
    content += chunk;
    this._prospectEmailError.next(content);
  }

  addToDripSingleEmailError(chunk) {
    let content = this._dripSingleEmailError.getValue();
    content += chunk;
    this._dripSingleEmailError.next(content);
  }

  // removeEmailData = () => {
  //   this._prospectEmailContent.next("");
  //   this._prospectEmailSubject.next("");
  // };

  removeSingleEmailData = () => {
    this._dripSingleEmailContent.next('');
    this._dripSingleEmailSubject.next('');
  };
}
