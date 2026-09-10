import { NextResponse } from "next/server";
import { logout } from "../../../../lib/auth";

export async function POST() {
  try {
    await logout();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Logout failed." }, { status: 503 });
  }
}
