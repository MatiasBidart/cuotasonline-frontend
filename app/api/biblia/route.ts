export async function GET() {
  try {
    const respuesta = await fetch(
      "https://bible-api.com/data/bes/random",
      {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!respuesta.ok) {
      throw new Error(`Biblia API respondió ${respuesta.status}`);
    }

    return Response.json(await respuesta.json());
  } catch (error) {
    console.error("Error consultando Biblia API:", error);

    return Response.json(
      { error: "No se pudo obtener el versículo. Intentá nuevamente." },
      { status: 502 }
    );
  }
}