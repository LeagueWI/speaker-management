import { json, errorResponse, readRecords, jf } from './lib/jotform.js';

function submissionBody(qmap, values) {
  const body = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) {
    const qid = qmap[name];
    if (qid && value != null) body.set(`submission[${qid}]`, String(value));
  }
  return body;
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const records = Array.isArray(body) ? body : body.records;
    if (!Array.isArray(records)) return json({ ok: false, error: 'records array is required' }, 400);
    if (records.length > 250) return json({ ok: false, error: 'Batch limit is 250 records.' }, 400);

    const data = await readRecords(env);
    if (!data.form) return json({ ok: false, error: 'The Jotform data form is not configured.' }, 409);

    const existing = new Map(data.records.map(r => [`${r.type}::${r.id}`, r]));
    const results = [];

    for (const record of records) {
      if (!record?.type || !record?.id || typeof record.payload !== 'object') {
        results.push({ ok: false, id: record?.id || '', error: 'Record requires type, id, and payload.' });
        continue;
      }

      const key = `${record.type}::${record.id}`;
      const found = existing.get(key);
      const values = {
        recordType: record.type,
        recordId: record.id,
        payloadJson: JSON.stringify(record.payload),
        updatedAt: new Date().toISOString()
      };
      const encoded = submissionBody(data.qmap, values);

      if (found) {
        await jf(env, `/submission/${encodeURIComponent(found.submissionId)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: encoded
        });
        results.push({ ok: true, action: 'updated', id: record.id, submissionId: found.submissionId });
      } else {
        const created = await jf(env, `/form/${encodeURIComponent(data.form.id)}/submissions`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: encoded
        });
        const submissionId = created.content?.submissionID;
        existing.set(key, { type: record.type, id: record.id, submissionId });
        results.push({ ok: true, action: 'created', id: record.id, submissionId });
      }
    }

    const failed = results.filter(r => !r.ok).length;
    return json({ ok: failed === 0, count: results.length, failed, results }, failed ? 207 : 200);
  } catch (err) {
    return errorResponse(err);
  }
}
