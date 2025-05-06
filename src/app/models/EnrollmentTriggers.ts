export class EnrollmentTriggers {
  id: number;
  settingsType: string;
  settingsValue: { value: boolean }[];
  createdAt: string;
  updatedAt: string;

  constructor(rawData: IRawEnrollmentTrigger) {
    this.id = rawData.id;
    this.settingsType = rawData.settingsType;
    this.settingsValue = JSON.parse(rawData.settingsValue);
    this.createdAt = rawData.createdAt;
    this.updatedAt = rawData.updatedAt;
  }
}

export interface IRawEnrollmentTrigger {
  id: number;
  settingsType: string;
  settingsValue: string; // This will be parsed to { value: boolean }[]
  createdAt: string;
  updatedAt: string;
}
