import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-4xl font-bold mb-4">Página não encontrada</h2>
      <p className="text-lg text-muted-foreground mb-8">
        Desculpe, não conseguimos encontrar a página que você está procurando.
      </p>
      <Link 
        href="/"
        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
