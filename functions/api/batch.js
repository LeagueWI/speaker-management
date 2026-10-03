import { json, errorResponse, upsertRecord } from './lib/jotform.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const records = Array.isArray(body) ? body : body.records;
    if (!Array.isArray(records)) return json({ ok: false, error: 'records array is required' }, 400);
    if (records.length > 250) return json({ ok: false, error: 'Batch limit is 250 records.' }, 400);
    const results = [];
    for (const record of records) results.push(await upsertRecord(env, record));
    return json({ ok: true, count: results.length, results });
  } catch (err) {
    return errorResponse(err);
  }
}
