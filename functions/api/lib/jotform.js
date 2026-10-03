const DEFAULT_BASE = 'https://api.jotform.com';
export const DATA_FORM_TITLE = 'League Speaker Management Data';
export const EMAIL_FORM_TITLE = 'League Speaker Email Dispatcher';

export function apiBase(env) {
  return (env.JOTFORM_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

export function requireKey(env) {
  if (!env.JOTFORM_API_KEY) {
    const err = new Error('JOTFORM_API_KEY is not configured in Cloudflare.');
    err.status = 503;
    throw err;
  }
  return env.JOTFORM_API_KEY;
}

export async function jf(env, path, init = {}) {
  const key = requireKey(env);
  const url = new URL(`${apiBase(env)}${path}`);
  url.searchParams.set('apiKey', key);
  const res = await fetch(url.toString(), init);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok || (body && body.responseCode && body.responseCode >= 400)) {
    const err = new Error(body?.message || `Jotform returned HTTP ${res.status}`);
    err.status = res.status || 502;
    err.detail = body;
    throw err;
  }
  return body;
}

export async function listForms(env) {
  const r = await jf(env, '/user/forms?limit=100&orderby=updated_at');
  return Array.isArray(r.content) ? r.content : [];
}

export async function findFormByTitle(env, title) {
  const forms = await listForms(env);
  return forms.find(f => String(f.title || '').trim().toLowerCase() === title.toLowerCase()) || null;
}

function question(type, text, name, order, extra = {}) {
  return {
    type, text, name, order: String(order), required: 'No', readonly: 'No', labelAlign: 'Auto', ...extra
  };
}

export async function createDataForm(env) {
  const body = {
    questions: [
      question('control_textbox', 'Record Type', 'recordType', 1),
      question('control_textbox', 'Record ID', 'recordId', 2),
      question('control_textarea', 'Payload JSON', 'payloadJson', 3),
      question('control_textbox', 'Updated At', 'updatedAt', 4)
    ],
    properties: { title: DATA_FORM_TITLE, height: '600' }
  };
  const r = await jf(env, '/form', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.content;
}

export async function createEmailForm(env) {
  const body = {
    questions: [
      question('control_email', 'Recipient Email', 'recipientEmail', 1),
      question('control_textbox', 'Recipient Name', 'recipientName', 2),
      question('control_textbox', 'Sender Name', 'senderName', 3),
      question('control_email', 'Reply-To Email', 'replyToEmail', 4),
      question('control_textbox', 'Subject', 'emailSubject', 5),
      question('control_textarea', 'Message', 'emailMessage', 6),
      question('control_textbox', 'Speaker ID', 'speakerId', 7),
      question('control_textbox', 'Event ID', 'eventId', 8),
      question('control_textbox', 'Message Type', 'messageType', 9)
    ],
    properties: { title: EMAIL_FORM_TITLE, height: '700' }
  };
  const r = await jf(env, '/form', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.content;
}

export async function resolveDataForm(env) {
  if (env.JOTFORM_DATA_FORM_ID) return { id: env.JOTFORM_DATA_FORM_ID, source: 'environment' };
  const existing = await findFormByTitle(env, DATA_FORM_TITLE);
  if (existing) return { id: existing.id, source: 'title-search' };
  return null;
}

export async function resolveEmailForm(env) {
  if (env.JOTFORM_EMAIL_FORM_ID) return { id: env.JOTFORM_EMAIL_FORM_ID, source: 'environment' };
  const existing = await findFormByTitle(env, EMAIL_FORM_TITLE);
  if (existing) return { id: existing.id, source: 'title-search' };
  return null;
}

export async function questionMap(env, formId) {
  const r = await jf(env, `/form/${encodeURIComponent(formId)}/questions`);
  const values = Array.isArray(r.content) ? r.content : Object.values(r.content || {});
  const map = {};
  for (const q of values) if (q?.name && q?.qid) map[q.name] = String(q.qid);
  return map;
}

export async function formSubmissions(env, formId) {
  const r = await jf(env, `/form/${encodeURIComponent(formId)}/submissions?limit=1000&orderby=created_at`);
  return Array.isArray(r.content) ? r.content : [];
}

export function answerByName(submission, qmap, name) {
  const qid = qmap[name];
  if (!qid) return '';
  const item = submission?.answers?.[qid];
  if (!item) return '';
  if (typeof item.answer === 'string') return item.answer;
  if (item.answer == null) return '';
  return typeof item.answer === 'object' ? JSON.stringify(item.answer) : String(item.answer);
}

export async function readRecords(env) {
  const form = await resolveDataForm(env);
  if (!form) return { form: null, records: [] };
  const [qmap, submissions] = await Promise.all([questionMap(env, form.id), formSubmissions(env, form.id)]);
  const records = [];
  for (const s of submissions) {
    const type = answerByName(s, qmap, 'recordType');
    const id = answerByName(s, qmap, 'recordId');
    const raw = answerByName(s, qmap, 'payloadJson');
    const updatedAt = answerByName(s, qmap, 'updatedAt') || s.updated_at || s.created_at || '';
    if (!type || !id) continue;
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { _raw: raw }; }
    records.push({ type, id, payload, updatedAt, submissionId: s.id });
  }
  return { form, records, qmap };
}

function submissionBody(qmap, values) {
  const body = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) {
    const qid = qmap[name];
    if (qid && value != null) body.set(`submission[${qid}]`, String(value));
  }
  return body;
}

export async function upsertRecord(env, record) {
  if (!record?.type || !record?.id || typeof record.payload !== 'object') {
    const err = new Error('Record requires type, id, and payload.');
    err.status = 400;
    throw err;
  }
  const data = await readRecords(env);
  if (!data.form) {
    const err = new Error('The Jotform data form has not been created. Run /api/setup first.');
    err.status = 409;
    throw err;
  }
  const existing = data.records.find(r => r.type === record.type && r.id === record.id);
  const values = {
    recordType: record.type,
    recordId: record.id,
    payloadJson: JSON.stringify(record.payload),
    updatedAt: new Date().toISOString()
  };
  const body = submissionBody(data.qmap, values);
  if (existing) {
    const r = await jf(env, `/submission/${encodeURIComponent(existing.submissionId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body
    });
    return { action: 'updated', submissionId: existing.submissionId, jotform: r.content };
  }
  const r = await jf(env, `/form/${encodeURIComponent(data.form.id)}/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body
  });
  return { action: 'created', submissionId: r.content?.submissionID, jotform: r.content };
}

export async function deleteRecord(env, type, id) {
  const data = await readRecords(env);
  const existing = data.records.find(r => r.type === type && r.id === id);
  if (!existing) return { action: 'not-found' };
  await jf(env, `/submission/${encodeURIComponent(existing.submissionId)}`, { method: 'DELETE' });
  return { action: 'deleted', submissionId: existing.submissionId };
}

export function errorResponse(err) {
  console.error(err);
  return json({ ok: false, error: err.message || 'Unexpected error', detail: err.detail || undefined }, err.status || 500);
}
