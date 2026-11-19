import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createManualAccount } from "@/lib/userAccounts";
import { claimGuestDocuments } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const key = clientKey(req, "auth_register");
    const rl = rateLimit(key, 10, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many sign-up attempts. Please wait ${rl.retryAfter}s and try again.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const result = await createManualAccount({
      name: body.name,
      email: body.email,
      password: body.password,
      phoneNumber: body.phoneNumber || body.phone,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Automatically associate any onboarding/demo session data with the new account
    try {
      const store = await cookies();
      const guestId = store.get("sakhi_guest_id")?.value;
      if (guestId && result.user.id) {
        const guestOwner = {
          key: `guest:${guestId}`,
          cookieId: `guest_${guestId.replace(/[^a-zA-Z0-9]/g, '')}`,
          email: null,
          name: null,
          isGuest: true,
          userId: null,
        };
        const userOwner = {
          key: `user:${result.user.email.toLowerCase()}`,
          cookieId: result.user.email.replace(/[^a-zA-Z0-9]/g, '_'),
          email: result.user.email,
          name: result.user.name,
          isGuest: false,
          userId: Number(result.user.id),
        };
        await claimGuestDocuments(guestOwner, userOwner);
      }
    } catch (e: any) {
      console.warn("Could not claim guest documents during registration:", e?.message);
    }

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: result.user.id,
          uuid: result.user.uuid,
          email: result.user.email,
          name: result.user.name,
          fullName: result.user.fullName,
          phone: result.user.phoneNumber,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("/api/auth/register error:", err);
    return NextResponse.json(
      { error: "Unable to create account right now. Please try again." },
      { status: 500 }
    );
  }
}

