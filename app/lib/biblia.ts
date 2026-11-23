"use client";

import { useEffect, useState } from "react";

type Versiculo = {
  frase: string;
  cita: string;
};

type Cache = {
  versiculo: Versiculo;
  vence: number;
};

const CLAVE = "bible-versiculo";
const DURACION = 60 * 60 * 1000; // Una hora.

let memoria: Cache | null = null;
let pendiente: Promise<Versiculo> | null = null;

export async function obtenerVersiculo(): Promise<Versiculo> {
  if (memoria && Date.now() < memoria.vence) {
    return memoria.versiculo;
  }

  try {
    const guardado: Cache | null = JSON.parse(
      localStorage.getItem(CLAVE) || "null"
    );

    if (
      guardado?.versiculo?.frase &&
      guardado?.versiculo?.cita &&
      Date.now() < guardado.vence
    ) {
      memoria = guardado;
      return guardado.versiculo;
    }
  } catch {
    // Podemos continuar aunque el almacenamiento no esté disponible.
  }

  // Comparte la llamada si varios componentes consultan al mismo tiempo.
  if (pendiente) return pendiente;

  pendiente = (async () => {
const respuesta = await fetch("/api/biblia", {
  cache: "no-store",
});
    if (!respuesta.ok) {
      throw new Error("No se pudo obtener el versículo");
    }

    const { random_verse: verso } = await respuesta.json();

    if (!verso?.text?.trim() || !verso?.book) {
      throw new Error("La API devolvió un versículo inválido");
    }

    const versiculo: Versiculo = {
      frase: verso.text.trim(),
      cita: `${verso.book} ${verso.chapter}:${verso.verse}`,
    };

    memoria = {
      versiculo,
      vence: Date.now() + DURACION,
    };

    try {
      localStorage.setItem(CLAVE, JSON.stringify(memoria));
    } catch {
      // El resultado sigue disponible en memoria.
    }

    return versiculo;
  })();

  try {
    return await pendiente;
  } finally {
    pendiente = null;
  }
}

export function useVersiculo() {
  const [versiculo, setVersiculo] = useState<Versiculo | null>(null);

  useEffect(() => {
    let activo = true;

    obtenerVersiculo()
      .then((datos) => {
        if (activo) setVersiculo(datos);
      })
      .catch(console.error);

    return () => {
      activo = false;
    };
  }, []);

  return versiculo;
}