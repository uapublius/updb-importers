export type Location = {
  city?: string;
  district?: string;
  country?: string;
  continent?: string;
  water?: string;
  other?: string;
};

export type Report = {
  id?: number;
  date: string;
  date_detail?: string;
  location?: number;
  description?: string;
  source: number;
  source_id: string;
};

export type Attachment = {
  url: string;
  report?: number;
};

export type Reference = {
  id?: number;
  text?: string;
};

export type Document = {
  id?: number;
  name: string;
};

export type DocumentPage = {
  document?: number;
  page?: number;
  text: string;
};