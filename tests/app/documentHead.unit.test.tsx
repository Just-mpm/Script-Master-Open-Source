import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { DocumentHead } from '../../src/components/DocumentHead';

describe('DocumentHead', () => {
  beforeEach(() => {
    // Limpa estado do DOM entre testes
    document.title = '';
    document.documentElement.lang = '';
    document.head.querySelectorAll('meta[property^="og:"], meta[name="description"], link[rel="canonical"]').forEach((el) => el.remove());
  });

  it('deve definir document.title quando title é fornecido', () => {
    render(<DocumentHead title="Página Inicial — Script Master" meta={[]} link={[]} locale="" />);
    expect(document.title).toBe('Página Inicial — Script Master');
  });

  it('deve atualizar document.documentElement.lang quando locale é fornecido', () => {
    render(<DocumentHead title="Teste" meta={[]} link={[]} locale="pt-BR" />);
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('não deve alterar document.documentElement.lang quando locale é omitido', () => {
    document.documentElement.lang = 'en';
    render(<DocumentHead title="Teste" meta={[]} link={[]} locale="" />);
    // Sem locale, o useEffect não executa — lang permanece inalterado
    expect(document.documentElement.lang).toBe('en');
  });

  it('deve renderizar meta tags com atributo name', () => {
    const meta = [
      { name: 'description', content: 'Transforme roteiros em áudio com IA' },
      { name: 'robots', content: 'index, follow' },
    ];
    render(<DocumentHead title="Teste" meta={meta} link={[]} locale="" />);

    const description = document.querySelector('meta[name="description"]');
    expect(description).toBeTruthy();
    expect(description?.getAttribute('content')).toBe('Transforme roteiros em áudio com IA');

    const robots = document.querySelector('meta[name="robots"]');
    expect(robots).toBeTruthy();
    expect(robots?.getAttribute('content')).toBe('index, follow');
  });

  it('deve renderizar meta tags com atributo property (OG tags)', () => {
    const meta = [
      { property: 'og:title', content: 'Script Master' },
      { property: 'og:description', content: 'Crie áudios com Gemini TTS' },
    ];
    render(<DocumentHead title="Teste" meta={meta} link={[]} locale="" />);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle?.getAttribute('content')).toBe('Script Master');

    const ogDesc = document.querySelector('meta[property="og:description"]');
    expect(ogDesc).toBeTruthy();
    expect(ogDesc?.getAttribute('content')).toBe('Crie áudios com Gemini TTS');
  });

  it('deve renderizar link tags (canonical, etc.)', () => {
    const link = [
      { rel: 'canonical', href: 'https://script-master.pro/' },
    ];
    render(<DocumentHead title="Teste" meta={[]} link={link} locale="" />);

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).toBeTruthy();
    expect(canonical?.getAttribute('href')).toBe('https://script-master.pro/');
  });

  it('deve funcionar com meta e link vazios (defaults)', () => {
    render(<DocumentHead title="Só título" meta={[]} link={[]} locale="" />);
    expect(document.title).toBe('Só título');
    // Nenhuma meta ou link extra além do title
    const metas = document.head.querySelectorAll('meta[name], meta[property]');
    expect(metas.length).toBe(0);
  });

  it('deve atualizar title ao re-renderizar com novo title', () => {
    const { rerender } = render(<DocumentHead title="Título 1" meta={[]} link={[]} locale="" />);
    expect(document.title).toBe('Título 1');

    rerender(<DocumentHead title="Título 2" meta={[]} link={[]} locale="" />);
    expect(document.title).toBe('Título 2');
  });

  it('deve atualizar lang ao re-renderizar com novo locale', () => {
    const { rerender } = render(<DocumentHead title="Teste" meta={[]} link={[]} locale="pt-BR" />);
    expect(document.documentElement.lang).toBe('pt-BR');

    rerender(<DocumentHead title="Teste" meta={[]} link={[]} locale="en" />);
    expect(document.documentElement.lang).toBe('en');
  });
});
