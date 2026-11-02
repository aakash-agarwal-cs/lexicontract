import { pipeline } from "@huggingface/transformers";

const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

async function vec(text) {
  const out = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(out.data);
}

const a = await vec("Either party may terminate this agreement with 30 days written notice.");
const b = await vec("This contract can be ended by either side after giving a month's notice.");
const c = await vec("The vendor shall deliver the goods to the warehouse in Mumbai.");

const dot = (x, y) => x.reduce((s, v, i) => s + v * y[i], 0);

console.log("length:", a.length);
console.log("similar clauses:", dot(a, b).toFixed(3));
console.log("unrelated clauses:", dot(a, c).toFixed(3));