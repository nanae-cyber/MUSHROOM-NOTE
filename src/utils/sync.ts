// src/utils/sync.ts
// オフラインファースト同期ロジック
import { supabase, isSupabaseConfigured } from './supabase';
import { db } from './db';
import { normalizeImageToJpeg } from './image';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

let syncStatus: SyncStatus = 'idle';
let lastSyncTime: number = 0;
let syncListeners: Array<(status: SyncStatus) => void> = [];
let syncEnabled: boolean = true; // デフォルトON

// 同期のON/OFF設定
export function setSyncEnabled(enabled: boolean) {
  syncEnabled = enabled;
  try {
    localStorage.setItem('sync_enabled', enabled ? '1' : '0');
  } catch {}
  console.log('[Sync] Sync', enabled ? 'enabled' : 'disabled');
}

export function isSyncEnabled(): boolean {
  try {
    const stored = localStorage.getItem('sync_enabled');
    if (stored !== null) {
      syncEnabled = stored === '1';
    }
  } catch {}
  return syncEnabled;
}

// 同期状態の監視
export function onSyncStatusChange(callback: (status: SyncStatus) => void) {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
}

function setSyncStatus(status: SyncStatus) {
  syncStatus = status;
  syncListeners.forEach(cb => cb(status));
}

export function getSyncStatus() {
  return syncStatus;
}

export function getLastSyncTime() {
  return lastSyncTime;
}

// ユーザーIDの取得（メール認証）
async function getUserId(): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured()) {
    console.log('[Sync] Supabase not configured');
    return null;
  }
  
  try {
    const { data, error } = await (supabase as any).auth.getUser();
    
    if (error) {
      console.log('[Sync] Auth error:', error.message);
      return null;
    }
    
    if (data?.user) {
      return data.user.id;
    }
    
    // ログインしていない場合はnullを返す
    console.log('[Sync] User not logged in');
    return null;
  } catch (err) {
    console.error('[Sync] Failed to get user ID:', err);
    return null;
  }
}

