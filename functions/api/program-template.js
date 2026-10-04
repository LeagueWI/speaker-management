import { json } from './lib/jotform.js';

const DOCX_MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_BYTES=10*1024*1024;

function error(message,status=400){return json({ok:false,error:message},status);}
function key(eventId){return `program-flow-template:${eventId}`;}
function eventIdFrom(request){return new URL(request.url).searchParams.get('eventId')?.trim()||'';}
function store(env){
  if(!env.PROGRAM_TEMPLATES)throw new Error('Program Flow template storage is not configured.');
  return env.PROGRAM_TEMPLATES;
}
function safeName(value){return String(value||'Program Flow Template.docx').replace(/[\r\n]/g,' ').slice(0,180);}

export async function onRequestGet({request,env}){
  const eventId=eventIdFrom(request);if(!eventId)return error('eventId is required.');
  try{
    const result=await store(env).getWithMetadata(key(eventId),{type:'arrayBuffer'});
    const wantsMeta=new URL(request.url).searchParams.get('meta')==='1';
    if(!result.value){
      if(wantsMeta)return json({ok:true,exists:false});
      return error('No custom Program Flow template is stored for this event.',404);
    }
    const metadata=result.metadata||{};
    if(wantsMeta)return json({ok:true,exists:true,filename:metadata.filename||'Program Flow Template.docx',uploadedAt:metadata.uploadedAt||null,size:metadata.size||result.value.byteLength});
    const filename=safeName(metadata.filename);
    return new Response(result.value,{status:200,headers:{
      'content-type':DOCX_MIME,
      'content-disposition':`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'cache-control':'no-store',
      'x-content-type-options':'nosniff'
    }});
  }catch(e){return error(e?.message||'Could not read Program Flow template.',500);}
}

export async function onRequestPost({request,env}){
  const eventId=eventIdFrom(request);if(!eventId)return error('eventId is required.');
  try{
    const bytes=await request.arrayBuffer();
    if(!bytes.byteLength)return error('Template file is empty.');
    if(bytes.byteLength>MAX_BYTES)return error('Template is too large. Keep the DOCX under 10 MB.',413);
    const rawName=request.headers.get('x-file-name')||'Program Flow Template.docx';
    let filename=rawName;try{filename=decodeURIComponent(rawName)}catch{}
    filename=safeName(filename);
    if(!filename.toLowerCase().endsWith('.docx'))return error('Program Flow templates must be .docx files.');
    const uploadedAt=new Date().toISOString();
    await store(env).put(key(eventId),bytes,{metadata:{filename,uploadedAt,size:bytes.byteLength}});
    return json({ok:true,eventId,filename,uploadedAt,size:bytes.byteLength});
  }catch(e){return error(e?.message||'Could not store Program Flow template.',500);}
}

export async function onRequestDelete({request,env}){
  const eventId=eventIdFrom(request);if(!eventId)return error('eventId is required.');
  try{await store(env).delete(key(eventId));return json({ok:true,eventId,deleted:true});}
  catch(e){return error(e?.message||'Could not remove Program Flow template.',500);}
}
