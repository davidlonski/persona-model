import { deliverDueReminders } from "./deliver";

export async function runFullPollCycle() {
  const host = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  try {
    console.log("Running full pipeline...");
    
    // 1. Gmail Poll
    await fetch(`${host}/api/gmail/poll`, { method: "POST" }).catch(e => console.error("Gmail poll failed", e));
    
    // 2. Calendar Poll
    await fetch(`${host}/api/calendar/poll`, { method: "POST" }).catch(e => console.error("Calendar poll failed", e));
    
    // 3. Filter
    await fetch(`${host}/api/filter/run`, { method: "POST" }).catch(e => console.error("Filter run failed", e));
    
    // 4. Deliver
    const deliveredCount = await deliverDueReminders();
    
    return { success: true, deliveredCount };
  } catch (error) {
    console.error("Error in full poll cycle:", error);
    return { success: false, error: String(error) };
  }
}
