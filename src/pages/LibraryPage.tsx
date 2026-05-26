/**
 * LibraryPage — thin shell.
 * All library logic lives in LibraryContent (mode="page").
 */
import LibraryContent from '@/features/library/components/LibraryContent';

const LibraryPage = () => (
  <div className="min-h-full bg-swara-bg max-w-2xl mx-auto lg:max-w-none">
    <LibraryContent mode="page" />
  </div>
);

export default LibraryPage;
