# Task Manager — Test de recrutement

Application complète de gestion de tâches conforme au cahier des charges :

- Backend : Java 21 + Spring Boot + Spring Data JPA + MySQL + Spring Security + JWT
- Frontend : React + Vite + TypeScript + Tailwind CSS
- Mobile bonus : Flutter + Dart + Dio
- DevOps bonus : Docker, Docker Compose, GitHub Actions, Google Cloud Run

## 1. Architecture

```text
task-manager/
├── backend/        # API REST Spring Boot
├── frontend/       # SPA React/Vite/TypeScript
├── mobile/         # Application Flutter
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── docker-compose.yml
├── .gitignore
└── README.md
```

Le navigateur et l'application Flutter consomment la même API :

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/tasks
POST /api/tasks
PUT  /api/tasks/{id}
DELETE /api/tasks/{id}
```

Les tâches sont toujours associées à l'utilisateur authentifié. Une requête ne peut donc pas lire/modifier/supprimer la tâche d'un autre utilisateur.

## 2. Prérequis

- Java 21
- Maven 3.9+
- Node.js 22+
- npm 10+
- Docker + Docker Compose
- Flutter 3.24+ pour le bonus mobile

## 3. Démarrage rapide avec Docker

À la racine :

```bash
docker compose up --build
```

Services :

- Frontend : http://localhost:5173
- Backend : http://localhost:8081
- MySQL : localhost:3306

Compte de test possible après inscription :

```text
email: test@example.com
password: Password123!
```

## 4. Démarrage du backend sans Docker

Créer une base MySQL nommée `task_manager`, puis :

```bash
cd backend
./mvnw spring-boot:run
```

Sous Windows :

```powershell
.\mvnw.cmd spring-boot:run
```

Variables d'environnement disponibles :

```text
DB_URL=jdbc:mysql://localhost:3306/task_manager?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
DB_USERNAME=taskmanager
DB_PASSWORD=taskmanager
JWT_SECRET=change-me-to-a-long-secret-key-of-at-least-32-characters
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

## 5. Démarrage du frontend sans Docker

```bash
cd frontend
npm install
npm run dev
```

Le frontend utilise par défaut :

```text
VITE_API_URL=http://localhost:8081/api
```

Pour modifier :

```bash
cp .env.example .env
```

Puis renseigner `VITE_API_URL`.

## 6. Démarrage mobile

```bash
cd mobile
flutter pub get
flutter run
```

Par défaut l'application utilise :

```text
http://10.0.2.2:8081/api
```

C'est l'adresse de la machine hôte depuis l'émulateur Android.

Pour un téléphone physique, remplacer l'URL par l'adresse IP locale de la machine exécutant Spring Boot, par exemple :

```text
http://192.168.1.20:8081/api
```

## 7. Tests backend

```bash
cd backend
./mvnw test
```

## 8. Tests frontend

```bash
cd frontend
npm install
npm run build
```

## 9. API

### Inscription

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password123!"
}
```

Réponse :

```json
{
  "token": "eyJ..."
}
```

### Connexion

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password123!"
}
```

### Liste

```http
GET /api/tasks
Authorization: Bearer <JWT>
```

### Création

```http
POST /api/tasks
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "title": "Préparer le projet",
  "description": "Finaliser le README",
  "status": "TODO"
}
```

Les statuts acceptés sont :

```text
TODO
IN_PROGRESS
DONE
```

### Modification

```http
PUT /api/tasks/1
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "title": "Projet terminé",
  "description": "Version finale",
  "status": "DONE"
}
```

### Suppression

```http
DELETE /api/tasks/1
Authorization: Bearer <JWT>
```

## 10. Sécurité

- Mot de passe hashé avec BCrypt.
- JWT signé côté backend.
- Routes `/api/auth/**` publiques.
- Routes `/api/tasks/**` protégées.
- Le propriétaire est récupéré depuis le JWT et non depuis un paramètre fourni par le client.
- Validation des entrées avec Jakarta Validation.
- CORS configurable par variable d'environnement.

Pour une vraie production, remplacer impérativement le `JWT_SECRET` de développement par un secret stocké dans Secret Manager ou une solution équivalente.

## 11. Docker

Le backend est construit en deux étapes Maven/JRE.

Le frontend est construit avec Node puis servi par Nginx.

Le `docker-compose.yml` démarre MySQL, le backend et le frontend.

## 12. CI/CD

Le workflow GitHub Actions :

1. teste et package le backend ;
2. build le frontend ;
3. construit les images Docker ;
4. pousse les images vers Google Artifact Registry ;
5. déploie backend et frontend sur Cloud Run si les secrets GCP sont configurés.

Secrets attendus :

```text
GCP_PROJECT_ID
GCP_REGION
GCP_WORKLOAD_IDENTITY_PROVIDER
GCP_SERVICE_ACCOUNT
DB_URL
DB_USERNAME
DB_PASSWORD
JWT_SECRET
```

## 13. Déploiement GCP

Créer un projet GCP, activer :

```text
Cloud Run
Artifact Registry
IAM
```

Créer un repository Docker :

```bash
gcloud artifacts repositories create task-manager \
  --repository-format=docker \
  --location=europe-west1
```

Construire et publier manuellement :

```bash
gcloud auth configure-docker europe-west1-docker.pkg.dev

docker build -t europe-west1-docker.pkg.dev/PROJECT_ID/task-manager/backend:latest ./backend
docker push europe-west1-docker.pkg.dev/PROJECT_ID/task-manager/backend:latest

docker build -t europe-west1-docker.pkg.dev/PROJECT_ID/task-manager/frontend:latest ./frontend
docker push europe-west1-docker.pkg.dev/PROJECT_ID/task-manager/frontend:latest
```

Puis déployer :

```bash
gcloud run deploy task-manager-backend \
  --image europe-west1-docker.pkg.dev/PROJECT_ID/task-manager/backend:latest \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "DB_URL=...,DB_USERNAME=...,DB_PASSWORD=...,JWT_SECRET=...,CORS_ALLOWED_ORIGINS=*"

gcloud run deploy task-manager-frontend \
  --image europe-west1-docker.pkg.dev/PROJECT_ID/task-manager/frontend:latest \
  --region europe-west1 \
  --allow-unauthenticated
```

Pour une architecture production, utiliser plutôt Cloud SQL pour MySQL qu'un conteneur MySQL local.

## 14. Démonstration recommandée

1. Ouvrir le frontend.
2. Créer un compte.
3. Se connecter.
4. Créer plusieurs tâches avec différents statuts.
5. Utiliser la recherche.
6. Filtrer par statut.
7. Modifier une tâche.
8. Supprimer une tâche.
9. Vérifier que le token est présent dans localStorage.
10. Lancer Flutter et se connecter avec le même compte.
11. Vérifier que les tâches sont synchronisées.
12. Lancer les tests.
13. Montrer le pipeline GitHub Actions.
14. Montrer les services Cloud Run.

## 15. Limites / choix

Le sujet demande une mini-application. L'implémentation reste volontairement simple : pas de refresh token, pas de gestion avancée des rôles, pas de pagination, pas de notifications push. Ces fonctionnalités peuvent être ajoutées dans une version production.
