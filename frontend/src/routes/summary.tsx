import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, CardSection } from '../components/ui/Card';
import { Markdown } from '../components/Markdown';

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

type Care = {
  id: string;
  pet_id: string;
  time_of_day: 'morning' | 'night' | 'anytime';
  body_markdown: string;
};

type Note = {
  id: string;
  category: 'house' | 'emergency' | 'wifi' | 'trash' | 'other';
  title: string;
  body_markdown: string;
};

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

const categoryOrder: Note['category'][] = ['emergency', 'wifi', 'house', 'trash', 'other'];
const categoryLabel: Record<Note['category'], string> = {
  emergency: 'Emergency',
  wifi: 'WiFi',
  house: 'House',
  trash: 'Trash',
  other: 'Other',
};

export function Summary() {
  const [data, setData] = useState<{ trip: Trip; pets: Pet[]; care: Care[]; notes: Note[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ trip: Trip; pets: Pet[]; care: Care[]; notes: Note[] }>('/trip/current')
      .then(setData)
      .catch(() => setError("Couldn't load the summary."));
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-ink-3">Loading…</p>;

  const careByPet = data.care.reduce<Record<string, Care[]>>((acc, c) => {
    (acc[c.pet_id] ||= []).push(c);
    return acc;
  }, {});

  const notesByCategory = data.notes.reduce<Record<string, Note[]>>((acc, n) => {
    (acc[n.category] ||= []).push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-10 fadein">
      <header>
        <div className="text-[12px] uppercase tracking-widest text-ink-3">Summary</div>
        <h1 className="font-display text-[30px] leading-tight font-semibold text-ink mt-0.5">{data.trip.name}</h1>
        {(data.trip.start_date || data.trip.end_date) && (
          <p className="text-ink-2 mt-1 text-[15px]">
            {fmtDate(data.trip.start_date)} – {fmtDate(data.trip.end_date)}
          </p>
        )}
        {data.trip.notes_markdown && (
          <div className="mt-4">
            <Markdown>{data.trip.notes_markdown}</Markdown>
          </div>
        )}
      </header>

      <section>
        <SectionHeading>The pets</SectionHeading>
        <div className="grid sm:grid-cols-2 gap-4">
          {data.pets.map((p) => (
            <PetCard key={p.id} pet={p} care={careByPet[p.id] ?? []} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>House notes</SectionHeading>
        <div className="space-y-3">
          {categoryOrder.map(
            (cat) =>
              notesByCategory[cat]?.length > 0 && (
                <div key={cat}>
                  <div className="text-[11px] uppercase tracking-widest text-ink-3 mb-1.5">{categoryLabel[cat]}</div>
                  <Card>
                    {(notesByCategory[cat] ?? []).map((n, i, arr) => (
                      <CardSection key={n.id} className={i < arr.length - 1 ? 'border-b border-rule' : ''}>
                        <div className="font-medium text-ink mb-1">{n.title}</div>
                        <Markdown>{n.body_markdown}</Markdown>
                      </CardSection>
                    ))}
                  </Card>
                </div>
              ),
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[22px] font-semibold text-ink mb-4">{children}</h2>;
}

function PetCard({ pet, care }: { pet: Pet; care: Care[] }) {
  return (
    <Card>
      {pet.photo_url ? (
        <div className="aspect-square sm:aspect-[4/5] bg-surface-2 overflow-hidden">
          <img src={pet.photo_url} alt={pet.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="aspect-square sm:aspect-[4/5] bg-surface-2 flex items-center justify-center">
          <span className="font-display text-[56px] text-ink-3">{pet.name.charAt(0)}</span>
        </div>
      )}
      <CardSection>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[24px] font-semibold text-ink">{pet.name}</h3>
          <span className="text-[12px] uppercase tracking-widest text-ink-3">{pet.species}</span>
        </div>
        <p className="text-sm text-ink-2 mt-0.5">
          {[pet.breed, pet.age_years ? `${pet.age_years} yrs` : null, pet.color].filter(Boolean).join(' · ')}
        </p>
        {pet.quirks_markdown && (
          <div className="mt-3">
            <Markdown>{pet.quirks_markdown}</Markdown>
          </div>
        )}
        {care.length > 0 && (
          <div className="mt-4 pt-4 border-t border-rule space-y-3">
            {care.map((c) => (
              <div key={c.id}>
                <div className="text-[11px] uppercase tracking-widest text-ink-3 mb-1">{c.time_of_day}</div>
                <Markdown>{c.body_markdown}</Markdown>
              </div>
            ))}
          </div>
        )}
      </CardSection>
    </Card>
  );
}

function fmtDate(d: string | null): string {
  if (!d) return 'TBD';
  // Accept either 'YYYY-MM-DD' or a full ISO timestamp — slice to YMD so the
  // parsed Date is unambiguous about the calendar day regardless of timezone.
  const ymd = d.length > 10 ? d.slice(0, 10) : d;
  const parsed = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'TBD';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
