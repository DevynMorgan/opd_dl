import { NextRequest, NextResponse } from "next/server";
import { login } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await login(typeof body.username === "string" ? body.username : "", typeof body.password === "string" ? body.password : "");
    if (!user) return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Login service unavailable." }, { status: 503 });
  }
}
