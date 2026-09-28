# Hoop Land Archive

A responsive image archive built with React, Vite, Tailwind CSS, and an Express API backed by canonical JSON. Public browsing is open; admin writes require a server-validated password session. The interfaces include search, combined filters, sorting, direct access to original images, record editing, deletion, and regrouping controls.

## Run locally

```sh
npm install
ADMIN_PASSWORD='use-a-unique-password-of-at-least-16-characters' npm run dev
```

Open the local URL printed by Vite. `npm run dev` starts the API and frontend together. To run only the API, use `ADMIN_PASSWORD='...' npm run dev:api`.

The API stores records in `data/images.json` and original uploads in `uploads/`. On first startup, it copies `src/data/images.json` into the data directory; later edits never modify the sample. Set `ADMIN_PASSWORD` to a unique value of at least 16 characters. Sign-in is disabled when it is unset or too short. The API defaults to `127.0.0.1:4174`; configure `API_PORT`, `API_HOST`, `ARCHIVE_DATA_DIR`, or `ARCHIVE_IMAGES_DIR` as needed.

## Records and images

Sample records live in `src/data/images.json`; the writable API initializes its canonical `data/images.json` from this file once. Records require `id`, `image`, `team`, `season`, and `conference`; optional metadata such as `group` and `description` is preserved so the schema can grow without coupling it to the UI.

Gallery images use CSS `object-fit: contain`; they are not resized or rewritten. The detail viewer and image context menu point at the same source URL, and **Open original** opens that file directly. Replace the sample URLs with paths to your own original image files when adding a collection.

## Admin writes and static hosting

The included local Express API persists JSON and original upload files on the server filesystem. Static hosting alone remains read-only: browser JavaScript cannot overwrite deployed JSON or store uploads. Deploy the API with persistent storage or replace its storage layer with a database/object store or Git-based API for hosting.

The admin UI calls the API through `src/services/dataService.js`. The API routes are:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/images` | Return all records |
| `GET` | `/api/images/:id` | Return one record |
| `POST` | `/api/images` | Create a record with multipart `record` (JSON) and `image` (original file) |
| `PUT` | `/api/images/:id` | Update metadata and optionally replace the original |
| `DELETE` | `/api/images/:id` | Delete a record |
| `GET` | `/api/auth/status` | Check admin configuration and session |
| `POST` | `/api/auth/login` | Start a rate-limited admin session |
| `POST` | `/api/auth/logout` | End the admin session |

Mutations require an authenticated same-origin session. Passwords are checked server-side with scrypt; sessions use opaque HTTP-only, same-site cookies held in server memory. Uploads are size-limited, checked by file signature, stored byte-for-byte with a sanitized original filename, and served from `/images/`. Updates serialize JSON writes, enforce unique IDs, preserve image files during metadata-only edits, and remove managed images only when no record references them. For production, use HTTPS, a strong unique password or an identity provider, persistent session storage, backups, and durable file storage. Never put API secrets in frontend code.

When the API is unavailable, the app reports a connection error instead of claiming changes were saved. The sidebar preference alone is stored in browser local storage.

Run `npm test` to exercise auth, JSON persistence, duplicate IDs, original upload byte preservation, and deletion against temporary storage.