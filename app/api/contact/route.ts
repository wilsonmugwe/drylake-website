import { NextResponse } from "next/server";

interface ContactRequest {
  name?: string;
  email?: string;
  company?: string;
  projectType?: string;
  budget?: string;
  message?: string;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactRequest;

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const company = body.company?.trim() ?? "";
    const projectType = body.projectType?.trim() ?? "";
    const budget = body.budget?.trim() ?? "";
    const message = body.message?.trim() ?? "";

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email and project details are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (name.length > 120 || email.length > 200 || message.length > 5000) {
      return NextResponse.json(
        { error: "One or more fields are too long." },
        { status: 400 }
      );
    }

    const enquiry = {
      name,
      email,
      company,
      projectType,
      budget,
      message,
      receivedAt: new Date().toISOString(),
    };

    /*
      EMAIL DELIVERY GOES HERE.

      Do not leave this as the production implementation.

      Once we choose the Drylake receiving email/provider,
      this object will be sent server-side to Drylake.
    */

    console.log("Drylake project enquiry:", enquiry);

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to process your enquiry." },
      { status: 500 }
    );
  }
}