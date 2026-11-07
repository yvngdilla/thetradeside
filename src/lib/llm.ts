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
  /** Optional PDF or image to read alongside the prompt. */
  attachment?: { bytes: Uint8Array; mimeType: string };
}): Promise<z.infer<T>> {
  const content: Anthropic.ContentBlockParam[] = [];
  if (opts.attachment) {
    const data = Buffer.from(opts.attachment.bytes).toString("base64");
    if (opts.attachment.mimeType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    } else {
      content.push({
        type: "image",
        source: { type: "base64", media_type: opts.attachment.mimeType as "image/png" | "image/jpeg" | "image/webp", data },
      });
    }
  }
  content.push({ type: "text", text: opts.prompt });
  const message = await anthropic().messages.parse({
    model: env.anthropicModel(),
    max_tokens: opts.maxTokens ?? 2000,
    system: opts.system,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(opts.schema) },
  });
  if (message.parsed_output == null) throw new Error("The model did not return a usable answer.");
  return message.parsed_output as z.infer<T>;
}
