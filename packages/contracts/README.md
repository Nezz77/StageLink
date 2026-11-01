# API transport contracts

`src/api.d.ts` is generated from the committed `contracts/openapi.json`. Run `npm run contracts` in `backend/` after API changes. Import types from this package by relative path until frontend API integration establishes its module alias. No browser credentials or business fixtures belong here.
