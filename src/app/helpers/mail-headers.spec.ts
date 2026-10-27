import { parseMailHeaders } from './mail-headers';

describe('parseMailHeaders', () => {
  it('splits each header into a name and value', () => {
    const rows = parseMailHeaders(
      'From: Scott Graham <sg@getkexy.com>\r\nReply-To: scott+3043@gokexy.com\r\nSubject: Quick question',
    );
    expect(rows).toEqual([
      { name: 'From', value: 'Scott Graham <sg@getkexy.com>' },
      { name: 'Reply-To', value: 'scott+3043@gokexy.com' },
      { name: 'Subject', value: 'Quick question' },
    ]);
  });

  it('joins a folded line onto the header above it', () => {
    const rows = parseMailHeaders(
      'Content-Type: multipart/alternative;\r\n boundary="--_NmP-abc"\r\nMIME-Version: 1.0',
    );
    expect(rows).toEqual([
      { name: 'Content-Type', value: 'multipart/alternative; boundary="--_NmP-abc"' },
      { name: 'MIME-Version', value: '1.0' },
    ]);
  });

  it('keeps colons inside the value', () => {
    expect(parseMailHeaders('List-Unsubscribe: <https://go.kexyapp.com/u?t=1>')).toEqual([
      { name: 'List-Unsubscribe', value: '<https://go.kexyapp.com/u?t=1>' },
    ]);
  });

  it('returns nothing for no headers', () => {
    expect(parseMailHeaders(null)).toEqual([]);
    expect(parseMailHeaders('')).toEqual([]);
  });
});
