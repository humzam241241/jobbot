import type { ResumeIR } from "./types";
import type { TailoringPlan } from "../ai/schemas";

export function applyPlan(ir: ResumeIR, plan: TailoringPlan): ResumeIR {
  const out: ResumeIR = JSON.parse(JSON.stringify(ir));

  // summary
  const sIdx = out.sections.findIndex(s => s.type === 'summary');
  if (sIdx >= 0) (out.sections[sIdx] as any).text = plan.summaryRewrite;

  // skills add/remove
  const sk = out.sections.find(s => s.type === 'skills') as any;
  if (sk) {
    const set = new Set<string>(sk.items || []);
    for (const a of plan.skillsAdd) set.add(a);
    for (const r of plan.skillsRemove) set.delete(r);
    sk.items = Array.from(set);
  }

  // add bullets (experience/projects)
  for (const add of plan.addBullets) {
    if (add.section === 'experience') {
      const ex = out.sections.find(s => s.type === 'experience') as any;
      if (ex) {
        const role = ex.roles.find((r:any) =>
          r.title?.toLowerCase().includes(add.target.toLowerCase()) ||
          r.company?.toLowerCase().includes(add.target.toLowerCase())
        );
        if (role) role.bullets = [...(role.bullets||[]), ...add.bullets];
      }
    } else if (add.section === 'projects') {
      const pj = out.sections.find(s => s.type === 'projects') as any;
      if (pj) {
        const proj = pj.items.find((p:any) =>
          p.name?.toLowerCase().includes(add.target.toLowerCase())
        );
        if (proj) proj.bullets = [...(proj.bullets||[]), ...add.bullets];
      }
    } else if (add.section === 'skills') {
      const sk2 = out.sections.find(s => s.type === 'skills') as any;
      if (sk2) sk2.items = Array.from(new Set([...(sk2.items||[]), ...add.bullets]));
    }
  }

  return out;
}
