import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  const session = user ? { user } : null;
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await query(
      "SELECT id, uuid, email, name, full_name, phone_number, image, age, bmi, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [session.user.email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err: any) {
    console.error("Error fetching profile:", err.message);
    return NextResponse.json({ error: "Database error", details: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const session = user ? { user } : null;
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { age, bmi, fullName, name, phoneNumber } = await req.json();

    // Update user profile in PostgreSQL
    const { rows } = await query(
      `UPDATE users 
       SET age = COALESCE($1, age),
           bmi = COALESCE($2, bmi),
           name = COALESCE($3, name),
           full_name = COALESCE($4, full_name),
           phone_number = COALESCE($5, phone_number),
           updated_at = NOW()
       WHERE LOWER(email) = LOWER($6) 
       RETURNING id, uuid, email, name, full_name, phone_number, image, age, bmi, updated_at`,
      [
        age !== undefined ? Number(age) : null,
        bmi !== undefined ? Number(bmi) : null,
        name || fullName || null,
        fullName || name || null,
        phoneNumber || null,
        session.user.email,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: rows[0] });
  } catch (err: any) {
    console.error("Error updating profile:", err.message);
    return NextResponse.json({ error: "Database error", details: err.message }, { status: 500 });
  }
}
