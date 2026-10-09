# Diagrammi di Sequenza UML - Rotte Principali

Questo documento contiene i **Diagrammi di Sequenza UML** delle 4 rotte architetturali più significative del progetto, realizzati con sintassi standard **Mermaid**.

I diagrammi possono essere visualizzati direttamente in:
- Qualsiasi visualizzatore Markdown (VS Code, GitHub, GitLab, Obsidian)
- L'editor online ufficiale [Mermaid Live Editor](https://mermaid.live) per esportarli in **PNG**, **SVG** o **PDF** da inserire nella relazione o nelle slide per il docente.

---

## 1. Rotta: `POST /api/v1/auth/login` (Autenticazione Asimmetrica RS256)

Mostra il flusso di verifica credenziali con crittografia hash Bcrypt e firma del token JWT tramite coppia di chiavi RSA a 2048 bit (**RS256**).

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client (Postman / Web)
    participant AuthCtrl as AuthController
    participant AuthSvc as AuthService
    participant UserMod as User (Sequelize)
    participant DB as Database (Postgres/SQLite)
    participant Bcrypt as Bcrypt
    participant Keys as RSA Key Manager
    participant JWT as jsonwebtoken

    Client->>AuthCtrl: POST /api/v1/auth/login {email, password}
    activate AuthCtrl

    AuthCtrl->>AuthSvc: login(email, password)
    activate AuthSvc

    AuthSvc->>UserMod: findOne({ where: { email } })
    activate UserMod
    UserMod->>DB: SELECT * FROM users WHERE email = ?
    DB-->>UserMod: Record utente o null
    UserMod-->>AuthSvc: user instance
    deactivate UserMod

    alt Utente non trovato
        AuthSvc-->>AuthCtrl: throw UnauthorizedError("Credenziali non valide")
        AuthCtrl-->>Client: HTTP 401 Unauthorized
    end

    AuthSvc->>Bcrypt: compare(password, user.password)
    activate Bcrypt
    Bcrypt-->>AuthSvc: isPasswordValid (true / false)
    deactivate Bcrypt

    alt Password errata
        AuthSvc-->>AuthCtrl: throw UnauthorizedError("Credenziali non valide")
        AuthCtrl-->>Client: HTTP 401 Unauthorized
    end

    AuthSvc->>Keys: getRsaKeys()
    activate Keys
    Keys-->>AuthSvc: { privateKey, publicKey }
    deactivate Keys

    AuthSvc->>JWT: sign(payload, privateKey, { algorithm: 'RS256' })
    activate JWT
    JWT-->>AuthSvc: jwt_token
    deactivate JWT

    AuthSvc-->>AuthCtrl: { token, user: { id, email, role, tokens } }
    deactivate AuthSvc

    AuthCtrl-->>Client: HTTP 200 OK { success: true, data: { token, user } }
    deactivate AuthCtrl
```

---

## 2. Rotta: `POST /api/v1/datasets/:id/content` (Upload con Strategy Pattern)

Illustra l'integrazione del **Design Pattern Strategy & Factory**: il calcolo del costo in crediti varia dinamicamente a seconda che il media caricato sia un'immagine fissa o un video MP4 multiframe.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client (Postman)
    participant AuthMid as AuthMiddleware
    participant UploadMid as Multer (Upload)
    participant ContentCtrl as ContentController
    participant ContentSvc as ContentService
    participant MediaUtil as MediaUtils (ffprobe/sharp)
    participant Factory as CostStrategyFactory
    participant Strategy as ICostStrategy
    participant UserMod as User (Sequelize)
    participant ContentMod as Content (Sequelize)
    participant DB as Database

    Client->>AuthMid: POST /api/v1/datasets/:id/content (multipart/form-data)
    activate AuthMid
    Note over AuthMid: Verifica firma RS256 con Public Key
    AuthMid->>UploadMid: next() con req.user
    deactivate AuthMid

    activate UploadMid
    UploadMid->>UploadMid: Salva file temporaneo in /uploads
    UploadMid->>ContentCtrl: uploadContent(req, res)
    deactivate UploadMid

    activate ContentCtrl
    ContentCtrl->>ContentSvc: addContentToDataset(userId, datasetId, file)
    activate ContentSvc

    ContentSvc->>MediaUtil: getMediaMetadata(filePath, type)
    activate MediaUtil
    MediaUtil-->>ContentSvc: { fileSizeKb, frameCount }
    deactivate MediaUtil

    ContentSvc->>Factory: getStrategy(type: 'image' | 'video')
    activate Factory
    Factory-->>ContentSvc: istanza ImageCostStrategy / VideoCostStrategy
    deactivate Factory

    ContentSvc->>Strategy: calculateUploadCost(fileSizeKb, frameCount)
    activate Strategy
    Strategy-->>ContentSvc: tokenCost
    deactivate Strategy

    ContentSvc->>UserMod: findByPk(userId)
    activate UserMod
    UserMod->>DB: SELECT tokens FROM users WHERE id = ?
    DB-->>UserMod: Dati utente
    UserMod-->>ContentSvc: user
    deactivate UserMod

    alt Credito insufficiente (user.tokens < tokenCost)
        ContentSvc->>ContentSvc: unlinkSync(tempFile)
        ContentSvc-->>ContentCtrl: throw InsufficientCreditError
        ContentCtrl-->>Client: HTTP 400 Bad Request
    end

    Note over ContentSvc: user.tokens = user.tokens - tokenCost
    ContentSvc->>UserMod: save()
    ContentSvc->>ContentMod: create({ datasetId, type, filePath, tokenCost, ... })
    activate ContentMod
    ContentMod->>DB: INSERT INTO contents ...
    DB-->>ContentMod: Record creato
    ContentMod-->>ContentSvc: newContent
    deactivate ContentMod

    ContentSvc-->>ContentCtrl: newContent
    deactivate ContentSvc

    ContentCtrl-->>Client: HTTP 201 Created { success: true, data: newContent }
    deactivate ContentCtrl
```

