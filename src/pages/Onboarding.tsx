import { useState } from 'react';
import { actions, useStore } from '../lib/store';
import { activeKey, verifyKey } from '../lib/tmdb';
import { Icon } from '../components/Icon';

export default function Onboarding() {
  const hasKey = useStore((s) => !!s.apiKey) || !!activeKey();
  const name = useStore((s) => s.profile.name);
  const [step, setStep] = useState<0 | 1 | 2>(name ? 2 : 0);
  const [n, setN] = useState(name);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const saveKey = async () => {
    setBusy(true); setErr('');
    try { await verifyKey(key.trim()); actions.setApiKey(key.trim()); }
    catch (e) { setErr((e as Error).message === 'Chiave TMDB non valida' ? 'Chiave non valida: ricontrolla di averla copiata tutta.' : 'Non riesco a contattare TMDB. Sei online?'); }
    finally { setBusy(false); }
  };

  return (
    <div className="onb">
      <div className="onb-strip" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <span key={i} />)}</div>
      <div className="onb-glow" aria-hidden="true" />
      <div className="onb-card">
        <img src="./icon.svg" width={56} height={56} alt="" className="onb-logo" />
        {step === 0 && (
          <>
            <h1 className="display">Ogni film<br /><em>lascia un segno.</em></h1>
            <p className="lede">Fotogramma è il tuo diario di film e serie TV. Segna ciò che guardi, dai un voto a stagioni ed episodi, costruisci il tuo Pantheon e consiglia i titoli giusti agli amici.</p>
            <button className="btn primary wide" onClick={() => setStep(1)}>Iniziamo <Icon name="chevron" size={18} /></button>
          </>
        )}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); if (!n.trim()) return; actions.setProfile({ name: n.trim(), handle: n.trim().toLowerCase().replace(/\s+/g, '') }); setStep(hasKey ? 2 : 2); }}>
            <span className="kicker">1 di 2</span>
            <h1 className="display small">Come ti chiami?</h1>
            <p className="lede">Lo vedranno i tuoi amici quando gli consigli qualcosa.</p>
            <input className="field big" autoFocus placeholder="Il tuo nome" value={n} onChange={(e) => setN(e.target.value)} maxLength={30} />
            <button className="btn primary wide" disabled={!n.trim()}>Continua</button>
          </form>
        )}
        {step === 2 && !hasKey && (
          <form onSubmit={(e) => { e.preventDefault(); saveKey(); }}>
            <span className="kicker">2 di 2</span>
            <h1 className="display small">Colleghiamo il catalogo</h1>
            <p className="lede">Locandine, trame, cast ed episodi arrivano da <b>TMDB</b>, il database di cinema più completo. Serve una chiave gratuita:</p>
            <ol className="steps">
              <li>Crea un account su <a href="https://www.themoviedb.org/signup" target="_blank" rel="noreferrer">themoviedb.org</a></li>
              <li>Vai in <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">Impostazioni → API</a> e richiedi una chiave (uso personale)</li>
              <li>Copia la <b>API Key</b> oppure il <b>token di lettura</b> e incollalo qui</li>
            </ol>
            <input className="field" placeholder="Incolla qui la chiave TMDB" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} />
            {err && <p className="err">{err}</p>}
            <button className="btn primary wide" disabled={!key.trim() || busy}>{busy ? 'Verifico…' : 'Collega e entra'}</button>
            <p className="hint">La chiave resta salvata solo su questo dispositivo.</p>
          </form>
        )}
      </div>
      <p className="onb-credit">Dati e immagini forniti da TMDB. Questo prodotto usa l'API TMDB ma non è approvato né certificato da TMDB.</p>
    </div>
  );
}
