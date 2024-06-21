export type LicenseIndex = {
    id: string;
    title: string;
    externalDistribution: boolean;
    nonCommons: boolean;
    licenseOnly: boolean;
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
//# sourceMappingURL=types.d.ts.map