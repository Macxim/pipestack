import Image from "next/image";

export default function Sidebar() {
  return (
    <aside className="w-24 h-screen bg-gray-900 flex flex-col items-center py-4 px-6 gap-6 fixed left-0 top-0">
      <Image src="/secondself.svg" alt="Secondself" width={50} height={50} />
    </aside>
  );
}