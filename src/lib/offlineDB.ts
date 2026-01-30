// Sistema de base de datos IndexedDB para funcionalidad offline robusta
// Mi Puntico - Sistema de Ventas

const DB_NAME = 'mi-puntico-db';
const DB_VERSION = 1;

// Stores (tablas) de IndexedDB
export const STORES = {
  PRODUCTS: 'products',
  SALES: 'sales',
  PENDING_SALES: 'pending_sales',
  CATEGORIES: 'categories',
  SETTINGS: 'settings',
  SYNC_QUEUE: 'sync_queue',
} as const;

export interface PendingOperation {
  id: string;
  type: 'sale' | 'product_update' | 'product_create' | 'product_delete';
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

// Inicializar la base de datos
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store de productos
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        productStore.createIndex('business_id', 'business_id', { unique: false });
        productStore.createIndex('is_active', 'is_active', { unique: false });
      }

      // Store de ventas
      if (!db.objectStoreNames.contains(STORES.SALES)) {
        const salesStore = db.createObjectStore(STORES.SALES, { keyPath: 'id' });
        salesStore.createIndex('business_id', 'business_id', { unique: false });
        salesStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Store de ventas pendientes
      if (!db.objectStoreNames.contains(STORES.PENDING_SALES)) {
        const pendingSalesStore = db.createObjectStore(STORES.PENDING_SALES, { keyPath: 'tempId' });
        pendingSalesStore.createIndex('timestamp', 'timestamp', { unique: false });
        pendingSalesStore.createIndex('businessId', 'businessId', { unique: false });
      }

      // Store de categorías
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        const categoriesStore = db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
        categoriesStore.createIndex('business_id', 'business_id', { unique: false });
      }

      // Store de configuración
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // Store de cola de sincronización
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

// Obtener store con el modo apropiado
async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

// CRUD genérico para IndexedDB
export const db = {
  // Obtener un item por ID
  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const store = await getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Obtener todos los items
  async getAll<T>(storeName: string): Promise<T[]> {
    const store = await getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Obtener items por índice
  async getAllByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const store = await getStore(storeName);
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Guardar un item
  async put<T>(storeName: string, item: T): Promise<void> {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Guardar múltiples items
  async putMany<T>(storeName: string, items: T[]): Promise<void> {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      let completed = 0;
      items.forEach(item => {
        const request = store.put(item);
        request.onsuccess = () => {
          completed++;
          if (completed === items.length) resolve();
        };
        request.onerror = () => reject(request.error);
      });
      if (items.length === 0) resolve();
    });
  },

  // Eliminar un item
  async delete(storeName: string, id: string): Promise<void> {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Limpiar todo un store
  async clear(storeName: string): Promise<void> {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Contar items
  async count(storeName: string): Promise<number> {
    const store = await getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
};

// Funciones específicas para productos
export const productsDB = {
  async saveProducts(products: any[], businessId: string) {
    console.log(`💾 Guardando ${products.length} productos en IndexedDB`);
    await db.putMany(STORES.PRODUCTS, products);
    await db.put(STORES.SETTINGS, {
      key: `products_last_sync_${businessId}`,
      value: Date.now(),
    });
  },

  async getProducts(businessId: string): Promise<any[]> {
    const products = await db.getAllByIndex(STORES.PRODUCTS, 'business_id', businessId);
    console.log(`📦 Recuperados ${products.length} productos de IndexedDB`);
    return products;
  },

  async updateProductStock(productId: string, quantitySold: number) {
    const product = await db.get(STORES.PRODUCTS, productId);
    if (product) {
      (product as any).stock -= quantitySold;
      await db.put(STORES.PRODUCTS, product);
      console.log(`📉 Stock actualizado localmente: ${(product as any).name} (${(product as any).stock})`);
    }
  },
};

// Funciones específicas para ventas pendientes
export const pendingSalesDB = {
  async add(sale: any) {
    await db.put(STORES.PENDING_SALES, sale);
    console.log('💾 Venta guardada en cola offline');
  },

  async getAll(): Promise<any[]> {
    return db.getAll(STORES.PENDING_SALES);
  },

  async remove(tempId: string) {
    await db.delete(STORES.PENDING_SALES, tempId);
    console.log('✅ Venta eliminada de cola offline');
  },

  async count(): Promise<number> {
    return db.count(STORES.PENDING_SALES);
  },
};

// Funciones específicas para cola de sincronización
export const syncQueueDB = {
  async add(operation: Omit<PendingOperation, 'id'>): Promise<string> {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const op: PendingOperation = { ...operation, id };
    await db.put(STORES.SYNC_QUEUE, op);
    console.log(`➕ Operación añadida a cola: ${op.type}`);
    return id;
  },

  async getAll(): Promise<PendingOperation[]> {
    return db.getAll(STORES.SYNC_QUEUE);
  },

  async getPending(): Promise<PendingOperation[]> {
    const all = await this.getAll();
    return all.filter(op => op.status === 'pending');
  },

  async updateStatus(id: string, status: PendingOperation['status'], error?: string) {
    const op = await db.get<PendingOperation>(STORES.SYNC_QUEUE, id);
    if (op) {
      op.status = status;
      if (error) op.error = error;
      await db.put(STORES.SYNC_QUEUE, op);
    }
  },

  async remove(id: string) {
    await db.delete(STORES.SYNC_QUEUE, id);
    console.log(`✅ Operación eliminada de cola: ${id}`);
  },

  async clear() {
    await db.clear(STORES.SYNC_QUEUE);
    console.log('🗑️ Cola de sincronización limpiada');
  },
};

// Inicializar la base de datos al importar
initDB().then(() => {
  console.log('✅ IndexedDB iniciada correctamente');
}).catch((error) => {
  console.error('❌ Error iniciando IndexedDB:', error);
});
