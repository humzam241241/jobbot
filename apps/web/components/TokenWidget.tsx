"use client";
import { useEffect, useState } from "react";

type U = { input: number; output: number; total: number; byModel: Record<string, number> };

export default function TokenWidget() {
	const [u, setU] = useState<U>({ input: 0, output: 0, total: 0, byModel: {} });
	useEffect(() => {
		try {
			const raw = localStorage.getItem("resume_kits");
			const arr = raw ? JSON.parse(raw) : [];
			const byModel: Record<string, number> = {};
			let input = 0, output = 0, total = 0;
			for (const k of arr) {
				const us = k?.usage || {};
				input += Number(us.inputTokens || 0);
				output += Number(us.outputTokens || 0);
				total += Number(us.totalTokens || 0);
				const m = us.model || "unknown";
				byModel[m] = (byModel[m] || 0) + Number(us.totalTokens || 0);
			}
			setU({ input, output, total, byModel });
		} catch {}
	}, []);

	const byModelStr = Object.entries(u.byModel).map(([m, t]) => `${m}: ${t}`).join(" • ") || "—";
	return (
		<div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, margin:"16px 0" }}>
			<div style={{ padding:12, border:"1px solid #2f2f2f", borderRadius:12, background:"#0b0b0b", color:"#fff" }}>
				<div style={{ opacity:.8, fontSize:12 }}>Input tokens</div>
				<div style={{ fontSize:20, fontWeight:700 }}>{u.input}</div>
			</div>
			<div style={{ padding:12, border:"1px solid #2f2f2f", borderRadius:12, background:"#0b0b0b", color:"#fff" }}>
				<div style={{ opacity:.8, fontSize:12 }}>Output tokens</div>
				<div style={{ fontSize:20, fontWeight:700 }}>{u.output}</div>
			</div>
			<div style={{ padding:12, border:"1px solid #2f2f2f", borderRadius:12, background:"#0b0b0b", color:"#fff" }}>
				<div style={{ opacity:.8, fontSize:12 }}>Total tokens</div>
				<div style={{ fontSize:20, fontWeight:700 }}>{u.total}</div>
				<div style={{ opacity:.7, fontSize:11, marginTop:4 }}>{byModelStr}</div>
			</div>
		</div>
	);
}
