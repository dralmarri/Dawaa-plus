import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, Navigation, Pill, Hospital, Stethoscope, Loader2, AlertCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";

type PlaceType = "pharmacy" | "hospital" | "clinic";

const NearbyPlacesPage = () => {
  const { isRTL } = useLanguage();
  const [searchParams] = useSearchParams();
  const mode: "pharmacy" | "hospital" = searchParams.get("type") === "pharmacy" ? "pharmacy" : "hospital";

  const allTypes: { key: PlaceType; labelAr: string; labelEn: string; query: string; icon: any; color: string }[] = [
    { key: "pharmacy", labelAr: "صيدلية", labelEn: "Pharmacy", query: isRTL ? "صيدلية" : "pharmacy", icon: Pill, color: "text-green-600 bg-green-500/10" },
    { key: "clinic", labelAr: "مركز صحي", labelEn: "Health Center", query: isRTL ? "مركز صحي" : "health clinic", icon: Stethoscope, color: "text-blue-600 bg-blue-500/10" },
    { key: "hospital", labelAr: "مستشفى", labelEn: "Hospital", query: isRTL ? "مستشفى" : "hospital", icon: Hospital, color: "text-red-600 bg-red-500/10" },
  ];

  // Filter types based on mode
  const types = mode === "pharmacy"
    ? allTypes.filter((t) => t.key === "pharmacy")
    : allTypes.filter((t) => t.key === "hospital" || t.key === "clinic");

  const [active, setActive] = useState<PlaceType>(types[0].key);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const activeType = types.find((t) => t.key === active) ?? types[0];

  const pageTitle = mode === "pharmacy"
    ? (isRTL ? "أقرب صيدلية" : "Nearest Pharmacy")
    : (isRTL ? "مستشفى ومركز صحي" : "Hospital & Health Center");


  const getLocation = () => {
    setError(null);
    setLoading(true);
    if (!navigator.geolocation) {
      setError(isRTL ? "المتصفح لا يدعم تحديد الموقع" : "Geolocation not supported");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? isRTL ? "تم رفض الإذن بالوصول للموقع" : "Location permission denied"
            : isRTL ? "تعذر تحديد الموقع" : "Could not get location"
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const openInMaps = (query: string) => {
    if (!coords) return;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${coords.lat},${coords.lng},15z`;
    window.open(url, "_blank");
  };

  const openSingle = (type: PlaceType) => {
    if (!coords) return;
    const t = types.find((x) => x.key === type)!;
    openInMaps(t.query);
  };

  return (
    <div className="pb-28">
      <PageHeader title={pageTitle} showBack />

      <div className="px-4 space-y-4">
        {/* Location card */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-sm">
                {isRTL ? "موقعك الحالي" : "Your Location"}
              </h3>
              {coords ? (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {isRTL ? "اضغط لتحديد موقعك" : "Tap to detect your location"}
                </p>
              )}
            </div>
            <button
              onClick={getLocation}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              {coords ? (isRTL ? "تحديث" : "Refresh") : (isRTL ? "تحديد" : "Detect")}
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Type chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {types.map((tp) => (
            <button
              key={tp.key}
              onClick={() => setActive(tp.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
                active === tp.key
                  ? "bg-chip-active text-chip-active-foreground border-chip-active"
                  : "bg-chip text-chip-foreground border-border"
              }`}
            >
              {isRTL ? tp.labelAr : tp.labelEn}
            </button>
          ))}
        </div>

        {/* Active type action */}
        <div className="bg-card rounded-2xl border border-border p-5 text-center">
          <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${activeType.color}`}>
            <activeType.icon className="w-8 h-8" />
          </div>
          <h2 className="font-bold text-foreground mt-3">
            {isRTL ? `أقرب ${activeType.labelAr}` : `Nearest ${activeType.labelEn}`}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {coords
              ? isRTL
                ? "افتح خرائط جوجل لعرض النتائج بالقرب منك مع الاتجاهات"
                : "Open Google Maps to see results near you with directions"
              : isRTL
              ? "حدّد موقعك أولاً للبحث"
              : "Detect your location first to search"}
          </p>
          <button
            onClick={() => openSingle(active)}
            disabled={!coords}
            className="mt-4 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Navigation className="w-5 h-5" />
            {isRTL ? "افتح في خرائط جوجل" : "Open in Google Maps"}
          </button>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-2">
          {types.map((tp) => (
            <button
              key={tp.key}
              onClick={() => openSingle(tp.key)}
              disabled={!coords}
              className="bg-card rounded-2xl border border-border p-3 flex flex-col items-center gap-2 disabled:opacity-50 hover:border-primary/40 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tp.color}`}>
                <tp.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground text-center leading-tight">
                {isRTL ? tp.labelAr : tp.labelEn}
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center px-4">
          {isRTL
            ? "🔒 لا يتم تخزين أو مشاركة موقعك. يُستخدم فقط لفتح خرائط جوجل."
            : "🔒 Your location is not stored or shared. Used only to open Google Maps."}
        </p>
      </div>
    </div>
  );
};

export default NearbyPlacesPage;
