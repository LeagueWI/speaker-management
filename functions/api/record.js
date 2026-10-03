import { json, errorResponse, upsertRecord, deleteRecord } from './lib/jotform.js';

export async function onRequestPost({ request, env }) {
  try {
    const record = await request.json();
    const result = await upsertRecord(env, record);
    return json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    if (!type || !id) return json({ ok: false, error: 'type and id are required' }, 400);
    const result = await deleteRecord(env, type, id);
    return json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
