/**
 * Stock Media — busca e download de imagens stock.
 *
 * Quando VITE_PEXELS_API_KEY está definida, busca na API real do Pexels.
 * Caso contrário, usa dataset placeholder local (picsum.photos).
 *
 * A interface pública (StockImage, StockSearchParams, searchStockImages,
 * downloadStockImage) permanece a mesma independente da fonte de dados.
 */
import { createLogger } from './logger';
import { searchPexelsPhotos, type PexelsPhoto } from './pexelsApi';
import { getPexelsApiKey } from './env';

const log = createLogger('stockMedia');

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface StockImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  alt: string;
  source: 'pexels' | 'unsplash' | 'placeholder';
  tags: string[];
}

export interface StockSearchParams {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  page?: number;
  perPage?: number;
}

// ---------------------------------------------------------------------------
// Placeholder — fallback quando VITE_PEXELS_API_KEY não está definida
// ---------------------------------------------------------------------------

const PLACEHOLDER_IMAGES: ReadonlyArray<StockImage> = [
  { id: 'ph-01', url: 'https://picsum.photos/seed/studio01/800/600', thumbnailUrl: 'https://picsum.photos/seed/studio01/400/300', width: 800, height: 600, alt: 'Cenário de estúdio profissional', source: 'placeholder', tags: ['estúdio', 'profissional', 'fundo'] },
  { id: 'ph-02', url: 'https://picsum.photos/seed/nature02/800/600', thumbnailUrl: 'https://picsum.photos/seed/nature02/400/300', width: 800, height: 600, alt: 'Paisagem natural com montanhas', source: 'placeholder', tags: ['natureza', 'montanha', 'paisagem'] },
  { id: 'ph-03', url: 'https://picsum.photos/seed/city03/800/600', thumbnailUrl: 'https://picsum.photos/seed/city03/400/300', width: 800, height: 600, alt: 'Cena urbana moderna', source: 'placeholder', tags: ['cidade', 'urbano', 'moderno'] },
  { id: 'ph-04', url: 'https://picsum.photos/seed/tech04/800/600', thumbnailUrl: 'https://picsum.photos/seed/tech04/400/300', width: 800, height: 600, alt: 'Tecnologia e inovação', source: 'placeholder', tags: ['tecnologia', 'digital', 'inovação'] },
  { id: 'ph-05', url: 'https://picsum.photos/seed/office05/800/600', thumbnailUrl: 'https://picsum.photos/seed/office05/400/300', width: 800, height: 600, alt: 'Escritório moderno de trabalho', source: 'placeholder', tags: ['escritório', 'trabalho', 'corporativo'] },
  { id: 'ph-06', url: 'https://picsum.photos/seed/ocean06/800/600', thumbnailUrl: 'https://picsum.photos/seed/ocean06/400/300', width: 800, height: 600, alt: 'Oceano com ondas calmas', source: 'placeholder', tags: ['oceano', 'praia', 'água'] },
  { id: 'ph-07', url: 'https://picsum.photos/seed/sunset07/800/600', thumbnailUrl: 'https://picsum.photos/seed/sunset07/400/300', width: 800, height: 600, alt: 'Pôr do sol dourado', source: 'placeholder', tags: ['pôr do sol', 'céu', 'dourado'] },
  { id: 'ph-08', url: 'https://picsum.photos/seed/forest08/800/600', thumbnailUrl: 'https://picsum.photos/seed/forest08/400/300', width: 800, height: 600, alt: 'Floresta densa e verde', source: 'placeholder', tags: ['floresta', 'verde', 'árvore'] },
  { id: 'ph-09', url: 'https://picsum.photos/seed/abstract09/800/600', thumbnailUrl: 'https://picsum.photos/seed/abstract09/400/300', width: 800, height: 600, alt: 'Arte abstrata colorida', source: 'placeholder', tags: ['abstrato', 'arte', 'colorido'] },
  { id: 'ph-10', url: 'https://picsum.photos/seed/minimal10/800/600', thumbnailUrl: 'https://picsum.photos/seed/minimal10/400/300', width: 800, height: 600, alt: 'Fundo minimalista limpo', source: 'placeholder', tags: ['minimalista', 'limpo', 'fundo'] },
  { id: 'ph-11', url: 'https://picsum.photos/seed/gradient11/800/600', thumbnailUrl: 'https://picsum.photos/seed/gradient11/400/300', width: 800, height: 600, alt: 'Gradiente suave de cores', source: 'placeholder', tags: ['gradiente', 'cor', 'suave'] },
  { id: 'ph-12', url: 'https://picsum.photos/seed/books12/800/600', thumbnailUrl: 'https://picsum.photos/seed/books12/400/300', width: 800, height: 600, alt: 'Livros e educação', source: 'placeholder', tags: ['livro', 'educação', 'estudo'] },
  { id: 'ph-13', url: 'https://picsum.photos/seed/music13/800/600', thumbnailUrl: 'https://picsum.photos/seed/music13/400/300', width: 800, height: 600, alt: 'Instrumentos musicais', source: 'placeholder', tags: ['música', 'instrumento', 'som'] },
  { id: 'ph-14', url: 'https://picsum.photos/seed/space14/800/600', thumbnailUrl: 'https://picsum.photos/seed/space14/400/300', width: 800, height: 600, alt: 'Espaço sideral e estrelas', source: 'placeholder', tags: ['espaço', 'estrela', 'cosmos'] },
  { id: 'ph-15', url: 'https://picsum.photos/seed/food15/800/600', thumbnailUrl: 'https://picsum.photos/seed/food15/400/300', width: 800, height: 600, alt: 'Comida gourmet apresentada', source: 'placeholder', tags: ['comida', 'gourmet', 'culinária'] },
  { id: 'ph-16', url: 'https://picsum.photos/seed/sport16/800/600', thumbnailUrl: 'https://picsum.photos/seed/sport16/400/300', width: 800, height: 600, alt: 'Esporte e atividade física', source: 'placeholder', tags: ['esporte', 'fitness', 'ação'] },
  { id: 'ph-17', url: 'https://picsum.photos/seed/whiteboard17/800/600', thumbnailUrl: 'https://picsum.photos/seed/whiteboard17/400/300', width: 800, height: 600, alt: 'Quadro branco para anotações', source: 'placeholder', tags: ['quadro branco', 'anotação', 'educação'] },
  { id: 'ph-18', url: 'https://picsum.photos/seed/team18/800/600', thumbnailUrl: 'https://picsum.photos/seed/team18/400/300', width: 800, height: 600, alt: 'Equipe colaborando', source: 'placeholder', tags: ['equipe', 'colaboração', 'grupo'] },
  { id: 'ph-19', url: 'https://picsum.photos/seed/retro19/800/600', thumbnailUrl: 'https://picsum.photos/seed/retro19/400/300', width: 800, height: 600, alt: 'Estética retrô vintage', source: 'placeholder', tags: ['retrô', 'vintage', 'clássico'] },
  { id: 'ph-20', url: 'https://picsum.photos/seed/light20/800/600', thumbnailUrl: 'https://picsum.photos/seed/light20/400/300', width: 800, height: 600, alt: 'Iluminação dramática', source: 'placeholder', tags: ['luz', 'dramático', 'sombra'] },
];

