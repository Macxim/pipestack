"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-24 h-screen bg-gray-900 flex flex-col items-center justify-between py-4 px-6 fixed left-0 top-0 z-1">
      <Image src="/pipestack.svg" alt="Pipestack" width={50} height={50} />

      <button
        onClick={handleLogout}
        className="text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
      >
        Log out
      </button>
    </aside>
  );
}