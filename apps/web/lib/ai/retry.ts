export async function withBackoff<T>(fn: ()=>Promise<T>, tries=3) {
  let lastErr: any;
  for (let i=0;i<tries;i++){
    try { return await fn(); } 
    catch (e:any){
      lastErr=e;
      const status = e?.status ?? e?.response?.status;
      if (status===429 || (status>=500 && status<600)) {
        const delay = Math.min(2000 * (i+1), 8000);
        await new Promise(r=>setTimeout(r, delay));
        continue;
      }
      break;
    }
  }
  throw lastErr;
}
