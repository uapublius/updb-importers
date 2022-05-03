import { Knex } from 'knex';
import { Document, DocumentPage } from './types';

export function createDocument(connection: Knex<any, unknown>) {
  return async (document: Document) => {
    let [documentRecord] = await connection('api.document')
      .insert(document, 'id')
      .onConflict(['name'])
      .merge();

    return documentRecord;
  };
}

export function createDocumentPage(connection: Knex<any, unknown>) {
  return async (page: DocumentPage) => {
    if (!page.text) return;

    await connection('api.document_page')
      .insert(page)
      .onConflict(['document', 'page'])
      .merge();
  };
}
