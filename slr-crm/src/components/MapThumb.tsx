'use client';

export default function MapThumb({ lat, lng, label, kind }: { lat: number; lng: number; label?: string; kind?: 'in'|'out' }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string | undefined;
  const zoom = 15;
  const width = 160;
  const height = 100;
  const pinColor = kind === 'out' ? '00A86B' : 'D90429'; // green for out, red for in

  const appleUrl = `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(label || 'Location')}`;

  if (!token) {
    return (
      <a href={appleUrl} target="_blank" rel="noreferrer" className="inline-block border rounded overflow-hidden">
        <div className="p-2 text-xs text-blue-600 underline">Open in Maps</div>
      </a>
    );
  }

  // Mapbox static image: note order is lon,lat
  const staticUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+${pinColor}(${lng},${lat})/${lng},${lat},${zoom}/${width}x${height}@2x?access_token=${token}`;

  return (
    <a href={appleUrl} target="_blank" rel="noreferrer" className="inline-block border rounded overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={staticUrl} alt={label || 'Map'} width={width} height={height} />
    </a>
  );
}
