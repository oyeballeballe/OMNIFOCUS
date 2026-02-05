
import { StudySession, Subject, DEFAULT_SUBJECTS, DailyGoal, Task, Exam, ChatMessage } from '../types';

const DB_NAME = 'StudySyncDB';
const DB_VERSION = 5; // Incremented for Exams and Chat
const STORE_SESSIONS = 'sessions';
const STORE_SUBJECTS = 'subjects';
const STORE_GOALS = 'goals';
const STORE_TASKS = 'tasks';
const STORE_EXAMS = 'exams';
const STORE_CHATS = 'chats';

class LocalDB {
  private db: IDBDatabase | null = null;

  async connect(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
          sessionStore.createIndex('dateString', 'dateString', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_SUBJECTS)) {
          const subjectStore = db.createObjectStore(STORE_SUBJECTS, { keyPath: 'id' });
          DEFAULT_SUBJECTS.forEach(sub => subjectStore.add(sub));
        }

        if (!db.objectStoreNames.contains(STORE_GOALS)) {
            const goalStore = db.createObjectStore(STORE_GOALS, { keyPath: 'id' });
            goalStore.createIndex('dateString', 'dateString', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_TASKS)) {
            const taskStore = db.createObjectStore(STORE_TASKS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_EXAMS)) {
            const examStore = db.createObjectStore(STORE_EXAMS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_CHATS)) {
            const chatStore = db.createObjectStore(STORE_CHATS, { keyPath: 'id' });
        }
      };
    });
  }

  // --- Sessions ---

  async saveSession(session: StudySession): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = transaction.objectStore(STORE_SESSIONS);
      const request = store.put(session);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSessionsByDate(dateString: string): Promise<StudySession[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SESSIONS, 'readonly');
      const store = transaction.objectStore(STORE_SESSIONS);
      const index = store.index('dateString');
      const request = index.getAll(dateString);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSessions(): Promise<StudySession[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SESSIONS, 'readonly');
      const store = transaction.objectStore(STORE_SESSIONS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSessionsByDate(dateString: string): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SESSIONS], 'readwrite');
        const store = transaction.objectStore(STORE_SESSIONS);
        const index = store.index('dateString');
        const request = index.getAllKeys(dateString);

        request.onsuccess = () => {
            const keys = request.result;
            keys.forEach(key => store.delete(key));
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearAllSessions(): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SESSIONS], 'readwrite');
        const store = transaction.objectStore(STORE_SESSIONS);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
  }

  // --- Subjects ---

  async getSubjects(): Promise<Subject[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SUBJECTS, 'readonly');
      const store = transaction.objectStore(STORE_SUBJECTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result;
        if (results.length === 0) {
            resolve(DEFAULT_SUBJECTS);
        } else {
            resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSubject(subject: Subject): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_SUBJECTS, 'readwrite');
        const store = transaction.objectStore(STORE_SUBJECTS);
        const request = store.put(subject);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
  }

  async deleteSubject(id: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_SUBJECTS, 'readwrite');
          const store = transaction.objectStore(STORE_SUBJECTS);
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  // --- Goals ---

  async getGoalsByDate(dateString: string): Promise<DailyGoal[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(STORE_GOALS)) {
            resolve([]);
            return;
        }
        const transaction = db.transaction(STORE_GOALS, 'readonly');
        const store = transaction.objectStore(STORE_GOALS);
        const index = store.index('dateString');
        const request = index.getAll(dateString);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
  }

  async saveGoal(goal: DailyGoal): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_GOALS, 'readwrite');
          const store = transaction.objectStore(STORE_GOALS);
          const request = store.put(goal);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  async deleteGoal(id: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_GOALS, 'readwrite');
          const store = transaction.objectStore(STORE_GOALS);
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  async deleteGoalsByDate(dateString: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_GOALS)) { resolve(); return; }
          const transaction = db.transaction([STORE_GOALS], 'readwrite');
          const store = transaction.objectStore(STORE_GOALS);
          const index = store.index('dateString');
          const request = index.getAllKeys(dateString);

          request.onsuccess = () => {
              const keys = request.result;
              keys.forEach(key => store.delete(key));
          };
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
      });
  }

  async clearAllGoals(): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_GOALS)) { resolve(); return; }
          const transaction = db.transaction([STORE_GOALS], 'readwrite');
          const store = transaction.objectStore(STORE_GOALS);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  // --- Tasks ---

  async getTasks(): Promise<Task[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(STORE_TASKS)) {
            resolve([]);
            return;
        }
        const transaction = db.transaction(STORE_TASKS, 'readonly');
        const store = transaction.objectStore(STORE_TASKS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
  }

  async saveTask(task: Task): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_TASKS, 'readwrite');
          const store = transaction.objectStore(STORE_TASKS);
          const request = store.put(task);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  async deleteTask(id: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_TASKS, 'readwrite');
          const store = transaction.objectStore(STORE_TASKS);
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  // --- Exams ---

  async getExams(): Promise<Exam[]> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_EXAMS)) { resolve([]); return; }
          const transaction = db.transaction(STORE_EXAMS, 'readonly');
          const store = transaction.objectStore(STORE_EXAMS);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      });
  }

  async saveExam(exam: Exam): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_EXAMS, 'readwrite');
          const store = transaction.objectStore(STORE_EXAMS);
          const request = store.put(exam);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  async deleteExam(id: string): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_EXAMS, 'readwrite');
          const store = transaction.objectStore(STORE_EXAMS);
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  // --- Chat History ---

  async getChatHistory(): Promise<ChatMessage[]> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_CHATS)) { resolve([]); return; }
          const transaction = db.transaction(STORE_CHATS, 'readonly');
          const store = transaction.objectStore(STORE_CHATS);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
      });
  }

  async saveChatMessage(message: ChatMessage): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_CHATS, 'readwrite');
          const store = transaction.objectStore(STORE_CHATS);
          const request = store.put(message);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  async clearChatHistory(): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          if (!db.objectStoreNames.contains(STORE_CHATS)) { resolve(); return; }
          const transaction = db.transaction(STORE_CHATS, 'readwrite');
          const store = transaction.objectStore(STORE_CHATS);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }
}

export const dbService = new LocalDB();
