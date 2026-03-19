import type { User } from "@/types";
import type { FirebaseSession } from "@/lib/firebase-auth";

export function firebaseSessionToUser(firebaseSession: FirebaseSession): User {
  return {
    id: firebaseSession.uid,
    name: firebaseSession.displayName || firebaseSession.email.split("@")[0] || "مستخدم",
    username: firebaseSession.email || firebaseSession.uid,
    email: firebaseSession.email || `${firebaseSession.uid}@local`,
    role: firebaseSession.role,
    avatar: firebaseSession.photoURL || undefined,
    createdAt: new Date().toISOString(),
  };
}
