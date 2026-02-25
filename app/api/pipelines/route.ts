import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, title } = body;

    if (!id || typeof title !== "string") {
      return NextResponse.json(
        { error: "Invalid data. ID and title are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("pipelines")
      .update({ title })
      .eq("id", id)
      .eq("user_id", user.id) // Ensure security
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Pipeline update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
