// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebaseClient"; // <-- tu inicialización central con initializeFirestore

// --- Tipos (idénticos a los que compartiste) ---
import type { Timestamp, FieldValue } from "firebase/firestore";

export interface TypeProject {
  updatedAt: Timestamp | FieldValue;
  url: string;
}
export type ProjectsMap = {
  goatHeart?: TypeProject;
  goatMusic?: TypeProject;
  goatBody?: TypeProject;
  [k: string]: TypeProject | undefined;
};
export interface UserDoc {
  lastUpdated: Timestamp | FieldValue;
  phone: string;
  projects: ProjectsMap;
}

// --- Utils ---
const normalizePhone = (s: string) => (s || "").replace(/\D/g, "");

async function findUserByPhone(phone: string): Promise<(UserDoc & { id: string }) | null> {
  const usersCol = collection(db, "users");

  // 1) Intentar docId === phone
  const byId = await getDoc(doc(usersCol, phone));
  if (byId.exists()) return { id: byId.id, ...(byId.data() as UserDoc) };

  // 2) Buscar por campo phone
  const q = query(usersCol, where("phone", "==", phone), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as UserDoc) };
  }

  return null;
}

export default function Home() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [goatBodyUrl, setGoatBodyUrl] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const onConsultar = async () => {
    setMensaje(null);
    setGoatBodyUrl(null);

    const clean = normalizePhone(phone);
    if (!clean) {
      setMensaje("Ingresa un celular válido.");
      return;
    }

    setLoading(true);
    try {
      const user = await findUserByPhone(clean);
      if (!user) {
        setMensaje("No encontramos un usuario con ese celular.");
        return;
      }

      const projects = user.projects || {};
      const bodyUrl = projects.goatBody?.url?.trim();
      const heartUrl = projects.goatHeart?.url?.trim();

      if (bodyUrl && heartUrl) {
        setGoatBodyUrl(bodyUrl);
      } else {
        setMensaje("Para realizar tu GOAT Memory, realiza todas las experiencias.");
      }
    } catch (e) {
      console.error(e);
      setMensaje("Ocurrió un error consultando la información.");
    } finally {
      setLoading(false);
    }
  };

  // Link absoluto a /api/download con la URL real en base64
  const qrHref = useMemo(() => {
    if (!goatBodyUrl || !origin) return "";
    const b64 =
      typeof window === "undefined"
        ? ""
        : btoa(unescape(encodeURIComponent(goatBodyUrl)));
    return `${origin}/api/download?u=${encodeURIComponent(b64)}`;
  }, [goatBodyUrl, origin]);

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">GOAT Memory</h1>

        <label className="block text-sm font-medium">
          Ingresar celular
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Ej: 3001234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 outline-none"
          />
        </label>

        <button
          onClick={onConsultar}
          disabled={loading}
          className="w-full rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? "Consultando..." : "Consultar"}
        </button>

        {mensaje && (
          <div className="rounded-lg border p-3 text-sm">{mensaje}</div>
        )}

        {goatBodyUrl && qrHref && (
          <div className="rounded-lg border p-4 space-y-3 text-center">
            <div className="font-medium">Escanea para descargar tu GOAT Body</div>
            <div className="flex justify-center">
              <QRCodeSVG value={qrHref} size={220} includeMargin />
            </div>
            <div className="text-xs break-all">
              También puedes <a className="underline" href={qrHref}>abrir el enlace</a>.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
