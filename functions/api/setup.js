import {
  json, errorResponse, requireKey, resolveDataForm, resolveEmailForm,
  createDataForm, createEmailForm, questionMap
} from './lib/jotform.js';

export async function onRequestPost({ env }) {
  try {
    requireKey(env);
    let dataForm = await resolveDataForm(env);
    let emailForm = await resolveEmailForm(env);
    const created = [];
    if (!dataForm) {
      const f = await createDataForm(env);
      dataForm = { id: f.id, source: 'created' };
      created.push('data');
    }
    if (!emailForm) {
      const f = await createEmailForm(env);
      emailForm = { id: f.id, source: 'created' };
      created.push('email');
    }
    const [dataQuestions, emailQuestions] = await Promise.all([
      questionMap(env, dataForm.id), questionMap(env, emailForm.id)
    ]);
    return json({
      ok: true,
      created,
      dataForm,
      emailForm,
      dataQuestions,
      emailQuestions,
      next: {
        recommendedVariables: {
          JOTFORM_DATA_FORM_ID: dataForm.id,
          JOTFORM_EMAIL_FORM_ID: emailForm.id
        },
        emailNote: 'The dispatcher form still needs an autoresponder configured in Jotform before /api/email will actually send mail.'
      }
    });
  } catch (err) {
    return errorResponse(err);
  }
}