// Blobをbase64に変換
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// base64をBlobに変換
function base64ToBlob(base64: string): Blob {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// プラン別の容量制限をチェック
async function checkStorageLimit(userId: string, itemCount: number): Promise<{ allowed: boolean; limit: number; message?: string }> {
  // プラン情報を取得
  const isPremiumPlus = localStorage.getItem('premium') === 'plus';
  const isPremium = localStorage.getItem('premium') === 'true' || isPremiumPlus;
  
  if (!isPremium) {
    return { allowed: false, limit: 0, message: 'クラウド同期はプレミアムプラン以上で利用できます' };
  }
  
  if (isPremiumPlus) {
    // プレミアムプラス: 1000枚まで
    const limit = 1000;
    if (itemCount > limit) {
      return { allowed: false, limit, message: `プレミアムプラスプランの上限（${limit}枚）に達しました` };
    }
    return { allowed: true, limit };
  }
  
  // プレミアム: 100枚まで
  const limit = 100;
  if (itemCount > limit) {
    return { allowed: false, limit, message: `プレミアムプランの上限（${limit}枚）に達しました。プレミアムプラスにアップグレードしてください。` };
  }
  return { allowed: true, limit };
}

// IndexedDBからSupabaseへアップロード
async function uploadToSupabase(userId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return;
  
  const localItems = await db.list();
  console.log(`[Upload] Found ${localItems.length} local items`);
  
  // 容量制限チェック
  const storageCheck = await checkStorageLimit(userId, localItems.length);
  if (!storageCheck.allowed) {
    console.warn(`[Upload] Storage limit exceeded: ${storageCheck.message}`);
    throw new Error(storageCheck.message);
  }
  
  for (const item of localItems) {
    try {
      console.log(`[Upload] Processing item ${item.id}`);
      
      // 既にアップロード済みかチェック
      const { data: existing, error: selectError } = await (supabase as any)
        .from('specimens')
        .select('id, updated_at')
        .eq('user_id', userId)
        .eq('local_id', item.id)
        .single();
      
      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = not found (これは正常)
        console.error('[Upload] Error checking existing:', selectError);
        throw selectError;
      }
      
      const itemUpdatedAt = (item.meta as any)?.detail?.updatedAt || item.createdAt;
      
      // 既存データがあり、ローカルより新しい場合はスキップ
      if (existing && existing.updated_at >= itemUpdatedAt) {
        console.log(`[Upload] Item ${item.id} already up to date, skipping`);
        continue;
      }
      
      console.log(`[Upload] Compressing and converting images for item ${item.id}...`);
      
      // 画像を圧縮してからbase64に変換（クラウド容量を節約）
      const compressedPhoto = await normalizeImageToJpeg(item.photoBlob, 1400, 0.85);
      console.log(`[Upload] Photo compressed: ${item.photoBlob.size} -> ${compressedPhoto.size} bytes`);
      
      const photoBase64 = await blobToBase64(compressedPhoto);
      
      const extraPhotosBase64 = item.extraBlobs
        ? await Promise.all(item.extraBlobs.map(async (b) => {
            const compressed = await normalizeImageToJpeg(b, 1400, 0.85);
            console.log(`[Upload] Extra photo compressed: ${b.size} -> ${compressed.size} bytes`);
            return blobToBase64(compressed);
          }))
        : [];
      
      const record = {
        user_id: userId,
        local_id: item.id,
        created_at: item.createdAt,
        updated_at: itemUpdatedAt,
        photo_base64: photoBase64,
        extra_photos_base64: extraPhotosBase64,
        view: item.view,
        meta: item.meta,
      };
      
      if (existing) {
        console.log(`[Upload] Updating item ${item.id}...`);
        const { error } = await (supabase as any)
          .from('specimens')
          .update(record)
          .eq('id', existing.id);
        if (error) throw error;
        console.log(`[Upload] Item ${item.id} updated successfully`);
      } else {
        console.log(`[Upload] Inserting new item ${item.id}...`);
        const { error } = await (supabase as any)
          .from('specimens')
          .insert(record);
        if (error) throw error;
        console.log(`[Upload] Item ${item.id} inserted successfully`);
      }
    } catch (err) {
      console.error(`[Upload] Failed to upload item ${item.id}:`, err);
      throw err; // エラーを上位に伝播
    }
  }
}

// Supabaseからダウンロード
async function downloadFromSupabase(userId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return;
  
  const { data: remoteItems, error } = await (supabase as any)
    .from('specimens')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  if (!remoteItems) return;
  
  for (const remote of remoteItems) {
    try {
      // ローカルに存在するかチェック
      const local = await db.getRaw(remote.local_id);
      
      // ローカルにない、またはリモートの方が新しい場合
      if (!local || (local.meta as any)?.detail?.updatedAt < remote.updated_at) {
        const photoBlob = base64ToBlob(remote.photo_base64);
        const extraBlobs = (remote.extra_photos_base64 || []).map((b: string) => base64ToBlob(b));
        
        const row = {
          id: remote.local_id,
          createdAt: remote.created_at,
          photoBlob,
          extraBlobs,
          view: remote.view,
          meta: remote.meta,
        };
        
        if (local) {
          // 更新
          await db.update(remote.local_id, row);
        } else {
          // 新規作成（IDを指定して追加する必要があるため、直接IndexedDBに書き込む）
          const idb = await (db as any).openDB?.() || await openDB();
          await new Promise<void>((res, rej) => {
            const tx = idb.transaction('specimens', 'readwrite');
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
            tx.objectStore('specimens').put(row);
          });
        }
      }
    } catch (err) {
      console.error('Failed to download item:', remote.local_id, err);
    }
  }
}

