import { json, resolveDataForm, resolveEmailForm } from './lib/jotform.js';

export async function onRequestGet({ env }) {
  const hasKey = Boolean(env.JOTFORM_API_KEY);
  if (!hasKey) {
    return json({ ok: true, bridge: 'online', jotform: 'not-configured', requiredSecret: 'JOTFORM_API_KEY' });
  }
  try {
    const [dataForm, emailForm] = await Promise.all([resolveDataForm(env), resolveEmailForm(env)]);
    return json({ ok: true, bridge: 'online', jotform: 'connected', dataForm: dataForm || null, emailForm: emailForm || null, emailReady: Boolean(emailForm) });
  } catch (err) {
    return json({ ok: false, bridge: 'online', jotform: 'error', error: err.message }, 502);
  }
}
