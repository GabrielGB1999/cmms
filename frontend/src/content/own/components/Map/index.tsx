import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents
} from 'react-leaflet';
import { Box, Link, Typography } from '@mui/material';

interface Location {
  id: number;
  title: string;
  address: string;
  coordinates: { lat: number; lng: number };
}
interface MapProps {
  dimensions?: { width: number; height: number };
  locations?: Location[];
  select?: boolean;
  selected?: { lat: number; lng: number };
  onSelect?: (coordinates: { lat: number; lng: number }) => void;
}

// Leaflet's bundled marker images do not survive webpack, so point it at our own.
const markerIcon = L.icon({
  iconUrl: '/static/images/markers/red.png',
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25]
});

/**
 * The map is usually created while its container is still being laid out (inside a dialog, or
 * behind a tab), so Leaflet measures it at the wrong size. Re-measure once it has settled.
 */
function ResizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const timeout = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timeout);
  }, [map]);
  return null;
}

function ClickToSelect({
  onSelect
}: {
  onSelect: (coordinates: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

export default function Map({
  dimensions,
  locations = [],
  select,
  selected,
  onSelect
}: MapProps) {
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    lat: number;
    lng: number;
  }>();

  // MapContainer only reads its view props on mount, like Google's old defaultCenter/defaultZoom,
  // so the map keeps whatever the user has panned or zoomed to while the screen re-renders.
  const initialView = useMemo(() => {
    if (locations.length)
      return {
        bounds: L.latLngBounds(
          locations.map(({ coordinates }) => [coordinates.lat, coordinates.lng])
        ),
        boundsOptions: { padding: [40, 40] as [number, number], maxZoom: 12 }
      };
    return {
      center: (selected ?? { lat: 0, lng: 0 }) as L.LatLngExpression,
      zoom: selected ? 6 : 2
    };
  }, []);

  const marker = selectedCoordinates ?? selected;

  return (
    <div
      style={{
        width: dimensions?.width ?? 500,
        height: dimensions?.height ?? 500
      }}
    >
      <MapContainer
        {...initialView}
        style={{ height: '100%', width: '100%' }}
        worldCopyJump
      >
        <ResizeOnMount />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {select ? (
          <>
            <ClickToSelect
              onSelect={(coordinates) => {
                setSelectedCoordinates(coordinates);
                onSelect?.(coordinates);
              }}
            />
            {marker && <Marker position={marker} icon={markerIcon} />}
          </>
        ) : (
          locations.map((location) => (
            <Marker
              key={location.id}
              position={location.coordinates}
              title={location.title}
              icon={markerIcon}
            >
              <Popup>
                <Box>
                  <Link
                    variant="h6"
                    color="primary"
                    href={`/app/locations/${location.id}`}
                  >
                    {location.title}
                  </Link>
                  <Typography variant="subtitle1">
                    {location.address}
                  </Typography>
                </Box>
              </Popup>
            </Marker>
          ))
        )}
      </MapContainer>
    </div>
  );
}
