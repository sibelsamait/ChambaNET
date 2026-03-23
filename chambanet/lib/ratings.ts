import { supabase } from './supabase';

export async function getAverageRatingsByUserIds(userIds: string[]): Promise<Map<string, number | null>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const result = new Map<string, number | null>();

  uniqueIds.forEach((id) => {
    result.set(id, null);
  });

  if (uniqueIds.length === 0) {
    return result;
  }

  const { data, error } = await supabase
    .from('valoraciones')
    .select('receptor_id, estrellas')
    .in('receptor_id', uniqueIds);

  if (error || !data) {
    return result;
  }

  const aggregate = new Map<string, { total: number; count: number }>();

  data.forEach((row) => {
    const receptorId = row.receptor_id as string;
    const estrellas = Number(row.estrellas);
    if (!receptorId || !Number.isFinite(estrellas)) return;

    const prev = aggregate.get(receptorId) ?? { total: 0, count: 0 };
    aggregate.set(receptorId, { total: prev.total + estrellas, count: prev.count + 1 });
  });

  uniqueIds.forEach((id) => {
    const value = aggregate.get(id);
    if (!value || value.count === 0) {
      result.set(id, null);
      return;
    }
    result.set(id, value.total / value.count);
  });

  return result;
}

export async function getAverageRatingForUser(userId: string): Promise<number | null> {
  const map = await getAverageRatingsByUserIds([userId]);
  return map.get(userId) ?? null;
}
