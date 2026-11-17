import LiveResourcesPage from "./LiveResourcesPage";
import ShowcaseResources from "@/components/showcase/ShowcaseResources";

export default function ResourcesPage() {
  return process.env.NEXT_PUBLIC_SHOWCASE === "1" ? <ShowcaseResources /> : <LiveResourcesPage />;
}
