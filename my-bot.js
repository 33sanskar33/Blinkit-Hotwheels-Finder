// my-bot.js
import { sendOtp, verifyOtp, setLocation, searchProducts } from "./dist/api.js";
import { loadSession } from "./dist/session.js";
import readline from "node:readline/promises";

// 👇 YAHAN APNA PHONE NUMBER DAALO
const PHONE = "9876543210";

// 👇 YAHAN CAR KA PRODUCT ID DAALO
const TARGET_PRODUCT_ID = 774464; // Hot Wheels Toyota Prius
const SEARCH_QUERY = "Hot Wheels car";

// 👇 Mumbai ke locations (lat, lon, naam)
const LOCATIONS = [
  { name: "Mulund", lat: 19.1726, lon: 72.9560 },
  { name: "Andheri", lat: 19.1136, lon: 72.8697 },
  { name: "Bandra", lat: 19.0596, lon: 72.8295 },
  { name: "Borivali", lat: 19.2307, lon: 72.8567 },
  { name: "Dadar", lat: 19.0176, lon: 72.8562 },
  { name: "Thane", lat: 19.2183, lon: 72.9781 },
  { name: "Powai", lat: 19.1176, lon: 72.9060 },
  { name: "Malad", lat: 19.1874, lon: 72.8484 },
  { name: "Chembur", lat: 19.0522, lon: 72.9005 },
  { name: "Kandivali", lat: 19.2095, lon: 72.8526 },
  { name: "Ghatkopar", lat: 19.0861, lon: 72.9085 },
  { name: "Vikhroli", lat: 19.1096, lon: 72.9259 },
  { name: "Worli", lat: 19.0176, lon: 72.8119 },
  { name: "Juhu", lat: 19.1074, lon: 72.8267 },
  { name: "Santacruz", lat: 19.0816, lon: 72.8414 },
  { name: "Goregaon", lat: 19.1663, lon: 72.8526 },
  { name: "Colaba", lat: 18.9067, lon: 72.8147 },
  { name: "Vashi", lat: 19.0771, lon: 72.9986 },
  { name: "Nerul", lat: 19.0330, lon: 73.0297 },
  { name: "Panvel", lat: 18.9894, lon: 73.1175 },
];

async function askQuestion(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function main() {
  console.log("🚀 Blinkit Hot Wheels Bot shuru ho raha hai...\n");

  // Step 1: Session check karo — pehle se logged in ho?
  const session = await loadSession();
  let loggedIn = Boolean(session.access_token);

  // Step 2: Agar login nahi hai, OTP flow chalao
  if (!loggedIn) {
    console.log(`📱 OTP bhej raha hoon ${PHONE} pe...`);
    await sendOtp(PHONE);
    const code = await askQuestion("📨 OTP daalo jo phone pe aaya: ");
    const result = await verifyOtp(PHONE, code);
    if (!result.ok) {
      console.log("❌ OTP galat hai ya verify nahi hua. Dobara try karo.");
      return;
    }
    console.log("✅ Login successful!\n");
  } else {
    console.log("✅ Pehle se logged in ho.\n");
  }

  // Step 3: Har location pe search karo
  const results = [];

  for (const loc of LOCATIONS) {
    console.log(`\n🔍 ${loc.name} check kar raha hoon...`);

    try {
      const locResult = await setLocation(loc.lat, loc.lon);
      if (!locResult.serviceable) {
        console.log(`   ⚠️ ${loc.name} serviceable nahi hai. Skip kar raha hoon.`);
        results.push({ location: loc.name, status: "Not serviceable" });
        continue;
      }

      // Page 0 aur page 1 dono check karo
      let found = null;
      for (let page = 0; page < 3; page++) {
        const products = await searchProducts(SEARCH_QUERY, page);
        if (!products || products.length === 0) break;

        const target = products.find((p) => Number(p.id) === TARGET_PRODUCT_ID);
        if (target) {
          found = target;
          break;
        }
      }

      if (found) {
        const stock = found.inventory ?? found.inventory_count ?? 0;
        console.log(`   🎯 Product mila! Stock: ${stock}`);
        if (stock > 0) {
          console.log(`\n🎉🎉🎉 CAR MIL GAYI! Location: ${loc.name}`);
          console.log(`   Name: ${found.name}`);
          console.log(`   Price: ₹${found.price}`);
          console.log(`   Stock: ${stock}`);
          console.log(`\n📲 Ab Blinkit app kholo, location ${loc.name} set karo, aur order karo!`);
          results.push({ location: loc.name, status: `IN STOCK (${stock})`, price: found.price });
          break; // Mil gayi, ab ruk jao
        } else {
          console.log(`   ⚠️ Product listed hai par stock 0 hai.`);
          results.push({ location: loc.name, status: "Listed but out of stock" });
        }
      } else {
        console.log(`   ❌ ${loc.name} pe nahi mila.`);
        results.push({ location: loc.name, status: "Not found" });
      }
   } catch (err) {
  if (err.message && err.message.includes("429")) {
    console.log(`   ⏳ Rate limited. 30 sec wait kar raha hoon...`);
    await new Promise((r) => setTimeout(r, 30000));
    // Retry ek baar
    try {
      await setLocation(loc.lat, loc.lon);
      const products = await searchProducts(SEARCH_QUERY, 0);
      const target = products.find((p) => Number(p.id) === TARGET_PRODUCT_ID);
      if (target) {
        const stock = target.inventory ?? target.inventory_count ?? 0;
        if (stock > 0) {
          console.log(`\n🎉🎉🎉 CAR MIL GAYI! Location: ${loc.name}`);
          console.log(`   Name: ${target.name}`);
          console.log(`   Price: ₹${target.price}`);
          console.log(`   Stock: ${stock}`);
          results.push({ location: loc.name, status: `IN STOCK (${stock})`, price: target.price });
          break;
        } else {
          results.push({ location: loc.name, status: "Listed but out of stock" });
        }
      } else {
        results.push({ location: loc.name, status: "Not found" });
      }
    } catch (err2) {
      console.log(`   ❌ Retry bhi fail: ${err2.message}`);
      results.push({ location: loc.name, status: `Error: ${err2.message}` });
    }
  } else {
    console.log(`   ❌ Error: ${err.message}`);
    results.push({ location: loc.name, status: `Error: ${err.message}` });
  }
}

    // Thoda delay, taaki Blinkit block na kare
    await new Promise((r) => setTimeout(r, 10000));
  }

  // Final summary
  console.log("\n\n========== 📊 FINAL SUMMARY ==========");
  for (const r of results) {
    console.log(`${r.location.padEnd(15)} | ${r.status}`);
  }
  console.log("=====================================\n");
}

main().catch((err) => {
  console.error("💥 Bot crash ho gaya:", err);
  process.exit(1);
});