'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#f7f6f2', color: '#16161a', padding: '4rem 1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 400 }}>Não foi possível carregar o portal agora.</h1>
        <p style={{ color: '#6b6a66' }}>Tente novamente em alguns instantes.</p>
        <button onClick={reset} style={{ marginTop: '1.5rem', padding: '0.75rem 1.25rem', background: '#16161a', color: '#f7f6f2', border: 0, borderRadius: 6 }}>
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
