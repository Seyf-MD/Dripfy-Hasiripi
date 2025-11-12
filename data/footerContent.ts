import websiteCopy from './websiteContent.json';

export interface FooterContent {
  companyName: string;
  addressLines: string[];
  email: string;
  phone: string;
}

export const footerContent: FooterContent = {
  ...websiteCopy.footer,
};
