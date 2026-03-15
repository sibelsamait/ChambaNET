import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

interface GeoChamba {
  id: string;
  titulo: string;
  descripcion: string;
  pago_clp: number;
  estado: string;
  direccion_texto: string;
  ubicacion_lat: number;
  ubicacion_lng: number;
  empleador?: {
    nombres?: string | null;
    apellido_paterno?: string | null;
    promedio_valoracion?: number | null;
  } | null;
  distancia_km?: number;
}

interface GeoChambaRow {
  id: string;
  titulo: string;
  descripcion: string;
  pago_clp: number;
  estado: string;
  direccion_texto: string;
  ubicacion_lat: number | null;
  ubicacion_lng: number | null;
  empleador?:
    | {
        nombres?: string | null;
        apellido_paterno?: string | null;
        promedio_valoracion?: number | null;
      }[]
    | null;
}

function parseNumber(value: string | null) {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadius = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseNumber(searchParams.get('lat'));
  const lng = parseNumber(searchParams.get('lng'));
  const radiusKm = parseNumber(searchParams.get('radiusKm')) ?? 25;
  const minPago = parseNumber(searchParams.get('minPago'));
  const maxPago = parseNumber(searchParams.get('maxPago'));
  const oficio = (searchParams.get('oficio') || '').trim().toLowerCase();
  const north = parseNumber(searchParams.get('north'));
  const south = parseNumber(searchParams.get('south'));
  const east = parseNumber(searchParams.get('east'));
  const west = parseNumber(searchParams.get('west'));

  try {
    const { data, error } = await supabase
      .from('chambas')
      .select(
        `
          id,
          titulo,
          descripcion,
          pago_clp,
          estado,
          direccion_texto,
          ubicacion_lat,
          ubicacion_lng,
          empleador:usuarios (
            nombres,
            apellido_paterno,
            promedio_valoracion
          )
        `
      )
      .eq('estado', 'PUBLICADA')
      .not('ubicacion_lat', 'is', null)
      .not('ubicacion_lng', 'is', null)
      .limit(350);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const normalizedRows: GeoChamba[] = ((data || []) as GeoChambaRow[])
      .filter((row) => row.ubicacion_lat !== null && row.ubicacion_lng !== null)
      .map((row) => ({
        id: row.id,
        titulo: row.titulo,
        descripcion: row.descripcion,
        pago_clp: row.pago_clp,
        estado: row.estado,
        direccion_texto: row.direccion_texto,
        ubicacion_lat: row.ubicacion_lat as number,
        ubicacion_lng: row.ubicacion_lng as number,
        empleador: row.empleador?.[0] ?? null,
      }));

    const filteredRows = normalizedRows
      .filter((row) => {
        if (!oficio) {
          return true;
        }

        const haystack = `${row.titulo} ${row.descripcion || ''}`.toLowerCase();
        return haystack.includes(oficio);
      })
      .filter((row) => {
        if (minPago !== null && row.pago_clp < minPago) {
          return false;
        }

        if (maxPago !== null && row.pago_clp > maxPago) {
          return false;
        }

        return true;
      });

    const visibleChambas = filteredRows
      .filter((row) => {
        if (north === null || south === null || east === null || west === null) {
          return true;
        }

        const inLat = row.ubicacion_lat <= north && row.ubicacion_lat >= south;
        const inLng = west <= east
          ? row.ubicacion_lng >= west && row.ubicacion_lng <= east
          : row.ubicacion_lng >= west || row.ubicacion_lng <= east;

        return inLat && inLng;
      })
      .map((row) => {
        if (lat === null || lng === null) {
          return row;
        }

        const distance = haversineKm(lat, lng, row.ubicacion_lat, row.ubicacion_lng);
        return {
          ...row,
          distancia_km: Number(distance.toFixed(2)),
        };
      })
      .filter((row) => {
        if (lat === null || lng === null) {
          return true;
        }

        return typeof row.distancia_km === 'number' ? row.distancia_km <= radiusKm : true;
      })
      .sort((a, b) => {
        const distA = typeof a.distancia_km === 'number' ? a.distancia_km : Number.MAX_SAFE_INTEGER;
        const distB = typeof b.distancia_km === 'number' ? b.distancia_km : Number.MAX_SAFE_INTEGER;
        return distA - distB;
      });

    return NextResponse.json(
      {
        mensaje: 'Chambas geolocalizadas recuperadas con éxito',
        total: visibleChambas.length,
        chambas: visibleChambas,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Error interno al obtener las chambas geolocalizadas.' }, { status: 500 });
  }
}
