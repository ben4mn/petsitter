import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card, CardSection } from '../../components/ui/Card';
import { Input, Label, Textarea } from '../../components/ui/Input';

type Trip = {
  id: string;
  name: string;
  host_household_name: string | null;
  start_date: string | null;
  end_date: string | null;
  address: string | null;
  wifi_ssid: string | null;
  wifi_password: string | null;
  notes_markdown: string | null;
};

type Pet = {
  id: string;
  name: string;
  species: 'cat' | 'dog' | 'other';
  breed: string | null;
  age_years: number | null;
  color: string | null;
  photo_url: string | null;
  quirks_markdown: string | null;
};

type Care = { id: string; pet_id: string; time_of_day: string; body_markdown: string };
type Note = { id: string; category: string; title: string; body_markdown: string };
type Task = { id: string; time_of_day: string; title: string; description_markdown: string | null };

export function AdminTrip() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [care, setCare] = useState<Care[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const load = async () => {
    try {
      const r = await api.get<{ trip: Trip; pets: Pet[]; care: Care[]; notes: Note[]; tasks: Task[] }>('/trip/current');
      setTrip(r.trip);
      setPets(r.pets);
      setCare(r.care);
      setNotes(r.notes);
      setTasks(r.tasks);
    } catch {
      setError("Couldn't load.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveTrip = async () => {
    if (!trip) return;
    setSaving(true);
    try {
      await api.patch(`/admin/trips/${trip.id}`, {
        name: trip.name,
        host_household_name: trip.host_household_name,
        start_date: trip.start_date,
        end_date: trip.end_date,
        address: trip.address,
        wifi_ssid: trip.wifi_ssid,
        wifi_password: trip.wifi_password,
        notes_markdown: trip.notes_markdown,
      });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!trip) return <p className="text-sm text-ink-3">Loading…</p>;

  return (
    <div className="space-y-8">
      <Card>
        <CardSection>
          <h2 className="font-display text-[20px] font-semibold text-ink mb-4">Trip details</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={trip.name} onChange={(e) => setTrip({ ...trip, name: e.target.value })} />
            </div>
            <div>
              <Label>Household</Label>
              <Input
                value={trip.host_household_name ?? ''}
                onChange={(e) => setTrip({ ...trip, host_household_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Start</Label>
              <Input type="date" value={trip.start_date ?? ''} onChange={(e) => setTrip({ ...trip, start_date: e.target.value || null })} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="date" value={trip.end_date ?? ''} onChange={(e) => setTrip({ ...trip, end_date: e.target.value || null })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input value={trip.address ?? ''} onChange={(e) => setTrip({ ...trip, address: e.target.value })} />
            </div>
            <div>
              <Label>WiFi network</Label>
              <Input value={trip.wifi_ssid ?? ''} onChange={(e) => setTrip({ ...trip, wifi_ssid: e.target.value })} />
            </div>
            <div>
              <Label>WiFi password</Label>
              <Input value={trip.wifi_password ?? ''} onChange={(e) => setTrip({ ...trip, wifi_password: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes (markdown)</Label>
              <Textarea
                rows={4}
                value={trip.notes_markdown ?? ''}
                onChange={(e) => setTrip({ ...trip, notes_markdown: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={saveTrip} disabled={saving}>
              {saving ? 'Saving…' : 'Save trip'}
            </Button>
            {savedAt && <span className="text-sm text-ink-3">Saved {savedAt.toLocaleTimeString()}.</span>}
          </div>
        </CardSection>
      </Card>

      <PetsSection trip={trip} pets={pets} care={care} onReload={load} />
      <TasksSection trip={trip} tasks={tasks} onReload={load} />
      <NotesSection trip={trip} notes={notes} onReload={load} />
    </div>
  );
}

function PetsSection({ trip, pets, care, onReload }: { trip: Trip; pets: Pet[]; care: Care[]; onReload: () => void }) {
  const [draft, setDraft] = useState({ name: '', species: 'cat' as Pet['species'], breed: '', age_years: '' });
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!draft.name) return;
    setBusy(true);
    try {
      await api.post('/admin/pets', {
        trip_id: trip.id,
        name: draft.name,
        species: draft.species,
        breed: draft.breed || undefined,
        age_years: draft.age_years ? Number(draft.age_years) : undefined,
      });
      setDraft({ name: '', species: 'cat', breed: '', age_years: '' });
      onReload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardSection>
        <h2 className="font-display text-[20px] font-semibold text-ink mb-4">Pets</h2>
        <div className="space-y-3">
          {pets.map((p) => (
            <PetEditor key={p.id} pet={p} care={care.filter((c) => c.pet_id === p.id)} onReload={onReload} />
          ))}
          <div className="grid sm:grid-cols-4 gap-3 pt-3 border-t border-rule">
            <Input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <select
              value={draft.species}
              onChange={(e) => setDraft({ ...draft, species: e.target.value as Pet['species'] })}
              className="rounded-[10px] border border-rule bg-surface px-3 h-11 text-[16px] sm:text-[15px] focus:outline-none focus:border-accent"
            >
              <option value="cat">cat</option>
              <option value="dog">dog</option>
              <option value="other">other</option>
            </select>
            <Input placeholder="Breed" value={draft.breed} onChange={(e) => setDraft({ ...draft, breed: e.target.value })} />
            <Input
              placeholder="Age"
              type="number"
              step="0.1"
              value={draft.age_years}
              onChange={(e) => setDraft({ ...draft, age_years: e.target.value })}
            />
          </div>
          <Button size="sm" variant="secondary" onClick={add} disabled={busy || !draft.name}>
            {busy ? 'Adding…' : 'Add pet'}
          </Button>
        </div>
      </CardSection>
    </Card>
  );
}

function PetEditor({ pet, care, onReload }: { pet: Pet; care: Care[]; onReload: () => void }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(pet);
  const [careDraft, setCareDraft] = useState({ time_of_day: 'morning' as Care['time_of_day'], body_markdown: '' });
  const [savingPet, setSavingPet] = useState(false);
  const [savedPetAt, setSavedPetAt] = useState<Date | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // When the card expands, bring its header into view so the form isn't
  // hidden under the iOS keyboard when the first input gets focus.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        rowRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }
  }, [open]);

  // Re-sync local state if the parent reloaded with a different pet shape.
  useEffect(() => {
    setLocal(pet);
  }, [pet.id, pet.photo_url]);

  const save = async () => {
    setSavingPet(true);
    try {
      await api.patch(`/admin/pets/${pet.id}`, local);
      setSavedPetAt(new Date());
      onReload();
    } finally {
      setSavingPet(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const r = await api.upload<{ url: string }>(`/admin/upload`, file);
      setLocal((p) => ({ ...p, photo_url: r.url }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div ref={rowRef} className="border border-rule rounded-[10px] scroll-mt-20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 no-tap hover:bg-surface min-h-[52px]"
      >
        <span className="font-medium text-ink">
          {pet.name} <span className="text-ink-3 font-normal">· {pet.species}</span>
        </span>
        <span className="text-ink-3 text-sm" aria-hidden>{open ? '⌃' : '⌄'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-rule pt-4 fadein">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} />
            </div>
            <div>
              <Label>Breed</Label>
              <Input value={local.breed ?? ''} onChange={(e) => setLocal({ ...local, breed: e.target.value })} />
            </div>
            <div>
              <Label>Age</Label>
              <Input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={local.age_years ?? ''}
                onChange={(e) =>
                  setLocal({ ...local, age_years: e.target.value ? Number(e.target.value) : null })
                }
              />
            </div>
            <div>
              <Label>Color</Label>
              <Input value={local.color ?? ''} onChange={(e) => setLocal({ ...local, color: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Quirks</Label>
              <Textarea
                rows={3}
                value={local.quirks_markdown ?? ''}
                onChange={(e) => setLocal({ ...local, quirks_markdown: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Photo</Label>
              <div className="flex items-center gap-3">
                {local.photo_url ? (
                  <img src={local.photo_url} alt="" className="h-16 w-16 rounded-md object-cover border border-rule" />
                ) : (
                  <div className="h-16 w-16 rounded-md border border-rule bg-surface flex items-center justify-center text-ink-3 font-display text-2xl">
                    {local.name.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : local.photo_url ? 'Replace photo' : 'Add photo'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={save} disabled={savingPet}>
              {savingPet ? 'Saving…' : 'Save pet'}
            </Button>
            {savedPetAt && !savingPet && (
              <span className="text-sm text-sage">Saved.</span>
            )}
            <div className="flex-1" />
            <Button
              size="sm"
              variant="danger"
              onClick={async () => {
                if (!confirm(`Remove ${pet.name}?`)) return;
                setBusy(true);
                try {
                  await api.delete(`/admin/pets/${pet.id}`);
                  onReload();
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Delete
            </Button>
          </div>

          <div className="border-t border-rule pt-4">
            <div className="text-[11px] uppercase tracking-widest text-ink-3 mb-2">Care notes</div>
            {care.length === 0 ? (
              <p className="text-sm text-ink-3 mb-3">No care notes yet.</p>
            ) : (
              <ul className="space-y-1.5 mb-3">
                {care.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-start gap-2 text-sm py-2 px-3 rounded-md bg-surface"
                  >
                    <span className="text-ink-3 text-[11px] uppercase tracking-widest w-full sm:w-16 sm:shrink-0">
                      {c.time_of_day}
                    </span>
                    <span className="flex-1 text-ink-2 whitespace-pre-wrap min-w-0">{c.body_markdown}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await api.delete(`/admin/care/${c.id}`);
                        onReload();
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="sm:w-32">
                <Label>When</Label>
                <select
                  value={careDraft.time_of_day}
                  onChange={(e) => setCareDraft({ ...careDraft, time_of_day: e.target.value as any })}
                  className="w-full rounded-[10px] border border-rule bg-surface px-3 h-11 text-[16px] sm:text-[15px]"
                >
                  <option value="morning">morning</option>
                  <option value="night">night</option>
                  <option value="anytime">anytime</option>
                </select>
              </div>
              <div className="flex-1">
                <Label>Instruction</Label>
                <Input
                  placeholder="e.g. 1/3 cup kibble, fresh water"
                  value={careDraft.body_markdown}
                  onChange={(e) => setCareDraft({ ...careDraft, body_markdown: e.target.value })}
                />
              </div>
              <Button
                onClick={async () => {
                  if (!careDraft.body_markdown) return;
                  await api.post('/admin/care', { pet_id: pet.id, ...careDraft });
                  setCareDraft({ time_of_day: 'morning', body_markdown: '' });
                  onReload();
                }}
                disabled={!careDraft.body_markdown}
              >
                Add note
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TasksSection({ trip, tasks, onReload }: { trip: Trip; tasks: Task[]; onReload: () => void }) {
  const [draft, setDraft] = useState({ time_of_day: 'morning' as 'morning' | 'night', title: '', description_markdown: '' });

  const add = async () => {
    if (!draft.title) return;
    await api.post('/admin/tasks', { trip_id: trip.id, ...draft, description_markdown: draft.description_markdown || undefined });
    setDraft({ time_of_day: draft.time_of_day, title: '', description_markdown: '' });
    onReload();
  };

  return (
    <Card>
      <CardSection>
        <h2 className="font-display text-[20px] font-semibold text-ink mb-4">Task templates</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {(['morning', 'night'] as const).map((tod) => (
            <div key={tod}>
              <div className="text-[11px] uppercase tracking-widest text-ink-3 mb-2">{tod}</div>
              <ul className="space-y-1.5">
                {tasks.filter((t) => t.time_of_day === tod).map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-sm py-1.5">
                    <span className="flex-1 min-w-0">
                      <span className="text-ink">{t.title}</span>
                      {t.description_markdown && (
                        <span className="text-ink-3 block sm:inline"> — {t.description_markdown}</span>
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await api.delete(`/admin/tasks/${t.id}`);
                        onReload();
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-rule flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-end">
          <div className="sm:w-32">
            <Label>When</Label>
            <select
              value={draft.time_of_day}
              onChange={(e) => setDraft({ ...draft, time_of_day: e.target.value as any })}
              className="w-full rounded-[10px] border border-rule bg-surface px-3 h-11 text-[16px] sm:text-[15px]"
            >
              <option value="morning">morning</option>
              <option value="night">night</option>
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <Label>Title</Label>
            <Input
              placeholder="Walk Otis"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-0">
            <Label>Description (optional)</Label>
            <Input
              placeholder="20 min, leashes by the door"
              value={draft.description_markdown}
              onChange={(e) => setDraft({ ...draft, description_markdown: e.target.value })}
            />
          </div>
          <Button onClick={add} disabled={!draft.title}>Add task</Button>
        </div>
      </CardSection>
    </Card>
  );
}

function NotesSection({ trip, notes, onReload }: { trip: Trip; notes: Note[]; onReload: () => void }) {
  const [draft, setDraft] = useState({ category: 'house' as Note['category'] | string, title: '', body_markdown: '' });

  const add = async () => {
    if (!draft.title || !draft.body_markdown) return;
    await api.post('/admin/notes', { trip_id: trip.id, ...draft });
    setDraft({ category: 'house', title: '', body_markdown: '' });
    onReload();
  };

  return (
    <Card>
      <CardSection>
        <h2 className="font-display text-[20px] font-semibold text-ink mb-4">House notes</h2>
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex flex-wrap items-start gap-2 sm:gap-3 text-sm border-b border-rule pb-3 last:border-none"
            >
              <span className="text-ink-3 text-[11px] uppercase tracking-widest w-full sm:w-20 sm:shrink-0 sm:mt-1">
                {n.category}
              </span>
              <span className="flex-1 min-w-0">
                <div className="text-ink font-medium">{n.title}</div>
                <div className="text-ink-2 whitespace-pre-wrap">{n.body_markdown}</div>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await api.delete(`/admin/notes/${n.id}`);
                  onReload();
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-rule space-y-2">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="sm:w-40">
              <Label>Category</Label>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="w-full rounded-[10px] border border-rule bg-surface px-3 h-11 text-[16px] sm:text-[15px]"
              >
                <option value="house">house</option>
                <option value="emergency">emergency</option>
                <option value="wifi">wifi</option>
                <option value="trash">trash</option>
                <option value="other">other</option>
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <Label>Title</Label>
              <Input
                placeholder="Trash day"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Body</Label>
            <Textarea
              rows={3}
              placeholder="Bins go out Tuesday night."
              value={draft.body_markdown}
              onChange={(e) => setDraft({ ...draft, body_markdown: e.target.value })}
            />
          </div>
          <Button onClick={add} disabled={!draft.title || !draft.body_markdown}>Add note</Button>
        </div>
      </CardSection>
    </Card>
  );
}
