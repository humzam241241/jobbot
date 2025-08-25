export type ResumeIR = {
  meta: { name?: string; email?: string; phone?: string; links?: string[] };
  sections: (
    | { type:'summary'; text:string }
    | { type:'skills'; items:string[] }
    | { type:'experience'; roles:{ title:string; company:string; dates?:string; bullets:string[] }[] }
    | { type:'projects'; items:{ name:string; bullets:string[] }[] }
    | { type:'education'; items:{ school:string; credential:string; dates?:string; bullets?:string[] }[] }
    | { type:'certs'; items:string[] }
  )[];
  anchors?: { headingMap?: Record<string,string>; bulletStyle?: string; normalStyle?: string };
};
