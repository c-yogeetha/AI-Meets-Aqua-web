import LiveTankPage from "./LiveTankPage";

export const dynamicParams = true;
export function generateStaticParams() {
  return process.env.NEXT_PUBLIC_SHOWCASE === "1" ? [{ id: "showcase-unavailable" }] : [];
}
export default function TankRoute() {
  return process.env.NEXT_PUBLIC_SHOWCASE === "1"
    ? <main className="min-h-screen bg-abyss text-ink p-12">Tank management is available in the live app.</main>
    : <LiveTankPage />;
}
