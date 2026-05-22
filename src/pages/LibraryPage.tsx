import { Library } from '../components/Library';
import { DocumentHead } from '../components/DocumentHead';
import { getPageSeo } from '../lib/seo';

const seo = getPageSeo({
  title: 'Biblioteca',
  description: 'Gerencie seus projetos, áudios, vídeos e gerações.',
  path: '/app/biblioteca',
});

export function LibraryPage() {
  return (
    <>
      <DocumentHead {...seo} />
      <Library />
    </>
  );
}
