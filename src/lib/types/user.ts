export type User = {
  _id: string;
  feidenavn?: string;
  entra: {
    id: string;
    userPrincipalName: string;
    displayName: string;
    companyName: string;
    department: string;
  }
};

export type UserAccess = {
  _id: string;
  userId: string;
  name: string;
  skolelederFor: string[];
  avdelingslederFor: string[];
}