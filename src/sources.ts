import { Attachment, Reference, Report, Location } from "./types";

export const SOURCE_MUFON = 1;
export const SOURCE_NUFORC = 2;
export const SOURCE_NICAP = 3;
export const SOURCE_UFODNA = 4;

type SourceRecord = {
  id: string;
};

export interface MufonRecord extends SourceRecord {
  submitDate: string;
  eventDate: string;
  summary: string;
  location: string;
  attachments: string[];
  description: string;
};

export interface NuforcRecord extends SourceRecord {
  event_date: string;
  reported_date: string;
  posted_date: string;
  location: string;
  shape: string;
  duration: string;
  text: string;
  characteristics: string;
  attachments: string[];
};

export interface NicapRecord extends SourceRecord {
  Date: string;
  City: string;
  'State or      Country': string;
  Cat: string;
  BB: string;
  'NC flag': string;
  LC: string;
  Description: string;
};

export interface UfoDnaRecord extends SourceRecord {
  event_date: string;
  location: string;
  text: string;
  valleeRating: string;
  hynekRating: string;
  references: number[];
};

export interface FullRecord {
  location: Location;
  report: Report;
  attachments: Attachment[];
  references: Reference[];
};
