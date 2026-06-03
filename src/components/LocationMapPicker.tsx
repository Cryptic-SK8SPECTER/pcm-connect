import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search } from "lucide-react";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationMapPickerProps {
  value?: string;
  onChange: (location: string, lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export function LocationMapPicker({ value, onChange, initialLat = -25.9655, initialLng = 32.5832 }: LocationMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationName, setLocationName] = useState(value || "");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on Maputo, Mozambique
    const map = L.map(mapRef.current).setView([initialLat, initialLng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add initial marker
    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    // Handle marker drag
    marker.on("dragend", async () => {
      const position = marker.getLatLng();
      await reverseGeocode(position.lat, position.lng);
    });

    // Handle map click
    map.on("click", async (e) => {
      marker.setLatLng(e.latlng);
      await reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt`
      );
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setLocationName(address);
      onChange(address, lat, lng);
    } catch (error) {
      console.error("Geocoding error:", error);
      const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setLocationName(fallback);
      onChange(fallback, lat, lng);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&accept-language=pt&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        mapInstanceRef.current.setView([lat, lng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }

        setLocationName(result.display_name);
        onChange(result.display_name, lat, lng);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="location-search">Pesquisar Localização</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="location-search"
              placeholder="Ex: Maputo, Moçambique"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button type="button" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? "A pesquisar..." : "Pesquisar"}
          </Button>
        </div>
      </div>

      <div>
        <Label>Localização Selecionada</Label>
        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm flex-1">{locationName || "Clique no mapa para selecionar"}</span>
        </div>
      </div>

      <div>
        <Label>Mapa (Clique ou arraste o marcador para selecionar)</Label>
        <div
          ref={mapRef}
          className="w-full h-[400px] rounded-md border overflow-hidden"
        />
      </div>
    </div>
  );
}
