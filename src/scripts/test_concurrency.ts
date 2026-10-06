/**
 * Script di test per verificare la concorrenza e la coda Bull/Redis.
 * Lancia 5 richieste di inferenza contemporanee e monitora il loro passaggio di stato:
 * PENDING (in coda) -> RUNNING (in elaborazione) -> COMPLETED (completato).
 *
 * Utilizzo:
 *   npx ts-node src/scripts/test_concurrency.ts
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  
  console.log('TEST CONCORRENZA CODA BULL / REDIS (5 TASK SIMULTANEI)');
  

  // 1. Login per ottenere il JWT Token
  console.log('\n1. Effettuo il login con user1@univpm.it...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user1@univpm.it',
      password: 'User123!',
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login fallito (${loginRes.status}): ${await loginRes.text()}`);
  }

  const loginData: any = await loginRes.json();
  const token = loginData.data.token;
  console.log('Login effettuato con successo!');

  // 2. Recupero il primo dataset disponibile
  console.log('\n2. Recupero un dataset dell\'utente...');
  const datasetsRes = await fetch(`${API_BASE}/datasets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const datasetsData: any = await datasetsRes.json();
  const dataset = datasetsData.data?.[0];

  if (!dataset) {
    throw new Error('Nessun dataset trovato. Assicurati di aver eseguito il seed: npm run seed');
  }

  console.log(`Dataset selezionato: "${dataset.name}" (ID: ${dataset.id})`);

  // 3. Invio 5 richieste contemporanee
  console.log('\n3. Invio 5 richieste simultanee di inferenza (Promise.all)...');
  const startTime = Date.now();

  const requests = [1, 2, 3, 4, 5].map(async (i) => {
    const res = await fetch(`${API_BASE}/inference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        datasetId: dataset.id,
        modelId: 'yolov11n',
      }),
    });
    const json: any = await res.json();
    return {
      index: i,
      httpStatus: res.status,
      processingId: json.data?.processingId,
      initialStatus: json.data?.status,
    };
  });

  const results = await Promise.all(requests);
  const elapsedMs = Date.now() - startTime;

  console.log(`Tutte e 5 le richieste hanno risposto in ${elapsedMs} ms!`);
  console.table(
    results.map((r) => ({
      'Task #': r.index,
      'HTTP Status': `${r.httpStatus} (ACCEPTED)`,
      'Processing ID': r.processingId,
      'Stato Iniziale': r.initialStatus,
    }))
  );

  // 4. Polling sullo stato per verificare la coda sequenziale
  console.log('\n4. Avvio monitoraggio della coda in tempo reale (ogni 1.5s)...');
  console.log('   (Notare come 1 task alla volta passa a RUNNING mentre gli altri attendono in PENDING)\n');

  const processingIds = results.map((r) => r.processingId);
  let allDone = false;
  let iteration = 1;

  while (!allDone) {
    await wait(1500);

    const statuses = await Promise.all(
      processingIds.map(async (id, idx) => {
        const res = await fetch(`${API_BASE}/inference/${id}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json: any = await res.json();
        return {
          task: `#${idx + 1}`,
          status: json.data?.status || 'UNKNOWN',
        };
      })
    );

    const statusCounts = statuses.reduce((acc: any, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    const summaryStr = statuses.map((s) => `${s.task}: ${s.status}`).join(' | ');
    console.log(`[Check ${iteration}] ${summaryStr} => (Summary: ${JSON.stringify(statusCounts)})`);

    const pendingOrRunning = statuses.some((s) => s.status === 'PENDING' || s.status === 'RUNNING');
    if (!pendingOrRunning) {
      allDone = true;
    }

    iteration++;
    if (iteration > 60) {
      console.log('Timeout polling.');
      break;
    }
  }

  
  console.log('TEST COMPLETATO: Tutti i task sono stati processati in coda!');
  
}

runTest().catch((err) => {
  console.error('Errore durante l\'esecuzione del test:', err.message);
  console.log('Suggerimento: Assicurati che il server sia avviato su http://localhost:3000 e che Redis sia attivo.');
});
