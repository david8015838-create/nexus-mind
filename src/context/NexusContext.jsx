import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, ensureSeedData } from '../db/database';
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
  const userProfile = useLiveQuery(() => 
    db.settings.get('userProfile')
  );
  const [currentContactId, setCurrentContactId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
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
      const profile = await db.settings.get('userProfile');
      
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await setDoc(userDocRef, { 
        profile, 
        lastSynced: new Date(),
        email: currentUser.email 
      }, { merge: true });

      const contactsColRef = collection(firestore, 'users', currentUser.uid, 'contacts');
      const batch = writeBatch(firestore);
      
      allContacts.forEach(contact => {
        const contactRef = doc(contactsColRef, contact.id);
        batch.set(contactRef, contact);
      });

      await batch.commit();
      console.log("Synced to cloud successfully");
    } catch (error) {
      console.error("Sync Error:", error);
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

      const contactsColRef = collection(firestore, 'users', currentUser.uid, 'contacts');
      const querySnapshot = await getDocs(contactsColRef);
      
      const cloudContacts = [];
      querySnapshot.forEach(doc => {
        cloudContacts.push(doc.data());
      });

      if (cloudContacts.length > 0) {
        await db.contacts.bulkPut(cloudContacts);
      }
      console.log("Synced from cloud successfully");
    } catch (error) {
      console.error("Download Error:", error);
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
          links: [],
          categories: ['朋友', '同事', '家人', '交際', '重要']
        });
      }
    };
    ensureSeedData();
    initProfile();
  }, []);

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

  return (
    <NexusContext.Provider value={{
      contacts,
      currentContactId,
      setCurrentContactId,
      userProfile,
      updateProfile,
      addContact,
      updateContact,
      deleteContact,
      addMemory,
      customPrompt,
      currentUser,
      login,
      logout,
      syncToCloud,
      syncFromCloud,
      isSyncing
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