---

## 3. Rotta: `POST /api/v1/inference` (Trigger Inferenza con Coda Asincrona Bull / Redis)

Questo diagramma cattura la vera architettura asincrona del backend:
1. **Fase sincrona HTTP**: risposta immediata `202 ACCEPTED` al client dopo il prelievo dei token e l'accodamento in Redis.
2. **Fase asincrona Worker**: estrazione FIFO del task da parte del worker Bull ed esecuzione isolata di YOLO in sottoprocesso Python.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client
    participant InfCtrl as InferenceController
    participant InfSvc as InferenceService
    participant Queue as Bull Queue (Redis)
    participant Worker as Bull Worker
    participant Python as infer_yolo.py (Subprocess)
    participant DB as PostgreSQL / SQLite

    %% Fase 1: Richiesta HTTP Sincrona
    rect rgb(240, 248, 255)
    Note over Client, InfCtrl: FASE 1: Richiesta e Accodamento Sincrono (Non-Blocking)
    Client->>InfCtrl: POST /api/v1/inference { datasetId, modelId: "yolov11n" }
    activate InfCtrl

    InfCtrl->>InfSvc: triggerInference(userId, datasetId, modelId)
    activate InfSvc

    InfSvc->>DB: Controlla contenuti e calcola costo totale inferenza
    InfSvc->>DB: Verifica e scala crediti utente (user.tokens - totalCost)

    InfSvc->>DB: INSERT INTO processings (status = 'PENDING')
    DB-->>InfSvc: processingRecord (id: uuid)

    InfSvc->>Queue: add({ processingId, datasetId, modelId })
    activate Queue
    Queue-->>InfSvc: Job accodato in Redis
    deactivate Queue

    InfSvc-->>InfCtrl: { processingId, status: 'PENDING' }
    deactivate InfSvc

    InfCtrl-->>Client: HTTP 202 Accepted { success: true, data: { processingId, status: 'PENDING' } }
    deactivate InfCtrl
    end

    %% Fase 2: Elaborazione Asincrona in Background
    rect rgb(255, 250, 240)
    Note over Queue, Python: FASE 2: Esecuzione Asincrona in Background
    Queue->>Worker: Estrae prossimo Job FIFO
    activate Worker

    Worker->>DB: UPDATE processings SET status = 'RUNNING' WHERE id = processingId

    Worker->>Python: execFile('python', ['infer_yolo.py', '--contents', ..., '--output_dir', ...])
    activate Python
    Note over Python: Carica pesi YOLOv11n ed esegue Object Detection
    Python-->>Worker: JSON con bounding box, confidenze e immagini salvate
    deactivate Python

    Worker->>DB: UPDATE processings SET status = 'COMPLETED', resultJson = ..., outputFolderPath = ...
    Worker-->>Queue: Job completato
    deactivate Worker
    end

    %% Fase 3: Polling del Client
    rect rgb(245, 255, 245)
    Note over Client, InfCtrl: FASE 3: Polling dello Stato da parte del Client
    Client->>InfCtrl: GET /api/v1/inference/:id/status
    InfCtrl->>DB: SELECT * FROM processings WHERE id = ?
    DB-->>InfCtrl: { status: 'COMPLETED', resultJson: { ... } }
    InfCtrl-->>Client: HTTP 200 OK { success: true, data: { status: 'COMPLETED', ... } }
    end
```

---

## 4. Rotta: `GET /api/v1/inference/:id/frame/:index` (Visualizzazione Frame Side-by-Side)

Mostra l'estrazione e composizione visuale in streaming: il backend recupera il frame originale e il frame annotato da YOLO con i Bounding Box, li unisce orizzontalmente con la libreria grafica **Sharp** e restituisce il buffer PNG grezzo al browser o a Postman.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / Postman
    participant InfCtrl as InferenceController
    participant InfSvc as InferenceService
    participant DB as Database
    participant FS as File System
    participant Sharp as Sharp / ImageCombiner

    Client->>InfCtrl: GET /api/v1/inference/:id/frame/0
    activate InfCtrl

    InfCtrl->>InfSvc: getFrameVisualization(userId, processingId, frameIndex=0)
    activate InfSvc

    InfSvc->>DB: findOne Processing con id e userId
    DB-->>InfSvc: processing (resultJson con coordinate e path)

    alt Elaborazione non ancora completata
        InfSvc-->>InfCtrl: throw BadRequestError("Inferenza non ancora completata")
        InfCtrl-->>Client: HTTP 400 Bad Request
    end

    InfSvc->>FS: Legge immagine/frame originale
    InfSvc->>FS: Legge frame elaborato con bounding box

    InfSvc->>Sharp: combineImagesSideBySide(originalBuffer, annotatedBuffer)
    activate Sharp
    Note over Sharp: Concatena le due immagini affiancate (Left: Originale, Right: YOLO BBox)
    Sharp-->>InfSvc: imageBuffer (PNG)
    deactivate Sharp

    InfSvc-->>InfCtrl: imageBuffer
    deactivate InfSvc

    InfCtrl->>InfCtrl: res.setHeader('Content-Type', 'image/png')
    InfCtrl-->>Client: HTTP 200 OK [Binary Image Buffer PNG]
    deactivate InfCtrl
```
