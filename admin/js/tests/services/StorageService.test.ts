/// <reference types="jest" />
import {
  LocalStorageService,
  SessionStorageService,
  MemoryStorageService,
} from '../../services/StorageService';

describe('StorageService', () => {
  // Test for LocalStorageService
  describe('LocalStorageService', () => {
    let localStorageService: LocalStorageService;

    beforeEach(() => {
      localStorage.clear();
      localStorageService = new LocalStorageService();
    });

    test('should set and get values', () => {
      localStorageService.set('testKey', 'testValue');
      expect(localStorageService.get('testKey')).toBe('testValue');
    });

    test('should return default value when key not found', () => {
      expect(localStorageService.get('nonExistentKey', 'defaultValue')).toBe('defaultValue');
    });

    test('should return null when key not found and no default provided', () => {
      expect(localStorageService.get('nonExistentKey')).toBeNull();
    });

    test('should check if key exists', () => {
      localStorageService.set('testKey', 'testValue');
      expect(localStorageService.has('testKey')).toBe(true);
      expect(localStorageService.has('nonExistentKey')).toBe(false);
    });

    test('should remove a key', () => {
      localStorageService.set('testKey', 'testValue');
      localStorageService.remove('testKey');
      expect(localStorageService.get('testKey')).toBeNull();
    });

    test('should clear all keys', () => {
      localStorageService.set('testKey1', 'testValue1');
      localStorageService.set('testKey2', 'testValue2');
      localStorageService.clear();
      expect(localStorageService.get('testKey1')).toBeNull();
      expect(localStorageService.get('testKey2')).toBeNull();
    });

    test('should get all keys', () => {
      localStorageService.set('testKey1', 'testValue1');
      localStorageService.set('testKey2', 'testValue2');
      const keys = localStorageService.keys();
      expect(keys).toContain('testKey1');
      expect(keys).toContain('testKey2');
      expect(keys.length).toBe(2);
    });

    test('should handle complex objects', () => {
      const testObject = {
        name: 'Test Name',
        age: 30,
        nested: { key: 'value' },
      };
      localStorageService.set('testObject', testObject);
      expect(localStorageService.get('testObject')).toEqual(testObject);
    });
  });

  // Test for SessionStorageService
  describe('SessionStorageService', () => {
    let sessionStorageService: SessionStorageService;

    beforeEach(() => {
      sessionStorage.clear();
      sessionStorageService = new SessionStorageService();
    });

    test('should set and get values', () => {
      sessionStorageService.set('testKey', 'testValue');
      expect(sessionStorageService.get('testKey')).toBe('testValue');
    });

    test('should check if key exists', () => {
      sessionStorageService.set('testKey', 'testValue');
      expect(sessionStorageService.has('testKey')).toBe(true);
      expect(sessionStorageService.has('nonExistentKey')).toBe(false);
    });
  });

  // Test for MemoryStorageService
  describe('MemoryStorageService', () => {
    let memoryStorageService: MemoryStorageService;

    beforeEach(() => {
      memoryStorageService = new MemoryStorageService();
      memoryStorageService.clear();
    });

    test('should set and get values', () => {
      memoryStorageService.set('testKey', 'testValue');
      expect(memoryStorageService.get('testKey')).toBe('testValue');
    });

    test('should check if key exists', () => {
      memoryStorageService.set('testKey', 'testValue');
      expect(memoryStorageService.has('testKey')).toBe(true);
      expect(memoryStorageService.has('nonExistentKey')).toBe(false);
    });

    test('should be isolated from other storage types', () => {
      const localStorageService = new LocalStorageService();
      const sessionStorageService = new SessionStorageService();

      // Set values in different storage types
      memoryStorageService.set('testKey', 'memoryValue');
      localStorageService.set('testKey', 'localValue');
      sessionStorageService.set('testKey', 'sessionValue');

      // Each storage should have its own isolated value
      expect(memoryStorageService.get('testKey')).toBe('memoryValue');
      expect(localStorageService.get('testKey')).toBe('localValue');
      expect(sessionStorageService.get('testKey')).toBe('sessionValue');
    });
  });
});