// IndexedDBを直接開く（db.tsの関数を使えない場合のフォールバック）
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('mushroom-note', 2);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// メイン同期関数
export async function syncData(): Promise<void> {
  console.log('[Sync] Starting sync...');
  
  if (!isSyncEnabled()) {
    console.log('[Sync] Sync is disabled, skipping');
    return;
  }
  
  if (!isSupabaseConfigured()) {
    console.log('[Sync] Supabase not configured, skipping sync');
    return;
  }
  
  if (!navigator.onLine) {
    console.log('[Sync] Offline, skipping sync');
    return;
  }
  
  if (syncStatus === 'syncing') {
    console.log('[Sync] Sync already in progress');
    return;
  }
  
  setSyncStatus('syncing');
  
  try {
    console.log('[Sync] Getting user ID...');
    const userId = await getUserId();
    if (!userId) {
      console.log('[Sync] No user logged in, skipping sync (this is normal if not using cloud sync)');
      setSyncStatus('idle');
      return;
    }
    console.log('[Sync] User ID:', userId);
    
    // ローカルデータの件数を確認
    const localItems = await db.list();
    console.log('[Sync] Local items count:', localItems.length);
    
    // 双方向同期
    console.log('[Sync] Starting upload...');
    await uploadToSupabase(userId);
    console.log('[Sync] Upload complete');
    
    console.log('[Sync] Starting download...');
    await downloadFromSupabase(userId);
    console.log('[Sync] Download complete');
    
    lastSyncTime = Date.now();
    setSyncStatus('success');
    console.log('[Sync] Sync successful!');
    
    // 成功状態を3秒後にidleに戻す
    setTimeout(() => {
      if (syncStatus === 'success') {
        setSyncStatus('idle');
      }
    }, 3000);
  } catch (err) {
    // エラーの詳細をログに出力
    if (err instanceof Error) {
      console.error('[Sync] Sync failed:', err.message);
      console.error('[Sync] Error details:', err);
    } else {
      console.error('[Sync] Sync failed:', err);
    }
    
    setSyncStatus('error');
    
    // エラー状態を5秒後にidleに戻す
    setTimeout(() => {
      if (syncStatus === 'error') {
        setSyncStatus('idle');
      }
    }, 5000);
  }
}

// 自動同期の開始
export function startAutoSync(intervalMinutes: number = 5) {
  // オンライン/オフライン検知
  window.addEventListener('online', () => {
    console.log('[Sync] Network online, syncing...');
    syncData();
  });
  
  // 定期同期
  const intervalMs = intervalMinutes * 60 * 1000;
  const timer = setInterval(() => {
    if (navigator.onLine) {
      syncData();
    }
  }, intervalMs);
  
  // 初回同期（データがある場合のみ、かつ同期が有効な場合）
  if (navigator.onLine && isSyncEnabled()) {
    // 少し遅延させて、アプリの初期化が完了してから実行
    setTimeout(() => {
      db.list().then(items => {
        if (items.length > 0) {
          console.log('[Sync] Found local data, starting initial sync...');
          syncData();
        } else {
          console.log('[Sync] No local data to sync');
        }
      });
    }, 2000);
  }
  
  return () => {
    clearInterval(timer);
  };
}

// デバッグ用: windowオブジェクトに公開
if (typeof window !== 'undefined') {
  (window as any).testSync = syncData;
  (window as any).checkSyncConfig = () => {
    console.log('=== Sync Configuration ===');
    console.log('Supabase configured:', isSupabaseConfigured());
    console.log('Supabase client exists:', !!supabase);
    console.log('Online:', navigator.onLine);
    console.log('Sync status:', getSyncStatus());
    console.log('Last sync time:', lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never');
    return {
      configured: isSupabaseConfigured(),
      hasClient: !!supabase,
      online: navigator.onLine,
      status: getSyncStatus(),
      lastSync: lastSyncTime
    };
  };
  (window as any).forceSync = async () => {
    console.log('=== Force Sync ===');
    const items = await db.list();
    console.log('Local items:', items.length);
    if (items.length === 0) {
      console.log('No local data to sync. Please take a photo first.');
      return;
    }
    console.log('Starting sync...');
    await syncData();
  };
  (window as any).clearSupabaseSession = async () => {
    if (!supabase || !isSupabaseConfigured()) {
      console.log('Supabase not configured');
      return;
    }
    console.log('=== Clearing Supabase Session ===');
    const { data: { session } } = await (supabase as any).auth.getSession();
    console.log('Current session:', session);
    await (supabase as any).auth.signOut();
    console.log('Session cleared. Please reload the page.');
    window.location.reload();
  };
}
