# MakerSpace — Public Portfolios

A multi-user public portfolio platform built with React, TypeScript, Vite, and the AppDeploy SDK.

## Features
- Sign in using AppDeploy authentication
- Create and edit your own public creator profile
- Add skills, achievements, GitHub/website links, and projects
- Browse public profiles, search creators, and filter by skill
- Responsive layout for desktop and mobile
- Server-side profile sanitization and URL validation

## Run locally
1. Install Node.js (18+ recommended).
2. Install dependencies: `npm install`
3. Start the frontend: `npm run dev`
4. Build: `npm run build`

The backend routes use `@appdeploy/sdk`, and the frontend uses `@appdeploy/client`.
Those SDKs and the hosted database/auth environment are provided by AppDeploy. Running
outside AppDeploy requires configuring equivalent SDK/runtime support.

Example profile cards shown when no real profiles exist are illustrative demo content,
not actual users.
