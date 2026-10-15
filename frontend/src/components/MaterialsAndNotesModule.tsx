"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Trash2,
  Plus,
  Search,
  UploadCloud,
  Check,
  Eye,
  X,
} from "lucide-react";

interface MaterialsAndNotesModuleProps {
  notes: any[];
  subjects: any[];
  onAddNote: (note: any) => void;
  onUpdateNote: (note: any) => void;
  onDeleteNote: (id: number) => void;
}

export default function MaterialsAndNotesModule({
  notes,
  subjects,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: MaterialsAndNotesModuleProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "photos">("notes");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");

  // Selected note for editing
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSubjectId, setNoteSubjectId] = useState<number | null>(subjects[0]?.id || null);
  const [questionsSolved, setQuestionsSolved] = useState<number>(0);
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState<string>("All changes saved");

  // Photos & Uploads State
  const [uploadedPhotos, setUploadedPhotos] = useState<
    { id: string; name: string; url: string; date: string; subjectId?: number }[]
  >([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (editingNote) {
      setNoteTitle(editingNote.title);
      setNoteContent(editingNote.content);
      setNoteSubjectId(editingNote.subject);
      setQuestionsSolved(editingNote.questions_solved_count || 0);
      setChecklist(editingNote.checklist_items || []);
    } else {
      setNoteTitle("");
      setNoteContent("");
      setQuestionsSolved(0);
      setChecklist([]);
    }
  }, [editingNote]);

  const handleSaveNote = () => {
    if (!noteTitle.trim()) return;
    setAutosaveStatus("Saving...");

    if (editingNote) {
      onUpdateNote({
        ...editingNote,
        title: noteTitle.trim(),
        content: noteContent,
        subject: noteSubjectId,
        questions_solved_count: questionsSolved,
        checklist_items: checklist,
      });
    } else {
      onAddNote({
        id: Date.now(),
        title: noteTitle.trim(),
        content: noteContent,
        subject: noteSubjectId,
        questions_solved_count: questionsSolved,
        checklist_items: checklist,
        revision_status: "IN_REVIEW",
      });
    }

    setTimeout(() => {
      setAutosaveStatus("All changes saved");
    }, 400);

    setEditingNote(null);
  };

  const addChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklist([
      ...checklist,
      { id: String(Date.now()), text: newChecklistText.trim(), done: false },
    ]);
    setNewChecklistText("");
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(
      checklist.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setUploadedPhotos((prev) => [
          {
            id: String(Date.now() + i),
            name: file.name,
            url,
            date: new Date().toLocaleDateString(),
          },
          ...prev,
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubj =
      selectedSubjectFilter === "ALL" || String(n.subject) === selectedSubjectFilter;
    return matchesSearch && matchesSubj;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Module Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 theme-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 mb-1">
            <FileText className="w-4 h-4" />
            <span>KNOWLEDGE REPOSITORY & PRACTICE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            Notes, Practice & Photos
          </h2>
          <p className="text-xs theme-text-muted mt-1">
            Capture revision notes, track solved questions, and upload photos of handwritten notes or diagrams.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center theme-card border theme-border rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "notes"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "theme-text-muted hover:theme-text-primary"
              }`}
            >
              Notes & Practice
            </button>
            <button
              onClick={() => setActiveTab("photos")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "photos"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "theme-text-muted hover:theme-text-primary"
              }`}
            >
              Photos & Materials
            </button>
          </div>
        </div>
      </div>

      {/* NOTES TAB */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 theme-text-dim absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes and topics..."
                className="w-full pl-10 pr-4 py-2 rounded-xl theme-input text-xs"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="px-3 py-2 rounded-xl theme-input text-xs"
              >
                <option value="ALL">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setEditingNote(null);
                  setNoteTitle("");
                  setNoteContent("");
                  setQuestionsSolved(0);
                  setChecklist([]);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-600/25 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Note
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Notes List (1 Col) */}
            <div className="space-y-3">
              {filteredNotes.map((n) => {
                const subj = subjects.find((s) => s.id === n.subject);
                const active = editingNote?.id === n.id;
                return (
                  <div
                    key={n.id}
                    onClick={() => setEditingNote(n)}
                    className={`p-4 rounded-xl border theme-border cursor-pointer transition-all ${
                      active
                        ? "theme-card-subtle border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50"
                        : "theme-card hover:border-slate-500/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm theme-text-primary truncate">
                        {n.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(n.id);
                        }}
                        className="theme-text-muted hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs theme-text-muted mt-1 line-clamp-2">
                      {n.content || "Empty note content."}
                    </p>

                    <div className="flex items-center justify-between text-[11px] theme-text-dim mt-3 pt-2 border-t theme-border">
                      {subj ? (
                        <span className="flex items-center gap-1.5 font-bold theme-text-secondary">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: subj.color || "#10b981" }}
                          />
                          {subj.name}
                        </span>
                      ) : (
                        <span>General</span>
                      )}
                      <span>{n.questions_solved_count || 0} Solved</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note Editor & Topic Checklist (2 Cols) */}
            <div className="lg:col-span-2 glass-panel-elevated rounded-2xl p-6 theme-border space-y-5">
              <div className="flex items-center justify-between border-b theme-border pb-3">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  {autosaveStatus}
                </span>

                <button
                  onClick={handleSaveNote}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  Save Note
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Note or Topic Title..."
                    className="w-full text-lg font-black bg-transparent border-none theme-text-primary focus:outline-none placeholder:theme-text-dim"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="theme-text-muted mr-2 font-bold">Subject:</label>
                    <select
                      value={noteSubjectId || ""}
                      onChange={(e) =>
                        setNoteSubjectId(e.target.value ? Number(e.target.value) : null)
                      }
                      className="px-2.5 py-1 rounded-lg theme-input font-semibold"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="theme-text-muted font-bold">Questions Solved:</label>
                    <input
                      type="number"
                      min="0"
                      value={questionsSolved}
                      onChange={(e) => setQuestionsSolved(Number(e.target.value))}
                      className="w-16 px-2 py-0.5 rounded-lg theme-input text-center font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Content Area */}
                <div>
                  <textarea
                    rows={8}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write key equations, formulas, edge cases, or concept summaries here (Markdown supported)..."
                    className="w-full p-3.5 rounded-xl theme-input text-sm leading-relaxed font-sans"
                  />
                </div>

                {/* Topic Practice Checklist */}
                <div className="p-4 rounded-xl theme-card-subtle border theme-border space-y-3">
                  <h4 className="font-bold text-xs theme-text-primary uppercase tracking-wider">
                    Topic Practice Checklist
                  </h4>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addChecklistItem())
                      }
                      placeholder="Add practice problem or edge case..."
                      className="flex-1 px-3 py-1.5 rounded-lg theme-input text-xs"
                    />
                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleChecklistItem(item.id)}
                        className="flex items-center gap-2 text-xs theme-text-secondary p-1.5 rounded hover:bg-slate-500/10 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => {}}
                          className="rounded border-slate-400 text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                        <span className={item.done ? "line-through theme-text-dim" : ""}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHOTOS TAB */}
      {activeTab === "photos" && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-8 border-2 border-dashed theme-border hover:border-emerald-500/50 text-center transition-colors">
            <input
              type="file"
              id="photo-upload"
              multiple
              accept="image/*,application/pdf"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <label
              htmlFor="photo-upload"
              className="flex flex-col items-center justify-center gap-2 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm theme-text-primary">
                Upload handwritten notes, screenshots, or PDF study materials
              </p>
              <p className="text-xs theme-text-muted">
                Supports JPG, PNG, WEBP, and PDF documents. Photos are stored locally in StudyOS.
              </p>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedPhotos.length === 0 ? (
              <div className="sm:col-span-4 text-center py-10 theme-text-dim text-xs">
                No study material uploaded yet. Upload note photos or diagrams above.
              </div>
            ) : (
              uploadedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="glass-panel rounded-xl overflow-hidden theme-border group relative"
                >
                  <div
                    onClick={() => setPreviewPhoto(photo.url)}
                    className="h-44 w-full theme-card-subtle overflow-hidden cursor-pointer flex items-center justify-center relative"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="p-3 flex items-center justify-between text-xs">
                    <span className="font-semibold theme-text-primary truncate">
                      {photo.name}
                    </span>
                    <button
                      onClick={() =>
                        setUploadedPhotos((prev) => prev.filter((p) => p.id !== photo.id))
                      }
                      className="theme-text-muted hover:text-rose-500 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewPhoto}
              alt="Preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain border border-slate-700"
            />
          </div>
        </div>
      )}
    </div>
  );
}
