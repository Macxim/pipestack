import { NextResponse } from "next/server";

export async function GET() {
  const csv = [
    "name,email,phone,profile_url,notes,follow_up_date",
    "John Smith,john@example.com,+1 555 000 0000,https://facebook.com/johnsmith,Met at conference,2026-04-15",
    "Jane Doe,jane@example.com,,,,",
  ].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="pipestack-import-template.csv"',
    },
  });
}
