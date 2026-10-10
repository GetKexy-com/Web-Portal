import { stateShortForm } from './state-short-form';

describe('stateShortForm', () => {
  it('shows a US state or Canadian province as its postal code', () => {
    expect(stateShortForm('New York State')).toBe('NY');
    expect(stateShortForm('New York')).toBe('NY');
    expect(stateShortForm('new york')).toBe('NY');
    expect(stateShortForm('California')).toBe('CA');
    expect(stateShortForm('  Washington  ')).toBe('WA');
    expect(stateShortForm('Ontario')).toBe('ON');
    expect(stateShortForm('British Columbia Province')).toBe('BC');
  });

  it('keeps D.C. apart from Washington state', () => {
    expect(stateShortForm('Washington D.C.')).toBe('DC');
    expect(stateShortForm('District of Columbia')).toBe('DC');
    expect(stateShortForm('Washington State')).toBe('WA');
  });

  it('upper-cases a code already short', () => {
    expect(stateShortForm('ny')).toBe('NY');
    expect(stateShortForm('CA')).toBe('CA');
  });

  it('leaves anything it does not recognise as it was', () => {
    expect(stateShortForm('Bavaria')).toBe('Bavaria');
    expect(stateShortForm('')).toBe('');
    expect(stateShortForm(null)).toBe('');
    expect(stateShortForm(undefined)).toBe('');
  });
});
