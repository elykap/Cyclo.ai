import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
const firebaseConfig = {
    apiKey: "AIzaSyDkY9spXkcjQufxceVLocUnqsZf6GEXgIo",
    authDomain: "cyclo-6bd6e.firebaseapp.com",
    projectId: "cyclo-6bd6e",
    storageBucket: "cyclo-6bd6e.firebasestorage.app",
    messagingSenderId: "955901798530",
    appId: "1:955901798530:web:413ef4754916f6b115ac9b"
}
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app