import { Knex } from 'knex';
import { Report, Location, Attachment } from './types';

export let createReport = (connection: Knex<any, unknown>) => async (locationEntry: Location, reportEntry: Report, attachmentEntries: Attachment[]) => {
  return connection.transaction(async (trx) => {
    let locationRecord = await addLocation(trx, locationEntry);

    reportEntry.location = locationRecord.id;

    let reportRecord = await addReport(trx, reportEntry);

    for (const attachmentEntry of attachmentEntries) {
      await addAttachment(trx, attachmentEntry, reportRecord);
    }
  });
};

async function addAttachment(trx: Knex.Transaction, attachmentEntry: Attachment, reportRecord: Report) {
  let attachmentRecords = trx('api.attachment');
  let [attachmentRecord] = await attachmentRecords.insert({ ...attachmentEntry, report: reportRecord.id }, 'id')
    .onConflict(['url', 'report'])
    .merge();

  return attachmentRecord;
}

async function addReport(trx: Knex.Transaction, reportEntry: Report) {
  let reportRecords = trx('api.report');
  let [reportRecord] = await reportRecords.insert(reportEntry, 'id')
    .onConflict(['source', 'source_id'])
    .merge();

  return reportRecord;
}

async function addLocation(trx: Knex.Transaction, locationEntry: Location) {
  let locationRecords = trx('api.location');
  let [locationRecord] = await locationRecords.insert(locationEntry, 'id')
    .onConflict(['city', 'district', 'country'])
    .merge();

  return locationRecord;
}
