/**
 * Injectable source of "now". Every rule that depends on time (cutoffs, OTP
 * expiry, token expiry, scheduling) must read the time from here so tests can
 * pin it to an exact IST moment.
 */
export abstract class Clock {
  abstract now(): Date;
}

export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

/** Test clock. `new FixedClock('2026-11-09T09:59:00+05:30')`. */
export class FixedClock extends Clock {
  private current: Date;

  constructor(start: Date | string) {
    super();
    this.current = new Date(start);
  }

  now(): Date {
    return new Date(this.current);
  }

  set(at: Date | string): void {
    this.current = new Date(at);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
