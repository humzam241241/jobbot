import { TailoredOutputSchema, type TailoredOutput } from "./types";

export function validateTailored(json: any): TailoredOutput {
  return TailoredOutputSchema.parse(json);
}