// ---------------------------------------------------------------------------
// Funções auxiliares (apenas para o fallback placeholder)
// ---------------------------------------------------------------------------

function filterByOrientation(
  images: ReadonlyArray<StockImage>,
  orientation?: 'landscape' | 'portrait' | 'square',
): ReadonlyArray<StockImage> {
  if (!orientation) {
    return images;
  }

  return images.filter((img) => {
    const ratio = img.width / img.height;

    switch (orientation) {
      case 'landscape':
        return ratio > 1.1;
      case 'portrait':
        return ratio < 0.9;
      case 'square':
        return ratio >= 0.9 && ratio <= 1.1;
      default:
        return true;
    }
  });
}

function filterByQuery(
  images: ReadonlyArray<StockImage>,
  query: string,
): ReadonlyArray<StockImage> {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return images;
  }

  return images.filter((img) => {
    const searchableText = `${img.alt} ${img.tags.join(' ')}`.toLowerCase();
    return searchableText.includes(normalizedQuery);
  });
}

function paginate(
  images: ReadonlyArray<StockImage>,
  page: number,
  perPage: number,
): ReadonlyArray<StockImage> {
  const start = (page - 1) * perPage;
  return images.slice(start, start + perPage);
}

// ---------------------------------------------------------------------------
// Mapeamento Pexels → StockImage
// ---------------------------------------------------------------------------

/** Converte uma foto da API Pexels para o tipo StockImage do app */
function mapPexelsPhoto(photo: PexelsPhoto): StockImage {
  // Extrai palavras-chave do alt text como tags simples
  const tags = photo.alt
    .split(/[\s,;.]+/)
    .filter((word) => word.length > 3)
    .slice(0, 6);

  return {
    id: String(photo.id),
    url: photo.src.large2x,
    thumbnailUrl: photo.src.small,
    width: photo.width,
    height: photo.height,
    alt: photo.alt,
    source: 'pexels',
    tags,
  };
}

// ---------------------------------------------------------------------------
// Função de busca placeholder (fallback sem API key)
// ---------------------------------------------------------------------------

/** Busca no dataset local quando VITE_PEXELS_API_KEY não está disponível */
function searchPlaceholderImages(params: StockSearchParams): StockImage[] {
  const { query, orientation, page = 1, perPage = 12 } = params;

  let results = filterByQuery(PLACEHOLDER_IMAGES, query);
  results = filterByOrientation(results, orientation);
  results = paginate(results, page, perPage);

  return [...results];
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Busca imagens stock por termo e orientação.
 *
 * Com VITE_PEXELS_API_KEY definida: busca na API real do Pexels.
 * Sem a chave: fallback para dataset placeholder local (20 imagens).
 */
export async function searchStockImages(
  params: StockSearchParams,
): Promise<StockImage[]> {
  const { query, orientation, page = 1, perPage = 12 } = params;

  log.info('Buscando imagens stock', { query, orientation, page, perPage });

  // Tenta API Pexels quando a chave está disponível
  const apiKey = getPexelsApiKey();
  if (apiKey) {
    const response = await searchPexelsPhotos(
      { query, orientation, page, perPage },
      apiKey,
    );
    return response.photos.map(mapPexelsPhoto);
  }

  // Fallback: busca local no placeholder
  log.info('VITE_PEXELS_API_KEY não definida — usando placeholder');
  return searchPlaceholderImages(params);
}

/**
 * Baixa uma imagem stock como Blob.
 */
export async function downloadStockImage(image: StockImage): Promise<Blob> {
  log.info('Baixando imagem stock', { id: image.id });

  const response = await fetch(image.url);

  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem stock: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.startsWith('image/')) {
    throw new Error(`Resposta não é uma imagem (content-type: ${contentType ?? 'ausente'})`);
  }

  return response.blob();
}
