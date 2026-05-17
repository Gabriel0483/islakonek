'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).catch((error: FirestoreError) => {
    if (error.code === 'permission-denied') {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: data,
        })
      )
    } else {
      console.warn(`Firestore setDoc non-fatal error (${error.code}):`, error.message);
    }
  })
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const promise = addDoc(colRef, data)
    .catch((error: FirestoreError) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: colRef.path,
            operation: 'create',
            requestResourceData: data,
          })
        )
      } else {
        console.warn(`Firestore addDoc non-fatal error (${error.code}):`, error.message);
      }
    });
  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch((error: FirestoreError) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: data,
          })
        )
      } else {
        console.warn(`Firestore updateDoc non-fatal error (${error.code}):`, error.message);
      }
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch((error: FirestoreError) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
          })
        )
      } else {
        console.warn(`Firestore deleteDoc non-fatal error (${error.code}):`, error.message);
      }
    });
}
