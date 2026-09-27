import { GenerateDripCampaignComponent } from './generate-drip-campaign.component';
import { IEmailSendSchedule } from '../../models/EmailSendProgress';

/**
 * The Delay card countdown: which prospect's `nextSend` a card shows. Built without
 * TestBed — this logic touches none of the component's services.
 */
describe('GenerateDripCampaignComponent next send per Delay card', () => {
  const make = () =>
    new (GenerateDripCampaignComponent as any)(...new Array(10).fill(null)) as GenerateDripCampaignComponent;

  const estimated = (earliest: string): IEmailSendSchedule => ({
    state: 'estimated',
    dueAt: earliest,
    earliestSendAt: earliest,
    latestSendAt: earliest,
    earlierEmailSequence: null,
  });
  const blocked = (state: IEmailSendSchedule['state']): IEmailSendSchedule => ({
    state,
    dueAt: null,
    earliestSendAt: null,
    latestSendAt: null,
    earlierEmailSequence: null,
  });
  const prospect = (emailSequence: number, nextSend: IEmailSendSchedule | null, status = 'active') => ({
    emailSequence: String(emailSequence),
    status,
    nextSend,
  });

  const sync = (prospects: any[]) => {
    const c = make();
    c.dripCampaignProspects = prospects;
    (c as any).__syncNextSendBySequence();
    return c.nextSendBySequence;
  };

  it('shows the soonest estimated send among the card’s prospects', () => {
    const out = sync([
      prospect(2, estimated('2026-09-28T18:00:00Z')),
      prospect(2, estimated('2026-09-28T16:00:00Z')),
      prospect(3, estimated('2026-09-30T09:00:00Z')),
    ]);
    expect(out[2]?.earliestSendAt).toBe('2026-09-28T16:00:00Z');
    expect(out[3]?.earliestSendAt).toBe('2026-09-30T09:00:00Z');
  });

  it('prefers a countdown over a blocked schedule', () => {
    const out = sync([prospect(2, blocked('unknown')), prospect(2, estimated('2026-09-28T16:00:00Z'))]);
    expect(out[2]?.state).toBe('estimated');
  });

  it('keeps a blocked schedule when nothing can count down, so the card says why', () => {
    expect(sync([prospect(2, blocked('research'))])[2]?.state).toBe('research');
  });

  it('ignores prospects that are not active', () => {
    expect(sync([prospect(2, estimated('2026-09-28T16:00:00Z'), 'pause')])[2]).toBeUndefined();
  });
});
