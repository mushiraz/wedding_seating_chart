import VenueGuide from "@/components/guest/VenueGuide";
import seating from "@/data/ahad-rehnuba.json";
import { EventData } from "@/lib/types";

export default function Home() {
  return <VenueGuide data={seating as EventData} />;
}
