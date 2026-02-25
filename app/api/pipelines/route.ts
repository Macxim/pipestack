import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
  try {
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
