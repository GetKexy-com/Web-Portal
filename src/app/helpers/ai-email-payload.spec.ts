import { isSuperChargedSetting, linkedinUsername, superchargeForAi } from './ai-email-payload';

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

describe('superchargeForAi', () => {
  it('follows the saved toggle', () => {
    expect(superchargeForAi([{ settingsType: 'super_charged', settingsValue: '[{"value":true}]' }])).toBe(true);
    expect(superchargeForAi([{ settingsType: 'super_charged', settingsValue: '[{"value":false}]' }])).toBe(false);
  });

  it('is false when the campaign never saved the toggle', () => {
    expect(superchargeForAi([])).toBe(false);
    expect(superchargeForAi(null)).toBe(false);
  });
});
