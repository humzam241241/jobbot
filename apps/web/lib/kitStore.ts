import { TailorResponseT } from "@/lib/schemas/resume";

type Kit = { id: string; data: TailorResponseT; createdAt: number };
const TTL_MS = 1000 * 60 * 60; // 1h

class KitStore {
  private map = new Map<string, Kit>();
  set(id: string, data: TailorResponseT) { this.map.set(id, { id, data, createdAt: Date.now() }); }
  get(id: string): TailorResponseT | null {
    const k = this.map.get(id);
    if (!k) return null;
    if (Date.now() - k.createdAt > TTL_MS) { this.map.delete(id); return null; }
    return k.data;
  }
}
export const kitStore = new KitStore();
