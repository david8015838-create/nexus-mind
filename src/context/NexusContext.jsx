import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { auth, googleProvider, firestore } from '../db/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, getDocs, writeBatch } from 'firebase/firestore';

const NexusContext = createContext();

export const useNexus = () => useContext(NexusContext);

export const NexusProvider = ({ children }) => {
  const contacts = useLiveQuery(() => 
    db.contacts.orderBy('lastUpdated').reverse().toArray()
  );
  const schedules = useLiveQuery(() => 
    db.schedules.orderBy('date').toArray()
  );
  const userProfile = useLiveQuery(() => 
    db.settings.get('userProfile')
  );
  const [currentContactId, setCurrentContactId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user has data on cloud
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const localContacts = await db.contacts.count();
        if (localContacts === 0) {
          if (window.confirm('偵測到雲端存有您的社交資料，是否立即同步至此裝置？')) {
            // Need to set user first so syncFromCloud works
            setCurrentUser(user);
            await syncFromCloud();
          }
        }
      }
      
      return user;
    } catch (error) {
      console.error("Login Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const syncToCloud = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const allContacts = await db.contacts.toArray();
      const allSchedules = await db.schedules.toArray();
      const profile = await db.settings.get('userProfile');
      
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await setDoc(userDocRef, { 
        profile, 
        lastSynced: new Date(),
        email: currentUser.email 
      }, { merge: true });

      // Helper for batch processing with mirroring
      const commitInBatches = async (collectionName, dataArray) => {
        const colRef = collection(firestore, 'users', currentUser.uid, collectionName);
        
        // 1. Get existing docs to identify what to delete (Mirroring)
        const existingDocs = await getDocs(colRef);
        const existingIds = existingDocs.docs.map(doc => doc.id);
        const currentIds = dataArray.map(item => item.id);
        const idsToDelete = existingIds.filter(id => !currentIds.includes(id));

        // 2. Process deletions and updates in chunks (Firestore limit is 500)
        let batch = writeBatch(firestore);
        let count = 0;

        // Handle deletions
        for (const id of idsToDelete) {
          batch.delete(doc(colRef, id));
          count++;
          if (count === 500) {
            await batch.commit();
            batch = writeBatch(firestore);
            count = 0;
          }
        }

        // Handle updates/adds
        for (const item of dataArray) {
          // Deep clone to ensure serializable data and handle Dates
          const serializedItem = JSON.parse(JSON.stringify(item));
          batch.set(doc(colRef, item.id), serializedItem);
          count++;
          if (count === 500) {
            await batch.commit();
            batch = writeBatch(firestore);
            count = 0;
          }
        }

        if (count > 0) await batch.commit();
      };

      await commitInBatches('contacts', allContacts);
      await commitInBatches('schedules', allSchedules);

      console.log("Synced to cloud successfully (Mirror Mode)");
    } catch (error) {
      console.error("Sync Error:", error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncFromCloud = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.profile) {
          await db.settings.put({ ...data.profile, id: 'userProfile' });
        }
      }

      // 1. Sync Contacts
      const contactsColRef = collection(firestore, 'users', currentUser.uid, 'contacts');
      const querySnapshot = await getDocs(contactsColRef);
      const cloudContacts = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        // Restore dates from string if needed
        if (data.memories) {
          data.memories = data.memories.map(m => ({
            ...m,
            date: m.date ? new Date(m.date) : new Date()
          }));
        }
        cloudContacts.push(data);
      });

      if (cloudContacts.length > 0) {
        // Mirroring: Clear local and replace with cloud data
        await db.contacts.clear();
        await db.contacts.bulkPut(cloudContacts);
      }

      // 2. Sync Schedules
      const schedulesColRef = collection(firestore, 'users', currentUser.uid, 'schedules');
      const schedulesSnapshot = await getDocs(schedulesColRef);
      const cloudSchedules = [];
      schedulesSnapshot.forEach(doc => {
        const data = doc.data();
        // Ensure date is a Date object
        if (data.date) data.date = new Date(data.date);
        cloudSchedules.push(data);
      });

      if (cloudSchedules.length > 0) {
        await db.schedules.clear();
        await db.schedules.bulkPut(cloudSchedules);
      }

      console.log("Synced from cloud successfully (Mirror Mode)");
    } catch (error) {
      console.error("Download Error:", error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const initProfile = async () => {
      const profile = await db.settings.get('userProfile');
      if (!profile) {
        await db.settings.add({
          id: 'userProfile',
          name: '我的名字',
          bio: '這是我的個人簡介',
          avatar: '',
          themeColor: '#2b6cee',
          links: [],
          categories: ['朋友', '同事', '家人', '交際', '重要']
        });
      }
    };
    initProfile();
  }, []);

  // Theme Color Effect
  useEffect(() => {
    if (userProfile?.themeColor) {
      document.documentElement.style.setProperty('--primary-color', userProfile.themeColor);
      
      // Calculate RGB for transparency
      const hex = userProfile.themeColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      document.documentElement.style.setProperty('--primary-color-rgb', `${r}, ${g}, ${b}`);
    }
  }, [userProfile?.themeColor]);

  const clearAllData = async () => {
    await db.contacts.clear();
  };

  const addContact = async (contact) => {
    const id = crypto.randomUUID();
    await db.contacts.add({ ...contact, id, lastUpdated: new Date() });
    return id;
  };

  const updateContact = async (id, updates) => {
    await db.contacts.update(id, { ...updates, lastUpdated: new Date() });
  };

  const updateProfile = async (updates) => {
    await db.settings.update('userProfile', updates);
  };

  const deleteContact = async (id) => {
    await db.contacts.delete(id);
  };

  const publishProfile = async () => {
    if (!currentUser) throw new Error('請先登入以發佈個人檔案');
    const profile = await db.settings.get('userProfile');
    const publicRef = doc(firestore, 'public_profiles', currentUser.uid);
    
    // 限制發佈的內容：僅照片、名字、簡介、連結
    const publicData = {
      name: profile.name,
      avatar: profile.avatar,
      bio: profile.bio,
      links: profile.links || [],
      uid: currentUser.uid,
      updatedAt: new Date()
    };
    
    await setDoc(publicRef, publicData);
    return currentUser.uid;
  };

  const addMemory = async (contactId, memory) => {
    const contact = await db.contacts.get(contactId);
    if (contact) {
      const memories = [...(contact.memories || []), { 
        ...memory, 
        date: memory.date || new Date() 
      }];
      await db.contacts.update(contactId, { memories, lastUpdated: new Date() });
    }
  };

  // --- Prompt Modal State ---
  const [promptConfig, setPromptConfig] = useState(null);

  const customPrompt = (title, placeholder = '') => {
    return new Promise((resolve) => {
      setPromptConfig({
        title,
        placeholder,
        onConfirm: (value) => {
          setPromptConfig(null);
          resolve(value);
        },
        onCancel: () => {
          setPromptConfig(null);
          resolve(null);
        }
      });
    });
  };

  const addSchedule = async (schedule) => {
    const id = crypto.randomUUID();
    await db.schedules.add({ ...schedule, id });
    return id;
  };

  const updateSchedule = async (id, updates) => {
    await db.schedules.update(id, updates);
  };

  const deleteSchedule = async (id) => {
    await db.schedules.delete(id);
  };

  return (
    <NexusContext.Provider value={{
      contacts,
      schedules,
      currentContactId,
      setCurrentContactId,
      userProfile,
      updateProfile,
      publishProfile,
      addContact,
      updateContact,
      deleteContact,
      addMemory,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      customPrompt,
      promptConfig,
      setPromptConfig,
      currentUser,
      login,
      logout,
      syncToCloud,
      syncFromCloud,
      isSyncing,
      unsavedChanges,
      setUnsavedChanges
    }}>
      {children}
      
      {/* Global Prompt Modal */}
      {promptConfig && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 text-white/90">{promptConfig.title}</h3>
            <input 
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 ring-primary mb-6"
              placeholder={promptConfig.placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') promptConfig.onConfirm(e.target.value);
                if (e.key === 'Escape') promptConfig.onCancel();
              }}
              id="custom-prompt-input"
            />
            <div className="flex gap-3">
              <button 
                onClick={promptConfig.onCancel}
                className="flex-1 py-3 rounded-xl bg-white/5 text-sm font-bold text-white/40 hover:bg-white/10 transition-all"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  const val = document.getElementById('custom-prompt-input').value;
                  promptConfig.onConfirm(val);
                }}
                className="flex-1 py-3 rounded-xl bg-primary text-sm font-bold text-white hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </NexusContext.Provider>
  );
};
