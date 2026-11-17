import LiveOverviewPage from "./LiveOverviewPage";
import ShowcaseGallery from "@/components/showcase/ShowcaseGallery";

export default function AppPage() {
  return process.env.NEXT_PUBLIC_SHOWCASE === "1" ? <ShowcaseGallery /> : <LiveOverviewPage />;
}
