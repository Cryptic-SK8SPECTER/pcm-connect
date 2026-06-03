import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

interface LocationPickerProps {
  value: string;
  onChange: (location: string, coordinates?: [number, number]) => void;
  onCoordinatesChange?: (coordinates: [number, number]) => void;
}

export function LocationPicker({ value, onChange, onCoordinatesChange }: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [32.5732, -25.9655], // Moçambique central
        zoom: 5,
      });

      // Adicionar controles de navegação
      newMap.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );

      // Adicionar busca de localização
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxToken,
        mapboxgl: mapboxgl as any,
        marker: false,
        placeholder: 'Pesquisar localização...',
      });

      newMap.addControl(geocoder, 'top-left');

      // Quando seleciona uma localização da busca
      geocoder.on('result', (e) => {
        const { result } = e;
        const coordinates: [number, number] = result.center;
        const placeName = result.place_name;
        
        onChange(placeName, coordinates);
        if (onCoordinatesChange) {
          onCoordinatesChange(coordinates);
        }

        // Adicionar ou mover marcador
        if (marker.current) {
          marker.current.setLngLat(coordinates);
        } else {
          marker.current = new mapboxgl.Marker({ draggable: true })
            .setLngLat(coordinates)
            .addTo(newMap);

          marker.current.on('dragend', () => {
            const lngLat = marker.current!.getLngLat();
            const coords: [number, number] = [lngLat.lng, lngLat.lat];
            
            // Fazer geocoding reverso
            fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${mapboxToken}`
            )
              .then((res) => res.json())
              .then((data) => {
                if (data.features && data.features.length > 0) {
                  onChange(data.features[0].place_name, coords);
                  if (onCoordinatesChange) {
                    onCoordinatesChange(coords);
                  }
                }
              });
          });
        }
      });

      // Adicionar marcador ao clicar no mapa
      newMap.on('click', (e) => {
        const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];

        // Adicionar ou mover marcador
        if (marker.current) {
          marker.current.setLngLat(coordinates);
        } else {
          marker.current = new mapboxgl.Marker({ draggable: true })
            .setLngLat(coordinates)
            .addTo(newMap);

          marker.current.on('dragend', () => {
            const lngLat = marker.current!.getLngLat();
            const coords: [number, number] = [lngLat.lng, lngLat.lat];
            
            fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${mapboxToken}`
            )
              .then((res) => res.json())
              .then((data) => {
                if (data.features && data.features.length > 0) {
                  onChange(data.features[0].place_name, coords);
                  if (onCoordinatesChange) {
                    onCoordinatesChange(coords);
                  }
                }
              });
          });
        }

        // Fazer geocoding reverso para obter o nome do local
        fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?access_token=${mapboxToken}`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data.features && data.features.length > 0) {
              onChange(data.features[0].place_name, coordinates);
              if (onCoordinatesChange) {
                onCoordinatesChange(coordinates);
              }
            }
          });
      });

      map.current = newMap;

      return () => {
        if (marker.current) marker.current.remove();
        newMap.remove();
      };
    } catch (error) {
      console.error('Erro ao inicializar mapa:', error);
    }
  }, [onChange, onCoordinatesChange]);

  return (
    <div className="space-y-3">
      <div 
        ref={mapContainer} 
        className="w-full h-[400px] rounded-lg border border-border overflow-hidden"
      />
      <div>
        <Label htmlFor="localizacao-display">Localização Selecionada</Label>
        <Input
          id="localizacao-display"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Pesquise ou clique no mapa"
          className="mt-1"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Pesquise, clique no mapa ou arraste o marcador para selecionar a localização
      </p>
    </div>
  );
}
