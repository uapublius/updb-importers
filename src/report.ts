import Logger from "js-logger";
import { Knex } from 'knex';
import { FullRecord } from './sources';
import { Report, Location, Attachment, Reference } from './types';

export let createReport = (connection: Knex<any, unknown>) => async (fullRecord: FullRecord) => {
  return connection.transaction(async trx => {
    try {
      let locationRecord = await createLocation(trx, fullRecord.location);

      fullRecord.report.location = locationRecord.id;

      let reportRecord = await create(trx, fullRecord.report);

      for (const attachmentEntry of fullRecord.attachments) {
        await createAttachment(trx, attachmentEntry, reportRecord);
      }

      for (const referenceEntry of fullRecord.references) {
        if (referenceEntry.text) {
          let { id } = await createReference(trx)(referenceEntry.text);
          referenceEntry.id = id;
        }
        await createReportReference(trx, reportRecord, referenceEntry);
      }
    }
    catch (error) {
      Logger.error(error.message);
    }
  });
};

export let createReference = (connection: Knex<any, unknown>) => async (text: string) => {
  let [referenceRecord] = await connection('api.reference').insert({ text }, 'id')
    .onConflict(['hash'])
    .merge();
  return referenceRecord;
};

async function createReportReference(trx: Knex.Transaction, reportRecord: Report, referenceEntry: Reference) {
  return trx('api.report_reference').insert({ report: reportRecord.id, reference: referenceEntry.id })
    .onConflict(['report', 'reference'])
    .merge();
}

async function createAttachment(trx: Knex.Transaction, attachmentEntry: Attachment, reportRecord: Report) {
  let attachmentRecords = trx('api.attachment');
  let [attachmentRecord] = await attachmentRecords.insert({ ...attachmentEntry, report: reportRecord.id }, 'id')
    .onConflict(['url', 'report'])
    .merge();

  return attachmentRecord;
}

async function create(trx: Knex.Transaction, reportEntry: Report) {
  let reportRecords = trx('api.report');
  let [reportRecord] = await reportRecords.insert(reportEntry, 'id')
    .onConflict(['source', 'source_id'])
    .merge();

  return reportRecord;
}

async function createLocation(trx: Knex.Transaction, locationEntry: Location) {
  let locationRecords = trx('api.location');
  let [locationRecord] = await locationRecords.insert(locationEntry, 'id')
    .onConflict(['city', 'district', 'country'])
    .merge();

  return locationRecord;
}
