'use client';

interface EditorialNote {
  id: string;
  note: string;
  note_type: string;
  editor_name: string;
  editor_color: string;
  created_at: string;
}

interface EditorialNoteDisplayProps {
  notes: EditorialNote[];
  onDelete?: (noteId: string) => void;
}

export function EditorialNoteDisplay({ notes, onDelete }: EditorialNoteDisplayProps) {
  const visibleNotes = notes.filter(n => n.note_type === 'note');
  if (visibleNotes.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {visibleNotes.map(note => (
        <div key={note.id} className="flex items-start gap-2 p-2 bg-amber-50/60 border border-amber-200/50 rounded-lg text-xs">
          <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <div className="flex-1 min-w-0">
            <span className="text-amber-800">{note.note}</span>
            <span className="text-amber-500 ml-1">— {note.editor_name}</span>
          </div>
          {onDelete && (
            <button onClick={() => onDelete(note.id)} className="text-amber-400 hover:text-red-500 flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
