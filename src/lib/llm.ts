import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { env } from "@/lib/env";

let client: Anthropic | null = null;
function anthropic() {
  client ??= new Anthropic({ apiKey: env.anthropicApiKey() });
  return client;
}

/** One structured-output call: returns data matching `schema` or throws. */
export async function structured<T extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: T;
  maxTokens?: number;
}): Promise<z.infer<T>> {
  const message = await anthropic().messages.parse({
    model: env.anthropicModel(),
    max_tokens: opts.maxTokens ?? 2000,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    output_config: { format: zodOutputFormat(opts.schema) },
  });
  if (message.parsed_output == null) throw new Error("The model did not return a usable answer.");
  return message.parsed_output as z.infer<T>;
}
