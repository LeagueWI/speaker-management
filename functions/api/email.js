import { json, errorResponse, resolveEmailForm, questionMap } from './lib/jotform.js';

function formBody(qmap, message) {
  const values = {
    recipientEmail: message.to,
    recipientName: message.recipientName || '',
    senderName: message.senderName || '',
    replyToEmail: message.replyTo || '',
    emailSubject: message.subject || '',
    emailMessage: message.body || '',
    speakerId: message.speakerId || '',
    eventId: message.eventId || '',
    messageType: message.messageType || 'custom'
  };
  const body = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) {
    const qid = qmap[name];
    if (!qid) continue;
    body.set(`q${qid}_${name}`, String(value));
  }
  body.set('formID', String(message.formId || ''));
  body.set('simple_spc', `${message.formId}-${message.formId}`);
  body.set('website', '');
  return body;
}

export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json();
    const messages = Array.isArray(payload.messages) ? payload.messages : [payload];
    if (!messages.length) return json({ ok: false, error: 'At least one message is required.' }, 400);
    const form = await resolveEmailForm(env);
    if (!form) return json({ ok: false, error: 'Email dispatcher form is not configured. Run /api/setup first.' }, 409);
    const qmap = await questionMap(env, form.id);
    const results = [];
    for (const original of messages) {
      if (!original.to || !original.subject || !original.body) {
        results.push({ ok: false, to: original.to || '', error: 'to, subject, and body are required' });
        continue;
      }
      const message = { ...original, formId: form.id };
      const res = await fetch(`https://submit.jotform.com/submit/${encodeURIComponent(form.id)}/`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'user-agent': 'League-Speaker-Management/1.0'
        },
        body: formBody(qmap, message),
        redirect: 'manual'
      });
      const accepted = res.status >= 200 && res.status < 400;
      results.push({ ok: accepted, to: message.to, status: res.status });
    }
    const failed = results.filter(r => !r.ok).length;
    return json({ ok: failed === 0, sent: results.length - failed, failed, results }, failed ? 207 : 200);
  } catch (err) {
    return errorResponse(err);
  }
}
