import { LicenseInfo } from "@workspace/common/dist/types";

export const getDescription = (licenseInfo: LicenseInfo) =>
  licenseInfo.licenseOnly?.description ??
  licenseInfo.externalDistribution?.description ??
  licenseInfo.nonCommons?.description ??
  "（説明なし）";

export const getUploader = (licenseInfo: LicenseInfo) =>
  licenseInfo.licenseOnly?.uploader ??
  licenseInfo.externalDistribution?.uploader ??
  licenseInfo.nonCommons?.uploader ??
  "（不明）";
