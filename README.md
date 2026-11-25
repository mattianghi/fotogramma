# Fotogramma

Diario personale di film e serie TV: segna ciò che guardi, valuta film, serie, singole stagioni e singoli episodi, costruisci il tuo **Pantheon** di preferiti e consiglia i titoli agli amici con un link.

Web app installabile (PWA): funziona nel browser e si aggiunge alla schermata Home di iPhone e Android come un'app.

## Funzioni

- **Scopri**: titoli di tendenza, al cinema, serie del momento, attori della settimana, "Continua a guardare", lista "Da vedere", consigli basati sui tuoi voti.
- **Cerca**: film, serie TV e attori, con filtri e navigazione per genere.
- **Schede film e serie**: locandina, trama, cast con foto, troupe, trailer, dove vederlo in streaming in Italia, titoli simili.
- **Voti a mezze stelle** (da 0,5 a 5) con breve recensione. Per le serie si vota la serie intera, ogni stagione e ogni episodio, con il grafico "Andamento della stagione" (i tuoi voti a confronto con quelli del pubblico).
- **Attori**: biografia, galleria, filmografia completa con i titoli che hai già visto e il tuo voto medio sui loro lavori.
- **Profilo**: il Pantheon in alto (carosello 3D dei preferiti: film, serie o attori, riordinabili), statistiche, distribuzione dei voti, generi preferiti, gli attori che vedi più spesso.
- **Diario**: cronologia mese per mese con mappa dell'attività.
- **Amici**: consigli inviati e ricevuti. Il consiglio viaggia dentro il link (WhatsApp, Telegram…), quindi non serve un server.
- Backup ed esportazione dei dati in JSON.

## Avvio

```bash
npm install
npm run dev
```

Al primo avvio l'app chiede il nome e una chiave **TMDB** gratuita (https://www.themoviedb.org/settings/api). In alternativa la chiave può essere inserita al momento della build:

```bash
echo "VITE_TMDB_KEY=la_tua_chiave" > .env.local
npm run build
```

`npm run build` genera la cartella `dist/`: è statica e si pubblica su qualsiasi hosting (Netlify, Vercel, GitHub Pages, Cloudflare Pages).

## Tecnologie

React 18 + TypeScript + Vite, nessuna libreria UI esterna. I dati dell'utente sono salvati nel `localStorage` del dispositivo.

## Crediti

Dati e immagini forniti da [TMDB](https://www.themoviedb.org). Questo prodotto usa l'API TMDB ma non è approvato né certificato da TMDB.
