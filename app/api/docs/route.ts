import { NextResponse } from "next/server";
import { spec } from "@/lib/swagger";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(spec);
}
