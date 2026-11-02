import { pipeline } from "@huggingface/transformers";

let extractor = null;

// Turns text into an array of 384 numbers
export async function embed(text) {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// Postgres wants vectors written as '[0.1,0.2,...]'
export function toVectorString(arr) {
  return `[${arr.join(",")}]`;
}