import { Injectable } from '@nestjs/common';

export interface OutboxEntry {
  phone: string;
  code: string;
  sentAt: Date;
}

/**
 * In-memory record of the latest OTPs sent by MockOtpProvider so the admin
 * panel can read a code out to a customer (Phase 1 has no SMS). Never persisted:
 * the database only stores hashes. Single API instance assumed (see REQUIREMENTS).
 */
@Injectable()
export class OtpOutbox {
  private readonly entries: OutboxEntry[] = [];
  private readonly capacity = 50;

  add(entry: OutboxEntry): void {
    this.entries.unshift(entry);
    this.entries.length = Math.min(this.entries.length, this.capacity);
  }

  latest(): OutboxEntry[] {
    return [...this.entries];
  }
}
