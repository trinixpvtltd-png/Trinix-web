import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

function craftReply(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("service") || lower.includes("what do you do")) {
    return "We offer full-stack product development, platform engineering, and applied research partnerships. Let me know if you want a deeper rundown.";
  }
  if (lower.includes("contact") || lower.includes("reach")) {
    return "You can reach the team via the contact form or ping hello@trinix.dev. I can link you directly if you like.";
  }
  if (lower.includes("price") || lower.includes("cost") || lower.includes("estimate")) {
    return "Pricing depends on the scope and engagement model. Share a few project details and I can connect you with the right lead for a tailored proposal.";
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return "Hi there! I'm the Trinix assistant. Ask me about our services, research labs, or anything else you're curious about.";
  }
  return "I might need a teammate to jump in here. Want me to arrange a follow-up with someone from the Trinix crew?";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Please include a message." }, { status: 400 });
    }

    const reply = craftReply(parsed.data.message);
    return NextResponse.json({ ok: true, answer: reply });
  } catch (error) {
    console.error("[api/chat] unexpected error", error);
    return NextResponse.json({ ok: false, message: "Unable to respond right now." }, { status: 500 });
  }
}
