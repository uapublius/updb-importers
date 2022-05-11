import { Knex } from "knex";
import { Document, DocumentPage } from "./types";

export function createDocument(connection: Knex<any, unknown>) {
  return async (document: Document) => {
    let [documentRecord] = await connection("api.document")
      .insert(document, "id")
      .onConflict(["name"])
      .merge();

    return documentRecord;
  };
}

export function createDocumentPages(connection: Knex<any, unknown>) {
  return async (document: Record<string, any>, documentId: number) => {
    let numPages = Math.max(...Object.keys(document).map(k => parseInt(k)));

    let rows: DocumentPage[] = [];

    for (let idx = 0; idx < numPages; idx++) {
      rows.push({ text: document[idx], page: idx + 1, document: documentId });
    }

    rows = rows.filter(row => row.text);

    connection.batchInsert("api.document_page", rows);
  };
}
