type In = { model:string; masterResumeText:string; jobDescriptionText:string; notes?:string; };
export async function callLLM(input: In) {
  const messages = [
    { role:"system", content:"You are an ATS-focused assistant. Output VALID JSON only." },
    { role:"user", content:
`MASTER RESUME:
${input.masterResumeText.slice(0,6000)}

JOB DESCRIPTION:
${input.jobDescriptionText.slice(0,6000)}

NOTES:
${(input.notes||"").slice(0,1000)}

Return strict JSON:
{"resume_md":"...","cover_letter_md":"...","ats":{"score":0-100,"rationale":"..."}}`
    }
  ];
  if(process.env.OPENROUTER_API_KEY){
    const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:input.model,messages,temperature:0})});
    const j=await r.json(); const c=j?.choices?.[0]?.message?.content||"{}"; return JSON.parse(c);
  }
  const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:input.model,messages,temperature:0,response_format:{type:"json_object"}})});
  const j=await r.json(); const c=j?.choices?.[0]?.message?.content||"{}"; return JSON.parse(c);
}
