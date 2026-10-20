# Secret Santa

A small website for a family gift exchange. Everyone gets a private link, wraps
a gift box, fills it with wishes, and writes a letter to their Santa. The
organizer starts the draw once everyone is under the tree; on Christmas Eve the
tree reveals who was whose Santa.

Designed in Figma with a token-based design system (the "Postcard" style).

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript), hosted on Vercel
- [Supabase](https://supabase.com) for the database and photo storage
- Design tokens in `app/tokens.css`, mirrored from the Figma variables

## Privacy

This repo is public, but it holds **code only**. Names, wishlists, letters,
pairings and private links live in the database — never in this repository.
Secrets are set as Vercel environment variables (see `.env.example`).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```
