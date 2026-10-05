// quick-test.js
import { sendOtp, verifyOtp, setLocation, searchProducts } from "./dist/api.js";
import { loadSession } from "./dist/session.js";
import readline from "node:readline/promises";

const PHONE = "9652770411"; // apna number daalo
const TARGET_PRODUCT_ID = 1404179;

async function main() {
  const session = await loadSession();
  if (!session.access_token) {
    await sendOtp(PHONE);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const code = await rl.question("OTP: ");
    rl.close();
    const result = await verifyOtp(PHONE, code.trim());
    if (!result.ok) { console.log("❌ OTP fail"); return; }
  }
  console.log("✅ Logged in");

  console.log("🔍 Mulund check kar raha hoon...");
  await setLocation(19.1726, 72.9560);
  await new Promise((r) => setTimeout(r, 3000));

  for (let page = 0; page < 5; page++) {
    console.log(`   Page ${page} search...`);
    const products = await searchProducts("Hot Wheels", page);
    if (!products || products.length === 0) break;
    const target = products.find((p) => Number(p.id) === TARGET_PRODUCT_ID);
    if (target) {
      console.log(`\n🎯 MIL GAYA!`);
      console.log(JSON.stringify(target, null, 2));
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log("Done.");
}

main().catch(console.error);