import { useRef, useState } from 'react';
import { actions, getState, State, useStore } from '../lib/store';
import { verifyKey } from '../lib/tmdb';
import { BackButton } from '../components/Detail';
import { toast } from '../components/ui';
import { Icon } from '../components/Icon';

export default function Settings() {
  const profile = useStore((s) => s.profile);
  const apiKey = useStore((s) => s.apiKey);
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [key, setKey] = useState(apiKey);
  const file = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fotogramma-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as State;
      if (data.version !== 1 || typeof data.entries !== 'object') throw new Error();
      actions.importAll(data);
      toast('Backup ripristinato');
    } catch { toast('File non valido'); }
  };

  return (
    <div className="page settings">
      <header className="page-head with-back"><BackButton /><h1 className="display small">Impostazioni</h1></header>

      <section className="card form">
        <h2 className="rail-title">Profilo</h2>
        <label>Nome<input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} /></label>
        <label>Nome utente<input className="field" value={handle} onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9_.]/gi, '').toLowerCase())} maxLength={24} /></label>
        <label>Bio<textarea className="field" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} placeholder="Es. Nolan, Kubrick e maratone di serie coreane." /></label>
        <button className="btn primary" disabled={!name.trim()} onClick={() => { actions.setProfile({ name: name.trim(), handle, bio: bio.trim() }); toast('Profilo aggiornato'); }}>Salva profilo</button>
      </section>

      <section className="card form">
        <h2 className="rail-title">Catalogo TMDB</h2>
        <label>Chiave API o token<input className="field" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} autoComplete="off" /></label>
        <button className="btn ghost" onClick={async () => {
          try { await verifyKey(key.trim()); actions.setApiKey(key.trim()); toast('Chiave verificata ✓'); } catch { toast('Chiave non valida'); }
        }}>Verifica e salva</button>
      </section>

      <section className="card form">
        <h2 className="rail-title">I tuoi dati</h2>
        <p className="muted small">Diario, voti e preferiti sono salvati su questo dispositivo. Esporta un backup per spostarli su un altro telefono o computer.</p>
        <div className="row-btns">
          <button className="btn ghost" onClick={exportData}><Icon name="download" size={16} /> Esporta backup</button>
          <button className="btn ghost" onClick={() => file.current?.click()}><Icon name="upload" size={16} /> Importa</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
        </div>
        <button className="btn danger" onClick={() => { if (confirm('Cancellare tutti i dati di Fotogramma su questo dispositivo?')) { actions.reset(); toast('Dati cancellati'); } }}><Icon name="trash" size={16} /> Cancella tutto</button>
      </section>

      <section className="card">
        <h2 className="rail-title">Installa l'app</h2>
        <p className="muted small"><b>iPhone:</b> in Safari tocca Condividi → “Aggiungi alla schermata Home”.<br /><b>Android:</b> in Chrome apri il menu ⋮ → “Installa app”.</p>
      </section>

      <p className="credit">Dati e immagini forniti da TMDB. Questo prodotto usa l'API TMDB ma non è approvato né certificato da TMDB.</p>
    </div>
  );
}
