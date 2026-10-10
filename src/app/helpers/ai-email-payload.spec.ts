import { aiLeadMagnets, isSuperChargedSetting, linkedinUsername } from './ai-email-payload';

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

describe('aiLeadMagnets', () => {
  it('sends the link as lead_magnet_url (what the lambda reads) beside leadMagnetUrl', () => {
    const magnet = { id: 4, title: 'SDR cost', summary: 'All-in cost', leadMagnetUrl: 'https://x.com/sdr', status: 'active', createdAt: '2026-10-01' };
    expect(aiLeadMagnets([magnet])).toEqual([
      { id: 4, title: 'SDR cost', summary: 'All-in cost', lead_magnet_url: 'https://x.com/sdr', leadMagnetUrl: 'https://x.com/sdr', status: 'active' },
    ]);
  });

  it('no magnets is an empty list', () => {
    expect(aiLeadMagnets(undefined)).toEqual([]);
    expect(aiLeadMagnets([])).toEqual([]);
  });
});
