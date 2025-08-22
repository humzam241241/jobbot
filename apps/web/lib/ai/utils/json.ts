import { ZodError } from "zod";

export const forceJsonPrompt = (userTask: string, schemaText: string) =>
`You must output ONLY a single valid JSON object and nothing else.
The JSON must exactly satisfy this schema (keys required, strings not null/empty):
${schemaText}

Task:
${userTask}

Return ONLY minified JSON. No markdown, no backticks, no commentary.`;

export function extractFirstJsonObject(text: string): any {
  const i = text.indexOf("{");
  const j = text.lastIndexOf("}");
  if (i === -1 || j === -1 || j <= i) throw new Error("No JSON found in model output");
  const slice = text.slice(i, j + 1);
  return JSON.parse(slice);
}

export async function repairWithProvider<T>(
  provider: "openai" | "anthropic" | "google",
  doCall: (repairPrompt: string) => Promise<string>,
  originalJson: any,
  zodError: ZodError
): Promise<T> {
  const repairPrompt =
`You previously returned JSON that failed validation.
Here is the JSON you returned:
${JSON.stringify(originalJson)}

Here are the validation errors (fix them strictly):
${JSON.stringify(zodError.issues, null, 2)}

Return ONLY a corrected, valid minified JSON object.`;

  const text = await doCall(repairPrompt);
  return extractFirstJsonObject(text);
}
