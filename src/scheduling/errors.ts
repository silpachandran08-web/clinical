export class SlotUnavailableError extends Error {
  constructor(slotId: string) {
    super(`Slot ${slotId} is no longer available`);
    this.name = "SlotUnavailableError";
  }
}
