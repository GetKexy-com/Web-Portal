import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  set(key: string, value: any, ttlMs: number): void {
    const item = {
      value,
      expiry: Date.now() + ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(item));
  }

  get<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const item = JSON.parse(raw);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value as T;
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }
}
