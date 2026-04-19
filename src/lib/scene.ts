/**
 * Retorna a cena ativa com base no tempo de reprodução.
 * A cena ativa é a última cujo timestamp é <= currentTime.
 * Retorna null se não houver cenas.
 */
export function resolveActiveScene<T extends { timestamp: number }>(
  scenes: readonly T[],
  currentTime: number,
): T | null {
  if (scenes.length === 0) return null;
  let active = scenes[0];
  for (const scene of scenes) {
    if (scene.timestamp <= currentTime) {
      active = scene;
    } else {
      break;
    }
  }
  return active;
}
