// quick-test.js
import { sendOtp, verifyOtp, setLocation, searchProducts } from "./dist/api.js";
import { loadSession } from "./dist/session.js";
import readline from "node:readline/promises";

// 👇 YAHAN APNA 10-DIGIT PHONE NUMBER DAALO
const PHONE = "9652770411";

const TARGET_PRODUCT_ID = 774464;

async function main() {
  console.log("🚀 Quick test shuru...\n");

  const session = await loadSession();
  
  if (!session.access_token) {
    console.log(`📱 OTP bhej raha hoon ${PHONE} pe...`);
    await sendOtp(PHONE);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const code = await rl.question("📨 OTP daalo: ");
    rl.close();
    const result = await verifyOtp(PHONE, code.trim());
    if (!result.ok) {
      console.log("❌ OTP fail:", result.message);
      return;
    }
    console.log("✅ Login successful!\n");
  } else {
    console.log("✅ Pehle se logged in ho\n");
  }

  console.log("🔍 Mulund (19.1726, 72.9560) check kar raha hoon...");
  const loc = await setLocation(19.1726, 72.9560);
  console.log(`   Serviceable: ${loc.serviceable}, Address: ${loc.address?.address_line ?? "N/A"}\n`);

  // Thoda wait karo location set hone ke baad
  await new Promise((r) => setTimeout(r, 3000));

  let totalProducts = 0;
  for (let page = 0; page < 5; page++) {
    console.log(`📄 Page ${page} search kar raha hoon...`);
    
    try {
      const products = await searchProducts("Hot Wheels", page);
      
      if (!products || products.length === 0) {
        console.log(`   Koi product nahi mila is page pe. Rok raha hoon.`);
        break;
      }

      totalProducts += products.length;
      console.log(`   ${products.length} products mile`);

      // Check karo ki target product hai ya nahi
      const target = products.find((p) => Number(p.id) === TARGET_PRODUCT_ID);
      
      if (target) {
        console.log(`\n🎯🎯🎯 CAR MIL GAYI! 🎯🎯🎯`);
        console.log(`   Name: ${target.name}`);
        console.log(`   ID: ${target.id}`);
        console.log(`   Price: ₹${target.price}`);
        console.log(`   Inventory: ${target.inventory ?? target.inventory_count ?? "unknown"}`);
        console.log(`\n📲 Ab Blinkit app kholo, Mulund location set karo, aur order karo!`);
        console.log(`\nFull product details:`);
        console.log(JSON.stringify(target, null, 2));
        return;
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      if (err.message && err.message.includes("429")) {
        console.log(`   ⏳ Rate limited. 30 sec wait...`);
        await new Promise((r) => setTimeout(r, 30000));
      }
    }

    // Har page ke beech 5 second wait
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log(`\n❌ Total ${totalProducts} products check kiye, par target car (ID ${TARGET_PRODUCT_ID}) nahi mili.`);
  console.log(`   Matlab Mulund me abhi yeh car available nahi hai (ya sold out hai).`);
}

main().catch((err) => {
  console.error("💥 Bot crash:", err);
  process.exit(1);
});