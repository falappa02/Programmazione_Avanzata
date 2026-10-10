# Diagramma dei Casi d'Uso UML

Questo documento contiene il **Diagramma dei Casi d'Uso UML** del sistema backend per l'inferenza YOLO, realizzato con sintassi standard **Mermaid**.

I casi d'uso sono organizzati secondo i tre livelli di privilegio:
1. **Utente non autenticato** (Area Pubblica / Accesso)
2. **Utente autenticato** (Gestione Dataset, Upload Contenuti, Inferenza YOLO)
3. **Amministratore** (Operazioni riservate RBAC)

---

## Diagramma Mermaid

```mermaid
flowchart LR
    %% Attori del Sistema
    subgraph Attori [" Attori del Sistema "]
        direction TB
        Guest[" Utente non autenticato "]
        User[" Utente autenticato "]
        Admin[" Amministratore (Admin) "]
    end

    %% Confini del Sistema Backend
    subgraph Sistema [" Sistema Backend YOLO (API REST) "]
        direction TB

        %% 1. Funzionalità Utente non autenticato
        subgraph AreaGuest [" 1. Area Pubblica / Accesso "]
            UC_Reg(["Registrazione account (POST /auth/register)"]):::uc
            UC_Log(["Login credenziali & JWT RS256 (POST /auth/login)"]):::uc
            UC_Mod(["Consultazione modelli YOLO (GET /inference/models)"]):::uc
            UC_Hlt(["Verifica disponibilità servizio (GET /health)"]):::uc
        end

        %% 2. Funzionalità Utente autenticato
        subgraph AreaUser [" 2. Area Utente Autenticato (JWT RS256) "]
            UC_Crd(["Visualizzazione credito residuo (GET /users/credit)"]):::uc
            UC_CDs(["Creazione dataset con tag (POST /datasets)"]):::uc
            UC_LDs(["Consultazione lista dataset (GET /datasets)"]):::uc
            UC_UDs(["Modifica dataset con controllo univocità (PUT /datasets/:id)"]):::uc
            UC_DDs(["Cancellazione logica soft-delete (DELETE /datasets/:id)"]):::uc
            UC_UpI(["Upload immagine con costo fisso 0.25 (POST /datasets/:id/content)"]):::uc
            UC_UpV(["Upload video MP4 con costo 0.08/KB (POST /datasets/:id/content)"]):::uc
            UC_Trg(["Richiesta inferenza asincrona 202 Accepted (POST /inference)"]):::uc
            UC_Sts(["Polling avanzamento e risultato JSON (GET /inference/:id/status)"]):::uc
            UC_Frm(["Visualizzazione frame side-by-side (GET /inference/:id/frame/:index)"]):::uc
        end

        %% 3. Funzionalità Amministratore
        subgraph AreaAdmin [" 3. Area Amministrazione (RBAC - Solo Admin) "]
            UC_Rch(["Ricarica crediti utente via email (POST /admin/recharge)"]):::uc
        end
    end

    %% Relazioni Utente non autenticato
    Guest --> UC_Reg
    Guest --> UC_Log
    Guest --> UC_Mod
    Guest --> UC_Hlt

    %% Relazioni Utente autenticato
    User --> UC_Crd
    User --> UC_CDs
    User --> UC_LDs
    User --> UC_UDs
    User --> UC_DDs
    User --> UC_UpI
    User --> UC_UpV
    User --> UC_Trg
    User --> UC_Sts
    User --> UC_Frm

    %% Ereditarietà e Relazioni Admin
    Admin -.->|eredita tutti i permessi| User
    Admin --> UC_Rch

    classDef uc fill:#f8f9fa,stroke:#2c3e50,stroke-width:1.5px,color:#2c3e50,font-size:11px;
    classDef default font-family:sans-serif;
```

---

## Descrizione degli Attori e Ruoli

### 1. Utente non autenticato
- Non richiede token JWT.
- **Registrazione** (`POST /api/v1/auth/register`): creazione account con assegnazione iniziale di 1000.0 token.
- **Login** (`POST /api/v1/auth/login`): verifica credenziali con hash Bcrypt e rilascio di token JWT firmato con chiave RSA 2048-bit (RS256).
- **Catalogo Modelli** (`GET /api/v1/inference/models`): consultazione pubblica dei modelli YOLO supportati.
- **Health Check** (`GET /health`): verifica stato di salute del server.

### 2. Utente autenticato (`user`)
- Tutte le rotte sono protette da `authMiddleware` con verifica della firma asimmetrica della chiave pubblica RSA e controllo crediti residui (`tokens > 0`). In caso di token esauriti, l'accesso viene interrotto con `401 Unauthorized`.
- **Credito residuo** (`GET /api/v1/users/credit`): consultazione del saldo token.
- **Gestione Dataset**:
  - `POST /api/v1/datasets`: creazione dataset con nome e tag (lista di stringhe).
  - `GET /api/v1/datasets`: recupero della lista dei dataset non cancellati (`isDeleted = false`).
  - `PUT /api/v1/datasets/:id`: modifica del nome e/o tag con validazione della non-sovrapposizione di nomi per lo stesso utente.
  - `DELETE /api/v1/datasets/:id`: cancellazione logica (*Soft-Delete*).
- **Upload Contenuti Multimediali** (`POST /api/v1/datasets/:id/content`):
  - Immagini JPG/PNG: costo fisso di 0.25 token.
  - Video MP4: costo di 0.08 token per KB caricato.
  - Calcolo dinamico dei costi tramite **Strategy Pattern** e detrazione atomica dei token.
- **Inferenza Machine Learning**:
  - `POST /api/v1/inference`: avvio asincrono con risposta immediata `202 Accepted` e accodamento su Bull/Redis. Costo: 4 token per immagine, 1.75 token per frame video. Annullamento a priori con stato `ABORTED` se il credito è insufficiente.
  - `GET /api/v1/inference/:id/status`: polling sullo stato (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `ABORTED`) e ricezione dei Bounding Box in formato JSON.
  - `GET /api/v1/inference/:id/frame/:frameIndex`: streaming immagine PNG composita affiancata (*Side-by-Side*: originale a sinistra, annotata a destra).

### 3. Amministratore (`admin`)
- Eredita tutti i permessi dell'utente standard.
- Ha accesso esclusivo (`requireRole('admin')`) alla funzione di:
  - **Ricarica Crediti** (`POST /api/v1/admin/recharge`): aggiornamento del saldo crediti di un qualsiasi utente specificandone l'indirizzo email.
