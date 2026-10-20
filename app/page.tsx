import { cookies } from "next/headers";
import HomePageClient, {
  MediaItem,
  ExtractionData,
  DownloadHistoryItem,
} from "@/components/HomePageClient";
import { Language } from "@/lib/translations";

export type { MediaItem, ExtractionData, DownloadHistoryItem };

export const dynamic = "force-dynamic";

export default async function Page() {
  const cookieStore = await cookies();
  const savedLang = cookieStore.get("satsetreels_lang")?.value as Language | undefined;
  const initialLang: Language = savedLang === "en" ? "en" : "id";

  return <HomePageClient initialLang={initialLang} />;
}
