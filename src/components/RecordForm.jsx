import { useEffect, useState } from 'react';
import { ImagePlus, Save } from 'lucide-react';

export default function RecordForm({ existing, onSubmit, onCancel, saving, apiConfigured }) {
  const [team, setTeam] = useState(existing?.team ?? '');
  const [season, setSeason] = useState(existing?.season ?? '');
  const [conference, setConference] = useState(existing?.conference ?? '');
  const [id, setId] = useState(existing?.id ?? '');
  const [group, setGroup] = useState(existing?.group ?? 'NBA');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(existing?.image ?? '');

  useEffect(() => {
    if (!imageFile) return undefined;
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  function submit(event) {
    event.preventDefault();
    onSubmit({
      ...(existing ?? {}),
      id: id.trim(),
      image: existing?.image ?? '',
      team: team.trim(),
      season: season.trim(),
      conference: conference.trim(),
      group: group.trim(),
    }, imageFile);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-col gap-5 sm:flex-row">
        <label className="upload-preview group relative flex aspect-[4/3] w-full max-w-[250px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-line-strong bg-wash sm:w-[230px]">
          {previewUrl ? <img src={previewUrl} alt="Selected image preview" className="h-full w-full object-contain" /> : (
            <span className="flex flex-col items-center gap-2 text-center text-muted"><ImagePlus size={26} strokeWidth={1.5} /><span className="text-[11px] font-bold">Choose an image</span><span className="text-[10px]">Original file stays intact</span></span>
          )}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Choose original image"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
          />
          {previewUrl && <span className="absolute inset-x-0 bottom-0 bg-ink/75 py-2 text-center text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">Replace image</span>}
        </label>
        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
          <label className="form-field sm:col-span-2"><span>Team name <b>*</b></span><input required value={team} onChange={(event) => setTeam(event.target.value)} placeholder="Chicago Bulls" /></label>
          <label className="form-field"><span>Season <b>*</b></span><input required value={season} onChange={(event) => setSeason(event.target.value)} placeholder="1998-99" /></label>
          <label className="form-field"><span>Conference <b>*</b></span><input required value={conference} onChange={(event) => setConference(event.target.value)} placeholder="Eastern Conference" /></label>
          <label className="form-field"><span>Record ID</span><input value={id} onChange={(event) => setId(event.target.value)} placeholder="Generated when left blank" /></label>
          <label className="form-field"><span>Collection</span><input value={group} onChange={(event) => setGroup(event.target.value)} placeholder="NBA" /></label>
        </div>
      </div>
      <div className="rounded-md border border-amber-line bg-amber-wash px-4 py-3 text-[11px] leading-5 text-amber-ink">
        {apiConfigured
          ? 'The original file will be sent to the configured archive API. No browser-side resizing is performed.'
          : 'Read-only preview: saving requires a writable API. Selecting an image only previews it in this browser; no file or JSON is saved.'}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && <button type="button" className="button-secondary min-h-10 px-4 text-[11px] font-bold" onClick={onCancel}>Cancel</button>}
        <button type="submit" disabled={saving} className="button-primary inline-flex min-h-10 items-center gap-2 px-4 text-[11px] font-bold disabled:cursor-wait disabled:opacity-60">
          <Save size={15} /> {saving ? 'Saving...' : existing ? 'Save changes' : 'Create record'}
        </button>
      </div>
    </form>
  );
}