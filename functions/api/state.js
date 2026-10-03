import { json, errorResponse, readRecords } from './lib/jotform.js';

export async function onRequestGet({ env }) {
  try {
    const data = await readRecords(env);
    const state = { events: [], speakers: [], communications: [] };
    for (const r of data.records) {
      const item = { id: r.id, ...r.payload, _updatedAt: r.updatedAt };
      if (r.type === 'event') state.events.push(item);
      else if (r.type === 'speaker') state.speakers.push(item);
      else if (r.type === 'communication') state.communications.push(item);
    }
    return json({ ok: true, form: data.form, state });
  } catch (err) {
    return errorResponse(err);
  }
}
