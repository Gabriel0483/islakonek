// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDb_j2KiCAajXvacCpbtOVR-jlZmU-LKZ4",
  authDomain: "studio-6954150183-9f417.firebaseapp.com",
  databaseURL: "https://studio-6954150183-9f417-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "studio-6954150183-9f417",
  storageBucket: "studio-6954150183-9f417.firebasestorage.app",
  messagingSenderId: "331769284679",
  appId: "1:331769284679:web:816648879aded5004b0962"
};

export const isFirebaseConfigValid = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID"
);
