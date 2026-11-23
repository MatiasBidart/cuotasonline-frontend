import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/site-header";
import ShareButton from "../../components/share-button";
import { getApiBaseUrl, Product } from "../../lib/api";

async function getProduct(id: number): Promise<Product | null> {
  const apiUrl = getApiBaseUrl();
  if (!apiUrl) {
    throw new Error("Falta configurar NEXT_PUBLIC_API_URL con la URL pública del backend.");
  }
  const response = await fetch(`${apiUrl}/public/products/${id}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudo consultar el producto.");
  const payload = await response.json() as { success: boolean; data: Product };
  if (!payload.success) throw new Error("No se pudo consultar el producto.");
  return payload.data;
}

export default async function ProductPage({ params }: PageProps<"/producto/[id]">) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <main className="public-page">
      <SiteHeader />
      <div className="public-content">
        <Link href="/" className="text-sm font-semibold text-[var(--accent)]">← Volver a CuotasOnline</Link>
        <article className="public-product surface-card">
          <div className="product-image relative flex aspect-[16/10] items-center justify-center overflow-hidden">
            {product.img ? (
              <Image src={product.img} alt={product.name} fill unoptimized className="object-contain p-8" />
            ) : (
              <div className="text-center text-[var(--mute)]">
                <svg aria-hidden="true" className="mx-auto mb-2" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" />
                </svg>
                <span className="text-xs">IMAGEN DEL PRODUCTO</span>
              </div>
            )}
          </div>
          <div className="p-6 sm:p-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--accent)]">Catálogo CuotasOnline</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink)]">{product.name}</h1>
              </div>
              <ShareButton />
            </div>
            <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-[var(--mute)]">
              {product.description || "Consultá con un vendedor para conocer más sobre este producto."}
            </p>
            <p className="mt-6 text-xs text-[var(--mute)]">
              {product.created_at ? `Publicado el ${new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(new Date(product.created_at))}` : ""}
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
