import { NextResponse } from "next/server";

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID!;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID!;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY!;

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const sanitized = {
      fullName: typeof data.fullName === "string" ? data.fullName.trim() : "",
      email: typeof data.email === "string" ? data.email.trim() : "",
      company: typeof data.company === "string" ? data.company.trim() : "",
      message: typeof data.message === "string" ? data.message.trim() : "",
    };

    if (!sanitized.fullName || !sanitized.email || !sanitized.message) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // EmailJS API endpoint
    const url = "https://api.emailjs.com/api/v1.0/email/send";

    const payload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        fullName: sanitized.fullName,
        email: sanitized.email,
        company: sanitized.company || "(Not provided)",
        message: sanitized.message,
      },
    };

    const emailRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!emailRes.ok) {
      console.error("[api/contact] EmailJS error", await emailRes.text());
      return NextResponse.json(
        { ok: false, message: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/contact] Unexpected error", error);
    return NextResponse.json(
      { ok: false, message: "Internal error" },
      { status: 500 }
    );
  }
}
