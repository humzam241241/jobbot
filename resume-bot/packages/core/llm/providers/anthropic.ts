import Anthropic from "@anthropic-ai/sdk";

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
};

export async function callAnthropic(opts: any): Promise<{ text: string; modelUsed: string }> {
  const client = getClient();
  const model = opts.modelOverride || "claude-3-5-sonnet-20240620";
  
  const systemMessage = opts.messages.find((m: any) => m.role === "system")?.content;
  const userMessages = opts.messages.filter((m: any) => m.role !== "system");

  const res = await client.messages.create({
    model: model,
    system: systemMessage,
    messages: userMessages,
    max_tokens: opts.maxTokens || 2048,
    temperature: opts.temperature || 0.7,
  });

  // Ensure response structure is valid and content is present
  if (res && Array.isArray(res.content) && res.content.length > 0 && 'text' in res.content[0]) {
    const text = res.content[0].text;
    return { text, modelUsed: model };
  } else {
    throw new Error("Invalid response structure from Anthropic API");
  }
}
