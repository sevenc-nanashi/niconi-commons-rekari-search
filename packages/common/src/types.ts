export type LicenseIndex = {
  id: string;
  title: string;
  externalDistribution: boolean;
  nonCommons: boolean;
  licenseOnly: boolean;
  childrenCount: number;
};

export type ExternalDistribution = {
  id: string;
  title: string;
  filesInCommons: string;
  category: string;
  description: string;
  uploader: string;
  relatedUrl: string;
  usage: string;
  parentRegistration: string;
  rights: string;
  preferredRights: string;
  personalMonetization: string;
  corporateMonetization: string;
  personalCommercialUse: string;
  corporateCommercialUse: string;
  customConditions: string;
  childrenCount: number;
};

export type NonCommons = {
  id: string;
  title: string;
  description: string;
  uploader: string;
  childrenCount: number;
};

export type LicenseOnly = ExternalDistribution;

export type SearchResponse = {
  count: number;
  results: LicenseInfo[];
};

export type LicenseInfo = {
  id: string;
  title: string;
  childrenCount: number;

  externalDistribution: ExternalDistribution | null;
  nonCommons: NonCommons | null;
  licenseOnly: LicenseOnly | null;
};
