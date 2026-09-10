import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
    return NextResponse.json({ authenticated: true, user: { username: user.username, role: user.role } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ authenticated: false }, { status: 503 });
  }
}
