"use client";

/**
 * Last-resort boundary: replaces the ROOT layout, so it must render its own
 * <html>/<body> and can't rely on the app's CSS or fonts.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "2rem",
          background: "#000",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ letterSpacing: "0.28em", fontSize: 11, textTransform: "uppercase", opacity: 0.6 }}>Error</p>
        <h1 style={{ fontSize: "clamp(2.5rem, 10vw, 6rem)", lineHeight: 0.95, margin: "1rem 0", textTransform: "uppercase" }}>
          Algo salió mal
        </h1>
        <p style={{ maxWidth: 420, opacity: 0.7 }}>Ocurrió un error inesperado. Intenta de nuevo.</p>
        {error.digest && <p style={{ fontSize: 11, opacity: 0.5 }}>Ref. {error.digest}</p>}
        <div style={{ marginTop: "2rem" }}>
          <button
            type="button"
            onClick={reset}
            style={{ background: "#e10e0e", color: "#fff", border: 0, padding: "1rem 2rem", letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
