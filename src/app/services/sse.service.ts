import { inject, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DripEmail, EmailDelay } from '../models/DripEmail';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SseService {
  private subjectStartSign = '^^';
  private subjectEndSign = '$$';
  public emailErrorSign = '@@';
  public paraStartSign = '[[PARA]]';
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

  private authService = inject(AuthService);

  /**
   * Starts one of the AI email streams through KexyApi (`POST ai-stream/:kind`), which calls the
   * Lambda and passes its stream through unchanged. These used to call the Lambda URLs straight
   * from the browser, which put the URLs in this public bundle (KexyApi docs/lambda-security.md,
   * step 2). Same request headers and body as before; the login token is added here because
   * `fetch` does not go through the JWT interceptor.
   *
   * The parsers below never look at the HTTP status, only at the text (an error is `@@…@@`).
   * So when KexyApi refuses before streaming (e.g. 401, expired login), its JSON error is turned
   * into that same `@@message@@` text, and the existing error path handles it as before.
   */
  private __aiStream = async (
    kind: 'drip-bulk' | 'drip-bulk-user-prompt' | 'drip-follow-up',
    data,
  ): Promise<Response> => {
    const token = this.authService.userTokenValue?.token;
    const response = await fetch(`${environment.baseUrl}ai-stream/${kind}`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream,application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    });
    if (response.ok) return response;
    const err = await response.json().catch(() => null);
    const message =
      response.status === 401
        ? 'Your session has expired. Please log in again.'
        : err?.message || 'Could not generate the email. Please try again.';
    return new Response(`${this.emailErrorSign}${message}${this.emailErrorSign}`);
  };

  getDripFollowUpEmailContentStream = async (data) => {
    this._dripSingleEmailLoading.next(true);
    this._dripSingleEmailContent.next('');
    this._dripSingleEmailSubject.next('');
    let subjectReady = false;
    let emailContent = '';
    let fullStreamData = '';
    this.__aiStream('drip-follow-up', data)
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

  dripBulkEmailContentStream = async (data, userPromptPriority = false) => {
    let emails: DripEmail[] = [];
    let emailSequence = 1;

    let emailSubject = '';
    let emailContent = '';
    let aiEmailData = '';

    let delayBetweenPreviousEmail: EmailDelay = EmailDelay.default();

    let buffer = '';

    enum State {
      WAITING_SUBJECT,
      READING_SUBJECT,
      READING_CONTENT,
    }

    let state: State = State.WAITING_SUBJECT;

    this._dripBulkEmailLoading.next(true);

    try {
      const response = await this.__aiStream(userPromptPriority ? 'drip-bulk-user-prompt' : 'drip-bulk', data);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (value) {
          const chunk = decoder.decode(value);
          buffer += chunk;
          aiEmailData += chunk;

          // Handle error stream
          if (buffer.includes(this.emailErrorSign)) {
            this.addToEmailError(buffer);
            this._dripBulkEmailLoading.next(false);
            return;
          }

          // Process buffer safely
          while (buffer.length > 0) {
            // 🔵 WAITING FOR SUBJECT START
            if (state === State.WAITING_SUBJECT) {
              const startIdx = buffer.indexOf(this.subjectStartSign);

              if (startIdx === -1) {
                // No subject start yet → discard junk before it
                buffer = '';
                break;
              }

              // Remove everything before ^^
              buffer = buffer.substring(startIdx + this.subjectStartSign.length);
              state = State.READING_SUBJECT;
            }

            // 🟡 READING SUBJECT
            else if (state === State.READING_SUBJECT) {
              const endIdx = buffer.indexOf(this.subjectEndSign);

              if (endIdx === -1) {
                // Subject not complete yet → wait for next chunk
                emailSubject += buffer;
                buffer = '';
                break;
              }

              // Extract subject
              emailSubject += buffer.substring(0, endIdx);

              // Move buffer forward
              buffer = buffer.substring(endIdx + this.subjectEndSign.length);

              state = State.READING_CONTENT;
            }

            // 🟢 READING CONTENT
            else if (state === State.READING_CONTENT) {
              const newEmailIdx = buffer.indexOf(this.newEmailStartSign);

              if (newEmailIdx === -1) {
                // No new email yet → all is content
                emailContent += buffer;
                buffer = '';
                break;
              }

              // Extract content until next email
              emailContent += buffer.substring(0, newEmailIdx);

              // Finalize current email
              const formattedContent = this.__formatEmailContent(emailContent);

              // First email starts almost immediately; the rest keep the default delay.
              const emailDelay: EmailDelay =
                emailSequence === 1
                  ? EmailDelay.firstEmail()
                  : delayBetweenPreviousEmail;

              const email: DripEmail = {
                delayBetweenPreviousEmail: emailDelay,
                emailSequence,
                emailSubject,
                emailContent: formattedContent,
                rawEditorContent: formattedContent,
                aiRawData: aiEmailData,
              };

              emails.push(email);
              this.addToDripBulkEmails(emails);

              // Reset for next email
              emailSequence++;
              emailSubject = '';
              emailContent = '';
              aiEmailData = '';

              // Move buffer forward past #####
              buffer = buffer.substring(
                newEmailIdx + this.newEmailStartSign.length
              );

              state = State.WAITING_SUBJECT;
            }
          }
        }

        // 🔚 STREAM END
        if (done) {
          if (emailSubject && emailContent) {
            const formattedContent = this.__formatEmailContent(emailContent);

            // First email starts almost immediately; the rest keep the default delay.
            const emailDelay: EmailDelay =
              emailSequence === 1
                ? EmailDelay.firstEmail()
                : delayBetweenPreviousEmail;

            const email: DripEmail = {
              delayBetweenPreviousEmail: emailDelay,
              emailSequence,
              emailSubject,
              emailContent: formattedContent,
              rawEditorContent: formattedContent,
              aiRawData: aiEmailData,
            };

            emails.push(email);
            this.addToDripBulkEmails(emails);
          }

          this._dripBulkEmailLoading.next(false);
          return;
        }
      }
    } catch (err) {
      console.error(err);
      this._dripBulkEmailLoading.next(false);
    }
  };

  setupEmptyDripEmailTemplate = ({ count }) => {
    let emails: DripEmail[] = [];
    let delayBetweenPreviousEmail: EmailDelay = EmailDelay.default();
    this._dripBulkEmailLoading.next(true);
    if (count < 1) {
      return;
    }

    for (let i = 0; i < count; i++) {
      // First email starts almost immediately; the rest keep the default delay.
      const emailDelay: EmailDelay =
        i === 0 ? EmailDelay.firstEmail() : delayBetweenPreviousEmail;
      const email: DripEmail = {
        delayBetweenPreviousEmail: emailDelay,
        emailSequence: i + 1,
        emailSubject: `Subject ${i + 1}`,
        emailContent: `Content ${i + 1}`,
        rawEditorContent: `Content ${i + 1}`,
        aiRawData: `Content ${i + 1}`,
      };
      emails.push(email);
      this.addToDripBulkEmails(emails);
    }
    this._dripBulkEmailLoading.next(false);
  };

  __formatEmailContent: (content: string) => string = (content: string): string => {

    const separators = ['[[[PARA]]]', '[[PARA]]]'];

    let result = content;
    separators.forEach(sep => {
      result = result.split(sep).join(this.paraStartSign); // normalize to one;
    });

    let paraArray = result.split(this.paraStartSign);
    console.log({ paraArray });

    const lastPara = paraArray.pop()
      .replace(/^\n/, '')
      .replace(/^\\n/, '<br>')
      .replace(/\n/g, '<br>');

    paraArray = paraArray.map((para) => {
      return para.replace(/\n/g, '');
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
    if (freshStart) {
      this._dripSingleEmailContent.next('');
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
