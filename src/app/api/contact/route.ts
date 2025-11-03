import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || "Trinix Contact Form <no-reply@trinix.org.in>";
const CONTACT_RECEIVER = process.env.CONTACT_RECEIVER || "info@trinix.org.in";

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
      return NextResponse.json({ ok: false, message: "Missing required fields" }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS, 
      to: CONTACT_RECEIVER, 
      replyTo: sanitized.email, 
      subject: `New Contact Message from ${sanitized.fullName}`,
      text: `
You’ve received a new message from the Trinix Contact Form:

-----------------------------------------
Full Name: ${sanitized.fullName}
Email: ${sanitized.email}
Company: ${sanitized.company || "(Not provided)"}
-----------------------------------------

Message:
${sanitized.message}

-----------------------------------------
This message was sent via trinix.org.in contact form.
      `,
    });

    if (error) {
      console.error("[api/contact] Resend error", error);
      return NextResponse.json({ ok: false, message: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/contact] Unexpected error", error);
    return NextResponse.json({ ok: false, message: "Internal error" }, { status: 500 });
  }
}
