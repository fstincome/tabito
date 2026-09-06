# TABITO Explorer Guide

Guide touristique numérique pour **TABITO** (*Tanganyika e-Bridge International Tours*), tour opérateur basé au Burundi. L'application présente les sites, attractions et services touristiques aux voyageurs, avec un back-office administratif pour gérer le contenu.

**Live app** : https://tabito.lovable.app

## Fonctionnalités

- **Accueil personnalisable** : bannière, titre, message de bienvenue, accroche et appels à l'action modifiables depuis l'admin.
- **Guide touristique** : exploration par catégories avec fiches détaillées (photos, description, accès, distances, contacts, etc.).
- **Catégories officielles** :
  - Services touristiques (découverte live OpenStreetMap)
  - Attractions / sites touristiques
  - Monuments historiques
  - Produits culturels
  - Gares routières / points de départ-arrivée
  - Bureaux de vente de tickets d'avion
- **Tracker live** : affichage des services touristiques autour de la position GPS du voyageur, rafraîchi automatiquement.
- **Admin CMS** : authentification par email/mot de passe, gestion des catégories, publication des points, édition de la page d'accueil, boîte de réception des messages, gestion de l'équipe (rôles admin/éditeur).
- **Formulaire de contact** : messages stockés dans la base de données, consultables depuis l'admin.
- **PWA** : manifeste et popup d'installation pour ajouter l'application sur l'écran d'accueil.
- **Export statique** : génère un dossier `static/` prêt à être hébergé sur n'importe quel hébergement cPanel classique.

## Spécifications d'un point touristique

Chaque point publié peut contenir :

- Nom du site
- Région / destination locale
- Municipalité
- Administration, gestion ou propriété du site
- Coordonnées géographiques (GPS ou saisie manuelle)
- Type d'accès : route, maritime ou aérienne
- Indications pour l'accès
- Distance depuis le chef-lieu de la destination (km / heures)
- Distance depuis Bujumbura (km / heures)
- Code / grade du site
- Récit narratif général
- Récit narratif saisonnier
- Jusqu'à 5 photos compressées
- Lien vidéo / réseaux sociaux / site web
- Code marchand (gestion TABITO)
- Interdits et précautions spécifiques
- Présence de capteurs météorologiques
- Heures d'ouverture et de fermeture
- Contacts des guides locaux / secourisme / assistance médicale

## Stack technique

- [TanStack Start](https://tanstack.com/start) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [Leaflet](https://leafletjs.com) + OpenStreetMap
- [Supabase](https://supabase.com) (Lovable Cloud) — auth, base de données, RLS
- Build statique personnalisé via `scripts/make-static.mjs`

## Scripts

```sh
# Lancer le serveur de développement
bun run dev

# Build standard (preview Lovable)
bun run build

# Build statique pour hébergement cPanel
bun run build:static
```

Après `bun run build:static`, le dossier `static/` contient l'application prête à être uploadée sur votre hébergement.

## Déploiement cPanel

1. Exécutez `bun run build:static`.
2. Uploadez le contenu du dossier `static/` à la racine de votre domaine cPanel.
3. Le fichier `.htaccess` inclus gère la redirection SPA vers `index.html`.

## Développement local

```sh
git clone <this-repository-url>
cd <repository-name>
bun install
bun run dev
```

---

Projet construit avec [Lovable](https://lovable.dev).
