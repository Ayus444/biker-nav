// src/lib/offlineStore.ts
import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "biker-nav";
const DB_VERSION = 1;

let db: IDBPDatabase | null = null;

async function getDB() {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("routes")) {
        database.createObjectStore("routes", { keyPath: "id" });
      }
    },
  });
  return db;
}

export interface StoredRoute {
  id: string;
  source: string;
  destination: string;
  data: RouteData;
  savedAt: number;
}

export interface RouteStep {
  action: string;
  streetName: string;
  distance: number;
  distanceText: string;
  duration: number;
  voice: string;
  location: { lat: number; lng: number } | null;
}

export interface RouteData {
  coordinates: [number, number][];
  distance: number;
  distanceText: string;
  duration: number;
  durationText: string;
  steps: RouteStep[];
  engine: string;
  cached?: boolean;
}

export async function saveRoute(
  source: string,
  destination: string,
  data: RouteData
): Promise<void> {
  const database = await getDB();
  const id = `${source}->${destination}`;
  await database.put("routes", { id, source, destination, data, savedAt: Date.now() });
}

export async function loadRoute(
  source: string,
  destination: string
): Promise<StoredRoute | undefined> {
  const database = await getDB();
  const id = `${source}->${destination}`;
  return database.get("routes", id);
}

export async function listRoutes(): Promise<StoredRoute[]> {
  const database = await getDB();
  return database.getAll("routes");
}

export async function deleteRoute(id: string): Promise<void> {
  const database = await getDB();
  await database.delete("routes", id);
}
