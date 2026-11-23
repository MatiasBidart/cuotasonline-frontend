# CuotasOnline — Frontend

Aplicación web con Next.js, React y Tailwind CSS para administrar clientes, vendedores, productos, ventas y planes de cuotas.

## Desarrollo local

1. Iniciá el backend desde `../backend` con `npm run dev`; siempre escucha en `http://localhost:3000`.
2. Instalá dependencias con `npm install`.
3. Iniciá el frontend con `npm run dev` y abrí `http://localhost:3001`; Next.js usa siempre el puerto 3001.

En desarrollo local, el frontend llama a `http://localhost:3000/api` y no hace falta configurar `.env.local` ni `NEXT_PUBLIC_API_URL`. El frontend llama a la API Express y no usa datos de demostración. El backend conserva las credenciales de Supabase; no configures la clave de servicio en este proyecto.

## Despliegue

En el proveedor de Next.js, configurá `NEXT_PUBLIC_API_URL` con la URL pública del backend más `/api` (por ejemplo, `https://api.ejemplo.com/api`) y volvé a desplegar. En el backend configurá `FRONTEND_URL` con el dominio público del frontend. En producción no se usa `localhost` como destino alternativo, para evitar que la app intente conectarse a la computadora de cada visitante. Los puertos fijos 3000 y 3001 corresponden al desarrollo local.

Para crear las cuentas locales de prueba (administrador, cliente y vendedor), seguí la sección **Cuentas locales de prueba** en el README del backend. En modo desarrollo, el formulario de inicio ofrece botones para completar esos accesos. No borres la información actual de la base para probarlos.

Los enlaces públicos de completar cuenta duran 20 minutos y solo pueden usarse una vez. Para enviar invitaciones, configurá SMTP y `FRONTEND_URL` en el `.env` del backend y aplicá la migración Supabase indicada en su README.

El detalle compartible de cada producto está en `/producto/<id>`. Para una experiencia offline tipo Google Keep hace falta una PWA con almacenamiento local y una cola de sincronización idempotente; las ventas no deben figurar como confirmadas hasta que el backend las acepte. Esto queda como una etapa aparte para evitar prometer que una venta offline ya quedó registrada.

## Funcionalidades

- Inicio de sesión de Supabase y panel adaptado al rol administrador, vendedor o cliente.
- Resumen, directorios, ficha de contacto de clientes, productos, ventas y cuotas pendientes.
- Alta de productos con descripción y URL de imagen.
- Alta de cuentas de cliente y vendedor desde administración.
- Registro de ventas por parte del vendedor.
- Contactos de clientes con teléfono, domicilio y URL de Google Maps; la ficha muestra el botón **Ubicación** cuando hay un enlace válido.

Al crear una cuenta de cliente, completá **Domicilio** y, si está disponible, **Link al Mapa** con una URL de Google Maps. En la ficha del cliente, el botón **Ubicación** abre ese enlace en otra pestaña. La API valida el formato de la URL. La migración `202611230001_contact_map_link.sql` del backend debe aplicarse en Supabase antes de enviar este campo; esta también elimina el antiguo `streets_between`.

El backend todavía no registra pagos parciales, por lo que los planes se muestran íntegramente pendientes.
