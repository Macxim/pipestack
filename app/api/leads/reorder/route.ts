import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { leads } = await req.json();

    if (!Array.isArray(leads)) {
      return NextResponse.json(
        { error: "Invalid request: 'leads' must be an array." },
        { status: 400 }
      );
    }

    // Prepare updates
    // Each lead should have id, stage_id, and position
    const updates = leads.map((l: any) => ({
      id: l.id,
      stage_id: l.stageId,
      position: l.position,
    }));

    // Perform batch update using upsert with id as conflict target
    // Note: This only works if we provide all required fields or if we're okay with defaults for omitted fields.
    // However, leads usually has many fields. Upserting only id, stage_id, position might reset other fields if not careful.
    // Better way in Supabase/Postgrest for partial batch update:
    // There isn't a direct partial batch update in standard PostgREST.
    // We'll use a loop for now or a single RPC if we want to be more efficient.
    // Given typically small number of leads moved at once, a loop is acceptable but risky for performance.
    // BUT we can use a single update call with a complex payload if we had an RPC.

    // Actually, we can use a single upsert if we select only the columns we want to update.
    // "onConflict" only works for the conflict target.
    // Let's try individual updates for now to be safe, or check if there's a better way.

    const results = await Promise.all(
      updates.map(async (u) => {
        return supabase
          .from("leads")
          .update({ stage_id: u.stage_id, position: u.position })
          .eq("id", u.id);
      })
    );

    const firstError = results.find((r) => r.error);
    if (firstError && firstError.error) {
      return NextResponse.json({ error: firstError.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reorder error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
