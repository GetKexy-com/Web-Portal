import { ProspectProfileContentComponent } from './prospect-profile-content.component';

/** The "where this email stands" box under Lead strength (`__recomputeReply`). */
describe('ProspectProfileContentComponent reply box', () => {
  const make = (emailSequence: number, timeline: any[]) => {
    const c = new ProspectProfileContentComponent(null as any, null as any);
    c.emailSequence = emailSequence;
    c.timeline = timeline;
    return c;
  };
  const sent = (engagement: any = {}) => ({ status: 'sent', engagement }) as any;
  const replied = (n: number, at = '2026-10-09T14:19:00Z') => ({ kind: 'replied', emailSequence: n, at });

  it('names a reply to another email instead of "No reply yet"', () => {
    const c = make(1, [replied(5)]);
    (c as any).__recomputeReply(sent({ clickedAt: '2026-10-09T13:13:00Z' }));
    expect(c.replyBox?.tone).toBe('positive');
    expect(c.replyBox?.title).toContain('Replied to Email 5');
    expect(c.replyBox?.message).toContain('No reply to Email 1 itself');
    // Still no pill: THIS email was not replied to.
    expect(c.replyPill).toBeNull();
  });

  it('says "No reply yet" when there is no reply anywhere', () => {
    const c = make(1, [{ kind: 'clicked', emailSequence: 1, at: '2026-10-09T13:13:00Z' }]);
    (c as any).__recomputeReply(sent({ clickedAt: '2026-10-09T13:13:00Z' }));
    expect(c.replyBox?.title).toBe('No reply yet.');
  });

  it('a reply to this email is still the reply pill and box', () => {
    const c = make(5, [replied(5)]);
    (c as any).__recomputeReply(sent({ repliedAt: '2026-10-09T14:19:00Z' }));
    expect(c.replyPill).not.toBeNull();
    expect(c.replyBox?.title).toContain('Replied to Email 5');
  });
});
