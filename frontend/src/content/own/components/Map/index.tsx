import { useState } from 'react';
import {
  GoogleMap,
  InfoWindowF,
  MarkerF,
  useJsApiLoader
} from '@react-google-maps/api';
import { mapStyle } from './mapStyle';
import { googleMapsConfig } from '../../../../config';
import { Box, Link, Typography } from '@mui/material';

// Must be a stable reference: the loader reloads the script if the array identity changes.
const libraries: ('geometry' | 'drawing' | 'places')[] = [
  'geometry',
  'drawing',
  'places'
];

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

function LocalMap({ locations, select, onSelect, selected }) {
  const [selectedLocation, setSelectedLocation] = useState<Location>();
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    lat: number;
    lng: number;
  }>();

  const markerIcon = {
    url: '/static/images/markers/red.png',
    scaledSize: new window.google.maps.Size(25, 25)
  };
  const defaultCenter = { lat: 0, lng: 0 };
  return (
    <GoogleMap
      mapContainerStyle={{ height: '100%' }}
      // Set the starting view once, like the old defaultCenter/defaultZoom; passing center and zoom
      // as props would snap the map back on every re-render (selecting a marker, picking a point).
      onLoad={(map) => {
        map.setCenter(selected ?? defaultCenter);
        map.setZoom(locations?.length ? 6 : 2);
        if (locations.length) {
          const bounds = new window.google.maps.LatLngBounds();
          locations.forEach((location) => bounds.extend(location.coordinates));
          map.fitBounds(bounds);
        }
      }}
      onClick={(event) => {
        if (select && onSelect) {
          const coordinates = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          setSelectedCoordinates(coordinates);
          onSelect(coordinates);
        }
      }}
      options={{ styles: mapStyle, streetViewControl: false }}
    >
      {!select && (
        <>
          {locations.map((location, index) => (
            <MarkerF
              key={index}
              position={location.coordinates}
              title={location.title}
              onClick={() => setSelectedLocation(location)}
              icon={markerIcon}
            />
          ))}
          {selectedLocation && (
            <InfoWindowF
              onCloseClick={() => setSelectedLocation(null)}
              position={selectedLocation.coordinates}
            >
              <Box>
                <Link
                  variant="h6"
                  color="primary"
                  href={`/app/locations/${selectedLocation.id}`}
                >
                  {selectedLocation.title}
                </Link>
                <Typography variant="subtitle1">
                  {selectedLocation.address}
                </Typography>
              </Box>
            </InfoWindowF>
          )}
        </>
      )}
      {select && (selectedCoordinates ?? selected) && (
        <MarkerF position={selectedCoordinates ?? selected} icon={markerIcon} />
      )}
    </GoogleMap>
  );
}
export default function Map({
  dimensions,
  locations = [],
  select,
  selected,
  onSelect
}: MapProps) {
  const { apiKey } = googleMapsConfig;
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries
  });

  return (
    <div
      style={{
        width: dimensions.width ?? 500,
        height: dimensions.height ?? 500
      }}
    >
      {isLoaded && (
        <LocalMap
          locations={locations}
          select={select}
          onSelect={onSelect}
          selected={selected}
        />
      )}
    </div>
  );
}
