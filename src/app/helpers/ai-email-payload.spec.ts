import { companyLinkedinUrl, isSuperChargedSetting, linkedinUsername, superchargeForAi } from './ai-email-payload';

describe('isSuperChargedSetting', () => {
  it('reads the toggle, string or parsed', () => {
    expect(isSuperChargedSetting([{ settingsType: 'super_charged', settingsValue: '[{"value":true}]' }])).toBe(true);
    expect(isSuperChargedSetting([{ settingsType: 'super_charged', settingsValue: [{ value: false }] }])).toBe(false);
  });

  it('no row or an unreadable value is off', () => {
    expect(isSuperChargedSetting([{ settingsType: 'run_time', settingsValue: '[{"value":true}]' }])).toBe(false);
    expect(isSuperChargedSetting(undefined)).toBe(false);
    expect(isSuperChargedSetting([{ settingsType: 'super_charged', settingsValue: 'oops' }])).toBe(false);
  });
});

describe('linkedinUsername', () => {
  it('reads a personal profile only', () => {
    expect(linkedinUsername('https://www.linkedin.com/in/maria-chen?x=1')).toBe('maria-chen');
    expect(linkedinUsername('https://www.linkedin.com/company/acme')).toBe('');
    expect(linkedinUsername(undefined)).toBe('');
  });
});

describe('companyLinkedinUrl', () => {
  it('reads organization in either key style', () => {
    expect(companyLinkedinUrl({ organization: { linkedinUrl: 'https://www.linkedin.com/company/acme' } })).toBe(
      'https://www.linkedin.com/company/acme',
    );
    expect(companyLinkedinUrl({ organization: { linkedin_url: 'https://linkedin.com/school/ut' } })).toBe(
      'https://linkedin.com/school/ut',
    );
  });

  it("ignores the CSV import's bare placeholder", () => {
    expect(companyLinkedinUrl({ organization: { linkedinUrl: 'https://www.linkedin.com' } })).toBeNull();
    expect(companyLinkedinUrl({})).toBeNull();
  });
});

describe('superchargeForAi', () => {
  it('is false for now, even when the campaign was activated Super charged', () => {
    expect(superchargeForAi([{ settingsType: 'super_charged', settingsValue: '[{"value":true}]' }])).toBe(false);
  });
});
