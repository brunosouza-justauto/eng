// Declare the module to satisfy TypeScript
declare module 'redux-persist-indexeddb-storage' {
    import { Storage } from 'redux-persist';

    interface IndexedDBStorageOptions {
        name?: string;
        storeName?: string;
    }

    function createIdbStorage(options?: IndexedDBStorageOptions): Storage;

    export default createIdbStorage;
} 