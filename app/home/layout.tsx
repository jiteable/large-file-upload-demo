import HomeNav from "@/components/home-nav";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <HomeNav />
      <main>{children}</main>
    </div>
  );
}