/**
 * LibraryPanel — desktop left sidebar thin shell.
 * All library logic lives in LibraryContent (mode="panel").
 */
import LibraryContent from '@/features/library/components/LibraryContent';

const LibraryPanel = () => (
  <aside
    className="flex flex-col flex-shrink-0 border-r overflow-y-auto scrollbar-none"
    style={{ width: '25%', minWidth: '220px', maxWidth: '320px', borderColor: 'rgba(255,255,255,0.06)' }}
  >
    <LibraryContent mode="panel" />
  </aside>
);

export default LibraryPanel;
