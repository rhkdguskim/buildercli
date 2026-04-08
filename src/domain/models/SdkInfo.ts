import type { SdkType, Severity } from '../enums.js';

export interface SdkInfo {
  sdkType: SdkType;
  version: string;
  installedPath: string;
  isSelected: boolean;
  isRequired: boolean;
  status: Severity;
}
